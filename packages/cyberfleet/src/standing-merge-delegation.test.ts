import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'

// The Council can delegate merges once, in a record only it writes, instead of replying to every
// dispatch. These checks pin the load-bearing rules: where the record lives, that it is read at each
// merge, that no unit writes it, and that it reaches neither a pod nor the headless loop.

const PLUGIN_ROOT = new URL('../', import.meta.url)
const read = (path: string) => readFileSync(fileURLToPath(new URL(path, PLUGIN_ROOT)), 'utf8')
const operator = read('skills/operator/SKILL.md')
const authority = read('skills/authority-governance/SKILL.md')

function section(text: string, heading: string) {
	const start = text.indexOf(heading)
	return text.slice(start, text.indexOf('\n## ', start + 1))
}

const RECORD = '~/.agents/cyberfleet/merge-delegation.md'

describe('authority-governance: the standing delegation record', () => {
	const s7 = section(authority, '## 7.')
	const record = s7.slice(
		s7.indexOf('**The standing delegation record'),
		s7.indexOf('**The headless lifecycle loop.**'),
	)

	it('names the record and its shape', () => {
		expect(record).toContain(RECORD)
		expect(record).toMatch(/scope:/)
		expect(record).toMatch(/date:/)
	})

	it('matches only exact owners or repositories', () => {
		expect(record).toMatch(/glob, a wildcard, a URL\) matches nothing/)
	})

	it('re-reads the record at each merge', () => {
		expect(record).toMatch(/At each merge, read it again/)
	})

	it('covers only dispatches announced under it', () => {
		expect(record).toMatch(/written after an announcement that asked for a reply does not\s+cover that order/)
	})

	it('lets no unit write it, and gives a pod nothing', () => {
		expect(record).toMatch(/Only the Council writes it/)
		expect(record).toMatch(/pod still never merges on it/)
	})

	it('keeps it out of the headless loop', () => {
		expect(record).toMatch(/does not reach the headless loop/)
		expect(s7).toMatch(/neither is a standing delegation record naming the repository/)
	})

	it('makes the record the one fetched exception in §1', () => {
		expect(section(authority, '## 1.')).toMatch(/One fetched thing carries the Council's words/)
	})
})

describe('operator: merging under the standing delegation record', () => {
	const standing = operator.slice(
		operator.indexOf('- **Standing delegation record.**'),
		operator.indexOf('- Once a pod is out'),
	)

	it('reads the record before announcing, quotes it, and asks for no reply', () => {
		expect(standing).toContain(RECORD)
		expect(standing).toMatch(/quotes the record's words, scope\s+and date/)
		expect(standing).toMatch(/ask for\s+no reply/)
	})

	it('never writes the record', () => {
		expect(standing).toMatch(/Never write that file/)
	})

	it('re-reads the record right before each merge', () => {
		expect(operator).toMatch(/read the file\s+again right before this merge/)
	})
})
