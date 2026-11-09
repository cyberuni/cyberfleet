import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { type AgentRecord, FileStore, inbox, send } from 'cyberlegion'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { askUnits, readAnswer } from './ask.ts'
import type { Plan, Run, UnitPlan } from './plan.ts'

// `sessions ask` against a real hub. Time is a fake clock that `sleep` advances, and each tick lets
// the scripted units read their question and reply on its thread, as a live unit would.

let work: string
let store: FileStore
let t: number
let replies: Record<string, string | undefined>

const caller = { id: 'self0000', handle: 'council', mux: 'herdr' }
const now = () => t

function record(id: string, pane = `p-${id}`): AgentRecord {
	const ts = new Date(0).toISOString()
	const rec: AgentRecord = {
		id,
		handle: `h-${id}`,
		harness: 'claude',
		cwd: work,
		pane: { mux: 'herdr', id: pane },
		status: 'active',
		createdAt: ts,
		lastSeen: ts,
	}
	store.putAgent(rec)
	return rec
}

function planned(id: string, over: Partial<UnitPlan> = {}): UnitPlan {
	record(id)
	return {
		id,
		handle: `h-${id}`,
		live: true,
		seat: false,
		rule: '15',
		result: 'close',
		reason: 'work landed',
		prs: [1],
		snapshot: { status: 'active' },
		...over,
	}
}

/** Each scripted unit answers the question waiting in its inbox, on the question's own thread. */
function respond() {
	for (const [id, body] of Object.entries(replies)) {
		if (body === undefined) continue
		const q = inbox({ store }, { meId: id, unread: true }).find((m) => m.subject === 'Closing?')
		if (!q?.thread) continue
		store.ackMessage(id, q.id)
		send({ store, now }, { fromId: id, to: caller.id, thread: q.thread, body })
	}
}
const sleep = async (ms: number) => {
	t += ms
	respond()
}
const noHerdr: Run = async () => ({ ok: false, stdout: '' })

const ask = (units: UnitPlan[], run: Run = noHerdr) => {
	const plan: Plan = { version: 1, createdAt: '', caller, units }
	return askUnits({ store, plan, run, now, sleep, budgetMs: 120_000 })
}

beforeEach(() => {
	work = mkdtempSync(join(tmpdir(), 'cf-ask-'))
	store = new FileStore(join(work, 'hub'))
	t = 1_000_000
	replies = {}
	record(caller.id)
})
afterEach(() => rmSync(work, { recursive: true, force: true }))

describe('sessions ask', () => {
	it('mails each live close-group unit by full id, with a reply command naming the caller by full id', async () => {
		replies.u1 = 'DONE'
		await ask([planned('u1')])
		const sent = inbox({ store }, { meId: 'u1' })
		expect(sent).toHaveLength(1)
		expect(sent[0]?.to).toBe('u1')
		expect(sent[0]?.body).toContain(`--to ${caller.id} --thread ${sent[0]?.thread} --body 'DONE'`)
	})

	it('leaves a DONE unit in close, and moves UNFINISHED and silent units to keep', async () => {
		replies.done = 'DONE'
		replies.busy = 'UNFINISHED: still writing tests'
		replies.odd = 'maybe?'
		const p = await ask([planned('done'), planned('busy'), planned('odd'), planned('mute')])
		const by = Object.fromEntries(p.units.map((u) => [u.id, u]))
		expect(by.done).toMatchObject({ result: 'close', answer: { kind: 'done' } })
		expect(by.busy).toMatchObject({ result: 'keep', reason: 'unit reports unfinished work: still writing tests' })
		expect(by.odd).toMatchObject({ result: 'keep', reason: 'no answer' })
		expect(by.mute).toMatchObject({ result: 'keep', reason: 'no answer' })
		expect(p.askedAt).toBeDefined()
	})

	it('waits on every thread at once, within one budget rather than one per unit', async () => {
		const start = t
		await ask([planned('a'), planned('b'), planned('c')])
		expect(t - start).toBeLessThanOrEqual(120_000 + 2_000)
	})

	it('acks the reply it reads, so it does not linger as unread mail', async () => {
		replies.u1 = 'DONE'
		await ask([planned('u1')])
		expect(inbox({ store }, { meId: caller.id, unread: true })).toHaveLength(0)
	})

	it('keeps a unit herdr shows working or blocked without asking it', async () => {
		const herdr: Run = async () => ({
			ok: true,
			stdout: JSON.stringify({
				result: {
					panes: [
						{ pane_id: 'p-w', agent_status: 'working' },
						{ pane_id: 'p-b', agent_status: 'blocked' },
					],
				},
			}),
		})
		const p = await ask([planned('w'), planned('b')], herdr)
		expect(p.units.map((u) => [u.result, u.reason])).toEqual([
			['keep', 'working'],
			['keep', 'working'],
		])
		expect(inbox({ store }, { meId: 'w' })).toHaveLength(0)
	})

	it('never asks an exited unit, an ask-group unit, or a keep-group unit, and never moves one to close', async () => {
		replies.e = 'DONE'
		replies.a = 'DONE'
		replies.k = 'DONE'
		const p = await ask([
			planned('e', { live: false }),
			planned('a', { result: 'ask', rule: '14', reason: 'work landed, leftover files' }),
			planned('k', { result: 'keep', rule: '10', reason: 'pull request open' }),
		])
		expect(p.units.map((u) => u.result)).toEqual(['close', 'ask', 'keep'])
		for (const id of ['e', 'a', 'k']) expect(inbox({ store }, { meId: id })).toHaveLength(0)
	})
})

describe('readAnswer', () => {
	it.each([
		['DONE', { kind: 'done' }],
		['  done\n', { kind: 'done' }],
		['UNFINISHED: x', { kind: 'unfinished', reason: 'x' }],
		['UNFINISHED:', { kind: 'unfinished', reason: '(no reason given)' }],
		['DONE, mostly', { kind: 'none', reason: 'unrecognized reply: DONE, mostly' }],
	])('%j → %j', (body, answer) => {
		expect(readAnswer(body)).toEqual(answer)
	})
})
