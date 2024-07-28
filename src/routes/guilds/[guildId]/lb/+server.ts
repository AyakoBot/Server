import DataBase from '$lib/server/database.js';
import { error, json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async (req) => {
	const { guildId } = req.params;
	const take = parseInt(req.url.searchParams.get('take') ?? '100');
	const skip = parseInt(req.url.searchParams.get('skip') ?? '0');

	if (isNaN(skip)) return error(400, 'skip is NaN');
	if (isNaN(take)) return error(400, 'take is NaN');
	if (take > 1000) return error(400, 'Max take is 1000');
	if (take < 1) return error(400, 'Min take is 1');
	if (skip < 0) return error(400, 'Min skip is 0');

	const levels = await DataBase.level.findMany({
		where: { guildid: guildId },
		take,
		orderBy: { xp: 'desc' },
		skip,
	});

	const userIds = [...new Set(levels.map((l) => l.userid))];
	const users = await DataBase.users.findMany({ where: { userid: { in: userIds } } });

	return json(
		levels.map((l) => {
			const user = users.find((u) => u.userid === l.userid);

			return {
				xp: Number(l.xp),
				level: Number(l.level),
				multiplier: Number(l.multiplier),
				user: {
					id: l.userid,
					name: user?.username ?? 'Unknown User',
					avatar: user?.avatar ?? 'https://cdn.discordapp.com/embed/avatars/0.png',
				},
			};
		}) as Returned,
	);
};

export type Returned = {
	xp: number;
	level: number;
	multiplier: number;
	user: {
		id: string;
		name: string;
		avatar: string;
	};
}[];
