import getPunishments from '$lib/scripts/util/getPunishments.js';
import validateToken from '$lib/scripts/util/validateToken';
import DataBase from '$lib/server/database.js';
import { error, json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import type { AppealPunishment } from '@ayako/website/src/lib/scripts/types';

export const GET: RequestHandler = async (req) => {
	const token = await validateToken(req);
	if (!token) return error(403, 'Invalid or no token provided');

	const { guildId } = req.params;
	const user = await DataBase.users.findFirst({
		where: { tokens: { some: { accesstoken: token } } },
		select: { userid: true },
	});
	if (!user) return error(401, 'Unauthorized');

	const appeals = await DataBase.appealsettings.findUnique({
		where: { guildid: guildId, active: true },
	});
 if (!appeals) return error(404, 'Appeals are not enabled for this server');

	const punishments = await getPunishments({ guildId, userId: user.userid });
	const existing = await DataBase.appeals.findMany({
		where: { userid: user.userid, guildid: guildId },
	});

	return json(
		punishments.map((p) => ({
			appealed: !!existing.find((e) => String(e.punishmentid) === String(p.uniquetimestamp)),
			type: p.type,
			reason: p.reason,
			id: Number(p.uniquetimestamp),
			channelname: p.channelname,
			duration: 'duration' in p ? Number(p.duration) : undefined,
		})) as Returned,
	);
};

export type Returned = AppealPunishment[];
