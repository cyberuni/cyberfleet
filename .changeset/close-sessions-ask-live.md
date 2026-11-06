---
"cyberfleet": minor
---

Rewrite the `close-sessions` skill: it acts only on units in the caller's multiplexer, fetches pull requests once per repository instead of once per unit, and asks each live unit that passes the mechanical close whether it has unfinished work (by mail) instead of inspecting transcripts. A reply can only keep a unit.
