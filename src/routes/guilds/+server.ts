import { error, json } from '@sveltejs/kit';
import DataBase from '$lib/server/database.js';
import type { RequestHandler } from './$types';
import { GuildFeature } from 'discord-api-types/v10';
import { z } from 'zod';

export const GET: RequestHandler = async (req) => {
	const take = z
		.number({ message: 'take is NaN' })
		.gte(1, { message: 'take is lt 1' })
		.lte(1000, { message: 'take is gt 1000' })
		.int({ message: 'take is not an int' })
		.safeParse(parseInt(req.url.searchParams.get('take') || '100'));

	const skip = z
		.number({ message: 'skip is NaN' })
		.gte(0, { message: 'skip is lt 0' })
		.lte(1000)
		.int()
		.safeParse(parseInt(req.url.searchParams.get('skip') || '0'));

	const leastMemberCount = z
		.number({ message: 'leastMemberCount is NaN' })
		.gte(2, { message: 'leastMemberCount is lt 2' })
		.safe({ message: `leastMemberCount not lt ${Number.MAX_SAFE_INTEGER}` })
		.int({ message: 'leastMemberCount is not an int' })
		.finite({ message: 'leastMemberCount is not finite' })
		.safeParse(parseInt(req.url.searchParams.get('leastMemberCount') || '10000'));

	const q = z
		.string()
		.min(0)
		.max(100)
		.safeParse(req.url.searchParams.get('q') || '');

	if (!skip.success) return error(400, skip.error.message);
	if (!take.success) return error(400, take.error.message);
	if (!leastMemberCount.success) return error(400, leastMemberCount.error.message);
	if (!q.success) return error(400, q.error.message);

	const guilds = await DataBase.guilds.findMany({
		where: {
			membercount: { gte: leastMemberCount.data },
			name: q.data.length ? { contains: q.data, mode: 'insensitive' } : undefined,
			features: {
				hasSome: [
					GuildFeature.Discoverable,
					GuildFeature.Community,
					GuildFeature.Featurable,
					GuildFeature.Partnered,
					GuildFeature.VanityURL,
				],
			},
		},
		take: take.data,
		skip: skip.data,
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
