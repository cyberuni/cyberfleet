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
			],
			editLink: {
				baseUrl: 'https://github.com/cyberuni/cyberfleet/edit/main/apps/web/',
			},
		}),
	],
})
