import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'

// The Captain persona owns its project's Pods (cyberfleet#25). These checks pin the rules that make
// that ownership real rather than a label, so an edit cannot quietly drop one.

const PLUGIN_ROOT = new URL('../', import.meta.url)
const text = readFileSync(fileURLToPath(new URL('skills/captain/SKILL.md', PLUGIN_ROOT)), 'utf8')
const start = text.indexOf('## Decisions')
const decisions = text.slice(start, text.indexOf('\n## ', start + 1))

describe('captain skill', () => {
	it('reads where the Captain stands before acting', () => {
		expect(decisions).toMatch(/cyberfleet captain/)
	})

	it('contacts or starts the one Captain in its home, and never takes a healthy lease', () => {
		expect(decisions).toMatch(/cyberlegion service start <project> captain --cwd <home>/)
		expect(decisions).toMatch(/Never `--force-generation`/)
		expect(decisions).toMatch(/never `service\s+handoff`/)
	})

	it('verifies the lease before every claim, merge, pod record, or retirement', () => {
		expect(decisions).toMatch(/cyberlegion service verify <project> captain --generation <n>/)
		expect(decisions).toMatch(/claim, merge, Pod record, or\s+retirement/)
	})

	it('never edits a sortie in the home or switches its branch', () => {
		expect(decisions).toMatch(/Never edit a\s+sortie in the home/)
		expect(decisions).toMatch(/never switch its branch/)
	})

	it('records exactly one owner for every Pod it spawns into its own worktree', () => {
		expect(decisions).toMatch(/cyberlegion unit spawn -C <home>/)
		expect(decisions).toMatch(/cyberfleet pod bind/)
	})

	it("names the Captain's own handle as the return address", () => {
		expect(decisions).toMatch(/\*\*this Captain's own handle\*\* as its return address/)
	})

	it('retires a pod through the fenced record before closing it', () => {
		const merge = decisions.slice(decisions.indexOf('Clean and covered'))
		expect(merge.indexOf('cyberfleet pod retire')).toBeGreaterThan(-1)
		expect(merge.indexOf('cyberfleet pod retire')).toBeLessThan(merge.indexOf('cyberlegion unit close'))
	})

	it('keeps unavailable and orphaned work visible, and adopts only explicitly', () => {
		expect(decisions).toMatch(/cyberfleet pods/)
		expect(decisions).toMatch(/`unavailable`/)
		expect(decisions).toMatch(/`orphaned`/)
		expect(decisions).toMatch(/cyberfleet pod adopt/)
		expect(decisions).toMatch(/cyberlegion unit restart/)
	})

	it('never invents Council approval for a relayed order', () => {
		expect(decisions).toMatch(/authority-governance/)
		expect(decisions).toMatch(/never a Council approval it\s+does not quote/)
	})
})
