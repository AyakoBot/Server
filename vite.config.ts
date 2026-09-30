// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-expect-error
import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig, type Plugin } from 'vite';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

const botDir = resolve(process.cwd(), '../Bot');

const botImportMetaUrl: Plugin = {
	name: 'bot-import-meta-url',
	enforce: 'pre',
	transform(code, id) {
		const file = id.split('?')[0];
		if (!file.startsWith(`${botDir}/`) || !code.includes('import.meta.url')) return null;

		return code.replaceAll('import.meta.url', JSON.stringify(pathToFileURL(file).href));
	},
};

// Simple configuration that handles the modules without custom resolvers
export default defineConfig({
	server: { allowedHosts: ['api.animekos.org'] },
	plugins: [botImportMetaUrl, sveltekit()],
	resolve: {
		alias: {
			'@ayako/bot': botDir,
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
		exclude: ['@discordjs/rest', 'cookie', 'discord-api-types'],
	},
	build: {
		// Improve compatibility with CJS/ESM mixed modules
		commonjsOptions: {
			transformMixedEsModules: true,
			ignoreDynamicRequires: true,
		},
		rollupOptions: {
			external: ['zlib-sync', 'bun'],
		},
	},
	ssr: {
		// Force bundling of these packages to avoid ESM/CJS issues
		noExternal: ['@discordjs/rest', 'cookie'],
	},
	define: {
		global: 'globalThis',
	},
});
