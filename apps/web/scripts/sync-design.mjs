// Publishes the project spec's design docs and glossary as site pages.
//
// The design lives in `.agents/specs/cyberfleet/` so it has one home. This script turns each file
// into a generated MDX page under `src/content/docs/design/` (gitignored): the first heading
// becomes the title, links to other published files become site routes, links to anything else in
// the repository become GitHub links, and mermaid fences render through the site's Mermaid
// component.

import { mkdir, readdir, readFile, rm, writeFile } from 'node:fs/promises'
import { join, posix } from 'node:path'
import { fileURLToPath } from 'node:url'

const REPO_BLOB = 'https://github.com/cyberuni/cyberfleet/blob/main/'
const REPO_EDIT = 'https://github.com/cyberuni/cyberfleet/edit/main/'
const SPEC_DIR = '.agents/specs/cyberfleet'

/**
 * The files to publish, as repository-relative source path → page slug under `design/`.
 * The design folder's README is the section index; the glossary sits beside it.
 */
export function designPages(designFiles) {
	const pages = new Map()
	for (const name of designFiles) {
		if (!name.endsWith('.md')) continue
		const slug = name === 'README.md' ? 'index' : name.replace(/\.md$/, '').toLowerCase()
		pages.set(`${SPEC_DIR}/design/${name}`, slug)
	}
	pages.set(`${SPEC_DIR}/glossary.md`, 'glossary')
	return pages
}

function route(base, slug) {
	return slug === 'index' ? `${base}/design/` : `${base}/design/${slug}/`
}

/** Escape what MDX would read as an expression or a tag, outside code. */
function escapeProse(text) {
	return text.replace(/[{}]/g, (c) => `\\${c}`).replace(/<(?=[A-Za-z/!])/g, '&lt;')
}

/** Apply `fn` to the prose of a markdown body, leaving fenced and inline code untouched. */
function mapProse(body, fn) {
	return body
		.split(/(^```[\s\S]*?^```$)/m)
		.map((block) =>
			block.startsWith('```')
				? block
				: block
						.split(/(`[^`\n]*`)/)
						.map((part) => (part.startsWith('`') ? part : fn(part)))
						.join(''),
		)
		.join('')
}

/**
 * Turn one design file into a generated MDX page.
 *
 * @param {object} input
 * @param {string} input.source repository-relative path of the file
 * @param {string} input.content its markdown
 * @param {Map<string, string>} input.pages every published file, source path → slug
 * @param {string} input.base the site's base path, e.g. `/cyberfleet`
 * @param {number} input.order its sidebar position
 */
export function toPage({ source, content, pages, base, order }) {
	const heading = content.match(/^# (.+)$/m)
	if (!heading) throw new Error(`${source} has no top-level heading to title the page`)
	const title = heading[1].trim()
	let body = content.replace(heading[0], '').replace(/^\s+/, '')

	const dir = posix.dirname(source)
	body = mapProse(body, (prose) =>
		escapeProse(prose).replace(/\]\(([^)\s]+)\)/g, (link, target) => {
			if (/^([a-z]+:|#|\/)/.test(target)) return link
			const [path, hash = ''] = target.split('#')
			const resolved = posix.normalize(posix.join(dir, path)).replace(/\/$/, '')
			const anchor = hash ? `#${hash}` : ''
			const slug = pages.get(resolved)
			return slug ? `](${route(base, slug)}${anchor})` : `](${REPO_BLOB}${resolved}${anchor})`
		}),
	)

	let diagrams = 0
	body = body.replace(/^```mermaid\n([\s\S]*?)^```$/gm, (_, code) => {
		diagrams++
		const literal = code
			.replace(/\n$/, '')
			.replace(/[\\`]/g, (c) => `\\${c}`)
			.replace(/\$\{/g, '\\${')
		return `<Mermaid code={\`${literal}\`} />`
	})

	const frontmatter = [
		'---',
		`title: ${JSON.stringify(title)}`,
		`editUrl: ${REPO_EDIT}${source}`,
		'sidebar:',
		`  order: ${order}`,
		'---',
		'',
	]
	if (diagrams > 0) frontmatter.push("import Mermaid from '../../../components/Mermaid.astro'", '')
	frontmatter.push(`{/* Generated from ${source} by scripts/sync-design.mjs. Edit the source, not this page. */}`, '')
	return `${frontmatter.join('\n')}${body}`
}

async function main() {
	const webRoot = fileURLToPath(new URL('..', import.meta.url))
	const repoRoot = join(webRoot, '../..')
	const config = await readFile(join(webRoot, 'astro.config.mjs'), 'utf8')
	const base = config.match(/base:\s*'([^']+)'/)?.[1] ?? ''

	const pages = designPages(await readdir(join(repoRoot, SPEC_DIR, 'design')))
	const outDir = join(webRoot, 'src/content/docs/design')
	await rm(outDir, { recursive: true, force: true })
	await mkdir(outDir, { recursive: true })

	const ordered = [...pages].sort(([, a], [, b]) => rank(a) - rank(b) || a.localeCompare(b))
	for (const [index, [source, slug]] of ordered.entries()) {
		const content = await readFile(join(repoRoot, source), 'utf8')
		await writeFile(join(outDir, `${slug}.mdx`), toPage({ source, content, pages, base, order: index }))
	}
}

/** The index first, the model next, the glossary last; other perspectives between, by name. */
function rank(slug) {
	return { index: 0, model: 1, glossary: 3 }[slug] ?? 2
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) await main()
