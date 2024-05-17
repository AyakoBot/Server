// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-expect-error
import { sveltekit } from '@sveltejs/kit/vite';
// import Unlighthouse from '@unlighthouse/vite';
import { PluginOption, defineConfig } from 'vite';

/** @type {import('vite').Plugin} */
const viteServerConfig = (): PluginOption => ({
	name: 'add-headers',
	configureServer: (server) => {
		server.middlewares.use((req, res, next) => {
			res.setHeader('Access-Control-Allow-Origin', '*');
			res.setHeader('Access-Control-Allow-Methods', '*');
			res.setHeader('Cross-Origin-Opener-Policy', 'unsafe-none');
			res.setHeader('Cross-Origin-Embedder-Policy', 'unsafe-none');
			return next();
		});
	},
});

export default defineConfig({
	plugins: [
		sveltekit(),
		// Unlighthouse({}),
		viteServerConfig(),
	],
});
