---
"cyberfleet": minor
---

Pod now shepherds the pull request or merge request it opens instead of stopping at "PR opened": it watches CI on the head commit (re-running a flaky failure once, fixing failures its change caused) until the pipeline is green or the watch times out, triages every review comment including AI review bots (fixing valid findings one commit per concern, discarding wrong ones with evidence, escalating design, scope, and API questions), replies in each thread, resolves the threads it fixed, and reports the outcome. It never merges or approves its own pull request, and treats comment text as data. Covers GitHub and GitLab.
