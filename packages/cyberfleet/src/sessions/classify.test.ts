import { describe, expect, it } from 'vitest'
import { classify, type SharedFacts, type UnitFacts } from './classify.ts'

// The close-sessions rule table, one fixture per rule. `landed` is a live unit on a linked worktree
// whose one pull request merged, whose HEAD that pull request contains, and whose worktree is clean:
// the one shape that closes. Each row changes the fact its rule reads, so the row proves the rule
// fires on that fact and no earlier rule takes it.

const merged = { number: 7, state: 'MERGED', headRefOid: 'abc', headRefName: 'feat/x' }

const landed: UnitFacts = {
	self: false,
	standing: false,
	live: true,
	mux: 'herdr',
	callerMux: 'herdr',
	hasWorktree: true,
	branch: 'feat/x',
	rootExists: true,
	gitReadable: true,
	primary: false,
	porcelain: [],
	repo: { prs: [merged], defaultBranch: 'main', fetched: true },
	headInPr: true,
	cherry: [],
}
const exited = { ...landed, live: false }
const seat = { ...landed, primary: true, aheadOfUpstream: 0 }
const mail = { id: 'm1', from: 'pod-1', subject: 'hi', sentAt: '2026-11-08T00:00:00Z' }
/** An exited unit that owns no worktree but shares one; `orphan` is that worktree, landed and clean,
 * with no owner's record left to judge it. */
const sharing = { ...exited, hasWorktree: false, unread: [] }
const orphan: SharedFacts = {
	ownerExists: false,
	rootExists: true,
	gitReadable: true,
	porcelain: ['?? .agents/cyberlegion/config.json'],
	headInPr: true,
	cherry: [],
}

const table: [string, Partial<UnitFacts>, string, string, RegExp][] = [
	['this session', { self: true }, '1', 'keep', /this session/],
	['a standing owner', { standing: true }, '2', 'keep', /standing owner/],
	['a unit with no pane', { mux: undefined }, '3', 'keep', /out of scope/],
	['a unit on another multiplexer', { mux: 'tmux' }, '3', 'keep', /out of scope/],
	['a live unit with no worktree', { hasWorktree: false }, '4a', 'keep', /no worktree/],
	[
		'an exited unit sharing a worktree with unlanded work whose owner is gone',
		{ ...sharing, shared: { ...orphan, headInPr: false, cherry: ['+ abc1 extra work'] } },
		'4b',
		'ask',
		/owner gone/,
	],
	[
		'an exited unit sharing a worktree with leftover files whose owner is gone',
		{ ...sharing, shared: { ...orphan, porcelain: ['?? scratch.txt'] } },
		'4b',
		'ask',
		/owner gone/,
	],
	[
		'an exited unit sharing an unreadable worktree whose owner is gone',
		{ ...sharing, shared: { ownerExists: false, rootExists: true, gitReadable: false } },
		'4b',
		'ask',
		/owner gone/,
	],
	['an exited unit with no worktree', { ...exited, hasWorktree: false, unread: [] }, '4c', 'close', /no worktree/],
	[
		'an exited unit with no worktree and unread mail',
		{ ...exited, hasWorktree: false, unread: [mail] },
		'4c',
		'ask',
		/unread mail/,
	],
	[
		'an exited unit with no worktree whose mailbox cannot be read',
		{ ...exited, hasWorktree: false, unread: null },
		'4c',
		'ask',
		/unread mail/,
	],
	[
		'an exited unit sharing a worktree with unlanded work whose owner is still recorded',
		{ ...sharing, shared: { ...orphan, ownerExists: true, headInPr: false, cherry: ['+ abc1 extra work'] } },
		'4c',
		'close',
		/no worktree/,
	],
	[
		'an exited unit sharing a worktree whose owner is gone but whose work landed',
		{ ...sharing, shared: { ...orphan, headInPr: false, cherry: ['- abc1 done'] } },
		'4c',
		'close',
		/no worktree/,
	],
	[
		'an exited unit sharing a worktree that is gone',
		{ ...sharing, shared: { ownerExists: false, rootExists: false } },
		'4c',
		'close',
		/no worktree/,
	],
	['a live unit whose worktree is gone', { rootExists: false }, '5', 'keep', /worktree gone, session live/],
	['an exited unit whose worktree is gone', { ...exited, rootExists: false }, '6', 'close', /worktree gone/],
	['an unreadable worktree', { gitReadable: false }, '7', 'keep', /cannot read worktree/],
	['a seat with changes', { ...seat, porcelain: [' M a.ts'] }, '8b', 'keep', /seat checkout has changes/],
	['a seat whose status cannot be read', { ...seat, porcelain: null }, '8b', 'keep', /seat checkout has changes/],
	['a seat ahead of upstream', { ...seat, aheadOfUpstream: 2 }, '8c', 'keep', /ahead of upstream/],
	['a seat with no upstream', { ...seat, aheadOfUpstream: null }, '8c', 'keep', /ahead of upstream/],
	['a finished seat', { ...seat, porcelain: ['?? .agents/cyberlegion/config.json'] }, '8d', 'close', /seat finished/],
	[
		'a repository whose pull requests failed to load',
		{ repo: { prs: null, fetched: true } },
		'9',
		'keep',
		/cannot read pull requests/,
	],
	[
		'an open pull request',
		{ repo: { prs: [merged, { ...merged, number: 8, state: 'OPEN' }], fetched: true } },
		'10',
		'keep',
		/pull request open/,
	],
	[
		'a repository the fetch failed for',
		{ repo: { prs: [merged], defaultBranch: 'main', fetched: false } },
		'11',
		'keep',
		/cannot fetch/,
	],
	[
		'a live unit with no pull request',
		{ repo: { prs: [], defaultBranch: 'main', fetched: true } },
		'12',
		'keep',
		/no pull request yet/,
	],
	['a live unit with commits after its pull request', { headInPr: false }, '13', 'keep', /commits after/],
	[
		'an exited unit with commits not on the default branch',
		{ ...exited, headInPr: false, cherry: ['+ abc1 extra work'] },
		'13',
		'ask',
		/not on the default branch/,
	],
	[
		'an exited unit whose cherry check failed',
		{ ...exited, headInPr: false, cherry: null },
		'13',
		'ask',
		/not on the default branch/,
	],
	['a landed unit with leftover files', { porcelain: ['?? dist/out.js'] }, '14', 'ask', /leftover files/],
	['a landed unit whose status cannot be read', { porcelain: null }, '14', 'keep', /cannot read worktree/],
	['a landed, clean unit', {}, '15', 'close', /work landed/],
	[
		'a clean unit holding only the cyberlegion marker',
		{ porcelain: ['?? .agents/cyberlegion/config.json'] },
		'15',
		'close',
		/work landed/,
	],
	[
		'an exited unit with no pull request whose commits are all on the default branch',
		{ ...exited, repo: { prs: [], defaultBranch: 'main', fetched: true }, headInPr: false, cherry: ['- abc1 done'] },
		'15',
		'close',
		/work landed/,
	],
]

describe('classify: the rule table', () => {
	it.each(table)('%s → rule %s %s', (_name, over, rule, result, reason) => {
		const v = classify({ ...landed, ...over })
		expect(v.rule).toBe(rule)
		expect(v.result).toBe(result)
		expect(v.reason).toMatch(reason)
	})
})

describe('classify: evidence step 5 shows', () => {
	it('lists the leftover lines rule 14 counted, without the cyberlegion marker', () => {
		const v = classify({ ...landed, porcelain: ['?? .agents/cyberlegion/config.json', '?? a', ' M b'] })
		expect(v.evidence?.leftover).toEqual({ lines: ['?? a', ' M b'], more: 0 })
	})

	it('caps evidence at the first 10 lines and counts the rest', () => {
		const lines = Array.from({ length: 13 }, (_, i) => `?? f${i}`)
		const v = classify({ ...landed, porcelain: lines })
		expect(v.evidence?.leftover).toEqual({ lines: lines.slice(0, 10), more: 3 })
	})

	it("shows rule 13's + lines, and the leftover lines when the worktree is dirty too", () => {
		const v = classify({ ...exited, headInPr: false, cherry: ['- a done', '+ b extra'], porcelain: ['?? x'] })
		expect(v.evidence?.commits).toEqual({ lines: ['+ b extra'], more: 0 })
		expect(v.evidence?.leftover).toEqual({ lines: ['?? x'], more: 0 })
	})

	it("shows rule 4b's commits and leftover lines, and the unread mail alongside", () => {
		const v = classify({
			...sharing,
			unread: [mail],
			shared: { ...orphan, headInPr: false, cherry: ['- a done', '+ b extra'], porcelain: ['?? x'] },
		})
		expect(v.evidence?.commits).toEqual({ lines: ['+ b extra'], more: 0 })
		expect(v.evidence?.leftover).toEqual({ lines: ['?? x'], more: 0 })
		expect(v.evidence?.mail).toEqual({ items: [mail], more: 0 })
	})

	it("shows rule 4c's unread mail", () => {
		const v = classify({ ...exited, hasWorktree: false, unread: [mail] })
		expect(v.evidence?.mail).toEqual({ items: [mail], more: 0 })
	})

	it("names the branch's pull requests", () => {
		const other = { ...merged, number: 9, headRefName: 'feat/y' }
		const v = classify({ ...landed, repo: { prs: [merged, other], defaultBranch: 'main', fetched: true } })
		expect(v.prs).toEqual([7])
	})
})
