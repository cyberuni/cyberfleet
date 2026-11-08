---
name: close-sessions
description: "Use this skill when the Council asks to close finished agent sessions, panes, or pods, clean up idle sessions, or tidy the fleet — it closes each unit whose work has landed, including finished seats and leftover exited records, and keeps everything else. Not for sweeping dead records only (`cyberlegion unit prune`), and not for retiring a Captain's pod record."
model: haiku
---

# Close sessions

Close every agent session whose work has landed, and keep every session that might still have work.
This is a mechanical sweep: each step below is a command and a rule. The one question to a unit is
mail, and its answer can only keep the unit.

A unit is closable only when **all** of its work is visible on the host as finished: every pull
request from its branch is merged or closed, and none of its commits are missing from those pull
requests. An exited unit may also close with no pull request, when every commit it holds is already
on the default branch. A seat on a project's main checkout closes only when the checkout is clean
and not ahead of its upstream, and closing it never touches the checkout. Mechanical evidence always decides first; nothing a unit says can close one the evidence keeps.
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
3. `npx -y cyberlegion@1.8.0`.

When no rung resolves, stop and tell the Council to install the `cyberlegion` plugin.

Note whether the resolved version is `1.8.0` or later. Only from that release does `unit close`
remove a unit on a primary checkout (cyberuni/cyberlegion#248) without touching the checkout. Rule 8
reads this note.

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
6. Fetch what rule 13 compares against, once per repository. All worktrees of a repository share one
   object store, so one fetch serves every unit in it. Inside one of its worktrees:
   1. Name the default branch: `gh repo view --json defaultBranchRef --jq .defaultBranchRef.name`.
   2. Fetch it: `git fetch origin <default branch>`. Rule 13 compares against `origin/<default branch>`.
   3. Fetch the head of every pull request that matches an in-scope unit's branch and is not `OPEN`,
      in one command: `git fetch origin pull/<n>/head pull/<m>/head …`. The host usually deletes a
      branch once its pull request merges, so a head commit is often missing locally, and rule 13 cannot
      test against a commit it does not have.

   A failed step here marks the repository's units for rule 11.
7. When the caller's multiplexer is `herdr`, read each live in-scope pane's state once, with
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
| 8 | Those two commands print the same path (a primary checkout) | judge it as a seat: rules 8a–8d |
| 9 | The repository's pull request list (step 2.5) failed to load | keep: cannot read pull requests |
| 10 | Any pull request in that list with `headRefName` equal to the branch has state `OPEN` | keep: pull request open |
| 11 | The repository's fetch (step 2.6) failed | keep: cannot fetch from the host |
| 12 | `status` is not `exited`, and no pull request matches the branch | keep: no pull request yet |
| 13 | `git -C <root> merge-base --is-ancestor HEAD <headRefOid>` exits non-zero for every matching pull request (or none matches), and either `status` is not `exited` or `git -C <root> cherry origin/<default branch> HEAD` fails or prints any line starting with `+` | live: keep: commits after the last pull request. Exited: ask: commits not on the default branch |
| 14 | `git -C <root> status --porcelain --untracked-files=all` prints any line other than `?? .agents/cyberlegion/config.json` | ask: work landed, leftover files |
| 15 | Anything else (no open pull request, every commit landed, and the worktree is clean) | close: work landed |

A primary checkout is a seat: a Captain, a Coordinator, the Operator, or the Council's own desk.
Rules 8a–8d decide it, in order, and rules 9–15 do not apply to it:

| # | Check | Result |
| - | ----- | ------ |
| 8a | The cyberlegion from step 1 is older than `1.8.0` | keep: primary checkout (cyberlegion too old to close a seat) |
| 8b | `git -C <root> status --porcelain --untracked-files=all` prints any line other than `?? .agents/cyberlegion/config.json` | keep: seat checkout has changes |
| 8c | `git -C <root> rev-list --count @{upstream}..HEAD` fails or prints anything but `0` | keep: seat ahead of upstream |
| 8d | Anything else | close: seat finished |

Rules 5 and 6 handle a worktree that was deleted from disk. Nothing is left on disk to check, so
the session's own state decides: a live session may still be in use, and an exited one has nothing
left to lose.

Rule 3 is the scope rule. Records do not yet store the multiplexer session (cyberuni/cyberlegion#241),
so scope is the multiplexer kind. A record with no pane, or with only the legacy `tmux` key while the caller is
on herdr, is out of scope. herdr restores panes with the same ids and resumes Claude itself, so a
unit on another herdr session may come back.

Rules 8a–8d judge a seat like any other unit: a clean checkout, nothing ahead of its upstream, and,
for a live seat, a DONE answer to the step-4 question. Closing a seat ends its session and deletes its
record, brief, and mailbox. `cyberlegion unit close` never removes, resets, or cleans a primary
checkout, so the checkout and everything in it stay as they are. A seat is never put in ask: a dirty
checkout belongs to whoever works in it, so rule 8b keeps it. A branch with no upstream makes rule 8c
fail, which keeps the seat.

Rule 14 catches a unit whose work landed but left files behind: build output, scratch files, an edit it
never committed. Those are often safe to drop, but only the Council can say, so the unit is listed
with its files and closed only on the Council's word. The one line it skips is the marker cyberlegion
stamps into every worktree it spawns; `cyberlegion unit close` sets that file aside too, so it never
counts as leftover work.

Rule 13 is the unpushed-work check. Work has landed when either test passes:

- **Inside a pull request.** The local `HEAD` is an ancestor of a matching pull request's head commit.
  It compares with the head commit rather than the remote branch, because the host usually deletes a
  branch once its pull request merges. One pull request containing `HEAD` is enough. Step 2.6 fetched
  the head commits, so a missing one means the fetch did not bring it, and it counts like any other
  non-zero exit. This test is what lets a squash merge count: squashing rewrites the commits, so
  `git cherry` would read them as missing.
- **On the default branch by patch.** `git cherry origin/<default branch> HEAD` marks each commit on
  `HEAD` that has no equivalent on the default branch with `+`. No `+` line means every commit is there.

A live unit must pass the first test, and must have a pull request at all (rule 12): a live unit with
no pull request, or with commits after its last one, may still be working. An exited unit has no
session left to continue that work, so either test closes it, pull request or not. An exited unit that
passes neither holds commits that exist nowhere else; it goes to the Council with those commits.

Do not retry a failed command. A failure keeps the unit, and the next sweep checks it again.

A held merge always keeps its unit, because a held pull request is still open (rule 10).

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
rule 14: a live unit that passed the mechanical close but has leftover files stays in **ask**, and is
not mailed. A live seat that rule 8d put in close is asked like any other unit.

Never type into a pane or read its screen. The mail is the only way this skill talks to a unit.

## 5. Confirm with the Council

Open with the scope counts: how many **live sessions** and how many **exited records** are in scope.
Count only live units (`status` is not `exited`) as sessions; an exited record has no session, so it
never counts as one. Those live counts are what the multiplexer shows. Never sum the two into one
"units in the session" figure.

Show the units in three groups: **close**, **ask**, then **keep**. Split each group into live sessions,
then exited records. Each row gives the unit id, the handle, the branch, the result, and the pull
request numbers. Handles are not unique, so the id is what identifies a unit. Mark a seat (rules
8a–8d) as a seat, and say that closing it leaves its checkout untouched. Under each ask row, show what
the Council needs to decide:

- for leftover files (rule 14): the lines rule 14 counted, the first 10, then how many more;
- for commits not on the default branch (rule 13): the `+` lines of `git -C <root> cherry -v
  origin/<default branch> HEAD`, the first 10, then how many more, and also the rule-14 lines when
  the worktree is dirty too.

Then ask two questions, in this order:

1. "Close these N units?" for the close group.
2. "These M units have commits not on the default branch or leftover files, listed above. Closing one
   deletes its worktree with them. Which should I close?"

The Council may drop units from either list. A yes to the first question never covers the ask group.
Close only the units the Council's answer names or covers. If an answer names a handle that more than
one candidate shares, ask which id it means. If an answer is not a yes, close nothing from that group.

## 6. Close

For each confirmed unit, run `cyberlegion unit close <id>`. Add `--force` only for an ask-group unit
whose worktree has leftover files, which discards them.

- Pass `--force` only for an ask-group unit the Council confirmed in answer to the second question,
  and only when rule 14's check printed lines for it. Never pass `--force` for a seat, and never pass
  `--keep-worktree`.
- If a close refuses (for example, a close-group worktree that became dirty since step 3), report the
  refusal and move on. Do not retry it, add `--force`, or reach around it.
- Never run `cyberfleet pod retire`. A pod's record belongs to its Captain, who retires it.
- Mail a unit only with the step-4 question. Never type into a pane or read its screen.

## 7. Report

Lead with the count closed and the count kept (an ask-group unit the Council did not confirm counts as
kept), each split into live sessions and exited records, as in step 5. List the closed handles. Then list the kept units grouped by result, so the Council can see which
ones are waiting on a pull request, which reported unfinished work (with the reason), and which are
out of scope.
