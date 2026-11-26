import { spawnSync } from 'node:child_process'
import { copyFileSync, mkdirSync, mkdtempSync, readFileSync, utimesSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'

// An installed plugin is a copy of the package directory, not an npm install: no node_modules,
// and — for the directory marketplace source — whatever the checkout carries. These tests build
// that shape in a scratch directory, outside the workspace, so no hoisted node_modules can hide a
// missing inline or a missing file.
const PKG_DIR = fileURLToPath(new URL('..', import.meta.url))
const VERSION = (JSON.parse(readFileSync(join(PKG_DIR, 'package.json'), 'utf8')) as { version: string }).version

function installShape(files: string[]): string {
	const root = mkdtempSync(join(tmpdir(), 'cyberfleet-install-'))
	for (const file of files) {
		mkdirSync(join(root, file, '..'), { recursive: true })
		copyFileSync(join(PKG_DIR, file), join(root, file))
	}
	return root
}

function runBin(root: string, args: string[]) {
	return spawnSync('node', [join(root, 'bin', 'cyberfleet.mjs'), ...args], { cwd: root, encoding: 'utf8' })
}

describe('bin/cyberfleet.mjs at an install location', () => {
	it('runs from bin, dist/cli.mjs, and package.json alone', () => {
		const root = installShape(['bin/cyberfleet.mjs', 'dist/cli.mjs', 'package.json'])

		const res = runBin(root, ['--version'])

		expect(res.stderr).toBe('')
		expect(res.stdout.trim()).toBe(VERSION)
	})

	it('prints its help from the install shape', () => {
		const root = installShape(['bin/cyberfleet.mjs', 'dist/cli.mjs', 'package.json'])

		const res = runBin(root, ['--help'])

		expect(res.status).toBe(0)
		expect(res.stdout).toContain('Usage: cyberfleet')
	})

	it('names the missing dist/cli.mjs and a way out instead of a raw module-not-found', () => {
		const root = installShape(['bin/cyberfleet.mjs', 'package.json'])

		const res = runBin(root, ['--help'])

		expect(res.status).not.toBe(0)
		expect(res.stderr).not.toContain('ERR_MODULE_NOT_FOUND')
		expect(res.stderr).toContain(join(root, 'dist', 'cli.mjs'))
		expect(res.stderr).toContain(`npx -y cyberfleet@${VERSION}`)
	})
})

// The skill forwarders run the package's own bin when they sit inside it, and fall back to a pinned
// npx run only when that bin cannot load. A plugin cache is such a copy: its mtimes follow copy
// order, so the forwarder must run the local dist there without calling it stale (issue #213).
describe('skill forwarder at an install location', () => {
	function forwarderShape(): string {
		const root = installShape(['bin/cyberfleet.mjs', 'package.json', 'skills/jump/scripts/cyberfleet.mjs'])
		mkdirSync(join(root, 'dist'))
		writeFileSync(join(root, 'dist', 'cli.mjs'), "console.log('local-dist')\n")
		mkdirSync(join(root, 'src'))
		writeFileSync(join(root, 'src', 'cli.ts'), '')
		utimesSync(join(root, 'dist', 'cli.mjs'), 1_000, 1_000)
		return root
	}

	function runForwarder(root: string) {
		return spawnSync('node', [join(root, 'skills', 'jump', 'scripts', 'cyberfleet.mjs')], {
			cwd: root,
			encoding: 'utf8',
		})
	}

	it('runs the local dist, not npx, and calls nothing stale when src/ was copied after dist/', () => {
		const root = forwarderShape()

		const res = runForwarder(root)

		expect(res.stdout.trim()).toBe('local-dist')
		expect(res.stderr).toBe('')
	})

	it('still warns in a development checkout whose src/ is newer than dist/', () => {
		const root = forwarderShape()
		mkdirSync(join(root, '.git'))

		const res = runForwarder(root)

		expect(res.stdout.trim()).toBe('local-dist')
		expect(res.stderr).toContain('older than src/')
	})
})
