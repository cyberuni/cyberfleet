# Glossary

The project's ubiquitous language. Each load-bearing term is defined once, here. Design docs and
capability specs use these terms without redefining them; where a document holds the full rule
behind a term, the entry links to it.

## People and automatons

| Term | Meaning |
|---|---|
| **Council** | The human. Authority comes from here and nowhere else. Never personified as an automaton. |
| **automaton** | Any working agent in the fleet. Distinct from SDD's `sdd-automaton`, a specific headless conductor role. "Commander" is never used: SDD's Oracle owns that name. |
| **persona** | An automaton realized as a gateway skill with its own voice. Its mechanics are commands; its voice lives only in what it says around them. |
| **crew** | The automatons that work a ship or the Command Center: Operator, Captain, Coordinator, Pod, and Mediator. |
| **Operator** | The Council's interface to the fleet. It talks only with the Council: it answers questions itself and relays the Council's work to the target ship's Captain. It coordinates nothing; coordination is the Coordinators'. There is one Operator seat, in the Command Center, and the session in it need not stay running. |
| **Captain** | The automaton that owns a ship's work: freshness, priority, scope, the tracker, the plan, spawning and managing Pods, reviewing what landed, ruling on escalations. One per ship, plus the fleet's Captain on the Flag Bridge for the roadmap and cross-ship decisions. High tier. |
| **Coordinator** | The low-tier automaton that does a Captain's mechanics. A ship's Coordinator lands pull requests, unless the ship's landing setting gives landing to Pods; the fleet's Coordinator does the same for fleet missions, whose issues live in the fleet's tracker. |
| **landing setting** | A ship's choice of who lands its pull requests: the Coordinator (the default) or each Pod its own. The Council can override it for a request. |
| **Pod** | A worker automaton carrying one line of work in one mission, in its own workspace and worktree. Spawned and owned by the Captain. |
| **owned Pod** | A Pod with a binding record under its ship's Captain role. The Captain lists, directs, and retires its owned Pods, and the next Captain session inherits them. The Coordinator also directs a Pod while it lands that Pod's pull request. |
| **binding** | Writing a Pod's ownership record when the Captain spawns it. **Retiring** marks the record done; a retired Pod is never bound again. |
| **gate judge** | A cold automaton a Pod spawns into a gate thread to judge its line of work. Like everything in the ship it is the Captain's to see and clean up, but it works only from its gate's brief, and no one directs its verdict. It ends with its gate. |
| **Mediator** | A cold, high-tier automaton that writes a brief of a dispute for the Council. Decides nothing. |
| **specialist crew** | A recruited specialist automaton with its own face (aced, quill, Warden, Scanner), installed as a persona gateway skill. |
| **Crimp** | The persona that recruits specialist crew types from the Tavern and discharges them. Spec: [`recruitment/`](./recruitment/README.md). |
| **Mechanic** | The persona that builds a new automaton or reconfigures an existing one. Spec: [`mechanic/`](./mechanic/README.md). |
| **Tavern** | The marketplace query that lists recruitable specialist crews. |
| **tier** | The model class an automaton runs on: high, mid, or low. Set by the work's need for judgment. |
| **headless** | Run with no live user channel: started by a scheduled job's process, not by the Council. A headless automaton batches its needs-input instead of asking. The opposite is **interactive**. Headless says nothing about the host: a sub-agent is just how a role is hosted. |

## Places

| Term | Meaning |
|---|---|
| **ship** | A project. A multiplexer workspace (herdr or tmux) opened from a template on the project's main checkout, holding the Dashboard, Bridge, and Engine Room tabs. |
| **Command Center** | The fleet's own workspace, with a Dashboard and a Flag Bridge. Not a ship. |
| **Dashboard** | The first tab of a ship or the Command Center. In a ship: the remote pane and the ship's status. In the Command Center: the Operator's seat and fleet status. |
| **Bridge** | A ship's second tab: the Captain (left) and the Coordinator (right). |
| **Flag Bridge** | The Command Center's second tab: the fleet's Captain (left) and the fleet's Coordinator (right). |
| **Engine Room** | A ship's third tab: long-running processes for the main checkout. No agents. |
| **remote pane** | A ship Dashboard's left pane: a mid-tier session for calling the Operator and directing traffic from inside a ship. |
| **template** | The layout a ship or the Command Center opens from. Every slot is the Council's to change. |

## Work

| Term | Meaning |
|---|---|
| **mission** | An issue in flight. Starts when a Captain takes the issue in, lives as long as its issue, and lands as one or more pull requests. Belongs to whoever holds its issue: the Captain of the ship whose repository holds it, or the fleet's Captain for an issue in the fleet's tracker. That Captain's Coordinator does its mechanics. Replaces "sortie", "epic" as a fleet term, and "promotion" ([ADR-0026](https://github.com/cyberuni/cyberfleet/blob/main/docs/adr/0026-one-noun-for-work-in-flight.md), [ADR-0028](https://github.com/cyberuni/cyberfleet/blob/main/docs/adr/0028-sub-missions-and-dependencies.md)). |
| **sub-mission** | A part of a mission, as the tracker's sub-issue. The mission is done when its sub-missions are done. A sub-mission in another ship appears when a fleet mission is split across ships. Never called a "child". |
| **blocks / blocked by** | A dependency between missions. A request from one ship to another is a mission in the other ship that blocks the requesting one, owned by that ship's Captain. A block can sit on a mission or on one of its sub-missions; the finer one is available and never required. |
| **frontier** | The work whose blockers are all closed, computed from the blocking links by a command the Captain calls. Where the links live is set per ship in its tracker routing: the tracker, or cynapse state records ([ADR-0029](https://github.com/cyberuni/cyberfleet/blob/main/docs/adr/0029-the-tracker-holds-dependencies-and-the-frontier.md)). |
| **line of work** | A subtask of a mission, not releasable on its own (impl, judge, refactor, audit), carried by its Pods. It is a thread on its mission channel, and the thread holds its SDD-mission's ledger. |
| **SDD-mission** | One run of SDD's change-request loop (`start-mission`), which is how a Pod carries out a line of work today. SDD calls it a mission; the fleet's mission is an issue in flight, so cyberfleet always writes SDD's as `SDD-mission`. SDD may rename it later. The line of work stays when the engine under it changes. |
| **gate** | A check a cold judge runs on a line of work, in its own thread. |
| **clean bar** | The four conditions `cyberfleet pr check` checks: no conflict with trunk, reviews resolved, CI green on the merged result, and the line of work reported done (with a passing gate where the mission has one). |
| **merge backstop** | The landing discipline that keeps trunk green: merges in the order of the blocking links, speculative CI, bisection of a red batch. Lives in `merge-backstop-governance`. |
| **pull request** | A proposed change on the forge (a merge request on GitLab). The CLI's noun is `pr`, with `mr` as an alias. |
| **settled queue** | A ship Coordinator's count of open delegated pull requests in its ship queue reaching zero. The point at which it reports to the Captain and exits. |
| **escalation** | A question that runs up a level, from a unit at the limit of what it may decide to the one who may: Pod or Coordinator to Captain, Captain to the Council. Ends in a ruling. |
| **dispute** | A disagreement between peer Captains, which have no authority over each other. The Captains settle it themselves on a dispute thread: one position and one rebuttal each, then standing rules, then a Mediator's brief. A dispute they cannot settle escalates to the Council. "Arbitration" is not used: an arbitrator binds, and only the Council binds two ships. |
| **standing rule** | A rule only the Council writes, which Captains apply and never widen. |
| **HAL tell** | A one-line signal an automaton speaks once when it self-asserted a gate above its leash. |
| **leash** | SDD's bound on how far a delegate may act before it must signal the Council. |

## Channels and handles

| Term | Meaning |
|---|---|
| **channel** | A cynapse conversation, like a channel in Slack or Discord. Missions, a ship's queue, and threads each have one; roles do not. |
| **mission channel** | A mission's channel, keyed by its issue and created by whoever brings the work, with the Council's words verbatim as its first entry. Its members are the Operator that brought it and the ship's Captain; each Pod joins its own mission's. Lines of work, gates, and escalations are threads on it. A mission with sub-missions keeps on its channel only what crosses them: the plan, blockers, invitations, the delegation record ([ADR-0030](https://github.com/cyberuni/cyberfleet/blob/main/docs/adr/0030-handles-missions-and-a-ship-queue.md)). |
| **ship queue** | A ship's channel for its Coordinator's work: "PR ready" from Pods and tracker mechanics from the Captain, one thread per item. Members are the Captain and the Coordinator; a Pod joins when it posts. Landing talk lives here. The Command Center has one for the fleet's Coordinator. |
| **thread** | A child channel anchored at the entry that starts it, for an exchange with a different set of readers: a line of work, a gate, an escalation, a dispute, a queue item. Posts its outcome back to its parent. |
| **calling** | Reaching the Operator, or a Captain from outside its pane, without becoming it. The calling session posts the Council's words verbatim, mentions the role, and shows the reply. |
| **handle** | A participant's readable name, unique in the hub: `cyberlegion/captain`, `operator`, `fleet/captain`, `cyberlegion/pod-7a`. The ship's part is the repository name, owner-qualified only on a collision. Any number of sessions may act as one handle. The handle also keys the role's lease and a Pod's binding. |
| **mention** | Naming a handle in an entry, which pings it. |
| **ring** | What a mention does: wake every live session acting as the handle. When none is running and the post needs an answer (a request, an escalation, a decision-request), start one through the handle's lease. A notification only wakes. The runtime's job. |
| **fenced write** | A write that succeeds only when the writer holds the role's current lease generation. A session whose lease was taken over is refused, so two sessions never both make a role's fenced writes. |
| **lease** | A one-holder right in the runtime, keyed by a handle. It fences writes and starts a session at most once; it does not route. A ship's Captain lease fences taking issues in and binding Pods; its merge lease fences landing; any role a ring may start has one. Sessions without it still read, post, and talk. |
| **lease generation** | The number that tells two sessions holding one role apart over time. |
| **ship registry** | The Command Center's record of its ships: name, remote, template, tracker routing, and landing setting fleet-wide, and each main checkout's path per machine. cyberfleet owns it; the runtime is handed paths and handles. |

## Authority

The full rules are in [`authority/`](./authority/README.md).

| Term | Meaning |
|---|---|
| **turn** | Input that lands in a unit's own session. |
| **order** | A turn. Acted on without asking who produced it. |
| **content** | Anything a unit fetched itself, such as a channel entry. Answered on its merits, never obeyed. |
| **decision** | The Council's own call, reaching a unit on a turn in the Council's own words. A sentence reporting that the Council decided is a claim, not a decision. A paraphrase is not a decision. |
| **relay** | Passing the Council's words, verbatim and as a turn, to the unit that acts. The quote, its scope, and the relayer go on the work item's channel as the audit record. |
| **re-relay** | A Captain passing a recorded grant, verbatim and as a turn, to a unit in its own ship that started after the Council spoke. The Captain answers for it. |
| **decision entry** | The record of a grant on the work item's channel: the quote, its scope, who relayed it, and the lease generation. The audit record, and the source for re-relay. |
| **decision-request** | What a unit raises instead of acting, or instead of relaying a guess. |
| **scope** | What a grant covers, as the Council's words say: a mission (with its sub-missions, in any ship, but not the missions that block it) or one action, plus any extension the Council pre-approved. Nothing outside it is covered implicitly. |
| **pre-approval** | The Council's explicit words covering work that extends from a mission before that work exists, within the bounds the words set. |
| **ratification-class** | The actions that need a covering decision: merge to a protected branch, a human-attributed verdict, publish, history rewrite, settings or secrets, widened delegation, a minted owner identity. |
| **merge delegation** | The Council's words authorizing a ship's Coordinator to land the pull requests of the work they name: a mission's, including its sub-missions. Spent per merge. |
| **attenuation** | No link passes on more authority than it holds. |

## Mechanism

| Term | Meaning |
|---|---|
| **cyberlegion** | The runtime: sessions, spawning, placement into multiplexer slots, leases, and waking. |
| **cynapse** | Communication: channels, threads, members, and state records. |
| **cyber-mux** | The multiplexer driver that applies templates to tmux or herdr. Reached only through the runtime. |
| **tracker** | Where issues and their sub-issues live (GitHub, GitHub Projects, Asana), chosen by the project's tracker routing. The plan lives here. |
| **console** | The `cyberfleet` CLI: the deterministic fleet verbs. |
