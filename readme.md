# cyberfleet

[![npm version](https://img.shields.io/npm/v/cyberfleet.svg)](https://www.npmjs.com/package/cyberfleet)
[![license: MIT](https://img.shields.io/badge/license-MIT-blue.svg)](license)

A harness-agnostic, MCP-free way to direct a fleet of AI agents across your projects — Claude
Code, Cursor, and Codex, all on one fleet. The fleet layer over
[cyberlegion](https://github.com/cyberuni/cyberlegion): it carries only fleet-specific logic —
ships, missions, and the Council view, derived from SDD state — and depends up on cyberlegion for
every mechanism verb (register, mail, spawn, prune).

## Why

You're the **Council** — the human. You give directions and make decisions; the fleet is
autonomous and carries them out. A **ship** is a workspace: a folder, a repository, or a
worktree; your fleet is all the ships you've enlisted, across one project or many.

## Installation

No install required — run with `npx`:

```sh
npx cyberfleet <command>
```

Or pin to an exact version for reproducible hooks:

```sh
npx cyberfleet@0.0.6 <command>
```

## CLI

```sh
npx cyberfleet missions              # the Council view: ships × mission × gate × leash
npx cyberfleet jump <peer>           # focus a ship's session, or print its worktree path
npx cyberfleet pause <peer>          # flip a ship's status marker
npx cyberfleet gate approve <cr> <gate>  # stubbed — Council ratification can't be relayed via CLI
```

| Option | Description |
| --- | --- |
| `--root <path>` / `--space <path>` | cyberlegion hub root (overrides the global hub / `$CYBERLEGION_ROOT`) |
| `--format <format>` | Output format: `toon` (default) or `json` |

See [`packages/cyberfleet/readme.md`](packages/cyberfleet/readme.md) for the full command
reference.

## Plugin

The npm package's sibling, `plugins/cyberfleet`, ships the agent plugin — the fleet & crew
personas (**Pod**, **Operator**, **Crimp**, **Mechanic**) and the `headless-operator` subagent
for unattended dispatch.

```
/plugin marketplace add cyberuni/cyberfleet
/plugin install cyberfleet
```

## Documentation

Full docs: <https://cyberuni.github.io/cyberfleet>

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) and [AGENTS.md](AGENTS.md).

## License

[MIT](license)
