---
"cyberfleet": patch
---

Skill scripts no longer warn that `dist` is older than `src/` in an installed plugin. The plugin cache stamps files in copy order, so the check misfired on a correct build. It now runs only in a development checkout, where the skill scripts also run the local CLI again instead of the published one.
