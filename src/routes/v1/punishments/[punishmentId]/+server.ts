import getPunishments from '$lib/scripts/util/getPunishments.js';
import validateToken from '$lib/scripts/util/validateToken';
import DataBase from '$lib/server/database.js';
import { error, json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import type { AppealPunishment } from '@ayako/website/src/lib/scripts/types';
import { z } from 'zod';
import makeReadableError from '$lib/scripts/util/makeReadableError';
import getUser, { AuthTypes } from '$lib/scripts/util/getUser';

export const GET: RequestHandler = async (req) => {
	const token = await validateToken(req);
	if (!token) return error(403, 'Invalid or no token provided');

	const punishmentId = z
		.string()
		.regex(/\d{13}/gm, { message: 'Punishment ID is not valid' })
		.safeParse(req.params.punishmentId);
	if (!punishmentId.success) return error(400, makeReadableError(punishmentId.error));

	const user = await getUser(token, [AuthTypes.Bot, AuthTypes.Bearer]);
	if (user instanceof Response) return user;

	const punishment = await getPunishments({
		punishmentId: punishmentId.data,
		userId: user.userid,
		guildId: undefined,
	}).then((res) => (res.length ? res[0] : undefined));
	if (!punishment) return error(404, 'Punishment not found');

	const appeals = await DataBase.appeals.findUnique({
		where: { punishmentid: punishment.uniquetimestamp },
		select: { punishmentid: true },
	});

	return json({
		appealed: !!appeals,
		type: punishment.type,
		reason: punishment.reason,
		id: Number(punishment.uniquetimestamp),
		channel: {
			name: punishment.channelname,
			id: punishment.channelid,
		},
		duration: 'duration' in punishment ? Number(punishment.duration) : undefined,
	} as GETResponse);
};

export type GETResponse = AppealPunishment;
