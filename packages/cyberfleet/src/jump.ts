import { readFileSync } from 'node:fs'
import { basename, dirname } from 'node:path'
import { focusBack, JumpBackError, jumpStatePath, nodeJumpStore, resolveMuxAdapter } from 'cyber-mux'
import { type AgentRecord, type Exec, realExec, type Store, toonList, toonObject } from 'cyberlegion'

// `cyberfleet jump` — the deterministic half of /jump (cyberfleet#156). It resolves the argument
// against the live units and focuses exactly one, or returns what is left for the skill to decide:
// several candidates, a GitHub task ref to look up with `gh`, or free text to match. Two rules hold
// on every path: the calling session is never focused or listed, and more than one match focuses
// nothing.

/** What the command needs from outside; injected so the resolver runs with no multiplexer. */
export interface JumpDeps {
	store: Store
	/** The calling session's unit id, when it is a registered unit. */
	selfId: string | undefined
	/** Where the command runs: the caller's checkout, for a task ref with no repo. */
	cwd: string
	/** Runs `git`; returns trimmed stdout, or `null` on failure. */
	exec: Exec
	/** Focuses a pane, recording the jump in cyber-mux's history. */
	focus(pane: string): void
	/** Follows cyber-mux's jump history for the calling pane. */
	back(): { from: string; to: string }
}

export interface JumpRequest {
	target?: string | undefined
	repo?: string | undefined
	branches: string[]
	mentions?: number | undefined
}

interface UnitRow {
	id: string
	handle: string
	branch?: string
	repo: string
}

export type JumpResult =
	| { result: 'jumped'; id?: string; handle?: string; pane: string; from?: string }
	| { result: 'candidates'; units: UnitRow[] }
	| { result: 'task'; repo: string; slug: string; number: number }
	| { result: 'prose'; words: string; units: (UnitRow & { brief?: string })[] }

/** A unit's repo name: the folder of its primary checkout, else of its cwd. cyberlegion's rule. */
function repoNameOf(rec: AgentRecord): string {
	return basename(rec.worktree?.primaryRoot ?? rec.cwd)
}

const checkoutOf = (rec: AgentRecord) => rec.worktree?.primaryRoot ?? rec.cwd

function rowOf(rec: AgentRecord): UnitRow {
	const branch = rec.worktree?.branch
	return { id: rec.id, handle: rec.handle, ...(branch ? { branch } : {}), repo: repoNameOf(rec) }
}

/** Live session units. Exited units and standing/service records have no session to focus. */
function liveUnits(store: Store): AgentRecord[] {
	return store
		.listAgents()
		.filter((a) => a.status !== 'exited' && (a.kind === undefined || a.kind === 'session'))
		.sort((a, b) => a.id.localeCompare(b.id))
}

const TASK = /^(?:([\w.-]+)#|#)?(\d+)$/

export function jump(deps: JumpDeps, req: JumpRequest): JumpResult {
	const { target, repo, branches, mentions } = req
	if (target !== undefined && repo !== undefined) throw new Error('pass a target or --repo, not both')
	if (repo === undefined && (branches.length > 0 || mentions !== undefined))
		throw new Error('--branch and --mentions need --repo')
	if (repo !== undefined) return jumpInRepo(deps, repo, branches, mentions)
	if (target === undefined || target.trim() === '') throw new Error('a target or --repo is required')

	const word = target.trim()
	if (word === 'back') return goBack(deps)

	const task = TASK.exec(word)
	if (task) return taskOf(deps, task[1], Number(task[2]))

	const live = liveUnits(deps.store)
	const matches = live.filter(
		(a) => a.id === word || a.handle === word || a.worktree?.branch === word || repoNameOf(a) === word,
	)
	if (matches.length === 0) {
		const units = live
			.filter((a) => a.id !== deps.selfId)
			.map((a) => ({ ...rowOf(a), ...(a.brief ? { brief: a.brief } : {}) }))
		return { result: 'prose', words: word, units }
	}
	return settle(deps, matches, `"${word}"`) ?? fail(`"${word}"`)
}

function fail(named: string): never {
	throw new Error(`${named} matches only this session — jump never focuses its caller`)
}

/**
 * Focus the one match that is not the caller, or return the candidates when several remain.
 * `undefined` when no match is left once the caller is taken out.
 */
function settle(deps: JumpDeps, matches: AgentRecord[], named: string): JumpResult | undefined {
	const others = matches.filter((a) => a.id !== deps.selfId)
	if (others.length > 1) return { result: 'candidates', units: others.map(rowOf) }
	const [only] = others
	if (!only) return undefined
	const pane = only.pane?.id ?? deps.store.findPaneByAgentId(only.id)
	if (!pane) throw new Error(`${named} matched unit ${only.id} (${only.handle}), which has no known session pane`)
	deps.focus(pane)
	return { result: 'jumped', id: only.id, handle: only.handle, pane }
}

function jumpInRepo(deps: JumpDeps, repo: string, branches: string[], mentions: number | undefined): JumpResult {
	const inRepo = liveUnits(deps.store).filter((a) => repoNameOf(a) === repo)
	// `--repo` alone means any unit in the repo; with `--mentions` and no branch (an issue with no
	// linked pull request), only the mention fallback applies.
	const onBranch =
		branches.length > 0
			? inRepo.filter((a) => branches.includes(a.worktree?.branch ?? ''))
			: mentions === undefined
				? inRepo
				: []
	const named = [`--repo ${repo}`, ...branches.map((b) => `--branch ${b}`)].join(' ')
	const byBranch = settle(deps, onBranch, named)
	if (byBranch) return byBranch

	if (mentions !== undefined) {
		const naming = inRepo.filter((a) => mentionsNumber(deps.store, a, mentions))
		const byMention = settle(deps, naming, `${named} --mentions ${mentions}`)
		if (byMention) return byMention
		if (naming.length > 0 || onBranch.length > 0) fail(`${named} --mentions ${mentions}`)
		throw new Error(
			`no live unit in ${repo} is on ${branches.length ? branches.join(', ') : 'any branch'} or names #${mentions}`,
		)
	}
	if (onBranch.length > 0) fail(named)
	throw new Error(`no live unit matches ${named}`)
}

/** A handle ending in `-<n>`, or a brief naming `#<n>`, `<repo>#<n>`, `/issues/<n>`, or `/pull/<n>`. */
function mentionsNumber(store: Store, rec: AgentRecord, n: number): boolean {
	if (new RegExp(`-${n}$`).test(rec.handle)) return true
	const brief = readBrief(store, rec)
	return brief !== undefined && new RegExp(`(?:#|/issues/|/pull/)${n}(?!\\d)`).test(brief)
}

function readBrief(store: Store, rec: AgentRecord): string | undefined {
	if (rec.brief) {
		try {
			return readFileSync(rec.brief, 'utf8')
		} catch {
			// the recorded path is gone; try the hub's copy
		}
	}
	return store.readBrief(rec.id)
}

function goBack(deps: JumpDeps): JumpResult {
	const { from, to } = deps.back()
	const id = deps.store.resolvePaneId(to)
	const rec = id ? deps.store.getAgent(id) : undefined
	return { result: 'jumped', ...(rec ? { id: rec.id, handle: rec.handle } : {}), pane: to, from }
}

function taskOf(deps: JumpDeps, repo: string | undefined, number: number): JumpResult {
	const git = (dir: string, ...args: string[]) => deps.exec('git', ['-C', dir, ...args])
	let checkouts: string[]
	let name: string
	if (repo === undefined) {
		const common = git(deps.cwd, 'rev-parse', '--path-format=absolute', '--git-common-dir')
		if (!common) throw new Error(`#${number} names a task in this repo, but ${deps.cwd} is not in a git repository`)
		checkouts = [dirname(common)]
		name = basename(checkouts[0] as string)
	} else {
		name = repo
		checkouts = [
			...new Set(
				liveUnits(deps.store)
					.filter((a) => repoNameOf(a) === repo)
					.map(checkoutOf),
			),
		]
		if (checkouts.length === 0) throw new Error(`no live unit is in a repo named ${repo}`)
	}
	const slugs = new Map<string, string>()
	for (const dir of checkouts) {
		const url = git(dir, 'remote', 'get-url', 'origin')
		const slug = url ? slugOf(url) : undefined
		if (slug) slugs.set(dir, slug)
	}
	const distinct = [...new Set(slugs.values())]
	if (distinct.length === 0) throw new Error(`no GitHub origin remote in ${checkouts.join(', ')}`)
	if (distinct.length > 1) {
		const list = [...slugs].map(([dir, slug]) => `${dir} (${slug})`).join(', ')
		throw new Error(`the checkouts named ${name} disagree on their origin: ${list}`)
	}
	return { result: 'task', repo: name, slug: distinct[0] as string, number }
}

/** `<owner>/<repo>` from an ssh or https remote URL. */
function slugOf(url: string): string | undefined {
	const m = /[:/]([^/:]+)\/([^/]+?)(?:\.git)?\/?$/.exec(url.trim())
	return m ? `${m[1]}/${m[2]}` : undefined
}

/**
 * `back` through the bundled cyber-mux library: follow the calling pane's jump history. A failure
 * keeps cyber-mux's own words and adds where to go instead, without naming the cyber-mux CLI.
 */
export function jumpBack(env: NodeJS.ProcessEnv): { from: string; to: string } {
	try {
		return focusBack(resolveMuxAdapter(env, realExec), realExec, { env, store: nodeJumpStore(jumpStatePath(env)) })
	} catch (err) {
		if (!(err instanceof JumpBackError)) throw err
		const hint =
			err.code === 'no-caller-pane'
				? 'run it in the pane you jumped into'
				: err.code === 'no-jump' && err.lastOrigin
					? `the last jump came from ${err.lastOrigin}`
					: err.code === 'no-jump'
						? 'no jump is recorded yet'
						: 'every pane on the way back has closed'
		throw new Error(`${err.message} — ${hint}`)
	}
}

const ROW = [
	{ key: 'id', get: (u: UnitRow) => u.id },
	{ key: 'handle', get: (u: UnitRow) => u.handle },
	{ key: 'branch', get: (u: UnitRow) => u.branch ?? '-' },
	{ key: 'repo', get: (u: UnitRow) => u.repo },
]

/** The toon rendering: a `result:` line naming the kind, then its fields or its list of units. */
export function jumpToon(r: JumpResult): string {
	switch (r.result) {
		case 'jumped':
		case 'task':
			return toonObject({ ...r })
		case 'candidates':
			return [
				'result: candidates',
				toonList('candidates', r.units, ROW, `${r.units.length} units match — nothing focused; jump to one by id`),
			].join('\n')
		case 'prose':
			return [
				toonObject({ result: 'prose', words: r.words }),
				toonList(
					'units',
					r.units,
					[...ROW, { key: 'brief', get: (u: UnitRow & { brief?: string }) => u.brief ?? '-' }],
					`${r.units.length} live units — no exact match, nothing focused`,
				),
			].join('\n')
	}
}
