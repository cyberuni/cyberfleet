# operator-captain-claim — proposed suite edits (awaiting the re-open)

Target: `.agents/specs/cyberfleet/operator/operator.feature` (`@frozen`). Edits 1–4 rewrite or narrow
frozen scenarios, so they fire **Clearance** and need a ratified re-open before they are written.
Edits 5–6 are additive.

## 1. rewrite — "connecting claims the standing operator owner so the doorbell reaches this session"

```gherkin
  Scenario: connecting claims the standing operator owner only when it has no live presence
    Given the standing owner "operator" exists and cyberlegion unit claim operator --show reports no presence
    When Operator connects to the command center
    Then it runs cyberlegion unit claim operator
```

## 2. rewrite (inverts) — "connecting takes the claim even when another session already holds it"

```gherkin
  Scenario: connecting leaves a live claim with the session that holds it
    Given cyberlegion unit claim operator --show reports a live presence bound to another session
    When Operator connects to the command center
    Then it does not run cyberlegion unit claim operator
    And it dispatches with this session's own registered handle as the return address
```

## 3. narrow — "a session that cannot claim says so and dispatches anyway"

Given gains "and the standing owner "operator" has no live presence".

## 4. narrow — "connecting leads with what the command center took while nobody was connected"

Given gains "this session holds the claim on the standing owner "operator"" (same on "a report
Operator has acted on leaves the unread set").

## 5. add — a non-holder leaves the standing mailbox alone

```gherkin
  Scenario: a session that does not hold the claim leaves the standing mailbox alone
    Given another session holds the live claim on the standing owner "operator", and that owner holds unread mail
    When Operator connects to the command center
    Then it runs no cyberlegion mail inbox --owner operator and no cyberlegion mail read --owner operator
```

## 6. add — the init route names the home

"a missing standing owner is routed to onboarding" gains an `And`: the report says to register the
owner with `--home` so a captain respawns there. (An added `And` on a frozen scenario is a
strengthening, though it is still a rewrite of that scenario.)

## Version dependency

`--home` and spawn-on-delivery come from cyberlegion#155, merged 2026-10-05 and not in any release yet
(latest is 1.3.0, published 2026-10-02). The plugin pin (`.plugin/pins.json`, 1.1.0) and the
`^1.0.0` range are not bumped here. Follow-up: raise the pin once a release includes #155.
