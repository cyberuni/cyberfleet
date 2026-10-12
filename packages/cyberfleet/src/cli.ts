#!/usr/bin/env node
import { readFileSync } from 'node:fs'
import { Command, Option } from 'commander'
import {
	type AgentRecord,
	emit,
	FileStore,
	type Format,
	type IdContext,
	listAgents,
	realExec,
	resolveAgent,
	resolveRoot,
	resolveSelfId,
	selectSessionAdapter,
	toonList,
	toonObject,
	touch,
} from 'cyberlegion'
import { adoptPod, bindPod, listPods, type PodAct, retirePod, showCaptain } from './captain.ts'
import { buildMissions, resolveAgentsRoot } from './missions.ts'

// cyberfleet — the fleet layer on top of cyberlegion's mechanism. It carries ONLY fleet-specific
// logic: `missions` (the SDD-derived mission view), `jump` (session
// focus), `pause` (a status-only marker), and the `gate approve` stub. The mechanism verbs
// (register/who/send/inbox/read/ack/spawn/prune/decommission/install) are NOT re-exposed here — they
// live in the `cyberlegion` CLI, which cyberfleet depends up on. A fleet persona runs those directly
// (`cyberlegion unit register`, `cyberlegion mail send`, `cyberlegion unit spawn`, …).

interface RootOpts {
	root?: string
	space?: string
	format?: string
}

function ctxOf(opts: RootOpts): IdContext {
	const store = new FileStore(resolveRoot({ root: opts.root, space: opts.space }))
	return { store, env: process.env }
}

function formatOf(opts: RootOpts): Format {
	return opts.format === 'json' ? 'json' : 'toon'
}

/**
 * Pause a unit's mission — a cyberfleet-level marker on its `AgentRecord.status` only. Not
 * exported by cyberlegion (fleet-specific concept), so it stays here — a thin write through the
 * shared `Store` seam. This is NOT a bridge to SDD's `pause-mission` checkpoint (which rewrites the
 * plan brief's todos/## NEXT anchor) — that gap is flagged, not silently papered over: a caller who
 * wants the actual mission checkpoint must run `sdd:pause-mission` in-session.
 */
function pauseAgent(ctx: IdContext, id: string): AgentRecord {
	const rec = ctx.store.getAgent(id)
	if (!rec) throw new Error(`no agent "${id}"`)
	rec.status = 'paused'
	ctx.store.putAgent(rec)
	return rec
}

const rootOpts = (cmd: Command) =>
	cmd
		.option('--root <path>', 'cyberlegion hub root (overrides the global hub / $CYBERLEGION_ROOT)')
		.option('--space <path>', 'alias for --root')
		.addOption(new Option('--format <format>', 'output format').choices(['toon', 'json']).default('toon'))

// src/ and dist/ sit at the same depth, and package.json ships, so this resolves from both.
const { version } = JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8')) as { version: string }

const program = new Command()
program
	.name('cyberfleet')
	.description('Fleet layer over cyberlegion — ships, missions, and the Council view')
	.version(version)

rootOpts(program.command('missions'))
	.description("who needs the Council's hands — ships × mission × gate × leash, derived from SDD state")
	.option('--agents-root <path>', 'override the root under which .agents/ is resolved (default: the primary checkout)')
	.action((opts) => {
		const ctx = ctxOf(opts)
		touch(ctx)
		const agentsRoot = opts.agentsRoot ?? resolveAgentsRoot(realExec)
		const agents = listAgents(ctx.store).filter((a) => a.status !== 'exited')
		const rows = buildMissions(agentsRoot, agents)
		emit(formatOf(opts), {
			toon: toonList(
				'missions',
				rows,
				[
					{ key: 'handle', get: (r) => r.handle },
					{ key: 'branch', get: (r) => r.branch ?? '-' },
					{ key: 'status', get: (r) => r.status },
					{
						key: 'mission',
						get: (r) => (r.mission ? `${r.mission.status} ${r.mission.completed}/${r.mission.total}` : '-'),
					},
					{ key: 'spec', get: (r) => r.spec?.status ?? '-' },
					{ key: 'gate:spec', get: (r) => (r.gate.spec ? `${r.gate.spec.verdict}(${r.gate.spec.by})` : '-') },
					{ key: 'gate:impl', get: (r) => (r.gate.impl ? `${r.gate.impl.verdict}(${r.gate.impl.by})` : '-') },
					{ key: 'leash', get: (r) => r.leash ?? '-' },
					{ key: 'council', get: (r) => (r.needsCouncil ? 'yes' : '-') },
					{ key: 'hal', get: (r) => (r.hal ? '!' : '') },
				],
				`${rows.length} ships`,
			),
			json: rows,
		})
	})

rootOpts(program.command('jump'))
	.description("select/focus a ship's session (tmux pane), or print its worktree path to cd into")
	.argument('<peer>', 'handle, id, or worktree branch/CR ref')
	.action((peer, opts) => {
		const ctx = ctxOf(opts)
		touch(ctx)
		const agent = resolveAgent(ctx.store, peer)
		const pane = agent.pane?.id ?? ctx.store.findPaneByAgentId(agent.id)
		if (pane) {
			try {
				selectSessionAdapter(ctx.env ?? process.env).focus(realExec, { id: pane })
				emit(formatOf(opts), { toon: toonObject({ jumped: agent.handle, pane }), json: { jumped: agent.handle, pane } })
				return
			} catch {
				// no live session backend, or the pane is gone — fall through to printing a cd target
			}
		}
		console.log(agent.worktree?.root ?? agent.cwd)
	})

rootOpts(program.command('pause'))
	.description("pause a ship's mission — a cyberfleet-level status marker only (see note)")
	.argument('<peer>', 'handle, id, or worktree branch/CR ref')
	.action((peer, opts) => {
		const ctx = ctxOf(opts)
		const agent = resolveAgent(ctx.store, peer)
		const rec = pauseAgent(ctx, agent.id)
		emit(formatOf(opts), { toon: toonObject({ paused: rec.handle, status: rec.status }), json: rec })
		process.stderr.write(
			'note: this only flips the cyberfleet ship record to status:paused — it is NOT a bridge to ' +
				"SDD's pause-mission checkpoint (which rewrites the plan brief's todos/## NEXT anchor). " +
				'Run `sdd:pause-mission` in-session for the actual mission checkpoint (flagged gap).\n',
		)
	})

rootOpts(program.command('captain'))
	.description(
		"show a project's Captain — its home checkout, owner, generation, and health (read-only; starts nothing)",
	)
	.argument('[project]', 'project key, a path in any of its checkouts, or its unique name (default: here)')
	.action((project, opts) => {
		const ctx = ctxOf(opts)
		const view = showCaptain(ctx, project ?? process.cwd())
		emit(formatOf(opts), { toon: toonObject({ ...view }), json: view })
	})

rootOpts(program.command('pods'))
	.description(
		'list the pods each Captain owns, and where that ownership stands (current/unavailable/orphaned/retired)',
	)
	.argument('[project]', 'project key, a path in any of its checkouts, or its unique name (default: every project)')
	.action((project, opts) => {
		const rows = listPods(ctxOf(opts), project)
		emit(formatOf(opts), {
			toon: toonList(
				'pods',
				rows,
				[
					{ key: 'pod', get: (r) => r.handle ?? r.pod },
					{ key: 'branch', get: (r) => r.branch ?? '-' },
					{ key: 'live', get: (r) => (r.live ? 'yes' : 'no') },
					{ key: 'captain', get: (r) => `${r.captain}@${r.generation}` },
					{ key: 'owner', get: (r) => r.owner },
					{ key: 'mission', get: (r) => r.mission ?? '-' },
				],
				`${rows.length} pods`,
			),
			json: rows,
		})
	})

const podCmd = program
	.command('pod')
	.description("a Captain's record of the pods it owns — every change fenced by its generation")
const podAct = (cmd: Command) =>
	rootOpts(cmd)
		.argument('<pod>', 'the pod unit (handle or id)')
		.requiredOption('--generation <n>', 'the Captain service generation the caller owns (from `cyberfleet captain`)')
		.option('--project <ref>', 'project key, path, or unique name (default: here)')
		.option('--captain <ref>', 'the acting Captain unit (default: this session)')

function actOf(ctx: IdContext, pod: string, opts: { generation: string; project?: string; captain?: string }): PodAct {
	const captain = opts.captain ? resolveAgent(ctx.store, opts.captain).id : resolveSelfId(ctx)
	if (!captain) throw new Error('no session identity — run as a registered unit, or pass --captain')
	const generation = Number(opts.generation)
	if (!Number.isInteger(generation) || generation < 0) throw new Error('--generation must be a non-negative integer')
	return { project: opts.project ?? process.cwd(), captain, generation, pod: resolveAgent(ctx.store, pod).id }
}

podAct(podCmd.command('bind'))
	.description('record this Captain as the one owner of a pod in its own project worktree')
	.option('--mission <ref>', 'the mission the pod runs')
	.action((pod, opts) => {
		const ctx = ctxOf(opts)
		const binding = bindPod(ctx, { ...actOf(ctx, pod, opts), ...(opts.mission ? { mission: opts.mission } : {}) })
		emit(formatOf(opts), { toon: toonObject({ ...binding, previous: undefined }), json: binding })
	})

podAct(podCmd.command('adopt'))
	.description('explicit recovery: take over a pod whose Captain generation was replaced')
	.action((pod, opts) => {
		const ctx = ctxOf(opts)
		const binding = adoptPod(ctx, actOf(ctx, pod, opts))
		emit(formatOf(opts), { toon: toonObject({ ...binding, previous: undefined }), json: binding })
	})

podAct(podCmd.command('retire'))
	.description('retire a pod once — only its current owner can; close its unit separately')
	.action((pod, opts) => {
		const ctx = ctxOf(opts)
		const binding = retirePod(ctx, actOf(ctx, pod, opts))
		emit(formatOf(opts), { toon: toonObject({ ...binding, previous: undefined }), json: binding })
	})

const gateCmd = program.command('gate').description('SDD gate operations')
rootOpts(gateCmd.command('approve'))
	.description('Council ratification of a gate — STUBBED, not safely relayable through this CLI (see note)')
	.argument('<cr>', 'CR ref')
	.argument('<gateName>', 'spec | impl')
	.action((cr, gateName, _opts) => {
		if (gateName !== 'spec' && gateName !== 'impl') throw new Error('<gateName> must be spec | impl')
		const by =
			process.env.SDD_HANDLE ??
			realExec('git', ['config', 'user.name']) ??
			realExec('git', ['log', '-1', '--format=%an'])
		const wouldWrite = { kind: 'gate', cr, gate: gateName, verdict: 'approve', by: by ?? '<unknown>' }
		process.stderr.write(
			'cyberfleet gate approve is NOT implemented — a human ratification into the SDD ledger cannot ' +
				'be safely relayed through this CLI without running in-session with the SDD schema in force ' +
				'(the relayed-ratification seam). It would have written:\n  ' +
				`${JSON.stringify(wouldWrite)}\n` +
				'Ratify this gate via the SDD spec-gate skill, in-session, instead. Flagging for the Council.\n',
		)
		process.exitCode = 1
	})

program.parseAsync(process.argv).catch((err: unknown) => {
	process.stderr.write(`${err instanceof Error ? err.message : String(err)}\n`)
	process.exit(1)
})
