import validateToken from '$lib/scripts/util/validateToken.js';
import type { RequestHandler } from './$types';
import getUser, { AuthTypes } from '$lib/scripts/util/getUser';
import API from '$lib/server/api';
import DataBase from '$lib/server/database';
import { error, json } from '@sveltejs/kit';
import { OAuth2Scopes, type RESTAPIPartialCurrentUserGuild } from 'discord-api-types/v10';

export const GET: RequestHandler = async (req) => {
	const token = await validateToken(req);
	if (!token) return error(403, 'Invalid or no token provided');

	const user = await getUser(token, [AuthTypes.Bearer]);
	if (user instanceof Response) return user;

	const { accesstoken } = user.tokens[0];
	if (!accesstoken) return error(403, 'Invalid or no token provided');
	if (!user.tokens[0].scopes.includes(OAuth2Scopes.Guilds)) {
		return error(403, 'Required OAuth2 scope is missing');
	}

	const api = API.makeAPI(accesstoken);

	const userGuilds = await api.users.getGuilds().catch(() => []);
	const botGuilds = await DataBase.guilds.findMany({
		where: { guildid: { in: userGuilds.map((g) => g.id) } },
	});

	return json(
		userGuilds
			.sort((a, b) => a.name.localeCompare(b.name))
			.map((g) => ({
				...g,
				hasBot: !!botGuilds.find((g2) => g2.guildid === g.id),
			})) as GETResponse,
	);
};

export type GETResponse = (RESTAPIPartialCurrentUserGuild & { hasBot: boolean })[];
