---
"cyberfleet": minor
---

`close-sessions` is now a gateway over `cyberfleet sessions`. It spawns the new `headless-close-sessions` agent, which runs `sessions plan` and `sessions ask` and returns only the summary, so the fleet read and the wait for replies stay out of the Council's session. The skill then asks the Council its two questions and runs `sessions close` with the confirmed ids. The rule table moved out of the skill text into tested code.
