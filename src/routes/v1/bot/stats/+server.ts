import { error, json } from '@sveltejs/kit';
import DataBase from '$lib/server/database.js';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async () => {
	const count = await DataBase.stats.findFirst({ orderBy: { timestamp: 'desc' } });
	if (!count) return error(500);

	return json({
		guildCount: Number(count.guildCount),
		userCount: Number(count.allUsers),
		guildInstallCount: Number(count.guildCount),
		userInstallCount: Number(count.userInstalls),
	} as GETResponse);
};

export type GETResponse = {
	guildCount: number;
	userCount: number;
	guildInstallCount: number;
	userInstallCount: number;
};
