---
"cyberfleet": minor
---

Add `cyberfleet captain`, `cyberfleet pods`, and `cyberfleet pod bind|adopt|retire`: a project's Captain is cyberlegion's `captain` project service, and each Pod is recorded with exactly one owning Captain at its service generation. A stale Captain cannot record, adopt, or retire a Pod, a Pod is retired once, and a Pod whose Captain is gone or replaced stays listed as unavailable or orphaned until it is explicitly adopted.
