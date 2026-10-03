import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'

// A Council decision used to exist only as the answer to the unit's own decision-request, so "merge
// PR #75" typed into a Pod's session cost a confirming round trip. Words that name the action and its
// target are now a decision themselves, pinned to the target's revision when the words arrived; a
// bare "Approve" with nothing outstanding still covers nothing.

const PLUGIN_ROOT = new URL('../', import.meta.url)
const text = readFileSync(fileURLToPath(new URL('skills/authority-governance/SKILL.md', PLUGIN_ROOT)), 'utf8')
const start = text.indexOf('## 3.')
const section = text.slice(start, text.indexOf('\n## ', start + 1))

describe('authority-governance §3: what a decision is', () => {
	it('takes words that name the action and its target as a decision', () => {
		expect(section).toMatch(/name the action and its target/)
	})

	it('pins such a decision to the revision the target had when the words arrived', () => {
		expect(section).toMatch(/revision it had when the words arrived/)
	})

	it('still treats words that name nothing and answer nothing as an order', () => {
		expect(section).toMatch(/answer no outstanding\s+request are an \*\*order\*\*/)
	})
})
