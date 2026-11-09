// The close-sessions rule table as code. Each unit is judged from facts the planner gathered
// (`plan.ts`); this module runs no command, so every rule is a table-driven test
// (`classify.test.ts`). Rules apply in order, and the first that matches decides.
//
// Closing destroys a session, its inbox, and its worktree, and cannot be undone; keeping a finished
// unit only costs a pane. So a fact that could not be read always keeps the unit.

type Result = 'close' | 'ask' | 'keep'

export interface PullRequest {
	number: number
	state: string
	headRefOid: string
	headRefName: string
}

export interface RepoFacts {
	/** `gh pr list --state all` for the repository; null when it failed. */
	prs: PullRequest[] | null
	defaultBranch?: string
	/** Whether `git fetch origin <default> pull/<n>/head …` succeeded. */
	fetched: boolean
}

export interface MailItem {
	id: string
	from: string
	subject?: string
	sentAt: string
}

export interface UnitFacts {
	self: boolean
	/** A standing owner or service endpoint: no session of its own. */
	standing: boolean
	live: boolean
	/** The multiplexer of the unit's pane, when it has one. */
	mux?: string
	callerMux: string
	hasWorktree: boolean
	branch?: string
	rootExists?: boolean
	/** Both `rev-parse --git-dir` and `--git-common-dir` succeeded. */
	gitReadable?: boolean
	/** The worktree is its repository's primary checkout: a seat. */
	primary?: boolean
	/** `git status --porcelain --untracked-files=all` lines; null when it failed. */
	porcelain?: string[] | null
	/** `git rev-list --count @{upstream}..HEAD`; null when it failed. */
	aheadOfUpstream?: number | null
	repo?: RepoFacts
	/** HEAD is an ancestor of some matching pull request's head commit. */
	headInPr?: boolean
	/** `git cherry -v origin/<default> HEAD` lines; null when it failed. */
	cherry?: string[] | null
	/** Unread mail in the unit's mailbox; null when it could not be read. */
	unread?: MailItem[] | null
}

interface Lines {
	lines: string[]
	more: number
}

interface Evidence {
	leftover?: Lines
	commits?: Lines
	mail?: { items: MailItem[]; more: number }
}

export interface Verdict {
	rule: string
	result: Result
	reason: string
	prs: number[]
	evidence?: Evidence
}

/** The marker cyberlegion stamps into every worktree it spawns; `unit close` sets it aside too. */
const MARKER = '?? .agents/cyberlegion/config.json'
const SHOWN = 10

function cap(lines: string[]): Lines {
	return { lines: lines.slice(0, SHOWN), more: Math.max(0, lines.length - SHOWN) }
}

/** Rule 14's lines: what `git status` printed, less the cyberlegion marker. */
function leftoverOf(porcelain: string[]): string[] {
	return porcelain.filter((l) => l !== MARKER)
}

export function classify(f: UnitFacts): Verdict {
	const prs = (f.repo?.prs ?? []).filter((p) => f.branch !== undefined && p.headRefName === f.branch)
	const numbers = prs.map((p) => p.number)
	const v = (rule: string, result: Result, reason: string, evidence?: Evidence): Verdict => ({
		rule,
		result,
		reason,
		prs: numbers,
		...(evidence ? { evidence } : {}),
	})

	if (f.self) return v('1', 'keep', 'this session')
	if (f.standing) return v('2', 'keep', 'standing owner')
	if (f.mux === undefined || f.mux !== f.callerMux) return v('3', 'keep', 'out of scope')
	if (!f.hasWorktree) {
		if (f.live) return v('4a', 'keep', 'no worktree')
		if (f.unread === null || (f.unread && f.unread.length > 0)) {
			const items = f.unread ?? []
			return v('4b', 'ask', 'no worktree, unread mail', {
				mail: { items: items.slice(0, SHOWN), more: Math.max(0, items.length - SHOWN) },
			})
		}
		return v('4b', 'close', 'no worktree, session ended')
	}
	if (!f.rootExists)
		return f.live ? v('5', 'keep', 'worktree gone, session live') : v('6', 'close', 'worktree gone, session ended')
	if (!f.gitReadable) return v('7', 'keep', 'cannot read worktree')
	if (f.primary) {
		if (!f.porcelain || leftoverOf(f.porcelain).length > 0) return v('8b', 'keep', 'seat checkout has changes')
		if (f.aheadOfUpstream !== 0) return v('8c', 'keep', 'seat ahead of upstream')
		return v('8d', 'close', 'seat finished')
	}
	if (!f.repo?.prs) return v('9', 'keep', 'cannot read pull requests')
	if (prs.some((p) => p.state === 'OPEN')) return v('10', 'keep', 'pull request open')
	if (!f.repo.fetched) return v('11', 'keep', 'cannot fetch from the host')
	if (f.live && prs.length === 0) return v('12', 'keep', 'no pull request yet')
	const leftover = f.porcelain ? leftoverOf(f.porcelain) : undefined
	if (!f.headInPr) {
		if (f.live) return v('13', 'keep', 'commits after the last pull request')
		const plus = f.cherry?.filter((l) => l.startsWith('+'))
		if (!plus || plus.length > 0)
			return v('13', 'ask', 'commits not on the default branch', {
				commits: cap(plus ?? []),
				...(leftover && leftover.length > 0 ? { leftover: cap(leftover) } : {}),
			})
	}
	if (!leftover) return v('14', 'keep', 'cannot read worktree status')
	if (leftover.length > 0) return v('14', 'ask', 'work landed, leftover files', { leftover: cap(leftover) })
	return v('15', 'close', 'work landed')
}
