Feature: captain — the project's resident persona
  Unit suite for the Captain persona skill and the ownership record it keeps. A project has one
  authoritative Captain: cyberlegion's captain project service, fenced by generation, based in the
  project's default checkout. The Captain spawns the Pods that carry the project's sorties, each in
  its own worktree and bound to exactly one owning Captain, merges their clean work, and retires each
  Pod once. The mail half of cyberfleet#25 (report routing, the standing operator mailbox) is
  cyberfleet#92 and is not specified here.

  # ── One Captain per project ──

  @behavior
  Scenario: a vacant project starts one Captain in its home
    Given cyberfleet captain reports the project's Captain as vacant, with home "/code/alpha"
    When the Captain persona is asked to put work on that project
    Then it runs cyberlegion service start <project> captain --cwd /code/alpha
    And it passes the project key exactly as cyberfleet captain reported it

  @behavior
  Scenario: a healthy Captain is contacted, never replaced
    Given cyberfleet captain reports a healthy Captain owned by another session
    When this session is asked to put work on that project
    Then it hands the order to that Captain with cyberlegion unit nudge --message
    And it runs no service acquire --force-generation and no service handoff

  Scenario: concurrent starts launch one Captain
    Given two sessions run cyberlegion service start for the same project's captain at once
    When both return
    Then exactly one Captain session was launched, and both name the same owner and generation

  @behavior
  Scenario: the home is never switched or edited
    Given cyberfleet captain reports homeBranch "feature" and defaultBranch "main"
    When the Captain prepares to dispatch
    Then it reports that its home is not on the default branch
    And it does not switch the home's branch and makes no sortie edit in the home

  Scenario: the Captain view reports the home branch without switching it
    Given a project whose default checkout is on a branch other than the default branch
    When cyberfleet captain reads it
    Then it reports homeBranch and defaultBranch, and the checkout is still on its branch

  # ── Pods are owned ──

  @behavior
  Scenario: every Pod is spawned into its own worktree and bound to one Captain
    Given this session holds the project's captain lease at generation 3
    When the Captain dispatches a Pod for mission "github-25"
    Then it runs cyberlegion unit spawn -C <home> --at workspace
    And it then runs cyberfleet pod bind <handle> --project <project> --generation 3 --mission github-25

  Scenario: a Pod is bound to the current Captain at its generation
    Given a Captain owns the project's captain service at generation 1, and a Pod runs in a worktree of the project
    When the Captain binds the Pod
    Then the Pod's record names that Captain and generation 1, and cyberfleet pods lists it

  Scenario: a Pod in the home or another project is refused
    Given a Pod unit that has no worktree, sits in the Captain's home, or runs in another project's checkout
    When the Captain binds it
    Then the bind is refused and no record is written

  Scenario: a Pod already owned is not given a second owner
    Given a Pod bound to a Captain at an older generation
    When the current Captain binds it
    Then the bind is refused and names adoption as the way to take it over

  @behavior
  Scenario: the brief names the Captain's own handle
    Given the Captain is writing the cold brief for a Pod it is about to spawn
    When it names where the Pod reports back
    Then the brief names this Captain's own registered handle, and never its id or the handle operator, as the return address

  # ── Fencing: a stale Captain cannot act ──

  Scenario: a stale Captain cannot record or retire a Pod
    Given the captain service was handed off from Captain A at generation 1 to Captain B
    When Captain A binds or retires a Pod at generation 1
    Then the act is refused as stale

  Scenario: a session that does not own the Captain service cannot record a Pod
    Given a session that does not hold the project's captain lease
    When it binds a Pod
    Then the bind is refused

  @behavior
  Scenario: a stale Captain stops acting
    Given cyberlegion service verify <project> captain --generation <n> refuses this session
    When the Captain was about to merge a pull request
    Then it does not merge, record, or retire anything for the project
    And it reports that a newer Captain holds the project

  Scenario: a Pod is retired once
    Given a Pod bound to the current Captain
    When the Captain retires it twice
    Then the first retirement succeeds and the second is refused as already retired

  @behavior
  Scenario: retirement goes through the fenced record before the unit is closed
    Given a Pod's pull request merged under the Council's delegation
    When the Captain retires the Pod
    Then it runs cyberfleet pod retire before cyberlegion unit close
    And when cyberfleet pod retire is refused, it closes nothing and reports why

  @behavior
  Scenario: a relayed order carries no Council approval
    Given the Operator relays an order to put work on the project, with no Council words about merging
    When the Captain dispatches it
    Then it announces the merges and waits for the Council's reply before merging, as authority-governance §7 requires

  # ── Recovery ──

  Scenario: unavailable and orphaned Pods stay visible
    Given one Pod whose Captain's session is gone, and one whose Captain was replaced by a newer generation
    When cyberfleet pods lists the project
    Then the first is listed unavailable and the second orphaned, and neither is dropped

  @behavior
  Scenario: a restarted Captain keeps its Pods
    Given cyberfleet pods lists the project's Pods as unavailable because the Captain's session is gone
    When the Captain is recovered
    Then it runs cyberlegion unit restart on that Captain, keeping its lease, generation, and Pods

  Scenario: an orphan moves only by explicit adoption
    Given a Pod orphaned by a newer Captain generation
    When the current Captain adopts it
    Then the Pod's record names the current Captain, and the replaced Captain can no longer retire it

  @behavior
  Scenario: an orphan with no working control is reported, not adopted
    Given an orphaned Pod for which cyberlegion unit show lists no working control
    When the current Captain reviews its Pods
    Then it reports that Pod as orphaned and unrecoverable from here, and does not run cyberfleet pod adopt

  Scenario: two projects keep independent Captains
    Given projects alpha and beta, each with its own Captain and Pods
    When cyberfleet pods lists each project
    Then each lists only its own Pods under its own Captain

  # ── Headless shares the lease ──

  @behavior
  Scenario: a headless tick dispatches only under the lease
    Given a healthy interactive Captain holds the project's captain lease
    When the headless-operator is summoned for a tick on that project
    Then it dispatches nothing, retires nothing, and reports which Captain holds the project

  # ── Triggering ──

  @trigger
  Scenario Outline: Captain activates on project-resident work
    Given a user query "<query>"
    When cyberspace routes the request
    Then invocation is "<should_trigger>"

    Examples:
      | query                                                                | should_trigger |
      | take charge of this repo and spin up a pod for the auth fix           | yes            |
      | which pods does this project have out, and are any orphaned           | yes            |
      | merge the pods' pull requests that are clean and retire them          | yes            |
      | the captain for this project died, recover it and its pods            | yes            |
      | pick up the mission in this worktree and start the work              | no             |
      | show me every agent session running across all my projects          | no             |
      | recruit a security reviewer crew from the tavern                      | no             |
      | just refactor this file in the current session                       | no             |
