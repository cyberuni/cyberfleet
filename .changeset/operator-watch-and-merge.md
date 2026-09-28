---
"cyberfleet": minor
---

Operator now watches the pods it spawns and merges their pull requests when they are clean. The
Council's in-session order to dispatch pods is the delegation: a pull request merges without a further
approval once its pod reported it done, it has no merge conflict, no review blocks it, and CI is green
on the merged result. Anything short of that is held and raised. With several pods on one order,
Operator merges in dependency order and tells the pods still open to rebase, adapt, and re-verify after
each merge. Pods never merge their own work.
