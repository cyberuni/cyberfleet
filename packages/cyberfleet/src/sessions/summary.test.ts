import { describe, expect, it } from 'vitest'
import type { Plan, UnitPlan } from './plan.ts'
import { summarize, summaryToon } from './summary.ts'

const u = (id: string, over: Partial<UnitPlan>): UnitPlan => ({
	id,
	handle: `h-${id}`,
	live: true,
	seat: false,
	rule: '15',
	result: 'close',
	reason: 'work landed',
	prs: [],
	snapshot: { status: 'active' },
	...over,
})

const plan: Plan = {
	version: 1,
	createdAt: '',
	caller: { id: 'me', handle: 'council', mux: 'herdr' },
	units: [
		u('me', { rule: '1', result: 'keep', reason: 'this session' }),
		u('t', { rule: '3', result: 'keep', reason: 'out of scope', live: false }),
		u('x', { live: false, prs: [4] }),
		u('y', {}),
		u('s', { rule: '8d', seat: true, reason: 'seat finished' }),
		u('a', {
			rule: '13',
			result: 'ask',
			live: false,
			reason: 'commits not on the default branch',
			evidence: { commits: { lines: ['+ c1 a'], more: 12 } },
		}),
		u('k', { rule: '10', result: 'keep', reason: 'pull request open' }),
	],
}

describe('sessions summary', () => {
	const s = summarize(plan, '/tmp/plan.json')

	it('counts live sessions and exited records in scope, apart, leaving out rules 1–3', () => {
		expect(s.scope).toEqual({ live: 3, exited: 2 })
	})

	it('lists close and ask rows live first, with the ask evidence and how many more', () => {
		expect(s.close.map((r) => r.id)).toEqual(['y', 's', 'x'])
		expect(s.ask[0]?.evidence).toEqual([
			{ id: 'a', kind: 'commit', line: '+ c1 a' },
			{ id: 'a', kind: 'more', line: '12 more commits' },
		])
	})

	it('counts the keep group by reason', () => {
		expect(s.keep).toContainEqual({ reason: 'pull request open', live: 1, exited: 0 })
		expect(s.keep).toContainEqual({ reason: 'out of scope', live: 0, exited: 1 })
	})

	it('names `sessions ask` as the next step until live close-group units are asked', () => {
		expect(s.next).toBe('cyberfleet sessions ask /tmp/plan.json')
		expect(summarize({ ...plan, askedAt: 'now' }, '/tmp/plan.json').next).toBeUndefined()
	})

	it('prints the groups as toon, marking seats and pull requests', () => {
		const text = summaryToon(s)
		expect(text).toContain('scope: 3 live sessions, 2 exited records')
		expect(text).toContain('  s,h-s,live,seat,-,8d,seat finished,-')
		expect(text).toContain('  x,h-x,exited,,-,15,work landed,#4')
		expect(text).toContain('close: 3 (2 live, 1 exited)')
	})
})
