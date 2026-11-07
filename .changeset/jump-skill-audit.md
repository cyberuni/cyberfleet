---
"cyberfleet": patch
---

`/jump` no longer fails as ambiguous when the calling session is one of the units a repo or branch matches: it jumps to the one other unit by id. The skill also says the task form needs GitHub and an authenticated `gh`, reads this session's id as JSON, and checks its result against the fleet list before reporting.
