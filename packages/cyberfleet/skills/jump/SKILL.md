---
name: jump
description: "Moves the attached view to the one pane working on a repo, a branch, a pod, a GitHub issue or pull request (`#123`, `color-map#123`), or a task described in words, and back along the last jump. Use when the Council runs /jump, or asks to go to, switch to, or show the pane working on one of these, or to go back to the pane the last jump came from (`/jump back`). Not for opening a new pane or spawning a pod, and not for messaging a unit."
argument-hint: "[repo|branch|pod|task|back|<prose>]"
---

# Jump

Move the attached view to the one pane working on what the argument names, or back along the last
jump. `cyberfleet jump` does the matching and the focusing. This skill does the two steps the
command leaves to it: the GitHub lookup for a task ref, and matching free text to a unit.

The one rule above all others: **more than one match lists the candidates and stops.** Never pick
one, not even the newest or the most likely.

## Running `cyberfleet`

This plugin ships the `cyberfleet` CLI, so its version always matches this skill. Run it from this
skill's directory, with no install:

```bash
node <this skill's directory>/../../bin/cyberfleet.mjs jump <argument>
```

Every `cyberfleet jump …` below means that command. Add `--format json` to read the result as JSON;
its `result` field names the kind.

## 1. Run `cyberfleet jump <argument>`

Claude Code appends the argument as `ARGUMENTS: <value>`; other runtimes pass the text after the
skill name. With no argument, ask the Council where to jump and stop.

Pass the argument as it came, quoted as one value. The command prints one result:

| `result` | What it means | Next |
| -------- | ------------- | ---- |
| `jumped` | It focused one unit: its `id`, `handle`, and `pane` (`back` also gives `from`). | Step 4 |
| `candidates` | More than one unit matched. Nothing was focused. | Step 4 |
| `task` | A task ref: its `repo` name, `slug` (`<owner>/<repo>` from that checkout's `origin`), and `number`. Nothing was focused. | Step 2 |
| `prose` | No exact match: the `words`, and the live units with `id`, `handle`, `branch`, `repo`, and `brief` (a path). Nothing was focused. | Step 3 |

A non-zero exit is an error. Go to step 4 with it.

The command already applies these rules, so do not repeat them by hand: it never focuses this
session or lists it, it jumps past this session when this session was one of the matches, a bare
word must exactly equal a unit's id, handle, branch, or repo name, and `back` follows the jump
history for this pane.

## 2. On `task`, look up the branches with `gh`

A task is a GitHub issue or pull request; one number names exactly one of them. This step needs an
authenticated `gh`. When `gh` is missing or not logged in, quote its error and stop.

1. **Read what the number is.** `gh api repos/<slug>/issues/<number> --jq '.pull_request != null'`
   prints `true` for a pull request and `false` for an issue. If it fails, quote the error and stop.
2. **Find the branches.**
   - A pull request: `gh pr view <number> -R <slug> --json headRefName --jq .headRefName`.
   - An issue: `gh issue view <number> -R <slug> --json closedByPullRequestsReferences` lists the
     linked pull requests. Read each one's `headRefName` as above, in that pull request's own
     repository. An issue with no linked pull request has no branches.
3. **Focus.** Run `cyberfleet jump --repo <repo> --branch <b>... --mentions <number>`, one `--branch`
   per branch found, with the `repo` the `task` result gave. When no branch has a live unit,
   `--mentions` falls back to a unit whose handle or brief names the number. Go to step 4 with what
   it prints.

## 3. On `prose`, match the words to one unit

Match the `words` against each listed unit's handle, branch, repo name, and brief (read the brief
file when the unit has one). A match is a unit the words plainly describe, not one they could be
stretched to fit.

- Exactly one: run `cyberfleet jump <id>` with that unit's id, and go to step 4 with what it prints.
- More than one plausible unit: list them and stop.
- None: say no live unit matches, and list the units so the Council can name one.

## 4. Report the result

- `jumped`: one line naming the unit's handle and id and the pane, then that `/jump back` returns.
  After a `back` with no unit at the pane, name the pane alone.
- `candidates`: one row per unit with its id, handle, branch, and repo name, then a line saying the
  Council can narrow the argument (a repo, a branch, or an id). Do not jump.
- An error: quote the command's error verbatim with its exit code. Do not retry with other flags,
  prune, or reach the pane any other way.

`/jump back` waits for this session's turn. When the Council uses `back` often, mention the tmux key
(prefix+B) that cyber-mux's `setup-tmux` binds to `focus --back`.

## Validate

Before reporting, check the result against what the commands printed:

- A reported jump comes from a `jumped` result, and names the `id`, `handle`, and `pane` it gave.
- Every `cyberfleet jump` run after the first took an id from a result, or `--repo` with the
  branches `gh` returned. None took a handle, and none was guessed.
- A candidates report has at least two rows, each a unit from the `candidates` or `prose` result,
  and no `cyberfleet jump` ran after the candidates were collected.
- An error report quotes the command's error and exit code, and no other command ran after it.
