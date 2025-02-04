import { redirect, text } from '@sveltejs/kit';
import DataBase from '$lib/server/database';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async (req) => {
	const { redirectId: id } = req.params;

	console.log(id);
	const url = await DataBase.shrtUrls.findUnique({ where: { id } });
	console.log(url);

	if (!url) return text('Not Found', { status: 404 });

	DataBase.shrtUrlUses.create({ data: { timestamp: Date.now(), id: url.id } }).then();

	throw redirect(307, url.forward);
};
