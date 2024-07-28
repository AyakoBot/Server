import { error, json } from '@sveltejs/kit';
import DataBase from '$lib/server/database.js';
import type { RequestHandler } from './$types';
import { GuildFeature } from 'discord-api-types/v10';

export const GET: RequestHandler = async (req) => {
	const take = parseInt(req.url.searchParams.get('take') ?? '100');
	const skip = parseInt(req.url.searchParams.get('skip') ?? '0');
	const leastMemberCount = parseInt(req.url.searchParams.get('leastMemberCount') ?? '10000');
	const q = req.url.searchParams.get('q') ?? '';

	if (isNaN(skip)) return error(400, 'skip is NaN');
	if (isNaN(take)) return error(400, 'take is NaN');
	if (isNaN(leastMemberCount)) return error(400, 'leastMemberCount is NaN');
	if (take > 100) return error(400, 'Max take is 100');
	if (take < 1) return error(400, 'Min take is 1');
	if (skip < 0) return error(400, 'Min skip is 0');
	if (leastMemberCount < 1) return error(400, 'Min leastMemberCount is 1');

	const guilds = await DataBase.guilds.findMany({
		where: {
			membercount: { gte: leastMemberCount },
			name: q.length ? { contains: q, mode: 'insensitive' } : undefined,
			// features: {
			// 	hasSome: [
			//   GuildFeature.Discoverable,
			//   GuildFeature.Community,
			//   GuildFeature.Featurable,
			//   GuildFeature.Partnered,
			//   GuildFeature.VanityURL,
			//  ],
			// },
		},
		take,
		skip,
		orderBy: { membercount: 'desc' },
		select: {
			name: true,
			banner: true,
			guildid: true,
			icon: true,
			membercount: true,
			invite: true,
		},
	});

	return json(
		guilds.map((s) => ({
			guildid: s.guildid,
			name: s.name,
			icon: s.icon,
			banner: s.banner,
			invite: s.invite,
			membercount: Number(s.membercount),
		})) as Returned,
	);
};

export type Returned = {
	guildid: string;
	name: string;
	icon: string | null;
	banner: string | null;
	invite: string | null;
	membercount: number;
}[];
