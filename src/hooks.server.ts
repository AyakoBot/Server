import { PUBLIC_CDN } from '$env/static/public';
import cdn from '$lib/server/cdn';
import { type Handle } from '@sveltejs/kit';

/** @type {import('@sveltejs/kit').Handle} */
export const handle: Handle = async ({ event, resolve }) => {
	if (event.url.href.startsWith(PUBLIC_CDN)) {
		return cdn({ event, resolve });
	}

	event.url = new URL(event.url.href.replace('/api/', '/'));

	return resolve(event);
};
