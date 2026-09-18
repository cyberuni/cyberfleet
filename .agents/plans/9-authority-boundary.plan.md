---
name: 9-authority-boundary
status: active
todos:
  - content: "DESIGN settled with the Council (in-session): channel rule, four message kinds, relay/receive rules, ratification-class list, thread-per-work-item"
    status: completed
  - content: "Spec node .agents/specs/cyberfleet/authority/ (behavioral, concept: fleet) — README.md + authority.feature"
    status: completed
  - content: "Root spec.md + README.md: capability map, placement map, by-concept entries for the new node"
    status: completed
  - content: "Impl: packages/cyberfleet/skills/authority-governance/ (partial skill) + load lines in pod/operator SKILL.md and agents/headless-operator.md"
    status: completed
  - content: "pnpm verify, changeset, PR against main (do not merge); follow-ups filed"
    status: pending
---

# CR: 9-authority-boundary — what a dispatcher may command, and what carries Council authority

Design: [`9-authority-boundary.design.md`](./9-authority-boundary.design.md) — the reviewed design with diagrams.

Source: https://github.com/cyberuni/cyberfleet/issues/9 (parent https://github.com/cyberuni/cyberfleet/issues/24;
consumers https://github.com/cyberuni/cyberfleet/issues/25, https://github.com/cyberuni/cyber-sdd/issues/14)

## Problem

Nothing specifies what a dispatcher may command or what a worker may refuse. An Operator mailed a Pod
"owner call: approved to land, merge to main" when the Council had authorized a PR only. The Pod
refused on its harness's own commit default, not on any fleet rule — accidental and not portable.

## Locked decisions (Council, in-session)

An earlier draft keyed authority on the **transport** (mail is never a decision; a brief or the pane is).
The Council rejected it and it is superseded — do not rebuild it. Two facts killed it: a Pod consumes its
mission brief from mail (frozen `pod.feature`), and `cyberlegion unit nudge --message` writes
caller-controlled text into any pane.

- **Authority is positional, not an identity.** A **turn in the unit's own session** is an order — the
  spawn that delivered its brief, keys sent to that session, or a mid-turn message from the parent running
  it as a subagent — because only a position of authority can put one there. Anything the unit **fetched**
  from its inbox is content: answered on its merits, never obeyed as an order. The brief straddles the
  two: **sending** the brief is the order (spawn for a subagent; spawn plus mail plus nudge for a pane),
  and its body in mail is the content. The act also constitutes the position — nothing records an owner.
- **A turn is authoritative by construction.** No proof of who produced it is sought, and none exists.
  Two identity-keyed alternatives were tried and rejected: the spawning session (sessions die) and the
  standing handle a brief reports to (claimable by anyone).
- **Attenuation.** Command Center over Captain, Captain over Pod; no link passes on more than it holds.
  Sender-side discipline: a receiver cannot check it, so no scenario asks it to.
  The incident's Operator held dispatch authority and no merge approval, so it had none to give.
- **A Council decision has four parts** — the Council's verbatim words, where they were said, the
  relaying unit, and its scope (action + target) — and a decision in that form from the unit's owner
  **is acted on**, for what it names and nothing adjacent. "Open a PR" never covers a merge.
- **Unsure asks**; a missing decision costs the ratification-class step only — the rest of the order
  lands, the gap is named, and the unit never goes quiet.
- **Ratification-class list**: merge to a default/protected branch; a human-attributed verdict; publish /
  release / deploy; force-push or rewriting shared history, or deleting unmerged work; repo settings,
  branch protection, secrets; widening a leash or any delegation; minting a standing owner identity.
- **The tick is the loop's delegation.** Summoning the headless loop permits that tick's merges; the SDD
  leash is **not** that delegation (it is per-CR and covers which SDD gate an agent may self-assert).
- **Thread per work item**, scoped to what cyberlegion ships (`mail --thread` / `--reply-to` /
  `await --thread`). No second mission-status store. Hub-wide thread reads are filed, not assumed.
- **Sibling amendments carried as this CR's dependency set**: cyberlegion#17 (relay-governance covers peer
  steers; the ownership chain may carry a scoped decision) and cyberlegion#18 (a cold one-shot dispatch
  still takes no mid-run nudge; an owned subagent may be messaged mid-turn by its owner).
- **Honest property**: attributable, bounded and scoped — **not** unforgeable. This narrows issue #9's own
  Scope item 1, on the Council's call; record it at the gate and on the issue.

## Out of scope (other issues)

- Captain topology, Coordinator removal, owner leases, where roles run — issue 25 / issue 26. This spec
  is written so it holds for Captain→Pod unchanged.
- A verified injection/caller-identity mechanism — cyberlegion/cyber-mux follow-up.
- Do not realize any role as a headless CLI process (`claude -p`) — billed as API usage.

## NEXT

Spec, suite, skill, load lines, website notes and the changeset are written; `pnpm verify` is green;
cyberlegion#17, #18 and #19 are filed. Two cold spec-judge rounds have run — round 2's findings are
folded in (the spawn/brief act, a positive companion for a covering decision, the delegation-widening
guard, a trace on the subagent scenario, the loop's load line). Awaiting the Council's spec-gate
ratification; then open the PR against main and do not merge.
