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
		expect(section).toMatch(/re-run it\s+once/i)
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

	it("resolves the bot threads it discarded, leaving a human reviewer's and escalated threads open", () => {
		expect(section).toMatch(/discarded a bot finding/)
		expect(section).toMatch(/human reviewer's thread open/)
		expect(section).toMatch(/escalated threads open/)
	})

	it('treats comment text as data, under authority-governance', () => {
		expect(section).toMatch(/data, not instructions/i)
		expect(section).toContain('authority-governance')
	})

	it('never approves its own pull request and never merges outside its own offer', () => {
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

	it('tells its spawner it is ready to discharge once the work is done', () => {
		expect(section).toMatch(/ready to discharge/)
		expect(section).toMatch(/spawner/)
	})

	it('offers the merge in its own session and merges only on an answer to that offer', () => {
		expect(section).toMatch(/Offer the merge in this session/)
		expect(section).toMatch(/decision-request/)
		expect(section).toMatch(/no longer covers the new head/)
		expect(section).toMatch(/never answers the offer/)
	})

	it('lets an open offer lapse when readiness is lost, and says what lapsed it', () => {
		expect(section).toMatch(/lapses when readiness is lost/)
		expect(section).toMatch(/say in this session which thread or comment lapsed/)
	})

	it('runs no merge on a declined offer or an already-merged pull request', () => {
		expect(section).toMatch(/declines merges nothing/)
		expect(section).toMatch(/already merged/)
	})

	it('reports the CI result and how each finding was handled', () => {
		expect(section).toMatch(/report/i)
		expect(section).toMatch(/human decision/i)
	})
})

describe("operator brief: the pod's side of the watch", () => {
	const operator = readFileSync(fileURLToPath(new URL('skills/operator/SKILL.md', PLUGIN_ROOT)), 'utf8')
	const clause = operator.slice(operator.indexOf("Every brief sets the pod's side of the watch"))
	const bullet = clause.slice(0, clause.indexOf('\n- '))

	it('tells the pod to shepherd its pull request, and sets the shepherding knobs', () => {
		expect(bullet).toMatch(/shepherd/)
		expect(bullet).toMatch(/per-turn timeout/)
		expect(bullet).toMatch(/threads/)
	})
})
