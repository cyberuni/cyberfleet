# close-sessions

A mechanical sweep that closes every agent session whose work has landed, and keeps every session
that might still have work. It has no persona and no judgment step, so it runs on a low-tier model.

## When to use

- The Council asks to close finished agent sessions, panes, or pods, clean up idle sessions, or tidy the fleet.

Not for marking dead records only: that is `cyberlegion unit prune`, which this skill runs first. Not
for retiring a pod's record: that belongs to the pod's Captain (`cyberfleet pod retire`).

## What it does

- Reads every unit with `cyberlegion unit who --all --format json`, and acts only on units in the
  caller's current multiplexer session (records do not yet store the multiplexer session, cyberuni/cyberlegion#241, so
  units whose pane `mux` matches the caller's). Other units are kept, since another session may resume them.
- Fetches pull requests once per repository and matches branches locally, instead of one `gh` call per unit.
  It then fetches the default branch and the head of each matched pull request, once per repository,
  so a merged pull request whose branch the host deleted still reads as merged.
- Classifies each unit by its worktree and its branch's pull requests. A live unit is closable only
  when every pull request from its branch is merged or closed and its `HEAD` is contained in a pull
  request's head commit. An exited unit is also closable with no pull request, when every commit it
  holds is on the default branch by patch (`git cherry`). Mechanical evidence decides first. A unit
  whose worktree was deleted is closed only once its session has exited.
- Lists an exited unit with commits found nowhere else separately, with the commits, and closes it
  only when the Council names it.
- Lists a landed unit with leftover uncommitted files separately, with the files, and closes it
  (discarding them) only when the Council names it.
- Asks each live unit that passes the mechanical close one question by mail: "Do you have unfinished
  work? Reply DONE or UNFINISHED: <reason>". A unit the multiplexer shows working is kept without
  asking. UNFINISHED or no reply keeps the unit, with the reason listed. A reply never closes a unit
  the evidence keeps. It never types into a pane or reads its screen, and needs no transcript or hook.
- Keeps this session, standing owners, and live units with no worktree. An exited unit with no
  worktree has nothing on disk to lose, so it is closed, unless its mailbox holds unread mail: then
  it is listed with that mail and closed only when the Council names it.
- Judges a seat on a main checkout (Captain, Coordinator, Operator, the Council's desk) like any other
  unit: it closes when the checkout is clean, the branch is not ahead of its upstream, and a live seat
  answers DONE. Closing a seat never touches the checkout. This needs cyberlegion 1.8.0 or later
  (cyberuni/cyberlegion#248); with an older one, every seat is kept.
- Counts live sessions and exited records separately, so the session count matches the multiplexer.
- Shows the Council the close, ask, and keep groups, and asks about the close and ask groups
  separately before closing anything.
- Closes each confirmed unit with `cyberlegion unit close <id>`, adding `--force` only for a confirmed
  unit with leftover files.

This is the interim home for the sweep. The planned design moves the close into the Coordinator, at the
moment a unit's last pull request lands, and leaves this sweep for the leftovers.
