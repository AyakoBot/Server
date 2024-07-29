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

	return json(guild);
};

export type Returned = Omit<guilds, 'fetchat'>;
