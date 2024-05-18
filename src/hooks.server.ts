import { PUBLIC_CDN } from '$env/static/public';
import sleep from '$lib/scripts/util/sleep';
import cdn from '$lib/server/cdn';
import { type Handle } from '@sveltejs/kit';

const limiter = new Map<string, Set<number>>();

setInterval(() => {
	limiter.forEach((val, k) => {
		if (val.size === 0) {
			limiter.delete(k);
			return;
		}

		val.forEach((v) => {
			if (v < Date.now() - 10000) val.delete(v);
		});
	});
}, 10000);

/** @type {import('@sveltejs/kit').Handle} */
export const handle: Handle = async ({ event, resolve }) => {
	if (event.url.href.startsWith(PUBLIC_CDN)) {
		return cdn({ event, resolve });
	}

	event.url = new URL(event.url.href.replace('/api/', '/'));

	const ip =
		event.request.headers.get('X-forwarded-for') ??
		event.request.headers.get('cf-connecting-ip') ??
		crypto.randomUUID();
	const now = Date.now();

	if (Number(limiter.get(ip)?.size) >= 20) {
		limiter.get(ip)!.add(now);

		console.log(`Ratelimit for ${ip} exceeded`);
		await sleep(2500 * Number(limiter.get(ip)?.size) - 20);
	} else {
		if (!limiter.has(ip)) limiter.set(ip, new Set());
		limiter.get(ip)!.add(now);
	}

	return resolve(event);
};
