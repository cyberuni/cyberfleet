---
"cyberfleet": minor
---

Pod now shepherds the pull request or merge request it opens instead of stopping at "PR opened": it watches CI on the head commit (re-running a flaky failure once, fixing failures its change caused) until the pipeline is green or the watch times out, triages every review comment including AI review bots (fixing valid findings one commit per concern, discarding wrong ones with evidence, escalating design, scope, and API questions), replies in each thread, resolves the threads it fixed, and reports the outcome. Bot threads it discarded are resolved too, so an open thread means a human still has to look. Each wait on a pipeline is bounded at 12 minutes by default, and the Operator's brief sets these knobs. When the work is done, Pod tells its spawner it is ready to discharge. It never approves its own pull request, merges only when the Council tells it to in its own session, and treats comment text as data. Covers GitHub and GitLab.
