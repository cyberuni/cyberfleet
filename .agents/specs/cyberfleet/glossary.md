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
| **Coordinator** | The low-tier automaton that does a Captain's mechanics. A ship's Coordinator lands pull requests, unless the ship's landing setting gives landing to Pods; the fleet's Coordinator files children in other ships, lifts blocks, and closes a mission whose children span ships once every child has closed. |
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
| **mission** | An issue in flight, owned by its ship's Captain. Starts when the Captain takes the issue in, lives as long as its issue, and lands as one or more pull requests. May have child missions in any ship, as the tracker's sub-issues; each child is owned by its own ship's Captain. The fleet's Coordinator files a child in another ship and keeps the tracker record of a mission whose children span ships. Replaces "sortie", "epic" as a fleet term, and "promotion" ([ADR-0026](https://github.com/cyberuni/cyberfleet/blob/main/docs/adr/0026-one-noun-for-work-in-flight.md)). |
| **child mission** | A mission that is a sub-issue of another. Adding children is how a Captain breaks work down or reaches another ship. Blocking a child instead of its parent, so the parent's other work goes on, is available and never required. |
| **line of work** | A subtask of a mission, not releasable on its own (impl, judge, refactor, audit), carried by its Pods. |
| **SDD-mission** | One run of SDD's change-request loop (`start-mission`), which is how a Pod carries out a line of work today. SDD calls it a mission; the fleet's mission is an issue in flight, so cyberfleet always writes SDD's as `SDD-mission`. SDD may rename it later. The line of work stays when the engine under it changes. |
| **gate** | A check a cold judge runs on a line of work, in its own thread. |
| **clean bar** | The four conditions `cyberfleet pr check` checks: no conflict with trunk, reviews resolved, CI green on the merged result, and the line of work reported done (with a passing gate where the mission has one). |
| **merge backstop** | The landing discipline that keeps trunk green: Operation order, speculative CI, bisection of a red batch. Lives in `merge-backstop-governance`. |
| **settled queue** | A ship Coordinator's count of open delegated pull requests reaching zero. The point at which it reports to the Captain and exits. |
| **escalation** | A question that runs up a level, from a unit at the limit of what it may decide to the one who may: Pod or Coordinator to Captain, Captain to the Council. Ends in a ruling. |
| **dispute** | A disagreement between peer Captains, which have no authority over each other. The Captains settle it themselves on a dispute thread: one position and one rebuttal each, then standing rules, then a Mediator's brief. A dispute they cannot settle escalates to the Council. "Arbitration" is not used: an arbitrator binds, and only the Council binds two ships. |
| **standing rule** | A rule only the Council writes, which Captains apply and never widen. |
| **HAL tell** | A one-line signal an automaton speaks once when it self-asserted a gate above its leash. |
| **leash** | SDD's bound on how far a delegate may act before it must signal the Council. |

## Channels and addressing

| Term | Meaning |
|---|---|
| **channel** | A cynapse conversation. Work items, roles, and threads each have one. |
| **address channel** | A role's inbox channel. The Operator's takes the Council's calls; the ship address channel (owner: the Captain) takes requests, landing reports, and escalation pointers; a Coordinator's takes "PR ready". |
| **mission channel** | A mission's work channel. The ship's Captain and Coordinator are members of every one in their ship; each Pod is a member of its own mission's. A parent's channel carries only what crosses its children: the plan, blockers, invitations, the delegation record. |
| **thread** | A child channel anchored at the entry that starts it, for an exchange with a different set of readers: a gate, an escalation, a dispute. Posts its outcome back to its parent. |
| **calling** | Reaching the Operator, or a Captain from outside its pane, without becoming it. The calling session posts the Council's words verbatim, rings the role, and shows the reply. |
| **ring** | Starting or waking a channel's owner after posting to it, transparently: the sender never checks whether it is running. The runtime's job (`cyberlegion send --start`). |
| **fenced write** | A write that succeeds only when the writer holds the role's current lease generation. A session whose lease was taken over is refused, so two sessions never both act as one role. |
| **lease** | The fenced right to act as a role, held in the runtime. A ship has two: the Captain's (missions and plan) and the merge lease, held by whichever unit lands. The Command Center holds the same pair. |
| **lease generation** | The number that tells two sessions holding one role apart over time. |
| **project address** | The cynapse address of a project, used by the runtime as an opaque key. Roles are keyed from it (`<project-address>/captain`). |

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
| **scope** | What a grant covers, as the Council's words say: a mission (with its children, in any ship) or one action, plus any extension the Council pre-approved. Nothing outside it is covered implicitly. |
| **pre-approval** | The Council's explicit words covering work that extends from a mission before that work exists, within the bounds the words set. |
| **ratification-class** | The actions that need a covering decision: merge to a protected branch, a human-attributed verdict, publish, history rewrite, settings or secrets, widened delegation, a minted owner identity. |
| **merge delegation** | The Council's words authorizing a ship's Coordinator to land the pull requests of the work they name: a mission's, including its children. Spent per merge. |
| **attenuation** | No link passes on more authority than it holds. |

## Mechanism

| Term | Meaning |
|---|---|
| **cyberlegion** | The runtime: sessions, spawning, placement into multiplexer slots, leases, and waking. |
| **cynapse** | Communication: channels, threads, members, and state records. |
| **cyber-mux** | The multiplexer driver that applies templates to tmux or herdr. Reached only through the runtime. |
| **tracker** | Where issues and their sub-issues live (GitHub, GitHub Projects, Asana), chosen by the project's tracker routing. The plan lives here. |
| **console** | The `cyberfleet` CLI: the deterministic fleet verbs. |
