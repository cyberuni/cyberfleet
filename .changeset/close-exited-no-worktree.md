---
"cyberfleet": patch
---

`close-sessions` now closes an exited unit that has no worktree, instead of keeping it on every sweep. A live unit with no worktree is still kept, and an exited one whose mailbox holds unread mail is listed with that mail for the Council to decide.
