---
"cyberfleet": minor
---

Publish the `cyberfleet` agent plugin through npm, from `cyberuni/cyberfleet`. The package's baseline
version moves to `0.1.0`, the version the plugin already carried, so the package and the plugin
manifest share one number and this release (`0.2.0`) is newer than both the npm-only `0.0.6` and the
git-installed plugin `0.1.0`. A plugin cache keyed on `0.1.0` would otherwise keep the git install,
whose CLI cannot find `dist/`.
