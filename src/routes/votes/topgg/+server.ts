import type { RequestHandler } from './$types';
import DataBase from '$lib/server/database.js';
import PG from '$lib/server/pg.js';
import { error, json } from '@sveltejs/kit';

export const POST: RequestHandler = async (req) => {
	const body = (await req.request.json().catch(() => ({}))) as { [key: string]: string };
	body.authorization =
		req.request.headers.get('authorization') ?? req.request.headers.get('Authorization') ?? '';

	const exists = await DataBase.votesettings.count({ where: { token: body.authorization } });
	if (!exists) return error(498, 'Invalid token');

	await PG.query(`NOTIFY vote, '${JSON.stringify(body).replace(/'/g, "\\'")}'`, [body]);

	return json({ success: true });
};
