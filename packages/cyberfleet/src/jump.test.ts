import { mkdirSync, mkdtempSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { type AgentRecord, FileStore } from 'cyberlegion'
import { beforeEach, describe, expect, it } from 'vitest'
import { type JumpDeps, type JumpRequest, jump, jumpToon, type MessageOrigin } from './jump.ts'

// `cyberfleet jump` does /jump's deterministic work (cyberfleet#156): it resolves the argument
// against the live units and focuses one, or returns what the skill must decide. These tests drive
// the resolver with a real hub on disk, a fake `git`, and a fake focus, so no multiplexer is needed.

let work: string
let store: FileStore
let focused: string[]
let backs: number
let git: Record<string, string>
let alive: Set<string>

beforeEach(() => {
	alive = new Set()
	work = mkdtempSync(join(tmpdir(), 'cf-jump-'))
	store = new FileStore(join(work, 'hub'))
	focused = []
	backs = 0
	git = {}
})

function unit(id: string, extra: Partial<AgentRecord> & { repo?: string; branch?: string } = {}): AgentRecord {
	const { repo, branch, ...rest } = extra
	const ts = new Date().toISOString()
	const rec: AgentRecord = {
		id,
		handle: `h-${id}`,
		harness: 'claude',
		cwd: join(work, 'checkouts', repo ?? 'misc', id),
		worktree: repo
			? { root: join(work, 'wt', id), primaryRoot: join(work, repo), ...(branch ? { branch } : {}) }
			: null,
		pane: { mux: 'tmux', id: `%${id}` },
		status: 'active',
		createdAt: ts,
		lastSeen: ts,
		...rest,
	}
	store.putAgent(rec)
	return rec
}

function deps(over: Partial<JumpDeps> = {}): JumpDeps {
	return {
		store,
		selfId: undefined,
		cwd: work,
		exec: (cmd, args) => (cmd === 'git' ? (git[args.join(' ')] ?? null) : null),
		focus: (pane) => {
			focused.push(pane)
		},
		paneAlive: (pane) => alive.has(`${pane.mux}:${pane.id}`),
		back: () => {
			backs++
			return { from: '%self', to: '%a', skipped: [] }
		},
		...over,
	}
}

const run = (req: JumpRequest | string, over: Partial<JumpDeps> = {}) =>
	jump(deps(over), typeof req === 'string' ? { target: req, branches: [] } : req)

describe('jump: a bare word', () => {
	it('focuses the one live unit whose id, handle, branch, or repo name equals the word', () => {
		unit('a1', { repo: 'color-map', branch: 'feat/x' })
		unit('b2', { repo: 'cyber-truss', handle: 'reviewer' })
		expect(run('a1')).toEqual({ result: 'jumped', id: 'a1', handle: 'h-a1', pane: '%a1' })
		expect(run('reviewer')).toMatchObject({ result: 'jumped', id: 'b2' })
		expect(run('feat/x')).toMatchObject({ result: 'jumped', id: 'a1' })
		expect(run('cyber-truss')).toMatchObject({ result: 'jumped', id: 'b2' })
		expect(focused).toEqual(['%a1', '%b2', '%a1', '%b2'])
	})

	it('reads the repo name from cwd when the unit has no primaryRoot', () => {
		unit('c3', { cwd: join(work, 'loose-repo') })
		expect(run('loose-repo')).toMatchObject({ result: 'jumped', id: 'c3' })
	})

	it('returns candidates and focuses nothing when more than one unit matches', () => {
		unit('a1', { repo: 'cyber-truss', branch: 'one' })
		unit('a2', { repo: 'cyber-truss', branch: 'two' })
		unit('a3', { repo: 'cyber-truss' })
		expect(run('cyber-truss')).toEqual({
			result: 'candidates',
			units: [
				{ id: 'a1', handle: 'h-a1', branch: 'one', repo: 'cyber-truss' },
				{ id: 'a2', handle: 'h-a2', branch: 'two', repo: 'cyber-truss' },
				{ id: 'a3', handle: 'h-a3', repo: 'cyber-truss' },
			],
		})
		expect(focused).toEqual([])
	})

	it('counts a match in any field, so a handle shared with another unit returns candidates', () => {
		unit('a1', { handle: 'pod' })
		unit('a2', { handle: 'pod' })
		expect(run('pod')).toMatchObject({ result: 'candidates' })
		expect(focused).toEqual([])
	})

	it('leaves the caller out, jumping to the one other unit when the caller also matched', () => {
		unit('me', { repo: 'cyberfleet' })
		unit('pod', { repo: 'cyberfleet' })
		expect(run('cyberfleet', { selfId: 'me' })).toMatchObject({ result: 'jumped', id: 'pod' })
		expect(focused).toEqual(['%pod'])
	})

	it('never lists the caller among the candidates', () => {
		unit('me', { repo: 'cyberfleet' })
		unit('p1', { repo: 'cyberfleet' })
		unit('p2', { repo: 'cyberfleet' })
		const out = run('cyberfleet', { selfId: 'me' })
		expect(out).toMatchObject({ result: 'candidates' })
		expect(out.result === 'candidates' && out.units.map((u) => u.id)).toEqual(['p1', 'p2'])
	})

	it('fails rather than focusing the caller when only the caller matches', () => {
		unit('me', { repo: 'cyberfleet' })
		expect(() => run('cyberfleet', { selfId: 'me' })).toThrow(/only this session/)
		expect(() => run('me', { selfId: 'me' })).toThrow(/only this session/)
		expect(focused).toEqual([])
	})

	it('ignores exited units and non-session records', () => {
		unit('gone', { repo: 'cyberfleet', status: 'exited' })
		unit('owner', { handle: 'cyberfleet', kind: 'standing', pane: null })
		unit('live', { repo: 'cyberfleet' })
		expect(run('cyberfleet')).toMatchObject({ result: 'jumped', id: 'live' })
	})

	it('fails naming the unit when the one match has no known pane', () => {
		unit('a1', { repo: 'color-map', pane: null })
		expect(() => run('color-map')).toThrow(/a1.*no known session pane/)
	})
})

describe('jump: prose', () => {
	it('returns the live units, without the caller, when nothing matches exactly', () => {
		unit('me', { repo: 'cyberfleet' })
		unit('a1', { repo: 'color-map', branch: 'feat/x', brief: '/briefs/a1.md' })
		unit('a2', { cwd: join(work, 'loose') })
		expect(run('the auth refactor', { selfId: 'me' })).toEqual({
			result: 'prose',
			words: 'the auth refactor',
			units: [
				{ id: 'a1', handle: 'h-a1', branch: 'feat/x', repo: 'color-map', brief: '/briefs/a1.md' },
				{ id: 'a2', handle: 'h-a2', repo: 'loose' },
			],
		})
		expect(focused).toEqual([])
	})
})

describe('jump: a task ref', () => {
	it('reads #123 and 123 as a task in the caller’s own repo, with owner/repo from its origin', () => {
		git[`-C ${work} rev-parse --path-format=absolute --git-common-dir`] = join(work, 'cyberfleet', '.git')
		git[`-C ${join(work, 'cyberfleet')} remote get-url origin`] = 'git@github.com:cyberuni/cyberfleet.git'
		const task = { result: 'task', repo: 'cyberfleet', slug: 'cyberuni/cyberfleet', number: 123 }
		expect(run('#123')).toEqual(task)
		expect(run('123')).toEqual(task)
		expect(focused).toEqual([])
	})

	it('reads <repo>#123 from the checkouts of the live units in that repo', () => {
		unit('a1', { repo: 'color-map' })
		unit('a2', { repo: 'color-map' })
		git[`-C ${join(work, 'color-map')} remote get-url origin`] = 'https://github.com/cyberuni/color-map.git'
		expect(run('color-map#123')).toEqual({
			result: 'task',
			repo: 'color-map',
			slug: 'cyberuni/color-map',
			number: 123,
		})
	})

	it('fails naming the repo when no live unit is in it', () => {
		expect(() => run('color-map#123')).toThrow(/color-map/)
	})

	it('fails listing the checkouts when their origins disagree', () => {
		unit('a1', { repo: 'color-map' })
		unit('a2', { cwd: join(work, 'other', 'color-map') })
		git[`-C ${join(work, 'color-map')} remote get-url origin`] = 'https://github.com/a/color-map'
		git[`-C ${join(work, 'other', 'color-map')} remote get-url origin`] = 'https://github.com/b/color-map'
		expect(() => run('color-map#123')).toThrow(/a\/color-map.*b\/color-map/s)
	})

	it('fails when the checkout has no origin remote', () => {
		unit('a1', { repo: 'color-map' })
		expect(() => run('color-map#123')).toThrow(/origin/)
	})
})

describe('jump: --repo with --branch and --mentions', () => {
	const req = (r: Partial<JumpRequest>): JumpRequest => ({ branches: [], ...r })

	it('focuses the one live unit in the repo on any of the branches', () => {
		unit('a1', { repo: 'color-map', branch: 'feat/x' })
		unit('a2', { repo: 'other', branch: 'feat/y' })
		expect(run(req({ repo: 'color-map', branches: ['feat/y', 'feat/x'] }))).toMatchObject({
			result: 'jumped',
			id: 'a1',
		})
	})

	it('with --repo alone, matches any live unit in the repo', () => {
		unit('a1', { repo: 'color-map' })
		unit('a2', { repo: 'other' })
		expect(run(req({ repo: 'color-map' }))).toMatchObject({ result: 'jumped', id: 'a1' })
	})

	it('fails naming the selector when no unit is on the branches and there is no --mentions', () => {
		unit('a1', { repo: 'color-map', branch: 'main' })
		expect(() => run(req({ repo: 'color-map', branches: ['feat/x'] }))).toThrow(
			/no live unit matches --repo color-map --branch feat\/x/,
		)
	})

	it('returns candidates when units sit on more than one of the branches', () => {
		unit('a1', { repo: 'color-map', branch: 'feat/x' })
		unit('a2', { repo: 'color-map', branch: 'feat/y' })
		expect(run(req({ repo: 'color-map', branches: ['feat/x', 'feat/y'] }))).toMatchObject({
			result: 'candidates',
		})
		expect(focused).toEqual([])
	})

	it('falls back to a unit whose handle ends in -<n> when no branch has a live unit', () => {
		unit('a1', { repo: 'color-map', handle: 'pod-color-map-123', branch: 'other' })
		unit('a2', { repo: 'color-map', handle: 'pod-color-map-1234' })
		expect(run(req({ repo: 'color-map', branches: ['feat/x'], mentions: 123 }))).toMatchObject({
			result: 'jumped',
			id: 'a1',
		})
	})

	it('falls back to a unit whose brief names #<n>, <repo>#<n>, /issues/<n>, or /pull/<n>', () => {
		const brief = (id: string, text: string) => {
			const path = join(work, `${id}.md`)
			writeFileSync(path, text)
			return path
		}
		for (const [i, text] of ['Fix #123 now', 'see color-map#123', 'x/issues/123', 'x/pull/123'].entries()) {
			if (i > 0) store.removeAgent(`m${i - 1}`)
			unit(`m${i}`, { repo: 'color-map', brief: brief(`m${i}`, text) })
			unit('noise', { repo: 'color-map', brief: brief('noise', 'Fix #1234 and /pull/12') })
			expect(run(req({ repo: 'color-map', mentions: 123 })), text).toMatchObject({ result: 'jumped', id: `m${i}` })
		}
	})

	it('reads a brief from the hub when the record carries no brief path', () => {
		mkdirSync(join(store.root, 'data', 'a1'), { recursive: true })
		unit('a1', { repo: 'color-map' })
		store.writeBrief('a1', 'Implement #123')
		unit('a2', { repo: 'color-map' })
		expect(run(req({ repo: 'color-map', mentions: 123 }))).toMatchObject({ result: 'jumped', id: 'a1' })
	})

	it('does not fall back while a branch has a live unit', () => {
		unit('a1', { repo: 'color-map', branch: 'feat/x' })
		unit('a2', { repo: 'color-map', handle: 'pod-123' })
		expect(run(req({ repo: 'color-map', branches: ['feat/x'], mentions: 123 }))).toMatchObject({ id: 'a1' })
	})

	it('returns candidates when more than one unit names the number', () => {
		unit('a1', { repo: 'color-map', handle: 'one-123' })
		unit('a2', { repo: 'color-map', handle: 'two-123' })
		expect(run(req({ repo: 'color-map', mentions: 123 }))).toMatchObject({ result: 'candidates' })
	})

	it('fails naming the repo, branches, and number when nothing matches', () => {
		unit('a1', { repo: 'color-map' })
		expect(() => run(req({ repo: 'color-map', branches: ['feat/x'], mentions: 123 }))).toThrow(
			/color-map.*feat\/x.*#123/,
		)
	})

	it('leaves the caller out of the branch match and falls back past it', () => {
		unit('me', { repo: 'color-map', branch: 'feat/x' })
		unit('a1', { repo: 'color-map', handle: 'pod-123' })
		expect(run(req({ repo: 'color-map', branches: ['feat/x'], mentions: 123 }), { selfId: 'me' })).toMatchObject({
			id: 'a1',
		})
	})
})

describe('jump: back', () => {
	it('follows the jump history and names the unit in the pane it lands on', () => {
		unit('a', { pane: { mux: 'tmux', id: '%a' } })
		store.putPaneIndex('%a', 'a')
		expect(run('back')).toEqual({ result: 'jumped', id: 'a', handle: 'h-a', pane: '%a', from: '%self' })
		expect(backs).toBe(1)
		expect(focused).toEqual([])
	})

	it('reports only the pane when no unit lives there', () => {
		expect(run('back')).toEqual({ result: 'jumped', pane: '%a', from: '%self' })
	})
})

describe('jump: a message id', () => {
	const MSG = '1791701431577-733fbf'

	function mail(
		from: AgentRecord | { id: string; handle: string },
		to = 'standing-operator',
		read = false,
		extra: { origin?: MessageOrigin; blocked?: true } = {},
	) {
		const ts = 1791701431577
		if (!store.getAgent(to)) unit(to, { kind: 'standing', handle: 'operator', pane: null })
		store.putMessage(to, {
			...extra,
			id: MSG,
			from: from.id,
			fromHandle: from.handle,
			to,
			subject: 'held on Q1-Q3',
			body: 'waiting on the Council',
			ts,
			sentAt: new Date(ts).toISOString(),
		})
		if (read) store.ackMessage(to, MSG)
	}

	it('focuses the pane of the unit that sent the message, from any mailbox, read or unread', () => {
		const sender = unit('s1', { repo: 'color-map', branch: 'feat/x' })
		unit('other', { repo: 'color-map', branch: 'feat/y' })
		mail(sender, 'standing-operator', true)
		expect(run(MSG)).toEqual({ result: 'jumped', id: 's1', handle: 'h-s1', pane: '%s1', message: MSG })
		expect(focused).toEqual(['%s1'])
	})

	it('names the repo and branch, and focuses nothing, when the sender has exited', () => {
		const sender = unit('s1', { repo: 'color-map', branch: 'feat/x', status: 'exited' })
		mail(sender)
		expect(run(MSG)).toEqual({
			result: 'closed',
			message: MSG,
			id: 's1',
			handle: 'h-s1',
			repo: 'color-map',
			branch: 'feat/x',
			dir: join(work, 'wt', 's1'),
		})
		expect(focused).toEqual([])
	})

	it('reports closed when the live sender has no known pane', () => {
		const sender = unit('s1', { repo: 'color-map', pane: null })
		mail(sender)
		expect(run(MSG)).toMatchObject({ result: 'closed', id: 's1', repo: 'color-map' })
		expect(focused).toEqual([])
	})

	it("says the sender's record is gone when it was pruned, naming the handle the message carries", () => {
		mail({ id: 'gone', handle: 'pod-192' })
		expect(() => run(MSG)).toThrow(/pod-192.*no record/)
	})

	it('refuses to focus the caller when the caller sent the message', () => {
		const sender = unit('me', { repo: 'color-map' })
		mail(sender)
		expect(() => run(MSG, { selfId: 'me' })).toThrow(/this session/)
	})

	describe('with the origin the message records (cyberlegion#302)', () => {
		const ORIGIN: MessageOrigin = {
			pane: { mux: 'tmux', id: '%9', session: 'fleet' },
			repo: '/src/color-map',
			worktree: '/src/color-map.worktrees/pod-192',
			branch: 'feat/x',
		}
		const pruned = { id: 'gone', handle: 'pod-192' }

		it("focuses the origin's pane while it is open, even after the sender's record is pruned", () => {
			alive.add('tmux:%9')
			mail(pruned, 'standing-operator', false, { origin: ORIGIN })
			expect(run(MSG)).toEqual({ result: 'jumped', id: 'gone', handle: 'pod-192', pane: '%9', message: MSG })
			expect(focused).toEqual(['%9'])
		})

		it("prefers the origin's pane to the pane on the sender's live record", () => {
			alive.add('tmux:%9')
			const sender = unit('s1', { repo: 'color-map' })
			mail(sender, 'standing-operator', false, { origin: ORIGIN })
			expect(run(MSG)).toMatchObject({ result: 'jumped', id: 's1', pane: '%9' })
			expect(focused).toEqual(['%9'])
		})

		it("falls back to the live record's pane when the origin's pane has closed", () => {
			const sender = unit('s1', { repo: 'color-map' })
			mail(sender, 'standing-operator', false, { origin: ORIGIN })
			expect(run(MSG)).toMatchObject({ result: 'jumped', id: 's1', pane: '%s1' })
			expect(focused).toEqual(['%s1'])
		})

		it("names the origin's repo, branch, and worktree when its pane has closed and the record is gone", () => {
			mail(pruned, 'standing-operator', false, { origin: ORIGIN })
			expect(run(MSG)).toEqual({
				result: 'closed',
				message: MSG,
				id: 'gone',
				handle: 'pod-192',
				repo: 'color-map',
				branch: 'feat/x',
				dir: '/src/color-map.worktrees/pod-192',
			})
			expect(focused).toEqual([])
		})

		it("names the origin's checkout over the record's when the sender has exited", () => {
			alive.add('tmux:%9')
			const sender = unit('s1', { repo: 'other-repo', branch: 'feat/later', status: 'exited' })
			mail(sender, 'standing-operator', false, { origin: ORIGIN })
			expect(run(MSG)).toMatchObject({ result: 'closed', repo: 'color-map', branch: 'feat/x' })
			expect(focused).toEqual([])
		})

		it('does not focus an origin pane the hub now gives to another unit', () => {
			alive.add('tmux:%9')
			unit('newcomer', { pane: { mux: 'tmux', id: '%9' } })
			store.putPaneIndex('%9', 'newcomer')
			mail(pruned, 'standing-operator', false, { origin: ORIGIN })
			expect(run(MSG)).toMatchObject({ result: 'closed', repo: 'color-map' })
			expect(focused).toEqual([])
		})

		it("refuses to focus the caller's own pane", () => {
			alive.add('tmux:%9')
			store.putPaneIndex('%9', 'me')
			mail(pruned, 'standing-operator', false, { origin: ORIGIN })
			expect(() => run(MSG, { selfId: 'me' })).toThrow(/this session/)
		})

		it('still says the location is unknown when the origin holds only a closed pane and the record is gone', () => {
			mail(pruned, 'standing-operator', false, { origin: { pane: { mux: 'tmux', id: '%9' } } })
			expect(() => run(MSG)).toThrow(/pod-192.*no record/)
		})

		it('marks a message whose sender is blocked on the reader', () => {
			alive.add('tmux:%9')
			mail(pruned, 'standing-operator', false, { origin: ORIGIN, blocked: true })
			expect(run(MSG)).toMatchObject({ result: 'jumped', blocked: true })
		})
	})

	it('errors on a message id no mailbox holds', () => {
		unit('s1')
		expect(() => run(MSG)).toThrow(/no message 1791701431577-733fbf/)
	})
})

describe('jump: arguments', () => {
	it('refuses a target combined with --repo, and --branch or --mentions without --repo', () => {
		expect(() => run({ target: 'x', repo: 'r', branches: [] })).toThrow(/not both/)
		expect(() => run({ branches: ['b'] })).toThrow(/--repo/)
		expect(() => run({ branches: [], mentions: 1 })).toThrow(/--repo/)
		expect(() => run({ branches: [] })).toThrow(/target/)
	})
})

describe('jump: toon output', () => {
	it('opens with the result kind, then its fields or its units', () => {
		expect(jumpToon({ result: 'jumped', id: 'a1', handle: 'pod', pane: '%1' })).toBe(
			'result: jumped\nid: a1\nhandle: pod\npane: %1',
		)
		expect(
			jumpToon({ result: 'prose', words: 'auth', units: [{ id: 'a1', handle: 'pod', repo: 'r', brief: '/b.md' }] }),
		).toBe(
			'result: prose\nwords: auth\nunits[1]{id,handle,branch,repo,brief}:\n  a1,pod,-,r,/b.md\n1 live units — no exact match, nothing focused',
		)
	})

	it('renders closed as its fields', () => {
		expect(
			jumpToon({ result: 'closed', message: 'm', id: 'a1', handle: 'pod', repo: 'r', branch: 'b', dir: '/w' }),
		).toBe('result: closed\nmessage: m\nid: a1\nhandle: pod\nrepo: r\nbranch: b\ndir: /w')
	})
})
