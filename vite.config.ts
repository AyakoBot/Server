// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-expect-error
import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vite';
import { resolve } from 'node:path';

export default defineConfig({
	server: { allowedHosts: ['api.animekos.org'] },
	plugins: [sveltekit()],
	resolve: {
		alias: {
			'@ayako/bot': resolve(process.cwd(), '../Bot'),
			'@ayako/website': resolve(process.cwd(), '../../apps/Website')
		}
	}
});
