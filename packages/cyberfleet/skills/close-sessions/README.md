# close-sessions

Closes every agent session whose work has landed, and keeps every session that might still have
work. The sweep itself is the `cyberfleet sessions` CLI; this skill is the gateway in front of it.

## When to use

- The Council asks to close finished agent sessions, panes, or pods, clean up idle sessions, or tidy the fleet.

Not for marking dead records only: that is `cyberlegion unit prune`, which `sessions plan` runs first.
Not for retiring a pod's record: that belongs to the pod's Captain (`cyberfleet pod retire`).

## How it runs

1. The skill spawns the `headless-close-sessions` agent, which runs `cyberfleet sessions plan` and
   `cyberfleet sessions ask` and returns only the compact summary and the plan file's path. The
   full per-unit report stays in the file.
2. The skill shows the Council the close, ask, and keep groups, and asks about the close and ask
   groups separately.
3. The skill runs `cyberfleet sessions close <plan> --ids …` with the confirmed ids.

## The commands

- **`sessions plan [--out <path>] [--format json]`** prunes, reads every unit, and acts only on units
  in the caller's multiplexer. Per repository, in parallel: one `gh pr list`, the default branch, and
  one fetch of it and of every matched, non-open pull request's head, so a squash-merged pull request
  whose branch the host deleted still reads as merged. Then the per-worktree git checks, in parallel.
  Each unit gets a rule, a result (close, ask, or keep), a reason, its pull requests, and the
  evidence the Council needs: leftover files, `+` commits not on the default branch, or unread mail,
  the first 10 of each and how many more.
- **`sessions ask <plan>`** mails each live close-group unit one question by full id ("Do you have
  unfinished work? Reply DONE or UNFINISHED: <reason>"), skipping panes herdr shows working or
  blocked, and awaits every thread together within one 120-second budget. DONE leaves a unit in
  close; anything else, or no reply, keeps it. It records the answers in the plan.
- **`sessions close <plan> --ids <id…> [--force <id…>]`** closes each confirmed unit with
  cyberlegion's `unit close`. It refuses a keep-group unit, a live unit that did not answer DONE, a
  unit whose status, HEAD, or worktree status changed since the plan, and `--force` for anything but
  an ask-group unit with leftover files in a worktree it owns, or for any seat. It never retires a pod.

A unit spawned into another unit's worktree owns none: cyberlegion records that worktree as its
`sharedWorktree`, and closing the unit never touches it. While the owner's record exists, the
owner's own row judges the worktree, so the unit falls to 4c. Once the owner is gone, the unit may be
the last record pointing at that worktree, so rule 4b asks when the worktree still holds unlanded
work.

## The rules

The first rule that matches decides. The code and one test per rule are in
`src/sessions/classify.ts` and `classify.test.ts`.

| # | Unit | Result |
| - | ---- | ------ |
| 1 | this session | keep |
| 2 | a standing owner | keep |
| 3 | no pane, or a pane on another multiplexer | keep: out of scope |
| 4a | no worktree, live | keep |
| 4b | no worktree, exited, sharing one whose owner's record is gone, with commits not on the default branch, leftover files, or a worktree git cannot read | ask |
| 4c | no worktree, exited | close (ask when it holds unread mail) |
| 5 / 6 | worktree gone: live / exited | keep / close |
| 7 | git cannot read the worktree | keep |
| 8b–8d | a seat on a primary checkout: dirty / ahead of upstream / otherwise | keep / keep / close |
| 9 | pull requests failed to load | keep |
| 10 | a pull request from the branch is open | keep |
| 11 | the fetch failed | keep |
| 12 | live, and no pull request | keep |
| 13 | HEAD in no pull request's head: live / exited with commits not on the default branch | keep / ask |
| 14 | landed, with leftover files | ask |
| 15 | landed and clean | close |

A live unit that a rule puts in close is then asked (`sessions ask`). This is the interim home for
the sweep: the planned design moves the close into the Coordinator, at the moment a unit's last pull
request lands, and leaves this sweep for the leftovers.
