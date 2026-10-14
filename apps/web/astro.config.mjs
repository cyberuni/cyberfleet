import starlight from '@astrojs/starlight'
import { defineConfig } from 'astro/config'

export default defineConfig({
	site: 'https://cyberuni.github.io',
	base: '/cyberfleet',
	integrations: [
		starlight({
			title: 'cyberfleet',
			// The cyber-* icon system (cyberuni/cyber-mux docs/design/icon-system.md). The favicon self-themes; the header
			// logo ships as a light/dark pair because Starlight picks its theme by `data-theme`,
			// which `prefers-color-scheme` never sees.
			favicon: '/img/logo.svg',
			logo: {
				light: './src/assets/logo-light.svg',
				dark: './src/assets/logo-dark.svg',
				alt: 'cyberfleet',
			},
			customCss: ['./src/styles/global.css'],
			social: [
				{
					icon: 'github',
					label: 'GitHub',
					href: 'https://github.com/cyberuni/cyberfleet',
				},
			],
			sidebar: [
				{
					label: 'Overview',
					items: [{ label: 'Overview', link: '/overview/' }],
				},
				{
					label: 'Automatons',
					items: [
						{ label: 'Operator', link: '/operator/' },
						{ label: 'Captain', link: '/captain/' },
						{ label: 'Coordinator', link: '/coordinator/' },
						{ label: 'Pod', link: '/pod/' },
						{ label: 'Crimp', link: '/crimp/' },
						{ label: 'Mechanic', link: '/mechanic/' },
					],
				},
				{
					label: 'Design',
					items: [{ autogenerate: { directory: 'design' } }],
				},
				{
					label: 'Scenarios',
					items: [
						{ label: 'The ship', link: '/scenarios/the-ship/' },
						{ label: 'Work from the Dashboard', link: '/scenarios/work-from-the-dashboard/' },
						{ label: 'Work from the Command Center', link: '/scenarios/work-from-the-command-center/' },
						{ label: 'Landing a pull request', link: '/scenarios/landing-a-pull-request/' },
						{ label: 'Work across ships', link: '/scenarios/work-across-ships/' },
						{ label: 'Captains in dispute', link: '/scenarios/captains-in-dispute/' },
					],
				},
			],
			editLink: {
				baseUrl: 'https://github.com/cyberuni/cyberfleet/edit/main/apps/web/',
			},
		}),
	],
})
