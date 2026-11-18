---
"cyberfleet": patch
---

Skills run `cyberfleet` and `cyberlegion` through a forwarding script in their own folder (`node <this skill's folder>/scripts/<bin>.mjs`), written by `universal-plugin plugin build`. The script runs the checkout's CLI in development and the pinned published one on every install route. It replaces the `../../bin/cyberfleet.mjs` path that climbed out of the skill folder, and the PATH, installed-plugin and npx fallback chain for `cyberlegion`.
