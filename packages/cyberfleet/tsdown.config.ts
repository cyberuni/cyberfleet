import { defineConfig } from 'tsdown'

export default defineConfig({
	entry: { cli: 'src/cli.ts' },
	outDir: 'dist',
	format: 'esm',
	platform: 'node',
	clean: true,
	// The package root is also the agent plugin root, and an installed plugin is a copy of the
	// checkout with no node_modules. Every runtime dependency is inlined so the CLI runs there.
	// commander, cyberlegion, and cyber-mux are devDependencies, which tsdown inlines anyway; the
	// explicit list keeps them inlined if any is ever moved back to dependencies, which tsdown keeps
	// external.
	deps: {
		alwaysBundle: [/^commander(\/|$)/, /^cyberlegion(\/|$)/, /^cyber-mux(\/|$)/],
		onlyBundle: false,
	},
})
