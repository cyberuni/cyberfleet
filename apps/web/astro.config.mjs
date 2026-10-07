import starlight from '@astrojs/starlight'
import { defineConfig } from 'astro/config'

export default defineConfig({
	site: 'https://cyberuni.github.io',
	base: '/cyberfleet',
	integrations: [
		starlight({
			title: 'cyberfleet',
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
						{ label: 'Pod', link: '/pod/' },
						{ label: 'Operator', link: '/operator/' },
						{ label: 'Crimp', link: '/crimp/' },
						{ label: 'Mechanic', link: '/mechanic/' },
					],
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
