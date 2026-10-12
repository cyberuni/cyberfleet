# ADR-0024: The ship's crew — Operator, Captain, Coordinator, and how they hand work on

## Status

Proposed, 2026-10-11. Amends [ADR-0022](0022-cyberfleet-persona.md) decision 8 and
[ADR-0023](0023-captain-mission-sortie.md) §1, §2, §3, §4, §5, §7 and its implementation order.
Decisions locked by the Council at fine-tuning, recorded in
[`.agents/plans/ship-crew.plan.md`](../../.agents/plans/ship-crew.plan.md). The scenarios behind them
are on the docs site under `scenarios/`. Parent issue:
[cyberuni/cyberfleet#24](https://github.com/cyberuni/cyberfleet/issues/24).

Cites the cross-package decisions at
[cyber-civitas.github.io/decisions](https://cyber-civitas.github.io/decisions/):
[0001](https://cyber-civitas.github.io/decisions/0001-runtime-depends-on-communication/) (waking is
the runtime's),
[0002](https://cyber-civitas.github.io/decisions/0002-claims-and-leases/) (leases in the runtime),
[0003](https://cyber-civitas.github.io/decisions/0003-worktrees-through-the-runtime/) (worktrees
through the runtime), and
[0004](https://cyber-civitas.github.io/decisions/0004-opaque-service-keys/) (project addresses as
opaque keys).

## Context

ADR-0023 gave each project a Captain and moved spawning to it. It left four things open:

- **Where the crew sits.** Nothing says how a ship looks in the multiplexer, which session the
  Council talks to, or where the Captain runs.
- **Cost.** The Captain holds the project's lease and lands its work. Landing is a long loop of
  status reads and commands. Running it on the highest model tier spends the most expensive turns on
  the cheapest work.
- **The first hop.** ADR-0023's Operator is reached "from any session", but nothing says whether
  that session becomes the Operator or reaches one that already exists.
- **Disagreement.** ADR-0023 §5 sends disputes to an arbitration channel and then to the Council,
  with nothing in between, so every dispute costs the Council's attention.

## Decision

### 1. The ship has three tabs

A ship is a herdr workspace with three tabs, opened from a template:

| Tab | Holds |
| --- | --- |
| **Dashboard** (first) | The main checkout. Left: the Council's own session in the ship, from which it calls the Operator or this ship's Captain (§3). Right: a refreshing `cyberfleet missions`, until the mission TUI (cyberfleet#4) replaces it. The layout is a template slot the Council can change. |
| **Bridge** | Left: the Captain. Right: the Coordinator. Both start on demand, not with the ship. |
| **Engine Room** | Long-running processes for the main checkout (Storybook, dev servers). No agents. A Pod that needs a preview of its own branch starts one in its own worktree. |

Opening a ship is the runtime's job: cyberlegion applies a cyber-mux template and starts or
reserves role sessions in its named slots. cyberfleet supplies the template's content and the
role-to-slot binding (`cyberfleet ship open`). This retires ADR-0022 decision 8 (one worktree, one
pane).

### 2. The crew

| Automaton | How many | Seat | Tier | Starts | Job |
| --- | --- | --- | --- | --- | --- |
| Operator | One | Command Center | Mid | With the Command Center | The Council's interface to the fleet. Answers questions itself; relays work to the target ship's Captain; holds the Council's merge delegations. |
| Captain | One per ship | Bridge, left | High | On demand | Freshness, priority, scope; the issue tracker; the plan; spawns and manages Pods; reviews what landed; rules on escalations. |
| Coordinator | One per ship | Bridge, right | Low | On demand | Lands work: clean bar, rebase order, speculative CI, merge; reports each landing to the Captain; escalates judgment. |
| Pod | Many | Own workspace and worktree | Per Pod | Spawned by the Captain, or by a Pod for a gate | One line of work (impl, judge, refactor, audit) in one sortie. |
| Mediator | Per dispute | Headless, cold | High | Per dispute | Writes a brief of a dispute. Decides nothing. |

The Captain picks each Pod's tier. The Captain manages Pods and never works inside one. The
Coordinator exists because rebase-and-merge turns are the cheapest work a ship does. That saving is
a hypothesis, and it is measured (Consequences).

Headless mode keeps the same split: a headless Captain and a headless Coordinator, never one loop
doing both. One loop would put landing back on the high tier.

### 3. Calling the crew is a phone call

There is one Operator and one Captain per ship. `/operator` or `/captain` in any session, whether
the Dashboard, another ship, or the Command Center, calls that one automaton. It never makes the
calling session one:

- The calling session posts the Council's words, verbatim, to the role's address channel and rings
  it (`cyberlegion send --start`, which starts it if it is not running), then shows the reply.
- Calling takes over nothing. The called automaton keeps its own session, lease, and history.

The Operator answers questions from `cyberfleet missions`, `gh`, and channels without waking a
Captain. Only work goes up, to the target ship's Captain. A request spanning ships goes to the ship
where it starts, and that Captain invites the other one (§10).

### 4. The clean bar is a command

`cyberfleet pr clean <pr>` computes four conditions, from authority-governance §7 as amended here:

1. No conflict with trunk.
2. Reviews resolved.
3. CI green on the merged result.
4. The pull request's line of work reported done on its sortie channel (§8), and, where the sortie
   has a gate, the gate thread's outcome is a pass.

The first three come from `gh`, the fourth from cynapse. The Coordinator acts on the command's exit
status and never decides "clean enough", or reads a verdict to decide for itself. This is what makes
a low-tier Coordinator safe: no Coordinator merges before `pr clean` exists.

The Coordinator handles mechanical failures itself. A text conflict means ordering a rebase, and a
red CI caused by the pull request goes back to its Pod. Only judgment goes to the Captain:
scope-changing reviews, semantic conflicts between pull requests, a red that survives the Pod's
fixes, a bisect culprit, a stuck Pod.

The Captain's ruling never overrides red. Accepting decides the question that held the pull request
(for example, "that review is out of scope; file a follow-up"), then sends it back through the
clean bar. Trunk stays always-green (merge-backstop-governance).

### 5. Merge delegation names the ship's Coordinator

This amends authority-governance §7, which lets only the Operator merge under a delegation and
never transferably.

- The Operator's announcement says the Coordinator lands the work. The Council's reply delegates to
  that ship's Coordinator, for that request's pull requests.
- The Operator holds the Council's words, and records them on the request's channel (the mission
  channel for an epic, the sortie channel for an issue: the words, the request, and the pull
  requests they cover as Pods open them) as an audit trail. The record is not the delegation: a
  Coordinator reading it is reading fetched content, which authority-governance §3 refuses as a
  claim.
- The Coordinator stays alive while it has pull requests to land. It counts the open pull requests
  of each delegated request: up when a Pod opens one, down when it merges or closes. Both are host
  events, never inferred. It exits when the count reaches 0. In the normal case the Council's words
  reach it once, as a turn, and stay in its session for the whole queue.
- While it waits, the Coordinator blocks on a command that returns when there is news
  (`cynapse entry wait` on its address channel, `gh pr checks --watch`) rather than polling, so a
  long review wait costs neither turns nor context.
- Re-relay is the fallback. When the Coordinator finds a clean pull request it holds no delegation
  for in its current session, it asks the Operator, and the Operator relays the Council's words as
  a turn (`cyberlegion unit nudge --message`). This covers a crash, a lease takeover, a Coordinator
  that exited between two pull requests of one sortie, and a session that can no longer quote the
  Council's words exactly from its own turns (for example after compaction); a paraphrase is not a
  delegation. An Operator that no longer holds the words asks the Council again.
- A delegation is scoped to the sorties of the request it answers, read from the Council's words.
  It survives the Coordinator's restarts this way, and is spent per merge. A follow-up pull request
  on a reopened sortie is covered when the words cover it.
- Promoting an issue to an epic (§8) can widen what a delegation reaches, so the Captain checks the
  children against the Council's words when it creates the epic. Children within them keep the
  delegation, and the Captain records the mapping on the mission channel. A child that adds work the
  words did not ask for goes to the Council through the Operator before it is delegated.
- A headless Coordinator merges only under a delegation the Council gave before leaving, or under a
  standing rule (§10). Otherwise it batches the merge as needs-input.

cyberlegion#154 (`mail send` stamps another live unit as sender) is fixed before any authority
travels over messages.

### 6. Two leases per ship

ADR-0023 §2 gave the Captain the project's one lease. Now there are two, under civitas 0002:

- The **Captain's** lease fences the issue tracker and the plan: filing, scope, promotion, closing
  and reopening sorties.
- The **Coordinator's** lease (`cyberlegion service start <project> coordinator`) fences merges:
  `service verify` before `gh pr merge`.

### 7. Landing reports to the Captain

The Coordinator reports each landing on the sortie channel and rings the Captain. The Captain then
reviews what merged against the sortie and the project as a whole. It decides whether the sortie is
done and closes or reopens its issue, replans, and spawns Pods on work that became ready. This is
the outer loop, and it is judgment, so it runs at the high tier. The low tier only does the
mechanics of landing. The Captain may review several landings in one turn when they have queued.

The plan lives in the tracker. cyber-sdd's mission graph is not a dependency: it was the reference
for cyber-truss's design and is superseded by it.

The Coordinator works in its own integration worktree, provisioned through the runtime (civitas
0003). Speculative CI and bisection need a checkout, and the main checkout belongs to the Council's
session and the Captain. If the host's merge queue does the speculation, the Coordinator reads its
results instead.

### 8. Sorties, missions, and their channels

The fleet's roles sit on the tracker's levels. The level is read from the tracker and never
inferred from how the work went.

| Tracker level | Fleet role | Channel |
| --- | --- | --- |
| **Issue** (a story or chore): releasable on its own, in one repository | **Sortie**: one Captain, one lease; lands as one or more pull requests | The issue's work channel: the **sortie channel** |
| **Epic**: several issues that together deliver one outcome | **Mission** | The epic's work channel: the **mission channel** |
| **Subtask**: not releasable on its own (impl, judge, refactor, security audit) | A **line of work** in a sortie, carried by its Pods | None of its own. The Pod's own loop holds it, and threads in the sortie channel carry its focused exchanges. |

- **Everything starts as a sortie.** Releasable is a criterion that permits a split, not a signal
  that requires one: a feature can be five releasable commits and still be one issue. A mission
  exists only once someone deliberately makes the issue an epic, by creating the epic entry or
  retyping the issue. Work spread over time, devices, or pull requests promotes nothing. Crossing a
  repository boundary does force an epic, because each repository releases on its own.
- **Where an epic lives** follows the project's tracker routing (repobuddy's
  `project-tracker.routing`). It may be an issue in a repository, a GitHub Projects item, or an
  Asana task, which can belong to several projects at once. An epic that lives outside any
  repository belongs to no ship, matching ADR-0023's ownerless mission. The Captain that creates
  it, or that adds a sortie to it, maintains its links.
- **Promotion is in place when one tracker holds both levels.** The issue becomes the epic, and its
  channel becomes the mission channel, keeping its history: everything said before the split was
  about the whole request. Each child issue opens its own sortie channel. Work already in flight
  moves to the child that inherits it, as part of the Captain's replan. When the routing puts epics
  in another tracker, the epic is a new item there, and the original issue stays as its first
  sortie with its channel unchanged.
- **A sortie's lifetime is its issue's.** It begins when the Captain takes the issue in and ends when
  the Captain closes the issue after reviewing what landed (§7). Pull requests reference the issue
  and never close it (no `Closes #n`). A follow-up the request covers reopens the issue, which is the
  Captain's call; work the request did not cover is a new issue.
- **Membership.** The Captain and the Coordinator are members of every sortie channel of their ship;
  each Pod is a member of its own sortie's channel. The mission channel carries only what crosses
  sorties: the plan across them, blockers, invitations, and the request's delegation record. No pull
  request channel is opened: review lives on the host, and landing talk lives in the sortie channel.
- **Threads.** An exchange that needs a different set of readers from its parent is a child channel
  anchored at the entry that starts it (cynapse ADR-0004): a gate, whose cold judge reads only its
  thread; an escalation and its ruling; an arbitration. A Pod that needs a gate opens the gate
  thread and spawns the judge; the Captain takes no part. Progress, "PR ready", and routine landing
  stay in the sortie channel. Every thread posts its outcome back to its parent as an entry that
  refers to the anchor, so a reader of the parent never has to open a thread to learn a decision.
  In a local store, membership does not enforce isolation; the thread's briefing (purpose, members,
  context) names only its own exchange. Enforcement would be cynapse's access control.
- **Two kinds of edge.** The tracker's parent and child links join work items, mission to sortie,
  and cynapse keeps no copy of them (cynapse ADR-0011). Anchors branch a conversation inside one work
  item. The whole trace is a walk over the tracker's tree, then over each sortie's anchors. GitHub
  sub-issues can live in another repository. Across organizations this is unconfirmed; there, the
  epic lives in a tracker that spans them, or the link is a cynapse relation (cynapse ADR-0010).

### 9. Addressing and waking

- **Participants are roles.** The Operator, each Captain, and each Coordinator are cynapse
  participants. A Captain or Coordinator is keyed from its project's cynapse address and the role
  (for example `<project-address>/captain`). Registration is idempotent, so whoever first needs the
  address registers it, whether that is `ship open` or `send --start`. A session acts as the role
  while it holds the role's lease. The lease generation, not the participant, tells sessions apart.
- **Channels.** The Operator's address channel takes the Council's calls. The ship address channel
  (owner: the Captain) takes requests, escalations, and landing reports. A Coordinator address
  channel takes "PR ready". Pods report progress on their sortie channel (§8).
- **Waking is cyberlegion's.** ADR-0023 §4's provisional `cyberfleet hail` becomes
  `cyberlegion send --start`: post to a channel, resolve or start its owner with `service start`,
  ring it. It stays in place until the runtime's channel watcher (cyberlegion#153) replaces it.
- **cyberfleet calls cynapse directly** for channels and state records (opening work channels,
  delegation records, blocked sorties). It goes through cyberlegion only to wake a session. Routing
  every channel call through cyberlegion would put message meaning in the runtime.
- **What the Captain keeps.** Each start is a fresh session. Each ruling is written where it takes
  effect: its rationale as a comment on the issue, and a one-line decision entry (ruling, issue,
  lease generation) on the ship address channel. On start the Captain rereads its unread address
  channel, its open sorties in the tracker, and the decision entries since its last generation. A
  decision that is not written down did not happen.

### 10. Across ships, and disputes

This replaces ADR-0023 §5's step from the arbitration channel straight to the Council.

- **Cross-ship work** is an issue in the other repository, a child of the mission's epic
  (promoting the request first if it was an issue), rung with `send --start` to its Captain,
  who accepts, declines, or asks the Council. The requesting Captain marks its sortie blocked on
  that issue and keeps planning everything else. If the dependency is consumed as a published
  package, the block lifts at the release, not the merge.
- **A dispute** climbs a ladder. First comes an arbitration channel anchored at the disputed entry,
  with one position and one rebuttal from each Captain. Then standing rules. Then a cold high-tier
  Mediator's brief. Then the Council. Only the Council's rung binds two ships.
- **Standing rules** are written by the Council only. Captains apply them and never widen them;
  editing one is widening it. They live as references in the repository a rule binds
  (`.agents/references/`), or in `~/.agents/references/` for a rule across ships. The format is
  decided when the first reader is built.

### 11. Vocabulary

| Term | Meaning |
| --- | --- |
| **Dashboard, Bridge, Engine Room** | The ship's three tabs (§1). |
| **calling** | Reaching the one Operator or a ship's one Captain from any session, without becoming it (§3). |
| **Coordinator** | The ship's landing automaton (§2, §4). |
| **Mediator** | A cold automaton that briefs a dispute for the Council (§10). |
| **sortie** | An issue in flight: releasable, in one repository, owned by its Captain (§8). |
| **mission** | An epic in flight: several sorties delivering one outcome (§8). |
| **line of work** | A subtask of a sortie, not releasable on its own, carried by its Pods (§8). |
| **sortie channel, mission channel, thread** | The issue's work channel, the epic's work channel, and a child channel anchored in one of them (§8). |
| **clean bar** | The four conditions `pr clean` checks (§4). |

The legacy standing `operator` owner and mailbox are retired (ADR-0023 §8) together with the
Operator rewrite, once Pod reports go through sortie channels. Retiring it earlier leaves reports
nowhere to go.

## Consequences

### Positive

- The Council reaches the fleet through one Operator and each ship through one Captain, from any
  session, and questions never wake a high-tier session.
- Landing mechanics run at the low tier behind a deterministic bar, and the Captain spends its
  turns on reviewing what landed.
- A dispute reaches the Council only after a bounded exchange and a written brief.

### Negative

- authority-governance §7 changes: a delegation now names a Coordinator, is scoped per request, and
  is re-relayed after a restart. The frozen `authority.feature`, `operator.feature`, and
  `pod.feature` suites reopen and need the Council's ratification.
- The Captain takes a turn per landing, or per batch of landings. That is the outer loop's cost, and
  it is judgment the Coordinator must not make.
- Seven repositories change. Work is placed by each module's responsibility (plan,
  §Responsibilities); cyberlegion slot placement and `send --start`, and cyber-mux template
  application, land before the parts of this ADR that use them.
- The Coordinator's saving is assumed. The first step ships the Operator, Captain, and Pods and
  leaves landing to the Operator under today's §7. Cost per landed pull request is measured with
  the Captain landing and with the Coordinator landing before the Coordinator becomes load-bearing.

### Degraded mode

Until cyberlegion has slot-addressed placement and cyber-mux can apply a template into a named tab,
`ship open` applies the template with `cyber-mux open --template`, and a call from the Dashboard
starts the Captain and Coordinator with `--at tab` relative to the calling session. Calling from the
Dashboard works this way; calling a ship's Captain from the Command Center does not.

## Implementation order

The plan's work breakdown is authoritative; in short:

1. The authority-governance §7 amendment design (§5).
2. Foundations in sibling repositories, in parallel: cynapse member CLI and project-address recipe;
   cyberlegion `send --start`, `service stop`, `unit status`, opaque keys, slot placement;
   cyber-mux template application and apply manifest.
3. cyberfleet: depend on cynapse; calling and crew addressing; `pr clean`; Captain; Operator
   rewrite; Pod; `missions` grouped by project.
4. The Coordinator, after `pr clean` and the cost measurement.
5. Across ships and disputes: invitations, blocked sorties, the dispute node, the Mediator,
   standing rules.

## Related Decisions

- [ADR-0022](0022-cyberfleet-persona.md) — the persona layer; decision 8 retired here.
- [ADR-0023](0023-captain-mission-sortie.md) — Captains, missions, and sorties; amended here.
- [cyberlegion ADR-0033](https://github.com/cyberuni/cyberlegion/blob/main/docs/adr/0033-project-services-fenced-ownership.md)
  — the fenced service lease both Bridge roles hold.
- [cyber-civitas decisions](https://cyber-civitas.github.io/decisions/) 0001-0004.
