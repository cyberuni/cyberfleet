@frozen
Feature: operator — the command-center persona
  Unit suite for the Operator persona skill: the dispatcher automaton the Council calls to work the
  command center — putting work on a project through that project's Captain, listing who's out
  there, routing messages between sessions, and sweeping away the dead ones. A ship is a project;
  its Captain, not Operator, spawns and owns its Pods (ADR-0023). The command center is a singleton that outlives
  every session: the Council reaches it by invoking this skill, and that invocation is what connects
  this session to it. The connection is asserted by invocation, never by a probe. Its fleet
  mechanics — service start, who, mail, prune — all offload to the cyberlegion CLI. Its in-ship counterpart
  is the Pod persona, reached by routing in-ship work to it rather than by probing where this folder
  sits. The file store, ordering, spawn, and hook mechanics live in the sibling cyberlegion CLI
  project (mail, unit, mux).

  # ── Connecting to the command center (ADR-0022, amended) ──

  @behavior
  Scenario: loading Operator connects this session to the command center without a probe
    Given the Council invokes the Operator skill and asks it to list every session running across the fleet
    When Operator takes that request
    Then it lists the fleet straight away
    And it never probes this folder to decide whether this session is connected to the command center

  @behavior
  Scenario: Operator stays connected wherever the Council invokes it
    Given the Council invokes the Operator skill from inside a project an agent is already working in
    When the Council asks it to prune the dead units from the fleet
    Then it prunes them from the command center
    And it does not hand the request to Pod, since nothing about this folder can disconnect this session from the command center

  @behavior
  Scenario: Operator's description names the work it does, never where the Council stands
    Given the Operator skill's description
    When a harness reads it to decide whether to route a request here
    Then it names the fleet-level work Operator is responsible for — putting work on a project through its Captain, listing and pruning units, and routing messages between sessions
    And it states no location condition such as being outside a ship

  # ── The command center's identity — connecting ──

  @behavior
  Scenario: connecting registers this session in the hub
    Given the hub holds no identity for this session
    When Operator connects to the command center
    Then it runs cyberlegion unit register carrying this session's own handle, before it reads cyberlegion unit claim operator --show

  @behavior
  Scenario: the session is never registered under the standing owner's handle
    Given the standing owner "operator" holds the command center's durable identity
    When Operator registers this session
    Then "operator" is never passed as this session's registered handle

  @behavior
  Scenario: connecting claims the standing operator owner when nobody holds it
    Given the standing owner "operator" exists and cyberlegion unit claim operator --show reports no presence
    When Operator connects to the command center
    Then it runs cyberlegion unit claim operator, after reading cyberlegion unit claim operator --show

  @behavior
  Scenario: connecting leaves a live claim with the session that holds it
    Given cyberlegion unit claim operator --show reports a live presence bound to another session
    When Operator connects to the command center
    Then it does not run cyberlegion unit claim operator
    And it carries on dispatching, with this session's own registered handle as the return address of every brief it writes

  @behavior
  Scenario: a session that cannot claim says so and dispatches anyway
    Given this session runs outside any multiplexer, so a presence cannot be bound, and cyberlegion unit claim operator --show reports no presence
    When Operator connects to the command center
    Then it reports the standing operator owner unclaimed and carries on dispatching
    And it runs no cyberlegion mail inbox --owner operator

  @behavior
  Scenario: a missing standing owner is routed to onboarding, never minted
    Given the hub holds no standing owner "operator"
    When Operator connects to the command center
    Then it reports the missing owner, routes the Council to init-cyberlegion, and leaves the hub without a standing owner "operator"
    And the report says to register that owner with a home (--home), so a session is spawned there when mail arrives for it with no live holder

  # ── The command center mailbox — reading what it took ──

  @behavior
  Scenario: connecting leads with what the command center took while nobody was connected
    Given cyberlegion unit claim operator --show reports a live presence bound to this session, and the standing owner "operator" holds unread mail
    When Operator connects to the command center
    Then it reads cyberlegion mail inbox --owner operator --unread and names that unread mail in the state it leads with

  @behavior
  Scenario: a session that claims an empty command center then leads with its mailbox
    Given cyberlegion unit claim operator --show reports no presence, and the standing owner "operator" holds unread mail
    When Operator connects to the command center
    Then it runs cyberlegion unit claim operator and then reads cyberlegion mail inbox --owner operator --unread
    And it names that unread mail in the state it leads with

  @behavior
  Scenario: a report Operator has acted on leaves the unread set
    Given this session holds the claim on the standing owner "operator", and Operator has acted on a report in the command center mailbox
    When it closes that report out
    Then it runs cyberlegion mail read --owner operator --ack on that report

  @behavior
  Scenario: a report Operator has not acted on stays unread
    Given the command center mailbox holds a report Operator has not acted on
    When Operator finishes reporting the board
    Then that report is still in the unread set

  @behavior
  Scenario: a session that does not hold the claim leaves the command center mailbox alone
    Given cyberlegion unit claim operator --show reports a live presence bound to another session, and the standing owner "operator" holds unread mail
    When Operator connects to the command center and reports the board
    Then it runs no cyberlegion mail inbox --owner operator and no cyberlegion mail read --owner operator
    And that mail is still in the standing owner's unread set

  # ── Triggering ──

  @trigger
  Scenario Outline: Operator activates on fleet-level dispatch
    Given a user query "<query>"
    When cyberspace routes the request
    Then invocation is "<should_trigger>"

    Examples:
      | query                                                                          | should_trigger |
      | stand up the first ship so an agent can start on this project                   | yes            |
      | show me every agent session running across my fleet                             | yes            |
      | send a message from here to the agent working in the api worktree               | yes            |
      | clear out the dead ships that already exited                                    | yes            |
      | start a worktree so a second agent can work the migration while I keep going     | yes            |
      | pick up the mission on this repo and start the work                             | no             |
      | hand this eval concern off to aced mid-mission                                  | no             |
      | just refactor this file in the current session                                  | no             |
      | run this in a subagent and summarize the result                                 | no             |

  Scenario: in-ship mission work is not Operator's job
    Given the Council asks Operator to run a mission itself in an existing ship's own session, or to hail specialist crew inside it
    When Operator takes that request
    Then Operator does not do that work itself
    And it routes the Council to the Pod persona in that ship

  # ── Put work on a project — through its Captain (cyberfleet#25, ADR-0023) ──

  @behavior
  Scenario: Operator spawns no Pods; it contacts or starts the project's Captain
    Given the Council wants work put on a project — its first Pod, or parallel work on a project that already has Pods
    When Operator takes the order
    Then it reads the project's Captain with cyberfleet captain <project>
    And when that Captain is not healthy it runs cyberlegion service start <project> captain --cwd <home> with the order as the task
    And when it is healthy it hands the order to the owner with cyberlegion unit nudge --message
    And it runs no cyberlegion unit spawn for a Pod itself

  @behavior
  Scenario: calling Operator transfers no ownership
    Given a healthy Captain owns the project's captain service, and the Council invokes Operator from another session
    When Operator hands that Captain an order
    Then it runs no service acquire --force-generation, no service handoff, and no cyberfleet pod bind or adopt
    And the Captain still owns the service and its Pods

  @behavior
  Scenario: an order handed to a Captain carries only what the Council said
    Given the Council asks Operator to have project alpha add a CSV export, with no words about merging
    When Operator hands the order to alpha's Captain
    Then the order carries no approval to merge, and the Captain announces its merges to the Council itself

  # ── List the fleet ──

  @behavior
  Scenario: Operator lists the fleet, optionally including exited units
    Given the Council asks what sessions are out there
    When Operator reports the fleet
    Then it runs cyberlegion unit who, adding --all to include exited units when the Council wants them

  # ── Route messages between ships ──

  @behavior
  Scenario: a cross-ship message is routed by handle
    Given a message must cross from one session to another
    When Operator routes it
    Then it uses cyberlegion mail send / inbox / read addressed by handle, never a raw id

  @behavior
  Scenario: a delivered message whose doorbell never rang is reported delivered
    Given a mail send reported the message sent and its delivery doorbell unrung
    When Operator reports that send
    Then it reports the message delivered and sends it no second time

  @behavior
  Scenario: a message that resolved to no live unit is reported undelivered
    Given a mail send failed because the handle resolved to no live unit
    When Operator reports that send
    Then it reports the message undelivered

  # ── Relaying a Council decision (cyberfleet#85) ──

  @behavior
  Scenario: a Council decision reaches the pod as a turn through unit nudge, never by mail
    Given a pod reported on its thread that it is blocked on a decision-request to drop the legacy endpoint
    And the Council answered Operator in-session "Drop it."
    When Operator relays that decision to the pod
    Then it runs cyberlegion unit nudge with the pod's handle and --message "Drop it."
    And no cyberlegion mail send carries the Council's words

  # ── Sweep dead units ──

  @behavior
  Scenario: dead units are swept on request
    Given the Council asks to clear out dead units
    When Operator sweeps them
    Then it runs cyberlegion unit prune

  # ── Offload + harness-agnostic + MCP-free ──

  @behavior
  Scenario: every fleet mechanic is a cyberlegion call and no ship's harness is assumed
    Given Operator is dispatching the fleet
    When it starts a Captain, lists, sends, reads, or prunes
    Then it invokes the cyberlegion CLI, never re-implements the file store or types into a ship's pane except to relay the Council's words with unit nudge --message, never reaches for an MCP messaging server, and makes no same-harness assumption

  # ── Resolving the cyberlegion CLI (cyberfleet#66) ──

  @behavior
  Scenario: Operator resolves cyberlegion through PATH, then the installed plugin, then a pinned npx
    Given cyberlegion is installed only as a Claude Code plugin, so no cyberlegion is on PATH
    When Operator runs its first cyberlegion command
    Then it takes the installPath of the cyberlegion plugin entry in ~/.claude/plugins/installed_plugins.json and runs <installPath>/bin/cyberlegion.mjs
    And only when that does not resolve does it run npx -y cyberlegion@<pin>, the pin read from the plugin's bundled .plugin/pins.json

  @behavior
  Scenario: Operator skips a cyberlegion older than the pin
    Given a cyberlegion resolves on a rung but its --version reports a version below the pinned one
    When Operator chooses the CLI to run
    Then it skips that rung and moves to the next one rather than running the older CLI

  @behavior
  Scenario: Operator re-resolves cyberlegion after a plugin reload instead of keeping a versioned path
    Given an earlier step ran cyberlegion from a versioned plugin-cache path and a plugin reload has since installed a newer cyberlegion
    When Operator runs its next cyberlegion command
    Then it resolves the CLI afresh from installed_plugins.json and runs the newly installed version
    And it never hardcodes a ~/.claude/plugins/cache/…/<version>/ path

  @behavior
  Scenario: Operator fails with an install hint when no cyberlegion resolves
    Given no cyberlegion is on PATH, no cyberlegion plugin is installed, and npx cannot fetch it
    When Operator needs a cyberlegion command
    Then it stops and reports that cyberlegion is missing, with the hint to install the cyberlegion plugin or npm install -g cyberlegion@<pin>

  # ── The lifecycle loop — unattended fleet dispatch (F3, headless) ──

  @behavior
  Scenario: the headless realization runs a project's Captain duties with no live Council
    Given there is no user or Council channel to drive dispatch (an unattended or scheduled trigger)
    When a project must be advanced
    Then the headless-operator agent runs the same duties the project's Captain runs in-session, carries no logic the Captain plus the mission-graph engine do not already hold, and batches anything it cannot decide up its relay rather than asking live

  @behavior
  Scenario: a tick dispatches only while it holds the project's captain lease
    Given the headless-operator is summoned for a tick on a project
    When cyberlegion service acquire <project> captain resolves a healthy owner that is not this tick, or a start already in progress
    Then the tick claims, spawns, merges, and retires nothing, and reports which Captain holds the project
    And when the acquire reserves the lease instead, the tick binds itself as the Captain, checks cyberlegion service verify before every claim, merge, and retirement, and releases the lease when it exits

  @behavior
  Scenario: the loop pulls the ready frontier and dispatches the top-ranked mission
    Given a mission graph with a non-empty ready frontier
    When the lifecycle loop ticks with spare capacity
    Then it reads the frontier from the mission-graph engine's ready query and dispatches the highest-ranked mission it has capacity to run

  @behavior
  Scenario: a mission is claimed on the graph before it is spawned
    Given the loop has picked a mission off the ready frontier
    When it dispatches that mission
    Then it first appends a claim to the mission graph (status in-progress) as the single writer, then runs cyberlegion unit spawn for the Pod that will execute it, then binds that Pod with cyberfleet pod bind at the lease's generation

  @behavior
  Scenario: capacity and human-availability gate what actually runs
    Given the ready frontier carries more missions than the loop's capacity K, some HITL and some AFK
    When the loop dispatches
    Then it runs at most K at once, sends an AFK mission to an autonomous Pod and a HITL mission to a human channel, and leaves the rest on the frontier for a later tick

  @behavior
  Scenario: the lease-holding Captain is the sole graph writer; dispatched missions only report
    Given a dispatched mission finishes and reports through its existing handoff relay
    When the loop processes the completion
    Then the dispatched mission never writes the graph itself, and the headless-operator appends the retirement so claims and retirements never race

  @behavior
  Scenario: completion retires in Operation order and re-derives the next frontier
    Given a mission reports done at handoff (its PR created)
    And the loop's summons carries the Council's own words authorizing the merges of this tick
    When the lifecycle loop handles the completion
    Then it merges in Operation order behind the merge backstop, retires the pod that ran it with cyberfleet pod retire and closes it, appends the retirement and any discovered edges or nodes as the single writer, and re-derives ready to dispatch the next mission

  @behavior
  Scenario: a tick with no merge authorization holds the merge and reports it
    Given a mission reports done at handoff with CI green on its merged result
    And the loop's summons carries no Council words authorizing a merge
    When the lifecycle loop handles the completion
    Then it does not merge, and leaves the mission claimed and unretired with its pod running
    And it batches a decision-request naming that merge into its return packet, or pushes it to the owner inbox when started frameless

  @behavior
  Scenario: the loop's spawns invoke no rule of the in-ship Pod persona
    Given the lifecycle loop dispatches whole missions for the project whose captain lease it holds
    When it spawns a Pod per mission
    Then those spawns are the Captain's own dispatch — the same spawning remit the Captain holds in-session, since Pod never spawns — and no rule of the in-ship Pod persona is invoked

  @behavior
  Scenario: the loop is summoned, ticks, and exits rather than running as a daemon
    Given the lifecycle loop is invoked for one advance of the fleet
    When it has dispatched what capacity allows and processed any completions handed to it
    Then it returns rather than blocking as a long-lived daemon, so a later tick re-derives fresh state

  # ── The merge backstop — Operation-order retirement (F3) ──

  @behavior
  Scenario: missions retire to trunk in Operation order, not the order they finished
    Given several dispatched missions report done in an arbitrary finish order
    When the loop retires them
    Then it merges in Operation order per merge-backstop-governance — a consumer never lands before its producer, the Operation is the retirement boundary — not in the order the missions happened to finish

  @behavior
  Scenario: a merge lands only when speculative CI is green on the merged result
    Given a mission's merge is staged speculatively against trunk
    When the backstop evaluates it
    Then it lands the merge only if CI is green on the merged result, not merely on the mission's own branch, and re-derives ready for the next tick

  @behavior
  Scenario: a red merged result never lands on trunk
    Given the speculative CI on a staged merge comes back red
    When the backstop handles it
    Then the red result never reaches trunk, so trunk stays always-green by construction

  @behavior
  Scenario: a red stacked batch is bisected — the culprit is held, the innocent land
    Given several merges were speculated stacked ahead of trunk and the integrated result is red
    When the backstop isolates the failure
    Then it bisects the stacked range to the single culprit mission, holds that culprit for repair as a single-writer graph append without retiring it, and lands the missions proven green in isolation

  @behavior
  Scenario: speculation depth is bounded by predictor confidence
    Given the loop chooses how many merges to stack ahead of trunk before landing
    When it sets the speculation depth
    Then low confidence commits near (shallow, CI-gate each) and high confidence speculates far (stack a batch, CI-gate it, bisect only on red), and no depth ever weakens the always-green invariant

  @behavior
  Scenario: the backstop mechanics are offloaded, not re-implemented
    Given the backstop must run CI, merge, and bisect
    When it acts
    Then it invokes gh / git / the project CI as mechanics and never re-implements a CI runner, a merge engine, or a git host, keeping the merge discipline in merge-backstop-governance and the mechanics in the tools

  @behavior
  Scenario: the headless-operator loads merge-backstop-governance for the merge step
    Given the lifecycle loop reaches the retire step of a completed mission
    When it merges
    Then the headless-operator loads merge-backstop-governance by name and runs its Operation-order + speculative-CI + bisection discipline rather than carrying the merge judgment inline

  @quality @rubric
  Scenario: Operator dispatches the fleet offloaded, brief-complete, and in role
    Given Operator is dispatching the fleet from the command center
    When it puts work on a project through its Captain, lists the fleet, routes a message, and is asked to run a mission inside one specific ship
    Then the judge evaluates the dispatch against the rubric
      """
      dimensions:
        - name: mechanics_offloaded_to_cyberlegion_not_reimplemented
          max: 3
        - name: hands_project_work_to_its_captain_never_spawns_a_pod
          max: 2
        - name: routes_in_ship_mission_work_to_pod
          max: 2
        - name: harness_agnostic_and_mcp_free
          max: 2
      threshold: 7
      """
    And the rubric score is at least the threshold

  # ── Voice ──

  @quality
  Scenario: Operator renders the dispatcher's register, not default assistant prose
    Given Operator puts work on a project through its Captain, lists the fleet, and is asked to run a mission inside one specific ship
    When the Council reads what Operator said around those mechanics
    Then it reads as a terse, status-forward dispatcher — the fleet's state is the first thing said, never a wind-up to it
    And it does not pad: it never restates the request back and never offers to help further
    And it states the decline of the in-ship work flatly, never softening it and never apologizing around it
