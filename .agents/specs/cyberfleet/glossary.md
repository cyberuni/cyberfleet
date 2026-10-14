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
| **Coordinator** | The low-tier automaton that does a Captain's mechanics. A ship's Coordinator lands pull requests, unless the ship's landing setting gives landing to Pods; the fleet's Coordinator keeps epics and lands missions. |
| **landing setting** | A ship's choice of who lands its pull requests: the Coordinator (the default) or each Pod its own. The Council can override it for a request. |
| **Pod** | A worker automaton carrying one line of work in one sortie, in its own workspace and worktree. Spawned and owned by the Captain. |
| **owned Pod** | A Pod with a binding record under its ship's Captain role. The Captain lists, directs, and retires its owned Pods, and the next Captain session inherits them. The Coordinator also directs a Pod while it lands that Pod's pull request. |
| **binding** | Writing a Pod's ownership record when the Captain spawns it. **Retiring** marks the record done; a retired Pod is never bound again. |
| **gate judge** | A cold automaton a Pod spawns into a gate thread to judge its line of work. Like everything in the ship it is the Captain's to see and clean up, but it works only from its gate's brief, and no one directs its verdict. It ends with its gate. |
| **Mediator** | A cold, headless, high-tier automaton that writes a brief of a dispute for the Council. Decides nothing. |
| **specialist crew** | A recruited specialist automaton with its own face (aced, quill, Warden, Scanner), installed as a persona gateway skill. |
| **Crimp** | The persona that recruits specialist crew types from the Tavern and discharges them. Spec: [`recruitment/`](./recruitment/README.md). |
| **Mechanic** | The persona that builds a new automaton or reconfigures an existing one. Spec: [`mechanic/`](./mechanic/README.md). |
| **Tavern** | The marketplace query that lists recruitable specialist crews. |
| **tier** | The model class an automaton runs on: high, mid, or low. Set by the work's need for judgment. |

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
| **sortie** | An issue in flight: releasable on its own, in one repository, owned by its ship's Captain. Lands as one or more pull requests. Lives as long as its issue. |
| **mission** | An epic in flight: several sorties delivering one outcome. No ship holds it: the Captain that created it decides its children, the fleet's Coordinator keeps its tracker record behind its own lease, and each sortie in it belongs to its own ship's Captain. |
| **line of work** | A subtask of a sortie, not releasable on its own (impl, judge, refactor, audit), carried by its Pods. |
| **promotion** | Deliberately making an issue an epic. The only way a mission comes into being, apart from work that crosses a repository boundary, which forces one. |
| **SDD-mission** | One run of SDD's change-request loop (`start-mission`), which is how a Pod carries out a line of work today. SDD calls it a mission; the fleet's mission is an epic, so this name keeps the two apart. The line of work stays when the engine under it changes. |
| **gate** | A check a cold judge runs on a line of work, in its own thread. |
| **clean bar** | The four conditions `cyberfleet pr clean` checks: no conflict with trunk, reviews resolved, CI green on the merged result, and the line of work reported done (with a passing gate where the sortie has one). |
| **merge backstop** | The landing discipline that keeps trunk green: Operation order, speculative CI, bisection of a red batch. Lives in `merge-backstop-governance`. |
| **settled queue** | A ship Coordinator's count of open delegated pull requests reaching zero. The point at which it reports to the Captain and exits. |
| **escalation** | A question that runs up a level, from a unit at the limit of what it may decide to the one who may. Ends in a ruling. |
| **dispute** | A disagreement that runs sideways between peer Captains. Climbs arbitration, standing rules, a Mediator's brief, then the Council. |
| **standing rule** | A rule only the Council writes, which Captains apply and never widen. |
| **HAL tell** | A one-line signal an automaton speaks once when it self-asserted a gate above its leash. |
| **leash** | SDD's bound on how far a delegate may act before it must signal the Council. |

## Channels and addressing

| Term | Meaning |
|---|---|
| **channel** | A cynapse conversation. Work items, roles, and threads each have one. |
| **address channel** | A role's inbox channel. The Operator's takes the Council's calls; the ship address channel (owner: the Captain) takes requests, landing reports, and escalation pointers; a Coordinator's takes "PR ready". |
| **sortie channel** | The issue's work channel. The ship's Captain and Coordinator are members of every one; each Pod is a member of its own sortie's. |
| **mission channel** | The epic's work channel. Carries only what crosses sorties: the plan, blockers, invitations, the delegation record. |
| **thread** | A child channel anchored at the entry that starts it, for an exchange with a different set of readers: a gate, an escalation, an arbitration. Posts its outcome back to its parent. |
| **calling** | Reaching the Operator, or a Captain from outside its pane, without becoming it. The calling session posts the Council's words verbatim, rings the role, and shows the reply. |
| **ring** | Starting or waking a channel's owner after posting to it, transparently: the sender never checks whether it is running. The runtime's job (`cyberlegion send --start`). |
| **fenced write** | A write that succeeds only when the writer holds the role's current lease generation. A session whose lease was taken over is refused, so two sessions never both act as one role. |
| **lease** | The fenced right to act as a role, held in the runtime. A ship has two: the Captain's (sorties and plan) and the merge lease, held by whichever unit lands. The Command Center holds the same pair. |
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
| **scope** | What a grant covers, as the Council's words say: a mission, a sortie, or one action, plus any extension the Council pre-approved. Nothing outside it is covered implicitly. |
| **pre-approval** | The Council's explicit words covering work that extends from a mission or sortie before that work exists, within the bounds the words set. |
| **ratification-class** | The actions that need a covering decision: merge to a protected branch, a human-attributed verdict, publish, history rewrite, settings or secrets, widened delegation, a minted owner identity. |
| **merge delegation** | The Council's words authorizing a ship's Coordinator to land the pull requests of the work they name: a mission's sorties or one sortie's. Spent per merge. |
| **attenuation** | No link passes on more authority than it holds. |

## Mechanism

| Term | Meaning |
|---|---|
| **cyberlegion** | The runtime: sessions, spawning, placement into multiplexer slots, leases, and waking. |
| **cynapse** | Communication: channels, threads, members, and state records. |
| **cyber-mux** | The multiplexer driver that applies templates to tmux or herdr. Reached only through the runtime. |
| **tracker** | Where issues and epics live (GitHub, GitHub Projects, Asana), chosen by the project's tracker routing. The plan lives here. |
| **console** | The `cyberfleet` CLI: the deterministic fleet verbs. |
