import { spawnSync } from 'node:child_process'
import { copyFileSync, mkdirSync, mkdtempSync, readFileSync } from 'node:fs'
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
	it('names the missing dist/cli.mjs and a way out instead of a raw module-not-found', () => {
		const root = installShape(['bin/cyberfleet.mjs', 'package.json'])

		const res = runBin(root, ['--help'])

		expect(res.status).not.toBe(0)
		expect(res.stderr).not.toContain('ERR_MODULE_NOT_FOUND')
		expect(res.stderr).toContain(join(root, 'dist', 'cli.mjs'))
		expect(res.stderr).toContain(`npx -y cyberfleet@${VERSION}`)
	})
})
