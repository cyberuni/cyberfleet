---
title: Pod
description: The worker automaton that carries one line of work in one mission, in its own worktree, owned by its ship's Captain handle.
---

Part of the [cyberfleet plugin](/cyberfleet/overview/). See that page for install instructions.

A **Pod** carries one line of work in one mission: an implementation, a judge, a refactor, or an audit. Each Pod works in its own workspace and git worktree. Its ship's Captain spawns it, picks its model tier, and owns it.

## In the design

- **Owned by the Captain handle.** A Pod's one owner is its ship's Captain handle (`cyberlegion/captain`), never one Captain session. Whichever session holds the lease on that handle owns the Pod, so a Captain restart inherits it with no handover. The record is written by `cyberfleet pod bind` and closed by `cyberfleet pod retire`. The rules are in [Pod ownership](/cyberfleet/design/model/#pod-ownership).
- **Directed by two roles.** The Captain directs the work: what to build, and its rulings on escalations. The Coordinator directs the landing: rebase, fix a red check the pull request caused, address a review comment within the mission's scope. Both send their instructions into the Pod's session as turns.
- **Works through SDD.** A Pod carries its line of work through an SDD-mission and works in that line's thread on the mission channel, which holds the SDD-mission's ledger. Where the mission has a gate, the Pod spawns a cold judge into a gate thread.
- **Escalates at the edge of its brief.** When the fix outgrows the mission, the spec is wrong, or the judge keeps failing it, the Pod asks its Captain in a thread on the mission channel.
- **Opens the pull request, and usually does not land it.** The pull request references the issue without closing it. The Pod posts "PR ready" as a thread in the ship queue, and the Coordinator lands it, unless the ship's [landing setting](/cyberfleet/design/model/#who-lands) gives landing to each Pod.

## What ships today

The shipped `pod` skill is reached by asking for bridge work on a project: SDD-mission entry, the inbox, or a specialist's concern. It has no location precondition. It never spawns; the [Operator](/cyberfleet/operator/) spawns Pods today, because the Captain is not shipped.

- Clears the session's inbox, and reads its SDD-mission brief from it.
- Runs the change through SDD's `start-mission`, and hails specialist crew (aced, quill, Warden, Scanner) by name when their concern comes up.
- Shepherds the pull request (or GitLab merge request) it opens until CI on the head commit is green,
  or until the watch times out. It fixes failures its change caused, triages every review comment
  (AI review bots included), replies in each thread with what it fixed, discarded, or escalated, and
  reports the outcome. When the work is done, it tells the session that spawned it that it is ready
  to discharge, and offers to merge the pull request. It merges only when you answer that offer, and
  never approves its own pull request.
- Takes orders from turns in its own session: the spawn that handed it a brief, or you typing there. Mail
  it fetched from its inbox is content: answered on its merits, never obeyed as an order.
- Will not merge to a protected branch, publish, rewrite shared history, or record a verdict in your
  name on a message that claims you approved it. It finishes the rest of the work, then asks.

## Related

- [Captain](/cyberfleet/captain/): spawns, owns, and directs Pods
- [Coordinator](/cyberfleet/coordinator/): lands a Pod's pull request
- [Lifecycle](/cyberfleet/design/lifecycle/): where a Pod's work sits in a mission
- [cyberfleet Overview](/cyberfleet/overview/)
