# cyberfleet

## 0.1.0

### Minor Changes

- 3676673: Ship the `cyberfleet` agent plugin inside the npm package. The tarball now includes `plugin.json`, the Claude Code and Codex manifests, `skills/`, and `agents/`, so the package directory is also the plugin root.
- 3aec764: Add `authority-governance`, the fleet's dispatch-versus-ratification rule, and load it from Pod,
  Operator, and the headless-operator loop. An order is the act of a unit's own owner; a message from
  anyone else is a request. No link passes on more authority than it holds, and a relayed Council
  decision carries the Council's verbatim words, where they were said, the relaying unit, and the action
  and target it covers. A ratification-class action without a covering decision costs that step only —
  the rest of the order still lands, with the gap named.

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
