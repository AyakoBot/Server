import DataBase from '$lib/server/database.js';
import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import type { APIGuild } from 'discord-api-types/v10';
import user2Cookies from '$lib/scripts/util/user2Cookies';

export const GET: RequestHandler = async (req) => {
	const authenticated = await user2Cookies(req);
	if (authenticated) return error(authenticated, 'Invalid or no token provided');

	const token = req.cookies.get('discord-token');

	const res = await fetch('https://discord.com/api/v10/users/@me/guilds', {
		headers: { Authorization: `Bearer ${token}` },
	});

	const guilds = (await res.json()) as APIGuild[];

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
		.filter((g): g is APIGuild => !!g);

	return json({
		appealEnabled: enabledAppeals.map((g) => makeReturnGuild(g)),
		otherMutuals: botGuilds
			.map((g) => guilds.find((guild) => guild.id === g.guildid))
			.filter((g): g is APIGuild => !!g && !enabledAppeals.includes(g))
			.map((g) => makeReturnGuild(g)),
	} as Returned);
};

type ReturnedGuild = Pick<APIGuild, 'id' | 'name' | 'icon' | 'banner'>[];

export type Returned = {
	appealEnabled: ReturnedGuild;
	otherMutuals: ReturnedGuild;
};

const makeReturnGuild = (g: APIGuild) => ({
	id: g.id,
	name: g.name,
	icon: g.icon,
	banner: g.banner,
});
