# ADR-0027: CLI commands are noun-verb; automatons are addressed in prose

## Status

Accepted, 2026-10-15. Renames the commands named in [ADR-0024](0024-ship-crew.md) and the
commands that ship today. Uses the single work noun from [ADR-0026](0026-one-noun-for-work-in-flight.md).

## Context

cyberfleet has two surfaces. Skills address an automaton: the Council calls `/captain` and says
what it wants in free prose. The CLI acts on things: a mission, a pull request, a ship. The commands
grew without a rule. Some are verbs with no noun (`jump`, `pause`), one is a plural noun beside a
singular group (`pods` beside `pod bind`), one is a bare noun (`captain`), and the design added
`pr clean`, which reads as a verb that cleans the pull request.

## Decision

1. **Skills route by noun, then take prose.** A persona's name is the route, and what follows it is
   free-flowing.
2. **CLI commands are `<noun> <verb>`.** A top-level verb or noun is allowed only where the CLI
   itself is the noun, as `git commit` commits to git. A noun is never a command on its own.
3. **The commands become:**

   | Was | Becomes |
   |---|---|
   | `missions` | `status`: the fleet's status, so the CLI is the noun |
   | `captain [project]` | `captain show [project]` |
   | `pods [project]` | `pod list [project]` |
   | `pod bind\|retire` | unchanged |
   | `gate approve` | unchanged, and still stubbed |
   | `jump <peer>` | folded into `ship board`; `pod focus <pod>` if focusing a Pod's pane is still wanted |
   | `pause <peer>` | removed: it marks a session, and nothing in the design reads the mark |
   | `ship open` (design) | `ship board <name\|project\|path>`: bring the ship's workspace up from its template if it is down, and focus it |
   | `pr clean` (design) | `pr check <pr>`: check the clean bar and report it through the exit status |
   | `epic ...` (design) | `mission add-child`, `mission block --on <issue>`, `mission unblock`, `mission close` |

## Consequences

- The renames of shipped commands are one breaking change, with the old names kept as deprecated
  aliases for one release.
- The unbuilt commands take their new names in the design now.
- The rule applies to any CLI, so its general statement belongs with the CLI conventions the other
  cyberuni CLIs follow, not only here.
