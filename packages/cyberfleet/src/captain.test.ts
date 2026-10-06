import { execFileSync } from 'node:child_process'
import { mkdtempSync, realpathSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import {
	type AgentRecord,
	acquireService,
	bindService,
	FileStore,
	handoffService,
	type ServiceContext,
	ServiceOwnershipError,
} from 'cyberlegion'
import { beforeEach, describe, expect, it } from 'vitest'
import { adoptPod, bindPod, CAPTAIN_SERVICE, listPods, retirePod, showCaptain } from './captain.ts'

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
	it("records the current Captain as the pod's one owner, at its generation", () => {
		const { root, trees } = repo('alpha', 'pod-1')
		unit('cap', root)
		unit('pod1', root, trees[0])
		const generation = startCaptain(root, 'cap')
		const binding = bindPod(ctx, { project: root, captain: 'cap', generation, pod: 'pod1', mission: 'github-25' })
		expect(binding).toMatchObject({ pod: 'pod1', captain: 'cap', generation, mission: 'github-25', state: 'active' })
		expect(listPods(ctx, root).map((p) => p.pod)).toEqual(['pod1'])
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

	it('refuses to give an owned pod a second owner', () => {
		const { root, trees } = repo('alpha', 'pod-1')
		unit('cap', root)
		unit('cap2', root)
		unit('pod1', root, trees[0])
		const old = startCaptain(root, 'cap')
		bindPod(ctx, { project: root, captain: 'cap', generation: old, pod: 'pod1' })
		const current = handoffService(ctx, root, CAPTAIN_SERVICE, { generation: old, from: 'cap', to: 'cap2' }).lease
			.generation
		expect(() => bindPod(ctx, { project: root, captain: 'cap2', generation: current, pod: 'pod1' })).toThrow(/adopt/)
	})

	it('is idempotent for the same Captain and generation', () => {
		const { root, trees } = repo('alpha', 'pod-1')
		unit('cap', root)
		unit('pod1', root, trees[0])
		const generation = startCaptain(root, 'cap')
		bindPod(ctx, { project: root, captain: 'cap', generation, pod: 'pod1' })
		expect(bindPod(ctx, { project: root, captain: 'cap', generation, pod: 'pod1' })).toMatchObject({ state: 'active' })
	})
})

describe('retirePod', () => {
	it('retires once; a second retirement is refused', () => {
		const { root, trees } = repo('alpha', 'pod-1')
		unit('cap', root)
		unit('pod1', root, trees[0])
		const generation = startCaptain(root, 'cap')
		bindPod(ctx, { project: root, captain: 'cap', generation, pod: 'pod1' })
		expect(retirePod(ctx, { project: root, captain: 'cap', generation, pod: 'pod1' })).toMatchObject({
			state: 'retired',
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

	it('refuses the current Captain on a pod it has not adopted', () => {
		const { root, trees } = repo('alpha', 'pod-1')
		unit('cap', root)
		unit('cap2', root)
		unit('pod1', root, trees[0])
		const old = startCaptain(root, 'cap')
		bindPod(ctx, { project: root, captain: 'cap', generation: old, pod: 'pod1' })
		const current = handoffService(ctx, root, CAPTAIN_SERVICE, { generation: old, from: 'cap', to: 'cap2' }).lease
			.generation
		expect(() => retirePod(ctx, { project: root, captain: 'cap2', generation: current, pod: 'pod1' })).toThrow(/adopt/)
	})

	it('refuses a pod that was never bound', () => {
		const { root, trees } = repo('alpha', 'pod-1')
		unit('cap', root)
		unit('pod1', root, trees[0])
		const generation = startCaptain(root, 'cap')
		expect(() => retirePod(ctx, { project: root, captain: 'cap', generation, pod: 'pod1' })).toThrow(/not bound/)
	})
})

describe('recovery — orphaned and unavailable work stays visible', () => {
	it('shows a pod whose Captain session is gone as unavailable, not dropped', () => {
		const { root, trees } = repo('alpha', 'pod-1')
		unit('cap', root)
		unit('pod1', root, trees[0])
		const generation = startCaptain(root, 'cap')
		bindPod(ctx, { project: root, captain: 'cap', generation, pod: 'pod1' })
		live.delete('cap')
		expect(listPods(ctx, root)).toMatchObject([{ pod: 'pod1', owner: 'unavailable', live: true }])
	})

	it('shows a pod as orphaned once a new Captain generation replaces its owner', () => {
		const { root, trees } = repo('alpha', 'pod-1')
		unit('cap', root)
		unit('cap2', root)
		unit('pod1', root, trees[0])
		const old = startCaptain(root, 'cap')
		bindPod(ctx, { project: root, captain: 'cap', generation: old, pod: 'pod1' })
		live.delete('cap')
		startCaptain(root, 'cap2')
		expect(listPods(ctx, root)).toMatchObject([{ pod: 'pod1', captain: 'cap', owner: 'orphaned' }])
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

	it('lets the current Captain adopt an orphaned pod, after which the old owner cannot act on it', () => {
		const { root, trees } = repo('alpha', 'pod-1')
		unit('cap', root)
		unit('cap2', root)
		unit('pod1', root, trees[0])
		const old = startCaptain(root, 'cap')
		bindPod(ctx, { project: root, captain: 'cap', generation: old, pod: 'pod1' })
		live.delete('cap')
		const current = startCaptain(root, 'cap2')
		expect(adoptPod(ctx, { project: root, captain: 'cap2', generation: current, pod: 'pod1' })).toMatchObject({
			captain: 'cap2',
			generation: current,
			state: 'active',
		})
		expect(listPods(ctx, root)).toMatchObject([{ pod: 'pod1', owner: 'current' }])
		live.add('cap')
		expect(() => retirePod(ctx, { project: root, captain: 'cap', generation: old, pod: 'pod1' })).toThrow(/stale|own/i)
	})

	it('refuses to adopt a pod its current Captain still owns', () => {
		const { root, trees } = repo('alpha', 'pod-1')
		unit('cap', root)
		unit('pod1', root, trees[0])
		const generation = startCaptain(root, 'cap')
		bindPod(ctx, { project: root, captain: 'cap', generation, pod: 'pod1' })
		expect(() => adoptPod(ctx, { project: root, captain: 'cap', generation, pod: 'pod1' })).toThrow(/already owns/)
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
		expect(listPods(ctx, b.root)).toMatchObject([{ pod: 'b1', captain: 'capB' }])
		expect(listPods(ctx).length).toBe(3)
	})

	it('treats the project key as opaque: a binding is found by any ref that resolves to it', () => {
		const { root, trees } = repo('alpha', 'pod-1')
		unit('cap', root)
		unit('pod1', root, trees[0])
		const generation = startCaptain(root, 'cap')
		const binding = bindPod(ctx, { project: trees[0] as string, captain: 'cap', generation, pod: 'pod1' })
		expect(listPods(ctx, binding.project).map((p) => p.pod)).toEqual(['pod1'])
		expect(listPods(ctx, 'alpha').map((p) => p.pod)).toEqual(['pod1'])
	})
})
