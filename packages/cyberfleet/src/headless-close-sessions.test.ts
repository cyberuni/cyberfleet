import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'

// The headless half of close-sessions runs `sessions plan` and `sessions ask` and returns the summary
// (cyberfleet#167). These checks pin what an edit could quietly break: that every manifest ships it,
// that it is a cheap model, and that it never closes a unit or reaches past the CLI it was handed.

const PLUGIN_ROOT = new URL('../', import.meta.url)
const read = (path: string) => readFileSync(fileURLToPath(new URL(path, PLUGIN_ROOT)), 'utf8')
const FILE = './agents/headless-close-sessions.md'
const text = read(FILE)

describe('headless-close-sessions agent', () => {
	it('is listed in every manifest that lists agents, and shipped by the package allowlist', () => {
		expect(JSON.parse(read('.plugin/plugin.json')).agents).toContain(FILE)
		expect(JSON.parse(read('.claude-plugin/plugin.json')).agents).toContain(FILE)
		expect(JSON.parse(read('plugin.json')).extensions['org.cyberuni.universal-plugin'].agents).toContain(FILE)
		expect(JSON.parse(read('package.json')).files).toContain('agents')
	})

	it('runs on a cheap model at low effort', () => {
		expect(text).toMatch(/^---\nname: headless-close-sessions\n/)
		expect(text).toMatch(/\nmodel: haiku\n/)
		expect(text).toMatch(/\neffort: low\n/)
	})

	it('runs plan then ask, and returns the summary', () => {
		const run = text.slice(text.indexOf('## Run'), text.indexOf('## Return'))
		expect(run.indexOf('cyberfleet sessions plan')).toBeGreaterThan(-1)
		expect(run.indexOf('cyberfleet sessions ask <path>')).toBeGreaterThan(run.indexOf('cyberfleet sessions plan'))
	})

	it('never closes, retires, or asks the Council', () => {
		const never = text.slice(text.indexOf('## Never'))
		expect(never).toContain('Never run `cyberfleet sessions close`')
		expect(never).toContain('cyberfleet pod retire')
		expect(never).toContain('Never ask the Council')
	})

	it('runs only the cyberfleet its brief names, never another install', () => {
		expect(text).toContain('node <path>/bin/cyberfleet.mjs')
		expect(text).not.toMatch(/npx -y/)
	})
})
