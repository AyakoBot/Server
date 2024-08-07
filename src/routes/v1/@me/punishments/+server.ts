import getPunishments from '$lib/scripts/util/getPunishments.js';
import validateToken from '$lib/scripts/util/validateToken';
import DataBase from '$lib/server/database.js';
import { error, json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import type { AppealPunishment } from '@ayako/website/src/lib/scripts/types';
import { z } from 'zod';
import makeReadableError from '$lib/scripts/util/makeReadableError';

export const GET: RequestHandler = async (req) => {
	const token = await validateToken(req);
	if (!token) return error(403, 'Invalid or no token provided');

	const guildIdParam = req.url.searchParams.get('guildId');
	const guildId = guildIdParam
		? z
				.string()
				.regex(/\d{17,19}/gm, { message: 'Guild ID is not a snowflake' })
				.safeParse(guildIdParam)
		: z.string().optional().safeParse(undefined);
	if (!guildId.success) return error(400, makeReadableError(guildId.error));

	const user = await DataBase.users.findFirst({
		where: { tokens: { some: { accesstoken: token } } },
		select: { userid: true },
	});
	if (!user) return error(401, 'Unauthorized');

	const punishments = await getPunishments({ guildId: guildId.data, userId: user.userid });
	if (!punishments.length) return json([] as Returned);

	const appeals = await DataBase.appeals.findMany({
		where: { punishmentid: { in: punishments.map((p) => p.uniquetimestamp) } },
		select: { punishmentid: true },
	});

	return json(
		punishments.map((p) => ({
			appealed: appeals.some((a) => Number(a.punishmentid) === Number(p.uniquetimestamp)),
			type: p.type,
			reason: p.reason,
			id: Number(p.uniquetimestamp),
			channel: {
				name: p.channelname,
				id: p.channelid,
			},
			duration: 'duration' in p ? Number(p.duration) : undefined,
		})) as Returned,
	);
};

export type Returned = AppealPunishment[];
