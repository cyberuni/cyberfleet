import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'

// The Operator's relay rule said a Council decision reaches the pod "on a turn", but never named the
// command, so the Operator mailed it and the pod got only the doorbell (cyberfleet#85). These checks
// pin the channel: `unit nudge --message` carries the Council's words, and mail never does.

const PLUGIN_ROOT = new URL('../', import.meta.url)
const read = (path: string) => readFileSync(fileURLToPath(new URL(path, PLUGIN_ROOT)), 'utf8')
const operator = read('skills/operator/SKILL.md')
const authority = read('skills/authority-governance/SKILL.md')

function section(text: string, heading: string) {
	const start = text.indexOf(heading)
	return text.slice(start, text.indexOf('\n## ', start + 1))
}

describe('operator relay of a Council decision', () => {
	const relay = operator.slice(operator.indexOf('Relay what'), operator.indexOf('- When work belongs inside'))

	it('names unit nudge --message as the relay command', () => {
		expect(relay).toMatch(/cyberlegion unit nudge <handle> --message/)
	})

	it('says mail plus a doorbell is not a relay', () => {
		expect(relay).toMatch(/mail send/)
		expect(relay).toMatch(/doorbell/)
		expect(relay).toMatch(/not a relay/)
	})

	it('lists unit nudge among the delegated mechanics', () => {
		expect(section(operator, '## Delegation')).toMatch(/unit nudge/)
	})

	it('allows typing into a pane only for a Council relay', () => {
		const delegation = section(operator, '## Delegation')
		expect(delegation).not.toMatch(/never types into a ship's pane,/)
		expect(delegation).toMatch(/unit nudge --message/)
	})
})

describe('authority-governance relay channel', () => {
	const s3 = section(authority, '## 3.')

	it('names unit nudge --message as how a relay reaches a unit as a turn', () => {
		expect(s3).toMatch(/unit nudge <handle> --message/)
		expect(s3).toMatch(/mail/)
	})

	it('keeps the forgery caveat', () => {
		expect(section(authority, '## What this does not promise')).toMatch(/unit nudge <ref> --message/)
	})
})
