---
"cyberfleet": patch
---

`/jump` takes a mail message id and focuses the pane of the unit that sent it. When that unit's pane has closed, `cyberfleet jump <message-id>` returns `result: closed` with the unit's repo, branch, and directory instead of focusing anything.
