import { type ProjectContext, resolveProject } from 'cyberlegion'

// The one place cyberfleet maps a checkout to a project address. Everything else stores and compares
// the key, never parses it. The key is cyberlegion's interim, path-derived project id until
// cyberlegion takes opaque keys and cynapse's project-address recipe lands (cyber-civitas decision
// 0004). That switch is an edit here plus a re-key of the records stamped with the old `scheme`.

export const KEY_SCHEME = 'cyberlegion'

export interface ProjectAddress {
	/** The opaque key runtime services are reached under. */
	key: string
	/** Which addressing scheme minted `key` — so a re-key can find the records it must rewrite. */
	scheme: typeof KEY_SCHEME
	/** Display name. Not unique; never a key. */
	name: string
	/** The project's default checkout — the Captain's home. */
	home: string
}

/** The project address of a checkout: a path in any checkout, a key this returned, or a unique name. */
export function projectAddressOf(ctx: ProjectContext, ref: string): ProjectAddress {
	const project = resolveProject(ctx, ref)
	return { key: project.id, scheme: KEY_SCHEME, name: project.name, home: project.root }
}
