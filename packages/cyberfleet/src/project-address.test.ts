import { execFileSync } from 'node:child_process'
import { mkdtempSync, realpathSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { FileStore, type ServiceContext } from 'cyberlegion'
import { beforeEach, describe, expect, it } from 'vitest'
import { KEY_SCHEME, projectAddressOf } from './project-address.ts'

let work: string
let ctx: ServiceContext

beforeEach(() => {
	work = realpathSync(mkdtempSync(join(tmpdir(), 'cf-address-')))
	ctx = { store: new FileStore(join(work, 'hub')), env: {} }
})

function repo(name: string, worktree: string) {
	const root = join(work, name)
	execFileSync('git', ['init', '-q', '-b', 'main', root])
	const git = (...args: string[]) => execFileSync('git', ['-C', root, ...args])
	git('-c', 'user.name=t', '-c', 'user.email=t@t', 'commit', '-q', '--allow-empty', '-m', 'i')
	const tree = join(work, `${name}.worktrees`, worktree)
	git('worktree', 'add', '-q', '-b', worktree, tree)
	return { root, tree }
}

describe('projectAddressOf', () => {
	it('gives every checkout of a project the same key, homed at its default checkout', () => {
		const { root, tree } = repo('alpha', 'pod-1')
		const fromHome = projectAddressOf(ctx, root)
		expect(projectAddressOf(ctx, tree)).toEqual(fromHome)
		expect(fromHome).toMatchObject({ scheme: KEY_SCHEME, name: 'alpha', home: root })
	})

	it('resolves a key it handed out back to the same address', () => {
		const { root } = repo('alpha', 'pod-1')
		const address = projectAddressOf(ctx, root)
		expect(projectAddressOf(ctx, address.key)).toEqual(address)
	})
})
