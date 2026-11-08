---
'cyberfleet': patch
---

close-sessions closes finished units it used to keep. It fetches each pull request's head before checking that `HEAD` is inside it, so a merged pull request is no longer read as unlanded work. An exited unit closes when its worktree is clean and every commit is on the default branch, pull request or not. A seat on a main checkout closes when its checkout is clean, not ahead of its upstream, and the seat answers DONE, without touching the checkout (needs cyberlegion 1.8.0 or later). The report counts live sessions and exited records separately.
