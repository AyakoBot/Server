// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-expect-error
import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vite';

export default defineConfig({
	plugins: [sveltekit()],
});
