---
"cyberfleet": minor
---

`sessions plan` now judges an exited unit that owns no worktree by the worktree it shares (cyberlegion's `sharedWorktree`, so `cyberlegion` `^1.10.0` is required). While the owner's record exists, the owner's own row judges that worktree and the unit closes as before (now rule 4c). Once the owner is gone, new rule 4b asks when the shared worktree holds commits not on the default branch, leftover files, or cannot be read, and shows that evidence. Summary rows gain a `shared` column, and `sessions close` refuses `--force` for a unit that owns no worktree, so a shared worktree is never touched.
