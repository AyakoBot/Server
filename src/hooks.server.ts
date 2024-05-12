import type { Handle } from '@sveltejs/kit';

/** @type {import('@sveltejs/kit').Handle} */
export const handle: Handle = async ({ event, resolve }) => {
	event.url = new URL(event.url.href.replace('/api/', '/'));

	return resolve(event);
};
