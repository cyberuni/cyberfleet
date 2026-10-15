# ADR-0026: One noun for work in flight: the mission

## Status

Accepted, 2026-10-15. Amends [ADR-0023](0023-captain-mission-sortie.md) and
[ADR-0024](0024-ship-crew.md) wherever they split work into a sortie and a mission. The resulting
terms are in the [glossary](../../.agents/specs/cyberfleet/glossary.md).

## Context

ADR-0023 named two kinds of work in flight. A **sortie** was an issue in flight in one repository,
and a **mission** was an epic in flight across sorties. An issue became a mission only through
**promotion**, or when the work crossed a repository boundary.

The split cost more than it gave:

- Every incoming request raised the question of whether it was a sortie or a mission. The answer,
  "a sortie until promoted", was a rule the Council had to learn.
- Every operation that applies to both needed two forms. Blocking is one: a mission can block
  another mission as well as a sortie can, and naming only one invites a second command later.
- Breaking a mission down so a finer piece can unblock sooner is an optimization. The split made
  the Council think about it for every piece of work.

The tracker has no such split. On GitHub an epic is an issue with sub-issues.

## Decision

1. **A mission is an issue in flight.** It starts when its ship's Captain takes the issue in, and
   lives as long as its issue. It lands as one or more pull requests.
2. **A mission may have child missions, in any ship**, as the tracker's sub-issues. A child is a
   mission like any other, owned by its own ship's Captain. Adding children replaces promotion.
3. **Work that crosses a repository boundary is a child mission** in the other repository. The
   rules for it are unchanged from ADR-0024: the fleet's Coordinator files the child and rings that
   ship's Captain, which accepts it, declines it, or asks the Council.
4. **Blocking works at any level.** A mission is blocked on an issue. Blocking a child rather than
   its parent, so the parent's other work goes on, is available and never required.
5. **Grants keep ADR-0025's rules on one noun.** A grant names a mission, or one action. A grant on
   a mission covers its children, in any ship, within its words or a pre-approval.
6. **"Sortie", "epic" as a fleet term, and "promotion" are retired.** "Epic" stays only as a
   tracker's own word.
7. **SDD's run is an "SDD-mission".** One run of SDD's change-request loop is always written
   `SDD-mission`, never "mission", in cyberfleet. A rename on SDD's side may follow.

## Consequences

- One mission channel per mission replaces the sortie channel and the mission channel. A parent's
  channel carries only what crosses its children: the plan, blockers, invitations, and the
  delegation record.
- The CLI acts on one noun: `cyberfleet mission ...` covers what `sortie` and `epic` commands would
  have split.
- The shipped skills and spec nodes use "mission" in SDD's sense. They move to `SDD-mission` when
  each is next rewritten, not in this change.
- "Mission" is a common word, which is why it wins over "sortie". The cost is a collision with
  SDD's term, carried by always qualifying SDD's as `SDD-mission`.
