import DataBase from '$lib/server/database.js';
import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import type { APIGuild, RESTGetAPICurrentUserGuildsResult } from 'discord-api-types/v10';
import validateToken from '$lib/scripts/util/validateToken.js';
import API from '$lib/server/api.js';

export const GET: RequestHandler = async (req) => {
	const token = await validateToken(req);
	if (!token) return error(403, 'Invalid or no token provided');

	const guilds = await API.userAPIs.get(token)!.users.getGuilds();

	const enabledAppealIds = await DataBase.appealsettings.findMany({
		where: { guildid: { in: guilds.map((g) => g.id) }, active: true },
		select: { guildid: true },
	});

	const botGuilds = await DataBase.guilds.findMany({
		where: { guildid: { in: guilds.map((g) => g.id) } },
		select: { guildid: true },
	});

	const enabledAppeals = enabledAppealIds
		.map((g) => guilds.find((guild) => guild.id === g.guildid))
		.filter((g): g is RESTGetAPICurrentUserGuildsResult[number] => !!g);

	return json({
		appealEnabled: enabledAppeals.map((g) => makeReturnGuild(g)),
		otherMutuals: botGuilds
			.map((g) => guilds.find((guild) => guild.id === g.guildid))
			.filter(
				(g): g is RESTGetAPICurrentUserGuildsResult[number] => !!g && !enabledAppeals.includes(g),
			)
			.map((g) => makeReturnGuild(g)),
	} as Returned);
};

type ReturnedGuild = Pick<APIGuild, 'id' | 'name' | 'icon' | 'banner'>[];

export type Returned = {
	appealEnabled: ReturnedGuild;
	otherMutuals: ReturnedGuild;
};

const makeReturnGuild = (g: RESTGetAPICurrentUserGuildsResult[number]) => ({
	id: g.id,
	name: g.name,
	icon: g.icon,
});
