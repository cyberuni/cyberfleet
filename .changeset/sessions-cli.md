---
"cyberfleet": minor
---

Add `cyberfleet sessions plan | ask | close`, the close-sessions sweep as tested code. `plan` reads the fleet, runs one `gh pr list` and one fetch per repository in parallel, classifies every unit by the close-sessions rules, writes the full plan to a file, and prints a compact summary. `ask` mails each live close-group unit by full id and awaits every reply within one 120-second budget; an answer can only keep a unit. `close` closes only the confirmed ids, refuses a keep-group unit, a live unit that did not answer DONE, a unit that changed since the plan, and any `--force` outside an ask-group unit with leftover files or on a seat, and never retires a pod.
