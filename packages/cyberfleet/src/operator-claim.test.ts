import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'

// The standing `operator` is one long-lived captain session in its home. The Operator skill used to
// claim it on every connect ("last claim wins"), so any project session that dispatched a pod stole
// the command center. A session now claims only when nobody holds the claim, and only the holder
// reads the standing mailbox. These checks pin that rule so an edit cannot quietly restore the old one.

const PLUGIN_ROOT = new URL('../', import.meta.url)
const text = readFileSync(fileURLToPath(new URL('skills/operator/SKILL.md', PLUGIN_ROOT)), 'utf8')
const start = text.indexOf('## Decisions')
const decisions = text.slice(start, text.indexOf('\n## ', start + 1))

describe('operator claim', () => {
	it('reads the claim before taking it', () => {
		expect(decisions).toMatch(/unit claim operator --show/)
	})

	it('claims only when no presence is bound', () => {
		expect(decisions).toMatch(/only when[^.]*no presence/i)
	})

	it('no longer takes the claim from a session that holds it', () => {
		expect(text).not.toMatch(/last claim wins/i)
		expect(text).not.toMatch(/even when another\s+session already holds it/i)
		expect(decisions).toMatch(/do not claim/i)
	})

	it('leaves the standing mailbox to the claim holder', () => {
		expect(decisions).toMatch(/holds? the claim[^.]*mail inbox --owner operator/is)
		expect(decisions).toMatch(/not hold the claim[^.]*(never|neither)[^.]*(read|ack)/is)
	})

	it('names --home on the onboarding route', () => {
		expect(decisions).toMatch(/init-cyberlegion[\s\S]*--home/)
	})
})

// Operator spawns no Pods: a project's Captain spawns and owns them (cyberfleet#25, ADR-0023).
describe('operator hands project work to its Captain', () => {
	it('contacts or starts the Captain instead of spawning a Pod', () => {
		expect(decisions).toMatch(/Operator spawns no Pods/)
		expect(decisions).toMatch(/cyberfleet captain <project>/)
		expect(decisions).toMatch(/cyberlegion service start <project>\s+captain --cwd <home>/)
		expect(decisions).not.toMatch(/cyberlegion unit spawn/)
	})

	it('takes over nothing by being called', () => {
		expect(decisions).toMatch(/Never `--force-generation`, never `service handoff`/)
		expect(decisions).toMatch(/`cyberfleet pod bind` or `pod adopt`/)
	})

	it('leaves the merge watch to the Captain', () => {
		expect(decisions).not.toMatch(/gh pr merge/)
	})
})
