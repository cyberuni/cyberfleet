// `cyberfleet sessions close`: step 6. Close only units the Council confirmed, and only while each is
// still what the plan says it is. Every guard the skill used to state as prose is enforced here:
// a keep-group unit never closes, a live close-group unit closes only after it answered DONE, a unit
// that changed since the plan is refused, and `--force` (which discards leftover files) is accepted
// only for an ask-group unit with leftover files in a worktree it owns, never for a seat or for a
// unit that only shares a worktree (rule 4b). Pod records are the Captain's,
// so this never retires one.

import { decommission, type IdContext } from 'cyberlegion'
import { type Plan, type Run, realRun, type Snapshot, snapshotOf, type UnitPlan } from './plan.ts'

export interface CloseInput {
	ctx: IdContext
	plan: Plan
	/** The Council-confirmed unit ids. Full ids only: handles are not unique. */
	ids: string[]
	/** Ids to close with `--force`, discarding leftover files. Each must also be in `ids`. */
	force: string[]
	/** This session's id, which is never closed. */
	selfId?: string
	run?: Run
	/** Close one unit. Defaults to cyberlegion's `unit close`. */
	close?: (id: string, force: boolean) => Promise<void>
}

export interface Closed {
	id: string
	handle: string
	live: boolean
	seat: boolean
	forced: boolean
}
export interface Refused {
	id: string
	handle?: string
	reason: string
}
export interface CloseOutcome {
	closed: Closed[]
	refused: Refused[]
}

function changed(was: Snapshot, now: Snapshot): string[] {
	const diff: string[] = []
	if (was.status !== now.status) diff.push(`status ${was.status} → ${now.status}`)
	if (was.rootExists !== now.rootExists) diff.push('worktree existence')
	if (was.head !== now.head) diff.push('HEAD')
	if (JSON.stringify(was.porcelain ?? null) !== JSON.stringify(now.porcelain ?? null)) diff.push('worktree status')
	return diff
}

/** Why a unit may not be closed as asked, or undefined when it may. */
function guard(u: UnitPlan, plan: Plan, force: boolean, selfId: string | undefined): string | undefined {
	if (u.id === selfId || u.id === plan.caller.id) return 'this session'
	if (u.result === 'keep') return `in keep: ${u.reason}`
	if (u.result === 'close' && u.live && u.answer?.kind !== 'done')
		return plan.askedAt
			? 'live unit did not answer DONE'
			: 'live unit not asked yet: run `cyberfleet sessions ask` first'
	if (force) {
		if (u.seat) return '--force refused for a seat: closing a seat never touches its checkout'
		if (!u.root) return '--force refused: the unit owns no worktree, and closing never touches a shared one'
		if (u.result !== 'ask' || !u.evidence?.leftover?.lines.length)
			return '--force refused: only an ask-group unit with leftover files may be forced'
	}
	return undefined
}

export async function closeUnits(input: CloseInput): Promise<CloseOutcome> {
	const { ctx, plan } = input
	const run = input.run ?? realRun
	const close =
		input.close ??
		(async (id: string, force: boolean) => {
			await decommission(ctx, { id, ...(force ? { force: true } : {}) })
		})
	const byId = new Map(plan.units.map((u) => [u.id, u]))
	const ids = [...new Set(input.ids)]
	const forced = new Set(input.force)
	const out: CloseOutcome = { closed: [], refused: [] }

	for (const id of forced)
		if (!ids.includes(id)) out.refused.push({ id, reason: '--force names a unit that --ids does not confirm' })

	// One at a time: closes in one repository share its worktree list and object store.
	for (const id of ids) {
		const u = byId.get(id)
		if (!u) {
			out.refused.push({ id, reason: 'not in the plan (pass full unit ids)' })
			continue
		}
		const force = forced.has(id)
		const why = guard(u, plan, force, input.selfId)
		if (why) {
			out.refused.push({ id, handle: u.handle, reason: why })
			continue
		}
		const rec = ctx.store.getAgent(id)
		if (!rec) {
			out.refused.push({ id, handle: u.handle, reason: 'no longer registered' })
			continue
		}
		const diff = changed(u.snapshot, await snapshotOf(run, rec))
		if (diff.length > 0) {
			out.refused.push({ id, handle: u.handle, reason: `changed since the plan: ${diff.join(', ')}` })
			continue
		}
		try {
			await close(id, force)
			out.closed.push({ id, handle: u.handle, live: u.live, seat: u.seat, forced: force })
		} catch (err) {
			out.refused.push({ id, handle: u.handle, reason: err instanceof Error ? err.message : String(err) })
		}
	}
	return out
}
