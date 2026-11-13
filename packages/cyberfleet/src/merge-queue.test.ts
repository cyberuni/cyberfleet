import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'

// The Operator used to mail every other open pod of an order "trunk moved" after each merge, so n
// pull requests cost about n²/2 rebases, most of them thrown away (cyberfleet#180). It now keeps a
// merge queue per order and calls only its head. These checks pin that rule in each place that
// carries it, so the broadcast cannot come back in one of them.

const PLUGIN_ROOT = new URL('../', import.meta.url)
const read = (path: string) => readFileSync(fileURLToPath(new URL(path, PLUGIN_ROOT)), 'utf8')
const backstop = read('skills/merge-backstop-governance/SKILL.md')
const operator = read('skills/operator/SKILL.md')
const headless = read('agents/headless-operator.md')

function section(text: string, heading: string) {
	const start = text.indexOf(heading)
	return text.slice(start, text.indexOf('\n## ', start + 1))
}

const BROADCAST = /every other (still-)?open pod/i

describe('merge-backstop-governance §5: the merge queue', () => {
	const s5 = section(backstop, '## 5.')

	it('keeps one merge queue per order', () => {
		expect(s5).toMatch(/merge queue/i)
	})

	it('fixes the order as pods report done: dependency first, then small conflicts', () => {
		expect(s5).toMatch(/report(s)? done/)
		expect(s5).toMatch(/dependency order first/i)
		expect(s5).toMatch(/keeps conflicts small/i)
	})

	it('tells the pods behind the head to hold, while they keep working threads and decisions', () => {
		expect(s5).toMatch(/hold/i)
		expect(s5).toMatch(/until (it is )?called/i)
		expect(s5).toMatch(/review threads/i)
		expect(s5).toMatch(/Council decisions/)
	})

	it('calls only the next pod after a merge, and gates it from scratch', () => {
		expect(s5).toMatch(/only the next pod/i)
		expect(s5).toMatch(/from scratch/)
	})

	it('drops a pod that is not ready back and calls the next ready one', () => {
		expect(s5).toMatch(/drops back/i)
		expect(s5).toMatch(/next ready pod/i)
	})

	it('queues a conflict-free head on a host merge queue without a rebase', () => {
		expect(s5).toMatch(/host('s)? (has a )?merge queue/i)
		expect(s5).toMatch(/without a\s+rebase/i)
		expect(s5).toMatch(/only on a\s+conflict/i)
	})

	it('no longer broadcasts trunk moved', () => {
		expect(s5).not.toMatch(BROADCAST)
	})
})

describe('operator: the brief and the orchestration', () => {
	it('tells each pod to hold for trunk changes until called', () => {
		expect(operator).toMatch(/until called/)
		expect(operator).toMatch(/when called, rebase onto/)
	})

	it('orchestrates several pods through a merge queue, not a broadcast', () => {
		expect(operator).toMatch(/merge queue/i)
		expect(operator).not.toMatch(BROADCAST)
	})
})

describe('headless-operator: the loop calls the queue head', () => {
	it('calls the next pod in the order merge queue after a merge', () => {
		expect(headless).toMatch(/merge queue/i)
		expect(headless).not.toMatch(BROADCAST)
	})

	it('re-derives the queue each tick rather than remembering it', () => {
		expect(headless).toMatch(/re-derive[sd]? (the|its) (merge )?queue/i)
	})
})
