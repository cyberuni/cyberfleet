---
name: close-pods
description: "Use this skill when the Council asks to close finished pods, clean up idle agent sessions or panes, or tidy the fleet — it closes each unit whose worktree branch has landed and keeps everything else. Not for sweeping dead records only (`cyberlegion unit prune`), and not for retiring a Captain's pod record."
model: haiku
---

# Close pods

Close every agent session whose work has landed, and keep every session that might still have work.
This is a mechanical sweep: each step below is a command and a rule, with no judgment call in it.

A unit is closable only when **all** of its work is visible on the host as finished: every pull
request from its branch is merged or closed, and none of its commits are missing from those pull
requests. A unit whose work landed but whose worktree still has uncommitted files is shown to the
Council with those files, and closed only if the Council says so. When a check cannot be run or reads
unclear, keep the unit. Closing destroys the session, its inbox,
and its worktree, and cannot be undone. Keeping a finished unit only costs a pane.

## 1. Resolve `cyberlegion`

Take the first rung that resolves and whose `cyberlegion --version` is `1.6.0` or later:

1. `cyberlegion` on `PATH`.
2. The installed cyberlegion plugin: read `~/.claude/plugins/installed_plugins.json`, take the
   `installPath` of its `cyberlegion@<marketplace>` entry, and run `node <installPath>/bin/cyberlegion.mjs`.
3. `npx -y cyberlegion@1.6.0`.

When no rung resolves, stop and tell the Council to install the `cyberlegion` plugin.

## 2. Read the fleet

1. `cyberlegion unit prune` marks units whose pane is gone as exited.
2. `cyberlegion unit whoami` gives this session's own id.
3. `cyberlegion unit who --all --format json` lists every unit. Each record has `id`, `handle`,
   `status`, `pane`, and `worktree` (`root` and `branch`).

## 3. Classify each unit

Apply these rules in order to each unit. The first rule that matches decides it.

| # | Check | Result |
| - | ----- | ------ |
| 1 | `id` is this session's own id | keep: this session |
| 2 | It is a standing owner (no `pane`, and no `harness` field or `harness` is `-`) | keep: standing owner |
| 3 | It has no `worktree` | keep: no worktree |
| 4 | `worktree.root` does not exist on disk, and `status` is not `exited` | keep: worktree gone, session live |
| 5 | `worktree.root` does not exist on disk, and `status` is `exited` | close: worktree gone, session ended |
| 6 | Either `git -C <root> rev-parse --git-dir` or `git -C <root> rev-parse --git-common-dir` fails | keep: cannot read worktree |
| 7 | Those two commands print the same path | keep: primary checkout |
| 8 | `gh pr list --head <branch> --state all --json number,state,headRefOid` fails, run inside `<root>` | keep: cannot read pull requests |
| 9 | That list is empty | keep: no pull request yet |
| 10 | Any pull request in it has state `OPEN` | keep: pull request open |
| 11 | `git -C <root> merge-base --is-ancestor HEAD <headRefOid>` exits non-zero for every pull request in the list | keep: commits after the last pull request |
| 12 | `git -C <root> status --porcelain --untracked-files=all` prints any line other than `?? .agents/cyberlegion/config.json` | ask: work landed, leftover files |
| 13 | Anything else (every pull request is `MERGED` or `CLOSED`, `HEAD` is inside one of them, and the worktree is clean) | close: pull requests merged or closed |

Rules 4 and 5 handle a worktree that was deleted from disk. Nothing is left on disk to check, so
the session's own state decides: a live session may still be in use, and an exited one has nothing
left to lose.

Rule 7 keeps every session in a project's main checkout: a Captain, a Coordinator, the Operator, or
the Council's own desk. Those are standing seats, not pods, so this skill never closes one.

Rule 12 catches a pod whose work landed but left files behind: build output, scratch files, an edit it
never committed. Those are often safe to drop, but only the Council can say, so the unit is listed
with its files and closed only on the Council's word. The one line it skips is the marker cyberlegion
stamps into every worktree it spawns; `cyberlegion unit close` sets that file aside too, so it never
counts as leftover work.

Rule 11 is the unpushed-work check. It compares the local `HEAD` with each pull request's head commit
rather than with the remote branch, because the host usually deletes a branch once its pull request
merges. One pull request containing `HEAD` is enough. A head commit missing locally makes that
command exit non-zero; it counts like any other non-zero exit.

Do not retry a failed command. A failure keeps the unit, and the next sweep checks it again.

A held merge always keeps its unit, because a held pull request is still open (rule 10).

## 4. Confirm with the Council

Show the units in three groups: **close** (rules 5 and 13), **ask** (rule 12), then **keep**. Each row
gives the unit id, the handle, the branch, the result, and the pull request numbers. Under each ask
row, list the lines rule 12 counted (the first 10, then how many more), so the
Council sees exactly what would be discarded. Handles are not unique, so the id is what identifies a
unit.

Then ask two questions, in this order:

1. "Close these N units?" for the close group.
2. "These M units' work landed but they have leftover files, listed above. Closing one deletes its
   worktree and those files. Which should I close?"

The Council may drop units from either list. A yes to the first question never covers the ask group.
Close only the units the Council's answer names or covers. If an answer names a handle that more than
one candidate shares, ask which id it means. If an answer is not a yes, close nothing from that group.

## 5. Close

For each confirmed unit in the close group, run `cyberlegion unit close <id>`. For each confirmed unit
in the ask group, run `cyberlegion unit close <id> --force`, which discards its leftover files.

- Pass `--force` only for an ask-group unit the Council confirmed in answer to the second question.
  Never pass `--keep-worktree`.
- If a close refuses (for example, a close-group worktree that became dirty since step 3), report the
  refusal and move on. Do not retry it, add `--force`, or reach around it.
- Never run `cyberfleet pod retire`. A pod's record belongs to its Captain, who retires it.
- Never nudge, mail, or read the screen of a unit to decide whether it is finished.

## 6. Report

Lead with the count closed and the count kept (an ask-group unit the Council did not confirm counts as
kept). List the closed handles, then list the kept units
grouped by result, so the Council can see which ones are waiting on a pull request and which ones are
waiting on them.
