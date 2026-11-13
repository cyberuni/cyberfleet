---
"cyberfleet": minor
---

The Operator now keeps one merge queue per order and calls only its head to rebase, instead of mailing every other open pod "trunk moved" after each merge (about n²/2 rebases for n pull requests). The queue is fixed as pods report done, dependency order first and then the order that keeps conflicts small. Pods behind the head hold, with no rebase or push for trunk changes until called, while they keep working review threads and Council decisions. A pod not ready when called drops back and the next ready pod is called. When the host has a merge queue that builds the merged result, a conflict-free head is queued without a rebase. `merge-backstop-governance` §5, the Operator skill and its brief, and the `headless-operator` loop all carry the change.
