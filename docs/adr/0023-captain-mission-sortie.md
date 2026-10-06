# ADR-0023: Project Captains, ownerless missions, and owned sorties

## Status

Proposed, 2026-10-04. Amends [ADR-0022](0022-cyberfleet-persona.md) decisions 2, 3, and 8, and its
Amendment's point 5. Implements the topology of
[cyberuni/cyberfleet#24](https://github.com/cyberuni/cyberfleet/issues/24) and scopes
[#25](https://github.com/cyberuni/cyberfleet/issues/25).

Builds on four cross-package decisions recorded at
[cyber-civitas.github.io/decisions](https://cyber-civitas.github.io/decisions/):
[0001](https://cyber-civitas.github.io/decisions/0001-runtime-depends-on-communication/) (the
runtime depends on communication, never the reverse),
[0002](https://cyber-civitas.github.io/decisions/0002-claims-and-leases/) (claims in cynapse,
leases and presence in the runtime),
[0003](https://cyber-civitas.github.io/decisions/0003-worktrees-through-the-runtime/) (worktrees
through the runtime's adapter), and
[0004](https://cyber-civitas.github.io/decisions/0004-opaque-service-keys/) (opaque service keys,
project addressing in cynapse).

## Context

The current topology has one standing `operator` owner. Operator claims it on connecting (last
claim wins), reads its mailbox, and spawn briefs named it as their return address. Three failures
followed:

- **Reports reached the wrong session.** Session A spawns Pods; session B connects and takes the
  claim; B then receives reports for work it never saw. The return address was moved to the
  spawning session's own handle, falling back to `operator` only when that handle is gone.
- **The fallback inbox filled and nobody read it.** The standing `operator` mailbox held 36 unread
  messages over four weeks (`.research/operator-skill-grill/conclusion.md`), because nothing woke a
  reader for it.
- **Cross-project work has no home.** Work in project A that needs project B means finding B's pane,
  or spawning B's Pod from A and pulling B's mail into A's session.

Three things have changed underneath since ADR-0022:

- cyberlegion's [ADR-0033](https://github.com/cyberuni/cyberlegion/blob/main/docs/adr/0033-project-services-fenced-ownership.md)
  added project services: a durable endpoint, a fenced lease with a generation number, and atomic
  resolve-or-start.
- The messaging layer is moving out of cyberlegion into **cynapse**
  ([cyberlegion#20](https://github.com/cyberuni/cyberlegion/issues/20)). cynapse holds *channels*:
  an address channel per thing that can receive messages, with an owner who triages it, and a work
  channel per unit of work, with members and no owner (cynapse ADR-0012). There is no separate mail.
- cynapse follows [DNA](https://github.com/cyberuni/dna): hierarchy is a view, not identity, and a
  unit of work is a subject that lives in its own store. Work is therefore independent of any one
  repository.

## Decision

### 1. Vocabulary

| Term | Meaning |
| --- | --- |
| **Council** | Unchanged: the human. Authority comes from here and nowhere else. |
| **Operator** | The automaton the Council calls from any session. It connects the Council to a project's Captain or to a specialist. Calling it takes over nothing. |
| **Captain** | One automaton per project, based in the project's default checkout. It owns the project's sorties and triages the project's address channel. |
| **Pod** | A worker automaton carrying out one sortie in its own worktree, owned by exactly one Captain. |
| **ship** | A project. Its home is the default checkout; Pods work in worktrees of it. ADR-0022's "a ship is a git worktree" is retired. |
| **mission** | A piece of work, independent of any repository. It has members and no owner. |
| **sortie** | One repository's share of a mission. It has exactly one owner: that repository's Captain. |
| **SDD-mission** | How a sortie is carried out today, through SDD. Named apart from a mission; planned for deprecation. The sortie stays when the engine under it changes. |

SDD's own skills (`start-mission`, `mission-graph`, ...) live in cyber-sdd and keep their names
until cyber-sdd renames them. This ADR records the plan; it does not edit cyber-sdd.

### 2. A mission is ownerless; a sortie is owned

- A mission usually starts from a prompt or an issue in one repository. Where it started is recorded
  as a relation on the mission and carries no authority. It is not the mission's owner and not its
  identity.
- A mission can span repositories. Its membership changes over time; that is the only part of
  ownership that is dynamic.
- Writes to a repository are never ownerless. Trunk, merge order, the repository's work graph, and
  retirement belong to that repository's Captain alone. Each Captain holds its project's service
  lease (ADR-0033), and graph writes and merges run behind `service verify`, so a stale Captain
  cannot act and two Captains can never both merge into one repository.
- A Pod works in one worktree of one repository, so #24's "exactly one owning Captain per Pod" holds
  unchanged.

### 3. Communication runs on cynapse channels

- **The project's address channel** is owned by its Captain. Requests to the project land there:
  from the Operator, from another project's Captain, from the Council.
- **A mission is a work channel**, keyed by the subject it works on (usually its issue). The Pod,
  the Captain, SDD, and the Council meet in that one channel.
- **A Pod reports in its mission's work channel.** The report lives on the work, not with whoever
  spawned the Pod, so a gone spawner loses nothing. This is what removes the standing `operator`
  fallback.
- **A ship report is composed when it is read**: the address channel plus the work channels related
  to the project. It is never stored, so it cannot drift from mission state, which `missions`
  still derives on demand.
- **Write-back** (cynapse ADR-0011): a decision that changes scope, a `needs-input` state, and a
  milestone are written back to the subject's own store by the Captain, with a `cynapse.published`
  entry linking the two.
- cyberfleet adds **no new dependence on cyberlegion mail.**

### 4. Waking a Captain is the runtime's job, and the poster rings

cynapse does channels only; spawning, nudging, and the doorbell are the runtime's (cross-package
decision 0001). Until the runtime watches channels itself, the poster rings:

1. post to the target's channel;
2. resolve-or-start the Captain (`cyberlegion service start`);
3. if that resolves an owner already live with a pane, nudge it.

One verb, provisionally `cyberfleet hail <project> ...`, does all three so they cannot come apart.
When the runtime-side watcher lands, `hail`'s callers do not change.

An **interactive Captain must be an addressable unit with a pane**, so it can be rung. A
**headless Captain** may be a subagent: it reads its channels on start, acts, and exits, and is
started again rather than rung.

### 5. Spanning repositories is an invitation

1. Work in repository A finds it needs repository B.
2. Someone in the mission hails B: posts to B's address channel, then resolves or nudges B's Captain.
3. B's Captain accepts, declines, or asks the Council.
4. On acceptance, B's sortie runs in a B worktree and reports in the mission's channel, which A reads
   too.

There is no lead Captain. Each Captain decides within its own sortie. Disagreements across sorties
go to an arbitration channel branched from the mission; a standing disagreement goes to the Council.

### 6. Authority attaches to the sortie

A ratification applies only to the sortie it was given for. An approval given in A's sortie does not
reach writes in B, even though both sit in one mission channel. Accepting a sortie commits a
project's resources, so where a project's leash requires it, the Captain answers "needs your
decision" rather than accepting on an invitation's say-so. This is #9's boundary, made concrete.

### 7. Spawning moves to the Captain

Operator spawns no Pods. It resolves or starts a project's Captain and relays to it. The Captain
spawns its project's Pods into worktrees provisioned through the runtime's workspace adapter
(cross-package decision 0003). This reverses ADR-0022 Amendment point 5 ("all spawning is
Operator's").

### 8. The standing `operator` owner is retired

Operator no longer registers or claims a standing `operator` owner, reads its mailbox, or names it
as a fallback return address. Mail already on `operator` stays visible for the Council to reconcile
by hand, and is never silently assigned to a newer session.

## Consequences

### Positive

- A report can no longer reach a session that never saw the work, and can no longer be stranded by a
  spawner that is gone.
- Cross-project work stops being a request with correlation IDs and becomes membership in one
  mission.
- Calling Operator from a working session pulls no other project's mail into it.

### Negative

- The frozen `operator.feature` scenarios on connecting, claiming, and reading the standing owner
  (lines 36-110) must be rewritten, which re-opens the freeze and needs the Council's ratification.
- `cyberfleet missions` changes shape: it lists missions with their sorties per project, not one
  row per worktree agent. That is a breaking output change and needs a changeset.

### Open dependencies

- **cynapse ADR-0012 keying must be built and released** before a Captain writes real channels. The
  key scheme is expensive to undo once a consumer writes under it. cynapse has no release yet.
- **A mission with no external subject** (a prompt with no issue) has no native ID to key a work
  channel on. cynapse needs to decide whether it registers its own address for one.
- **Project addressing moves to cynapse** (cross-package decision 0004); cyberlegion's service lease
  takes the address cyberfleet passes as an opaque key.
- **The runtime-side doorbell**: [cyberlegion#7](https://github.com/cyberuni/cyberlegion/issues/7)
  is re-scoped from delivering service mail to ringing the runtimes of a channel's members.
- **Cross-repository ordering** between sorties (B must land before A) has no home yet. The work
  graph is per repository; the edge likely belongs on the mission as a cynapse state record.

## Implementation order

Each step is its own change, with its own tests:

1. Bump `cyberlegion` from `^0.5.0` to `1.x` for `service start` and stop/restart.
2. A `captain` spec node and skill: acquire the service on start, triage the address channel and
   the work channels it belongs to, spawn Pods into pooled worktrees, write back.
3. Pod: report in the mission's work channel, then hail its Captain.
4. Operator: rewrite the frozen suite down to "resolve the Captain and relay".
5. `headless-operator` becomes a headless Captain.
6. `missions.ts`: group by project, missions over sorties.
7. Migration: legacy `operator` mail stays visible for reconciliation.

Steps 2 to 4 wait on cynapse's keying release (Open dependencies).

## Amendment — the ownership half goes first (2026-10-06)

[#25](https://github.com/cyberuni/cyberfleet/issues/25) was split. Its mail half (report routing in
work channels, the legacy `operator` mailbox) moved to
[#92](https://github.com/cyberuni/cyberfleet/issues/92), which still waits on cynapse. The ownership
half needs no channel, so steps 2, 4, and 5 above land now, cut down to ownership:

1. **The Captain is cyberlegion's `captain` project service.** `cyberlegion service start <project>
   captain --cwd <home>` contacts the healthy owner or starts exactly one, in the default checkout.
   Contacting never takes the lease: no `--force-generation`, no `service handoff` on contact.
2. **Pod ownership is a fenced record, not a label.** The Captain records each Pod it spawns with
   `cyberfleet pod bind`, at the service generation it holds. `pod bind`, `pod adopt`, and
   `pod retire` all run inside cyberlegion's `withOwnership`, so a stale Captain cannot record,
   take over, or retire a Pod, and a Pod is retired once. The record lives in the hub, beside the
   lease it is fenced by.
3. **Recovery is explicit.** `cyberfleet pods` lists a Pod whose Captain session is gone as
   `unavailable` and one whose Captain generation was replaced as `orphaned`. Only `pod adopt` by
   the current Captain moves it. Ownership never moves by contacting a Captain.
4. **The project key is opaque.** cyberfleet stores the key cyberlegion resolved and never parses
   it, so a cynapse project address (decision 0004) drops in without a rewrite.
5. **Interactive and headless share the lease.** A headless lifecycle tick dispatches only while
   it holds the project's `captain` lease, and runs every claim, merge, and retirement behind
   `cyberlegion service verify`. A healthy interactive Captain therefore stops a headless tick from
   dispatching, and the reverse.
6. **Until the mail half lands**, a Pod still reports by cyberlegion mail to the handle its brief
   names, which is now its Captain's. Point 8 (retiring the standing `operator` owner) moves with
   the mail half to #92.

Pooled worktrees (#25's amendment) wait on
[cyber-mux#151](https://github.com/cyberuni/cyber-mux/issues/151); each Pod still gets a fresh
worktree from `cyberlegion unit spawn`.

## Related Decisions

- [ADR-0022](0022-cyberfleet-persona.md) — the persona layer this amends.
- [cyberlegion ADR-0033](https://github.com/cyberuni/cyberlegion/blob/main/docs/adr/0033-project-services-fenced-ownership.md)
  — the fenced service lease each Captain holds.
- cynapse ADR-0010 to ADR-0012 — subjects across stores, store only what has no other home, and
  channels keyed by subject.
- [cyber-civitas decisions](https://cyber-civitas.github.io/decisions/) — the cross-package rules
  cited above.
