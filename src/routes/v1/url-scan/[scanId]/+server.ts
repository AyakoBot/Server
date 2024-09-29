import DataBase from '$lib/server/database.js';
import urlUtil from '$lib/server/url-scan/index.js';
import { error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async (req) => {
	const id = req.params.scanId;
	if (!checkIsValid(id)) return error(400, 'Invalid scan Id');

	const urlScan = await DataBase.urlScans.findUnique({ where: { id } });
	if (!urlScan) return new Response(null, { status: 404 });
	if (!urlScan.done) return new Response(null, { status: 425 });

	const { url } = urlScan;
	if (urlUtil.has('allowlisted', url)) return new Response(null, { status: 202 });
	if (urlUtil.has('denylisted', url)) return new Response(null, { status: 204 });
	if (urlUtil.has('badLinks', url)) return new Response(null, { status: 204 });

	return new Response(null, { status: 409 });
};

const checkIsValid = (id: string) => {
	if (id.length !== 36) return false;
	if (!id.includes('-')) return false;

	const segments = id.split(/-/g);
	if (segments.length !== 5) return false;

	const lengths = [8, 4, 4, 4, 12];
	if (segments.map((s, i) => lengths[i] === s.length).includes(false)) return false;
	if (segments.map((s, i) => s.match(/\w/g)?.length === lengths[i]).includes(false)) return false;
	return true;
};
