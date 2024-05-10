import { json } from '@sveltejs/kit';
import DataBase from '$lib/server/database.js';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async () => {
	const guilds = await DataBase.guilds.findMany({ where: { membercount: { gte: 10000 } } });
	if (!guilds) return json([]);

	return json(guilds.map((s) => ({ ...s, membercount: Number(s.membercount) })) as Returned);
};

export type Returned = {
	guildid: string;
	name: string;
	icon: string | null;
	banner: string | null;
	invite: string | null;
	membercount: number;
}[];
