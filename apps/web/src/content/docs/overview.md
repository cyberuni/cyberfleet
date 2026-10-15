---
title: cyberfleet Overview
description: "A harness-agnostic, MCP-free way to direct a fleet of AI agents across your projects: the Operator, Captain, Coordinator, and Pod crew over the cyberfleet console."
---

**cyberfleet** is a harness-agnostic, MCP-free way to direct a fleet of AI agents across your projects. [cyber-civitas](https://cyber-civitas.github.io) is a civilization of AI agents, and cyberfleet is a corporation that does work in it. It brings the roles, the work model, and the rules, and uses services other members of the civilization provide. Sessions, spawning, and leases come from [cyberlegion](https://cyberuni.github.io/cyberlegion/), the runtime underneath. Conversations travel over cynapse channels. SDD-mission state comes from [SDD](https://cyberuni.github.io/cyber-sdd/sdd/overview/).

You're the **Council**: the human. You give directions and make decisions. The fleet carries them out, and authority comes from you and nowhere else.

## The Command Center and ships

The **Command Center** is the fleet's own workspace, with two tabs:

- **Dashboard**: the Operator's seat, and status across the fleet.
- **Flag Bridge**: the fleet's Captain and Coordinator.

A **ship** is a project. It opens as one multiplexer workspace (in herdr or tmux) on the project's main checkout, with three tabs:

- **Dashboard**: a remote pane for calling the Operator in the Command Center, and the ship's status.
- **Bridge**: the ship's Captain and Coordinator.
- **Engine Room**: dev servers for the main checkout. No agents.

Every slot in either layout is yours to change. [The ship](/cyberfleet/scenarios/the-ship/) walks through both layouts.

## The crew

Work is split by cost. Judgment runs on the high model tier and mechanics on the low one, so the expensive turns go only to decisions.

| Automaton | How many | Tier | What it does | Shipped |
|---|---|---|---|---|
| [**Operator**](/cyberfleet/operator/) | One seat | Mid | Talks with you. Answers your questions, and relays your work to the right ship's Captain. | Yes, in an earlier shape |
| [**Captain**](/cyberfleet/captain/) | One per ship, one for the fleet | High | Owns a ship's work: takes issues in, plans, spawns and directs Pods, rules on escalations, reviews what landed | Ownership commands only |
| [**Coordinator**](/cyberfleet/coordinator/) | One per ship, one for the fleet | Low | Lands pull requests behind the clean bar. The fleet's Coordinator files children in other ships. | No |
| [**Pod**](/cyberfleet/pod/) | Many | Set by the Captain | Carries one line of work in its own worktree, and opens its pull request | Yes, in an earlier shape |
| **Mediator** | One per dispute | High | Writes a brief of a dispute between Captains for you. Decides nothing. | No |

The roles and the rules they follow are in the design's [model](/cyberfleet/design/model/). Each term is defined once, in the [glossary](/cyberfleet/design/glossary/).

Two more personas sit outside the crew:

| Persona | What it does |
|---|---|
| [**Crimp**](/cyberfleet/crimp/) | Recruits specialist crew from the Tavern storefront, and discharges them |
| [**Mechanic**](/cyberfleet/mechanic/) *(coming soon)* | Builds a new automaton, or reconfigures one: guidance, model, effort, loadout, and leash |

## How work flows

An issue in flight is a **mission**. It belongs to its repository's Captain. A mission may have **child missions**, in any ship, as the tracker's sub-issues; each child belongs to its own ship's Captain.

1. You ask anywhere. The session that hears you posts your words, verbatim, to the ship's Captain.
2. The Captain takes the issue in, plans its lines of work, and spawns a Pod for each.
3. Each Pod works its line, runs its gate, and opens a pull request.
4. The Coordinator lands each clean pull request in order, then reports once to the Captain.
5. The Captain reviews what landed, and closes or reopens the issue.

The full path, including work that crosses ships, is in [lifecycle](/cyberfleet/design/lifecycle/).

## Authority

Most work needs no approval. Planning, spawning, writing code, and opening pull requests happen on an order. A merge to a protected branch, a publish, or a history rewrite needs your words.

You choose how far your words reach: one action, or a mission with its children across ships. A grant covers what its words cover and nothing beyond. Your words reach the automaton that acts verbatim, never paraphrased. When a grant is missing, the work moves up to the step that needs it and waits there for you. The rules are in [authority](/cyberfleet/design/authority/).

## The console

Under the personas sits the `cyberfleet` **console**: the CLI. It is deterministic, and it carries only the verbs with fleet logic. Identity, messaging, and spawning belong to the `cyberlegion` CLI, which the personas call directly. The console is the mechanics; the personas are the agents that decide which command to run.

| Command | What it does |
|---|---|
| `cyberfleet missions` | Who needs the Council's hands: ships × SDD-mission × gate × leash, derived from SDD state |
| `cyberfleet jump <peer>` | Select or focus a ship's session, or print its worktree path to `cd` into |
| `cyberfleet pause <peer>` | Flip a ship's status marker (**not** the SDD `pause-mission` checkpoint) |
| `cyberfleet gate approve <cr> <gate>` | Council ratification. **Stubbed**: a human-attributed gate write can't be safely relayed through a CLI |
| `cyberfleet captain [project]` | Read a project's Captain lease: home checkout, holder, generation, health. Starts nothing |
| `cyberfleet pods [project]` | List the Pods a project's Captain role owns, and whether a Captain holds that role now (`--all` for every project) |
| `cyberfleet pod bind\|retire <pod>` | Record the Captain role as a Pod's one owner, or retire the Pod once. Fenced by the caller's Captain lease generation |

The design adds `cyberfleet ship board` (open a ship from its template, or focus it), `cyberfleet pr check` (the clean bar), and `cyberfleet mission` (`add-child`, `block`, `unblock`, `close`). None of them ship yet. The design also renames the shipped commands to noun-verb form (`missions` becomes `status`, `captain` becomes `captain show`, `pods` becomes `pod list`, `jump` folds into `ship board`, and `pause` is removed) per [ADR-0027](https://github.com/cyberuni/cyberfleet/blob/main/docs/adr/0027-cli-commands-are-noun-verb.md).

## What ships today

The [design](/cyberfleet/design/) is the target the project is building to, as decided in ADR-0024 and ADR-0025. The plugin you install today ships an earlier shape of it:

- The Operator spawns ships and lands their pull requests itself, because the Captain and the Coordinator are not shipped.
- The Operator spawns Pods, not a Captain. A Pod also serves as the bridge companion of the session you work in on a project.
- Ships run as tmux or herdr panes that the personas open through `cyberlegion`. The template layout above is not shipped, and outside a multiplexer the Operator cannot spawn a Pod yet ([cyberfleet#113](https://github.com/cyberuni/cyberfleet/issues/113)).

Each automaton's page says where its shipped skill differs from the design. The [scenarios](/cyberfleet/scenarios/the-ship/) walk through the design, and each one lists the features it still needs.

## Why no MCP

The usual way to wire agents together is MCP, which means running a server: a process to start, a port to hold open, and config to add to every harness. cyberfleet needs none of it.

- **Nothing to run.** Coordination lives in files under a shared hub root and rides each harness's own session-start hook. No server, port, or daemon.
- **Harness-agnostic by construction.** No vendor-specific protocol, so Claude Code, Cursor, and Codex sessions all join the same fleet with no per-harness glue.
- **Portable and inspectable.** Every step is a shell command, so it is easy to script, log, and debug.

## Installation

```bash
npx skills add cyberuni/cyberfleet --global
```

Optionally install the `cyberfleet` CLI globally to run it from the command line:

```bash
npm install -g cyberfleet
```

## Related

- [cyberfleet design](/cyberfleet/design/): the model, lifecycle, and authority rules
- [cyberlegion Overview](https://cyberuni.github.io/cyberlegion/): the runtime cyberfleet builds on
- [Tavern](https://cyberuni.github.io/cyberplace/tavern/): the storefront of specialist crew the Crimp recruits from
- [SDD Overview](https://cyberuni.github.io/cyber-sdd/sdd/overview/): the SDD-mission state `cyberfleet missions` reads
