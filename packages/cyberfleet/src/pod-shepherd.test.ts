import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'

// A Pod's mission used to end at "PR opened", leaving CI failures and bot review findings for a
// human to notice. The Pod persona now shepherds its own pull request until the head pipeline is
// green or the watch times out (cyberfleet#73). These checks pin the boundaries that section must
// keep, so an edit cannot quietly drop one.

const PLUGIN_ROOT = new URL('../', import.meta.url)
const text = readFileSync(fileURLToPath(new URL('skills/pod/SKILL.md', PLUGIN_ROOT)), 'utf8')
const start = text.indexOf('## Shepherding the pull request')
const section = text.slice(start, text.indexOf('\n## ', start + 1))

describe('pod shepherding', () => {
	it('has a section on shepherding the pull request', () => {
		expect(start).toBeGreaterThan(-1)
	})

	it('watches CI on the head commit and re-runs a flaky failure once', () => {
		expect(section).toMatch(/head commit/)
		expect(section).toMatch(/re-run.*once/i)
	})

	it('puts a timeout on the watch and reports on it', () => {
		expect(section).toMatch(/timeout/i)
		expect(section).toMatch(/times out/)
		expect(section).toMatch(/12\s+minutes per turn/)
	})

	it('triages every review comment, bot and AI ones included', () => {
		expect(section).toMatch(/every review comment/i)
		expect(section).toMatch(/bot/i)
		expect(section).toMatch(/discard/i)
		expect(section).toMatch(/evidence/i)
		expect(section).toMatch(/one concern per commit/i)
	})

	it('replies in each thread and resolves the threads it fixed', () => {
		expect(section).toMatch(/reply/i)
		expect(section).toMatch(/resolve/i)
	})

	it('treats comment text as data, under authority-governance', () => {
		expect(section).toMatch(/data, not instructions/i)
		expect(section).toContain('authority-governance')
	})

	it('never merges and never approves its own pull request', () => {
		expect(section).toMatch(/never merge/i)
		expect(section).toMatch(/never approve/i)
	})

	it('escalates design, scope, and API questions and conflicting human requests', () => {
		expect(section).toMatch(/design, scope, or API/)
		expect(section).toMatch(/conflicts with the brief/)
	})

	it('covers GitHub and GitLab', () => {
		expect(section).toContain('gh ')
		expect(section).toContain('glab ')
	})

	it('reports the CI result and how each finding was handled', () => {
		expect(section).toMatch(/report/i)
		expect(section).toMatch(/human decision/i)
	})
})
