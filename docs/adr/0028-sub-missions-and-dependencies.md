# ADR-0028: Sub-missions and dependencies are different relations; a mission belongs to whoever holds its issue

## Status

Accepted, 2026-10-15. Amends [ADR-0025](0025-authority-never-expands-implicitly.md) decision 2 and
[ADR-0026](0026-one-noun-for-work-in-flight.md) decisions 2 and 3.

## Context

ADR-0026 gave a mission "child missions in any ship" and made work that crosses a repository
boundary a child. "Child" then covered two relations:

- **Decomposition.** A mission is done when its parts are done, and the parts exist only because of
  it. The tracker calls them sub-issues.
- **Dependency.** A mission cannot go on until another is done. The other mission is its own work:
  its ship's Captain owns its scope, it ships in that ship's release, and other consumers may need
  it too.

A request from one ship to another is a dependency, not a part. Calling it a child produced phrases
such as "a mission whose children span ships", which named neither relation. It also gave the
parent's tracker work to the fleet's Coordinator, a holdover from when an epic belonged to no ship.

## Decision

1. **A sub-mission is a part.** A mission may have sub-missions, as the tracker's sub-issues. The
   mission is done when its sub-missions are done. "Sub-mission" replaces "child mission".
2. **A dependency is "blocks" and "blocked by".** A request across ships is a mission in the other
   ship that blocks the requesting mission. The other ship's Captain accepts it as its own mission,
   declines it, or asks the Council. This is the default across ships.
3. **A mission belongs to whoever holds its issue.** A mission whose issue lives in a ship belongs
   to that ship's Captain, and that ship's Coordinator does its mechanics: filing, blocking,
   unblocking, closing. Filing an issue in another repository takes no authority there. A mission
   whose issue lives in the fleet's tracker belongs to the fleet's Captain, and the fleet's
   Coordinator does its mechanics.
4. **Grants follow sub-missions, not dependencies.** A grant on a mission covers its sub-missions in
   any ship, within its words or a pre-approval. A blocking mission in another ship is that ship's
   own work and is covered only by the Council's words naming it or by a pre-approval, such as "any
   fix #42 needs in cyberlegion". To grant once over an effort across ships, make it a mission with
   sub-missions.
5. **The command is `mission add-sub`**, replacing `mission add-child`. `mission block --on` already
   covers dependencies.
6. **`pr` is the CLI's noun for a pull request**, with `mr` as an alias. The glossary term is "pull
   request (a merge request on GitLab)".

## Consequences

- The fleet's Coordinator no longer keeps other ships' parent missions. It does the mechanics of
  fleet missions only, like any ship's Coordinator for its own ship.
- A sub-mission in another ship is rare: it appears when a fleet mission is split across ships.
- ADR-0025's "a mission grant reaches every ship" now holds through sub-missions only.
