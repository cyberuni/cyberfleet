import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'

// The Operator's brief named a return handle but not the command that reaches it, so a pod fell back
// to its harness's own messaging tool, which cannot see cyberlegion handles, and the report was lost —
// the `operator` fallback with it (cyberfleet#96). These checks pin the reply command in every place
// that writes a pod brief or tells a pod how to report.

const PLUGIN_ROOT = new URL('../', import.meta.url)
// Markdown wraps a long command across lines, so match against the text with whitespace collapsed.
const read = (path: string) => readFileSync(fileURLToPath(new URL(path, PLUGIN_ROOT)), 'utf8').replace(/\s+/g, ' ')
const operator = read('skills/operator/SKILL.md')
const pod = read('skills/pod/SKILL.md')
const headless = read('agents/headless-operator.md')

const REPLY = /cyberlegion mail send --to <return (address|handle)> --thread <thread id> --subject .+? --body /

describe('operator brief', () => {
	const brief = operator.slice(operator.indexOf('- Every brief sets the pod'), operator.indexOf('- With the dispatch'))

	it('spells out the exact reply command with the thread id', () => {
		expect(brief).toMatch(REPLY)
		expect(brief).toMatch(/thread id/)
	})

	it("forbids the harness's own messaging tool for fleet handles", () => {
		expect(brief).toMatch(/harness's own messaging tool/)
	})

	it('sends the operator fallback through the same command', () => {
		expect(brief).toMatch(/--to operator/)
	})
})

describe('headless-operator brief', () => {
	const spawn = headless.slice(headless.indexOf('## Spawn boundary'), headless.indexOf('## Report and ask'))

	it('carries the same reply command into every brief it writes', () => {
		expect(spawn).toMatch(REPLY)
		expect(spawn).toMatch(/harness's own messaging tool/)
	})
})

describe('pod report', () => {
	const report = pod.slice(pod.indexOf('5. **Report**'), pod.indexOf('7. **Offer the merge'))

	it('reports with cyberlegion mail send, never the harness messaging tool', () => {
		expect(report).toMatch(/cyberlegion mail send --to <return address> --thread <thread id>/)
		expect(report).toMatch(/harness's own messaging tool/)
		expect(report).toMatch(/--to operator/)
	})
})
