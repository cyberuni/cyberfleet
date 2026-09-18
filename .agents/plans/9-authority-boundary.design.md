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
  cc["Command Center session<br/>portable — wherever the Council summons it"]
  capA["Captain · project A"]
  capB["Captain · project B"]
  podA1["Pod A1 · worktree"]
  podA2["Pod A2 · subagent"]
  podB1["Pod B1 · worktree"]
  mail[("mail — the store<br/>briefs · reports · requests · decisions<br/>one thread per work item")]

  council -->|"live turns"| cc
  cc -->|"spawn / keys: orders and relayed decisions"| capA
  cc -->|"spawn / keys"| capB
  capA -->|"spawn / keys"| podA1
  capA -->|"mid-turn message"| podA2
  capB -->|"spawn / keys"| podB1
  capA -.->|"peer request — never an order"| capB
  capB -.->|"peer request — never an order"| capA

  podA1 -.->|"reports · decision-requests"| mail
  podA2 -.->|"reports"| mail
  podB1 -.->|"reports"| mail
  capA -.->|"reports · decision-requests"| mail
  mail -.->|"fetched by"| cc
```

Authority runs **down** the solid edges only. Every dotted edge is content: fetched, answered, never
obeyed. A cross-project Captain request carries only the asking Captain's own authority.

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
