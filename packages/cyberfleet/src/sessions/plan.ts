// `cyberfleet sessions plan`: read the fleet, gather every fact the rule table reads, and classify
// each unit (`classify.ts`). Work is batched the way the facts are shared: one `gh pr list`, one
// default-branch lookup, and one fetch per repository, all repositories in parallel; then the
// per-worktree git checks, in parallel. The plan is written to a file, so the bulk of it never has
// to enter an agent's context, and `sessions ask` and `sessions close` act on that file.

import { execFile } from 'node:child_process'
import { existsSync, mkdirSync, readFileSync, realpathSync, writeFileSync } from 'node:fs'
import { dirname } from 'node:path'
import { type AgentRecord, type IdContext, landedWorktrees, prune, type Store } from 'cyberlegion'
import {
	classify,
	type MailItem,
	type PullRequest,
	type RepoFacts,
	type SharedFacts,
	type UnitFacts,
	type Verdict,
} from './classify.ts'

interface RunResult {
	ok: boolean
	stdout: string
}
/** Run one command without a shell. Never throws: a failure is `ok: false`. */
export type Run = (cmd: string, args: string[], cwd?: string) => Promise<RunResult>

export const realRun: Run = (cmd, args, cwd) =>
	new Promise((resolve) => {
		execFile(cmd, args, { cwd, maxBuffer: 64 * 1024 * 1024, encoding: 'utf8' }, (err, stdout) =>
			resolve({ ok: !err, stdout: stdout ?? '' }),
		)
	})

/** Map with at most `limit` calls in flight, so a 400-unit sweep does not start 400 git processes. */
export async function pool<T, R>(items: T[], limit: number, fn: (item: T) => Promise<R>): Promise<R[]> {
	const out: R[] = new Array(items.length)
	let next = 0
	const worker = async () => {
		while (next < items.length) {
			const i = next++
			out[i] = await fn(items[i] as T)
		}
	}
	await Promise.all(Array.from({ length: Math.min(limit, items.length) }, worker))
	return out
}

type Answer = { kind: 'done' } | { kind: 'unfinished'; reason: string } | { kind: 'none'; reason: string }

/** What `sessions close` re-reads before closing, to refuse a unit that changed since the plan. */
export interface Snapshot {
	status: string
	rootExists?: boolean
	head?: string
	porcelain?: string[] | null
}

export interface UnitPlan extends Verdict {
	id: string
	handle: string
	live: boolean
	seat: boolean
	branch?: string
	root?: string
	/** The worktree the unit works in but does not own. Closing the unit never touches it. */
	shared?: { root: string; branch?: string; owner?: string }
	/** herdr's `agent_status` for the unit's pane, when the caller is on herdr. */
	agentStatus?: string
	/** The unit's answer to the step-4 question, once `sessions ask` ran. */
	answer?: Answer
	snapshot: Snapshot
}

export interface Plan {
	version: 1
	createdAt: string
	caller: { id: string; handle: string; mux: string }
	/** Set once `sessions ask` has run against this plan. */
	askedAt?: string
	/** The exited records cyberlegion's `unit prune` deleted just before this plan read the fleet:
	 * each left nothing on disk to close. Absent from plans written before cyberlegion 2.0.0. */
	pruned?: PrunedUnit[]
	units: UnitPlan[]
}

export interface PrunedUnit {
	id: string
	handle: string
}

export interface PlanInput {
	store: Store
	caller: { id: string; handle: string }
	callerMux: string
	/** What `unit prune` deleted before this plan, recorded so the Council sees it. */
	pruned?: PrunedUnit[]
	run?: Run
	now?: () => number
	concurrency?: number
}

const lines = (s: string) => s.split('\n').filter((l) => l.length > 0)

function paneMux(rec: AgentRecord): string | undefined {
	if (rec.pane) return rec.pane.mux
	// Records written by older cyberlegion versions carry the pane under a legacy `tmux` key.
	return (rec as { tmux?: unknown }).tmux ? 'tmux' : undefined
}

function isStanding(rec: AgentRecord): boolean {
	if (rec.kind === 'standing' || rec.kind === 'service') return true
	const harness = rec.harness as string | undefined
	return paneMux(rec) === undefined && (!harness || harness === '-')
}

/** Read a unit's unread mail. Throws when the mailbox exists but cannot be read. */
function unreadOf(store: Store, id: string): MailItem[] {
	return store.listInbox(id).unread.map((m) => ({
		id: m.id,
		from: m.fromHandle || m.from,
		...(m.subject ? { subject: m.subject } : {}),
		sentAt: m.sentAt,
	}))
}

/** herdr's `agent_status` per pane id, from one `herdr pane list`. */
export async function herdrStatuses(run: Run): Promise<Map<string, string>> {
	const out = await run('herdr', ['pane', 'list'])
	const map = new Map<string, string>()
	if (!out.ok) return map
	try {
		const panes = JSON.parse(out.stdout)?.result?.panes
		if (Array.isArray(panes))
			for (const p of panes)
				if (typeof p?.pane_id === 'string' && typeof p.agent_status === 'string') map.set(p.pane_id, p.agent_status)
	} catch {}
	return map
}

async function status(run: Run, root: string): Promise<string[] | null> {
	const r = await run('git', ['-C', root, 'status', '--porcelain', '--untracked-files=all'])
	return r.ok ? lines(r.stdout) : null
}

async function head(run: Run, root: string): Promise<string | undefined> {
	const r = await run('git', ['-C', root, 'rev-parse', 'HEAD'])
	return r.ok ? r.stdout.trim() : undefined
}

/** The facts a later `sessions close` compares against, read fresh. */
export async function snapshotOf(run: Run, rec: AgentRecord): Promise<Snapshot> {
	const root = rec.worktree?.root
	if (!root) return { status: rec.status }
	const rootExists = existsSync(root)
	if (!rootExists) return { status: rec.status, rootExists }
	const [h, porcelain] = await Promise.all([head(run, root), status(run, root)])
	return { status: rec.status, rootExists, ...(h ? { head: h } : {}), porcelain }
}

/** Rule 13's two tests and rule 14's status, for one linked or shared worktree. */
async function landedOf(
	run: Run,
	root: string,
	branch: string | undefined,
	repo: RepoFacts,
	live: boolean,
): Promise<Pick<UnitFacts, 'porcelain' | 'headInPr' | 'cherry'>> {
	const porcelain = await status(run, root)
	const matching = (repo.prs ?? []).filter((p) => p.headRefName === branch && p.state !== 'OPEN')
	const inPr = await Promise.all(
		matching.map((p) => run('git', ['-C', root, 'merge-base', '--is-ancestor', 'HEAD', p.headRefOid])),
	)
	const headInPr = inPr.some((r) => r.ok)
	if (headInPr || live) return { porcelain, headInPr }
	if (!repo.fetched || !repo.defaultBranch) return { porcelain, headInPr, cherry: null }
	const cherry = await run('git', ['-C', root, 'cherry', '-v', `origin/${repo.defaultBranch}`, 'HEAD'])
	return { porcelain, headInPr, cherry: cherry.ok ? lines(cherry.stdout) : null }
}

interface Located {
	rec: AgentRecord
	facts: UnitFacts
	/** The checkout the git checks read: the owned worktree, or for rule 4b the shared one. */
	root?: string
	branch?: string
	commonDir?: string
}

const real = (p: string) => {
	try {
		return realpathSync(p.trim())
	} catch {
		return p.trim()
	}
}

/** Where a checkout's git directory and object store are; `undefined` when git cannot read it. */
async function gitDirsOf(run: Run, root: string): Promise<{ gitDir: string; commonDir: string } | undefined> {
	const [gitDir, commonDir] = await Promise.all([
		run('git', ['-C', root, 'rev-parse', '--absolute-git-dir']),
		run('git', ['-C', root, 'rev-parse', '--path-format=absolute', '--git-common-dir']),
	])
	if (!gitDir.ok || !commonDir.ok) return undefined
	return { gitDir: real(gitDir.stdout), commonDir: real(commonDir.stdout) }
}

export async function buildPlan(input: PlanInput): Promise<Plan> {
	const run = input.run ?? realRun
	const limit = input.concurrency ?? 8
	const now = input.now ?? Date.now
	const { store, caller, callerMux } = input
	const records = store.listAgents()

	// Rules 1–7 need only the record and local git: read where each worktree belongs.
	const located = await pool(records, limit, async (rec): Promise<Located> => {
		const mux = paneMux(rec)
		const facts: UnitFacts = {
			self: rec.id === caller.id,
			standing: isStanding(rec),
			live: rec.status !== 'exited',
			...(mux ? { mux } : {}),
			callerMux,
			hasWorktree: !!rec.worktree?.root,
			...(rec.worktree?.branch ? { branch: rec.worktree.branch } : {}),
		}
		if (facts.self || facts.standing || mux !== callerMux) return { rec, facts }
		const root = rec.worktree?.root
		if (!root) {
			if (facts.live) return { rec, facts }
			try {
				facts.unread = unreadOf(store, rec.id)
			} catch {
				facts.unread = null
			}
			// Rule 4b reads a shared worktree only when no owner's record is left to judge it.
			const sw = rec.sharedWorktree
			if (!sw?.root) return { rec, facts }
			const shared: SharedFacts = { ownerExists: !!sw.owner && !!store.getAgent(sw.owner) }
			facts.shared = shared
			if (shared.ownerExists) return { rec, facts }
			shared.rootExists = existsSync(sw.root)
			if (!shared.rootExists) return { rec, facts }
			const dirs = await gitDirsOf(run, sw.root)
			shared.gitReadable = !!dirs
			if (!dirs) return { rec, facts }
			return { rec, facts, root: sw.root, ...(sw.branch ? { branch: sw.branch } : {}), commonDir: dirs.commonDir }
		}
		facts.rootExists = existsSync(root)
		if (!facts.rootExists) return { rec, facts }
		const dirs = await gitDirsOf(run, root)
		facts.gitReadable = !!dirs
		if (!dirs) return { rec, facts }
		facts.primary = dirs.gitDir === dirs.commonDir
		return { rec, facts, root, ...(facts.branch ? { branch: facts.branch } : {}), commonDir: dirs.commonDir }
	})

	// Repositories: every linked worktree that reached rule 9, and every shared worktree rule 4b reads,
	// grouped by the object store it shares.
	const repos = new Map<string, Located[]>()
	for (const l of located) {
		if (!l.commonDir || l.facts.primary) continue
		const group = repos.get(l.commonDir) ?? []
		group.push(l)
		repos.set(l.commonDir, group)
	}
	const repoFacts = new Map<string, RepoFacts>()
	await pool([...repos], limit, async ([key, units]) => {
		const cwd = units[0]?.root as string
		const [list, view] = await Promise.all([
			run(
				'gh',
				['pr', 'list', '--state', 'all', '--limit', '1000', '--json', 'number,state,headRefOid,headRefName'],
				cwd,
			),
			run('gh', ['repo', 'view', '--json', 'defaultBranchRef', '--jq', '.defaultBranchRef.name'], cwd),
		])
		let prs: PullRequest[] | null = null
		if (list.ok) {
			try {
				prs = JSON.parse(list.stdout) as PullRequest[]
			} catch {}
		}
		const defaultBranch = view.ok ? view.stdout.trim() : ''
		if (!prs || !defaultBranch) {
			repoFacts.set(key, { prs, ...(defaultBranch ? { defaultBranch } : {}), fetched: false })
			return
		}
		const branches = new Set(units.map((u) => u.branch).filter(Boolean))
		const heads = prs
			.filter((p) => branches.has(p.headRefName) && p.state !== 'OPEN')
			.map((p) => `pull/${p.number}/head`)
		const fetch = await run('git', ['-C', cwd, 'fetch', '--quiet', 'origin', defaultBranch, ...heads])
		repoFacts.set(key, { prs, defaultBranch, fetched: fetch.ok })
	})

	// Per-worktree checks, in parallel: the seat rules, rule 13's two tests, and rule 14; and rule 4b's
	// same tests on a shared worktree.
	await pool(located, limit, async ({ facts, root, branch, commonDir }) => {
		if (!commonDir || !root) return
		if (facts.shared) {
			const repo = repoFacts.get(commonDir) as RepoFacts
			Object.assign(facts.shared, await landedOf(run, root, branch, repo, false))
			return
		}
		if (facts.primary) {
			const [porcelain, ahead] = await Promise.all([
				status(run, root),
				run('git', ['-C', root, 'rev-list', '--count', '@{upstream}..HEAD']),
			])
			facts.porcelain = porcelain
			facts.aheadOfUpstream = ahead.ok ? Number(ahead.stdout.trim()) : null
			return
		}
		const repo = repoFacts.get(commonDir) as RepoFacts
		facts.repo = repo
		Object.assign(facts, await landedOf(run, root, branch, repo, facts.live))
	})

	const statuses = callerMux === 'herdr' ? await herdrStatuses(run) : new Map<string, string>()
	const units = await pool(located, limit, async ({ rec, facts }): Promise<UnitPlan> => {
		const verdict = classify(facts)
		const pane = rec.pane?.id
		const agentStatus = facts.live && pane ? statuses.get(pane) : undefined
		return {
			id: rec.id,
			handle: rec.handle,
			live: facts.live,
			seat: !!facts.primary,
			...(rec.worktree?.branch ? { branch: rec.worktree.branch } : {}),
			...(rec.worktree?.root ? { root: rec.worktree.root } : {}),
			...(!rec.worktree?.root && rec.sharedWorktree?.root
				? {
						shared: {
							root: rec.sharedWorktree.root,
							...(rec.sharedWorktree.branch ? { branch: rec.sharedWorktree.branch } : {}),
							...(rec.sharedWorktree.owner ? { owner: rec.sharedWorktree.owner } : {}),
						},
					}
				: {}),
			...verdict,
			...(agentStatus ? { agentStatus } : {}),
			snapshot: await snapshotOf(run, rec),
		}
	})

	return {
		version: 1,
		createdAt: new Date(now()).toISOString(),
		caller: { ...caller, mux: callerMux },
		pruned: input.pruned ?? [],
		units,
	}
}

/**
 * Run cyberlegion's `unit prune` the way `sessions plan` needs it, and return what it deleted. It
 * deletes every exited unit with nothing left on disk to close, except the last record for a shared
 * worktree whose work has not landed (cyberlegion 2.0.1); that one reaches rule 4b. `landed` is
 * the worktree library's judgment, asked before prune's synchronous pass.
 */
export async function pruneBeforePlan(ctx: IdContext): Promise<PrunedUnit[]> {
	const landed = await landedWorktrees(ctx)
	return prune(ctx, { landed })
		.filter((r) => r.pruned === 'deleted')
		.map((r) => ({ id: r.id, handle: r.handle }))
}

export function writePlan(path: string, plan: Plan): void {
	mkdirSync(dirname(path), { recursive: true })
	writeFileSync(path, `${JSON.stringify(plan, null, 2)}\n`)
}

export function readPlan(path: string): Plan {
	const plan = JSON.parse(readFileSync(path, 'utf8')) as Plan
	if (plan?.version !== 1 || !Array.isArray(plan.units)) throw new Error(`${path} is not a cyberfleet sessions plan`)
	return plan
}
