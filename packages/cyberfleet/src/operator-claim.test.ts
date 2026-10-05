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
