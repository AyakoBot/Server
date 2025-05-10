// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-expect-error
import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vite';
import { resolve } from 'node:path';

// Simple configuration that handles the modules without custom resolvers
export default defineConfig({
	server: { allowedHosts: ['api.animekos.org'] },
	plugins: [sveltekit()],
	resolve: {
		alias: {
			'@ayako/bot': resolve(process.cwd(), '../Bot'),
			'@ayako/website': resolve(process.cwd(), '../../apps/Website'),
		},
	},
	optimizeDeps: {
		esbuildOptions: {
			// Node.js global to browser globalThis
			define: {
				global: 'globalThis',
			},
		},
		// Skip automatic dependency optimization for problematic packages
		exclude: ['@discordjs/rest', 'cookie'],
	},
	build: {
		// Improve compatibility with CJS/ESM mixed modules
		commonjsOptions: {
			transformMixedEsModules: true,
		},
	},
	ssr: {
		// Force bundling of these packages to avoid ESM/CJS issues
		noExternal: ['@discordjs/rest', 'cookie', 'discord-api-types'],
	},
});
