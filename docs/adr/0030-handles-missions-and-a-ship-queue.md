# ADR-0030: Handles name the participants; missions, threads, and a ship queue carry the work; cyberfleet owns projects

## Status

Accepted, 2026-10-17. Amends [ADR-0024](0024-ship-crew.md) §8 (where an escalation lives) and §9
(addressing and waking).

## Context

ADR-0024 keyed each role from its project's cynapse address (`<project-address>/captain`), citing
civitas [0004](https://cyber-civitas.github.io/decisions/0004-opaque-service-keys/), and gave roles
address channels: the Operator's took the Council's calls, the ship's took requests, landing reports,
escalation pointers, and the Captain's decision entries, and a Coordinator's took "PR ready".

Checking the siblings showed:

- cynapse has no project address in code. Its AGENTS.md and civitas 0004 say it derives one from the
  git common directory; its own ADR-0013 §9 keys a repository by the forge's native ID instead. An
  "address" in cynapse is an address channel, an inbox.
- A cyberlegion service (ADR-0033) is a fenced single-owner lease with a durable mailbox attached,
  built for cyberfleet's per-project Captain (cyberlegion#6). It is keyed by a project that
  cyberlegion registers in its hub from the git common directory. The record has no remote, and the
  lease is its only consumer.
- One holder per key is the runtime's guarantee. One Captain per ship is cyberfleet's default, not a
  limit: the Council can open any pane and invoke the Operator, a Captain, or a Pod, and those
  sessions still have to talk.

Walking one request through showed what is needed. The Council gives the Operator a GitHub issue URL.
The Operator finds the repository, then its main checkout on this machine, then whether the ship is
open, then opens a channel for the mission and pings the ship's Captain, who may not be running.
Read as a chat workspace, as in Slack or Discord: channels have members, every participant has a
handle, and a mention pings that participant.

## Decision

1. **Every participant has a handle**, unique in the hub and readable: `cyberlegion/captain`,
   `cyberlegion/coordinator`, `operator`, `fleet/captain`, `fleet/coordinator`. A Pod gets a
   generated handle (`cyberlegion/pod-7a`), a gate judge a throwaway one. The ship's part is the
   repository name, qualified by its owner only on a collision (`cyberuni/cyberlegion/captain`). Any
   number of sessions may act as one handle; a session declares its handle when it is started or
   invoked.
2. **The handle is the key.** It names the participant, the lease, and the owner of a Pod binding.
   The runtime receives it as an opaque string. Native IDs key only the channels of tracker items.
3. **A lease fences writes and starts a session at most once.** It does not route. The Captain's
   lease fences taking an issue in and binding or retiring Pods; the merge lease fences landing; any
   role a ping may have to start has a lease so that two pings never start two sessions. A session
   without the lease can still read, post, and talk. Entries from the lease holder carry its
   generation.
4. **A mention is a ping.** It wakes every live session acting as the handle. If none is running and
   the post needs an answer (a request, an escalation, a decision-request), it starts one through
   the handle's lease. A notification, such as an outcome, only wakes.
5. **The mission channel belongs to the mission.** Whoever brings the work creates it, keyed by the
   issue, with the Council's words verbatim as its first entry: the Operator, or the Captain when the
   Council speaks in its pane. Its members are the Operator that brought it and the ship's Captain;
   no ship's remote pane is invited. Each line of work is a thread on it, and that thread holds its
   SDD-mission's ledger. Gates and escalations are threads too. A ruling is recorded on the mission
   it concerns. The Captain posts the outcome on the mission channel and mentions the Operator.
6. **Each ship has one queue channel for its Coordinator's work**: "PR ready" from Pods and tracker
   mechanics from the Captain, one thread per item. Its members are the Captain and the Coordinator;
   a Pod joins when it posts. Landing talk lives here, and so does an escalation between two pull
   requests that conflict in meaning (ADR-0024 §8, case 6). The Coordinator joins no mission channel.
   No role has an inbox channel of its own.
7. **cyberfleet owns projects.** The Command Center keeps a ship registry, reached only through
   `cyberfleet ship` commands. Its fleet-wide part holds each ship's name, remote, template, tracker
   routing, and landing setting; its machine-local part holds the path to the ship's main checkout.
   The runtime is handed paths and handles, never a project. An issue URL finds its ship by the
   normalized remote. A ship may be registered before it is cloned, its path unset until then, and the
   path map can be rebuilt from the clones on disk.
8. **A repository that is not cloned is the Council's call.** The Operator asks, suggesting a path
   from where the known ships sit (`~/code/<owner>/<repo>` when they share that layout), then clones
   and registers the ship.

## Consequences

- Rule 6 of the model, "start or wake is transparent", now reads: a ping starts only when the post
  needs an answer.
- The runtime must accept a handle as an opaque lease key (its service names allow only
  `[a-z0-9_-]` today), wake every live session acting as a handle, and start one through the lease.
  Its project registry has no job left once leases take handles.
- cynapse holds the handles as participants. A thread type, carried as metadata on the anchor entry,
  would let the fleet mark line-of-work, gate, and escalation threads and let a viewer show them
  apart; until then the anchor entry's type marks them.
- civitas 0004's runtime clause stands. Its clauses on cynapse deriving a project address from the git
  common directory, and on cyberfleet passing it as the key, are superseded here.
- `src/project-address.ts` is replaced by the ship registry.
- A starting Captain rereads the channels of its open missions and its ship's queue.
- Open, and cheap to settle when built: where the ship registry is stored, and how the queue channel
  is keyed apart from cynapse's repository address channel.
