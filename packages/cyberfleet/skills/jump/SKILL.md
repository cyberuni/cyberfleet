---
name: jump
description: "Moves the attached view to the one pane working on a repo, a branch, a pod, a GitHub issue or pull request (`#123`, `color-map#123`), or a task described in words, and back along the last jump. Use when the Council runs /jump, or asks to go to, switch to, or show the pane working on one of these, or to go back to the pane the last jump came from (`/jump back`). Not for opening a new pane or spawning a pod, and not for messaging a unit."
argument-hint: "[repo|branch|pod|task|back|<prose>]"
---

# Jump

Move the attached view to the one pane working on what the argument names, or back along the last
jump. Every jump goes through the `cyberlegion` CLI, so cyber-mux records where the view came from
and `back` can return there.

The one rule above all others: **more than one match lists the candidates and stops.** Never pick
one, not even the newest or the most likely.

## Resolving `cyberlegion`

Every `cyberlegion …` command below runs whichever CLI resolves here, resolved afresh in each
session and again after any plugin reload. Never hardcode a versioned
`~/.claude/plugins/cache/…/<version>/` path. The pin is `1.7.0`, the first release with
`unit focus --repo` and `--branch`. Take the first rung that resolves and whose
`cyberlegion --version` is at or above it; skip a rung that reports an older version:

1. `cyberlegion` on `PATH`.
2. The installed cyberlegion plugin: read `~/.claude/plugins/installed_plugins.json` now, take the
   `installPath` of its `cyberlegion@<marketplace>` entry, and run `node
   <installPath>/bin/cyberlegion.mjs`.
3. `npx -y cyberlegion@1.7.0`.

When no rung resolves, stop and report it to the Council with the install hint: install the
`cyberlegion` plugin beside this one, or `npm install -g cyberlegion@1.7.0`.

## Resolving `cyber-mux`

Only `back` needs `cyber-mux` directly; every other form reaches it through `cyberlegion`. Resolve it
the same way, afresh each time. The pin is `0.11.0`, the first release with `focus --back`. Take the
first rung that resolves and whose `cyber-mux --version` is at or above it:

1. `cyber-mux` on `PATH`.
2. The installed cyber-mux plugin: read `~/.claude/plugins/installed_plugins.json` now, take the
   `installPath` of its `cyber-mux@<marketplace>` entry, and run `node <installPath>/bin/cyber-mux.mjs`.
3. `npx -y cyber-mux@0.11.0`.

When no rung resolves, stop and report it with the install hint: install the `cyber-mux` plugin, or
`npm install -g cyber-mux@0.11.0`.

## 1. Read the argument

Claude Code appends it as `ARGUMENTS: <value>`; other runtimes pass the text after the skill name.
With no argument, ask the Council where to jump and stop.

The argument may start with a form word that forces the form: `repo <name>`, `branch <name>`,
`pod <handle>`, or `task <ref>`. Use one when a bare argument was ambiguous across forms. Without
one, decide the form in this order:

| # | Argument | Form |
| - | -------- | ---- |
| 1 | exactly `back` | Back |
| 2 | `#123`, `123`, or `<repo>#123` | Task |
| 3 | one word that exactly equals a live unit's id, handle, branch, or repo name | Repo, branch, or pod |
| 4 | anything else | Prose |

## 2. Read the fleet

Every form except Back starts from the same list:

- `cyberlegion unit who --format json` lists the live units. Each record has `id`, `handle`,
  `status`, `pane`, `cwd`, `brief` (a path to the unit's brief file, when it was spawned with one),
  and `worktree` (`root`, `branch`, and `primaryRoot`).
- A unit's **repo name** is the folder name of `worktree.primaryRoot`, or of `cwd` when it has no
  `primaryRoot`, the same rule `unit focus --repo` uses.
- `cyberlegion unit whoami --format json` gives this session's own `id`, when it has one. Leave this
  session out of every match and every candidate list.
- `unit focus --repo` and `--branch` count this session as a match. When this session is one of the
  units such a command would match and exactly one other unit remains, run `cyberlegion unit focus
  <id>` with that unit's id instead.

## 3. Jump

### Back

Run `cyber-mux focus --back` from this session's shell. It follows cyber-mux's record of the pane the
last jump into this pane came from. Report its result. If it fails (for example, `no jump into <pane>`),
quote the error and its next-step hint verbatim and stop; never jump somewhere else instead.

`/jump back` waits for this session's turn. When the Council uses `back` often, mention the tmux key
(prefix+B) that cyber-mux's `setup-tmux` binds to `focus --back`.

### Repo, branch, or pod

Collect the live units the word matches exactly, and note which field each matched:

- repo name → `cyberlegion unit focus --repo <name>`
- branch → `cyberlegion unit focus --branch <name>`
- id or handle → the pod form: `cyberlegion unit focus <id>`, using the matched unit's id. Handles
  are not unique: never pass the handle itself.

If every match is in one field, run that field's command. `unit focus --repo` and `--branch` fail on
their own when more than one unit matches, listing each candidate. If the word matches in more than
one field, or names more than one unit by handle, list the candidates and stop.

### Task

A task is a GitHub issue or pull request ref; one number names exactly one of them. This form needs
an authenticated `gh`. When `gh` is missing or not logged in, quote its error and stop.

1. **Find the repo.**
   - `#123` or `123`: the caller's own repo. Its name is the folder name of the primary checkout
     (`dirname "$(git rev-parse --path-format=absolute --git-common-dir)"`), and its `<owner>/<repo>`
     comes from `git remote get-url origin`.
   - `color-map#123`: the live units whose repo name is `color-map`. Read `<owner>/<repo>` from
     `git -C <primaryRoot or cwd> remote get-url origin` of those checkouts. No unit with that repo
     name: fail naming it. Checkouts whose `origin` remotes disagree: list them and stop.
     The org is needed only for the `gh` lookup.
2. **Read what the number is.** `gh api repos/<owner>/<repo>/issues/<n> --jq '.pull_request != null'`
   prints `true` for a pull request and `false` for an issue. If it fails, quote the error and stop.
3. **Find the branches.**
   - A pull request: `gh pr view <n> -R <owner>/<repo> --json headRefName --jq .headRefName`.
   - An issue: `gh issue view <n> -R <owner>/<repo> --json closedByPullRequestsReferences` lists the
     linked pull requests, each with its `number` and `repository`. Read each one's `headRefName` as
     above, in that pull request's own repository.
4. **Focus the branch.** Keep the branches a live unit is on. Exactly one: run
   `cyberlegion unit focus --repo <name> --branch <branch>`, where `<name>` is that pull request's
   repository name. More than one: list them and stop.
5. **Fall back.** When no branch has a live unit, look for a live unit in that repo whose handle or
   brief names the number: a handle that ends in `-123`, or a brief file that mentions `#123`,
   `<repo>#123`, or `/issues/123` or `/pull/123` on that repo. Exactly one: run
   `cyberlegion unit focus <id>`. More than one: list them and stop. None: fail naming the ref and
   the branches tried.

### Prose

Match the words against each live unit's handle, branch, repo name, and brief (read the brief file
when the record has one). A match is a unit the words plainly describe, not one they could be
stretched to fit. Exactly one: run `cyberlegion unit focus <id>`. More than one: list them and stop.
None: say no live unit matches, and list the units so the Council can name one.

## 4. Report

- A jump: one line naming the unit's handle and id and the pane, then that `/jump back` returns.
- Candidates: one row per unit with its id, handle, branch, and repo name, then a line saying the
  Council can narrow the argument (a form word, a repo, or an id). Do not jump.
- A failure: quote the CLI's error verbatim with its exit code. Do not retry with other flags, prune,
  or reach the pane any other way.

## Validate

Before reporting, check the result against `cyberlegion unit who --format json`:

- A reported jump names one live unit by id and handle, and the pane it reports equals that unit's
  `pane` in the fleet list. The unit is not this session.
- Every `unit focus` command run took an id, `--repo`, or `--branch`, never a handle.
- A candidates report has at least two rows. Each row's id is a live unit in the fleet list, no row
  is this session, and no `unit focus` or `focus --back` ran after the matches were collected.
- A failure report quotes the CLI's error and exit code, and no other focus command ran after it.
