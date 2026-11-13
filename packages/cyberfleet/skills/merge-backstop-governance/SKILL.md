---
name: merge-backstop-governance
description: "Partial Skill: invoke by name only — the Operator's merge discipline — how the lifecycle loop retires missions to trunk in Operation order behind a speculative-CI + bisection backstop so trunk stays always-green. Loaded by the headless-operator agent for the merge step, and by the in-session Operator persona. Not triggered by users directly."
user-invocable: false
---

# Merge Backstop Governance

The merge judgment the lifecycle loop carries but the `cyberlegion` CLI deliberately does not. The
Operator runs missions **out of order** in parallel worktree-ships, but retires them to trunk **in
order** — the reorder-buffer discipline that keeps trunk always-green under parallelism. This
governance is where that discipline lives, loaded by the `headless-operator` agent (and the in-session
Operator persona) at the merge step of the lifecycle loop. Mechanics are offloaded to `gh`/git/CI —
this governance decides *order* and *land-or-hold*, never re-implements a CI runner or a merge engine.

**Input:** a set of missions reported done (each with a PR created at handoff), plus the mission graph
the Operator writes as single writer.

## 1. Order — retire in Operation order, not issue order

Issue order (what `ready` surfaces) and retirement order are **two different orderings**. `ready`
governs *issue*; retirement is **Operation-ordered merge**. The **Operation is the retirement
boundary**: land an Operation's missions in RAW-dependency order (a consumer never lands before its
producer), and land whole Operations in an order that keeps the project releasable. The mission graph's
Operation structure (from the mission-graph engine's `operation`/`listOperations` views) is the retire
*guidance*; this governance applies it. Never merge in the order missions happened to finish.

## 2. Gate — speculative CI on the merged result, land only on green

A merge lands on trunk **only if CI is green on the merged result**, not merely on the mission's own
branch. Before landing:

```bash
# stage the merge speculatively (a merge preview / queue entry / temp integration ref) — never trunk yet
# run CI on that merged result and wait for the verdict
gh pr checks <pr> --watch          # or the project's CI status query on the integration ref
```

- **Green → land** the merge on trunk (`gh pr merge` / the project's merge mechanic), then re-derive
  `ready` for the next tick.
- **Red → do not land.** A red result never reaches trunk — trunk stays always-green by construction.

This is the "flush on misprediction": speculating a merge is a prediction that it integrates cleanly;
a red result is the misprediction, and the backstop flushes it before it lands.

## 3. Bisect — on a red batch, find the culprit, hold it, land the rest

When missions are speculated **stacked** (several merges ahead of trunk) and the integrated result goes
red, the culprit is not yet known. Bisect over the stacked range to isolate the single mission whose
merge turned it red:

```bash
git bisect start <red-merged-ref> <last-green-trunk>   # or re-run CI per candidate merge
```

- **Hold the culprit** — re-queue it for repair (append a repair/hold to the mission graph as single
  writer; the mission is not retired, its claim stays or flips to needs-repair). Never land it.
- **Land the innocent** — the missions proven green in isolation retire normally, in Operation order.

## 4. Depth — confidence bounds how far to speculate

How many merges to stack ahead of trunk before landing is bounded by **predictor confidence**:

- **Low confidence** (unfamiliar area, high-blast Operation, a recent red): **commit near** — speculate
  shallow, land one merge at a time, CI-gate each. Bisection cost stays trivial (a range of one).
- **High confidence** (independent missions, disjoint touch-sets, a clean recent history): **speculate
  far** — stack several, CI-gate the batch, bisect only if it goes red.

Speculation is an optimization over serial CI-gated merges; it never weakens the always-green invariant
— every mission's merge is still proven green (in isolation, after a bisect) before it counts as
retired.

## 5. The merge queue — one pod rebases at a time

A landed merge moves trunk under every pod still open, but only the pull request that merges next has
to sit on the new trunk. Telling every open pod to rebase after each merge costs about n²/2 rebases for
n pull requests, and each pod's rebases but its last are thrown away. So keep **one merge queue per
order** (per dispatch), and call only its head.

1. **Fix the order as pods report done.** When a pod reports done, place its pull request in the
   order's queue: dependency order first (a consumer behind its producer, §1), then, among pull
   requests with no dependency between them, the order that keeps conflicts small, judged from the
   files each one touches (`gh pr view <pr> --json files`). A pod that reports later takes its place
   by the same rules; a consumer already queued moves behind its producer when the producer reports.
2. **Tell the pods behind the head to hold.** Mail each one, on its own brief's thread, its place and
   that it holds: it does not rebase or push for trunk changes until it is called. A holding pod keeps
   working on its review threads and on Council decisions.

   ```bash
   cyberlegion mail send --to <pod-handle> --thread <brief-thread> --body "queued: place <n>, behind <pr>. Hold: no rebase or push for trunk changes until called. Keep working review threads and Council decisions."
   ```

3. **After a merge, call only the next pod.** Tear down the pod whose work merged (`cyberlegion unit
   close`) and send it nothing. Then call only the next pod in the queue: rebase onto the new trunk,
   adapt its work to what just landed (not only resolve textual conflicts), re-run its verification,
   push, and report again on the thread. Send the pods behind it nothing; they are still holding.

   ```bash
   cyberlegion mail send --to <pod-handle> --thread <brief-thread> --body "your turn: <pr> merged, trunk moved. Rebase, adapt, re-verify, push, report again."
   ```

   The rebased pull request is **a new candidate**: gate it from scratch on its new report (§2, and
   the clean bar the dispatcher's authority rule sets). A green result from before the rebase never
   carries over. Merge it, then call the next. The head of a queue that trunk has not moved under
   since its last green needs no call: gate it as it stands.
4. **A pod that is not ready when called drops back.** When the called pod is still working or is
   blocked, it drops back in the queue behind the next ready pod, and that pod is called instead. The
   next ready pod is the first one behind it whose producers have all merged: a consumer is never
   called ahead of its producer, even when the producer drops back. The pod that dropped back is
   called again when it reaches the head ready.

**When the host has a merge queue** that builds CI on the merged result (a required GitHub merge
queue, for instance), queue the head pull request without a rebase when it has no conflict (`gh pr
merge <pr>`, which the required queue turns into an enqueue). The host's build on the merged result is
the §2 gate: a red one is not clean, and the pull request is held. Call the pod to rebase only on a
conflict.

Speculating merges ahead of trunk (§4) is the backstop's own integration check; it never calls more
than one pod to rebase. The queue is not memory: whoever runs the merge step derives it from the
Operation order and each pod's latest report on its thread, so a headless tick re-derives the queue
rather than carrying it from a prior tick.

## The invariant

Trunk is **always-green**: no merge lands on trunk with red CI on its merged result, under any
speculation depth. Order is Operation-coherent; the culprit of a red batch is held, never landed.

## Non-goals

Not a CI runner, a merge engine, or a git host — those are `gh`/git/CI, invoked as mechanics. Not the
`ready` scheduler (read-only; this is the *write*/retire side the dispatcher owns). Not the per-unit
spawn mechanism (`cyberlegion unit spawn`). The Operator is the single graph writer, so retirements
appended here never race a claim.
