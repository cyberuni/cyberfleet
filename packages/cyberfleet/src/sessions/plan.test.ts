import { execFileSync } from 'node:child_process'
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { type AgentRecord, FileStore, send } from 'cyberlegion'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { buildPlan, pool, type Run, realRun } from './plan.ts'

// The planner against real git repositories. Only `gh` and `herdr` are stubbed: `gh` answers from
// the pull requests each test opens, and `herdr pane list` from a fixed pane table.

let work: string
let store: FileStore
let prs: Map<string, { number: number; state: string; headRefOid: string; headRefName: string }[]>
let calls: string[][]

const caller = { id: 'self0000', handle: 'council' }

function git(cwd: string, ...args: string[]): string {
	return execFileSync('git', ['-c', 'user.name=t', '-c', 'user.email=t@t', ...args], { cwd, encoding: 'utf8' }).trim()
}

function commit(cwd: string, file: string, text = file) {
	writeFileSync(join(cwd, file), text)
	git(cwd, 'add', file)
	git(cwd, 'commit', '-q', '-m', file)
	return git(cwd, 'rev-parse', 'HEAD')
}

/** A bare origin, a primary clone of it, and helpers to land work on the host. */
function repo(name: string) {
	const origin = join(work, `${name}.git`)
	execFileSync('git', ['init', '-q', '--bare', '-b', 'main', origin])
	const primary = join(work, name)
	execFileSync('git', ['clone', '-q', origin, primary])
	git(primary, 'checkout', '-q', '-b', 'main')
	commit(primary, 'README')
	git(primary, 'push', '-q', '-u', 'origin', 'main')
	prs.set(primary, [])
	const host = join(work, `${name}.host`)
	execFileSync('git', ['clone', '-q', origin, host])
	return {
		origin,
		primary,
		worktree(branch: string) {
			const path = join(work, `${name}.worktrees`, branch.replace('/', '-'))
			git(primary, 'worktree', 'add', '-q', '-b', branch, path)
			return path
		},
		/** Push a branch and open pull request `n` from it on the host. */
		open(from: string, branch: string, n: number) {
			git(from, 'push', '-q', 'origin', `HEAD:refs/heads/${branch}`)
			git(from, 'push', '-q', 'origin', `HEAD:refs/pull/${n}/head`)
			const list = prs.get(primary) ?? []
			list.push({ number: n, state: 'OPEN', headRefOid: git(from, 'rev-parse', 'HEAD'), headRefName: branch })
			prs.set(primary, list)
		},
		/** Squash-merge pull request `n` into main on the host, then delete its branch, as GitHub does. */
		squash(n: number) {
			const pr = prs.get(primary)?.find((p) => p.number === n)
			if (!pr) throw new Error(`no pr ${n}`)
			git(host, 'fetch', '-q', 'origin', `pull/${n}/head`, 'main')
			git(host, 'checkout', '-q', '-B', 'main', 'origin/main')
			git(host, 'merge', '-q', '--squash', 'FETCH_HEAD')
			git(host, 'commit', '-q', '-m', `squash #${n}`)
			git(host, 'push', '-q', 'origin', 'main')
			git(host, 'push', '-q', 'origin', `:refs/heads/${pr.headRefName}`)
			pr.state = 'MERGED'
		},
		/** Add a commit to pull request `n` from somewhere other than the unit's worktree. */
		pushToPr(n: number) {
			const pr = prs.get(primary)?.find((p) => p.number === n)
			if (!pr) throw new Error(`no pr ${n}`)
			git(host, 'fetch', '-q', 'origin', `pull/${n}/head`)
			git(host, 'checkout', '-q', '--detach', 'FETCH_HEAD')
			pr.headRefOid = commit(host, `review-${n}`)
			git(host, 'push', '-q', '-f', 'origin', `HEAD:refs/pull/${n}/head`)
		},
	}
}

function unit(id: string, over: Partial<AgentRecord> = {}): AgentRecord {
	const ts = new Date().toISOString()
	const rec: AgentRecord = {
		id,
		handle: `h-${id}`,
		harness: 'claude',
		cwd: work,
		worktree: null,
		pane: { mux: 'herdr', id: `p-${id}` },
		status: 'active',
		createdAt: ts,
		lastSeen: ts,
		...over,
	}
	store.putAgent(rec)
	return rec
}

const run: Run = async (cmd, args, cwd) => {
	calls.push([cmd, ...args])
	if (cmd === 'gh' && args[0] === 'pr') {
		const top = cwd
			? execFileSync('git', ['-C', cwd, 'rev-parse', '--path-format=absolute', '--git-common-dir'], {
					encoding: 'utf8',
				}).trim()
			: ''
		const primary = top.replace(/\/\.git$/, '')
		return { ok: true, stdout: JSON.stringify(prs.get(primary) ?? []) }
	}
	if (cmd === 'gh' && args[0] === 'repo') return { ok: true, stdout: 'main\n' }
	if (cmd === 'herdr')
		return { ok: true, stdout: JSON.stringify({ result: { panes: [{ pane_id: 'p-busy', agent_status: 'working' }] } }) }
	return realRun(cmd, args, cwd)
}

const plan = () => buildPlan({ store, caller, callerMux: 'herdr', run })
const unitOf = async (id: string) => (await plan()).units.find((u) => u.id === id)

beforeEach(() => {
	work = mkdtempSync(join(tmpdir(), 'cf-sessions-'))
	store = new FileStore(join(work, 'hub'))
	prs = new Map()
	calls = []
	unit(caller.id, { handle: caller.handle })
})
afterEach(() => rmSync(work, { recursive: true, force: true }))

describe('sessions plan: rule 13 against the host', () => {
	it('closes a unit whose pull request was squash-merged and whose branch was deleted', async () => {
		const r = repo('alpha')
		const wt = r.worktree('feat/x')
		commit(wt, 'x')
		r.open(wt, 'feat/x', 1)
		r.squash(1)
		unit('u1', { worktree: { root: wt, branch: 'feat/x' } })
		expect(await unitOf('u1')).toMatchObject({ rule: '15', result: 'close', prs: [1] })
	})

	it("fetches the pull request's head, so commits pushed to it from elsewhere still count as landed", async () => {
		const r = repo('alpha')
		const wt = r.worktree('feat/x')
		commit(wt, 'x')
		r.open(wt, 'feat/x', 1)
		r.pushToPr(1)
		r.squash(1)
		unit('u1', { worktree: { root: wt, branch: 'feat/x' } })
		expect(await unitOf('u1')).toMatchObject({ rule: '15', result: 'close' })
	})

	it('fetches each repository once, with the pull request heads of its own units', async () => {
		const a = repo('alpha')
		const b = repo('beta')
		const wa = a.worktree('feat/a')
		commit(wa, 'a')
		a.open(wa, 'feat/a', 3)
		a.squash(3)
		const wb = b.worktree('feat/b')
		commit(wb, 'b')
		b.open(wb, 'feat/b', 5)
		b.squash(5)
		unit('ua', { worktree: { root: wa, branch: 'feat/a' } })
		unit('ub', { worktree: { root: wb, branch: 'feat/b' } })
		await plan()
		const fetches = calls.filter((c) => c[0] === 'git' && c.includes('fetch'))
		expect(fetches).toHaveLength(2)
		expect(fetches.find((c) => c.includes(wa))).toContain('pull/3/head')
		expect(fetches.find((c) => c.includes(wb))).toContain('pull/5/head')
		expect(calls.filter((c) => c[0] === 'gh' && c[1] === 'pr')).toHaveLength(2)
	})

	it('keeps a live unit with a commit after its pull request', async () => {
		const r = repo('alpha')
		const wt = r.worktree('feat/x')
		commit(wt, 'x')
		r.open(wt, 'feat/x', 1)
		r.squash(1)
		commit(wt, 'more')
		unit('u1', { worktree: { root: wt, branch: 'feat/x' } })
		expect(await unitOf('u1')).toMatchObject({ rule: '13', result: 'keep' })
	})

	it("asks about an exited unit with commits found nowhere else, showing cherry's + lines", async () => {
		const r = repo('alpha')
		const wt = r.worktree('feat/x')
		commit(wt, 'lost')
		unit('u1', { worktree: { root: wt, branch: 'feat/x' }, status: 'exited' })
		const u = await unitOf('u1')
		expect(u).toMatchObject({ rule: '13', result: 'ask' })
		expect(u?.evidence?.commits?.lines[0]).toMatch(/^\+ [0-9a-f]+ lost$/)
	})

	it('closes an exited unit with no pull request whose commits are already on main', async () => {
		const r = repo('alpha')
		const wt = r.worktree('feat/x')
		unit('u1', { worktree: { root: wt, branch: 'feat/x' }, status: 'exited' })
		expect(await unitOf('u1')).toMatchObject({ rule: '15', result: 'close' })
	})
})

describe('sessions plan: local facts', () => {
	it('records the units unit prune deleted, by id and handle, and none when none were given', async () => {
		const pruned = await buildPlan({ store, caller, callerMux: 'herdr', run, pruned: [{ id: 'p1', handle: 'h-p1' }] })
		expect(pruned.pruned).toEqual([{ id: 'p1', handle: 'h-p1' }])
		expect((await plan()).pruned).toEqual([])
	})

	it('asks about leftover files in a landed worktree, ignoring the cyberlegion marker', async () => {
		const r = repo('alpha')
		const wt = r.worktree('feat/x')
		commit(wt, 'x')
		r.open(wt, 'feat/x', 1)
		r.squash(1)
		execFileSync('mkdir', ['-p', join(wt, '.agents/cyberlegion')])
		writeFileSync(join(wt, '.agents/cyberlegion/config.json'), '{}')
		writeFileSync(join(wt, 'scratch.txt'), 'x')
		unit('u1', { worktree: { root: wt, branch: 'feat/x' } })
		const u = await unitOf('u1')
		expect(u).toMatchObject({ rule: '14', result: 'ask' })
		expect(u?.evidence?.leftover?.lines).toEqual(['?? scratch.txt'])
	})

	it('judges a clean seat on a primary checkout that is level with its upstream as finished', async () => {
		const r = repo('alpha')
		unit('seat', { worktree: { root: r.primary, branch: 'main' } })
		expect(await unitOf('seat')).toMatchObject({ rule: '8d', result: 'close', seat: true })
	})

	it('keeps a seat ahead of its upstream', async () => {
		const r = repo('alpha')
		commit(r.primary, 'local')
		unit('seat', { worktree: { root: r.primary, branch: 'main' } })
		expect(await unitOf('seat')).toMatchObject({ rule: '8c', result: 'keep', seat: true })
	})

	it('asks about an exited unit with no worktree that holds unread mail, and closes one without', async () => {
		unit('quiet', { status: 'exited' })
		unit('mailed', { status: 'exited' })
		send({ store }, { fromId: caller.id, to: 'mailed', subject: 'report', body: 'x' })
		const p = await plan()
		expect(p.units.find((u) => u.id === 'quiet')).toMatchObject({ rule: '4c', result: 'close' })
		const mailed = p.units.find((u) => u.id === 'mailed')
		expect(mailed).toMatchObject({ rule: '4c', result: 'ask' })
		expect(mailed?.evidence?.mail?.items[0]).toMatchObject({ from: caller.handle, subject: 'report' })
	})

	it('closes an exited unit sharing a worktree whose owner is still recorded, without reading it', async () => {
		const r = repo('alpha')
		const wt = r.worktree('feat/x')
		commit(wt, 'lost')
		unit('owner', { worktree: { root: wt, branch: 'feat/x' } })
		unit('guest', { status: 'exited', sharedWorktree: { root: wt, branch: 'feat/x', owner: 'owner' } })
		const p = await plan()
		expect(p.units.find((u) => u.id === 'guest')).toMatchObject({
			rule: '4c',
			result: 'close',
			shared: { root: wt, owner: 'owner' },
		})
		expect(p.units.find((u) => u.id === 'owner')).toMatchObject({ rule: '12', result: 'keep' })
	})

	it("asks about an exited unit sharing a worktree whose owner is gone, showing the worktree's unlanded work", async () => {
		const r = repo('alpha')
		const wt = r.worktree('feat/x')
		commit(wt, 'lost')
		writeFileSync(join(wt, 'scratch.txt'), 'x')
		unit('guest', { status: 'exited', sharedWorktree: { root: wt, branch: 'feat/x', owner: 'gone0000' } })
		const u = await unitOf('guest')
		expect(u).toMatchObject({ rule: '4b', result: 'ask' })
		expect(u?.evidence?.commits?.lines[0]).toMatch(/^\+ [0-9a-f]+ lost$/)
		expect(u?.evidence?.leftover?.lines).toEqual(['?? scratch.txt'])
		expect(u?.root).toBeUndefined()
	})

	it('closes an exited unit sharing a worktree with no owner whose work was squash-merged', async () => {
		const r = repo('alpha')
		const wt = r.worktree('feat/x')
		commit(wt, 'x')
		commit(wt, 'y')
		r.open(wt, 'feat/x', 1)
		r.squash(1)
		unit('guest', { status: 'exited', sharedWorktree: { root: wt, branch: 'feat/x' } })
		expect(await unitOf('guest')).toMatchObject({ rule: '4c', result: 'close', prs: [] })
	})

	it('records herdr agent_status for a live pane', async () => {
		unit('busy', { pane: { mux: 'herdr', id: 'p-busy' } })
		expect(await unitOf('busy')).toMatchObject({ agentStatus: 'working' })
	})

	it('keeps units on another multiplexer and this session', async () => {
		unit('t1', { pane: { mux: 'tmux', id: '%1' } })
		const p = await plan()
		expect(p.units.find((u) => u.id === 't1')).toMatchObject({ rule: '3', result: 'keep' })
		expect(p.units.find((u) => u.id === caller.id)).toMatchObject({ rule: '1', result: 'keep' })
	})
})

describe('pool', () => {
	it('keeps at most `limit` calls in flight and returns results in order', async () => {
		let inFlight = 0
		let peak = 0
		const out = await pool([1, 2, 3, 4, 5], 2, async (n) => {
			inFlight++
			peak = Math.max(peak, inFlight)
			await new Promise((r) => setTimeout(r, 5))
			inFlight--
			return n * 2
		})
		expect(out).toEqual([2, 4, 6, 8, 10])
		expect(peak).toBe(2)
	})
})
