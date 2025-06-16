import { redirect, text } from '@sveltejs/kit';
import DataBase from '$lib/server/database';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async (req) => {
	const { redirectId: id } = req.params;

	const url = await DataBase.shrtUrls.findUnique({ where: { id } });

	if (!url) return text('Not Found', { status: 404 });

	DataBase.shrtUrlUses.create({ data: { timestamp: Date.now(), id: url.id } }).then();

	throw redirect(307, url.forward);
};
