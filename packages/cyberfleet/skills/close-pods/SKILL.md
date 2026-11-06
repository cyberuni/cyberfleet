---
name: close-pods
description: "Use this skill when the Council asks to close finished pods, clean up idle agent sessions or panes, or tidy the fleet — it closes each unit whose worktree branch has landed and keeps everything else. Not for sweeping dead records only (`cyberlegion unit prune`), and not for retiring a Captain's pod record."
model: haiku
---

# Close pods

Close every agent session whose work has landed, and keep every session that might still have work.
This is a mechanical sweep: each step below is a command and a rule, with no judgment call in it.

A unit is closable only when **all** of its work is visible on the host as finished: every pull
request from its branch is merged or closed, and nothing in its worktree is uncommitted or unpushed.
When a check cannot be run or reads unclear, keep the unit. Closing destroys the session, its inbox,
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
| 8 | `git -C <root> status --porcelain` prints anything | keep: uncommitted changes |
| 9 | `gh pr list --head <branch> --state all --json number,state,headRefOid` fails, run inside `<root>` | keep: cannot read pull requests |
| 10 | That list is empty | keep: no pull request yet |
| 11 | Any pull request in it has state `OPEN` | keep: pull request open |
| 12 | `git -C <root> merge-base --is-ancestor HEAD <headRefOid>` exits non-zero for every pull request in the list | keep: commits after the last pull request |
| 13 | Anything else (every pull request is `MERGED` or `CLOSED`, and `HEAD` is inside one of them) | close: pull requests merged or closed |

Rules 4 and 5 handle a worktree that was deleted from disk. Nothing is left on disk to check, so
the session's own state decides: a live session may still be in use, and an exited one has nothing
left to lose.

Rule 7 keeps every session in a project's main checkout: a Captain, a Coordinator, the Operator, or
the Council's own desk. Those are standing seats, not pods, so this skill never closes one.

Rule 12 is the unpushed-work check. It compares the local `HEAD` with each pull request's head commit
rather than with the remote branch, because the host usually deletes a branch once its pull request
merges. One pull request containing `HEAD` is enough. A head commit missing locally makes that
command exit non-zero; it counts like any other non-zero exit.

Do not retry a failed command. A failure keeps the unit, and the next sweep checks it again.

A held merge always keeps its unit, because a held pull request is still open (rule 11).

## 4. Confirm with the Council

Show one table, close candidates first. Each row gives the unit id, the handle, the branch, the result,
and the pull request numbers. Handles are not unique, so the id is what identifies a unit. Then ask
once: "Close these N units?" The Council may drop units from the list. Close only the units the
Council's answer names or covers. If the answer names a handle that more than one candidate shares,
ask which id it means. If the answer is not a yes, close nothing.

## 5. Close

For each confirmed unit, run `cyberlegion unit close <id>`.

- Never pass `--force` or `--keep-worktree`.
- If a close refuses (for example, a dirty worktree that appeared since step 3), report the refusal
  and move on. Do not retry it or reach around it.
- Never run `cyberfleet pod retire`. A pod's record belongs to its Captain, who retires it.
- Never nudge, mail, or read the screen of a unit to decide whether it is finished.

## 6. Report

Lead with the count closed and the count kept. List the closed handles, then list the kept units
grouped by result, so the Council can see which ones are waiting on a pull request and which ones are
waiting on them.
