import DataBase from '$lib/server/database.js';
import { error, json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import type { guilds } from '@prisma/client';

export const GET: RequestHandler = async (req) => {
	const { guildId } = req.params;

	const guild = await DataBase.guilds.findUnique({
		where: { guildid: guildId },
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
	} as Returned);
};

export type Returned = {
	banner: string | null;
	features: string[];
	id: string;
	icon: string;
	invite: string;
	name: string;
	memberCount: number;
	presenceCount: number;
};
