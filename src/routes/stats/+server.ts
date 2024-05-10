import { json } from '@sveltejs/kit';
import DataBase from '$lib/server/database.js';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async () => {
	const count = await DataBase.stats.findFirst();
	if (!count) return json({ code: 424 });

	return json({
		guildCount: Number(count?.guildcount),
		userCount: Number(count?.allusers),
	} as Returned);
};

export type Returned = {
	guildCount: number;
	userCount: number;
};
