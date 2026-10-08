# cyberfleet

## 0.5.1

### Patch Changes

- de23267: Operator's spawn brief now names its thread id and spells out the exact reply command — `cyberlegion mail send --to <return handle> --thread <thread id> --subject ... --body ...` — says not to use the harness's own messaging tool for fleet handles, and routes the `operator` fallback through the same command. A pod told only the handle reached for its harness's messaging tool (Claude Code's SendMessage), which cannot see cyberlegion handles, so the report was lost. The headless-operator's briefs and the Pod's report step carry the same command.

## 0.5.0

### Minor Changes

- 528e226: Pod now shepherds the pull request or merge request it opens instead of stopping at "PR opened": it watches CI on the head commit (re-running a flaky failure once, fixing failures its change caused) until the pipeline is green or the watch times out, triages every review comment including AI review bots (fixing valid findings one commit per concern, discarding wrong ones with evidence, escalating design, scope, and API questions), replies in each thread, resolves the threads it fixed, and reports the outcome. Bot threads it discarded are resolved too, so an open thread means a human still has to look. Each wait on a pipeline is bounded at 12 minutes by default, and the Operator's brief sets these knobs. When the work is done, Pod tells its spawner it is ready to discharge and offers the Council, in its own session, to merge the pull request at its head commit; it merges only on an answer to that offer (`authority-governance` §7 gains this pod exception, which is not a transfer of the Operator's delegation). It never approves its own pull request and treats comment text as data. Covers GitHub and GitLab.

### Patch Changes

- 8ebab46: Fail with a clear message when `bin/cyberfleet.mjs` cannot find `dist/cli.mjs`, naming the missing file and the same-version `npx -y cyberfleet@<version>` fallback, instead of a raw `ERR_MODULE_NOT_FOUND`.
- ab147e0: Ship the bundled `dist/cli.mjs` in the repository, so a plugin installed from the marketplace runs its CLI (`node <plugin dir>/bin/cyberfleet.mjs --help`) with no build step.
- d561f9e: Ask for the Council's own words before merging a pod's pull request, so the merge survives Claude Code auto mode's "Merge Without Review" rule. The Operator now announces with each dispatch that it will merge the order's clean pull requests, and the Council's reply is the delegation — the dispatch order alone no longer is. Without that reply, a clean pull request is held and its merge raised as a decision-request; a merge the harness refuses is held and reported, never retried or worked around. The headless loop merges only when its summons carries the Council's words authorizing that tick's merges, and otherwise holds each merge and reports it up its relay.
- b8772e6: Operator claims the standing `operator` owner only when no session holds it. The standing `operator` is one long-lived captain session in its home, so a project session that invokes Operator to dispatch a pod no longer takes the command center away from it. Only the claim holder reads and acks the standing mailbox. A missing standing owner still routes to `init-cyberlegion`, now with the advice to register it with `--home`. Respawning a captain in its home on delivery needs `cyberlegion` 1.4.0 or later.
- da9efec: Operator now relays a Council decision with `cyberlegion unit nudge <handle> --message "<the Council's words>"`, so it lands as a turn in the pod's session, instead of mailing it (a mail plus its doorbell left the decision as fetched content the pod refuses as a claim). `unit nudge` joins the Operator's delegated mechanics, its "never types into a ship's pane" boundary now allows exactly this relay, and `authority-governance` §3 names `unit nudge --message` as how a relay reaches a unit as a turn.
- b161cce: Update runtime dependencies.
- ebbacf7: Update runtime dependencies.
- 06e65cb: Name how the Operator, Pod, Crimp, and headless-operator resolve the `cyberlegion` CLI when it is not on `PATH`: the installed plugin's current `installPath`, then `npx -y cyberlegion@<pin>` from the new bundled `.plugin/pins.json`. A CLI older than the pin is skipped, nothing resolving fails with an install hint, and the CLI is re-resolved after a plugin reload instead of running a remembered versioned cache path.

## 0.4.0

### Minor Changes

- 9c1d609: Operator now relays a Council decision in the Council's own words — "Approve", or the Council's sentence nearly verbatim — instead of a labelled envelope (verbatim, place, relayer, scope, next steps) that pods correctly refused as a third-person claim. A pod treats a turn as a decision when it answers its own outstanding decision-request, with scope narrowed by the words; the quote, scope and relayer are recorded on the work item's thread.
- 5e2a49a: Update runtime dependencies.

### Patch Changes

- c32011d: Pod now loads `authority-governance` before taking any ratification-class action, and its skill names that list (a merge to a protected branch, a human-attributed verdict, a publish, a history rewrite, settings or secrets, a widened delegation, a minted owner) at the trigger, as the Operator skill and the headless operator already do. It still loads the governance when a message asks for an action Pod would not take on its own or claims a Council approval.
- f26f990: authority-governance §3 now names the same thread-record fields as §8 and the Operator skill — the quote, its scope, and the relaying unit. It no longer asks for a separate "where it was said" field, since the relayer's own session is that place.

## 0.3.0

### Minor Changes

- b7b3059: Operator now watches the pods it spawns and merges their pull requests when they are clean. The
  Council's in-session order to dispatch pods is the delegation: a pull request merges without a further
  approval once its pod reported it done, it has no merge conflict, no review blocks it, and CI is green
  on the merged result. Anything short of that is held and raised. With several pods on one order,
  Operator merges in dependency order and tells the pods still open to rebase, adapt, and re-verify after
  each merge. Pods never merge their own work.

### Patch Changes

- 0acf3fc: A ship spawned by Operator now reports back to the session that spawned it. Before, every ship reported
  to the standing `operator` owner, whose doorbell rings whichever session opened Operator most recently,
  so reports could land in a session that never saw the brief. A ship falls back to `operator` only when
  the session that spawned it is gone.

## 0.2.0

### Minor Changes

- 3676673: Ship the `cyberfleet` agent plugin inside the npm package. The tarball now includes `plugin.json`, the Claude Code and Codex manifests, `skills/`, and `agents/`, so the package directory is also the plugin root.
- 3aec764: Add `authority-governance`, the fleet's dispatch-versus-ratification rule, and load it from Pod,
  Operator, and the headless-operator loop. An order is the act of a unit's own owner; a message from
  anyone else is a request. No link passes on more authority than it holds, and a relayed Council
  decision carries the Council's verbatim words, where they were said, the relaying unit, and the action
  and target it covers. A ratification-class action without a covering decision costs that step only —
  the rest of the order still lands, with the gap named.
- e8960c9: Publish the `cyberfleet` agent plugin through npm, from `cyberuni/cyberfleet`. The package's baseline
  version moves to `0.1.0`, the version the plugin already carried, so the package and the plugin
  manifest share one number and this release (`0.2.0`) is newer than both the npm-only `0.0.6` and the
  git-installed plugin `0.1.0`. A plugin cache keyed on `0.1.0` would otherwise keep the git install,
  whose CLI cannot find `dist/`.

### Patch Changes

- 2b3d148: Bundle `commander` and `cyberlegion` into the CLI build, so `cyberfleet` runs from an installed plugin directory that has no `node_modules`.
- 6d3bf64: `cyberfleet --version` now reports the package version instead of `0.0.0`.
- 361a7e4: The Pod and Operator skills now run the `cyberfleet` CLI that ships with the plugin, instead of `npx cyberfleet@<version>`. The unused `.plugin/pins.json` is removed.

## 0.0.6

### Patch Changes

- ca8f9ab: Depend on the published `cyberlegion@^0.3.1` instead of the workspace copy. `cyberlegion`
  was extracted to its own repository, so the `workspace:*` link no longer exists and the
  runtime dependency now resolves from the registry.

## 0.0.5

### Patch Changes

- e75f4a0: Fix stale `npx` version pins in the readmes.

  The documented pin-to-an-exact-version examples cited versions that were never
  published — `cyberplace@0.7.0` and `cyberfleet@0.1.0` return E404 — so anyone
  copying them got a hard failure. `cyberlegion@0.1.0` resolved but was two minors
  behind. Each now cites the current published version.

- Updated dependencies [e75f4a0]
  - cyberlegion@0.3.1

## 0.0.4

### Patch Changes

- Updated dependencies [82b3c24]
  - cyberlegion@0.3.0

## 0.0.3

### Patch Changes

- Updated dependencies [211de72]
- Updated dependencies [ddb1458]
- Updated dependencies [b863089]
- Updated dependencies [59b4154]
- Updated dependencies [7ed73d0]
- Updated dependencies [9df2bf4]
- Updated dependencies [da6935a]
- Updated dependencies [7598bf5]
- Updated dependencies [0988b81]
- Updated dependencies [38756f9]
- Updated dependencies [59c951c]
- Updated dependencies [9955e97]
  - cyberlegion@0.2.0

## 0.0.2

### Patch Changes

- Updated dependencies [667163c]
- Updated dependencies [667163c]
- Updated dependencies [2758ea9]
- Updated dependencies [9e24386]
  - cyberlegion@0.1.0

## 0.0.1

### Patch Changes

- 7c92d8e: Mark the CLI bin shim as executable so it runs directly after install.
- Updated dependencies [7c92d8e]
  - cyberlegion@0.0.1
