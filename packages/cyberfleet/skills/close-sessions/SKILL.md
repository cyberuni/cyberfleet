---
name: close-sessions
description: "Use this skill when the Council asks to close finished agent sessions, panes, or pods, clean up idle sessions, or tidy the fleet — it closes each unit whose worktree branch has landed and keeps everything else. Not for sweeping dead records only (`cyberlegion unit prune`), and not for retiring a Captain's pod record."
model: haiku
---

# Close sessions

Close every agent session whose work has landed, and keep every session that might still have work.
This is a mechanical sweep: each step below is a command and a rule. The one question to a unit is
mail, and its answer can only keep the unit.

A unit is closable only when **all** of its work is visible on the host as finished: every pull
request from its branch is merged or closed, and none of its commits are missing from those pull
requests. Mechanical evidence always decides first; nothing a unit says can close one the evidence keeps.
A live unit that passes that evidence is then asked one question (step 4), because the unit is the best
judge of whether it has unfinished work. A unit whose work landed but whose worktree still has
uncommitted files is shown to the Council with those files, and closed only if the Council says so.
When a check cannot be run or reads unclear, keep the unit. Closing destroys the session, its inbox,
and its worktree, and cannot be undone. Keeping a finished unit only costs a pane.

Act only on units in the caller's current multiplexer session. Another session or multiplexer may
resume those agents, and this skill cannot know.

## 1. Resolve `cyberlegion`

Take the first rung that resolves and whose `cyberlegion --version` is `1.6.0` or later:

1. `cyberlegion` on `PATH`.
2. The installed cyberlegion plugin: read `~/.claude/plugins/installed_plugins.json`, take the
   `installPath` of its `cyberlegion@<marketplace>` entry, and run `node <installPath>/bin/cyberlegion.mjs`.
3. `npx -y cyberlegion@1.6.0`.

When no rung resolves, stop and tell the Council to install the `cyberlegion` plugin.

## 2. Read the fleet

1. `cyberlegion unit prune` marks units whose pane is gone as exited.
2. `cyberlegion unit whoami` gives this session's own id and handle.
3. Name the caller's multiplexer: `herdr` when `HERDR_ENV` is set, `tmux` when `TMUX` is set.
   When neither is set, stop and tell the Council.
4. `cyberlegion unit who --all --format json` lists every unit. Each record has `id`, `handle`,
   `harness`, `status`, `cwd`, a pane, and `worktree` (`root` and `branch`). The pane is under `pane`
   (`mux` and `id`), or, in records written by older versions, under the legacy `tmux` key. Read it from
   whichever is present. The `conversation` field is optional, and this skill does not use it.
5. Fetch pull requests once per repository, not once per unit. For each distinct repository among the
   in-scope units, run inside one of its worktrees:
   `gh pr list --state all --limit 1000 --json number,state,headRefOid,headRefName`.
   Match each unit's branch to `headRefName` locally. Per-unit `gh` calls made a 400-unit sweep take
   about 7 minutes.
6. When the caller's multiplexer is `herdr`, read each live in-scope pane's state once, with
   `herdr pane list` (or `herdr pane get <pane id>`). It reports `agent_status` from metadata. Never read a pane's screen.

## 3. Classify each unit

Apply these rules in order to each unit. The first rule that matches decides it.

| # | Check | Result |
| - | ----- | ------ |
| 1 | `id` is this session's own id | keep: this session |
| 2 | It is a standing owner (no pane, and no `harness` field or `harness` is `-`) | keep: standing owner |
| 3 | Its pane is absent, or its `mux` (or legacy `tmux` key) is not the caller's multiplexer | keep: out of scope |
| 4 | It has no `worktree` | keep: no worktree |
| 5 | `worktree.root` does not exist on disk, and `status` is not `exited` | keep: worktree gone, session live |
| 6 | `worktree.root` does not exist on disk, and `status` is `exited` | close: worktree gone, session ended |
| 7 | Either `git -C <root> rev-parse --git-dir` or `git -C <root> rev-parse --git-common-dir` fails | keep: cannot read worktree |
| 8 | Those two commands print the same path | keep: primary checkout |
| 9 | The repository's pull request list (step 2.5) failed to load | keep: cannot read pull requests |
| 10 | No pull request in that list has `headRefName` equal to the branch | keep: no pull request yet |
| 11 | Any matching pull request has state `OPEN` | keep: pull request open |
| 12 | `git -C <root> merge-base --is-ancestor HEAD <headRefOid>` exits non-zero for every matching pull request | keep: commits after the last pull request |
| 13 | `git -C <root> status --porcelain --untracked-files=all` prints any line other than `?? .agents/cyberlegion/config.json` | ask: work landed, leftover files |
| 14 | Anything else (every pull request is `MERGED` or `CLOSED`, `HEAD` is inside one of them, and the worktree is clean) | close: pull requests merged or closed |

Rules 5 and 6 handle a worktree that was deleted from disk. Nothing is left on disk to check, so
the session's own state decides: a live session may still be in use, and an exited one has nothing
left to lose.

Rule 3 is the scope rule. Records do not yet store the multiplexer session (cyberuni/cyberlegion#241),
so scope is the multiplexer kind. A record with no pane, or with only the legacy `tmux` key while the caller is
on herdr, is out of scope. herdr restores panes with the same ids and resumes Claude itself, so a
unit on another herdr session may come back.

Rule 8 keeps every session in a project's main checkout: a Captain, a Coordinator, the Operator, or
the Council's own desk. Those are standing seats, not spawned units, so this skill never closes one.

Rule 13 catches a unit whose work landed but left files behind: build output, scratch files, an edit it
never committed. Those are often safe to drop, but only the Council can say, so the unit is listed
with its files and closed only on the Council's word. The one line it skips is the marker cyberlegion
stamps into every worktree it spawns; `cyberlegion unit close` sets that file aside too, so it never
counts as leftover work.

Rule 12 is the unpushed-work check. It compares the local `HEAD` with each pull request's head commit
rather than with the remote branch, because the host usually deletes a branch once its pull request
merges. One pull request containing `HEAD` is enough. A head commit missing locally makes that
command exit non-zero; it counts like any other non-zero exit.

Do not retry a failed command. A failure keeps the unit, and the next sweep checks it again.

A held merge always keeps its unit, because a held pull request is still open (rule 11).

`stopped` is not `exited`. A stopped unit was kept on purpose so it can be restarted.

## 4. Ask the live units

An **exited** unit's step-3 result stands: its session ended, so there is nobody to ask.

For each **live** unit (`status` is not `exited`) that step 3 put in **close**:

1. When the multiplexer shows it working, keep it: **keep: working**. On herdr that is `agent_status`
   `working` or `blocked`. Skip the question.
2. Otherwise mail it one structured question on a fresh thread:

   ```sh
   cyberlegion mail send --to <id> --thread close-<id>-<timestamp> --subject "Closing?" \
     --body "Do you have unfinished work? Reply with: cyberlegion mail send --to <caller handle> --thread <thread> --body 'DONE' (or --body 'UNFINISHED: <reason>')"
   ```

   `<caller handle>` is the handle from `unit whoami`, and `<thread>` is the same thread id. A reply
   sent without that thread never matches the wait.

   Send the questions to all such units first. Then wait on each thread with
   `cyberlegion mail await --thread <thread> --timeout <ms>`, giving each the remaining share of a
   total budget of about 2 minutes (120000 ms), not 2 minutes per unit. `await` prints the reply and acks
   it; it exits non-zero on timeout.
3. Read the reply:
   - `DONE` → the unit stays in **close**.
   - `UNFINISHED: <reason>` → **keep: unit reports unfinished work**, and show the reason.
   - No reply in time, or a reply that is neither → **keep: no answer**.

A reply can only keep a unit. It never moves a unit from keep to close, and never overrides
rule 13: a live unit that passed the mechanical close but has leftover files stays in **ask**, and is
not mailed.

Never type into a pane or read its screen. The mail is the only way this skill talks to a unit.

## 5. Confirm with the Council

Show the units in three groups: **close**, **ask**, then **keep**. Each row gives the unit id, the
handle, the branch, the result, and the pull request numbers. Handles are not unique, so the id is what
identifies a unit. Under each ask row, show what the Council needs to decide:

- for leftover files (rule 13): the lines rule 13 counted, the first 10, then how many more;

Then ask two questions, in this order:

1. "Close these N units?" for the close group.
2. "These M units have leftover files, listed above. Closing one deletes its worktree with those
   files. Which should I close?"

The Council may drop units from either list. A yes to the first question never covers the ask group.
Close only the units the Council's answer names or covers. If an answer names a handle that more than
one candidate shares, ask which id it means. If an answer is not a yes, close nothing from that group.

## 6. Close

For each confirmed unit, run `cyberlegion unit close <id>`. Add `--force` only for a unit that rule 13
put in ask, which discards its leftover files.

- Pass `--force` only for a rule-13 unit the Council confirmed in answer to the second question.
  Never pass `--keep-worktree`.
- If a close refuses (for example, a close-group worktree that became dirty since step 3), report the
  refusal and move on. Do not retry it, add `--force`, or reach around it.
- Never run `cyberfleet pod retire`. A pod's record belongs to its Captain, who retires it.
- Mail a unit only with the step-4 question. Never type into a pane or read its screen.

## 7. Report

Lead with the count closed and the count kept (an ask-group unit the Council did not confirm counts as
kept). List the closed handles. Then list the kept units grouped by result, so the Council can see which
ones are waiting on a pull request, which reported unfinished work (with the reason), and which are
out of scope.
