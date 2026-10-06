# captain

The project's resident automaton — a persona skill for the one Captain each project has. The Captain
is cyberlegion's `captain` project service, based in the project's default checkout, and it owns the
Pods that carry the project's sorties (ADR-0023).

## When to use

- You want work put on a project: the Captain spawns a Pod for it in its own worktree.
- You need to know who holds a project, which Pods are out, and which are unavailable or orphaned.
- A Pod's pull request is ready to gate, merge, and retire.

Not for working a mission inside a Pod — that is `pod`. Not for reaching another project, or for the
Council's portable entry point — that is `operator`, which contacts a project's Captain without
taking anything over.

## What it does

- Reads the Captain with `cyberfleet captain`, and contacts or starts the one Captain with
  `cyberlegion service start <project> captain --cwd <home>` — concurrent starts launch once, and a
  healthy Captain is never replaced by a caller.
- Verifies its lease (`cyberlegion service verify … --generation <n>`) before every claim, merge, Pod
  record, and retirement, so a stale Captain stops instead of acting.
- Spawns each Pod into its own worktree and records itself as the Pod's one owner with
  `cyberfleet pod bind`. The brief names this Captain's handle as the return address.
- Announces merges, gates each pull request on the clean bar, merges in dependency order, then retires
  the Pod once with `cyberfleet pod retire` before closing it.
- Keeps unavailable and orphaned Pods visible (`cyberfleet pods`), restarts its own session to recover,
  and takes over a replaced Captain's Pods only with `cyberfleet pod adopt`.
- Never edits a sortie in its home or switches its branch, and never invents Council approval for an
  order it was relayed (`authority-governance`).

Every mechanic is a CLI call — `cyberlegion` for the lease, spawn, mail, and close; `cyberfleet` for
the Captain view and Pod ownership; `gh` and git for the merge.
