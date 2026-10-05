---
name: operator-captain-claim
status: active
todos:
  - content: "Reopen root spec.md to draft (rewrites frozen claim scenarios: Clearance pre-authorized by the brief); ledger leash + reopen"
    status: completed
  - content: "Spec: operator/ — claim only when no live presence; mailbox belongs to the claim holder; --home on the init route"
    status: completed
  - content: "Spec gate: cold spec-judge; Council ratification"
    status: completed
  - content: "Impl: operator SKILL.md + README, package readme, docs page; pinning tests if any"
    status: pending
  - content: "Impl gate: cold impl-judge; pnpm verify; changeset; PR (never merge); report to op-cyberlegion"
    status: pending
---

# CR: operator-captain-claim — the standing operator is the command center's captain

Source: a Council brief dispatched to this unit (no issue).

## Problem

The operator skill tells every session that invokes it to `unit claim operator` unconditionally
("last claim wins"). Any project session that dispatches a pod steals the command center's claim
from the long-lived captain session working from `~/code`.

## Design (decided by the Council; not re-litigated)

- The standing `operator` is one long-lived session, the command center's captain. Its standing
  owner record carries a home (`unit register --standing --handle operator --home ~/code`); with no
  live holder, cyberlegion spawns one there on delivery (cyberlegion#155).
- A claim is made once; it holds until another session claims or the holder exits.
- Connect: register under the session's own handle (unchanged). Claim `operator` only when
  `unit claim operator --show` reports no live presence. Otherwise dispatch with the session's own
  handle as return address.
- Reading/acking the standing mailbox is the claim holder's alone.
- Missing standing owner still routes to `init-cyberlegion`; mention `--home`.
- Spawn, watch, clean-bar merge, authority-governance unchanged.
- `--home` and spawn-on-delivery need a cyberlegion release containing #155 (not in 1.3.0). Pins are
  not bumped here.

## NEXT

Spec gate passed (ratified by unional). Implement against the frozen suite, then the impl gate.
