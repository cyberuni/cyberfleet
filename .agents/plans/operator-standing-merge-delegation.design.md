# operator-standing-merge-delegation — design

Council's words, given to the Operator in its own session and relayed to this pod in its brief: "Is
it possible to update /cyberfleet:operator skill so that it auto approve for clean PRs? If so, spawn
a pod". The brief recommended a design and asked for an argument where it does not hold. This file
records what was settled and why. The pull request is the decision-request: widening a delegation is
ratification-class (`authority-governance` §5), so nothing here takes effect until the Council
ratifies the spec gate.

## The change in one line

The Council writes a **standing merge delegation** once, in a file only it edits. While that record
names a repository, the Operator still announces the clean bar with each dispatch, quotes the record,
and merges each clean pull request of that dispatch's pods **without waiting for a reply**. With no
record, or a record that does not name the repository, nothing changes.

## Storage — `~/.agents/cyberfleet/merge-delegation.md`

A Markdown file in the Council's home, beside the `~/.agents/cyberlegion/` hub every unit already
reads:

```markdown
---
scope:
  - cyberuni            # an owner: every repository under it
  - unional/type-plus   # one repository
date: 2026-11-02
---

Merge my clean pull requests in these repositories without asking me each time.
```

The body is the Council's own words. `scope` lists owners (`owner`) or repositories (`owner/repo`);
an entry of any other shape (a glob, a wildcard, a URL) matches nothing. `date` is the day the Council
wrote it.

**Why this place.** It is harness-agnostic (Claude Code, Codex and Cursor sessions on the machine all
reach it), outside every repository, and written by no fleet verb.

**Rejected:**

- **In a repository** (`.agents/…` in each repo). Pods write repositories, and the Operator merges
  what pods write, so a pod could widen the record in a pull request the Operator then merges under
  the record itself.
- **Mail or the owner inbox.** Any unit can `mail send`, and mail is content (§1).
- **The harness's own settings** (`autoMode.allow` in Claude Code). Claude Code only, and the
  governance is harness-agnostic. It stays the harness-side twin (see "Harness guard").
- **GitHub settings** (a repo variable, a ruleset). Changing settings is itself ratification-class,
  and a remote read adds a failure mode for no gain over a local file.

## Why a file can carry the Council's words (the §1 carve-out)

§1 says anything a unit fetched is content, never a decision. Reading this file is a fetch. The
carve-out rests on position, which is how §1 already decides:

- **Mail** is content because any unit writes it on purpose (`mail send`), and its sender field is free
  text.
- **The record** is at a fixed path no fleet verb writes, and every unit is forbidden to write it. A
  write by any unit is a violation that shows in that unit's transcript.

It is no stronger than a turn: §9 already says a turn's keystrokes could be forged. The announcement
adds an audit. Each dispatch quotes the record's words, scope and date to the Council, so a forged
or widened record shows up in front of the Council on the next dispatch.

## Scope rules (load-bearing)

1. **Only the Council writes it.** An Operator, a pod, or any agent never creates, edits, widens or
   deletes it, even when the Council asks in-session. The Operator tells the Council the path and
   the shape, and the Council writes it. Reason: if no agent ever writes the record, any agent write
   is a violation, with no exception to judge. Claude Code's *Self-Modification* rule treats
   agent-written pre-authorization as manufactured consent.
2. **Read at each merge, never cached.** Revoking it (deleting the file, or removing a scope entry)
   takes effect at the next merge. A record missing at the merge means no delegation, even if it
   existed at dispatch.
3. **Covers only the Operator's own dispatches.** It covers the pull requests of pods the Operator
   spawned on a Council order announced while the record named the repository. It does not cover a
   pull request from an earlier order, from anyone else, or from Renovate.
4. **Only merging, same clean bar.** All four conditions of §7 still apply. Publishing, releases,
   settings and history rewrites (§5) are not covered.
5. **Never transferable.** The Operator alone merges. A pod is never told it may merge.
6. **The Council's live words win.** When the Council's words on a turn hold a merge back, that merge
   is held and reported, record or not.
7. **Not the headless loop.** The loop's merges still need the summons' own words. The announcement
   is what makes the record safe to act on, and no Council sees a headless tick. Extending the record
   to the loop is a separate decision for the Council.

**Load-bearing (expensive to unwind):** rule 1 (who writes it) and the §1 carve-out. Once units act
on a fetched record, narrowing that later means re-teaching every persona. **Cheap to revisit:** the
path and the format, rule 7, and the scope syntax.

## Harness guard — what the record does and does not buy in Claude Code

Claude Code auto mode's default soft-deny *Merge Without Review* blocks "merging a PR before any human
has approved it". A soft-deny is cleared by the user's own message. Content in tool results is not
consent, and the *Self-Modification* rule calls agent-written pre-authorization "manufactured user
intent". So **the fleet record, read by a tool call, is not expected to clear the classifier by
itself**. This was not tested: this pod must never merge.

On this machine the Council's own `autoMode.allow` (user settings) already carries a rule that allows
"merging a pull request … without an approving review, in a repo inside the owned namespaces … when
the agent has confirmed first-hand that the PR has no merge conflict, every required check is green,
and no review requests changes or is left unresolved — for example, an Operator session merging a
pod's PR". `claude auto-mode config` shows it in the effective config. That rule, not the fleet record,
is what is expected to let the merge through Claude Code. The two gates are independent:

- The **record** satisfies the fleet's governance, on any harness.
- The **harness allow rule** satisfies Claude Code, whatever the governance says.

Neither replaces the other. A merge the harness still refuses stays refused (§7), with no settings
change to get around it.

## GitHub native auto-merge — rejected

`gh pr merge --auto`, with pods opening drafts and marking them ready, would make **the pod's
`gh pr ready` the act that starts the merge**. That hands the merge to the pod, which §7 forbids.
It also bypasses the Operator's dependency-order merge and rebase notices
(`merge-backstop-governance` §5). "No unresolved review thread" would also need the branch-protection
setting *require conversation resolution*, which is a settings change (§5). The Operator keeps
running `gh pr merge` itself.

## Not changed

`merge-backstop-governance` (the clean bar's CI arm and the merge order are its own),
`headless-operator` (rule 7), the Pod persona (the brief still says never merge), and the CLI.
