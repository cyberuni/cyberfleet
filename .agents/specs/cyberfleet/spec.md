---
status: implemented
project-path: packages/cyberfleet
approval:
  spec:
    verdict: approve
    by: unional
    cause: clearance
    why:
      floor: clearance — pre-authorized in-session by unional, scoped to meaning-preserving vocabulary renames only. align-spec classifies the CR as `narrowing (clearance)` because its scenario-diff is title-keyed and cannot distinguish a rename from a deletion; all reworded scenario titles read to it as removals (13 at the time of this gate, 11 in the final diff after the voice-bar retraction). The re-open of the @frozen suite was separately ratified by unional before the file was touched (ledger `kind: reopen`).
      blast: medium — one behavioral node (.agents/specs/cyberfleet-plugin/operator/) rewritten in place plus three collateral rename sites (this spec.md placement rule, the project README node index). No mechanism, no CLI, no sibling package, no other persona node touched. The implementation (plugins/cyberfleet/skills/operator/, agents/headless-operator.md, the plugin + marketplace manifests, the website cyberfleet docs) still carries the retired vocabulary by design and lands in this CR's deliver phase, so the spec is deliberately ahead of the impl at this gate.
      novelty: low — no mechanism added or changed. `cyberlegion unit register` under this session's own handle, `unit claim operator` unconditionally, `mail inbox --owner operator --unread`, and `mail read --owner operator --ack` are all untouched; every cyberlegion command string in the suite is byte-identical to HEAD. The change is the vocabulary the node uses to describe them. A voice-bar tightening authored mid-mission was retracted before merge (see note).
      confidence: high — three cold ACED spec-judge rounds, converging: R1 ALIGNED false (architect + builder, 3 blocking), R2 ALIGNED false (architect, 1 blocking — a list-structure regression the conductor's own scripted rewrap introduced), R3 ALIGNED true on all three lenses with no blocking finding. Meaning-preservation — the CR's central risk — was verified mechanically by the judge, not taken from the producer: 41 scenarios in / 41 out with 0 added, removed, merged, or split; every `cyberlegion` command string extracted two independent ways and diffed clean against HEAD; 7 of the 11 reworded scenarios carry byte-identical Then blocks and the other 4 changed only a noun inside an otherwise identical assertion (figures restated after the voice-bar retraction; they read 9 of 13 while that tightening was in); step count unchanged at 130 after the voice-bar tightening was retracted. Coverage maps 1:1 both directions (13 Subject bullets → 16 table rows → 41 scenarios, no orphans). Five of six `check:spec` checks green; align-spec fails only on the title-keyed Clearance signal above, which clears once committed since it diffs against HEAD.
      note: the anti-probe invariant (ADR-0022 amendment item 3) was the CR's chief risk — the retired noun "seat" carried it implicitly. It is now stated as an explicit rule in the Feature narrative ("The connection is asserted by invocation, never by a probe") plus two @behavior scenarios, the node README, and this spec's placement map. The judge graded it preserved and strengthened. A voice-bar tightening was authored in this CR and then RETRACTED before merge on unional's call. It was the only behavior change in a vocabulary CR, it needed an explicit carve-out from the Clearance in every record, and it took two attempts to get right (the first banned a conforming terse acknowledgment; the fix for that introduced an over-broad carve-out). The bar was also inferred from a one-line instruction rather than specified. It is deferred to its own CR where it can be specified and calibrated in both directions. What remains of it here is vocabulary only: the @quality scenario title no longer names the retired place-noun. Its three original Then clauses are byte-identical to pre-CR.
      leash: auto-none — user-set at run start. Not self-asserted; ratified in-session by unional holding the user channel.
      cr: operator-command-center-vocab
  impl:
    verdict: approve
    by: unional
    cause: dimension
    why:
      floor: none — the Clearance floor was engaged and discharged at the spec gate; the implementation narrows nothing.
      blast: low — three shipped agent-configuration files (plugins/cyberfleet/skills/operator/SKILL.md + README.md, plugins/cyberfleet/agents/headless-operator.md) and two published website pages. No code, no CLI, no other persona node. The plugin and marketplace manifests needed no change — they already described Operator as the command center, which is the term this CR keeps.
      novelty: low — no mechanism added or changed. The implementation renames the vocabulary it uses to describe mechanisms that already ship. The voice-bar tightening authored mid-mission was retracted before merge and deferred to its own CR.
      confidence: high — cold SDD impl-judge IMPLEMENTATION_PASS true, blocker null, over all 41 frozen scenarios with @trigger accuracy 9/9. Judged inline in a single context with no fan-out, so every cell rests on what that judge personally observed. It re-verified rather than carried prior reports: `pnpm verify` re-run first-hand at 29/29; every backtick command span extracted at HEAD vs working tree, normalized and diffed as multisets rather than line-scoped to defeat re-wrap artifacts, confirming zero mechanism drift; retired-term grep re-run across plugins/cyberfleet and the cyberfleet website docs at zero hits; an absorption read over all 41 Givens finding no trigger-example apparatus leaked into the implementation. Both known recurrence sites came back clean — the fail-soft no-multiplexer guard and the fail-loud missing-owner guard are visibly distinct and labeled in both files (clearer than the retired wording), and headless-operator.md's "no seat to serve" to "no human channel to serve" preserves the referent because "human channel" was already established earlier in that same document.
      note: the first impl-gate attempt failed on transport rather than judgment. The ACED impl-judge fanned out 15 blind two-pass case-judge runs; every run completed its protocol correctly but none could address its parent, so all 15 verdicts surfaced to the conductor and the judge correctly returned undetermined rather than emit unobserved cells. Those 15 runs were unanimous (8 of 9 trigger rows, 3 of 3 rubric runs at 9/9 / 8/9 / 9/9, 3 of 3 voice runs) but were deliberately NOT relayed back into the judge or folded into this gate — a verdict couriered by a third party is not a self-observed verdict. They are retained in the ledger as corroborating evidence only. This verdict rests solely on the inline judge's own reading. The harness defect is filed as a follow-up.
      leash: auto-none — user-set at run start. Not self-asserted; ratified in-session by unional holding the user channel.
      cr: operator-command-center-vocab
---

# cyberfleet — the fleet layer over cyberlegion

> Root project spec — the **descriptive** top index for the `cyberfleet` package
> (`packages/cyberfleet`). The package is both the npm CLI and the agent plugin root, so this one
> project covers both halves: the deterministic `cyberfleet` CLI and the fleet & crew personas that
> reach for it. The spec stays **central** (`.agents/specs/`) rather than co-located in the package,
> which keeps it out of the installed plugin and inside the `.agents/specs/` scan that
> `cyberfleet missions` reads. The two halves were one project, split by `split-cyberfleet-spec`,
> and merged back when the plugin moved into the npm package.

## What this is

The `cyberfleet` **CLI** turns the metaphor-free `cyberlegion` mechanism (spawn a session, carry
mail, identify peers) into a **fleet** view: ships, missions, and the Council. It **depends up** on
`cyberlegion` — the harness-agnostic, MCP-free primitive that owns session lifecycle, the file
mailbox, identity/registry, and hook surfacing. cyberfleet adds nothing to that mechanism; it wraps
it in the fleet's own operations.

The `cyberfleet` **plugin** ships the **persona layer** of the fleet: the agent-behavior that decides
*when* and *how* an agent reaches for the fleet, recruits or discharges a crew, and builds or
re-tunes an automaton. Every persona node is a per-situation gateway skill (ACED carries all four
eval layers — activation and judgment). Each persona offloads its mechanics to a CLI — `cyberlegion`
for identity, mail, and spawn; `cyberfleet` for missions — and keeps its voice only in what it says
around them. Where a mechanic belongs to neither (the merge backstop's `gh`/git/CI), it is offloaded
to that tool, never re-implemented.

A **ship** is a working session an agent runs a mission in. It is **not** a marked directory: there
is no on-disk ship marker and no mode detection (#225 — `init`/`mode` deleted; the marker gated no
capability and its only reader was the command that reported it). A session's fleet membership is its
`cyberlegion unit register` record, which is what `missions` actually enumerates — the registry is
the only membership fact, and there is no second one on disk. **Command-center** survives only as the
Operator persona's connection, asserted by invoking that skill; it is not a detectable state of a
folder. **Fleet** (a group of ships) is a deferred concept — undefined until an operation needs to act
on one.

Every dependency is **by intent** (ADR-0021). The CLI imports `cyberlegion` as a library for its own
verbs and does **not** re-expose the mechanism verbs — that duplication is exactly what the extraction
removed. The personas run register / send / spawn / inbox against the `cyberlegion` CLI, the missions
view against the `cyberfleet` CLI, and the Tavern query / define-agent / manage-model-runners for the
crew personas — never by an exact command slug. The dependency is one-way: neither CLI knows
anything of the personas.

## What the CLI owns (fleet verbs)

Only the verbs with genuine fleet logic live here — everything else is `cyberlegion`'s:

| Verb | What |
|---|---|
| `cyberfleet missions` | the Council view — ships × mission × gate × leash, **derived from SDD state** (the one place cyberfleet reads SDD) |
| `cyberfleet jump <peer>` | select/focus a ship's session (tmux pane), or print its worktree path to `cd` into |
| `cyberfleet pause <peer>` | flip a ship record to `status: paused` — a marker only (**not** a bridge to SDD's `pause-mission` checkpoint; that gap is flagged, never papered over) |
| `cyberfleet gate approve` | **stubbed** — a human ratification cannot be safely relayed through this CLI (the relayed-ratification seam); it prints what it would write and exits non-zero |

## Where the mechanism went

The identity / messaging / session-spawn / decommission / surfacing behaviors were **extracted into
`cyberlegion`** (`packages/cyberlegion/.agents/spec/` — nodes `identity`/`mail`/`session`/
`surfacing`, plus `dispatch`/`wake`/`agent`). Those are the canonical, frozen behavioral scenarios
now; cyberfleet no longer owns or re-describes them.

## Capability map

| Folder | Type | What |
|---|---|---|
| [`pod/`](./pod/README.md) | behavioral | the **Pod** persona — the ship's bridge: greet, clear inbox, run the mission, hail crew, HAL tell; no precondition, no probe; never spawns |
| [`operator/`](./operator/README.md) | behavioral | the **Operator** persona — the command-center dispatcher: any spawn, list the fleet, route messages, prune dead ships |
| [`recruitment/`](./recruitment/README.md) | behavioral | the **Crimp** persona — recruit/discharge crew types from the Tavern (browse, install, register; uninstall, retire) |
| [`mechanic/`](./mechanic/README.md) | behavioral | the **Mechanic** persona — build a new automaton or adjust an existing one's program (governance/model/effort/leash), re-chip its loadout, hot-swap the unit |
| [`authority/`](./authority/README.md) | behavioral | the **authority governance** — the dispatch-vs-ratification seam every dispatching and executing persona loads: the owner's act is the authority, no link passes more than it holds, and a Council decision carries quote, place, relayer and scope |

The CLI verbs have no nodes yet — see the backfill gap below.

## Placement map

Where a new concept lives — slot here, do not invent placement:

- **a new bridge behavior** (mission entry, inbox etiquette, hailing crew, the HAL tell — anything
  Pod does while working a ship) → `pod/` (the Pod persona).
- **a new fleet-level dispatch behavior** (**any** spawn, list the fleet, route between ships, prune
  — anything the Council calls Operator for) → `operator/` (the Operator persona).
- **a "which persona am I" concern, a ship-commissioning or mode-detection operation** →
  **nowhere — the concept is retired** (#225). Neither persona probes its folder. Operator connects
  to the command center by invocation; Pod is reached by the Council's ask. There is no ship marker
  to write or read and no ship-vs-command-center state to report. Do not reintroduce a location
  check in either node, or an on-disk marker without a consumer that genuinely gates on it.
- **a new rule about what a dispatcher may command, or about what carries Council authority**
  (who may order whom, what a relayed Council decision must carry, a scope-binding rule, an addition
  to the ratification-class list, a thread-correlation rule) → `authority/` (the authority governance). It is persona-independent by
  design: Operator, Pod, the headless loop and a future Captain load the same node, so a rule written
  into one persona's own node instead is a rule the next dispatcher will not carry.
- **a new crew-acquisition persona behavior** (recruit/discharge a crew type — browse the Tavern,
  install/register, uninstall/retire) → `recruitment/` (the Crimp persona).
- **a new automaton-workshop persona behavior** (build a new automaton, or adjust an existing one's
  program — governance/model/effort/leash — re-chip its loadout, hot-swap the unit) → `mechanic/`
  (the Mechanic persona).
- **a new Council/mission-view CLI operation** (joining ships to SDD mission/gate/leash state) → the
  `missions` surface — the only place cyberfleet reads SDD — as a new CLI node when backfilled.
- **a new ship-navigation CLI operation** (focus a pane, resolve a worktree path) → the `jump`
  surface, as a new CLI node when backfilled.
- **a new identity / message-queue / peer-launch / hook-injection / dispatch / wake operation** →
  **not here** — that is the `cyberlegion` project (`packages/cyberlegion`). cyberfleet depends up on
  it.
- **a fleet-level operation over a group of ships** (act on a particular fleet) → **deferred** — the
  **fleet** grouping (which ships form a fleet) is not defined until the first such verb needs it.
- **a cross-capability persona e2e** (spans ≥2 persona nodes) → this project's own e2e; a future
  `acceptance/` node may formalize it.

The nesting rule: capabilities at the top; any layering nests *inside* a capability, never as a
top-level folder. A node is `<capability>` and never nested. Two cross-cutting concerns run through
the persona nodes (see the by-concept index below): `fleet` (the session-coordination personas — pod
and operator) and `crew-ops` (the crew-operations personas that recruit and tune **crew** —
recruitment (Crimp) and build+tune (Mechanic)). Note the distinction: a **crew** is a recruited
specialist automaton (what Crimp signs on from the Tavern); `crew-ops` is the concern of *operating
on* crew, not the crew itself.

## Backfill gap (known)

Every CLI verb — `missions` / `jump` / `pause` / `gate approve` — is **implemented** (in
`src/cli.ts`, `src/missions.ts`, with smoke coverage in `src/cli.test.ts`) but **not captured as a
behavioral node**. The `init/` and `mode/` nodes were deleted by #225 along with the verbs they
specified. Backfilling the remaining verbs (with `.feature` suites) is a future change request;
`pause` and `gate approve` carry open design questions (dissolve-vs-bridge, the relayed-ratification
seam) to settle at that time. `missions` is the highest-value backfill: it is now the CLI's whole
reason to exist, and the `hal` field it derives is load-bearing for the Pod persona.

<!-- BEGIN generated: by-concept (project-spec/concept-index) -->

## By concept

> Generated from `concept:` frontmatter by `project-spec/concept-index` — do not edit by hand.

| Concept | Facets |
|---|---|
| `crew-ops` | `mechanic/` (behavior) · `recruitment/` (behavior) |
| `fleet` | `authority/` (behavior) · `operator/` (behavior) · `pod/` (behavior) |

<!-- END generated: by-concept -->
