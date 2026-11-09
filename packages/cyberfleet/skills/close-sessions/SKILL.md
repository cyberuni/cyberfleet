---
name: close-sessions
description: "Use this skill when the Council asks to close finished agent sessions, panes, or pods, clean up idle sessions, or tidy the fleet — it closes each unit whose work has landed, including finished seats and leftover exited records, and keeps everything else. Not for sweeping dead records only (`cyberlegion unit prune`), and not for retiring a Captain's pod record."
model: haiku
---

# Close sessions

Close every agent session whose work has landed, and keep every session that might still have work.
`cyberfleet sessions` runs the sweep: `plan` reads the fleet and applies the rules, `ask` asks each
live unit that passed them, and `close` closes what the Council confirms. This skill runs the first
two through a headless agent, shows the Council the result, asks two questions, and closes only
what the answers name.

## What is at stake

Closing a unit ends its session and deletes its record, brief, mailbox, and worktree, including
anything in the worktree that was never pushed. It cannot be undone. Keeping a finished unit only
costs a pane. So:

- Only the Council confirms a close. The plan proposes; nothing closes without the Council's answer.
- Mechanical evidence decides first. A unit's own answer can only keep it, never close it.
- The sweep acts only on units in the caller's multiplexer. Another session may resume the rest.
- A seat on a project's main checkout (Captain, Coordinator, Operator, the Council's desk) can close,
  but closing it never touches the checkout.
- `--force` discards a worktree's uncommitted files. It is only for an ask-group unit with leftover
  files that the Council named in answer to the second question, and never for a seat.

The rules themselves, and every guard above, are enforced by `cyberfleet sessions`, not by this
text: the rule table is code with one test per rule (`src/sessions/classify.ts`).

## Running `cyberfleet`

This plugin ships the `cyberfleet` CLI, so its version always matches this skill. Run it from this
skill's directory, with no install:

```bash
node <this skill's directory>/../../bin/cyberfleet.mjs sessions <plan|ask|close> …
```

Every `cyberfleet …` below means that command. Never run `cyberlegion unit close` yourself, and
never improvise the sweep with your own scripts: when a `cyberfleet sessions` command fails, quote
its error to the Council and stop.

## 1. Run the sweep headless

Spawn the `cyberfleet:headless-close-sessions` subagent. Its brief names the CLI by absolute path:
"The cyberfleet CLI is `node <plugin root>/bin/cyberfleet.mjs`.", with `<plugin root>` the absolute
path of `<this skill's directory>/../..`. It runs
`sessions plan` and `sessions ask`, and returns the summary `sessions ask` printed, whose first line
is `plan: <path>`. The wait for replies takes up to about two minutes.

On a harness with no subagents, run `cyberfleet sessions plan`, then
`cyberfleet sessions ask <path>` yourself, with a tool timeout of at least 180 seconds.

If the return is an error, quote it to the Council and stop. If it says `asked: no`, the ask did not
run: say so and stop, since a live unit that was not asked cannot be closed.

## 2. Show the Council

Open with the `scope` line: live sessions and exited records, never summed into one figure.

Then show the three groups from the summary: **close**, **ask**, then **keep**, each with live
sessions before exited records. Each close and ask row gives the id, handle, branch, reason, and pull
requests. Handles are not unique, so the id is what identifies a unit. Mark a seat as a seat, and say
that closing it leaves its checkout untouched. Under each ask row, show its `evidence` lines: unread
mail, `+` commits not on the default branch, or leftover files, with the "N more" line when there is
one. The keep group is shown by reason with its counts.

## 3. Ask two questions

Ask in this order:

1. "Close these N units?" for the close group.
2. "These M units have commits not on the default branch, leftover files, or unread mail, listed
   above. Closing one deletes its worktree and mailbox with them. Which should I close?"

The Council may drop units from either list. A yes to the first question never covers the ask group.
If an answer names a handle that more than one unit shares, ask which id it means. If an answer is
not a yes, close nothing from that group. With an empty group, skip its question.

## 4. Close

Run, with the full ids the answers cover:

```bash
cyberfleet sessions close <plan path> --ids <id> <id> … [--force <id> …]
```

Pass `--force` only for an ask-group unit the Council named in answer to the second question whose
evidence lists leftover files. The command refuses any other `--force`, any keep-group unit, any live
unit that did not answer DONE, and any unit that changed since the plan. It never retires a pod.

A refusal is the answer: report it, and do not retry, add `--force`, or close the unit another way.

## 5. Report

Lead with the count closed and the count kept (an ask-group unit the Council did not confirm, and a
refused unit, count as kept), each split into live sessions and exited records. List the closed
handles. Then list what was kept by reason, as the summary groups it, with each refusal and why.

## Never

- Never close a unit the Council did not confirm, and never read a yes to the first question as
  covering the ask group.
- Never run `cyberfleet pod retire`. A pod's record belongs to its Captain, who retires it.
- Never mail a unit, type into a pane, or read a pane's screen. `sessions ask` is the only contact.
