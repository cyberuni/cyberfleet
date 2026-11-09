// `cyberfleet sessions plan`: read the fleet, gather every fact the rule table reads, and classify
// each unit (`classify.ts`). Work is batched the way the facts are shared: one `gh pr list`, one
// default-branch lookup, and one fetch per repository, all repositories in parallel; then the
// per-worktree git checks, in parallel. The plan is written to a file, so the bulk of it never has
// to enter an agent's context, and `sessions ask` and `sessions close` act on that file.

import { execFile } from 'node:child_process'
import { existsSync, mkdirSync, readFileSync, realpathSync, writeFileSync } from 'node:fs'
import { dirname } from 'node:path'
import type { AgentRecord, Store } from 'cyberlegion'
import { classify, type MailItem, type PullRequest, type RepoFacts, type UnitFacts, type Verdict } from './classify.ts'

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
	units: UnitPlan[]
}

export interface PlanInput {
	store: Store
	caller: { id: string; handle: string }
	callerMux: string
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

interface Located {
	rec: AgentRecord
	facts: UnitFacts
	commonDir?: string
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
			if (!facts.live) {
				try {
					facts.unread = unreadOf(store, rec.id)
				} catch {
					facts.unread = null
				}
			}
			return { rec, facts }
		}
		facts.rootExists = existsSync(root)
		if (!facts.rootExists) return { rec, facts }
		const [gitDir, commonDir] = await Promise.all([
			run('git', ['-C', root, 'rev-parse', '--absolute-git-dir']),
			run('git', ['-C', root, 'rev-parse', '--path-format=absolute', '--git-common-dir']),
		])
		facts.gitReadable = gitDir.ok && commonDir.ok
		if (!facts.gitReadable) return { rec, facts }
		const real = (p: string) => {
			try {
				return realpathSync(p.trim())
			} catch {
				return p.trim()
			}
		}
		const common = real(commonDir.stdout)
		facts.primary = real(gitDir.stdout) === common
		return { rec, facts, commonDir: common }
	})

	// Repositories: every linked worktree that reached rule 9, grouped by the object store it shares.
	const repos = new Map<string, Located[]>()
	for (const l of located) {
		if (!l.commonDir || l.facts.primary) continue
		const group = repos.get(l.commonDir) ?? []
		group.push(l)
		repos.set(l.commonDir, group)
	}
	const repoFacts = new Map<string, RepoFacts>()
	await pool([...repos], limit, async ([key, units]) => {
		const cwd = units[0]?.rec.worktree?.root as string
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
		const branches = new Set(units.map((u) => u.facts.branch).filter(Boolean))
		const heads = prs
			.filter((p) => branches.has(p.headRefName) && p.state !== 'OPEN')
			.map((p) => `pull/${p.number}/head`)
		const fetch = await run('git', ['-C', cwd, 'fetch', '--quiet', 'origin', defaultBranch, ...heads])
		repoFacts.set(key, { prs, defaultBranch, fetched: fetch.ok })
	})

	// Per-worktree checks, in parallel: the seat rules, rule 13's two tests, and rule 14.
	await pool(located, limit, async ({ rec, facts, commonDir }) => {
		if (!commonDir) return
		const root = rec.worktree?.root as string
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
		facts.porcelain = await status(run, root)
		const matching = (repo.prs ?? []).filter((p) => p.headRefName === facts.branch && p.state !== 'OPEN')
		const inPr = await Promise.all(
			matching.map((p) => run('git', ['-C', root, 'merge-base', '--is-ancestor', 'HEAD', p.headRefOid])),
		)
		facts.headInPr = inPr.some((r) => r.ok)
		if (!facts.headInPr && !facts.live && repo.defaultBranch) {
			const cherry = await run('git', ['-C', root, 'cherry', '-v', `origin/${repo.defaultBranch}`, 'HEAD'])
			facts.cherry = cherry.ok ? lines(cherry.stdout) : null
		} else if (!facts.headInPr && !facts.live) facts.cherry = null
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
			...verdict,
			...(agentStatus ? { agentStatus } : {}),
			snapshot: await snapshotOf(run, rec),
		}
	})

	return {
		version: 1,
		createdAt: new Date(now()).toISOString(),
		caller: { ...caller, mux: callerMux },
		units,
	}
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
