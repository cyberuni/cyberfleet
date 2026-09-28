---
"cyberfleet": patch
---

A ship spawned by Operator now reports back to the session that spawned it. Before, every ship reported
to the standing `operator` owner, whose doorbell rings whichever session opened Operator most recently,
so reports could land in a session that never saw the brief. A ship falls back to `operator` only when
the session that spawned it is gone.
