// The compact step-5 view of a plan: scope counts, the close and ask groups row by row with the
// evidence the Council decides on, and the keep group counted by reason. The full per-unit record
// stays in the plan file.

import { toonList, toonObject } from 'cyberlegion'
import type { Closed, CloseOutcome, Refused } from './close.ts'
import type { Plan, PrunedUnit, UnitPlan } from './plan.ts'

/** Rules 1–3 decide units outside this sweep: this session, standing owners, other multiplexers. */
const OUT_OF_SCOPE = new Set(['1', '2', '3'])

interface Row {
	id: string
	handle: string
	live: boolean
	seat: boolean
	branch?: string
	/** The root of a worktree the unit works in but does not own; closing it never touches that. */
	shared?: string
	rule: string
	reason: string
	prs: number[]
}
interface EvidenceLine {
	id: string
	kind: 'leftover' | 'commit' | 'mail' | 'more'
	line: string
}
export interface Summary {
	plan: string
	asked: boolean
	scope: { live: number; exited: number }
	close: Row[]
	ask: (Row & { evidence: EvidenceLine[] })[]
	keep: { reason: string; live: number; exited: number }[]
	/** Exited records `unit prune` deleted before the plan; they are in no group. */
	pruned: PrunedUnit[]
	/** What to run next, when there is a next step. */
	next?: string
}

const row = (u: UnitPlan): Row => ({
	id: u.id,
	handle: u.handle,
	live: u.live,
	seat: u.seat,
	...(u.branch ? { branch: u.branch } : {}),
	...(u.shared ? { shared: u.shared.root } : {}),
	rule: u.rule,
	reason: u.reason,
	prs: u.prs,
})

function evidenceOf(u: UnitPlan): EvidenceLine[] {
	const out: EvidenceLine[] = []
	const e = u.evidence
	for (const m of e?.mail?.items ?? [])
		out.push({ id: u.id, kind: 'mail', line: `${m.from} · ${m.subject ?? '(no subject)'} · ${m.sentAt}` })
	if (e?.mail?.more) out.push({ id: u.id, kind: 'more', line: `${e.mail.more} more messages` })
	for (const l of e?.commits?.lines ?? []) out.push({ id: u.id, kind: 'commit', line: l })
	if (e?.commits?.more) out.push({ id: u.id, kind: 'more', line: `${e.commits.more} more commits` })
	for (const l of e?.leftover?.lines ?? []) out.push({ id: u.id, kind: 'leftover', line: l })
	if (e?.leftover?.more) out.push({ id: u.id, kind: 'more', line: `${e.leftover.more} more files` })
	return out
}

// Live sessions first, then exited records, as step 5 shows them.
const liveFirst = (a: UnitPlan, b: UnitPlan) => Number(b.live) - Number(a.live)

export function summarize(plan: Plan, path: string): Summary {
	const inScope = plan.units.filter((u) => !OUT_OF_SCOPE.has(u.rule))
	const keep = new Map<string, { reason: string; live: number; exited: number }>()
	for (const u of plan.units.filter((u) => u.result === 'keep')) {
		const k = keep.get(u.reason) ?? { reason: u.reason, live: 0, exited: 0 }
		if (u.live) k.live++
		else k.exited++
		keep.set(u.reason, k)
	}
	const unasked = plan.units.some((u) => u.live && u.result === 'close' && !u.answer)
	return {
		plan: path,
		asked: !!plan.askedAt,
		scope: { live: inScope.filter((u) => u.live).length, exited: inScope.filter((u) => !u.live).length },
		close: plan.units
			.filter((u) => u.result === 'close')
			.sort(liveFirst)
			.map(row),
		ask: plan.units
			.filter((u) => u.result === 'ask')
			.sort(liveFirst)
			.map((u) => ({ ...row(u), evidence: evidenceOf(u) })),
		keep: [...keep.values()].sort((a, b) => b.live + b.exited - (a.live + a.exited)),
		pruned: plan.pruned ?? [],
		...(unasked && !plan.askedAt ? { next: `cyberfleet sessions ask ${path}` } : {}),
	}
}

const rowFields = [
	{ key: 'id', get: (r: Row) => r.id },
	{ key: 'handle', get: (r: Row) => r.handle },
	{ key: 'live', get: (r: Row) => (r.live ? 'live' : 'exited') },
	{ key: 'seat', get: (r: Row) => (r.seat ? 'seat' : '') },
	{ key: 'branch', get: (r: Row) => r.branch ?? '-' },
	{ key: 'shared', get: (r: Row) => r.shared ?? '-' },
	{ key: 'rule', get: (r: Row) => r.rule },
	{ key: 'reason', get: (r: Row) => r.reason },
	{ key: 'prs', get: (r: Row) => r.prs.map((n) => `#${n}`).join(' ') || '-' },
]

const split = (rows: { live: boolean }[]) =>
	`${rows.length} (${rows.filter((r) => r.live).length} live, ${rows.filter((r) => !r.live).length} exited)`

export function summaryToon(s: Summary): string {
	const evidence = s.ask.flatMap((a) => a.evidence)
	return [
		toonObject({
			plan: s.plan,
			asked: s.asked ? 'yes' : 'no',
			scope: `${s.scope.live} live sessions, ${s.scope.exited} exited records`,
			next: s.next,
		}),
		toonList('close', s.close, rowFields, `close: ${split(s.close)}`),
		toonList('ask', s.ask, rowFields, `ask: ${split(s.ask)}`),
		toonList(
			'evidence',
			evidence,
			[
				{ key: 'id', get: (e) => e.id },
				{ key: 'kind', get: (e) => e.kind },
				{ key: 'line', get: (e) => e.line },
			],
			`${evidence.length} evidence lines`,
		),
		toonList(
			'keep',
			s.keep,
			[
				{ key: 'reason', get: (k) => k.reason },
				{ key: 'live', get: (k) => k.live },
				{ key: 'exited', get: (k) => k.exited },
			],
			`keep: ${s.keep.reduce((n, k) => n + k.live + k.exited, 0)}`,
		),
		toonList(
			'pruned',
			s.pruned,
			[
				{ key: 'id', get: (p) => p.id },
				{ key: 'handle', get: (p) => p.handle },
			],
			`pruned: ${s.pruned.length} exited records deleted by unit prune`,
		),
	].join('\n')
}

export function closeToon(out: CloseOutcome): string {
	return [
		toonList<Closed>(
			'closed',
			out.closed,
			[
				{ key: 'id', get: (c) => c.id },
				{ key: 'handle', get: (c) => c.handle },
				{ key: 'live', get: (c) => (c.live ? 'live' : 'exited') },
				{ key: 'seat', get: (c) => (c.seat ? 'seat' : '') },
				{ key: 'forced', get: (c) => (c.forced ? 'force' : '') },
			],
			`closed: ${split(out.closed)}`,
		),
		toonList<Refused>(
			'refused',
			out.refused,
			[
				{ key: 'id', get: (r) => r.id },
				{ key: 'handle', get: (r) => r.handle ?? '-' },
				{ key: 'reason', get: (r) => r.reason },
			],
			`${out.refused.length} refused`,
		),
	].join('\n')
}
