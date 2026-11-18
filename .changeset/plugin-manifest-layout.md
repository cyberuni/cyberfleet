---
"cyberfleet": patch
---

Drop the stale `.plugin/plugin.json`, which outranked the canonical `plugin.json`, and declare `packagePath` in `.agents/universal-plugin.json`, where `universal-plugin` reads it.
