import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'

// The Operator's merge delegation is never transferable, but a pod may merge its own pull request on
// the Council's answer to the pod's own merge offer: a decision under §3, not a transfer (cyberfleet#73).

const PLUGIN_ROOT = new URL('../', import.meta.url)
const text = readFileSync(fileURLToPath(new URL('skills/authority-governance/SKILL.md', PLUGIN_ROOT)), 'utf8')
const start = text.indexOf('## 7.')
const section = text.slice(start, text.indexOf('\n## ', start + 1))

describe("authority-governance §7: a pod's own merge offer", () => {
	it('keeps the Operator delegation untransferable', () => {
		expect(section).toMatch(/Never transferable/)
	})

	it('makes the offer a decision-request whose answer is a decision', () => {
		expect(section).toMatch(/merge offer is not a transfer/)
		expect(section).toMatch(/offer is a decision-request \(§3\)/)
	})

	it('drops the offer when the head moves, and keeps the dispatcher from answering it', () => {
		expect(section).toMatch(/push after the offer/)
		expect(section).toMatch(/never answers that offer with its own approval/)
	})
})
