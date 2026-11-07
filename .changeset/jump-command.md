---
"cyberfleet": minor
---

`cyberfleet jump` now does `/jump`'s deterministic work, and the `/jump` skill needs only `cyberfleet`. **Breaking:** its arguments and output changed. `cyberfleet jump <target> [--repo <name>] [--branch <name>]... [--mentions <n>]` focuses the one live unit an id, handle, branch, or repo name equals, follows the jump history on `back`, and otherwise prints `candidates`, a `task` (repo, `<owner>/<repo>` from `origin`, number), or `prose` (the live units, for the skill to match) without focusing anything. It never focuses the calling session and never picks among several matches. It no longer prints a worktree path when a unit has no pane; it fails instead. cyber-mux is now bundled into the CLI, so `/jump back` works when the `cyber-mux` on `PATH` is old or missing.
