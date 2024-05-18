import type { Handle } from '@sveltejs/kit';
import { PUBLIC_CDN } from '$env/static/public';
import cdn from '$lib/server/cdn';
import { RetryAfterRateLimiter } from 'sveltekit-rate-limiter/server';

const limiter = new RetryAfterRateLimiter({
	IP: [10, '10s'],
	IPUA: [10, '10s'],
});

/** @type {import('@sveltejs/kit').Handle} */
export const handle: Handle = async ({ event, resolve }) => {
	const status = await limiter.check(event);

	if (status.limited) {
		let response = new Response(
			`You are being rate limited. Please try after ${status.retryAfter} seconds.`,
			{
				status: 429,
				headers: { 'Retry-After': status.retryAfter.toString() },
			},
		);
		return response;
	}

	if (event.url.href.startsWith(PUBLIC_CDN)) {
		return cdn({ event, resolve });
	}

	event.url = new URL(event.url.href.replace('/api/', '/'));

	return resolve(event);
};
