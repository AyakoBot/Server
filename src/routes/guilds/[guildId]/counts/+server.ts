import DataBase from '$lib/server/database.js';
import { error, json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async (req) => {
	const { guildId } = req.params;
	const guild = await DataBase.guilds.findUnique({
		where: { guildid: guildId },
	});

	if (!guild) return error(404, 'Guild not found');

	return json({
		memberCount: Number(guild.membercount) ?? 0,
		presenceCount: Number(guild.presencecount) ?? 0,
	} as Returned);
};

export type Returned = {
	memberCount: number;
	presenceCount: number;
};
