---
"cyberfleet": patch
---

Require cyberlegion 2.0.1. `cyberfleet sessions plan` no longer loses an exited unit that is the last record for a shared worktree with unlanded work. Its prune now keeps that unit, so close-sessions rule 4b asks the Council about it again instead of the record being deleted first. The prune is given the worktree library's judgment of which shared worktrees have landed, so a sharer of landed work is still deleted and listed under `pruned`. The Operator, Pod, Crimp, and `headless-operator` resolve cyberlegion at 2.0.1 or later.
