---
"cyberfleet": patch
---

Operator claims the standing `operator` owner only when no session holds it. The standing `operator` is one long-lived captain session in its home, so a project session that invokes Operator to dispatch a pod no longer takes the command center away from it. Only the claim holder reads and acks the standing mailbox. A missing standing owner still routes to `init-cyberlegion`, now with the advice to register it with `--home`. Respawning a captain in its home on delivery needs `cyberlegion` 1.4.0 or later.
