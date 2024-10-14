import { PUBLIC_CDN, PUBLIC_HOSTNAME } from '$env/static/public';
import cdn from '$lib/server/cdn';
import { type Handle, type Reroute } from '@sveltejs/kit';
import metrics from '$lib/server/metrics';
import endpoints from '$lib/scripts/util/endpoints';

import ayako from '$lib/public/ayako.txt';
import wzxy from '$lib/public/wzxy.txt';

/** @type {import('@sveltejs/kit').Reroute} */
export const reroute: Reroute = ({ url }) => {
	const makeNew = (newUrl: string) => `/${new URL(newUrl).href.split(/\/+/g).slice(2).join('/')}`;

	if (url.pathname.startsWith('/api/')) return makeNew(url.href.replace('/api/', '/'));
	if (url.hostname === 'wzxy.org') return makeNew(`https://wzxy.org/shorturl/${url.pathname}`);
};

/** @type {import('@sveltejs/kit').Handle} */
export const handle: Handle = async ({ event, resolve }) => {
	doAPIMetrics(event.request);

	if (event.request.method === 'OPTIONS') {
		return new Response(null, {
			headers: {
				'Access-Control-Allow-Origin': '*',
				'Access-Control-Allow-Methods': '*',
				'Cross-Origin-Opener-Policy': 'unsafe-none',
				'Cross-Origin-Embedder-Policy': 'unsafe-none',
				'Content-Security-Policy': "default-src 'self'; frame-ancestors 'none';",
				'Strict-Transport-Security': 'max-age=31536000; includeSubDomains; preload',
				'X-Frame-Options': 'DENY',
				'X-Content-Type-Options': 'nosniff',
				'Referrer-Policy': 'strict-origin-when-cross-origin',
				'Permissions-Policy': 'camera=(), microphone=(), document-domain=()',
			},
		});
	}

	const response = await finish({ event, resolve });

	response.headers.append('Access-Control-Allow-Origin', '*');
	response.headers.append('Content-Security-Policy', "default-src 'self'; frame-ancestors 'none';");
	response.headers.append(
		'Strict-Transport-Security',
		'max-age=31536000; includeSubDomains; preload',
	);
	response.headers.append('X-Frame-Options', 'DENY');
	response.headers.append('X-Content-Type-Options', 'nosniff');
	response.headers.append('Referrer-Policy', 'strict-origin-when-cross-origin');
	response.headers.append('Permissions-Policy', 'camera=(), microphone=(), document-domain=()');
	response.headers.delete('x-sveltekit-page');

	if (event.url.hostname === PUBLIC_CDN) return response;

	doResponseMetrics(response, event.request);

	return response;
};

const finish = (data: Parameters<Handle>[0]) => {
	if (data.event.url.hostname === PUBLIC_CDN) {
		doCDNMetrics(data.event.request);
		return cdn(data);
	}

	return data.resolve(data.event, {
		transformPageChunk: ({ html }) =>
			html.replace(
				'%customhead%',
				atob((PUBLIC_HOSTNAME.includes(data.event.url.hostname) ? ayako : wzxy).split(',')[1]),
			),
	});
};

const doAPIMetrics = (request: Request) => {
	const { pathname } = new URL(request.url);
	const urlParts = pathname.split(/\//g);
	const [, apiVersion] = urlParts;

	const endpoint = endpoints
		.find(
			(e) =>
				e.split(/\//g).length === urlParts.length &&
				e.split(/\//g).every((part, j) => part.startsWith(':') || urlParts[j] === part),
		)
		?.replace(`/${apiVersion}`, '');
	if (!endpoint) return;

	metrics.apiCall(
		request.method as Parameters<typeof metrics.apiCall>[0],
		apiVersion.match(/v\d{1,}/g)?.length
			? (apiVersion as Parameters<typeof metrics.apiCall>[1])
			: '-',
		endpoint,
	);
};

const doCDNMetrics = (request: Request) => {
	const pathArgs = new URL(request.url).pathname.split(/\//g);
	const folder = pathArgs.splice(0, pathArgs.length - 1).join('/');

	metrics.cdnCall(folder);
};

const doResponseMetrics = (response: Response, request: Request) => {
	const urlParts = new URL(request.url).pathname.split(/\//g);

	const endpoint = endpoints.find(
		(e) =>
			e.split(/\//g).length === urlParts.length &&
			e.split(/\//g).every((part, j) => part.startsWith(':') || urlParts[j] === part),
	);
	console.log(endpoint);
	if (!endpoint) return;

	metrics.response(String(response.status), endpoint);
};
