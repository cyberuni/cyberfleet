// The canonical plugin manifest carries its own `version`, which nothing bumps on its own.
// Changesets only touches package.json files, so this runs from the `version` script
// to keep the manifest in step with the published `cyberfleet` npm package. The vendor
// manifests (`.claude-plugin/`, `.codex-plugin/`) are derived from it by
// `universal-plugin plugin build`, which the `version` script runs next.
//
// The npm package root doubles as the plugin root, so the manifest sits beside the
// package.json it takes its version from.
//
// Rewrites the version line textually rather than reserialising the JSON, so biome's
// formatting (tabs, inlined short arrays) survives untouched.
import { readFileSync, writeFileSync } from 'node:fs'

const SOURCE = 'packages/cyberfleet/package.json'
const MANIFESTS = ['packages/cyberfleet/plugin.json']

const { version } = JSON.parse(readFileSync(SOURCE, 'utf8'))
if (!version) throw new Error(`no version field in ${SOURCE}`)

for (const file of MANIFESTS) {
	const before = readFileSync(file, 'utf8')
	const after = before.replace(/("version":\s*)"[^"]*"/, `$1"${version}"`)
	if (after === before) {
		console.info(`${file} already at ${version}`)
		continue
	}
	writeFileSync(file, after)
	console.info(`${file} -> ${version}`)
}

// Skills must be self-contained, so the cyberlegion pin is written into the text of each entry
// point instead of read from `.plugin/pins.json` at run time. Keep those literals in step with it.
const PIN_FILES = [
	'skills/operator/SKILL.md',
	'skills/pod/SKILL.md',
	'skills/crimp/SKILL.md',
	'agents/headless-operator.md',
].map((f) => `packages/cyberfleet/${f}`)
const pin = JSON.parse(readFileSync('packages/cyberfleet/.plugin/pins.json', 'utf8')).cyberlegion
if (pin) {
	for (const file of PIN_FILES) {
		const before = readFileSync(file, 'utf8')
		const after = before
			.replace(/cyberlegion@\d+\.\d+\.\d+[\w.-]*/g, `cyberlegion@${pin}`)
			.replace(/The pin is `[^`]*`/g, `The pin is \`${pin}\``)
		if (after !== before) writeFileSync(file, after)
	}
}
