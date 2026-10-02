import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'

// The personas issue bare `cyberlegion …` commands, but a plugin-only install puts no `cyberlegion`
// on PATH. Each entry point that runs those commands must name how to resolve the CLI — PATH, the
// installed plugin's current installPath, then a pinned npx — so an agent never improvises a
// versioned plugin-cache path that goes stale on the next plugin reload (cyberfleet#66).

const PLUGIN_ROOT = new URL('../', import.meta.url)
const read = (path: string) => readFileSync(fileURLToPath(new URL(path, PLUGIN_ROOT)), 'utf8')

const ENTRY_POINTS = [
	'skills/operator/SKILL.md',
	'skills/pod/SKILL.md',
	'skills/crimp/SKILL.md',
	'agents/headless-operator.md',
]

describe('cyberlegion pin', () => {
	it('pins cyberlegion to an exact version in the bundled pins map', () => {
		const pins = JSON.parse(read('.plugin/pins.json'))
		expect(pins.cyberlegion).toMatch(/^\d+\.\d+\.\d+(?:-[\w.]+)?$/)
	})
})

describe.each(ENTRY_POINTS)('%s', (file) => {
	const text = read(file)
	const section = text.slice(text.indexOf('## Resolving `cyberlegion`'))

	it('has a section on resolving the cyberlegion CLI', () => {
		expect(text).toContain('## Resolving `cyberlegion`')
	})

	it('names the resolution order: PATH, installed plugin, pinned npx', () => {
		const path = section.indexOf('on `PATH`')
		const plugin = section.indexOf('~/.claude/plugins/installed_plugins.json')
		const npx = section.indexOf('npx -y cyberlegion@<pin>')
		expect(path).toBeGreaterThan(-1)
		expect(plugin).toBeGreaterThan(path)
		expect(npx).toBeGreaterThan(plugin)
		expect(section).toContain('<installPath>/bin/cyberlegion.mjs')
	})

	it('reads the pin from the bundled pins map and checks the version', () => {
		expect(section).toContain('.plugin/pins.json')
		expect(section).toContain('--version')
	})

	it('re-resolves rather than caching a versioned path, and fails with an install hint', () => {
		expect(section).toMatch(/reload/)
		expect(section).toMatch(/never hardcode/i)
		expect(section).toMatch(/install hint/i)
	})

	it('never hardcodes a plugin-cache path', () => {
		expect(text).not.toMatch(/plugins\/cache\/[^\s`]*\/\d+\.\d+\.\d+/)
	})
})
