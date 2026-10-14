---
title: Operator
description: "The Council's interface to the fleet: answers questions, and relays work to the right ship's Captain."
---

Part of the [cyberfleet plugin](/cyberfleet/overview/). See that page for install instructions.

**Trigger:** invoked for fleet-level dispatch: spawning, listing, and pruning ships, and routing messages between sessions. Invoking the skill connects your session to the command center, wherever you invoke it. Not for in-ship mission work (that's the [Pod](/cyberfleet/pod/)).

The **Operator** is your interface to the fleet. It talks with you, and with no one else.

## In the design

- **One seat.** The Operator sits on the Command Center's Dashboard. The session in that seat need not stay running; you start it when you want to talk.
- **Answers questions itself.** It reads `cyberfleet missions`, `gh`, and channels, and never wakes a Captain to answer a question.
- **Relays work up.** It posts your words, verbatim, to the target ship's address channel and rings that ship's Captain, which starts the Captain if it is not running.
- **Coordinates nothing.** It never spawns a Pod and never lands a pull request. Planning belongs to the [Captain](/cyberfleet/captain/), and landing to the [Coordinator](/cyberfleet/coordinator/).
- **Calling takes over nothing.** Invoking `/operator` outside the Operator's seat reaches the one Operator. It never makes the calling session an Operator.

The full path a request travels is in [lifecycle](/cyberfleet/design/lifecycle/).

## What ships today

The Captain and the Coordinator are not shipped, so the shipped `operator` skill also does their work:

- Spawns every ship: your first, a new peer session, or a parallel worktree-ship on a project that's already a ship. Pod never spawns.
- Lists the live ships and, via `cyberfleet missions`, which need the Council's hands: ships × mission × gate × leash, derived from [SDD](https://cyberuni.github.io/cyber-sdd/sdd/overview/) state.
- Watches the ships it spawns and lands their work. Each ship opens a pull request and reports back
  to the session that spawned it, not to whichever session opened Operator most recently.
  When it dispatches, Operator tells you it will merge each of those pull requests once it is clean
  (the ship reported it done, it has no merge conflict, no review is blocking it, and CI is green on
  the merged result), and asks you to reply. Your reply is what lets it merge them without asking you
  again. The order to dispatch alone does not, and neither does Claude Code auto mode, which
  blocks a merge you did not ask for in your own words. Until you reply, a clean pull request waits for
  you to approve that merge. A merge the harness refuses waits for you too; Operator never retries it
  or works around it. Anything short of clean waits for you.
- Orchestrates several ships on one order: merges their work in dependency order, and after each
  merge tells the ships still open to rebase, adapt to what landed, and re-verify.
- Keeps one holder of the command center. The standing `operator` is a single long-lived session
  working from its home (`~/code`, say). A session you open Operator in takes that claim only when
  nobody holds it, so dispatching from inside a project never pulls the command center away, and
  only the holder reads and clears the command center's mailbox. Register the `operator` owner with
  a home (`--home`) so that, once your `cyberlegion` release supports it, mail arriving with no
  holder spawns one there.
- Routes messages between ships and sweeps away the dead ones.
- Relays what the Council decided, never an approval of its own: the ship receives your own words
  (just "Approve", or your sentence nearly verbatim) with nothing added, and Operator records your
  words, who relayed them, and what they cover on the work's thread. Operator can pass on no more
  authority than it holds, so it cannot tell a ship that a merge is approved. The merge authority your
  reply gives it stays with Operator; a ship never merges its own work on that authority. A ship's Pod
  merges only when you answer, in its own session, the merge offer it made itself.

The headless counterpart, the `headless-operator` subagent, runs the same dispatch loop unattended.

## Related

- [Captain](/cyberfleet/captain/): the ship role the Operator relays work to
- [Authority](/cyberfleet/design/authority/): how your words reach the automaton that acts
- [cyberfleet Overview](/cyberfleet/overview/)
