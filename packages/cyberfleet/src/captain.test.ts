import { execFile, execFileSync } from 'node:child_process'
import { mkdirSync, mkdtempSync, realpathSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import {
	type AgentRecord,
	acquireService,
	bindService,
	FileStore,
	handoffService,
	releaseService,
	type ServiceContext,
	ServiceOwnershipError,
} from 'cyberlegion'
import { beforeEach, describe, expect, it } from 'vitest'
import { bindPod, CAPTAIN_SERVICE, listPods, type PodBinding, type PodRow, retirePod, showCaptain } from './captain.ts'

// A project has one authoritative Captain — cyberlegion's `captain` project service, fenced by
// generation — and every Pod it spawns is bound to exactly one owning Captain. These tests drive the
// ownership ledger against a real hub and real git checkouts; only session liveness is injected.

let work: string
let live: Set<string>
let ctx: ServiceContext

function git(cwd: string, ...args: string[]) {
	execFileSync('git', args, { cwd, stdio: 'ignore' })
}

/** A repository with a default checkout and one linked worktree per extra name. */
function repo(name: string, ...worktrees: string[]) {
	const root = join(work, name)
	execFileSync('git', ['init', '-q', '-b', 'main', root])
	git(root, '-c', 'user.name=t', '-c', 'user.email=t@t', 'commit', '-q', '--allow-empty', '-m', 'init')
	const trees = worktrees.map((w) => {
		const path = join(work, `${name}.worktrees`, w)
		git(root, 'worktree', 'add', '-q', '-b', w, path)
		return path
	})
	return { root, trees }
}

function unit(id: string, cwd: string, worktree?: string): AgentRecord {
	const ts = new Date().toISOString()
	const rec: AgentRecord = {
		id,
		handle: id,
		harness: 'claude',
		cwd: worktree ?? cwd,
		worktree: worktree ? { root: worktree, branch: id } : null,
		pane: null,
		status: 'active',
		createdAt: ts,
		lastSeen: ts,
	}
	ctx.store.putAgent(rec)
	live.add(id)
	return rec
}

/** Start the project's Captain the way `cyberlegion service start` does: acquire, then bind. */
function startCaptain(project: string, captain: string) {
	const acquired = acquireService(ctx, project, CAPTAIN_SERVICE)
	if (acquired.outcome !== 'reserved') throw new Error(`expected a reservation, got ${acquired.outcome}`)
	return bindService(ctx, project, CAPTAIN_SERVICE, {
		generation: acquired.lease.generation,
		token: acquired.token,
		unit: captain,
	}).lease.generation
}

const CAPTAIN_MODULE = fileURLToPath(new URL('./captain.ts', import.meta.url))

/**
 * Run one ownership call in its own process against the shared hub, so calls really interleave.
 * Every unit counts as live there, as in this file's tests.
 */
function race(hub: string, call: string): Promise<{ ok: true; value: unknown } | { ok: false; error: string }> {
	const script = `
		import { FileStore, handoffService } from 'cyberlegion'
		import { bindPod } from ${JSON.stringify(CAPTAIN_MODULE)}
		const ctx = { store: new FileStore(${JSON.stringify(hub)}), env: {}, isLive: () => true }
		try { console.log(JSON.stringify({ ok: true, value: ${call} })) }
		catch (e) { console.log(JSON.stringify({ ok: false, error: String(e?.message ?? e) })) }
	`
	return new Promise((resolve, reject) =>
		execFile(
			process.execPath,
			['--input-type=module', '-e', script],
			{ cwd: fileURLToPath(new URL('.', import.meta.url)) },
			(err, stdout) => (err ? reject(err) : resolve(JSON.parse(stdout))),
		),
	)
}

/** A listed row, back to the binding it was read from. */
function bindingOf({ handle: _h, branch: _b, live: _l, owner: _o, ...binding }: PodRow): PodBinding {
	return binding
}

beforeEach(() => {
	work = realpathSync(mkdtempSync(join(tmpdir(), 'cf-captain-')))
	live = new Set()
	ctx = {
		store: new FileStore(join(work, 'hub')),
		env: {},
		isLive: (u) => live.has(u.id),
	}
})

describe('showCaptain', () => {
	it('reports a project with no Captain yet as vacant, homed at its default checkout', () => {
		const { root, trees } = repo('alpha', 'pod-1')
		const view = showCaptain(ctx, trees[0] as string)
		expect(view).toMatchObject({ health: 'vacant', home: root, generation: 0 })
		expect(view.owner).toBeUndefined()
	})

	it('names the healthy owner and its generation, from any checkout of the project', () => {
		const { root, trees } = repo('alpha', 'pod-1')
		unit('cap', root)
		const generation = startCaptain(root, 'cap')
		const view = showCaptain(ctx, trees[0] as string)
		expect(view).toMatchObject({ health: 'healthy', owner: 'cap', generation, home: root })
	})

	it('reports the home branch without switching it', () => {
		const { root } = repo('alpha')
		git(root, 'remote', 'add', 'origin', root)
		git(root, 'fetch', '-q', 'origin')
		git(root, 'symbolic-ref', 'refs/remotes/origin/HEAD', 'refs/remotes/origin/main')
		git(root, 'switch', '-q', '-c', 'feature')
		expect(showCaptain(ctx, root)).toMatchObject({ homeBranch: 'feature', defaultBranch: 'main' })
		expect(execFileSync('git', ['branch', '--show-current'], { cwd: root, encoding: 'utf8' }).trim()).toBe('feature')
	})
})

describe('bindPod', () => {
	it("records the Captain role as the pod's one owner, stamped with the binding session and generation", () => {
		const { root, trees } = repo('alpha', 'pod-1')
		unit('cap', root)
		unit('pod1', root, trees[0])
		const generation = startCaptain(root, 'cap')
		const binding = bindPod(ctx, { project: root, captain: 'cap', generation, pod: 'pod1', sortie: 'github-25' })
		expect(binding).toMatchObject({
			pod: 'pod1',
			project: showCaptain(ctx, root).project,
			keyScheme: 'cyberlegion',
			role: CAPTAIN_SERVICE,
			boundBy: 'cap',
			boundAtGeneration: generation,
			sortie: 'github-25',
			state: 'active',
		})
		expect(listPods(ctx, root)).toMatchObject([{ pod: 'pod1', owner: 'current' }])
	})

	it('refuses a session that does not own the Captain service', () => {
		const { root, trees } = repo('alpha', 'pod-1')
		unit('cap', root)
		unit('caller', root)
		unit('pod1', root, trees[0])
		const generation = startCaptain(root, 'cap')
		expect(() => bindPod(ctx, { project: root, captain: 'caller', generation, pod: 'pod1' })).toThrow(
			ServiceOwnershipError,
		)
		expect(listPods(ctx, root)).toEqual([])
	})

	it('refuses a stale Captain after the service moved to a new generation', () => {
		const { root, trees } = repo('alpha', 'pod-1')
		unit('cap', root)
		unit('cap2', root)
		unit('pod1', root, trees[0])
		const old = startCaptain(root, 'cap')
		handoffService(ctx, root, CAPTAIN_SERVICE, { generation: old, from: 'cap', to: 'cap2' })
		expect(() => bindPod(ctx, { project: root, captain: 'cap', generation: old, pod: 'pod1' })).toThrow(/stale|own/i)
	})

	it('refuses a pod with no worktree, or one sitting in the Captain home', () => {
		const { root } = repo('alpha')
		unit('cap', root)
		unit('homeless', root)
		const generation = startCaptain(root, 'cap')
		expect(() => bindPod(ctx, { project: root, captain: 'cap', generation, pod: 'homeless' })).toThrow(/worktree/)
		unit('squatter', root, root)
		expect(() => bindPod(ctx, { project: root, captain: 'cap', generation, pod: 'squatter' })).toThrow(/home/)
	})

	it('refuses a pod whose worktree belongs to another project', () => {
		const a = repo('alpha')
		const b = repo('beta', 'pod-b')
		unit('cap', a.root)
		unit('podb', b.root, b.trees[0])
		const generation = startCaptain(a.root, 'cap')
		expect(() => bindPod(ctx, { project: a.root, captain: 'cap', generation, pod: 'podb' })).toThrow(/another project/)
	})

	it('leaves a pod the role already owns as it is, whichever Captain session binds it again', () => {
		const { root, trees } = repo('alpha', 'pod-1')
		unit('cap', root)
		unit('cap2', root)
		unit('pod1', root, trees[0])
		const old = startCaptain(root, 'cap')
		const first = bindPod(ctx, { project: root, captain: 'cap', generation: old, pod: 'pod1', sortie: 'github-1' })
		expect(bindPod(ctx, { project: root, captain: 'cap', generation: old, pod: 'pod1' })).toEqual(first)
		const current = handoffService(ctx, root, CAPTAIN_SERVICE, { generation: old, from: 'cap', to: 'cap2' }).lease
			.generation
		expect(bindPod(ctx, { project: root, captain: 'cap2', generation: current, pod: 'pod1' })).toEqual(first)
	})

	it('refuses to bind a pod again once it is retired', () => {
		const { root, trees } = repo('alpha', 'pod-1')
		unit('cap', root)
		unit('pod1', root, trees[0])
		const generation = startCaptain(root, 'cap')
		bindPod(ctx, { project: root, captain: 'cap', generation, pod: 'pod1' })
		retirePod(ctx, { project: root, captain: 'cap', generation, pod: 'pod1' })
		expect(() => bindPod(ctx, { project: root, captain: 'cap', generation, pod: 'pod1' })).toThrow(/already retired/)
		expect(listPods(ctx, root)).toMatchObject([{ pod: 'pod1', owner: 'retired' }])
	})

	it('writes one record when sessions race to bind a pod while the lease is handed off', async () => {
		const { root, trees } = repo('alpha', 'pod-1')
		unit('cap', root)
		unit('cap2', root)
		unit('pod1', root, trees[0])
		const generation = startCaptain(root, 'cap')
		const hub = ctx.store.root
		const binders = [1, 2, 3, 4, 5, 6].map((n) =>
			race(
				hub,
				`bindPod(ctx, { project: ${JSON.stringify(root)}, captain: 'cap', generation: ${generation}, pod: 'pod1', sortie: 'github-${n}' })`,
			),
		)
		const handoff = race(
			hub,
			`handoffService(ctx, ${JSON.stringify(root)}, 'captain', { generation: ${generation}, from: 'cap', to: 'cap2' })`,
		)
		const [results, handedOff] = await Promise.all([Promise.all(binders), handoff])
		expect(handedOff).toMatchObject({ ok: true })
		const stored = listPods(ctx, root)
		const bound = results.filter((r) => r.ok)
		for (const r of results.filter((r) => !r.ok)) expect(r.error).toMatch(/stale|own/i)
		if (bound.length === 0) expect(stored).toEqual([])
		else {
			expect(stored).toHaveLength(1)
			for (const r of bound) expect(r.value).toEqual(bindingOf(stored[0] as PodRow))
		}
	})
})

describe('retirePod', () => {
	it('retires once, stamped with the retiring session; a second retirement is refused', () => {
		const { root, trees } = repo('alpha', 'pod-1')
		unit('cap', root)
		unit('pod1', root, trees[0])
		const generation = startCaptain(root, 'cap')
		bindPod(ctx, { project: root, captain: 'cap', generation, pod: 'pod1' })
		expect(retirePod(ctx, { project: root, captain: 'cap', generation, pod: 'pod1' })).toMatchObject({
			state: 'retired',
			retiredBy: 'cap',
			retiredAtGeneration: generation,
		})
		expect(() => retirePod(ctx, { project: root, captain: 'cap', generation, pod: 'pod1' })).toThrow(/already retired/)
	})

	it('refuses a stale Captain', () => {
		const { root, trees } = repo('alpha', 'pod-1')
		unit('cap', root)
		unit('cap2', root)
		unit('pod1', root, trees[0])
		const old = startCaptain(root, 'cap')
		bindPod(ctx, { project: root, captain: 'cap', generation: old, pod: 'pod1' })
		handoffService(ctx, root, CAPTAIN_SERVICE, { generation: old, from: 'cap', to: 'cap2' })
		expect(() => retirePod(ctx, { project: root, captain: 'cap', generation: old, pod: 'pod1' })).toThrow(/stale|own/i)
	})

	it('lets a later Captain session retire a pod an earlier one bound, with no adoption', () => {
		const { root, trees } = repo('alpha', 'pod-1')
		unit('cap', root)
		unit('cap2', root)
		unit('pod1', root, trees[0])
		const old = startCaptain(root, 'cap')
		bindPod(ctx, { project: root, captain: 'cap', generation: old, pod: 'pod1' })
		const current = handoffService(ctx, root, CAPTAIN_SERVICE, { generation: old, from: 'cap', to: 'cap2' }).lease
			.generation
		expect(retirePod(ctx, { project: root, captain: 'cap2', generation: current, pod: 'pod1' })).toMatchObject({
			boundBy: 'cap',
			boundAtGeneration: old,
			retiredBy: 'cap2',
			retiredAtGeneration: current,
		})
	})

	it('refuses a pod that was never bound', () => {
		const { root, trees } = repo('alpha', 'pod-1')
		unit('cap', root)
		unit('pod1', root, trees[0])
		const generation = startCaptain(root, 'cap')
		expect(() => retirePod(ctx, { project: root, captain: 'cap', generation, pod: 'pod1' })).toThrow(/not bound/)
	})
})

describe('between Captain sessions — the role keeps its pods, and they stay visible', () => {
	it('shows a pod as unavailable after its Captain releases the lease cleanly, then current under the next', () => {
		const { root, trees } = repo('alpha', 'pod-1')
		unit('cap', root)
		unit('cap2', root)
		unit('pod1', root, trees[0])
		const old = startCaptain(root, 'cap')
		bindPod(ctx, { project: root, captain: 'cap', generation: old, pod: 'pod1' })
		releaseService(ctx, root, CAPTAIN_SERVICE, { generation: old, unit: 'cap' })
		expect(listPods(ctx, root)).toMatchObject([{ pod: 'pod1', owner: 'unavailable', live: true }])
		const next = startCaptain(root, 'cap2')
		expect(listPods(ctx, root)).toMatchObject([{ pod: 'pod1', owner: 'current' }])
		expect(retirePod(ctx, { project: root, captain: 'cap2', generation: next, pod: 'pod1' })).toMatchObject({
			state: 'retired',
		})
	})

	it('keeps a pod current when the same unit restarts at a new generation, and fences the old one out', () => {
		const { root, trees } = repo('alpha', 'pod-1')
		unit('cap', root)
		unit('pod1', root, trees[0])
		const old = startCaptain(root, 'cap')
		bindPod(ctx, { project: root, captain: 'cap', generation: old, pod: 'pod1' })
		releaseService(ctx, root, CAPTAIN_SERVICE, { generation: old, unit: 'cap' })
		const restarted = startCaptain(root, 'cap')
		expect(restarted).toBeGreaterThan(old)
		expect(listPods(ctx, root)).toMatchObject([{ pod: 'pod1', owner: 'current' }])
		expect(() => retirePod(ctx, { project: root, captain: 'cap', generation: old, pod: 'pod1' })).toThrow(/stale|own/i)
		expect(retirePod(ctx, { project: root, captain: 'cap', generation: restarted, pod: 'pod1' })).toMatchObject({
			state: 'retired',
		})
	})

	it('shows a pod whose Captain session is gone as unavailable, not dropped', () => {
		const { root, trees } = repo('alpha', 'pod-1')
		unit('cap', root)
		unit('pod1', root, trees[0])
		const generation = startCaptain(root, 'cap')
		bindPod(ctx, { project: root, captain: 'cap', generation, pod: 'pod1' })
		live.delete('cap')
		expect(listPods(ctx, root)).toMatchObject([{ pod: 'pod1', owner: 'unavailable', live: true }])
	})

	it('shows a pod whose own session is gone as not live', () => {
		const { root, trees } = repo('alpha', 'pod-1')
		unit('cap', root)
		unit('pod1', root, trees[0])
		const generation = startCaptain(root, 'cap')
		bindPod(ctx, { project: root, captain: 'cap', generation, pod: 'pod1' })
		live.delete('pod1')
		expect(listPods(ctx, root)).toMatchObject([{ pod: 'pod1', owner: 'current', live: false }])
	})
})

describe('listPods across projects', () => {
	it('keeps two projects and their Captains independent', () => {
		const a = repo('alpha', 'pod-a1', 'pod-a2')
		const b = repo('beta', 'pod-b1')
		unit('capA', a.root)
		unit('capB', b.root)
		unit('a1', a.root, a.trees[0])
		unit('a2', a.root, a.trees[1])
		unit('b1', b.root, b.trees[0])
		const ga = startCaptain(a.root, 'capA')
		const gb = startCaptain(b.root, 'capB')
		bindPod(ctx, { project: a.root, captain: 'capA', generation: ga, pod: 'a1' })
		bindPod(ctx, { project: a.root, captain: 'capA', generation: ga, pod: 'a2' })
		bindPod(ctx, { project: b.root, captain: 'capB', generation: gb, pod: 'b1' })
		expect(
			listPods(ctx, a.root)
				.map((p) => p.pod)
				.sort(),
		).toEqual(['a1', 'a2'])
		expect(listPods(ctx, b.root)).toMatchObject([{ pod: 'b1', boundBy: 'capB' }])
		expect(listPods(ctx).length).toBe(3)
	})

	it('finds a binding by any ref that resolves to its project', () => {
		const { root, trees } = repo('alpha', 'pod-1')
		unit('cap', root)
		unit('pod1', root, trees[0])
		const generation = startCaptain(root, 'cap')
		const binding = bindPod(ctx, { project: trees[0] as string, captain: 'cap', generation, pod: 'pod1' })
		expect(listPods(ctx, binding.project).map((p) => p.pod)).toEqual(['pod1'])
		expect(listPods(ctx, 'alpha').map((p) => p.pod)).toEqual(['pod1'])
	})
	it('keeps a binding whose key no runtime resolves listable under that key, never parsed', () => {
		const key = 'cynapse:acme/widget'
		mkdirSync(join(ctx.store.root, 'cyberfleet', 'pods'), { recursive: true })
		writeFileSync(
			join(ctx.store.root, 'cyberfleet', 'pods', 'pod9.json'),
			JSON.stringify({ pod: 'pod9', project: key, keyScheme: 'cynapse', role: 'captain', state: 'active' }),
		)
		expect(listPods(ctx, key)).toMatchObject([{ pod: 'pod9', project: key, owner: 'unavailable' }])
		expect(listPods(ctx).map((p) => p.pod)).toEqual(['pod9'])
	})
})
