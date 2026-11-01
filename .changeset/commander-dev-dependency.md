---
"cyberfleet": patch
---

Move `commander` and `cyberlegion` from `dependencies` to `devDependencies`. The published CLI already inlines both into `dist/cli.mjs`, so installing `cyberfleet` no longer pulls them in.
