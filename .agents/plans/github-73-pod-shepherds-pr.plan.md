---
name: github-73-pod-shepherds-pr
status: active
todos:
  - content: "Draft: Pod shepherding, thread resolution, ready-to-discharge; Operator brief knobs; §3 named decision"
    status: completed
  - content: "Rebase over github-74-merge-authorization; reconcile §3, add the §7 pod carve-out and its scenarios"
    status: completed
  - content: "Reopen root spec.md to draft; ledger leash + reopen lines; plan brief + combat log"
    status: completed
  - content: "Round 1 spec-judge FAIL; revert the §3 rule; redrive to the pod's own merge offer (§7); fold findings"
    status: completed
  - content: "Spec-judge rounds 2-3 FAIL (pre-flight, then builder/architect); cap hit, Council chose retry"
    status: completed
  - content: "State the readiness and merge rule in closed form; rederive the shepherd scenarios; judge round 4"
    status: completed
  - content: "Rounds 4-5 ALIGNED; fold the offer-lapse rule and the round-5 notes"
    status: completed
  - content: "Spec gate (Clearance — operator brief scenario rewrite): Council ratification in-session"
    status: completed
  - content: "Cold impl-judge pass (second run, after one fold); pnpm verify"
    status: completed
  - content: "Impl gate: Council ratification in-session; three backlog follow-ups recorded in the ledger"
    status: completed
  - content: "Push; shepherd PR #75 to green; report on the brief's thread"
    status: completed
---

# CR: github-73-pod-shepherds-pr — the Pod shepherds its PR to green

Source: [cyberfleet#73](https://github.com/cyberuni/cyberfleet/issues/73). PR #75.

## Settled behavior

- After opening a PR or MR, Pod watches the head pipeline (12 minutes per turn by default, three fix
  pushes on the same red check), re-runs a flaky failure once, and fixes failures its change caused.
- It triages every review comment, bots included: fix (one verified commit), discard (with evidence),
  or escalate (design, scope, API, conflicting human request). It replies in each thread, resolves the
  fixed threads and the discarded bot threads, and leaves the rest open.
- It reports the CI result and each finding, then tells its spawner it is ready to discharge once the
  work is done, and again after a merge on its own offer.
- The Operator brief carries the knobs: shepherd, the per-turn timeout, and which threads to resolve.
- When ready to discharge, the Pod offers the Council, in its own session, to merge its PR at the head
  commit. The offer is a decision-request; the answer is a decision under the standing §3, and §7 gains
  the pod exception (not a transfer). The offer lapses when readiness is lost; a push means a new
  offer once the new head is ready. §3 is unchanged.

## NEXT

Landed: spec and impl gates ratified by unional in-session; the spec is `implemented`. Merging PR #75
is the Council's call. Three backlog follow-ups are recorded in the ledger. Nothing left to resume.
