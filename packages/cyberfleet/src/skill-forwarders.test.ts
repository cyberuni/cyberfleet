import { existsSync, readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'

// Skills run a CLI through a forwarding script in their own folder, written by
// `universal-plugin plugin build` (universal-plugin ADR 0022). One `node` line works on every
// install route and runs the checkout's CLI in development; the forwarder picks which.

const PLUGIN_ROOT = new URL('../', import.meta.url)
const path = (p: string) => fileURLToPath(new URL(p, PLUGIN_ROOT))
const read = (p: string) => readFileSync(path(p), 'utf8')
const scripts: Record<string, { forward: string; package?: string; version?: string }> = JSON.parse(read('plugin.json'))
	.extensions['org.cyberuni.universal-plugin'].scripts
const pin = JSON.parse(read('.plugin/pins.json')).cyberlegion

const FORWARDERS: Array<[skill: string, bin: 'cyberfleet' | 'cyberlegion']> = [
	['close-sessions', 'cyberfleet'],
	['jump', 'cyberfleet'],
	['operator', 'cyberfleet'],
	['pod', 'cyberfleet'],
	['crimp', 'cyberlegion'],
	['operator', 'cyberlegion'],
	['pod', 'cyberlegion'],
]

describe.each(FORWARDERS)('skills/%s runs %s through its forwarder', (skill, bin) => {
	const file = `skills/${skill}/scripts/${bin}.mjs`
	const text = read(`skills/${skill}/SKILL.md`)

	it('declares the forwarder in plugin.json', () => {
		const entry = scripts[file]
		expect(entry?.forward).toBe(bin)
		if (bin === 'cyberlegion') expect(entry).toMatchObject({ package: 'cyberlegion', version: pin })
		else expect(entry).not.toHaveProperty('package')
	})

	it('commits the forwarder the build writes', () => {
		expect(existsSync(path(file))).toBe(true)
	})

	it("calls it from the skill's own folder", () => {
		expect(text).toContain(`node <this skill's folder>/scripts/${bin}.mjs`)
	})

	it('keeps no runner beside it', () => {
		expect(text).not.toMatch(new RegExp(`npx -y ${bin}|pnpm exec ${bin}|upx ${bin}`))
		expect(text).not.toContain(`bin/${bin}.mjs`)
		expect(text).not.toContain('installed_plugins.json')
		expect(text).not.toMatch(new RegExp(`\`${bin}\` on \`PATH\``))
	})
})
