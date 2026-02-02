import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { PROXY_SECRET } from '$env/static/private';

const PROXY_BASE = 'https://api.rivalstracker.com/api';

export const GET: RequestHandler = async ({ url, request }) => {
	const auth = request.headers.get('Authorization');
	if (auth !== PROXY_SECRET) {
		return json({ error: 'Unauthorized' }, { status: 401 });
	}

	const path = url.searchParams.get('path');

	if (!path) {
		return json({ error: 'Missing path parameter' }, { status: 400 });
	}

	// Build target URL, forwarding any additional query params
	const targetParams = new URLSearchParams(url.searchParams);
	targetParams.delete('path');
	const queryString = targetParams.toString();
	const targetUrl = `${PROXY_BASE}/${path}${queryString ? `?${queryString}` : ''}`;

	try {
		const res = await fetch(targetUrl, {
			method: 'GET',
			headers: {
				Accept: 'application/json',
				'Content-Type': 'application/json',
			},
		});

		const data = await res.json();
		return json(data, { status: res.status });
	} catch (err) {
		console.error('Proxy error:', err);
		return json({ error: 'Proxy request failed' }, { status: 500 });
	}
};

export const POST: RequestHandler = async ({ url, request }) => {
	const auth = request.headers.get('Authorization');
	if (auth !== PROXY_SECRET) {
		return json({ error: 'Unauthorized' }, { status: 401 });
	}

	const path = url.searchParams.get('path');

	if (!path) {
		return json({ error: 'Missing path parameter' }, { status: 400 });
	}

	const targetParams = new URLSearchParams(url.searchParams);
	targetParams.delete('path');
	const queryString = targetParams.toString();
	const targetUrl = `${PROXY_BASE}/${path}${queryString ? `?${queryString}` : ''}`;

	try {
		const body = await request.text();
		const res = await fetch(targetUrl, {
			method: 'POST',
			headers: {
				Accept: 'application/json',
				'Content-Type': 'application/json',
			},
			body: body || undefined,
		});

		const data = await res.json().catch(() => ({}));
		return json(data, { status: res.status });
	} catch (err) {
		console.error('Proxy error:', err);
		return json({ error: 'Proxy request failed' }, { status: 500 });
	}
};
