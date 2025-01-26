import DataBase from '$lib/server/database.js';
import { error, json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import makeReadableError from '$lib/scripts/util/makeReadableError';
import { z } from 'zod';

export const GET: RequestHandler = async (req) => {
	const guildId = z
		.string()
		.regex(/\d{17,19}/gm, { message: 'Guild ID is not a snowflake' })
		.safeParse(req.params.guildId);

	if (!guildId.success) return error(400, makeReadableError(guildId.error));

	const guild = await DataBase.guilds.findUnique({
		where: { guildid: guildId.data },
		select: {
			banner: true,
			features: true,
			guildid: true,
			icon: true,
			invite: true,
			membercount: true,
			name: true,
			fetchat: false,
			presencecount: true,
		},
	});

	if (!guild) return error(404);

	return json({
		banner: guild.banner,
		features: guild.features,
		id: guild.guildid,
		icon: guild.icon,
		invite: guild.invite,
		memberCount: Number(guild.membercount),
		name: guild.name,
		presenceCount: Number(guild.presencecount),
	} as GETResponse);
};

export type GETResponse = {
	banner: string | null;
	features: string[];
	id: string;
	icon: string;
	invite: string;
	name: string;
	memberCount: number;
	presenceCount: number;
};
