import { describe, expect, it } from 'vitest'
import { designPages, toPage } from '../scripts/sync-design.mjs'

const pages = designPages(['README.md', 'model.md', 'lifecycle.md', 'notes.txt'])

function page(content: string, source = '.agents/specs/cyberfleet/design/model.md') {
	return toPage({ source, content, pages, base: '/cyberfleet', order: 1 })
}

describe('designPages', () => {
	it('publishes each design file, the README as the index, and the glossary', () => {
		expect([...pages]).toEqual([
			['.agents/specs/cyberfleet/design/README.md', 'index'],
			['.agents/specs/cyberfleet/design/model.md', 'model'],
			['.agents/specs/cyberfleet/design/lifecycle.md', 'lifecycle'],
			['.agents/specs/cyberfleet/glossary.md', 'glossary'],
		])
	})
})

describe('toPage', () => {
	it('titles the page from its first heading and drops the heading from the body', () => {
		const out = page('# Model\n\nWhat it is.\n')
		expect(out).toContain('title: "Model"')
		expect(out).not.toContain('# Model')
		expect(out).toContain('What it is.')
	})

	it('points the edit link at the source file', () => {
		expect(page('# Model\n')).toContain(
			'editUrl: https://github.com/cyberuni/cyberfleet/edit/main/.agents/specs/cyberfleet/design/model.md',
		)
	})

	it('turns links to published files into site routes, keeping anchors', () => {
		const out = page('# M\n\nSee [lifecycle](./lifecycle.md#landing), [terms](../glossary.md), [index](./README.md).\n')
		expect(out).toContain('[lifecycle](/cyberfleet/design/lifecycle/#landing)')
		expect(out).toContain('[terms](/cyberfleet/design/glossary/)')
		expect(out).toContain('[index](/cyberfleet/design/)')
	})

	it('turns links to unpublished repository files into GitHub links', () => {
		expect(page('# M\n\n[rules](../authority/README.md)\n')).toContain(
			'[rules](https://github.com/cyberuni/cyberfleet/blob/main/.agents/specs/cyberfleet/authority/README.md)',
		)
	})

	it('leaves external and site-absolute links alone', () => {
		const out = page('# M\n\n[a](https://example.com/x.md) [b](/cyberfleet/overview/)\n')
		expect(out).toContain('[a](https://example.com/x.md)')
		expect(out).toContain('[b](/cyberfleet/overview/)')
	})

	it('renders mermaid fences through the Mermaid component, escaping the template literal', () => {
		const out = page('# M\n\n```mermaid\nflowchart TD\n  A["`x` ${y}"] --> B\n```\n')
		expect(out).toContain("import Mermaid from '../../../components/Mermaid.astro'")
		expect(out).toContain('<Mermaid code={`flowchart TD\n  A["\\`x\\` \\${y}"] --> B`} />')
	})

	it('imports the Mermaid component only when the page has a diagram', () => {
		expect(page('# M\n\nNo diagram.\n')).not.toContain('import Mermaid')
	})

	it('escapes braces and angle brackets in prose but not in code', () => {
		const out = page('# M\n\nA {b} <c> and `<d> {e}`.\n\n```\n<f> {g}\n```\n')
		expect(out).toContain('A \\{b\\} &lt;c> and `<d> {e}`.')
		expect(out).toContain('```\n<f> {g}\n```')
	})
})
