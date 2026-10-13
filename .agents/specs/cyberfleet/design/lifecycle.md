# Lifecycle

How one piece of work travels from the Council's ask to merged code and a closed issue, and how the
same path stretches when the work spans ships. Roles, places, and rules are in the
[model](./model.md); terms are in the [glossary](../glossary.md).

## One sortie, end to end

```mermaid
sequenceDiagram
  participant C as Council
  participant O as Operator
  participant K as Captain
  participant P as Pod
  participant D as Coordinator
  C->>O: ask (any pane)
  O-->>C: questions answered from missions, gh, channels
  O->>K: work: the Council's words, verbatim, on the ship address channel, rung
  K->>K: take the issue in (the sortie begins), plan the lines of work
  K-->>C: announce the Coordinator lands the work, name the clean bar
  C->>D: reply: the delegation, relayed as a turn
  K->>P: spawn into its own worktree, bind
  P->>P: work the line of work (SDD-mission), run its gate
  P->>D: PR ready (the PR references the issue, never closes it)
  D->>D: pr clean, rebase order, speculative CI, merge
  D->>K: queue settled: one report of what landed, then exit
  K->>K: review against the sorties: close or reopen the issue, replan
```

### 1. The ask

The Council talks wherever it is: the Operator's seat, a ship's remote pane, a Captain's pane, or
the Coordinator's pane. A question is answered where it lands, from `cyberfleet missions`, `gh`, and
channels, without waking a Captain. Work goes up to the target ship's Captain: the session that
received it posts the Council's words verbatim to the ship address channel and rings the Captain,
starting it if it is not running. Talking in the Captain's own pane is a deliberate choice to spend
the high tier.

### 2. The Captain takes it in

The sortie begins when the Captain takes the issue in. Taking it in, scoping it, and later closing
or reopening it are writes fenced by the Captain's lease. Anyone may file an issue; only the Captain
decides to take one in.

The Captain plans the sortie's lines of work, picks each Pod's tier, and spawns the Pods into
worktrees provisioned through the runtime, binding each to the ship's Captain role. It manages Pods
and never works inside one.

### 3. The delegation

Whoever takes the request announces who will land its pull requests (the ship's Coordinator, or
each Pod under the ship's landing setting), and names the clean bar. The Council's reply is the merge delegation, for the sortie or for the whole
mission, as its words say. It reaches the Coordinator as a
relay, verbatim and as a turn, like any other order. The audit record on the sortie channel is not
the delegation: a Coordinator that reads it there is reading content.

### 4. The work

Each Pod carries one line of work, today through an SDD-mission, and reports progress on the
sortie channel. Where the sortie has a gate, the Pod opens a gate thread and spawns a cold judge
into it; the Captain takes no part, and the outcome posts back to the sortie channel.

A Pod that hits the limit of its brief escalates to the Captain in a thread on the sortie channel:
the fix outgrows the sortie, the spec is wrong, a design choice is beyond its brief, or the judge
keeps failing it. The Captain rules, and the ruling posts back.

### 5. Landing

When its line of work is done, the Pod opens a pull request that references the issue without
closing it, and tells the Coordinator it is ready. The Coordinator counts the open pull requests
of each delegated request, up when a Pod opens one and down when it merges or closes.

The Coordinator lands each pull request when `cyberfleet pr clean` passes, in rebase order, behind
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
| A review comment within the sortie's scope | The Coordinator tells the Pod to address it |
| A review asking for a change of scope, red that survives the Pod's fixes, a bisect culprit, two pull requests that conflict in meaning, a stuck Pod | Escalated to the Captain |
| A clean pull request with no delegation in the Coordinator's own session | A decision-request to the Council, through the Operator |

A ruling never overrides red. It settles the question that held the pull request, which then goes
back through the clean bar.

### 6. The review

When the count reaches zero, the queue has settled. The Coordinator posts one report of what landed
to the ship address channel, rings the Captain, and exits. The Captain reviews what merged against
its sorties and the project: it closes the issues that are done, reopens one that needs a follow-up
the request covers, files new issues for work the request did not cover, and spawns Pods on work
that became ready. The sortie ends when the Captain closes its issue.

This review is the outer loop. It runs once per settled queue, not once per merge, because it is
judgment and judgment runs at the high tier.

## When work becomes a mission

```mermaid
sequenceDiagram
  participant KA as Captain, ship A
  participant FD as Fleet Coordinator
  participant KB as Captain, ship B
  participant C as Council
  KA->>FD: promote: the epic, its children, the issue text for ship B
  FD->>FD: file the epic and children, open the mission channel
  FD->>KB: file the child in B, ring B's Captain
  KB-->>C: accept, decline, or ask the Council
  KA->>KA: mark its sortie blocked, keep planning the rest
  KB->>KB: run its own sortie, under its own delegation
  FD->>KA: release carries the fix: lift the block, ring
  FD->>KA: every child closed: close the epic, report once
```

A mission exists only once a Captain promotes an issue to an epic, or the work crosses a repository
boundary, which forces one.

- **Promotion.** The Captain decides what the children are and checks them against the Council's
  words. Children in its own ship within those words keep the delegation; a child that adds work goes
  back to the Council first. The fleet's Coordinator executes the tracker changes as commands
  (`cyberfleet epic ...`) and sends an underspecified request back rather than filling the gap.
- **Another ship.** A child in another ship is covered when the Council's grant names the mission
  and the child's work is within its words or a pre-approval. Otherwise that ship's Captain accepts
  the sortie, declines it, or asks the Council, and its merges wait for the Council's words.
- **Blocks.** The requesting Captain marks its sortie blocked on the other ship's issue and keeps
  planning everything else. The fleet's Coordinator lifts the block and rings the waiting Captain,
  usually at the release that carries the fix, because ships consume each other as published
  packages; at the issue's close only when the dependency is consumed from source.
- **Closing.** When every child has closed, the fleet's Coordinator closes the epic and reports once
  to the Captain that created it.
- **Disputes.** Two Captains that disagree climb a ladder: an arbitration thread with one position
  and one rebuttal each, then standing rules, then a Mediator's brief, then the Council. Only the
  Council's rung binds two ships.

## Without the Council

Headless runs keep the same split: a headless Captain and a headless Coordinator, never one loop
doing both. A headless Coordinator merges only under a delegation the Council gave before leaving,
or under a standing rule; anything else is batched as needs-input. What a Captain does while a
grant is missing is in [authority](./authority.md#when-a-grant-is-missing). Each headless start is a fresh
session that rereads its channels, its open sorties, and the decisions since its last lease
generation, acts, and exits.
