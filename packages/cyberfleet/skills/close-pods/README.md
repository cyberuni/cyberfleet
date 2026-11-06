# close-pods

A mechanical sweep that closes every agent session whose work has landed, and keeps every session
that might still have work. It has no persona and no judgment step, so it runs on a low-tier model.

## When to use

- The Council asks to close finished pods, clean up idle sessions or panes, or tidy the fleet.

Not for marking dead records only: that is `cyberlegion unit prune`, which this skill runs first. Not
for retiring a pod's record: that belongs to the pod's Captain (`cyberfleet pod retire`).

## What it does

- Reads every unit with `cyberlegion unit who --all --format json`.
- Classifies each unit by its worktree and its branch's pull requests. A unit is closable only when
  every pull request from its branch is merged or closed, its worktree is clean, and its `HEAD` is
  contained in a pull request's head commit. A unit whose worktree was deleted is closed only once its
  session has exited.
- Keeps this session, standing owners, units with no worktree, and every session in a main
  checkout (Captain, Coordinator, Operator, the Council's desk).
- Shows the Council one table and asks once before closing anything.
- Closes each confirmed unit with `cyberlegion unit close <id>`, never with `--force`.

This is the interim home for the sweep. The planned design moves the close into the Coordinator, at the
moment a pod's last pull request lands, and leaves this sweep for the leftovers.
