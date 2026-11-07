import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'

// `/jump` runs `cyberfleet jump`, which does the matching and focusing (cyberfleet#156). The skill
// keeps two steps: the `gh` lookup for a task ref and matching free text. These checks pin the
// rules an edit could quietly drop: the four steps, the never-pick rule, and that the skill reaches
// only the `cyberfleet` this plugin ships, never a cyberlegion or cyber-mux CLI.

const PLUGIN_ROOT = new URL('../', import.meta.url)
const read = (path: string) => readFileSync(fileURLToPath(new URL(path, PLUGIN_ROOT)), 'utf8')
const text = read('skills/jump/SKILL.md')

function section(heading: string): string {
	const start = text.indexOf(`\n${heading}\n`)
	expect(start, `missing section ${heading}`).toBeGreaterThan(-1)
	const end = text.indexOf('\n## ', start + 1)
	return text.slice(start, end === -1 ? undefined : end)
}

describe('jump skill: discovery', () => {
	it('is named jump and takes the argument forms the issue lists', () => {
		expect(text).toMatch(/^---\nname: jump\n/)
		expect(text).toMatch(/argument-hint: .*repo.*branch.*pod.*task.*back/)
	})

	it('ships in a folder every manifest and the package allowlist already cover', () => {
		expect(JSON.parse(read('.plugin/plugin.json')).skills).toBe('./skills')
		expect(JSON.parse(read('.codex-plugin/plugin.json')).skills).toBe('./skills')
		expect(JSON.parse(read('package.json')).files).toContain('skills')
	})
})

describe('jump skill: runs the cyberfleet this plugin ships', () => {
	it("runs bin/cyberfleet.mjs from the skill's own directory, with no install", () => {
		const s = section('## Running `cyberfleet`')
		expect(s).toContain("node <this skill's directory>/../../bin/cyberfleet.mjs jump")
		expect(read('bin/cyberfleet.mjs')).toBeTruthy()
	})

	it('resolves no cyberlegion or cyber-mux CLI', () => {
		expect(text).not.toMatch(/`cyberlegion /)
		expect(text).not.toMatch(/`cyber-mux /)
		expect(text).not.toMatch(/npx -y/)
		expect(text).not.toContain('installed_plugins.json')
	})
})

describe('jump skill: the four steps', () => {
	it('step 1 runs cyberfleet jump and branches on each result kind', () => {
		const s = section('## 1. Run `cyberfleet jump <argument>`')
		for (const kind of ['jumped', 'candidates', 'task', 'prose']) expect(s).toContain(`\`${kind}\``)
		expect(s).toMatch(/non-zero exit/)
	})

	it('step 2 finds the branches with gh, then focuses by --repo, --branch, and --mentions', () => {
		const s = section('## 2. On `task`, look up the branches with `gh`')
		expect(s).toContain('.pull_request != null')
		expect(s).toContain('headRefName')
		expect(s).toContain('closedByPullRequestsReferences')
		expect(s).toContain('cyberfleet jump --repo <repo> --branch <b>... --mentions <number>')
	})

	it('step 3 matches the words against handle, branch, repo, and brief, then jumps by id', () => {
		const s = section('## 3. On `prose`, match the words to one unit')
		for (const field of ['handle', 'branch', 'repo', 'brief']) expect(s).toContain(field)
		expect(s).toContain('cyberfleet jump <id>')
	})

	it('step 4 reports a jump, the candidates, or the error verbatim', () => {
		const s = section('## 4. Report the result')
		expect(s).toContain('`jumped`')
		expect(s).toContain('`candidates`')
		expect(s).toMatch(/verbatim/)
	})

	it('runs the steps in order', () => {
		const order = ['## 1. ', '## 2. ', '## 3. ', '## 4. '].map((h) => text.indexOf(h))
		expect(order.every((at, i) => at > -1 && (i === 0 || at > (order[i - 1] as number)))).toBe(true)
	})
})

describe('jump skill: boundaries', () => {
	it('lists the candidates and stops on more than one match, never picking', () => {
		expect(text).toMatch(/list(s)? (the|every|each) candidate/i)
		expect(text).toMatch(/never pick/i)
	})

	it('references no cyberlegion skill', () => {
		expect(text).not.toMatch(/cyberlegion:[a-z]/)
		expect(text).not.toMatch(/\blegate\b/)
	})

	it('reaches nothing outside its plugin', () => {
		expect(text).not.toContain('pins.json')
		expect(text).not.toMatch(/plugins\/cache\/[^\s`]*\/\d+\.\d+\.\d+/)
	})
})
