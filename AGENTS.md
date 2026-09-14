# AGENTS.md

This file provides guidance to AI coding assistants when working with code in this repository.

## Skill Augmentations

When reading any `SKILL.md` file, always check whether a `SKILL.local.md` exists in the same directory. If it does, treat its contents as additional instructions that extend the base skill. Local augmentations take precedence over the base skill where they conflict.

## Commit Discipline

**Auto-commit rule:** When a unit of work is complete and verified, commit it immediately — do not wait for the user to ask. Batching multiple units into one commit, or finishing all work before committing, are both violations of this rule.

**Unit of work:** one coherent, independently revertable change — one domain's refactor, one feature, one bugfix, one test suite expansion for one concern, one config change. Never two unrelated concerns in the same commit. A TDD red-green-refactor cycle alone is not a commit boundary; commit when the full intended change is complete and tests pass. If the working tree has unrelated changes, leave them unstaged — commit the current unit first, then continue.

- Conventional Commits: `feat:`, `fix:`, `refactor:`, `test:`, `docs:`, `chore:`
- One concern per commit; never batch unrelated changes
- Stage only files for this unit: `git add <files>`, then verify with `git diff --cached`
- Never use `git add .`, `git add -A`, or `git add -p` (interactive commands agents cannot run)
- Never commit with red tests; run validation commands first

### References

- **`commit-work` skill** — staging, splitting, and message writing when committing
- `npx cyber-skills@<version> governance show skill-repo-structure` — discipline section format rules

## Development Workflow

Before writing any production code, invoke the `test-driven-development` skill. This applies whether coding starts from a user request or from your own initiative after plan approval.

## Design Discussion

Design here is worked out by argument, not by presenting a finished plan. Proposals get
challenged on specifics, and that is the process working.

- **Recommend, don't enumerate.** Open design questions get prose with a clear
  recommendation and its reasoning. A menu of options pushes the thinking back onto the
  reader; multiple-choice prompts are a poor fit for questions still being framed.
- **Concede the specific point, not the whole position.** When a step in your reasoning
  is shown to be wrong, say which step and why, and keep what still stands. Retracting
  wholesale to end a disagreement destroys the useful part of the proposal and hides
  which claim actually failed.
- **Defend what holds.** Agreement that isn't earned is worse than disagreement — if the
  objection doesn't land, say so and explain why.
- **Explain intent when asked, rather than withdrawing.** "Why did you propose that?"
  is a request for the reasoning, not a signal to drop it.
- **Say which frame you are in.** A decision about how the system is *set up* is not a
  decision about how it *runs*. Carrying momentum from one into the other produces
  designs that answer the wrong question — check the frame before generalising a
  solution into an architecture.
- **Mark what is load-bearing.** Separate decisions that are expensive to unwind from
  ones that can be revisited cheaply, and say which is which.
- **Test each rung of a ladder before proposing it.** A layered scheme is only worth
  proposing if each layer catches what you claim; verify rather than assume, since a
  layer that appears to help while laundering the defect is worse than no layer.

## What This Repo Is

`cyberfleet` — the fleet layer over [`cyberlegion`](https://github.com/cyberuni/cyberlegion)'s
harness-agnostic, MCP-free session and messaging mechanism (Claude Code, Cursor, Codex). It ships
as one package that is both the npm CLI and the agent plugin root:

- `packages/cyberfleet/` — the npm package, published as `cyberfleet`, powered by Commander. A
  thin CLI over SDD state: `missions` (the Council view — ships × mission × gate × leash),
  `jump` (session focus), `pause` (a status marker), and `gate approve` (deliberately stubbed —
  human ratification cannot be safely relayed through a CLI). It **depends up** on `cyberlegion`
  for every mechanism verb (register, mail, spawn, prune) rather than re-exposing them.
- the agent plugin, from the same `packages/cyberfleet/` directory: the fleet & crew personas
  (**Pod**, the in-ship bridge-companion; **Operator**, the fleet-level dispatcher; **Crimp**,
  crew recruitment; **Mechanic**, automaton building/tuning), plus the `headless-operator`
  subagent that backs unattended dispatch. Each persona offloads its mechanics to a CLI —
  `cyberlegion` for identity, mail, and spawn; `cyberfleet` for missions — and keeps its voice
  only in what it says around them.

The npm package root doubles as the plugin root, so an installed plugin carries the CLI with it.
The CLI build inlines every runtime dependency (`tsdown.config.ts`), so it runs from a plugin
directory that has no `node_modules`. The CLI is still a deterministic mechanism, and the plugin is the agent-behavior layer built on
top of it (and on `cyberlegion` directly).

It is deliberately **not** an MCP server. Coordination acts on filesystem state under a shared
hub root, through shell commands and skills, not through a remote API or a long-lived process.

### Plugin layout

Everything the plugin needs lives in `packages/cyberfleet/` and must stay listed in that
package's manifests and its `package.json` `files` allowlist, or a client won't discover it.

| Path | Read by |
| --- | --- |
| `.plugin/plugin.json` | cyberuni's canonical universal-plugin source; not published |
| `.codex-plugin/plugin.json` | Codex |
| `skills/<name>/SKILL.md` | All of them (fixed location) |
| `agents/<name>.md` | Claude Code (and any client that reads Agent Plugins subagents) |

`.claude-plugin/marketplace.json` at the **repo root** lists the plugin with a local directory
source (`./packages/cyberfleet`). Version bumps flow from `packages/cyberfleet/package.json`
through `scripts/sync-plugin-version.mjs` on `pnpm version` — add any new manifest to that
script's list.

## Commands

```
pnpm test                        # all package tests
pnpm cf test src/cli.test.ts     # run one test file
pnpm verify                      # lint + build + typecheck + test + knip
pnpm build                       # compile to dist/
pnpm cf dev --help                # run the CLI from source (tsx)
pnpm web dev                     # run the docs site locally
```

`pnpm cf <script>` is the root shortcut for `pnpm run --filter=./packages/cyberfleet <script>`.

## Layout

```
packages/cyberfleet/    the npm package and plugin root — the CLI (src/) plus Pod, Operator,
                        Crimp, Mechanic, and headless-operator (skills/, agents/)
apps/web/               Astro + Starlight docs site, deployed to GitHub Pages
docs/adr/               architecture decision records
.research/              background research dossiers behind ADRs and design decisions
scripts/                repo maintenance scripts
```

## Key Conventions

### Agent-friendly output

The CLI follows the [10 agent-CLI principles](https://github.com/kunchenguid/axi#the-10-principles).
Structured output (`toon` default, `--format json` escape hatch) flows through the primitives
`cyberfleet` imports from `cyberlegion` (`emit`, `toonObject`, `toonList`) rather than
re-implementing formatting locally.

<!-- buddy-agent-harness:begin -->

Skills are canonical in `.agents/skills/` — create and edit them there.
`.claude/skills/` is a generated bridge to it; never write to it directly.
`CLAUDE.md` (and `apps/web/CLAUDE.md`) is a symlink to the `AGENTS.md` beside it, so
shared instructions belong in `AGENTS.md`; editing `CLAUDE.md` edits that file.

<!-- buddy-agent-harness:end -->
