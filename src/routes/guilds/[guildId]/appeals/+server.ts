import user2Cookies from '$lib/scripts/util/user2Cookies';
import DataBase from '$lib/server/database.js';
import { error, json, redirect } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { PunishmentType, type AppealPunishment } from '$lib/scripts/types';
import getPunishments from '$lib/scripts/util/getPunishments.js';

export const GET: RequestHandler = async (req) => {
	const authenticated = await user2Cookies(req);
	if (authenticated) return error(authenticated, 'Invalid or no token provided');

	const { guildId } = req.params;
	const userId = req.cookies.get('discord-id');
	if (!userId) return error(401, 'Unauthorized');

	const results = await getPunishments({ guildId, userId });

	return json(
		results.map((p) => ({
			type: p.type,
			reason: p.reason,
			id: Number(p.uniquetimestamp),
			channelname: p.channelname,
			duration: 'duration' in p ? Number(p.duration) : undefined,
		})) as Returned,
	);
};

export type Returned = AppealPunishment[];
