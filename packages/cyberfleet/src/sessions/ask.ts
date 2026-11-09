// `cyberfleet sessions ask`: step 4. Every live unit the plan puts in close is asked one question by
// mail, all at once, and all the threads are awaited together within one budget. An answer can only
// keep a unit: DONE leaves it in close, and anything else moves it to keep. Never a pane's screen.

import { awaitReply, type Store, send } from 'cyberlegion'
import { herdrStatuses, type Plan, type Run, realRun, type UnitPlan } from './plan.ts'

export const ASK_BUDGET_MS = 120_000

export interface AskInput {
	store: Store
	plan: Plan
	run?: Run
	budgetMs?: number
	now?: () => number
	sleep?: (ms: number) => Promise<void>
}

/** Read a reply body: `DONE`, `UNFINISHED: <reason>`, or anything else. */
export function readAnswer(body: string): UnitPlan['answer'] {
	const text = body.trim()
	if (/^DONE\.?$/i.test(text)) return { kind: 'done' }
	const m = /^UNFINISHED:\s*([\s\S]*)$/i.exec(text)
	if (m) return { kind: 'unfinished', reason: (m[1] ?? '').trim() || '(no reason given)' }
	return { kind: 'none', reason: `unrecognized reply: ${text.slice(0, 200)}` }
}

function keep(u: UnitPlan, reason: string, answer: NonNullable<UnitPlan['answer']>) {
	u.result = 'keep'
	u.reason = reason
	u.answer = answer
}

export async function askUnits(input: AskInput): Promise<Plan> {
	const { store, plan } = input
	const now = input.now ?? Date.now
	const run = input.run ?? realRun
	const budget = input.budgetMs ?? ASK_BUDGET_MS
	const ctx = { store, now }
	const caller = plan.caller
	const targets = plan.units.filter((u) => u.live && u.result === 'close' && !u.answer)

	// A unit the multiplexer shows working is kept without asking. Read fresh: the plan may be old.
	const statuses = caller.mux === 'herdr' ? await herdrStatuses(run) : new Map<string, string>()
	const asked: { u: UnitPlan; thread: string }[] = []
	for (const u of targets) {
		const fresh = statuses.get(store.getAgent(u.id)?.pane?.id ?? '')
		if (fresh) u.agentStatus = fresh
		const status = u.agentStatus
		if (status === 'working' || status === 'blocked') {
			keep(u, 'working', { kind: 'none', reason: `pane is ${status}, not asked` })
			continue
		}
		const thread = `close-${u.id}-${now()}`
		send(ctx, {
			fromId: caller.id,
			to: u.id,
			thread,
			subject: 'Closing?',
			body:
				'Do you have unfinished work? Reply with: ' +
				`cyberlegion mail send --to ${caller.id} --thread ${thread} --body 'DONE' ` +
				`(or --body 'UNFINISHED: <reason>')`,
		})
		asked.push({ u, thread })
	}

	const deadline = now() + budget
	await Promise.all(
		asked.map(async ({ u, thread }) => {
			for (;;) {
				const remaining = deadline - now()
				if (remaining <= 0) return keep(u, 'no answer', { kind: 'none', reason: 'no reply in time' })
				const out = await awaitReply(ctx, {
					meId: caller.id,
					thread,
					from: u.id,
					timeoutMs: remaining,
					now,
					...(input.sleep ? { sleep: input.sleep } : {}),
				})
				if (out.kind === 'waiting') continue
				if (out.kind === 'timed-out') return keep(u, 'no answer', { kind: 'none', reason: 'no reply in time' })
				const answer = readAnswer(out.message.body)
				if (answer?.kind === 'done') {
					u.answer = answer
					return
				}
				if (answer?.kind === 'unfinished') return keep(u, `unit reports unfinished work: ${answer.reason}`, answer)
				return keep(u, 'no answer', answer as NonNullable<UnitPlan['answer']>)
			}
		}),
	)
	plan.askedAt = new Date(now()).toISOString()
	return plan
}
