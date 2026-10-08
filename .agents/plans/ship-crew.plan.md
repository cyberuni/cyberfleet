---
name: ship-crew
status: draft
todos:
  - content: "DESIGN drafted: ship layout (Dashboard / Bridge / Engine Room), crew tiers, Coordinator, five scenarios — apps/web/src/content/docs/scenarios/"
    status: completed
  - content: "Cross-project review of cyberfleet, cyberlegion, cyber-mux, cynapse, cyber-sdd, cyber-truss, cyber-civitas (this file, §Cross-project review)"
    status: completed
  - content: "FINE-TUNE with the Council: settle the proposed decisions P1-P12 and the open questions; mark each locked or rejected"
    status: pending
  - content: "Phase 0 — ADR-0024 (amends ADR-0022/0023), authority-governance §7 design, civitas vocabulary; file issues and place them on a board"
    status: pending
  - content: "Phase 1 — foundations in the sibling repos (cynapse, cyberlegion, cyber-mux, cyber-sdd), in parallel"
    status: pending
  - content: "Phase 2 — cyberfleet core: cynapse dependency, ship open, crew addressing, pr clean, Captain, Coordinator, Operator, Pod, missions view"
    status: pending
  - content: "Phase 3 — across ships and disputes: invitations, blocked sorties, channel-member doorbell, dispute node, mediator, standing rules"
    status: pending
  - content: "Phase 4 — docs: persona pages, overview, civitas pages; scenario pages drop 'Proposed design'"
    status: pending
---

# Plan: ship-crew — the ship's tabs, its crew, and how they hand work to each other

Design pages (the reviewable form, with diagrams):
[`apps/web/src/content/docs/scenarios/`](../../apps/web/src/content/docs/scenarios/) —
`the-ship`, `work-from-the-dashboard`, `work-from-the-command-center`, `landing-a-pull-request`,
`work-across-ships`, `captains-in-dispute`.

Builds on [ADR-0023](../../docs/adr/0023-captain-mission-sortie.md) (Proposed) and the
[cyber-civitas decisions](https://cyber-civitas.github.io/decisions/) 0001-0005. Parent issue:
https://github.com/cyberuni/cyberfleet/issues/24.

Status is **draft**: this file is the input to a fine-tuning pass with the Council, before the
detailed action plan is put on a project board.

## Problem

ADR-0023 gave each project a Captain and moved spawning to it, but left four things unanswered:

- **Where the crew sits.** Nothing says how a ship looks in the multiplexer, which session the
  Council talks to, or where the Captain runs.
- **Cost.** The Captain holds the project's lease and lands its work. Landing is a long loop of
  status reads and commands; running it on the highest model tier spends the most expensive turns on
  the cheapest work.
- **The first hop.** ADR-0023's Operator is reached "from any session". The Council wants a primary
  interface inside each ship, and a separate fleet-level one.
- **Disagreement.** ADR-0023 §5 sends disputes to "an arbitration channel" and then the Council, with
  nothing in between, so every dispute costs the Council's attention.

## The design in one page

| Automaton | Seat | Tier | Starts | Job |
| --- | --- | --- | --- | --- |
| Operator (ship) | Dashboard tab, left pane, main checkout | Mid (Sonnet) | With the ship | The Council's primary interface; answers status, relays work to the Captain |
| Operator (Command Center) | Home folder, outside every ship | Mid | With the Command Center | Resolves the target ship and relays straight to its Captain |
| Captain | Bridge tab, left pane | High (Opus) | On demand | Freshness, priority, scope; issue tracker; plan; spawns Pods; rules on escalations |
| Coordinator | Bridge tab, right pane | Low (Haiku) | On demand | Lands work: clean-bar check, rebase order, speculative CI, merge, escalate |
| Pod | Own workspace and worktree | Set per sortie | Spawned by the Captain | One sortie, one pull request |
| Mediator | Headless, cold | High | Per dispute | Writes a brief of a dispute; decides nothing |

Tab 3, the Engine Room, holds long-running processes (Storybook, dev servers) for the main checkout,
not agents. A Pod that needs a preview of its own branch starts one in its own worktree.

Flow (scenario 1): Council → Operator → ship address channel + `send --start` → Captain (judges, files or
updates the issue, opens the work channel, plans, spawns Pods) → Pods work, report on the work
channel, tell the Coordinator "PR ready" → Coordinator lands clean work in order, sends mechanical
failures back to the Pod, escalates judgment to the Captain → Captain accepts, rejects, or asks the
Council, then replans and spawns on what became unblocked.

## Decisions

### Stated by the Council (2026-10-07, in session)

- C1. Each ship is a herdr workspace with three tabs: **Dashboard** (first; main checkout; custom,
  customizable layout; default Operator session left, status UI of issues, PRs, and dashboard
  status right), **Bridge** (Captain left, Coordinator right), **Engine Room** (services such as
  Storybook or websites).
- C2. Tiers: Operator mid (Sonnet), Coordinator low (Haiku), Captain high (Opus).
- C3. The Captain and Coordinator panes start on demand, not with the ship.
- C4. The Council primarily talks to the Operator. The Operator sends a request to the Captain to
  determine freshness, priority, and details; the Captain updates or creates the task in the issue
  tracker and spawns Pods.
- C5. Pods work in their own worktrees and report to the Coordinator, which coordinates rebase and
  review. A pull request that is not clean goes to the Captain for a decision. The Captain approves
  or rejects, adjusts the plan, and spawns Pods on newly unblocked tasks.
- C6. The Coordinator exists because running rebase and merge turns on the Captain's Opus session
  is suspected to be wasteful.
- C7. A Command Center Operator relays requests directly to the target ship's Captain.
- C8. Scenarios to cover: work from the Dashboard, work from the Command Center, a Captain needing
  another ship's work, and Captains in dispute.

### Proposed, to fine-tune

Each is marked **load-bearing** (expensive to unwind once built on) or **cheap** (revisit freely).

- **P1. The clean bar is a command, not a judgment.** *Load-bearing.* `cyberfleet pr clean <pr>`
  computes the four conditions of authority-governance §7, from `gh` (conflict, reviews, CI on the
  merged result) and from the issue's cynapse work channel (the Pod reported the work done); the
  Coordinator acts on its exit status and never decides "clean enough". This is what makes a Haiku Coordinator safe; without
  it the C6 saving becomes a risk.
- **P2. The Coordinator handles mechanical "not clean" itself.** *Cheap.* A text conflict means
  ordering a rebase, and a red CI caused by the pull request goes back to its Pod. Only judgment
  reaches the Captain: scope-changing reviews, semantic conflicts between pull requests, a red that
  survives the Pod's fixes, a bisect culprit, a stuck Pod. This narrows C5's "not clean → Captain",
  because a rebase is the Coordinator's own job under C5.
- **P3. The Captain's "approve" never overrides red.** *Load-bearing.* Accepting decides the
  question that held the pull request (for example, "that review is out of scope; file a follow-up")
  and sends it back through the clean bar. Trunk stays always-green (merge-backstop-governance).
- **P4. The Council's merge delegation names the ship's Coordinator.** *Load-bearing; changes the
  authority model.* authority-governance §7 says only the Operator merges under a delegation, never
  transferably. Amend it so the Operator's announcement says the Coordinator lands the work, and the
  Council's reply delegates to that ship's Coordinator for that request's pull requests.
  **Delivery has to survive an on-demand Coordinator.** The Coordinator is often not running when
  the Council answers, and a restarted session has lost its turns; a copy it reads from the work
  channel is fetched content, which §3 refuses as a claim. So the Operator, which received the words
  in its own session, holds the delegation and records it (the words, the request, and the pull
  requests it covers as Pods attach them) on the work channel as its audit trail. When the
  Coordinator finds a clean pull request it holds no delegation for in its current session, it asks
  the Operator, and the Operator relays the Council's words as a turn (`unit nudge --message`). An
  Operator that no longer holds them asks the Council again. The amended §7 must say a delegation is
  scoped to a request's pull requests, survives the Coordinator's restarts this way, and is spent per
  merge.
- **P5. Two leases per ship.** *Load-bearing.* `service start <project> coordinator` fences merges
  (`service verify` before `gh pr merge`) and the Coordinator's `retired` appends to the graph (P6);
  the Captain's lease fences the tracker and the plan events.
  ADR-0023 §2 gave both to the Captain. cyber-civitas 0002 (leases in the runtime) already allows it.
- **P6. Split mission-graph writes by kind.** *Load-bearing; needs cyber-sdd.* The graph is
  single-writer by design (cyber-sdd ADR-0026; `loops.md` L90). The frontier only grows once a
  landing is retired, so a Captain-only writer means a Captain turn per merge. Recommend: the Captain
  appends plan events, the Coordinator appends `retired`, both under an append lock (git ref
  compare-and-swap with retry). The Coordinator rings the Captain only when `ready` grew.
- **P6a. The Coordinator has its own integration worktree.** *Load-bearing.* Speculative CI on the
  merged result and bisection (merge-backstop §2-3) need a checkout, and the main checkout is shared
  by the Operator and the Captain. The Coordinator works in a dedicated worktree provisioned through
  the runtime (civitas 0003), unless the host's merge queue does the speculation, in which case it
  reads the queue's results instead.
- **P7. Separate address channels.** *Cheap.* The ship address channel (owner Captain) takes
  requests and escalations; a Coordinator address channel takes "PR ready". Pods report progress on
  the issue's work channel.
- **P8. The Operator classifies before relaying.** *Cheap.* Questions are answered by the Operator
  from `cyberfleet missions`, `gh`, and channels, without waking the Captain. Only work goes up.
- **P9. Command Center skips the ship's Operator.** *Cheap.* Matches C7; the extra hop decides
  nothing and is one more place for the Council's words to drift. A request spanning ships goes to
  the ship where it starts, and that Captain invites the other (scenario 4).
- **P10. Cross-ship work is an issue in the other repository, rung by `send --start`.** *Cheap.* Per
  authority-governance §2. The requesting Captain marks its sortie blocked and keeps planning
  everything else. If the dependency is consumed as a published package, the block lifts at the
  release (ratification-class), not the merge.
- **P11. The dispute ladder.** *Cheap to tune, load-bearing in principle.* An arbitration channel
  anchored at the disputed entry (`channel create --anchor`), one position and one rebuttal each,
  then standing rules, then a cold Opus mediator's brief, then the Council. Only the Council's rung
  binds two ships. Standing rules are Council-written; Captains apply them and never widen them.
- **P12. Supersede the layout half of `cyberfleet-stations.plan.md`.** *Cheap.* Its tabs, sender-side
  nudge, and busy-state ideas are absorbed here (slot placement, ring-or-defer). Its warm SDD
  producer stations sharing one worktree under a write lease are a separate question and stay parked
  in that plan.

### Open questions

Each carries a recommendation for the fine-tuning pass, and is marked load-bearing or cheap.

- Q1. **Where do standing rules live?** Candidates: cyberfleet policy files, agent-harness references
  (`.agents/references/`), cyber-truss, or dna relation metadata. *Cheap; not on the critical path.*
  Recommend: agent-harness references, `.agents/references/standing-rules.md` in the repository a
  rule binds, and `~/.agents/references/` for a rule across ships. cyberfleet owns the format;
  authority-governance makes the write path Council-only (a Captain editing one is widening it).
  Defer the format to Phase 3 (item 38); nothing before it reads a rule.
- Q2. **What does the Dashboard's status UI run?** A refreshing `cyberfleet missions`, the cynapse
  GUI, a mission TUI (cyberfleet#4), or something new. *Cheap.* Recommend: the template's default
  right pane runs a refreshing `cyberfleet missions` (no new code), replaced by the mission TUI (#4)
  when it exists. The pane is a template slot, so a Council that wants something else edits its
  layout. #7 (ship blueprint) becomes the template's content.
- Q3. **Pod model tier.** *Cheap.* Recommend: confirm. The Captain sets it per sortie from the
  graph's `modelTier`, defaulting to mid when the node has none.
- Q4. **Who registers the Captain and Coordinator as cynapse participants**, and when? *Load-bearing
  (the key is the identity).* Recommend: the participant is the **role**, not the session, keyed
  from the project's cynapse address and the role (for example `<project-address>/captain`).
  `registerParticipant` is already idempotent on a live key ("the runtime may re-register on every
  start"), so whoever first needs the address registers it — `ship open`, or `send --start` before
  it starts the owner. A session acts as the role while it holds the role's lease; the generation,
  not the participant, tells sessions apart.
- Q5. **Where do Pods' workspaces nest** when the Command Center starts the work? *Cheap.* Mostly
  dissolved by P9 and C4: the Captain spawns Pods, and an interactive Captain sits in its ship's
  Bridge, so nesting under the caller already puts Pods under the ship. It bites only for a headless
  Captain (Q7), which has no pane. Recommend: demote item 18 to "when headless Captains spawn into
  panes", and have the headless Captain spawn Pods with `--at workspace` under the ship explicitly.
- Q6. **Does the existing `operator` owner and mailbox migrate** (ADR-0023 §8) before or with this?
  *Cheap.* Recommend: with the Operator rewrite (item 29), after item 23. Retiring it earlier leaves
  Pod reports with no home until they route through work channels.
- Q7. **The headless variants.** `headless-operator` becomes a headless Captain (ADR-0023 step 5);
  does landing in headless mode get a headless Coordinator, or does one loop do both when no Council
  is present? *Load-bearing.* Recommend: two headless agents, the same split as interactive. One loop
  doing both puts landing back on the high tier, which is the cost C6 is about, and the Coordinator's
  safety comes from `pr clean` (P1), not from who is watching. With no Council present, the headless
  Coordinator merges only under a delegation the Council gave before leaving (P4's record) or a
  standing rule; otherwise it batches the merge as needs-input.
- Q8. **"Operation order".** *Cheap.* Recommend: define it in the fleet glossary as the SDD mission
  graph's Operation, since cyberfleet's "mission" means something else.
- Q9. **What the Captain keeps between sessions.** It starts on demand and exits, and each start is
  a fresh session at a new lease generation. The graph and the tracker hold state, not reasoning.
  *Cheap.* Recommend: each ruling is written where it acts — its rationale as a comment on the issue
  (write-back), and a one-line decision entry (ruling, issue, lease generation) on the ship address
  channel. On start, the Captain rereads its unread address channel, the graph's `ready`, and the
  decision entries since its last generation. Nothing else carries over; a decision that is not
  written down did not happen.
- Q10. **Does cyberfleet call cynapse directly?** *Load-bearing.* Recommend: yes, for channels and
  state records (opening work channels, delegation records, blocked sorties), since the product
  layer may depend on communication; and through cyberlegion only for waking (`send --start`). The
  alternative, every channel call through cyberlegion, puts message meaning in the runtime.

## Responsibilities

The modules' current features and APIs are not fixed. What holds is each module's responsibility;
a missing or awkward capability is fixed in the module that owns it, by changing that module, rather
than worked around in cyberfleet. Every work item below is placed by this table.

| Module | Layer | Owns | Does not own |
| --- | --- | --- | --- |
| **cyberfleet** | Product | Fleet policy: the crew roles and what each may do, the authority rules, triage and landing judgment, the clean bar, the ship template's content, the Council-facing view | Sessions, panes, leases, message storage, the work graph |
| **cyberlegion** | Runtime | Running units: spawn, placement, start-on-demand and leases, stop/restart, presence and busy state, **waking** (the doorbell, including "post then ring"), project identity *as an opaque key* | What a message means; where channels live; who may merge |
| **cyber-mux** | Runtime (substrate) | Driving the multiplexer: workspaces, tabs, panes, layouts, agent status | Which role sits where |
| **cynapse** | Communication | Channels and entries, participants and addresses, membership, read state, state records, project addressing (civitas 0004), write-back records | Waking anyone; calling external stores |
| **cyber-sdd** | Process | The mission graph and its ready frontier, the writer discipline over it, the SDD mission loop | Who in the fleet writes, and when |
| **cyber-truss** | Process | Convergence across artifact-sets: propagation, leash, conflict | Fleet roles |

Two consequences for the plan:

- **Post-then-ring belongs to cyberlegion.** Posting to a channel and ringing its receiver is waking,
  which civitas 0001 gives the runtime. ADR-0023 §4 put it in cyberfleet as a provisional verb `hail`.
  cyberlegion's `send` already rings unless `--no-nudge`; the missing part is starting a receiver
  that is not running. So no new verb: `send --start`. cyberfleet calls it.
- **Opening a ship belongs to cyberlegion over cyber-mux.** Placing sessions into a layout is runtime
  work; cyberfleet supplies the template and the role-to-slot binding.

## Cross-project review

Snapshot as of 2026-10-07. "Built" means usable from a CLI today. A "Missing" entry is a change to
make in that module, not a constraint on the design.

### cyberfleet (0.5.0)

- **Superseded or amended:** ADR-0023 §1, §2, §4, §7, implementation order; ADR-0022 d.8 (one worktree,
  one pane); authority-governance §7 (and §3/§8 for the Command Center relay);
  merge-backstop-governance (loaded by the Coordinator); `agents/headless-operator.md` (landing moves
  out); `skills/operator`, `skills/pod`; `src/missions.ts` (project/sortie rows, ADR-0023 step 6);
  docs `overview`, `operator`, `pod`.
- **Frozen suites to reopen:** `operator/operator.feature` (most), `authority/authority.feature`,
  `pod/pod.feature`, root `spec.md`. Hygiene tied to them: #80, #31, #30.
- **New:** `captain` and `coordinator` personas, agents, spec nodes; a `dispute` node and `mediator`
  agent; CLI verbs `ship open` (wrapping cyberlegion) and `pr clean`.
- **Tracking already open** (all cyberfleet): #24 (topology parent), #25 + PR #93 (Captain ownership), #92 (route
  Captain and Pod mail through cynapse), #26 (Operator as portable entry point — **conflicts** with
  the ship-resident Operator; re-scope), #27 (Command Center integration), #3 and #2 (cross-project
  dependencies and trace), #79 (Operator on Pod ready-to-discharge — becomes the Coordinator's), #83,
  #12, #13 (merge-backstop and graph-writer questions), #35 and #36 (rebase notice, delegation across
  a rebase), #7 (ship blueprint), #4 (mission TUI), #8, #21, #29.
- **Nothing tracks:** the Coordinator, model tiers per role, the dispute ladder, the mediator.

### cyberlegion (1.4.1; cyberfleet pins `^1.0.0`)

- **Built:** `spawn --agent --model --effort --at`, `service start` (carries spawn options; launches
  once under concurrency), `service verify --generation`, `unit nudge [--message]` (with draft guard),
  `unit stop|restart|close`, `project register|list|show`.
- **Missing:**
  - Slot-addressed placement. `--at` is caller-relative only (`pane:right|pane:down|tab|workspace`),
    and `labelFor` refuses non-workspace labels by design. A Command Center cannot place a Captain in
    another ship's Bridge. No issue tracks it.
  - `service stop` (stop the owner and release the lease). Only `unit stop` exists.
  - Busy/idle status: no `unit status`, and `nudge` rings even mid-turn. cyber-mux already has
    `agent status|wait`.
  - Opaque service keys (civitas 0004): `service start` throws on an unregistered project, so a cynapse
    address cannot be the key. ADR-0033 §1 derives the project id from `git --git-common-dir`.
  - A channel-member doorbell and messaging on cynapse: **#153** (stages 1-2 unblocked by cynapse
    0.1.0; stage 3 blocked on cynapse#60). Note #7 is inbox isolation and #20 is a "cyber-apiary"
    stub; earlier notes that cited them for these were wrong.
  - #154: `mail send` stamps another live unit as sender. Fix before authority rides on messages.
- **Verify:** `assertDistinctFromPrimary` may refuse `--cwd <primary checkout>` for Captain and
  Coordinator sessions.

### cyber-mux (0.8.0)

- **Built:** layout templates with named tabs, split trees, per-pane command and env
  (`open --template`, `worktree add --template`; resolved from `.cyber-mux/layouts/` then XDG); herdr
  `tab create` with a label, `tab rename`; `agent status` and `agent wait --until idle|working|...`
  (herdr only); `pane move --tab`.
- **Missing:** applying a template into an existing workspace's named tab; addressing a target by
  workspace and tab label; a stable JSON apply manifest (pane ids, tab labels) for cyberlegion to bind
  roles to panes; configurable nesting of new workspaces. `docs/design/layout-templates.md` is stale
  ("proposed", old naming).

### cynapse (0.1.0 published 2026-10-05; 0.2.0 in PR #59)

- **Built:** participants, address and work channels with owners, keys `subject:<store>:<nativeId>`
  (UUIDv5; a GitHub issue keys by `node_id`), `channel create --member --anchor --convention --wake`,
  `channel resolve`, `entry append|send|list|wait`, `state set|list`, `changes`, a library `Store`.
  The public contract makes key derivation a breaking change, so writing channels under it is safe.
- **Churn ahead:** async `Store` (#71), term renames (#72), CLI verb regroup (#75), export cleanup
  (#78), error codes (#77). Pin `^0.1.0`; expect a call-shape break, not a key break.
- **Bugs that bite this design:** #65 / PR #94 (`unread` omits the owner's own address channel), #69 /
  PR #92 (non-atomic `--member`), #66 / PR #90, #76.
- **Missing:** a CLI to add, list, or remove members after creation (`Store.addMember` exists in the
  library); a documented project → address recipe (civitas 0004 puts it in cynapse; `registerAddress`
  is not idempotent); a recipe for a work channel with no external subject; `cynapse.published`
  write-back (ADR-0011, accepted, not built, untracked); relations across stores (ADR-0010) for
  "blocked by"; a cross-channel ordering view; `--wake` and `--membership fixed` are stored but not
  acted on. Doc `design/status.md` is stale (says 0.0.0).

### cyber-sdd

- **Built:** `mission-graph.mts ready --format json` — deterministic, read-only, callable by a Haiku
  agent; frontier entries carry `operation`, `blast`, `modelTier`, `briefPointer`. Collision ladder,
  touch-set correction, blast estimate.
- **Missing:** a sortie blocked on an external issue (graph is per repository; node ids are local;
  a placeholder `open` node would block `ready` but nothing syncs it); two writers (single-writer,
  diverged refs refused, `sync` fast-forward only); a frontier-growth output.
- **Stale or conflicting:** `.agents/specs/sdd/design/loops.md` L90 and L143 name the Operator as the
  single graph writer; `harness-spawning.md` cites an "ADR-0023" that is a cyberlegion dispatch ADR,
  colliding with cyberfleet's ADR-0023; cyber-sdd explicitly refuses the mission → sortie rename
  (`AGENTS.md` L14), so "SDD-mission is planned for deprecation" is cyberfleet-only intent.
- **Related open:** #84 (domain-plugin judge not resolvable through the dispatch seam), #14 (Command
  Center SDD integration).

### cyber-truss (scaffold; design argued in cyberuni/.github discussion #16)

No code dependency in either direction. Shared ground to align with rather than build on:

- Its **conflict** rule ("a join no state can meet … resolved by decision, not by replay") is the
  Captains-in-dispute stance.
- Its **leash** (a write that removes or reverses a criterion stops for an approver; additions
  proceed) and **pre-approval cascade** match the Captain's escalation and the Council's delegations.
- **cyber-truss#36** proposes keeping the run ledger in a cynapse work channel keyed by subject — the same
  keying cyberfleet's work channels use.
- Parked **"approvers per workflow"** (backlog) is the same question as per-ship authority versus the
  Council; settled rejections include a `blocked` status and per-set declared approvers.

### cyber-civitas

- Layers: Captain, Coordinator, Operator, Pod, Mediator are **Product**-layer policy (cyberfleet);
  leases, spawn, and model flags are **Runtime** (cyberlegion, cyber-mux); channels are
  **Communication** (cynapse). No new layer.
- Decisions to cite: 0002 (P5), 0003 (Pods' worktrees), 0004 (project addresses as opaque keys), 0001
  (doorbell in the runtime).
- `vocabulary.md` and `components.md` lack Coordinator and Mediator; `components.md` lists cyberfleet
  at 0.4.
- **Boards:** the cyber-civitas org has **no GitHub Projects** (GraphQL and `gh project list` both
  empty). Existing tracking is in **cyberuni Project #1 "Command Center"**, which already holds
  cyberfleet #24, #25, #26, #27, #3, #92, #9, cyber-truss #5-#11, cyber-sdd #14, and cyberlegion
  #6-#8. Other cyberuni boards: Project 2 Mission Memory, Project 3 Agent Configuration Testing,
  Project 4 cynapse review.

### dna, agent-harness

dna (draft Datum Network Architecture) matters only if "blocked by" or standing rules become
relation metadata. agent-harness's reference tiers (`.agents/references/`, `~/.agents/references/`)
are one candidate home for standing rules and per-role model defaults (Q1).

## Work breakdown

Each item names its repository and what it waits on. Items within a phase run in parallel.

### Phase 0 — settle and record

1. **ADR-0024** (cyberfleet): ship layout, crew tiers, the Coordinator, P1-P12 as settled; amends
   ADR-0022 d.8 and ADR-0023 §1, §2, §4, §5, §7 and its implementation order. Cites civitas 0002 and
   0004. *Waits on:* fine-tuning.
2. **authority-governance §7 amendment design** (cyberfleet): delegation to the ship's Coordinator;
   the Command Center relay; standing rules as Council-written delegations. *Waits on:* 1.
3. **civitas vocabulary and components** (cyber-civitas): Coordinator, Mediator, cyberfleet version.
4. **File issues** for every Phase 1-3 item without one, cross-link the existing ones, and put them
   on a board (see §Boards). Re-scope cyberfleet #26.

### Phase 1 — foundations in sibling repositories

cynapse:

5. CLI `channel member add|list|remove` over `Store.addMember`.
6. Project → address recipe, idempotent (civitas 0004), documented and tested.
7. Recipe for a work channel with no external subject.
8. Land cynapse PRs #94 and #92; release 0.2.0; announce the async/CLI-rename break (#71, #72, #75).
9. `cynapse.published` write-back entry type (ADR-0011), added to the public contract.
10. Relations across stores for "blocked by" (ADR-0010): names, per-store spelling, a read helper.

cyberlegion:

11. Slot-addressed placement for `spawn` and `service start` (workspace + tab label + pane),
    relaxing `labelFor`. *Waits on:* 16.
12. `service stop` that stops the owner and releases the lease, generation-checked.
13. `unit status` and `nudge --when-idle` (ring or defer) on cyber-mux `agent status`.
14. Opaque service keys (civitas 0004), or `project register --key`. *Waits on:* 6.
15. cyberlegion#153 stages 1-2 (participants, direct sends via cynapse); fix cyberlegion#154.
    Unblocked by cynapse 0.1.0.
15a. `send --start <project> <role> [spawn options]`: post to a cynapse channel, resolve or start its
    owner with `service start`, ring it — the "poster rings" step until the channel watcher (#153)
    replaces it. Replaces ADR-0023's provisional `hail`.
    *Waits on:* 15.
15b. Open a project as a layout: apply a cyber-mux template and start or reserve role sessions in its
    named slots (`ship open` is cyberfleet's wrapper). *Waits on:* 11, 16, 17.

cyber-mux:

16. Apply a template into an existing workspace's named tab; target by workspace + tab label.
17. Stable JSON apply manifest (pane ids, tab labels).
18. Configurable nesting for new workspaces (Q5).

cyber-sdd:

19. Append lock (ref compare-and-swap with retry) and a documented two-writer split by event kind (P6).
20. External blocker on a node (`blockedOn: gh:<org>/<repo>#<n>`) that `ready` excludes.
21. Frontier-growth output (`ready --since <token>` or a before/after diff) for the Coordinator.
22. Fix `loops.md` L90/L143 (Operator → Captain) and the ADR-0023 citation collision.

### Phase 2 — cyberfleet core

23. Depend on cynapse for channels and state records (Q10); route Captain and Pod traffic through
    it (cyberfleet#92, cyberfleet#25 mail half).
24. `cyberfleet ship open <project>`: the ship template's content (Dashboard, Bridge, Engine Room)
    and the role-to-slot binding, handed to cyberlegion's layout open (15b). *Waits on:* 15b
    (degraded mode below until then).
25. Crew addressing: which channel and role each automaton posts to, through cyberlegion's
    `send --start` (15a). *Waits on:* 15a, 23.
26. `cyberfleet pr clean <pr>`: the clean bar as a command (P1).
27. **Captain**: skill, agent, spec node; triage (freshness, priority, details), issue write,
    work-channel open, plan writes, Pod spawn with model per sortie, rulings. Continues #25 / PR #93.
28. **Coordinator**: skill, agent, spec node; loads merge-backstop-governance; integration worktree
    (P6a); landing moves out of `headless-operator`; asks the Operator for the delegation (P4); rings
    the Captain only on escalation or frontier growth. *Waits on:* 2, 19, 21, 26.
29. **Operator rewrite**: ship-resident and Command Center seats; classify, relay, announce the merge
    bar; reopen `operator.feature` (with #79, #12, #13). *Waits on:* 2, 25.
30. **Pod**: report on the work channel; "PR ready" to the Coordinator; reopen `pod.feature`.
31. **authority-governance** implementation of item 2; reopen `authority.feature`.
32. `missions.ts`: group by project, missions over sorties, show Bridge state (ADR-0023 step 6).

**Degraded mode** before items 11, 15b, 16, and 17 land: `ship open` applies the template with
`cyber-mux open --template`, and the Dashboard Operator starts the Captain and Coordinator with
`--at tab` relative to itself. Scenario 1 works; scenario 2 (Command Center placement) does not.

### Phase 3 — across ships and disputes

33. Invitations: issue in the other repository, `send --start` to its Captain, accept/decline/needs-Council replies (cyberfleet#3, cyberfleet#2).
    *Waits on:* 5, 25.
34. Blocked sorties: graph blocker (20) plus a cynapse state record; unblock on landing or on release.
35. Landing rings channel members: poster-rings using 5 until the runtime doorbell (cyberlegion#153) exists.
36. Dispute node, arbitration channel conventions, the bound on exchanges (P11).
37. Mediator agent (headless, cold, high tier) and its brief format.
38. Standing rules: home (Q1), format, the Council-only write path.

### Phase 4 — docs

39. Persona pages (`operator`, `pod`, new `captain`, `coordinator`), `overview`, and the scenario
    pages lose "Proposed design" as each part ships.

### Critical path

ADR-0024 → authority §7 → Coordinator (28), which also waits on the cyber-sdd append lock (19) and
`pr clean` (26) and its integration worktree (P6a). cyberlegion's cynapse stages 1-2 (15) are
unblocked by cynapse 0.1.0 already; they gate `send --start` (15a), which gates crew addressing (25)
and every scenario. cynapse 0.2.0 (8) is not a gate, but its owner-`unread` fix (#94) is needed
before a Captain triages its address channel with `unread`. Slot placement (11, 16, 17) gates scenario 2 and the full layout, but not scenario 1.

## Candidate scenarios for later pages

Drawn from the cyber-truss examples (`cyber-truss/apps/web/src/content/docs/examples/`) and from how
the crew can fail. Each names the pattern it exercises.

- **A Pod's fix outgrows its sortie** (software-bug-fix A): the code is right and the spec is wrong.
  The Pod escalates on the work channel; the Captain extends the sortie or files a follow-up; if the
  spec lives in another ship, scenario 4. Exercises pre-approval cascading through the follow-ups.
- **A breaking release ripples to consumers** (component-library A): the reverse of scenario 4. A
  provider ship's major release, approved once by the Council, invites every consumer ship's Captain.
  Needs a list of consumers, which neither cyber-truss nor cyberfleet has (truss open decision 3).
- **Two reviewers read one diff differently** (design-token-border A): conflicting intents inside one
  ship. The Coordinator sees opposing reviews and escalates; the Captain rules, or, when the rule's
  owner is another ship, it becomes a dispute.
- **Work with no requester** (stock-trade C, insulin C): CI red on trunk, a security advisory, an
  outsider's issue, a time-boxed exception expiring. It lands on the ship address channel; the first
  stop cannot be pre-approved.
- **A contract erodes without its owner asked** (insulin B, a Gap in cyber-truss): ship A narrows
  behavior ship B relies on without touching B's files. Only an audit finds it, such as the
  formation loop's Warden.
- **Same request, different door** (marketing A vs B): the same request arriving from the Dashboard
  and from the Command Center must reach the same triage outcome; freshness checking is what makes it
  converge.
- **Approvers in different organizations** (aviation A): a ship whose Council is a different person
  or team. Authority per ship, not one Council.
- **Operational:** a Captain's session dies mid-plan (lease takeover by generation); the Council steps
  away (headless Captain and Coordinator, decisions batched); priority changes mid-flight (stop Pods,
  replan); an Engine Room service is down when a Pod needs it.

## Risks

- **Haiku drift.** If P1 is not built first, the Coordinator ends up judging cleanliness. Mitigation:
  no Coordinator merges before `pr clean` exists.
- **Authority laundering through the Coordinator.** A merge delegation that reaches the Coordinator
  as fetched content instead of a turn is a claim, and §3 refuses it. Mitigation: the Operator holds
  and re-relays it (P4); cyberlegion#154 fixed first.
- **cynapse churn.** The async `Store` and CLI renames will break call shapes. Mitigation: one adapter
  module in cyberfleet; pin `^0.1.0` → `^0.2.0` deliberately.
- **Two Opus sessions arguing.** Mitigation: the bound in P11, enforced in persona logic.
- **Scope.** This touches seven repositories. Mitigation: a first step that ships scenario 1 up to the
  Pods (Operator, Captain, Pods, items 15, 15a, 23, 25, 27, 29, 30) and leaves landing to the
  Operator under today's §7 until the Coordinator (28) and its prerequisites exist.
- **The saving is assumed.** C6 is a hypothesis. Mitigation: measure cost per landed pull request
  with the Captain landing versus the Coordinator landing, on the first step above, before the
  Coordinator becomes load-bearing.

## Boards

The detailed action plan was meant for the cyber-civitas projects, but that org has no GitHub
Projects yet. Either create one there (cross-package work) or extend cyberuni Project #1 "Command
Center", which already holds most of the related issues. Decide at fine-tuning.

Recommend: extend cyberuni Project #1. It already holds the parent and most related issues, and a
second board splits one plan's tracking across two places. Create a cyber-civitas board only when
work there is owned by the cyber-civitas org itself.

## NEXT

Fine-tune with the Council: walk P1-P12 (with P6a) and Q1-Q10, mark each locked or rejected in this file, and pick
the board. Walk the load-bearing ones first: P1, P3, P4, P5, P6, P6a, Q4, Q7, Q10; then the cheap
ones as a batch. Then write ADR-0024 (item 1) and file the Phase 1 issues in each repository.
