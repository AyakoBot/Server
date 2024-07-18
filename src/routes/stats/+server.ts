import { json } from '@sveltejs/kit';
import DataBase from '$lib/server/database.js';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async () => {
	const count = await DataBase.stats.findFirst({ orderBy: { timestamp: 'desc' } });
	if (!count) return json({ code: 424 });

	return json({
		guildCount: Number(count?.guildCount),
		userCount: Number(count?.allUsers),
	} as Returned);
};

export type Returned = {
	guildCount: number;
	userCount: number;
};
