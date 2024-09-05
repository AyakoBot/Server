import { PUBLIC_CDN, PUBLIC_ID } from '$env/static/public';
import { GITHUB_ID } from '$env/static/private';
import cdn from '$lib/server/cdn';
import { type Handle } from '@sveltejs/kit';

/** @type {import('@sveltejs/kit').Handle} */
export const handle: Handle = async ({ event, resolve }) => {
	console.log(event.request.headers);
	if (event.url.href.startsWith(PUBLIC_CDN)) {
		return cdn({ event, resolve });
	}

	event.url = new URL(event.url.href.replace('/api/', '/'));

	if (event.request.method === 'OPTIONS') {
		return new Response(null, {
			headers: {
				'Access-Control-Allow-Origin': '*',
				'Access-Control-Allow-Methods': '*',
				'Cross-Origin-Opener-Policy': 'unsafe-none',
				'Cross-Origin-Embedder-Policy': 'unsafe-none',
			},
		});
	}

	const response = await resolve(event);
	response.headers.append('Access-Control-Allow-Origin', '*');
	return response;
};
