import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'

// After a device shutdown and a herdr resume, the Operator's return handle still showed as a live
// unit while no session could read its mail, and re-running `unit register` minted a new handle that
// left the pods' reports stranded under the old one (cyberfleet#191). cyberlegion 2.1.0 finds a resumed
// session's unit by its harness conversation and adds `unit rebind <id>` for a session that already
// minted a duplicate (cyberlegion#284). These checks pin the recovery step on both sides.

const PLUGIN_ROOT = new URL('../', import.meta.url)
const decisionsOf = (skill: string) => {
	const text = readFileSync(fileURLToPath(new URL(`skills/${skill}/SKILL.md`, PLUGIN_ROOT)), 'utf8')
	const start = text.indexOf('## Decisions')
	return text.slice(start, text.indexOf('\n## ', start + 1))
}

describe('operator: losing its own identity mid-order', () => {
	const decisions = decisionsOf('operator')

	it('names the signs: an empty inbox under a rung doorbell, or whoami naming another unit', () => {
		expect(decisions).toMatch(/doorbell[^.]*mail inbox[^.]*(nothing|empty)/is)
		expect(decisions).toMatch(/unit whoami/)
	})

	it('recovers onto the old handle with unit rebind rather than a new register', () => {
		expect(decisions).toMatch(/unit rebind <[^>]*handle[^>]*>/)
		expect(decisions).toMatch(/never[^.]*unit register[^.]*(new|fresh)/is)
	})

	it('falls back to reading the old mailbox and telling the pods only when rebind refuses', () => {
		expect(decisions).toMatch(/refuse[\s\S]*mail inbox --unit <[^>]*>/)
		expect(decisions).toMatch(/refuse[\s\S]*each of the order's pods[^.]*new return/is)
	})
})

describe('pod: reporting from the identity it was spawned under', () => {
	const decisions = decisionsOf('pod')

	it('checks whoami before reporting and rebinds rather than registering again', () => {
		expect(decisions).toMatch(/unit whoami/)
		expect(decisions).toMatch(/unit rebind <[^>]*handle[^>]*>/)
		expect(decisions).toMatch(/never[^.]*unit register[^.]*(again|new|fresh)/is)
	})
})
