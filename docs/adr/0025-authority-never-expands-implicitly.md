# ADR-0025: Authority never expands implicitly, and a Captain re-relays recorded grants

## Status

Accepted, 2026-10-13. Amends [ADR-0024](0024-ship-crew.md) §5 and
[ADR-0023](0023-captain-mission-sortie.md) §6. The resulting design is in
[`design/authority.md`](../../.agents/specs/cyberfleet/design/authority.md).

## Context

ADR-0023 §6 attached authority to the sortie: an approval given in ship A's sortie does not reach
writes in ship B, even within one mission. ADR-0024 §5 carried that into merge delegation: a child
of an epic in another ship never inherits the delegation, and a Coordinator holds any merge it
cannot quote the Council's words for from its own turns.

Two things follow that the Council does not want:

- The Council cannot grant authority over a whole mission. It has to approve each ship's sortie
  separately, even when it already knows it wants the whole epic landed.
- A grant cannot outlive the session that received it. A mission runs for days, through
  Coordinators started after the Council spoke and sessions restarted after a crash or compacted
  past the quote. Under ADR-0024 §5, each of those asks the Council again.

The property the sortie rule protected is narrower than the rule: an automaton must never act beyond
what the Council granted. Where the grant's edge falls is the Council's choice, not a fixed unit.

## Decision

1. **Authority never expands implicitly.** The Council grants at the scope it chooses: a mission, a
   sortie, or one action. A grant covers what its words cover and nothing beyond. This replaces
   ADR-0023 §6's fixed sortie boundary.
2. **A mission grant reaches every ship.** A child sortie in another ship is covered when the grant
   names the mission and the child's work is within its words. ADR-0024 §5's "a child in another
   ship never inherits the delegation" holds only where the grant was for a sortie.
3. **Pre-approval.** The Council can cover work that does not exist yet by setting a bound. The
   Captain judges whether new work falls inside it and records each use with the bound it fell
   under. Work outside the bound goes to the Council.
4. **A Captain re-relays recorded grants.** The unit that receives the Council's words records them
   in a decision entry on the work item's channel. A Captain passes a recorded grant, verbatim from
   that entry and as a turn, to a unit in its own ship that started after the Council spoke, and
   answers for it. A Coordinator never re-relays to itself.
5. **Without a grant, the work keeps moving up to the step that needs one.** In-scope work proceeds
   to the held step and stacks dependent work on it; out-of-scope work is filed but not started; the
   Captain batches its decision-requests by how much each answer unblocks.

## Consequences

### Positive

- The Council can approve a whole epic once, across ships.
- A grant survives restarts, lease takeovers, and compaction without asking the Council again.
- The Council's absence holds only the steps that need it, not the work around them.

### Negative

- Re-relay loosens the rule that recorded content never carries authority. A Captain turns a record
  back into a turn on its own judgment. A wrong re-relay is attributable, not prevented; nothing in
  the fleet stores a grant an agent cannot edit until cyberlegion#10 lands.
- Pre-approval adds a judgment call per use. Its accuracy depends on the Captain, and is checked
  only by the Council reviewing the recorded uses.
- The `authority/` capability spec and its frozen suite change. That waits until the design is vetted.

## Related Decisions

- [ADR-0023](0023-captain-mission-sortie.md) §6 — the sortie boundary this replaces.
- [ADR-0024](0024-ship-crew.md) §5 — merge delegation, amended here.
