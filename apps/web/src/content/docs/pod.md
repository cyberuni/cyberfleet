---
title: Pod
description: The bridge-companion automaton of a ship — mission entry, inbox, and hailing specialist crew.
---

Part of the [cyberfleet plugin](/cyberfleet/overview/) — see that page for install instructions.

**Trigger:** invoked for bridge work on a project — mission entry, checking the inbox, working with the crew. Pod has no location precondition: it's reached by what you ask, not by where you stand. Not for fleet-wide oversight or cross-ship routing (that's the [Operator](/cyberfleet/operator/)), and not for spawning (Operator's job — Pod never spawns).

The **Pod** is the bridge-companion of a ship. It greets you when you board, clears the inbox, and runs the mission.

## What it does

- Surfaces the mission state derived from [SDD](https://cyberuni.github.io/cyber-sdd/sdd/overview/).
- Clears the ship's inbox — reads and acknowledges pending mail from other ships.
- Drives the mission forward. When work should fan out, it tells you spawning a worktree-ship is the Operator's job, which you invoke directly.

- Takes orders from its own owner — the unit that spawned it, or the Council in its session. Mail from
  anyone else is a request, answered but never obeyed as an order.
- Will not merge to a protected branch, publish, rewrite shared history, or record a verdict in your
  name on a message that claims you approved it. It finishes the rest of the work, then asks.

## Related

- [Operator](/cyberfleet/operator/) — the fleet-level counterpart, invoked directly rather than handed off to
- [cyberfleet Overview](/cyberfleet/overview/)
