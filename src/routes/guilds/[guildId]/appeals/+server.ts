import { type AppealPunishment } from '$lib/scripts/types';
import getPunishments from '$lib/scripts/util/getPunishments.js';
import validateToken from '$lib/scripts/util/validateToken';
import DataBase from '$lib/server/database.js';
import { error, json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async (req) => {
	const token = await validateToken(req);
	if (!token) return error(403, 'Invalid or no token provided');

	const { guildId } = req.params;
	const user = await DataBase.users.findFirst({
		where: { accesstoken: token },
		select: { userid: true },
	});
	if (!user) return error(401, 'Unauthorized');

	return json(
		(await getPunishments({ guildId, userId: user.userid })).map((p) => ({
			type: p.type,
			reason: p.reason,
			id: Number(p.uniquetimestamp),
			channelname: p.channelname,
			duration: 'duration' in p ? Number(p.duration) : undefined,
		})) as Returned,
	);
};

export type Returned = AppealPunishment[];
