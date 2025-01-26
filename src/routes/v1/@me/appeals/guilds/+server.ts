import getPunishments from '$lib/scripts/util/getPunishments.js';
import validateToken from '$lib/scripts/util/validateToken.js';
import API from '$lib/server/api.js';
import DataBase from '$lib/server/database.js';
import type { guilds } from '@prisma/client';
import { error, json } from '@sveltejs/kit';
import type { APIGuild } from 'discord-api-types/v10';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async (req) => {
	const token = await validateToken(req);
	if (!token) return error(403, 'Invalid or no token provided');

	const api = API.makeAPI(token)!;
	const user = await api.users.getCurrent();
	const joinedGuilds = await api.users.getGuilds();
	const punishGuilds = await getPunishments({ guildId: undefined, userId: user.id });
	const guildIds = [
		...new Set([...joinedGuilds.map((g) => g.id), ...punishGuilds.map((g) => g.guildid)]),
	];

	const enabledAppealIds = await DataBase.appealsettings.findMany({
		where: { guildid: { in: guildIds }, active: true },
		select: { guildid: true },
	});

	const dbGuilds = await DataBase.guilds.findMany({
		where: { guildid: { in: guildIds } },
	});

	const appealEnabled = enabledAppealIds
		.map((g) => dbGuilds.find((guild) => guild.guildid === g.guildid))
		.filter((g): g is guilds => !!g)
		.map(makeReturnGuild);

	const otherMutuals = dbGuilds
		.filter((g) => !enabledAppealIds.some((e) => e.guildid === g.guildid))
		.map(makeReturnGuild);

	return json({
		appealEnabled,
		otherMutuals,
	} as GETResponse);
};

type ReturnedGuild = Pick<APIGuild, 'id' | 'name' | 'icon' | 'banner'>[];

export type GETResponse = {
	appealEnabled: ReturnedGuild;
	otherMutuals: ReturnedGuild;
};

const makeReturnGuild = (g: guilds) => ({
	id: g.guildid,
	name: g.name,
	icon: g.icon?.split(/\//g).at(-1)?.split(/\./g)[0],
	banner: g.banner?.split(/\//g).at(-1)?.split(/\./g)[0],
});
