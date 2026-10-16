# ADR-0029: The tracker holds the dependencies; the frontier is a command the Captain calls

## Status

Accepted, 2026-10-16. Completes [ADR-0024](0024-ship-crew.md)'s "the plan lives in the tracker" for
dependencies and merge order.

## Context

ADR-0024 put the plan in the tracker, but the shipped plugin still runs SDD's mission-graph loop:
`headless-operator` pulls the ready frontier from the graph, claims missions on it as the single
writer, spawns a ship per mission, and merges in Operation order. The Operator skill's headless
section, `merge-backstop-governance`, and `authority-governance` describe the same loop. cyber-sdd
documents it as cyberfleet's (`design/loops.md`, cyber-sdd ADR-0026) and waits on cyberfleet before
changing it (cyber-sdd#14).

The mission graph was the store for dependencies between SDD-missions. Its use was to find the leaf
nodes, the work with nothing left blocking it, so that work could start in parallel. In the fleet's
model those SDD-missions are sub-missions or lines of work, and their dependencies are blocking links
between them. SDD is retiring the graph and moving its ledger into cynapse, where its outer loops
read it; that is cyber-sdd's decision, recorded here as context.

## Decision

1. **Dependencies live with the plan.** A blocking link between missions, sub-missions, or lines of
   work is written to the tracker where the tracker supports it and the ship's tracker routing puts
   it there. Otherwise it is a cynapse state record. Each ship has one home for its links, set in its
   tracker routing, so a reader knows where to look. Only the Captain writes them, checking its lease
   before each write. The mission graph is not a fleet state home.
2. **The frontier is a deterministic command.** The work whose blockers are all closed is computed
   from those links by a command the Captain calls directly, with no Coordinator in between. The
   fleet's Captain calls the same command over fleet missions.
3. **Collision checks are tools, the choice is the Captain's.** The deterministic parts (blast
   estimate, node, file, and region collision) are commands. The semantic step needs a model; the
   ship's Coordinator or a cheap sub-agent may run it, and which one stays open. What to start, in
   what order, at what tier, and whether to run two colliding lines in series is the Captain's
   decision, and spawning stays a write fenced by its lease.
4. **Merge order follows the blocking links**, not Operation order. The merge backstop keeps
   speculative CI and bisection of a red batch.

## Consequences

- `headless-operator`, the Operator skill's headless section, `merge-backstop-governance`, and the
  claim and retire step in `authority-governance` are rewritten to the Captain and Coordinator split
  (#25, #26). The headless pair is a headless Captain and a headless Coordinator.
- `src/sdd/read.ts` reads SDD's ledger from files today; it moves to cynapse when SDD's ledger does.
- cyber-sdd#14 can drop the lifecycle loop it attributes to cyberfleet.
- A tracker without links for lines of work, such as GitHub below the sub-issue level, still has a
  home for them: the cynapse state record.
