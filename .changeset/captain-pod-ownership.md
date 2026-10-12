---
"cyberfleet": minor
---

Add `cyberfleet captain`, `cyberfleet pods`, and `cyberfleet pod bind|retire`. A project's Captain is cyberlegion's `captain` project service, and each Pod is owned by that Captain role, so a Captain restart or a new Captain session keeps its Pods with nothing to adopt. Binding and retiring run fenced at the caller's lease generation: a session that does not hold the Captain's lease cannot record or retire a Pod, and a Pod is retired once. `pods` lists each Pod as `current`, `unavailable` (no Captain holds the role now), or `retired`, and `pod bind --sortie <issue-ref>` records the sortie the Pod carries.
