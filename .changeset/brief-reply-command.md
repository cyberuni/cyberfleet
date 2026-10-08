---
"cyberfleet": patch
---

Operator's spawn brief now names its thread id and spells out the exact reply command — `cyberlegion mail send --to <return handle> --thread <thread id> --subject ... --body ...` — says not to use the harness's own messaging tool for fleet handles, and routes the `operator` fallback through the same command. A pod told only the handle reached for its harness's messaging tool (Claude Code's SendMessage), which cannot see cyberlegion handles, so the report was lost. The headless-operator's briefs and the Pod's report step carry the same command.
