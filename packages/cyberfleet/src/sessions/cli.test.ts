import { execFileSync } from 'node:child_process'
import { mkdtempSync, readFileSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { type AgentRecord, FileStore } from 'cyberlegion'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'

// `cyberfleet sessions plan | ask | close` through the built CLI (bin → dist/cli.mjs), on a hub of
// exited records with no worktree, so no git host or pane is needed.

const BIN = fileURLToPath(new URL('../../bin/cyberfleet.mjs', import.meta.url))

let work: string
let root: string
let store: FileStore

// The test runner may itself sit in a herdr or tmux pane; drop those variables so the CLI names
// this session from CYBERLEGION_AGENT_ID alone.
const clean = Object.fromEntries(
	Object.entries(process.env).filter(([k]) => !/^(HERDR_|TMUX|CYBER_MUX|CYBERLEGION_)/.test(k)),
)

function cf(args: string[], env: Record<string, string> = {}) {
	return execFileSync('node', [BIN, 'sessions', ...args, '--root', root, '--format', 'json'], {
		encoding: 'utf8',
		env: { ...clean, TMUX: '/tmp/fake,1,0', CYBERLEGION_AGENT_ID: 'self0000', ...env },
	})
}

function seed(id: string, over: Partial<AgentRecord> = {}) {
	const ts = new Date().toISOString()
	store.putAgent({
		id,
		handle: `h-${id}`,
		harness: 'claude',
		cwd: work,
		worktree: null,
		pane: { mux: 'tmux', id: `%${id}` },
		status: 'exited',
		createdAt: ts,
		lastSeen: ts,
		...over,
	})
}

beforeEach(() => {
	work = mkdtempSync(join(tmpdir(), 'cf-sessions-cli-'))
	root = join(work, 'hub')
	store = new FileStore(root)
	seed('self0000', { pane: null, status: 'active', harness: 'claude' })
	seed('old1')
	seed('old2')
})
afterEach(() => rmSync(work, { recursive: true, force: true }))

describe('cyberfleet sessions', () => {
	it('plans, asks, and closes only the confirmed ids', () => {
		const out = join(work, 'plan.json')
		const plan = JSON.parse(cf(['plan', '--out', out]))
		expect(plan.plan).toBe(out)
		expect(plan.close.map((r: { id: string }) => r.id).sort()).toEqual(['old1', 'old2'])
		expect(JSON.parse(readFileSync(out, 'utf8')).units).toHaveLength(3)

		const asked = JSON.parse(cf(['ask', out]))
		expect(asked.asked).toBe(true)

		const closed = JSON.parse(cf(['close', out, '--ids', 'old1,self0000']))
		expect(closed.closed.map((c: { id: string }) => c.id)).toEqual(['old1'])
		expect(closed.refused).toEqual([{ id: 'self0000', handle: 'h-self0000', reason: 'this session' }])
		expect(store.getAgent('old1')).toBeUndefined()
		expect(store.getAgent('old2')).toBeDefined()
	})

	it('refuses to plan outside a multiplexer', () => {
		expect(() => cf(['plan', '--out', join(work, 'p.json')], { TMUX: '' })).toThrow(/not inside herdr or tmux/)
	})

	it('refuses to ask from a session other than the one that made the plan', () => {
		const out = join(work, 'plan.json')
		cf(['plan', '--out', out])
		seed('other', { pane: null, status: 'active' })
		expect(() => cf(['ask', out], { CYBERLEGION_AGENT_ID: 'other' })).toThrow(/run ask from that session/)
	})
})
