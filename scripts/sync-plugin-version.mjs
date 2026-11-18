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

// The cyberlegion pin lives in `.plugin/pins.json`. Skills run cyberlegion through a forwarder whose
// version is the `scripts` entry in plugin.json; the agent, which has no skill folder, carries the pin
// in its own text. Keep both in step with it. `plugin build`, which runs next, rewrites the forwarders.
const pin = JSON.parse(readFileSync('packages/cyberfleet/.plugin/pins.json', 'utf8')).cyberlegion
if (pin) {
	const stamps = {
		'packages/cyberfleet/plugin.json': (text) =>
			text.replace(/("package":\s*"cyberlegion",\s*"version":\s*)"[^"]*"/g, `$1"${pin}"`),
		'packages/cyberfleet/agents/headless-operator.md': (text) =>
			text
				.replace(/cyberlegion@\d+\.\d+\.\d+[\w.-]*/g, `cyberlegion@${pin}`)
				.replace(/The pin is `[^`]*`/g, `The pin is \`${pin}\``),
	}
	for (const [file, stamp] of Object.entries(stamps)) {
		const before = readFileSync(file, 'utf8')
		const after = stamp(before)
		if (after !== before) writeFileSync(file, after)
	}
}
