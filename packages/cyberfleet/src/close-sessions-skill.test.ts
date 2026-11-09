import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'

// close-sessions is a gateway over `cyberfleet sessions` (cyberfleet#167): the headless agent runs
// plan and ask, and the skill asks the Council and closes. These checks pin what an edit could
// quietly drop: the spawn, the two questions in order, the close command and its --force limit, and
// that the skill reaches only the CLI this plugin ships.

const PLUGIN_ROOT = new URL('../', import.meta.url)
const read = (path: string) => readFileSync(fileURLToPath(new URL(path, PLUGIN_ROOT)), 'utf8')
const text = read('skills/close-sessions/SKILL.md')

function section(heading: string): string {
	const start = text.indexOf(`\n${heading}\n`)
	expect(start, `missing section ${heading}`).toBeGreaterThan(-1)
	const end = text.indexOf('\n## ', start + 1)
	return text.slice(start, end === -1 ? undefined : end)
}

describe('close-sessions skill', () => {
	it('keeps its name and runs on a cheap model', () => {
		expect(text).toMatch(/^---\nname: close-sessions\n/)
		expect(text).toMatch(/\nmodel: haiku\n/)
	})

	it("runs bin/cyberfleet.mjs from the skill's own directory", () => {
		expect(section('## Running `cyberfleet`')).toContain(
			"node <this skill's directory>/../../bin/cyberfleet.mjs sessions",
		)
	})

	it('spawns the headless agent, with a fallback that runs plan then ask', () => {
		const s = section('## 1. Run the sweep headless')
		expect(s).toContain('`cyberfleet:headless-close-sessions`')
		expect(s.indexOf('cyberfleet sessions plan')).toBeLessThan(s.indexOf('cyberfleet sessions ask <path>'))
	})

	it('asks about the close group, then the ask group, and never lets the first yes cover the second', () => {
		const s = section('## 3. Ask two questions')
		expect(s.indexOf('"Close these N units?"')).toBeLessThan(s.indexOf('Which should I close?"'))
		expect(s).toContain('A yes to the first question never covers the ask group.')
	})

	it('closes through sessions close, with --force only for named ask-group units with leftover files', () => {
		const s = section('## 4. Close')
		expect(s).toContain('cyberfleet sessions close <plan path> --ids')
		expect(s).toMatch(/--force` only for an ask-group unit the Council named.*leftover files/s)
		expect(s).toMatch(/do not retry/)
	})

	it('never closes another way, retires a pod, or contacts a unit', () => {
		expect(text).toContain('Never run `cyberlegion unit close` yourself')
		expect(section('## Never')).toContain('Never run `cyberfleet pod retire`')
		expect(section('## Never')).toContain('Never mail a unit, type into a pane, or read a pane')
		expect(text).not.toMatch(/npx -y/)
	})
})
