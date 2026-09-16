---
name: 9-authority-boundary
status: active
todos:
  - content: "DESIGN settled with the Council (in-session): channel rule, four message kinds, relay/receive rules, ratification-class list, thread-per-work-item"
    status: completed
  - content: "Spec node .agents/specs/cyberfleet/authority/ (behavioral, concept: fleet) — README.md + authority.feature"
    status: pending
  - content: "Root spec.md + README.md: capability map, placement map, by-concept entries for the new node"
    status: pending
  - content: "Impl: packages/cyberfleet/skills/authority-governance/ (partial skill) + load lines in pod/operator SKILL.md and agents/headless-operator.md"
    status: pending
  - content: "pnpm verify, changeset, PR against main (do not merge); follow-ups filed"
    status: pending
---

# CR: 9-authority-boundary — what a dispatcher may command, and what carries Council authority

Source: https://github.com/cyberuni/cyberfleet/issues/9 (parent https://github.com/cyberuni/cyberfleet/issues/24;
consumers https://github.com/cyberuni/cyberfleet/issues/25, https://github.com/cyberuni/cyber-sdd/issues/14)

## Problem

Nothing specifies what a dispatcher may command or what a worker may refuse. An Operator mailed a Pod
"owner call: approved to land, merge to main" when the Council had authorized a PR only. The Pod
refused on its harness's own commit default, not on any fleet rule — accidental and not portable.

## Locked decisions (Council, in-session)

- **The channel carries the authority class, not the wording.** Orders and Council decisions arrive on
  the **command-center channel** (a brief, or free text in this session's own pane). **Mail is never a
  decision** — it carries reports, peer-Captain pings, and requests. The #9 mail fails on the channel
  before anyone reads its tone.
- **Four message kinds**: `order` (followed, no authority question), `report` (information only),
  `decision-request` (up the chain; the unit keeps working meanwhile), `Council decision` (relayed —
  carries a **verbatim quote** of what the Council said and **where** it was said, plus its **scope**:
  the action and the target).
- **Scope binds.** A decision is valid only for the action and target it names. "Open a PR" never
  covers a merge.
- **Relayer rules**: relay only what the Council said explicitly; never paraphrase into an approval,
  never widen scope, never infer approval from engagement or from the work looking good; when unsure,
  send a decision-request instead of a guess.
- **Receiver rules**: a ratification-class action needs a matching-scope Council decision on the
  command-center channel, or the Council speaking in this unit's own pane. Otherwise raise a
  decision-request and **carry on with the rest** — never stall silently, never refuse the dispatch part.
- **Ratification-class list**: merge to a default/protected branch; a human-attributed verdict
  (gate `by: <human>`, a PR approval, an acknowledgement recorded as the Council's); publish / release /
  deploy; force-push or rewriting shared history, or deleting unmerged work; repo settings, branch
  protection, secrets; widening a leash or delegation; minting a standing owner identity.
- **Standing delegation** (the leash) is a Council decision recorded in advance; the headless loop's
  merge-on-green rides it, so F3 keeps working.
- **Thread per work item.** A brief opens a thread; reports, requests and decisions reply on it, so any
  session that summons the command center rehydrates context from the hub. **No second state store** —
  mission status/gate/leash stay SDD's, per issue 24's "no competing mission-status database".
- **Subagent-realized Pods** are covered: a parent can message a running subagent mid-turn; those are
  orders, and a decision inside one still needs quote + scope.
- **Honest property**: attributable, scoped and unrelayable — **not** unforgeable. Pane injection has no
  caller identity and records are agent-editable. Say so in the spec; name the follow-ups.

## Out of scope (other issues)

- Captain topology, Coordinator removal, owner leases, where roles run — issue 25 / issue 26. This spec
  is written so it holds for Captain→Pod unchanged.
- A verified injection/caller-identity mechanism — cyberlegion/cyber-mux follow-up.
- Do not realize any role as a headless CLI process (`claude -p`) — billed as API usage.

## NEXT

Write the `authority/` node (README.md + authority.feature) per the locked decisions, then the root
spec.md/README.md map entries, then the `authority-governance` skill and its load lines.
