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

- **Takes work in.** The Operator opens a channel for the mission with your request and mentions the Captain (`cyberlegion/captain`), which starts it if no session is running. If you talk in the Captain's own pane, the Captain opens the channel itself. The Captain judges its freshness, priority, and scope, and takes the issue in. That starts the mission. Anyone may file an issue; only the Captain takes one in.
- **Plans and spawns.** It splits the mission into lines of work and writes the blocking links between them. A command gives it the frontier, the work whose blockers are all closed; the Captain decides what to start, in what order, and at what tier. It spawns each Pod into its own worktree, and each line of work gets a thread on the mission channel. It never works inside a Pod.
- **Owns its Pods through its handle.** A Pod's binding is keyed by the Captain's handle, so whichever session holds the lease on it owns every Pod of the ship. Binding and retiring a Pod are fenced by the lease generation, so a session that lost its lease cannot act as Captain. The rules are in [Pod ownership](/cyberfleet/design/model/#pod-ownership).
- **Rules on escalations.** A Pod at the edge of its brief escalates in a thread on the mission channel; a Coordinator facing a judgment call escalates in the ship queue. The ruling is recorded on the mission it concerns. A ruling never overrides red CI.
- **Reviews what landed.** When the Coordinator reports in the ship queue that its queue has settled, the Captain closes the issues that are done, reopens one that needs a follow-up, files new issues for work the request did not cover, and posts each mission's outcome on its channel for the Operator.
- **Works within your grants.** When a step needs your words and has none, the Captain moves everything else forward and batches its decision-requests for you. It re-relays a grant you already gave, verbatim, to a unit that started after you spoke. See [authority](/cyberfleet/design/authority/).

The fleet's Captain makes the roadmap and cross-ship decisions. A Captain's home is the project's main checkout; mission work never happens there.

You start a Captain by invoking `/captain` in its own pane. Invoking it anywhere else calls the existing Captain and never makes the calling session one.

## Related

- [Coordinator](/cyberfleet/coordinator/): does the Captain's mechanics
- [Pod](/cyberfleet/pod/): the workers the Captain owns
- [Lifecycle](/cyberfleet/design/lifecycle/): one mission, end to end
- [cyberfleet Overview](/cyberfleet/overview/)
