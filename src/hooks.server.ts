import { PUBLIC_CDN } from '$env/static/public';
import cdn from '$lib/server/cdn';
import { type Handle } from '@sveltejs/kit';
import metrics from '$lib/server/metrics';
import endpoints from '$lib/scripts/util/endpoints';

/** @type {import('@sveltejs/kit').Handle} */
export const handle: Handle = async ({ event, resolve }) => {
	if (
		event.url.href.startsWith(PUBLIC_CDN) ||
		event.url.href.startsWith(PUBLIC_CDN.replace('https://', 'http://'))
	) {
		doCDNMetrics(event.request);
		return cdn({ event, resolve });
	}

	event.url = new URL(event.url.href.replace('/api/', '/'));

	doAPIMetrics(event.request);

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

	doResponseMetrics(response, event.request);

	response.headers.append('Access-Control-Allow-Origin', '*');
	return response;
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
