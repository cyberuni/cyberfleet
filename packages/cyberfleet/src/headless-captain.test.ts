import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'

// The headless lifecycle loop is a project's Captain run headless (cyberfleet#25, ADR-0023). It acts
// only while it holds the project's captain lease, so an interactive Captain and a headless tick
// never both dispatch or both retire. These checks pin that rule.

const PLUGIN_ROOT = new URL('../', import.meta.url)
const text = readFileSync(fileURLToPath(new URL('agents/headless-operator.md', PLUGIN_ROOT)), 'utf8')
const start = text.indexOf('## The lease comes first')
const lease = text.slice(start, text.indexOf('\n## ', start + 1))

describe('headless Captain', () => {
	it('has a section on holding the lease first', () => {
		expect(start).toBeGreaterThan(-1)
	})

	it('dispatches nothing when another Captain holds the project or a start is in progress', () => {
		expect(lease).toMatch(/cyberlegion service acquire <project> captain/)
		expect(lease).toMatch(/`resolved`[\s\S]*`starting`[\s\S]*dispatch nothing, merge nothing, retire nothing/)
	})

	it('binds a reservation it wins and releases it on exit', () => {
		expect(lease).toMatch(/cyberlegion service bind <project> captain --generation <n> --token <token>/)
		expect(lease).toMatch(/cyberlegion service\s+release <project> captain --generation <n>/)
	})

	it('verifies the lease before every claim, merge, Pod record, and retirement', () => {
		expect(lease).toMatch(/cyberlegion service verify <project>\s+captain --generation <n>/)
		expect(text).toMatch(/cyberfleet pod bind/)
		expect(text).toMatch(/cyberfleet pod retire/)
	})

	it('never forces or takes the lease', () => {
		expect(lease).toMatch(/Never `--force-generation` and never `service handoff`/)
	})

	it('keeps unavailable and orphaned Pods visible', () => {
		expect(lease).toMatch(/cyberfleet pods <project>/)
		expect(lease).toMatch(/`orphaned`/)
	})
})
