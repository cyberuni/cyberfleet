import { existsSync, mkdirSync, readdirSync, readFileSync, realpathSync, renameSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import {
	type AgentRecord,
	realExec,
	resolveService,
	type ServiceContext,
	type ServiceView,
	withOwnership,
} from 'cyberlegion'
import { type ProjectAddress, projectAddressOf } from './project-address.ts'

// A project's Captain is cyberlegion's `captain` project service: one authoritative owner per
// project, fenced by generation, started by `cyberlegion service start` in the project's default
// checkout. cyberfleet adds the fleet policy on top — the Captain's home, and which Pods it owns.
// A Pod is owned by the Captain role, not by a session: each start of a Captain is a fresh session
// at a new lease generation (ADR-0024 §9), and the Pods stay with the role across them. Every
// ownership change below runs inside `withOwnership`, so a session that does not hold the role's
// lease at the generation it names cannot record or retire a Pod.
//
// The project key comes from `projectAddressOf`, the one place a checkout maps to a project. Here it
// is stored and compared, never parsed.

export const CAPTAIN_SERVICE = 'captain'

export interface PodBinding {
	pod: string
	/**
	 * The owner is the role, not a session: the Captain service of this project. Whichever session
	 * holds that lease acts for it, so a restart or a new Captain session moves nothing.
	 */
	project: string
	/** The addressing scheme `project` was minted under — a re-key finds its records by it. */
	keyScheme: string
	role: typeof CAPTAIN_SERVICE
	/** The sortie (an issue) the pod carries. */
	sortie?: string
	state: 'active' | 'retired'
	/** Audit stamps: the session that acted and the lease generation it acted under. */
	boundAt: string
	boundBy: string
	boundAtGeneration: number
	retiredAt?: string
	retiredBy?: string
	retiredAtGeneration?: number
}

export interface CaptainView {
	project: string
	name: string
	/** The default checkout the Captain is based in. Sortie edits never happen here. */
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
	const address = projectAddressOf(ctx, projectRef)
	const exec = ctx.exec ?? realExec
	const branches = {
		homeBranch: exec('git', ['-C', address.home, 'branch', '--show-current']) || undefined,
		defaultBranch: exec('git', ['-C', address.home, 'symbolic-ref', '--short', 'refs/remotes/origin/HEAD'])?.replace(
			/^origin\//,
			'',
		),
	}
	const base = { project: address.key, name: address.name, home: address.home, ...branches }
	let view: ServiceView
	try {
		view = resolveService(ctx, address.key, CAPTAIN_SERVICE)
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
	/** The acting Captain session's unit id, and the lease generation it believes it holds. */
	captain: string
	generation: number
	pod: string
}

/**
 * Record the project's Captain role as the one owner of `pod`, acting as the session that holds the
 * role's lease at `generation`. The pod must run in its own worktree of this project — not the
 * Captain's home, not another project's checkout. A pod the role already owns is left as it is,
 * whichever Captain session binds it again; a retired pod stays retired.
 */
export function bindPod(ctx: ServiceContext, act: PodAct & { sortie?: string }): PodBinding {
	const podProject = podProjectOf(ctx, act.pod)
	return fenced(ctx, act, (project) => {
		if (podProject.key !== project.key)
			throw new Error(`pod "${act.pod}" runs in another project's checkout (${podProject.name}), not ${project.name}`)
		if (podProject.worktree === project.home)
			throw new Error(`pod "${act.pod}" sits in the Captain's home; a pod needs its own worktree`)
		const existing = readBinding(ctx, act.pod)
		if (existing?.state === 'retired') throw new Error(`pod "${act.pod}" is already retired`)
		if (existing) return existing
		return writeBinding(ctx, {
			pod: act.pod,
			project: project.key,
			keyScheme: project.scheme,
			role: CAPTAIN_SERVICE,
			...(act.sortie ? { sortie: act.sortie } : {}),
			state: 'active',
			boundAt: now(ctx),
			boundBy: act.captain,
			boundAtGeneration: act.generation,
		})
	})
}

/**
 * Retire a pod once its work is merged or abandoned — exactly once, and only by the session holding
 * the Captain's lease now. The pod's unit is torn down separately (`cyberlegion unit close`).
 */
export function retirePod(ctx: ServiceContext, act: PodAct): PodBinding {
	return fenced(ctx, act, (project) => {
		const existing = activeBinding(ctx, act.pod, project)
		return writeBinding(ctx, {
			...existing,
			state: 'retired',
			retiredAt: now(ctx),
			retiredBy: act.captain,
			retiredAtGeneration: act.generation,
		})
	})
}

export interface PodRow extends PodBinding {
	handle?: string
	branch?: string
	/** Whether the pod's own session is still there. */
	live: boolean
	/**
	 * Read from the role's lease. `current` — a Captain session holds it and is healthy.
	 * `unavailable` — no Captain now (never started, released, expired, or unhealthy); the next one
	 * to take the lease has the pod with nothing to adopt. `retired` — done.
	 */
	owner: 'current' | 'unavailable' | 'retired'
}

/** Every recorded pod — of one project, or of all — with where its ownership stands now. */
export function listPods(ctx: ServiceContext, projectRef?: string): PodRow[] {
	const bindings = readBindings(ctx)
	// A stored key is matched as it is, so a binding stays listable under its own key even when no
	// runtime resolves that key any more; anything else is resolved to its project address first.
	const key =
		projectRef === undefined || bindings.some((b) => b.project === projectRef)
			? projectRef
			: projectAddressOf(ctx, projectRef).key
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
	return bindings
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
	return view?.lease.state === 'active' && view.health === 'healthy' ? 'current' : 'unavailable'
}

/** The registry's view of a pod's session; `cyberlegion unit show` probes its multiplexer. */
function isLive(ctx: ServiceContext, unit: AgentRecord): boolean {
	if (unit.status === 'exited' || unit.status === 'stopped') return false
	return ctx.isLive ? ctx.isLive(unit) : true
}

function fenced<T>(ctx: ServiceContext, act: PodAct, fn: (project: ProjectAddress) => T): T {
	const project = projectAddressOf(ctx, act.project)
	return withOwnership(ctx, project.key, CAPTAIN_SERVICE, { unit: act.captain, generation: act.generation }, () =>
		fn(project),
	)
}

function activeBinding(ctx: ServiceContext, pod: string, project: ProjectAddress): PodBinding {
	const existing = readBinding(ctx, pod)
	if (!existing || existing.project !== project.key) throw new Error(`pod "${pod}" is not bound in ${project.name}`)
	if (existing.state === 'retired') throw new Error(`pod "${pod}" is already retired`)
	return existing
}

function podProjectOf(ctx: ServiceContext, pod: string) {
	const unit = ctx.store.getAgent(pod)
	if (!unit) throw new Error(`no unit "${pod}"`)
	if (!unit.worktree?.root) throw new Error(`pod "${pod}" has no worktree; a pod runs in its own project worktree`)
	const worktree = existsSync(unit.worktree.root) ? realpathSync(unit.worktree.root) : unit.worktree.root
	return { ...projectAddressOf(ctx, unit.worktree.root), worktree }
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
