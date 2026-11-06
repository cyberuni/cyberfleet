import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'

// `/jump` resolves its argument to one unit and focuses it through the `cyberlegion` CLI, so
// cyber-mux records the jump; `back` follows that record (cyberfleet#146). These checks pin the
// rules an edit could quietly drop: each form's command, the never-pick rule, and how the skill
// finds both CLIs without a cyberlegion skill or a stale plugin-cache path.

const PLUGIN_ROOT = new URL('../', import.meta.url)
const read = (path: string) => readFileSync(fileURLToPath(new URL(path, PLUGIN_ROOT)), 'utf8')
const text = read('skills/jump/SKILL.md')

function section(heading: string): string {
	const start = text.indexOf(`\n${heading}\n`)
	expect(start, `missing section ${heading}`).toBeGreaterThan(-1)
	const end = text.indexOf('\n## ', start + 1)
	return text.slice(start, end === -1 ? undefined : end)
}

const semver = (v: string) => v.split('.').map(Number)
function atLeast(v: string, floor: string): boolean {
	const [a, b] = [semver(v), semver(floor)]
	for (let i = 0; i < 3; i++) if (a[i] !== b[i]) return (a[i] ?? 0) > (b[i] ?? 0)
	return true
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

describe('jump skill: resolving cyberlegion', () => {
	const s = section('## Resolving `cyberlegion`')
	const pin = /The pin is `(\d+\.\d+\.\d+)`/.exec(s)?.[1]

	it('tries PATH, then the installed plugin, then a pinned npx, checking --version', () => {
		const path = s.indexOf('on `PATH`')
		const plugin = s.indexOf('~/.claude/plugins/installed_plugins.json')
		const npx = s.indexOf(`npx -y cyberlegion@${pin}`)
		expect(path).toBeGreaterThan(-1)
		expect(plugin).toBeGreaterThan(path)
		expect(npx).toBeGreaterThan(plugin)
		expect(s).toContain('<installPath>/bin/cyberlegion.mjs')
		expect(s).toContain('--version')
	})

	it('needs at least the bundled pin, since it relies on unit focus --repo/--branch', () => {
		expect(pin).toBeDefined()
		expect(atLeast(pin as string, JSON.parse(read('.plugin/pins.json')).cyberlegion)).toBe(true)
	})

	it('re-resolves after a reload and fails with an install hint', () => {
		expect(s).toMatch(/reload/)
		expect(s).toMatch(/never hardcode/i)
		expect(s).toMatch(/install hint/i)
	})
})

describe('jump skill: resolving cyber-mux', () => {
	const s = section('## Resolving `cyber-mux`')

	it('tries PATH, then the installed plugin, then a pinned npx, checking --version', () => {
		const path = s.indexOf('on `PATH`')
		const plugin = s.indexOf('cyber-mux@<marketplace>')
		const npx = s.search(/npx -y cyber-mux@\d+\.\d+\.\d+/)
		expect(path).toBeGreaterThan(-1)
		expect(plugin).toBeGreaterThan(path)
		expect(npx).toBeGreaterThan(plugin)
		expect(s).toContain('<installPath>/bin/cyber-mux.mjs')
		expect(s).toContain('--version')
	})
})

describe('jump skill: forms', () => {
	it('back follows cyber-mux history and nothing else', () => {
		expect(section('### Back')).toContain('cyber-mux focus --back')
	})

	it('repo and branch go to unit focus --repo / --branch', () => {
		const s = section('### Repo, branch, or pod')
		expect(s).toContain('unit focus --repo')
		expect(s).toContain('unit focus --branch')
	})

	it('a pod is focused by its id, after the handle is matched to exactly one unit', () => {
		const s = section('### Repo, branch, or pod')
		expect(s).toContain('unit focus <id>')
		expect(s).toMatch(/handle/)
	})

	it('a task ref reads the repo from primaryRoot and the org from origin, then focuses the branch', () => {
		const s = section('### Task')
		expect(s).toMatch(/#123/)
		expect(s).toMatch(/color-map#123/)
		expect(s).toContain('primaryRoot')
		expect(s).toContain('origin')
		expect(s).toContain('headRefName')
		expect(s).toContain('closedByPullRequestsReferences')
		expect(s).toMatch(/unit focus --repo \S+ --branch/)
	})

	it('a task ref with no branch match falls back to a unit whose handle or brief names the number', () => {
		const s = section('### Task')
		expect(s).toMatch(/handle or\s+brief names the number/)
	})

	it('prose is matched against handle, branch, repo, and brief', () => {
		const s = section('### Prose')
		for (const field of ['handle', 'branch', 'repo', 'brief']) expect(s).toContain(field)
	})
})

describe('jump skill: boundaries', () => {
	it('lists the candidates and stops on more than one match, never picking', () => {
		expect(text).toMatch(/list(s)? (the|every|each) candidate/i)
		expect(text).toMatch(/never pick/i)
	})

	it('focuses through cyberlegion, not the cyberfleet jump command', () => {
		expect(text).not.toMatch(/`cyberfleet jump/)
	})

	it('references no cyberlegion skill', () => {
		expect(text).not.toMatch(/cyberlegion:[a-z]/)
		expect(text).not.toMatch(/\blegate\b/)
	})

	it('reaches nothing outside its own folder', () => {
		expect(text).not.toContain('pins.json')
		expect(text).not.toMatch(/plugins\/cache\/[^\s`]*\/\d+\.\d+\.\d+/)
	})
})
