---
title: Captain
description: The resident automaton of a project — spawns its Pods, gates and merges their work, and retires them.
---

Part of the [cyberfleet plugin](/cyberfleet/overview/) — see that page for install instructions.

**Trigger:** invoked to act as a project's resident Captain — take or contact the project's one Captain, spawn its Pods into their own worktrees, watch and merge their work, and retire them. Not for working a mission inside a Pod (that's the [Pod](/cyberfleet/pod/)), and not for reaching another project (that's the [Operator](/cyberfleet/operator/)).

The **Captain** is the one resident automaton of a project. A **ship** is a project, and its home is the default checkout. The Captain works from there and never edits a sortie in it. See [ADR-0023](https://github.com/cyberuni/cyberfleet/blob/main/docs/adr/0023-captain-mission-sortie.md) for the model.

## What it does

- Is the project's single Captain: cyberlegion's `captain` project service. `cyberfleet captain` shows who holds it, its home, its health, and its lease generation. Starting it from two places launches it once, and a healthy Captain is never replaced by a caller.
- Spawns each Pod into its own worktree and records itself as that Pod's one owner with `cyberfleet pod bind`. The Pod's brief names the Captain's handle as its return address.
- Announces merges to the Council, gates each pull request on a clean bar, merges in dependency order, and retires each Pod once with `cyberfleet pod retire`.
- Checks its lease generation (`cyberlegion service verify`) before every claim, merge, Pod record, and retirement. A Captain that a newer one replaced stops instead of acting.
- Keeps Pods it can no longer vouch for visible. `cyberfleet pods` lists each Pod's owner state (current, unavailable, orphaned, or retired) and whether it is live. Recovery is restarting the same Captain with `cyberlegion unit restart`, or an explicit `cyberfleet pod adopt` by a newer Captain.
- Relays no approval of its own. Council words reach a Pod as they were given, never widened.

## Related

- [Pod](/cyberfleet/pod/) — the Captain's crew on one sortie, in its own worktree
- [Operator](/cyberfleet/operator/) — hands project work to the Captain without taking it over
- [cyberfleet Overview](/cyberfleet/overview/)
