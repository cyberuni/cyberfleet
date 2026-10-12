import { existsSync, mkdirSync, readdirSync, readFileSync, realpathSync, renameSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import {
	type AgentRecord,
	realExec,
	resolveProject,
	resolveService,
	type ServiceContext,
	type ServiceView,
	withOwnership,
} from 'cyberlegion'

// A project's Captain is cyberlegion's `captain` project service: one authoritative owner per
// project, fenced by generation, started by `cyberlegion service start` in the project's default
// checkout. cyberfleet adds the fleet policy on top — the Captain's home, and which Pods it owns.
// Every ownership change below runs inside `withOwnership`, so a session that is not the Captain at
// the generation it names cannot record, adopt, or retire a Pod.
//
// The project key is whatever cyberlegion resolved the project to. It is stored and compared, never
// parsed, so a key from another addressing scheme (cynapse, cyber-civitas decision 0004) drops in.

export const CAPTAIN_SERVICE = 'captain'

export interface PodBinding {
	pod: string
	/** The opaque project key the owning Captain's service lives under. */
	project: string
	/** The owning Captain's unit id, and the service generation it owned the Pod under. */
	captain: string
	generation: number
	mission?: string
	state: 'active' | 'retired'
	boundAt: string
	retiredAt?: string
	/** Earlier owners, oldest first — kept so an adoption stays explainable. */
	previous?: { captain: string; generation: number }[]
}

export interface CaptainView {
	project: string
	name: string
	/** The default checkout the Captain is based in. Mission edits never happen here. */
	home: string
	/** The branch the home is on now, and the remote's default branch — reported, never switched. */
	homeBranch?: string
	defaultBranch?: string
	health: ServiceView['health']
	generation: number
	owner?: string
	ownerHandle?: string
	control: ServiceView['control']
	note?: string
}

/**
 * Where the project's Captain stands, read-only: no claim, no start. A project whose Captain was
 * never started reads as `vacant` at generation 0.
 */
export function showCaptain(ctx: ServiceContext, projectRef: string): CaptainView {
	const project = resolveProject(ctx, projectRef)
	const exec = ctx.exec ?? realExec
	const branches = {
		homeBranch: exec('git', ['-C', project.root, 'branch', '--show-current']) || undefined,
		defaultBranch: exec('git', ['-C', project.root, 'symbolic-ref', '--short', 'refs/remotes/origin/HEAD'])?.replace(
			/^origin\//,
			'',
		),
	}
	const base = { project: project.id, name: project.name, home: project.root, ...branches }
	let view: ServiceView
	try {
		view = resolveService(ctx, project.id, CAPTAIN_SERVICE)
	} catch {
		return { ...base, health: 'vacant', generation: 0, control: 'none', note: 'no Captain has been started' }
	}
	return {
		...base,
		health: view.health,
		generation: view.lease.generation,
		owner: view.lease.holder,
		ownerHandle: view.owner?.handle,
		control: view.control,
		note: view.note,
	}
}

export interface PodAct {
	/** Any ref cyberlegion resolves to the project: its key, a path in any checkout, or its name. */
	project: string
	/** The acting Captain's unit id, and the generation it believes it owns. */
	captain: string
	generation: number
	pod: string
}

/**
 * Record `captain` as the one owner of `pod`. The pod must run in its own worktree of this project —
 * not the Captain's home, not another project's checkout. Rebinding the same owner is a no-op; a pod
 * another Captain generation owns is refused (recover it with `adoptPod`).
 */
export function bindPod(ctx: ServiceContext, act: PodAct & { mission?: string }): PodBinding {
	const podProject = podProjectOf(ctx, act.pod)
	return fenced(ctx, act, (view) => {
		if (podProject.id !== view.project.id)
			throw new Error(
				`pod "${act.pod}" runs in another project's checkout (${podProject.name}), not ${view.project.name}`,
			)
		if (podProject.worktree === view.project.root)
			throw new Error(`pod "${act.pod}" sits in the Captain's home; a pod needs its own worktree`)
		const existing = readBinding(ctx, act.pod)
		if (existing?.state === 'retired') throw new Error(`pod "${act.pod}" is already retired`)
		if (existing) {
			if (existing.captain === act.captain && existing.generation === act.generation) return existing
			throw new Error(
				`pod "${act.pod}" is owned by ${existing.captain} at generation ${existing.generation}; adopt it to take it over`,
			)
		}
		return writeBinding(ctx, {
			pod: act.pod,
			project: view.project.id,
			captain: act.captain,
			generation: act.generation,
			...(act.mission ? { mission: act.mission } : {}),
			state: 'active',
			boundAt: now(ctx),
		})
	})
}

/**
 * Explicit recovery: the current Captain takes over a pod whose owner is no longer the current
 * generation. Ownership never moves by a session merely contacting the Captain or reading its mail.
 */
export function adoptPod(ctx: ServiceContext, act: PodAct): PodBinding {
	return fenced(ctx, act, (view) => {
		const existing = activeBinding(ctx, act.pod, view)
		if (existing.generation === act.generation && existing.captain === act.captain)
			throw new Error(`${act.captain} already owns pod "${act.pod}" at generation ${act.generation}`)
		return writeBinding(ctx, {
			...existing,
			captain: act.captain,
			generation: act.generation,
			previous: [...(existing.previous ?? []), { captain: existing.captain, generation: existing.generation }],
		})
	})
}

/**
 * Retire a pod once its work is merged or abandoned — exactly once, and only by the Captain that
 * owns it now. The pod's unit is torn down separately (`cyberlegion unit close`).
 */
export function retirePod(ctx: ServiceContext, act: PodAct): PodBinding {
	return fenced(ctx, act, (view) => {
		const existing = activeBinding(ctx, act.pod, view)
		if (existing.captain !== act.captain || existing.generation !== act.generation)
			throw new Error(
				`pod "${act.pod}" is owned by ${existing.captain} at generation ${existing.generation}; adopt it before retiring it`,
			)
		return writeBinding(ctx, { ...existing, state: 'retired', retiredAt: now(ctx) })
	})
}

export interface PodRow extends PodBinding {
	handle?: string
	branch?: string
	/** Whether the pod's own session is still there. */
	live: boolean
	/**
	 * `current` — its Captain owns the service at the binding's generation and is healthy.
	 * `unavailable` — the binding is current but the Captain's session is gone; a restart or recovery
	 * of that Captain keeps it. `orphaned` — the service moved to a newer generation; the current
	 * Captain must adopt it. `retired` — done.
	 */
	owner: 'current' | 'unavailable' | 'orphaned' | 'retired'
}

/** Every recorded pod — of one project, or of all — with where its ownership stands now. */
export function listPods(ctx: ServiceContext, projectRef?: string): PodRow[] {
	const key = projectRef === undefined ? undefined : resolveProject(ctx, projectRef).id
	const views = new Map<string, ServiceView | undefined>()
	const viewOf = (project: string) => {
		if (!views.has(project)) {
			try {
				views.set(project, resolveService(ctx, project, CAPTAIN_SERVICE))
			} catch {
				views.set(project, undefined)
			}
		}
		return views.get(project)
	}
	return readBindings(ctx)
		.filter((b) => key === undefined || b.project === key)
		.map((b) => {
			const unit = ctx.store.getAgent(b.pod)
			return {
				...b,
				handle: unit?.handle,
				branch: unit?.worktree?.branch,
				live: unit ? isLive(ctx, unit) : false,
				owner: ownerState(b, viewOf(b.project)),
			}
		})
}

function ownerState(b: PodBinding, view: ServiceView | undefined): PodRow['owner'] {
	if (b.state === 'retired') return 'retired'
	if (!view || view.lease.generation !== b.generation || view.lease.holder !== b.captain) return 'orphaned'
	return view.lease.state === 'active' && view.health === 'healthy' ? 'current' : 'unavailable'
}

/** The registry's view of a pod's session; `cyberlegion unit show` probes its multiplexer. */
function isLive(ctx: ServiceContext, unit: AgentRecord): boolean {
	if (unit.status === 'exited' || unit.status === 'stopped') return false
	return ctx.isLive ? ctx.isLive(unit) : true
}

function fenced<T>(ctx: ServiceContext, act: PodAct, fn: (view: ServiceView) => T): T {
	return withOwnership(ctx, act.project, CAPTAIN_SERVICE, { unit: act.captain, generation: act.generation }, fn)
}

function activeBinding(ctx: ServiceContext, pod: string, view: ServiceView): PodBinding {
	const existing = readBinding(ctx, pod)
	if (!existing || existing.project !== view.project.id)
		throw new Error(`pod "${pod}" is not bound in ${view.project.name}`)
	if (existing.state === 'retired') throw new Error(`pod "${pod}" is already retired`)
	return existing
}

function podProjectOf(ctx: ServiceContext, pod: string) {
	const unit = ctx.store.getAgent(pod)
	if (!unit) throw new Error(`no unit "${pod}"`)
	if (!unit.worktree?.root) throw new Error(`pod "${pod}" has no worktree; a pod runs in its own project worktree`)
	const worktree = existsSync(unit.worktree.root) ? realpathSync(unit.worktree.root) : unit.worktree.root
	return { ...resolveProject(ctx, unit.worktree.root), worktree }
}

const now = (ctx: ServiceContext) => new Date(ctx.now?.() ?? Date.now()).toISOString()

const SAFE_ID = /^[A-Za-z0-9][A-Za-z0-9_.-]*$/

function podsDir(ctx: ServiceContext) {
	return join(ctx.store.root, 'cyberfleet', 'pods')
}

function bindingFile(ctx: ServiceContext, pod: string) {
	if (!SAFE_ID.test(pod)) throw new Error(`invalid pod id "${pod}"`)
	return join(podsDir(ctx), `${pod}.json`)
}

function readBinding(ctx: ServiceContext, pod: string): PodBinding | undefined {
	const file = bindingFile(ctx, pod)
	return existsSync(file) ? (JSON.parse(readFileSync(file, 'utf8')) as PodBinding) : undefined
}

function readBindings(ctx: ServiceContext): PodBinding[] {
	const dir = podsDir(ctx)
	if (!existsSync(dir)) return []
	return readdirSync(dir)
		.filter((f) => f.endsWith('.json'))
		.map((f) => JSON.parse(readFileSync(join(dir, f), 'utf8')) as PodBinding)
}

function writeBinding(ctx: ServiceContext, binding: PodBinding): PodBinding {
	const file = bindingFile(ctx, binding.pod)
	mkdirSync(podsDir(ctx), { recursive: true })
	const tmp = `${file}.${process.pid}.tmp`
	writeFileSync(tmp, `${JSON.stringify(binding, null, '\t')}\n`)
	renameSync(tmp, file)
	return binding
}
