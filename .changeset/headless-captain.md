---
"cyberfleet": minor
---

The `headless-operator` agent is now a project's Captain run headless. A tick acts only while it holds the project's `captain` lease: when a healthy Captain is already running, or a start is in progress, it dispatches, merges, and retires nothing. It verifies the lease before every claim, merge, Pod record, and retirement, binds each Pod it spawns, and retires it once, so an interactive Captain and a headless tick never both dispatch or both retire.
