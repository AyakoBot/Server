import checkPermissions from '$lib/scripts/util/checkPermissions';
import getUser, { AuthTypes } from '$lib/scripts/util/getUser';
import validateToken from '$lib/scripts/util/validateToken';
import DataBase from '$lib/server/database.js';
import getDiscordEmbed from '@ayako/bot/src/BaseClient/UtilModules/getDiscordEmbed';
import { error, json } from '@sveltejs/kit';
import type { APIEmbed } from 'discord-api-types/v10';
import z from 'zod';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async (req) => {
	const token = await validateToken(req);
	if (!token) return error(403, 'Invalid or no token provided');

	const user = await getUser(token, [AuthTypes.Bot, AuthTypes.Bearer]);
	if (user instanceof Response) return user;

	const guildId = z
		.string()
		.regex(/\d{17,19}/gm, { message: 'Guild ID is not a snowflake' })
		.safeParse(req.params.guildId);

	if (!guildId.success) return error(400, 'Invalid guild ID');

	const hasPermissions = await checkPermissions(guildId.data, [], user.userid);
	if (!hasPermissions) return error(403, 'Missing Permissions');

	const guild = await DataBase.guilds.findFirst({
		where: { guildid: guildId.data },
		select: { guildid: true },
	});
	if (!guild) return error(404, 'Guild not found');

	const settings = await DataBase.customembeds.findMany({ where: { guildid: guildId.data } });

	return json(
		settings.map((s) => ({
			id: Number(s.uniquetimestamp),
			embed: getDiscordEmbed(s),
		})) as GETResponse,
	);
};

export type GETResponse = {
	id: number;
	embed: APIEmbed;
}[];
