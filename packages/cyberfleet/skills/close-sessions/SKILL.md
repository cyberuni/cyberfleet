---
name: close-sessions
description: "Use this skill when the Council asks to close finished agent sessions, panes, or pods, clean up idle sessions, or tidy the fleet — it closes each unit whose worktree branch has landed and keeps everything else. Not for sweeping dead records only (`cyberlegion unit prune`), and not for retiring a Captain's pod record."
model: haiku
---

# Close sessions

Close every agent session whose work has landed, and keep every session that might still have work.
This is a mechanical sweep: each step below is a command and a rule, with no judgment call in it.

A unit is closable only when **all** of its work is visible on the host as finished: every pull
request from its branch is merged or closed, and none of its commits are missing from those pull
requests. A unit whose work landed but whose worktree still has uncommitted files is shown to the
Council with those files, and closed only if the Council says so. So is a unit the Council was talking
with, since that conversation may not be finished. When a check cannot be run or reads
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
   `harness`, `status`, `pane`, `cwd`, `conversation`, and `worktree` (`root` and `branch`).

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
the Council's own desk. Those are standing seats, not spawned units, so this skill never closes one.

Rule 12 catches a unit whose work landed but left files behind: build output, scratch files, an edit it
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

## 4. Check the conversation

A unit's pull requests can land while the Council is still talking with it: a question the unit asked
is unanswered, or a decision lives only in its conversation. Closing ends that conversation. Run these
checks on every unit that step 3 put in close or ask. The first rule that matches decides it.

| # | Check | Result |
| - | ----- | ------ |
| C1 | `harness` is not `claude` | ask: conversation not checked |
| C2 | No transcript is found (below), and `status` is `exited` | no change |
| C3 | No transcript is found, and `status` is not `exited` | ask: conversation not found |
| C4 | The transcript was modified in the last 60 minutes | keep: conversation active |
| C5 | The Council-turns command (below) prints anything | ask: the Council talked to it |
| C6 | Anything else | no change |

**Find the transcript.** It is `~/.claude/projects/*/<conversation>.jsonl`, where `<conversation>` is
the unit's `conversation` field. When the unit has no `conversation`, or that matches no file, no
transcript is found. Do not substitute another file from the same folder: a worktree is reused by
many units, so the newest transcript there often belongs to a different one.

`stopped` is not `exited`. A stopped unit was kept on purpose so it can be restarted.

**Council turns** are the turns a person typed into the session, apart from the spawn brief and the
mail doorbell. A slash command the Council ran counts. Print them with:

```sh
jq -rR 'fromjson? | select(.type=="user" and .origin.kind=="human" and (.isMeta|not))
  | .message.content
  | if type=="string" then . else ([.[]? | select(.type=="text") | .text] | join(" ")) end
  | select(length>0)
  | select(startswith("Read your brief at")|not)
  | select(startswith("You have unread mail")|not)
  | .[0:200]' <transcript>
```

Print the unit's last reply with:

```sh
jq -rR 'fromjson? | select(.type=="assistant")
  | [.message.content[]? | select(.type=="text") | .text] | join(" ")
  | select(length>0)' <transcript> | tail -n 3
```

C2 lets an exited unit with no transcript keep its step-3 result: its session ended and no
conversation is left on disk, so closing it loses nothing more. C4 keeps a unit that is working or
being talked to right now. C5 sends every unit the Council spoke to back to the Council, because only
the Council knows whether that conversation finished.

## 5. Confirm with the Council

Show the units in three groups: **close**, **ask**, then **keep**. Each row gives the unit id, the
handle, the branch, the result, and the pull request numbers. Handles are not unique, so the id is what
identifies a unit. Under each ask row, show what the Council needs to decide:

- for leftover files (rule 12): the lines rule 12 counted, the first 10, then how many more;
- for the Council talked to it (C5): its last 3 Council turns and the last 3 lines of its last reply.

A unit can have both. Then ask two questions, in this order:

1. "Close these N units?" for the close group.
2. "These M units need your look before closing: their leftover files or their last exchange with
   you are listed above. Closing one ends its conversation and deletes its worktree, with any
   leftover files. Which should I close?"

The Council may drop units from either list. A yes to the first question never covers the ask group.
Close only the units the Council's answer names or covers. If an answer names a handle that more than
one candidate shares, ask which id it means. If an answer is not a yes, close nothing from that group.

## 6. Close

For each confirmed unit, run `cyberlegion unit close <id>`. Add `--force` only for a unit that rule 12
put in ask, which discards its leftover files.

- Pass `--force` only for a rule-12 unit the Council confirmed in answer to the second question.
  Never pass `--keep-worktree`.
- If a close refuses (for example, a close-group worktree that became dirty since step 3), report the
  refusal and move on. Do not retry it, add `--force`, or reach around it.
- Never run `cyberfleet pod retire`. A pod's record belongs to its Captain, who retires it.
- Never nudge, mail, or read the screen of a unit to decide whether it is finished.

## 7. Report

Lead with the count closed and the count kept (an ask-group unit the Council did not confirm counts as
kept). List the closed handles, each with its transcript path when step 4 found one: closing does not
delete the transcript, so the conversation can still be read. Then list the kept units
grouped by result, so the Council can see which ones are waiting on a pull request and which ones are
waiting on them.
