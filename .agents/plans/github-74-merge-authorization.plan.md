---
name: github-74-merge-authorization
status: active
todos:
  - content: "Reopen root spec.md (rewrite, narrowing) to draft; ledger leash + reopen lines"
    status: completed
  - content: "Spec: authority/ UC6 + UC10 + key term + CFG edges E41–E45 + map rows + scenarios"
    status: completed
  - content: "Spec: operator/ README + scenarios (announcement, wait for approval, refused merge, headless hold)"
    status: completed
  - content: "Impl: authority-governance §3/§6/§7 + README, operator SKILL.md/README, headless-operator, docs page, changeset"
    status: completed
  - content: "Cold spec-judge (ALIGNED round 3) and impl-judge (pass); pnpm verify; PR #76"
    status: completed
  - content: "Spec gate (Clearance — narrowing) and impl gate: Council ratification"
    status: pending
---

# CR: github-74-merge-authorization — a merge delegation the harness recognizes

Source: [cyberfleet#74](https://github.com/cyberuni/cyberfleet/issues/74).

## Problem

The Operator treated the Council's dispatch order, and the headless loop treated its summons, as the
delegation to merge clean pod pull requests. Claude Code auto mode's `soft_deny` rule **Merge Without
Review** accepts only a user's own message asking for the merge, so the merge stalls or is denied, or
the Operator proceeds on a delegation the harness does not recognize.

## Settled behavior (from the issue)

- **Preferred:** on dispatch, the Operator announces it will merge each of the order's pull requests once
  clean. The Council's reply, in its own words, is the standing delegation. An order that itself asks for
  those merges is the same delegation.
- **Otherwise:** with no reply, a reply that is unclear for this merge, or one that holds it back, the
  Operator holds the pull request and asks for that merge (or reports it held, when the Council already
  held it back), and waits.
- A merge the harness refuses is never retried or worked around; it is held and raised.
- **Headless:** being summoned is not the delegation. Unless the summons carries the Council's own words
  authorizing the tick's merges, the loop holds each merge, leaves the mission unretired, and batches a
  decision-request up its relay (or the owner inbox when frameless).

## NEXT

Both gates wait on the Council: the spec gate needs Clearance for the narrowing rewrite of frozen
authority and operator scenarios. Then ratify the impl gate and merge the PR.
