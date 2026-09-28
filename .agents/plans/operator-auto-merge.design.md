# operator-auto-merge — settled design (Council, in-session)

Council's words, in-session: "update operator skill that it should automatically monitor the pods it
spawns and merge the PR if the work is clean. When spawning multiple pods, the operator should
orchestrate them, tell them to rebase and update their implementation when one PR is merged." On the
proposed authority extension below: "yes, approved".

## Authority — extend authority-governance §7 to the in-session Operator

- The Council ordering Operator, on a turn in its session, to dispatch pods delegates merging **that
  dispatch's own pull requests** — the PRs of pods this Operator spawned for that order — and nothing
  else.
- Not transferable: pods open PRs and report; only Operator merges. A pod never holds it.
- Other ratification-class actions (release, publish, settings, history rewrite) still need their own
  decision.
- The delegation follows the PR across rebases; it is not spent per revision the way a relayed
  revision-scoped decision is. It is spent when that PR merges.
- The SDD leash still carries no merge authority.

## Clean — what Operator merges without asking

All of: the pod reported done on its thread; the PR has no merge conflict; no review requests changes
and no review thread is unresolved; speculative CI is green on the merged result
(`merge-backstop-governance`). Anything short of that is held and raised as a decision-request — never
merged.

## Monitoring

Every brief tells the pod: open a PR, never merge it, report on the brief's thread to `operator`, and
when told trunk moved, rebase onto it, adapt the work to what landed, re-verify, push, and report again.
Operator acts on each report as it arrives (the doorbell on the `operator` owner) and does not wait to
be asked: gate the PR, merge it if clean, hold and raise it if not. It keeps going until every pod
it spawned for the order is merged or held.

## Orchestrating several pods

Merge in dependency order (a consumer never before its producer; `merge-backstop-governance`). After
each merge, mail every other still-open pod of the dispatch on its own thread that trunk moved: rebase,
adapt, re-verify, re-report. Operator re-gates that PR from scratch on the new report. After a merge,
tear down the pod that ran it with `cyberlegion unit close`.
