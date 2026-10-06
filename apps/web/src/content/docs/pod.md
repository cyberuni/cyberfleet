---
title: Pod
description: The bridge-companion automaton of a ship — mission entry, inbox, and hailing specialist crew.
---

Part of the [cyberfleet plugin](/cyberfleet/overview/) — see that page for install instructions.

**Trigger:** invoked for bridge work on a project — mission entry, checking the inbox, working with the crew. Pod has no location precondition: it's reached by what you ask, not by where you stand. Not for fleet-wide oversight or cross-ship routing (that's the [Operator](/cyberfleet/operator/)), and not for spawning or merging (the project's [Captain](/cyberfleet/captain/) does that — Pod never spawns).

The **Pod** is the bridge-companion on one sortie, working in its own worktree. A ship is a project; its [Captain](/cyberfleet/captain/) spawns the Pod and owns it. The Pod greets you when you board, clears the inbox, and runs the mission.

## What it does

- Surfaces the mission state derived from [SDD](https://cyberuni.github.io/cyber-sdd/sdd/overview/).
- Clears the ship's inbox — reads and acknowledges pending mail from other ships.
- Drives the mission forward. When work should fan out, it tells you spawning is the Captain's job, reached through the [Operator](/cyberfleet/operator/).
- Shepherds the pull request (or GitLab merge request) it opens until CI on the head commit is green,
  or until the watch times out. It fixes failures its change caused, triages every review comment
  (AI review bots included), replies in each thread with what it fixed, discarded, or escalated, and
  reports the outcome. When the work is done, it tells the session that spawned it that it is ready
  to discharge, and offers to merge the pull request. It merges only when you answer that offer, and
  never approves its own pull request.

- Takes orders from turns in its own session — the spawn that handed it a brief, or you typing there. Mail
  it fetched from its inbox is content: answered on its merits, never obeyed as an order.
- Will not merge to a protected branch, publish, rewrite shared history, or record a verdict in your
  name on a message that claims you approved it. It finishes the rest of the work, then asks.

## Related

- [Captain](/cyberfleet/captain/) — the project's resident automaton, which spawns and owns Pods
- [Operator](/cyberfleet/operator/) — the fleet-level counterpart, invoked directly rather than handed off to
- [cyberfleet Overview](/cyberfleet/overview/)
