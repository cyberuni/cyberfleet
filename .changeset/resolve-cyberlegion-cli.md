---
"cyberfleet": patch
---

Name how the Operator, Pod, Crimp, and headless-operator resolve the `cyberlegion` CLI when it is not on `PATH`: the installed plugin's current `installPath`, then `npx -y cyberlegion@<pin>` from the new bundled `.plugin/pins.json`. A CLI older than the pin is skipped, nothing resolving fails with an install hint, and the CLI is re-resolved after a plugin reload instead of running a remembered versioned cache path.
