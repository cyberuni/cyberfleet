import { defineConfig } from 'tsdown'

export default defineConfig({
	entry: { cli: 'src/cli.ts' },
	outDir: 'dist',
	format: 'esm',
	platform: 'node',
	clean: true,
	// The package root is also the agent plugin root, and an installed plugin is a copy of the
	// checkout with no node_modules. Every runtime dependency is inlined so the CLI runs there.
	deps: {
		alwaysBundle: [/^commander(\/|$)/, /^cyberlegion(\/|$)/],
		onlyBundle: false,
	},
})
