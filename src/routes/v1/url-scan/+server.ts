import makeReadableError from '$lib/scripts/util/makeReadableError';
import validateToken from '$lib/scripts/util/validateToken';
import DataBase from '$lib/server/database.js';
import urlUtil, { cleanURL, scanningQueue, scanURL } from '$lib/server/url-scan/index.js';
import { error, json } from '@sveltejs/kit';
import { randomUUID } from 'crypto';
import { z } from 'zod';
import type { RequestHandler } from './$types';

const urlProtocolError = 'URL protocol not supported';

const urlTest = z
	.string({ message: 'URL is not a string' })
	.url({ message: 'URL is not a valid URL ' });

const schema = z.object({
	url: z.union([
		urlTest.startsWith('https://', urlProtocolError),
		urlTest.startsWith('http://', urlProtocolError),
	]),
});

export const POST: RequestHandler = async (req) => {
	const body = await req.request.json();
	const parsedBody = schema.safeParse(body);
	if (!parsedBody.success) return error(400, makeReadableError(parsedBody.error));

	const url = cleanURL(parsedBody.data.url);

	if (urlUtil.has('allowlisted', url)) return new Response(null, { status: 202 });
	if (urlUtil.has('denylisted', url)) return new Response(null, { status: 204 });
	if (urlUtil.has('badLinks', url)) return new Response(null, { status: 204 });

	return new Response(null, { status: 404 });
};

export const PUT: RequestHandler = async (req) => {
	if (!req.request.headers.get('Authorization')) return new Response(null, { status: 403 });
	const token = await validateToken(req);
	if (!token) return new Response(null, { status: 403 });

	const body = await req.request.json();
	const parsedBody = schema.safeParse(body);
	if (!parsedBody.success) return error(400, makeReadableError(parsedBody.error));

	const url = cleanURL(parsedBody.data.url);

	if (scanningQueue.has(url)) return new Response(null, { status: 208 });
	if (urlUtil.has('allowlisted', url)) return new Response(null, { status: 208 });
	if (urlUtil.has('denylisted', url)) return new Response(null, { status: 208 });
	if (urlUtil.has('badLinks', url)) return new Response(null, { status: 208 });

	const scanId = randomUUID();
	const expires = Date.now() + 2592000000;
	await DataBase.urlScans.create({ data: { id: scanId, url, expires } });

	scanURL(url);

	return json({ scanId, idExpires: expires } as PUTResponse, { status: 200 });
};

export type PUTResponse = { scanId: string; idExpires: number };

export const PATCH: RequestHandler = async (req) => {
	if (!req.request.headers.get('Authorization')) return new Response(null, { status: 401 });
	const token = await validateToken(req);
	if (!token) return new Response(null, { status: 403 });

	const body = await req.request.json();
	const parsedBody = schema.safeParse(body);
	if (!parsedBody.success) return error(400, makeReadableError(parsedBody.error));

	const url = cleanURL(parsedBody.data.url);
	if (scanningQueue.has(url)) return new Response(null, { status: 208 });
	const scanId = randomUUID();
	const expires = Date.now() + 2592000000;
	await DataBase.urlScans.create({ data: { id: scanId, url, expires } });

	scanURL(cleanURL(url));

	return json({ scanId, idExpires: expires } as PATCHResponse, { status: 200 });
};

export type PATCHResponse = { scanId: string; idExpires: number };
