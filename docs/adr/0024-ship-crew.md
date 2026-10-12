# ADR-0024: The ship's crew — Operator, Captain, Coordinator, and how they hand work on

## Status

Proposed, 2026-10-11. Amends [ADR-0022](0022-cyberfleet-persona.md) decision 8 and
[ADR-0023](0023-captain-mission-sortie.md) §1, §2, §4, §5, §7 and its implementation order.
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
- **The first hop.** ADR-0023's Operator is reached "from any session". The Council wants a primary
  interface inside each ship and a separate one at fleet level.
- **Disagreement.** ADR-0023 §5 sends disputes to an arbitration channel and then to the Council,
  with nothing in between, so every dispute costs the Council's attention.

## Decision

### 1. The ship has three tabs

A ship is a herdr workspace with three tabs, opened from a template:

| Tab | Holds |
| --- | --- |
| **Dashboard** (first) | The main checkout. Left: the ship's Operator. Right: a refreshing `cyberfleet missions`, until the mission TUI (cyberfleet#4) replaces it. The layout is a template slot the Council can change. |
| **Bridge** | Left: the Captain. Right: the Coordinator. Both start on demand, not with the ship. |
| **Engine Room** | Long-running processes for the main checkout (Storybook, dev servers). No agents. A Pod that needs a preview of its own branch starts one in its own worktree. |

Opening a ship is the runtime's job: cyberlegion applies a cyber-mux template and starts or
reserves role sessions in its named slots. cyberfleet supplies the template's content and the
role-to-slot binding (`cyberfleet ship open`). This retires ADR-0022 decision 8 (one worktree, one
pane).

### 2. The crew

| Automaton | Seat | Tier | Starts | Job |
| --- | --- | --- | --- | --- |
| Operator (ship) | Dashboard, left | Mid | With the ship | The Council's primary interface. Answers questions itself; relays work to the Captain. |
| Operator (Command Center) | Outside every ship | Mid | With the Command Center | Resolves the target ship and relays straight to its Captain. |
| Captain | Bridge, left | High | On demand | Freshness, priority, scope; the issue tracker; the plan; spawns Pods; rules on escalations. |
| Coordinator | Bridge, right | Low | On demand | Lands work: clean bar, rebase order, speculative CI, merge; escalates judgment. |
| Pod | Own workspace and worktree | Per sortie | Spawned by the Captain | One sortie, one pull request. |
| Mediator | Headless, cold | High | Per dispute | Writes a brief of a dispute. Decides nothing. |

The Captain picks each Pod's tier from the mission graph's `modelTier`, and uses mid when the node
has none. The Coordinator exists because rebase-and-merge turns are the cheapest work a ship does.
That saving is a hypothesis, and it is measured (Consequences).

Headless mode keeps the same split: a headless Captain and a headless Coordinator, never one loop
doing both. One loop would put landing back on the high tier.

### 3. The Operator classifies, then relays

The Operator answers questions from `cyberfleet missions`, `gh`, and channels without waking the
Captain. Only work goes up. The Command Center Operator skips the ship's Operator and relays to the
Captain directly, since the extra hop would decide nothing. A request spanning ships goes to the ship
where it starts, and that Captain invites the other one (§8).

### 4. The clean bar is a command

`cyberfleet pr clean <pr>` computes the four conditions of authority-governance §7: no conflict,
reviews resolved, CI green on the merged result (all from `gh`), and the Pod reported the work done
on the issue's work channel. The Coordinator acts on its exit status and never decides "clean
enough". This is what makes a low-tier Coordinator safe: no Coordinator merges before `pr clean`
exists.

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
- The Operator received those words in its own session, so it holds them, and records them on the
  work channel (the words, the request, and the pull requests they cover as Pods attach them) as an
  audit trail. The record is not the delegation: a Coordinator reading it is reading fetched
  content, which authority-governance §3 refuses as a claim.
- The Coordinator stays alive while it has work in flight, so in the normal case the Council's
  words reach it once, as a turn, and stay in its session. It counts the in-flight sorties of each
  delegated request: up when the Captain spawns a Pod under the request, down when the pull request
  merges, is closed, or the Captain retires the sortie. Each change is an event the Captain or the
  Pod records, never one the Coordinator infers. It exits when the count reaches 0. Counting
  sorties rather than open pull requests keeps it alive between one request's pull requests, while
  a Pod is still working.
- While it waits, the Coordinator blocks on a command that returns when there is news
  (`cynapse entry wait` on its address channel, `gh pr checks --watch`) rather than polling, so a
  long review wait costs neither turns nor context.
- Re-relay is the fallback. When the Coordinator finds a clean pull request it holds no delegation
  for in its current session, it asks the Operator, and the Operator relays the Council's words as
  a turn (`cyberlegion unit nudge --message`). This covers a crash, a lease takeover, and a session
  that can no longer quote the Council's words exactly from its own turns (for example after
  compaction); a paraphrase is not a delegation. An Operator that no longer holds the words asks
  the Council again.
- A delegation is scoped to one request's pull requests, survives the Coordinator's restarts this
  way, and is spent per merge.
- A headless Coordinator merges only under a delegation the Council gave before leaving, or under a
  standing rule (§9). Otherwise it batches the merge as needs-input.

cyberlegion#154 (`mail send` stamps another live unit as sender) is fixed before any authority
travels over messages.

### 6. Two leases per ship

ADR-0023 §2 gave the Captain the project's one lease. Now there are two, under civitas 0002:

- The **Captain's** lease fences the issue tracker and plan events in the mission graph.
- The **Coordinator's** lease (`cyberlegion service start <project> coordinator`) fences merges
  (`service verify` before `gh pr merge`) and its `retired` appends to the graph.

### 7. The mission graph has two writers, split by event kind

cyber-sdd's graph is single-writer by design. A Captain-only writer would cost a Captain turn per
merge, because the frontier grows only once a landing is retired. Instead the Captain appends plan
events and the Coordinator appends `retired`, both under an append lock (git ref compare-and-swap
with retry). This needs a change in cyber-sdd. The Coordinator rings the Captain only when the
`ready` frontier grew.

The Coordinator works in its own integration worktree, provisioned through the runtime (civitas
0003). Speculative CI and bisection need a checkout, and the main checkout belongs to the Operator
and the Captain. If the host's merge queue does the speculation, the Coordinator reads its results
instead.

### 8. Addressing and waking

- **Participants are roles.** The Captain and the Coordinator are cynapse participants keyed from
  the project's cynapse address and the role (for example `<project-address>/captain`).
  Registration is idempotent, so whoever first needs the address registers it, whether that is
  `ship open` or `send --start`. A session acts as the role while it holds the role's lease. The
  lease generation, not the participant, tells sessions apart.
- **Channels.** The ship address channel (owner: the Captain) takes requests and escalations. A
  Coordinator address channel takes "PR ready". Pods report progress on the issue's work channel.
- **Waking is cyberlegion's.** ADR-0023 §4's provisional `cyberfleet hail` becomes
  `cyberlegion send --start`: post to a channel, resolve or start its owner with `service start`,
  ring it. It stays in place until the runtime's channel watcher (cyberlegion#153) replaces it.
- **cyberfleet calls cynapse directly** for channels and state records (opening work channels,
  delegation records, blocked sorties). It goes through cyberlegion only to wake a session. Routing
  every channel call through cyberlegion would put message meaning in the runtime.
- **What the Captain keeps.** Each start is a fresh session. Each ruling is written where it
  takes effect: its rationale as a comment on the issue, and a one-line decision entry (ruling, issue,
  lease generation) on the ship address channel. On start the Captain rereads its unread address
  channel, the graph's `ready`, and the decision entries since its last generation. A decision that
  is not written down did not happen.

### 9. Across ships, and disputes

This replaces ADR-0023 §5's step from the arbitration channel straight to the Council.

- **Cross-ship work** is an issue in the other repository, rung with `send --start` to its Captain,
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

### 10. Vocabulary

| Term | Meaning |
| --- | --- |
| **Dashboard, Bridge, Engine Room** | The ship's three tabs (§1). |
| **Coordinator** | The ship's landing automaton (§2, §4). |
| **Mediator** | A cold automaton that briefs a dispute for the Council (§9). |
| **clean bar** | The four conditions `pr clean` checks (§4). |
| **Operation order** | The order of the SDD mission graph's Operations. Named so, because cyberfleet's "mission" means something else. |

The legacy standing `operator` owner and mailbox are retired (ADR-0023 §8) together with the
Operator rewrite, once Pod reports go through work channels. Retiring it earlier leaves reports
nowhere to go.

## Consequences

### Positive

- The Council has one door per ship and one for the fleet, and questions never wake a high-tier
  session.
- Landing runs at the low tier behind a deterministic bar, and the graph's frontier grows without a
  Captain turn per merge.
- A dispute reaches the Council only after a bounded exchange and a written brief.

### Negative

- authority-governance §7 changes: a delegation now names a Coordinator, is scoped per request, and
  is re-relayed after a restart. The frozen `authority.feature`, `operator.feature`, and
  `pod.feature` suites reopen and need the Council's ratification.
- Seven repositories change. Work is placed by each module's responsibility (plan,
  §Responsibilities); the cyber-sdd append lock, cyberlegion slot placement and `send --start`, and
  cyber-mux template application land before the parts of this ADR that use them.
- The Coordinator's saving is assumed. The first step ships the Operator, Captain, and Pods and
  leaves landing to the Operator under today's §7. Cost per landed pull request is measured with
  the Captain landing and with the Coordinator landing before the Coordinator becomes load-bearing.

### Degraded mode

Until cyberlegion has slot-addressed placement and cyber-mux can apply a template into a named tab,
`ship open` applies the template with `cyber-mux open --template`. The Dashboard Operator starts the
Captain and Coordinator with `--at tab` relative to itself. Working from the Dashboard works this
way; working from the Command Center does not.

## Implementation order

The plan's work breakdown is authoritative; in short:

1. The authority-governance §7 amendment design (§5).
2. Foundations in sibling repositories, in parallel: cynapse member CLI and project-address recipe;
   cyberlegion `send --start`, `service stop`, `unit status`, opaque keys, slot placement;
   cyber-mux template application and apply manifest; cyber-sdd append lock, external blockers, and
   frontier growth.
3. cyberfleet: depend on cynapse; crew addressing; `pr clean`; Captain; Operator rewrite; Pod;
   `missions` grouped by project.
4. The Coordinator, after `pr clean`, the append lock, and the cost measurement.
5. Across ships and disputes: invitations, blocked sorties, the dispute node, the Mediator,
   standing rules.

## Related Decisions

- [ADR-0022](0022-cyberfleet-persona.md) — the persona layer; decision 8 retired here.
- [ADR-0023](0023-captain-mission-sortie.md) — Captains, missions, and sorties; amended here.
- [cyberlegion ADR-0033](https://github.com/cyberuni/cyberlegion/blob/main/docs/adr/0033-project-services-fenced-ownership.md)
  — the fenced service lease both Bridge roles hold.
- cyber-sdd ADR-0026 — the single-writer mission graph this splits by event kind.
- [cyber-civitas decisions](https://cyber-civitas.github.io/decisions/) 0001-0004.
