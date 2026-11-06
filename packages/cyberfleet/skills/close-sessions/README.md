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
- Classifies each unit by its worktree and its branch's pull requests. A unit is closable only when
  every pull request from its branch is merged or closed and its `HEAD` is contained in a pull
  request's head commit. Mechanical evidence decides first. A unit whose worktree was deleted is
  closed only once its session has exited.
- Lists a landed unit with leftover uncommitted files separately, with the files, and closes it
  (discarding them) only when the Council names it.
- Asks each live unit that passes the mechanical close one question by mail: "Do you have unfinished
  work? Reply DONE or UNFINISHED: <reason>". A unit the multiplexer shows working is kept without
  asking. UNFINISHED or no reply keeps the unit, with the reason listed. A reply never closes a unit
  the evidence keeps. It never types into a pane or reads its screen, and needs no transcript or hook.
- Keeps this session, standing owners, units with no worktree, and every session in a main
  checkout (Captain, Coordinator, Operator, the Council's desk).
- Shows the Council the close, ask, and keep groups, and asks about the close and ask groups
  separately before closing anything.
- Closes each confirmed unit with `cyberlegion unit close <id>`, adding `--force` only for a confirmed
  unit with leftover files.

This is the interim home for the sweep. The planned design moves the close into the Coordinator, at the
moment a unit's last pull request lands, and leaves this sweep for the leftovers.
