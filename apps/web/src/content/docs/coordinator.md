---
title: Coordinator
description: The low-tier automaton that lands a ship's pull requests behind the clean bar, and does its Captain's tracker mechanics. Not shipped yet.
---

Part of the [cyberfleet plugin](/cyberfleet/overview/). See that page for install instructions.

:::note[Not shipped yet]
The Coordinator and the `cyberfleet pr check` command it acts on are not shipped. Until they are, the [Operator](/cyberfleet/operator/) lands the pull requests of the ships it spawns.
:::

The **Coordinator** does a Captain's mechanics. There is one per ship, in the right pane of its Bridge, and one for the fleet, on the Command Center's Flag Bridge. It runs on the low model tier because landing is many turns of a check and a command.

## What it does

- **Lands pull requests.** It merges each pull request when `cyberfleet pr check` passes, in rebase order, behind speculative CI and the ship's merge lease. It acts on the command's exit status and never judges "clean enough".
- **Lands only under your words.** It merges under a delegation you gave for a mission and its sub-missions, as your words say, relayed to it verbatim as a turn. A clean pull request with no delegation becomes a decision-request to you, through the Operator.
- **Directs Pods while it lands.** It tells a Pod to rebase, to fix red CI the pull request caused, or to address a review comment within the mission's scope.
- **Escalates judgment.** A change of scope, red that survives the Pod's fixes, or two pull requests that conflict in meaning go to the Captain.
- **Reports once, then exits.** When its count of open pull requests reaches zero, it posts one report of what landed, rings the Captain, and exits.

A ship can give landing to each Pod instead, through its [landing setting](/cyberfleet/design/model/#who-lands). Then no Coordinator starts, and each Pod lands its own pull request under the same bar and lease.

A Coordinator does the tracker mechanics for the Captain whose mission it is: filing an issue in another repository, blocking, unblocking, and closing. The fleet's Coordinator does them for the fleet's Captain, for issues in the fleet's tracker. A mission in another ship that blocks yours stays with that ship's Captain and Coordinator.

## Related

- [Captain](/cyberfleet/captain/): rules on what the Coordinator escalates
- [Landing a pull request](/cyberfleet/scenarios/landing-a-pull-request/): the landing loop, step by step
- [cyberfleet Overview](/cyberfleet/overview/)
