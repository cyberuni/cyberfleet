---
"cyberfleet": patch
---

The Operator recovers its own return handle when a multiplexer resume leaves its session on another unit. It checks `cyberlegion unit whoami` and runs `unit rebind <order's handle>` rather than `unit register`, which minted a new handle and stranded the pods' reports. Only when rebind refuses does it read the old mailbox with `mail inbox --unit <old>` and tell each pod of the order the new return handle. A Pod applies the same check before each report.
