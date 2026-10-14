---
title: Captain
description: "The high-tier automaton that owns a ship's work: takes issues in, plans, spawns and directs Pods, and rules on escalations. Not shipped yet."
---

Part of the [cyberfleet plugin](/cyberfleet/overview/). See that page for install instructions.

:::note[Not shipped yet]
Only the Captain's ownership record ships today: `cyberfleet captain`, `cyberfleet pods`, and `cyberfleet pod bind|retire`. The persona that uses them is not shipped. Until it is, the [Operator](/cyberfleet/operator/) spawns Pods and lands their work.
:::

The **Captain** owns a ship's work. There is one per ship, in the left pane of its Bridge, and one for the fleet, on the Command Center's Flag Bridge. It runs on the high model tier because each of its turns is a decision.

## What it does

- **Takes work in.** The Operator relays your request to the ship's address channel and rings the Captain. The Captain judges its freshness, priority, and scope, and takes the issue in. That starts the sortie. Anyone may file an issue; only the Captain takes one in.
- **Plans and spawns.** It splits the sortie into lines of work, picks each Pod's tier, and spawns each Pod into its own worktree. It never works inside a Pod.
- **Owns its Pods through the role.** Whichever session holds the Captain's lease owns every Pod of the ship. Binding and retiring a Pod are fenced by the lease generation, so a session that lost its lease cannot act as Captain. The rules are in [Pod ownership](/cyberfleet/design/model/#pod-ownership).
- **Rules on escalations.** A Pod at the edge of its brief, or a Coordinator facing a judgment call, escalates to the Captain. A ruling never overrides red CI.
- **Reviews what landed.** When the Coordinator's queue settles, the Captain closes the issues that are done, reopens one that needs a follow-up, and files new issues for work the request did not cover.
- **Works within your grants.** When a step needs your words and has none, the Captain moves everything else forward and batches its decision-requests for you. It re-relays a grant you already gave, verbatim, to a unit that started after you spoke. See [authority](/cyberfleet/design/authority/).

The fleet's Captain makes the roadmap and cross-ship decisions. A Captain's home is the project's main checkout; sortie work never happens there.

You start a Captain by invoking `/captain` in its own pane. Invoking it anywhere else calls the existing Captain and never makes the calling session one.

## Related

- [Coordinator](/cyberfleet/coordinator/): does the Captain's mechanics
- [Pod](/cyberfleet/pod/): the workers the Captain owns
- [Lifecycle](/cyberfleet/design/lifecycle/): one sortie, end to end
- [cyberfleet Overview](/cyberfleet/overview/)
