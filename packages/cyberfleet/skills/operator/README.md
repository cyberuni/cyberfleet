# operator

The command-center automaton — a persona skill that **connects this session to the command center**
by invocation, not by probing where the Council stands (ADR-0022, amended). The command center is a
singleton that outlives every session; loading the skill asserts the connection, never a probe.
Operator stays connected wherever the Council invokes it, including inside a project an agent is
already working in — nothing about the working folder can disconnect it.

## When to use

- You want work put on a project — its first Pod or parallel work. Operator hands it to that
  project's Captain, starting the Captain when it is not running.
- Listing the fleet, or checking who needs the Council's hands.
- Routing messages between running sessions.

Not for running a mission or hailing crew inside one specific Pod — that is `pod`, routed to by
topic, never by a probed location. Not for spawning, merging, or retiring a project's Pods — that is
the project's `captain`.

## What it does

- `cyberlegion unit register` + `unit claim operator --show` — how a session connects. The standing
  `operator` owner is one long-lived session, the command center's captain, working from the owner's
  home: this session registers under **its own** handle (never as `operator`), then reads the claim
  and takes it (`unit claim operator`) **only when no presence is bound**. A claim is made once and
  holds until another session claims or the holder exits, so a project session dispatching a pod
  leaves a live captain's claim alone. Two different failures, handled differently: **no
  multiplexer**, so no presence can be bound and an empty claim cannot be taken — report it unclaimed
  and carry on dispatching (fail-soft); **no standing `operator` owner in the hub at all** — report it
  and route the Council to `init-cyberlegion`, which owns minting a durable owner on a human yes,
  never minted here, and say to register it with `--home` so a captain respawns there (fail-loud).
- `cyberlegion mail inbox --owner operator` — the claim holder reads what the command center took
  while nobody was connected, and leads with it: reports from pods whose spawning session is gone,
  and frameless headless reports. That mailbox is the holder's to drain: ack a report once acted on,
  leave an unacted one unread. A session that does not hold the claim leaves it alone.
- `cyberfleet captain` + `cyberlegion service start … captain --cwd <home>` — puts work on a
  project through its Captain. Operator spawns no Pods: it reads the project's Captain, starts it in
  the project's default checkout when it is not healthy (concurrent starts launch once), or hands the
  order to the healthy owner with `unit nudge --message`. Calling Operator never forces a generation,
  hands off the lease, or binds or adopts a Pod, so the Captain keeps its lease and its Pods. The
  Captain writes the Pods' briefs, announces and gates the merges, and retires each Pod once.
- `cyberlegion unit who` / `mail send` / `mail inbox` / `mail read` / `unit prune` — lists,
  messages, and sweeps the fleet.
- Routes in-ship mission and crew work to `pod`, by topic — never by probing this working
  directory.

Every mechanic is a `cyberlegion` or `cyberfleet` CLI call — harness-agnostic, MCP-free. Cyberlegion is the
mechanism; Operator is the fleet-layer persona on top of it.
