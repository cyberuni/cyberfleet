# operator

The command-center automaton — a persona skill that **connects this session to the command center**
by invocation, not by probing where the Council stands (ADR-0022, amended). The command center is a
singleton that outlives every session; loading the skill asserts the connection, never a probe.
Operator stays connected wherever the Council invokes it, including inside a project an agent is
already working in — nothing about the working folder can disconnect it.

## When to use

- You need to spawn a ship — the fleet's first, a new peer session, or a parallel worktree-ship on
  a project that is already a ship.
- Listing the fleet, or checking who needs the Council's hands.
- Routing messages between running ships.

Not for running a mission or hailing crew inside one specific ship — that is `pod`, routed to by
topic, never by a probed location.

## What it does

- `cyberlegion unit register` + `unit claim operator` — how a session connects. The standing
  `operator` owner is a singleton that outlives any session: this session registers under **its own**
  handle (never as `operator`) and then takes the claim, always — even when another session already
  holds it — so the doorbell reaches whoever is connected. Two different failures, handled
  differently: **no multiplexer**, so no presence can be bound and the claim cannot be taken — report
  it unclaimed and carry on dispatching (fail-soft); **no standing `operator` owner in the hub at
  all** — report it and route the Council to `init-cyberlegion`, which owns minting a durable owner
  on a human yes, never minted here (fail-loud).
- `cyberlegion mail inbox --owner operator` — reads what the command center took while nobody was
  connected, and leads with it: reports from pods whose spawning session is gone, and frameless
  headless reports. That mailbox is Operator's to drain: ack a report once acted on, leave an
  unacted one unread.
- `cyberlegion unit spawn` — spawns every ship: the fleet's first, a new peer session, or a
  parallel worktree-ship on a project that is already a ship, with a self-contained brief the new
  Pod reads cold, whose return address is this session's own handle — the session that spawned the
  pod and watches it, not whichever session last claimed `operator`. The brief names `operator` only
  as the fallback when that handle resolves to no live unit. All spawning is Operator's; Pod never
  spawns.
- Watches the pods it spawns: every brief tells the pod to open a pull request and shepherd it (with
  the per-turn timeout and the threads to resolve), report on its thread, never merge, and rebase when
  told trunk moved. A pod still merges on the Council's answer to its own in-session merge offer
  (`authority-governance` §7), which the brief does not grant and the Operator never answers.
  Operator gates each report against the clean bar in `authority-governance` §7. With the dispatch it announces that it will merge the order's clean pull
  requests; the Council's reply to that, in its own words, is the delegation — the dispatch order alone
  is not. A clean, covered pull request merges with no further Council turn and its pod is closed; an
  unclean one, a clean one with no reply yet, or one whose merge the harness refused is held and raised
  as a decision-request, never retried or worked around.
  With several pods on one order it merges in dependency order and, after each merge, tells every other
  open pod to rebase, adapt, re-verify and report again.
- `cyberlegion unit who` / `mail send` / `mail inbox` / `mail read` / `unit close` / `unit prune` —
  lists, messages, tears down one finished pod, and sweeps the fleet.
- Routes in-ship mission and crew work to `pod`, by topic — never by probing this working
  directory.

Every mechanic is a `cyberlegion` CLI call — harness-agnostic, MCP-free. Cyberlegion is the
mechanism; Operator is the fleet-layer persona on top of it.
