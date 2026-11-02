---
name: operator-standing-merge-delegation
status: active
todos:
  - content: "Design: storage, §1 carve-out, scope rules, harness-guard finding, auto-merge rejected"
    status: completed
  - content: "Reopen root spec.md to draft; ledger leash + reopen lines"
    status: completed
  - content: "Spec: authority/ UC10 record edges + key terms + scenarios; operator/ README + scenarios"
    status: completed
  - content: "Cold spec-judge; fold findings"
    status: completed
  - content: "Impl: authority-governance §1/§6/§7 + README, operator SKILL.md/README, docs page, changeset"
    status: pending
  - content: "Cold impl-judge; pnpm verify; PR as decision-request; shepherd CI"
    status: pending
  - content: "Spec gate (Clearance) and impl gate: Council ratification"
    status: pending
---

# CR: operator-standing-merge-delegation — merge clean PRs under a delegation the Council records once

Source: Council order relayed in a pod brief (no issue). Design:
[`operator-standing-merge-delegation.design.md`](./operator-standing-merge-delegation.design.md).

## Problem

§7 makes every dispatch a fresh decision-request: the Operator announces the clean bar and waits for
the Council's reply before the first merge. The Council wants clean pull requests merged without that
reply on every order.

## NEXT

Spec ALIGNED at round 2 (should-fix items folded). Next: commit the implementation, cold impl-judge, open the PR.
