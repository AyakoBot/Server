import makeReadableError from '$lib/scripts/util/makeReadableError';
import DataBase from '$lib/server/database.js';
import { error, json } from '@sveltejs/kit';
import { z } from 'zod';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async (req) => {
	const guildId = z
		.string()
		.regex(/\d{17,19}/gm, { message: 'Guild ID is not a snowflake' })
		.or(z.string().regex(/^1$/gm, { message: 'Guild ID is not 1' }))
		.safeParse(req.params.guildId);

	if (!guildId.success) return error(400, makeReadableError(guildId.error));

	const take = z
		.number({ message: 'take is NaN' })
		.max(1000, { message: 'take is gt 1000' })
		.min(1, { message: 'take is lt 1' })
		.int({ message: 'take is not an int' })
		.safeParse(parseInt(req.url.searchParams.get('take') || '100'));

	if (!take.success) return error(400, makeReadableError(take.error));

	const skip = z
		.number({ message: 'skip is NaN' })
		.min(0, { message: 'skip is lt 0' })
		.finite({ message: 'skip is not finite' })
		.safe({ message: `skip is not lt ${Number.MAX_SAFE_INTEGER}` })
		.int({ message: 'skip is not an int' })
		.finite({ message: 'skip is not finite' })
		.safeParse(parseInt(req.url.searchParams.get('skip') || '0'));

	if (!skip.success) return error(400, makeReadableError(skip.error));

	const levels = await DataBase.level.findMany({
		where: { guildid: guildId.data },
		take: take.data,
		orderBy: { xp: 'desc' },
		skip: skip.data,
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
					name: user?.username || 'Unknown User',
					avatar: user?.avatar || 'https://cdn.discordapp.com/embed/avatars/0.png',
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
