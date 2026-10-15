# Lifecycle

How one piece of work travels from the Council's ask to merged code and a closed issue, and how the
same path stretches when the work spans ships. Roles, places, and rules are in the
[model](./model.md); terms are in the [glossary](../glossary.md).

## One mission, end to end

```mermaid
sequenceDiagram
  participant C as Council
  participant O as Operator
  participant K as Captain
  participant P as Pod
  participant D as Coordinator
  C->>O: ask (any pane)
  O-->>C: questions answered from status, gh, channels
  O->>K: work: the Council's words, verbatim, on the ship address channel, rung
  K->>K: take the issue in (the mission begins), plan the lines of work
  K-->>C: announce the Coordinator lands the work, name the clean bar
  C->>D: reply: the delegation, relayed as a turn
  K->>P: spawn into its own worktree, bind
  P->>P: work the line of work (SDD-mission), run its gate
  P->>D: PR ready (the PR references the issue, never closes it)
  D->>D: pr check, rebase order, speculative CI, merge
  D->>K: queue settled: one report of what landed, then exit
  K->>K: review against the missions: close or reopen the issue, replan
```

### 1. The ask

The Council talks wherever it is: the Operator's seat, a ship's remote pane, a Captain's pane, or
the Coordinator's pane. A question is answered where it lands, from `cyberfleet status`, `gh`, and
channels, without waking a Captain. Work goes up to the target ship's Captain: the session that
received it posts the Council's words verbatim to the ship address channel and rings the Captain,
starting it if it is not running. Talking in the Captain's own pane is a deliberate choice to spend
the high tier.

### 2. The Captain takes it in

The mission begins when the Captain takes the issue in. Taking it in, scoping it, and later closing
or reopening it are writes fenced by the Captain's lease. Anyone may file an issue; only the Captain
decides to take one in.

The Captain plans the mission's lines of work, picks each Pod's tier, and spawns the Pods into
worktrees provisioned through the runtime, binding each to the ship's Captain role. It manages Pods
and never works inside one.

### 3. The delegation

Whoever takes the request announces who will land its pull requests (the ship's Coordinator, or
each Pod under the ship's landing setting), and names the clean bar. The Council's reply is the merge delegation, for the mission and its sub-missions as its words say. It reaches the Coordinator as a
relay, verbatim and as a turn, like any other order. The audit record on the mission channel is not
the delegation: a Coordinator that reads it there is reading content.

### 4. The work

Each Pod carries one line of work, today through an SDD-mission, and reports progress on the
mission channel. Where the mission has a gate, the Pod opens a gate thread and spawns a cold judge
into it; the Captain takes no part, and the outcome posts back to the mission channel.

A Pod that hits the limit of its brief escalates to the Captain in a thread on the mission channel:
the fix outgrows the mission, the spec is wrong, a design choice is beyond its brief, or the judge
keeps failing it. The Captain rules, and the ruling posts back.

### 5. Landing

When its line of work is done, the Pod opens a pull request that references the issue without
closing it, and tells the Coordinator it is ready. The Coordinator counts the open pull requests
of each delegated request, up when a Pod opens one and down when it merges or closes.

The Coordinator lands each pull request when `cyberfleet pr check` passes, in rebase order, behind
speculative CI and its lease (`service verify` before `gh pr merge`). It acts on the command's exit
status and never judges "clean enough". Between events it blocks on a command that returns when
there is news, rather than polling. In a ship whose landing setting gives landing to Pods, each Pod
does the same for its own pull request, under the same lease and the same bar, and no Coordinator
starts.

What goes wrong splits by kind:

| Failure | Handled by |
|---|---|
| A text conflict | The Coordinator tells the Pod to rebase |
| Red CI the pull request caused | The Coordinator tells the Pod to fix it |
| A review comment within the mission's scope | The Coordinator tells the Pod to address it |
| A review asking for a change of scope, red that survives the Pod's fixes, a bisect culprit, two pull requests that conflict in meaning, a stuck Pod | Escalated to the Captain |
| A clean pull request with no delegation in the Coordinator's own session | A decision-request to the Council, through the Operator |

A ruling never overrides red. It settles the question that held the pull request, which then goes
back through the clean bar.

### 6. The review

When the count reaches zero, the queue has settled. The Coordinator posts one report of what landed
to the ship address channel, rings the Captain, and exits. The Captain reviews what merged against
its missions and the project: it closes the issues that are done, reopens one that needs a follow-up
the request covers, files new issues for work the request did not cover, and spawns Pods on work
that became ready. The mission ends when the Captain closes its issue.

This review is the outer loop. It runs once per settled queue, not once per merge, because it is
judgment and judgment runs at the high tier.

## When a mission has sub-missions or dependencies

```mermaid
sequenceDiagram
  participant KA as Captain, ship A
  participant CA as Coordinator, ship A
  participant KB as Captain, ship B
  participant C as Council
  KA->>CA: the dependency for ship B, its issue text
  CA->>KB: file the issue in B, block the mission on it, ring B's Captain
  KB-->>C: accept, decline, or ask the Council
  KA->>KA: keep planning the rest
  KB->>KB: run its mission, under its own delegation
  CA->>KA: release carries the fix: unblock, ring
```

A Captain adds sub-missions to break work down: the mission is done when its sub-missions are done.
Work that needs another ship is a dependency: a mission in that ship that blocks the requesting
mission. A mission belongs to whoever holds its issue.

- **Adding sub-missions.** The Captain decides what they are and checks them against the Council's
  words. A grant on a mission covers its sub-missions in any ship, within its words or a
  pre-approval; a sub-mission that adds work goes back to the Council first. The ship's Coordinator
  executes the tracker changes as commands (`cyberfleet mission add-sub`) and sends an
  underspecified request back rather than filling the gap.
- **Another ship.** A blocking mission in another ship is not covered by the grant on the mission it
  blocks. It needs the Council's words naming it, or a pre-approval such as "any fix #42 needs in
  cyberlegion". The other ship's Captain accepts it as its own mission, declines it, or asks the
  Council, and its merges wait for the Council's words. To grant once over a cross-ship effort,
  make it a mission with sub-missions.
- **Blocks.** The requesting Captain marks its mission blocked on the other ship's issue
  (`cyberfleet mission block --on <issue>`) and keeps planning everything else. The requesting ship's Coordinator lifts the block and rings the waiting Captain,
  usually at the release that carries the fix, because ships consume each other as published
  packages; at the issue's close only when the dependency is consumed from source.
- **Closing.** When a mission's sub-missions have closed, its Captain's Coordinator closes it and
  reports once to the Captain (`cyberfleet mission close`). A blocking mission is closed by its own
  ship's Captain, never by the requesting ship.
- **Disputes.** Two Captains that disagree settle it themselves on a dispute thread: one position
  and one rebuttal each, then standing rules, then a Mediator's brief. A dispute they cannot settle
  escalates to the Council, and only the Council binds two ships.

## Without the Council

Headless runs keep the same split: a headless Captain and a headless Coordinator, never one loop
doing both. A headless Coordinator merges only under a delegation the Council gave before leaving,
or under a standing rule; anything else is batched as needs-input. What a Captain does while a
grant is missing is in [authority](./authority.md#when-a-grant-is-missing). Each headless start is a fresh
session that rereads its channels, its open missions, and the decisions since its last lease
generation, acts, and exits.
