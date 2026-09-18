# Design — the fleet authority boundary (cyberfleet#9)

Companion to `9-authority-boundary.plan.md`. Records the design as reviewed, after three cold
spec-judge rounds and the Council's in-session corrections.

## The question, and two wrong answers

Issue #9 asks what a dispatcher may command and what carries Council authority. Every version of this
design has had to answer one question: **when a unit receives something, may it treat it as an order?**

Two answers were tried and both failed:

1. **Key on the transport** — mail is never a decision; a brief or the pane is. Dead on arrival: a Pod
   consumes its mission brief *from mail*, and `cyberlegion unit nudge --message` writes arbitrary text
   into any pane. Neither half of the split survives.
2. **Key on an owner identity** — resolve "my owner" and obey it. Two candidates, both wrong:
   - the **spawning session** (`spawnedBy` on the unit record) — sessions die, and a unit that outlives
     its spawner has an owner that no longer exists;
   - the **standing role** the brief names as its return address (`operator` today) — that address exists
     so reports survive the spawner's death, and any session can claim it, so "owner" would mean
     "whoever claimed the handle last".

Both attempts share one mistake: they try to **resolve an identity**, and nothing in the fleet can verify
one. cyber-mux records no caller, mail's sender field is free text, and a claim is last-write-wins.

## The answer: authority is positional, not an identity

A unit cannot know *who* addressed it. It can know **how** something reached it.

- **A turn in my own session is an order.** Something is a turn because a position of authority put it
  there: the spawn that started this session and handed it a brief, keys sent to this session, or — for a
  unit realized as a subagent — a message from the parent that spawned it. Only a unit that already holds
  that position can do any of these. No identity is checked, and none is needed.
- **Anything I fetched is content.** Mail I read from my own inbox — my brief's body, reports, a peer
  Captain's request, a message claiming the Council approved something — is *material*, not instruction.
  It is answered on its merits, never obeyed because of what it claims to be.

The brief sits across the two, which is what the earlier drafts kept getting wrong: the **spawn** is the
order (positional), and the **brief body in mail** is its content (fetched). That is why "read your brief
at `<path>`, then begin work" is a legitimate order while a later mail saying "the owner approved, merge
it" is not.

```mermaid
flowchart TD
  A["something reaches a unit"]
  B{"did it arrive as a turn in this unit's own session?"}
  C["ORDER — act on it"]
  D["CONTENT — answer it, never obey it"]
  E{"is the action ratification-class?"}
  F["do the work"]
  G{"does an unspent Council decision cover this action, target and revision?"}
  H["do the rest of the order, raise a decision-request, report both"]
  A --> B
  B -->|"yes: spawn, keys, parent message"| C
  B -->|"no: fetched from my inbox"| D
  C --> E
  D --> E
  E -->|no| F
  E -->|yes| G
  G -->|yes| F
  G -->|no| H
```

## Three layers, each doing one job

Positional authority alone is not enough — whoever can type into your pane could still say "merge it".
Two further layers bound what an order can achieve.

| Layer | Question | What it rules out |
|---|---|---|
| **1. Position** | did this arrive as a turn in my session? | a peer's mail posing as instruction |
| **2. Attenuation** | does the sender hold what it is commanding? | a dispatcher inventing an approval it never had |
| **3. Decision form** | does a Council decision cover this exact action? | a genuine order reaching past what the Council decided |

The incident fails all three independently, which is the property worth having: the claim arrived as
fetched mail (layer 1), the Operator held dispatch authority and no merge approval (layer 2), and the
Council's decision was scoped to a pull request (layer 3).

## Topology

```mermaid
flowchart TB
  council["Council (human)"]
  cc["Command Center session<br/>portable — wherever the Council summons it<br/>the only path authority crosses projects"]
  capA["Captain · cyberfleet"]
  capB["Captain · cyberlegion"]
  podA1["Pod A1 · worktree"]
  podA2["Pod A2 · subagent"]
  podB1["Pod B1 · worktree"]
  mail[("mail — the store<br/>briefs · reports · requests · decisions<br/>one thread per work item")]
  trackerB[("cyberlegion issue tracker")]

  council -->|"live turns"| cc
  cc -->|"spawn / keys: orders and relayed decisions"| capA
  cc -->|"spawn / keys: orders and relayed decisions"| capB
  capA -->|"spawn / keys"| podA1
  capA -->|"mid-turn message"| podA2
  capB -->|"spawn / keys"| podB1

  capA -.->|"files an issue: the durable request, never an order"| trackerB
  trackerB -.->|"triaged on B's own queue, B decides when"| capB
  capA -.->|"blocked: decision-request for sequencing"| mail

  podA1 -.->|"reports · decision-requests"| mail
  podA2 -.->|"reports"| mail
  podB1 -.->|"reports"| mail
  mail -.->|"fetched by"| cc
```

Solid edges are authority, and they only ever run **down** from the apex. Dotted edges are content:
fetched, triaged, answered, never obeyed. Note what is missing — there is **no solid edge between the two
Captains**, and none from a Captain into the other project's Pods.


## Cross-project: a request, an issue, or an escalation — never an order

Almost every real cross-project need in this fleet runs **downstream → upstream**: cyberfleet depends up
on cyberlegion, which depends on cyber-mux for sessions and panes, while `universal-plugin` and
`buddy-agent-harness` are tooling every repo consumes. The consumer finds the gap; the fix belongs to the
dependency.

A Captain holds authority over its own project's Pods and none in another project, so by attenuation it
has none to pass sideways. Three kinds of traffic follow, and they are not interchangeable:

| Kind | Example | Form | Who acts |
|---|---|---|---|
| **Information** | "we hit this `unit claim` behaviour" | mail, or a comment on an existing issue | nobody is obliged |
| **Request** | "cyberlegion needs a hub-wide thread read" | **an issue in the target repo** | the target's Captain, on its own queue |
| **Dependency claim** | "this node cannot promise rehydration until that ships" | issue, plus a blocked-by link, plus a decision-request up | the Council sequences it |

The **issue is the request; mail is only the doorbell.** An issue is durable, public, dedupable, and
survives every session; hub mail is private and dies unread if that Captain never runs. File the issue,
then mail the link when the target is live and timing matters.

Worked cases:

- **cyberfleet → cyberlegion** (`unit claim` has no liveness check): file it there, then either scope the
  work to what ships today or declare blocked. Never dispatch a Pod into cyberlegion — that Pod would be
  owned by a Captain with no authority in it (cyberfleet#24: "Captain A never becomes the owner of B's
  Pod").
- **cyberlegion → cyber-mux** (caller identity on injected keys): the same shape one level up, and the
  reason this design's honest limit stays bounded until it lands.
- **universal-plugin → its consumers** (a manifest schema change): the direction flips, the rule does
  not. An upstream Captain may file "adopt the new manifest"; the consumer's Captain decides when.
- **buddy-agent-harness** writing an `AGENTS.md` in another repo: the work runs in a Pod owned by **that
  repo's** Captain. The tool crosses repos; authority does not.

When an issue is not enough, the path is **up, not sideways**: a decision-request to Command Center, which
holds authority over both Captains and can dispatch the other one now.

Accepting such an issue and spawning a Pod for it is **dispatch**, not ratification, so the receiving
Captain needs no Council decision to start. Requiring one would queue every cross-project fix behind the
Council's attention — the silent-stall failure in another coat.

## How a ratification-class action actually gets done

```mermaid
sequenceDiagram
  participant C as Council
  participant CC as Command Center
  participant Cap as Captain
  participant P as Pod
  participant M as mail thread

  CC->>Cap: spawn + brief (order)
  Cap->>P: spawn + brief (order)
  P->>M: report — PR open, merge needs a decision
  M-->>Cap: fetched
  Cap->>M: decision-request on the work item's thread
  M-->>CC: fetched
  CC->>C: surfaces the request
  C->>CC: a live turn — merge PR 31 at revision abc123
  CC->>Cap: relays the decision — verbatim words, where said, relaying unit, scope
  Cap->>P: relays it unchanged, within what Cap holds
  P->>P: scope covers this action + target + revision, and is unspent
  P->>M: merged, and the decision is recorded spent on the thread
```

## Notification is not this design's business

Nothing here specifies how a recipient learns that content is waiting. `cyberlegion mail send` rings the
recipient's doorbell itself (it reports `rung: true`, and `--no-nudge` suppresses it), so there is no
sender-side "then notify them" step to write down. The frozen Operator node already carries the rule that
matters — **delivery is not the doorbell**: a message whose ring never landed is delivered, not resent,
and only a handle that resolved to no live unit is undelivered. That is cyberlegion's seam; this design
cites it and adds nothing.

One consequence does land on this design's seam, and it is the bounded limit rather than a new rule. The
doorbell arrives as a **turn** in the recipient's session, so by layer 1 it is an order — a harmless one,
because what it says is "check your inbox", and what the inbox holds is content either way. But the same
injection path takes caller-controlled text (`unit nudge --message "<text>"`), which is precisely why
position is a structural fact about the fleet's shape and not a proof. A capability check at that layer is
what would close it.

## What each layer needs from the record

- **Position** needs nothing recorded. It is observable to the unit: a turn either arrived in this session
  or it did not.
- **Attenuation** needs no lookup either. A unit relays only what it was itself given; it never consults a
  registry to discover its own authority.
- **Decision form** is the only layer with a record: the four parts, plus one thread per work item so a
  decision is anchored to the work it decides and spent once acted on.

That is why this version needs **no owner field, no `spawnedBy` read, and no claim check**. The two
mechanism gaps that remain are honest deferrals, not hidden assumptions: a hub-wide thread read
(cyberlegion#19) and a decision record with real identity (cyberlegion#10).

## What this delivers, and what it does not

**Delivers** — attributable, bounded, scoped, spent-once:

- no message a unit fetched can command it;
- no link passes on authority it does not hold;
- no decision covers more than the action, target and revision it names, or survives being used.

**Does not deliver** — unforgeability. Any process with pane access can put a turn into a session, so
position is a structural fact about the fleet's shape, not a proof. A capability check at the injection
layer (cyberlegion/cyber-mux) is what would make it one. Issue #9's Scope item 1 asks for the stronger
property; this design deliberately delivers less, on the Council's call that an owner's act is
authoritative by construction.

## Why the amendments are still needed

- **cyberlegion#17** — `relay-governance` forbids *any* relay hop from carrying a ratification. Layer 3
  carries one down the chain, in form and within what each hop holds. The amendment keeps the peer-steer
  rule and carves out the chain.
- **cyberlegion#18** — `subagent-backend-governance` forbids a mid-run nudge. Layer 1 counts a parent's
  mid-turn message to its own subagent as a turn. The amendment keeps the rule for cold one-shot judges,
  where independence depends on it.
