# cyberfleet design

The design of cyberfleet as a whole, written so a reader can understand the system from several
angles. The capability folders beside this one are organized for building it; these documents are
organized for understanding it.

This folder holds the **current** design: the one the project is building to, as decided through
ADR-0024. The capability specs and the code catch up to it through missions; where they still
differ, the design is the target and the difference is work to do. When a next version's design is
under way, it lives as a complete copy in a version folder inside this one, and replaces these files
in one commit when it becomes current. The two are never mixed in one document.

Terms are defined once in the [glossary](../glossary.md). The rules each capability enforces are in
its capability spec; these documents link to them rather than restating them.

| Document | The question it answers |
|---|---|
| [model](./model.md) | What the system is made of, and which rules hold everywhere |
| [lifecycle](./lifecycle.md) | How a piece of work travels from the Council's ask to merged code |

Why the design took this shape is recorded in the ADRs under `docs/adr/`.
