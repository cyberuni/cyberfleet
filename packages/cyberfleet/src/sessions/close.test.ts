import { execFileSync } from 'node:child_process'
import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { type AgentRecord, FileStore, type IdContext } from 'cyberlegion'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { closeUnits } from './close.ts'
import { type Plan, realRun, snapshotOf, type UnitPlan } from './plan.ts'

// `sessions close` against a real hub. Most cases inject the close itself and check which units the
// guards let through; the last cases run cyberlegion's own close on real worktrees.

let work: string
let ctx: IdContext
let closedIds: string[]

const caller = { id: 'self0000', handle: 'council', mux: 'herdr' }

function record(id: string, over: Partial<AgentRecord> = {}): AgentRecord {
	const ts = new Date(0).toISOString()
	const rec: AgentRecord = {
		id,
		handle: `h-${id}`,
		harness: 'claude',
		cwd: work,
		pane: null,
		status: 'exited',
		createdAt: ts,
		lastSeen: ts,
		...over,
	}
	ctx.store.putAgent(rec)
	return rec
}

async function planned(id: string, over: Partial<UnitPlan> = {}, rec: Partial<AgentRecord> = {}): Promise<UnitPlan> {
	const r = record(id, rec)
	return {
		id,
		handle: r.handle,
		live: r.status !== 'exited',
		seat: false,
		rule: '15',
		result: 'close',
		reason: 'work landed',
		prs: [],
		snapshot: await snapshotOf(async () => ({ ok: false, stdout: '' }), r),
		...over,
	}
}

const leftover = { leftover: { lines: ['?? scratch'], more: 0 } }

function run(units: UnitPlan[], ids: string[], force: string[] = [], askedAt?: string) {
	const plan: Plan = { version: 1, createdAt: '', caller, units, ...(askedAt ? { askedAt } : {}) }
	return closeUnits({
		ctx,
		plan,
		ids,
		force,
		selfId: caller.id,
		close: async (id) => {
			closedIds.push(id)
		},
	})
}

beforeEach(() => {
	work = mkdtempSync(join(tmpdir(), 'cf-close-'))
	ctx = { store: new FileStore(join(work, 'hub')), env: {} }
	closedIds = []
})
afterEach(() => rmSync(work, { recursive: true, force: true }))

describe('sessions close: guards', () => {
	it('closes confirmed close- and ask-group units', async () => {
		const out = await run([await planned('c'), await planned('a', { result: 'ask', rule: '13' })], ['c', 'a'])
		expect(closedIds).toEqual(['c', 'a'])
		expect(out.refused).toEqual([])
	})

	it('refuses a keep-group unit, this session, and an id the plan does not hold', async () => {
		const units = [
			await planned('k', { result: 'keep', reason: 'pull request open' }),
			await planned(caller.id, { result: 'keep' }),
		]
		const out = await run(units, ['k', caller.id, 'h-k'])
		expect(closedIds).toEqual([])
		expect(out.refused.map((r) => r.reason)).toEqual([
			'in keep: pull request open',
			'this session',
			'not in the plan (pass full unit ids)',
		])
	})

	it('refuses a live close-group unit that was not asked, or did not answer DONE', async () => {
		const notAsked = await planned('n', {}, { status: 'active' })
		const out1 = await run([notAsked], ['n'])
		expect(out1.refused[0]?.reason).toMatch(/not asked yet/)
		const done = await planned('d', { answer: { kind: 'done' } }, { status: 'active' })
		const silent = await planned('s', {}, { status: 'active' })
		const out2 = await run([done, silent], ['d', 's'], [], 'now')
		expect(closedIds).toEqual(['d'])
		expect(out2.refused[0]).toMatchObject({ id: 's', reason: 'live unit did not answer DONE' })
	})

	it('accepts --force only for an ask-group unit with leftover files', async () => {
		const units = [
			await planned('ok', { result: 'ask', rule: '14', root: '/wt/ok', evidence: leftover }),
			await planned('commits', { result: 'ask', rule: '13', evidence: { commits: { lines: ['+ a'], more: 0 } } }),
			await planned('close', {}),
		]
		const out = await run(units, ['ok', 'commits', 'close'], ['ok', 'commits', 'close'])
		expect(closedIds).toEqual(['ok'])
		expect(out.closed[0]).toMatchObject({ id: 'ok', forced: true })
		expect(out.refused.map((r) => r.id)).toEqual(['commits', 'close'])
	})

	it('refuses --force for a unit that owns no worktree, even with leftover files in a shared one', async () => {
		const guest = await planned('guest', {
			result: 'ask',
			rule: '4b',
			shared: { root: '/wt/owner', owner: 'gone0000' },
			evidence: leftover,
		})
		const out = await run([guest], ['guest'], ['guest'])
		expect(closedIds).toEqual([])
		expect(out.refused.map((r) => r.reason)).toEqual([
			'--force refused: the unit owns no worktree, and closing never touches a shared one',
		])
	})

	it('refuses --force for a seat, and for an id --ids does not confirm', async () => {
		const seat = await planned('seat', { seat: true, result: 'ask', rule: '14', root: '/wt/seat', evidence: leftover })
		const out = await run([seat, await planned('other')], ['seat'], ['seat', 'other'])
		expect(closedIds).toEqual([])
		expect(out.refused.map((r) => r.reason)).toEqual([
			'--force names a unit that --ids does not confirm',
			'--force refused for a seat: closing a seat never touches its checkout',
		])
	})

	it('refuses a unit that changed since the plan', async () => {
		const u = await planned('u')
		ctx.store.putAgent({ ...(ctx.store.getAgent('u') as AgentRecord), status: 'active' })
		const gone = await planned('g')
		ctx.store.removeAgent('g')
		const out = await run([u, gone], ['u', 'g'])
		expect(closedIds).toEqual([])
		expect(out.refused.map((r) => r.reason)).toEqual([
			'changed since the plan: status exited → active',
			'no longer registered',
		])
	})

	it('reports a close that refuses, and moves on', async () => {
		const plan: Plan = { version: 1, createdAt: '', caller, units: [await planned('a'), await planned('b')] }
		const out = await closeUnits({
			ctx,
			plan,
			ids: ['a', 'b'],
			force: [],
			close: async (id) => {
				if (id === 'a') throw new Error('has uncommitted changes')
			},
		})
		expect(out.refused).toEqual([{ id: 'a', handle: 'h-a', reason: 'has uncommitted changes' }])
		expect(out.closed.map((c) => c.id)).toEqual(['b'])
	})
})

describe('sessions close: with cyberlegion', () => {
	function git(cwd: string, ...args: string[]) {
		return execFileSync('git', ['-c', 'user.name=t', '-c', 'user.email=t@t', ...args], { cwd, encoding: 'utf8' }).trim()
	}

	it('removes a closed unit with its worktree, and refuses one whose worktree got dirty since the plan', async () => {
		const primary = join(work, 'repo')
		execFileSync('git', ['init', '-q', '-b', 'main', primary])
		git(primary, 'commit', '-q', '--allow-empty', '-m', 'init')
		const wt = (b: string) => {
			const p = join(work, 'wt', b)
			git(primary, 'worktree', 'add', '-q', '-b', b, p)
			return p
		}
		const a = wt('a')
		const b = wt('b')
		const units = [
			await planned('a', {}, { worktree: { root: a, branch: 'a', primaryRoot: primary } }),
			await planned('b', {}, { worktree: { root: b, branch: 'b', primaryRoot: primary } }),
		]
		for (const u of units) u.snapshot = await snapshotOf(realRun, ctx.store.getAgent(u.id) as AgentRecord)
		writeFileSync(join(b, 'late.txt'), 'x')
		const plan: Plan = { version: 1, createdAt: '', caller, units }
		const out = await closeUnits({ ctx, plan, ids: ['a', 'b'], force: [] })
		expect(out.closed.map((c) => c.id)).toEqual(['a'])
		expect(out.refused[0]).toMatchObject({ id: 'b', reason: 'changed since the plan: worktree status' })
		expect(existsSync(a)).toBe(false)
		expect(ctx.store.getAgent('a')).toBeUndefined()
		expect(existsSync(b)).toBe(true)
	})

	it('never retires a pod record', () => {
		const src = readFileSync(fileURLToPath(new URL('./close.ts', import.meta.url)), 'utf8')
		expect(src).not.toMatch(/retirePod|pod retire['`]/)
	})
})
