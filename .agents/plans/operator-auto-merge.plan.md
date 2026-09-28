---
name: operator-auto-merge
status: active
todos:
  - content: "DESIGN settled with the Council in-session: dispatch order delegates merging that dispatch's own PRs; clean-gate; rebase orchestration"
    status: completed
  - content: "Reopen root spec.md (additive) to draft; ledger leash + reopen lines"
    status: completed
  - content: "Spec: authority/ UC10 + CFG edges + map rows + scenarios (additive, stays @frozen)"
    status: completed
  - content: "Spec: operator/ README use cases + table rows + scenarios (additive, stays @frozen)"
    status: completed
  - content: "Spec gate: cold spec-judge, then Council ratification"
    status: completed
  - content: "Impl: operator SKILL.md/README, authority-governance §7, merge-backstop-governance rebase-on-merge, headless-operator"
    status: completed
  - content: "Impl gate: cold impl-judge, then Council ratification; pnpm verify; changeset; PR"
    status: completed
---

# CR: operator-auto-merge — Operator watches the pods it spawns and merges clean work

Source: in-session Council request (no issue). Design: [`operator-auto-merge.design.md`](./operator-auto-merge.design.md).

## Problem

Operator spawns pods and forgets them: nothing tells it to watch their PRs, and merging into the
default branch is ratification-class, so every PR waits on the Council by hand. With several pods,
nothing sequences their merges or tells the others that trunk moved under them.

## NEXT

Landed: both gates ratified by unional; spec and implementation committed and shipped by PR. Two
backlog follow-ups recorded in the ledger and filed as issues. Nothing left to resume.
