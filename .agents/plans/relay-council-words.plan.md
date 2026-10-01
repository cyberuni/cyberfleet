---
name: relay-council-words
status: active
todos:
  - content: "Reopen root spec.md to draft (rewrites frozen authority scenarios: Clearance); ledger leash + reopen"
    status: completed
  - content: "Spec: authority/ — decision arrives in the Council's own voice; scope from the Pod's own decision-request"
    status: completed
  - content: "Spec gate: cold spec-judge, then Council ratification (Clearance on the narrowed scenarios)"
    status: completed
  - content: "Impl: authority-governance §3/§8, operator SKILL.md + README, pod skill if it restates the form"
    status: completed
  - content: "Impl gate: cold impl-judge, Council ratification; pnpm verify; changeset; PR"
    status: completed
---

# CR: relay-council-words — relay a Council decision in the Council's own words

Source: in-session Council request (no issue).

## Problem

Operator relayed a Council approval to a Pod wrapped in a four-part envelope ("Council decision,
relayed on a turn by <unit> (Operator). Verbatim: ... Where: ... Scope: ... Do: ... Supersedes ...").
The Pod refused it. The envelope turns a decision into a third-person *claim* that the Council
decided — exactly what the frozen authority suite and SDD ownership already refuse — and its `Do:`
list was the Operator authoring orders the Council never gave (a §2 breach).

## Design (settled with the Council in-session)

- A decision reaches the Pod **in the Council's own voice**: the Council's words, sent as said
  (drop only words addressed to the relayer; add nothing). "Approve" is a complete relay.
- A sentence *reporting* that the Council decided is a **claim**, not a decision (unchanged rule).
- **Scope** comes from what the Council's words answer — the Pod's own outstanding decision-request
  (action, target, revision), narrowed by anything the words themselves say. Words that answer no
  outstanding request and name no action cover nothing.
- **Relayer, scope, quote** go on the work item's thread record (§8), not into the delivered text.
- Coverage is the relayer's pre-send check (§2). Unsure → decision-request to the Council.
- Spent-once, revision-bound, open-PR-never-covers-merge stay.

## NEXT

Landed: spec gate and impl gate ratified by unional; authority.feature frozen; spec status implemented.
Two backlog follow-ups recorded in the ledger and filed as issues. No resume action remains.
