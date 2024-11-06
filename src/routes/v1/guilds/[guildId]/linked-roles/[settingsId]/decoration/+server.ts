import makeReadableError from '$lib/scripts/util/makeReadableError.js';
import APIManager from '$lib/server/api.js';
import DataBase from '$lib/server/database.js';
import { API, OAuth2Scopes } from '@discordjs/core';
import { REST } from '@discordjs/rest';
import type { linkedRolesDeco } from '@prisma/client';
import { error, json, redirect } from '@sveltejs/kit';
import { z } from 'zod';
import type { RequestHandler } from './$types';
import { nirn } from '$env/static/private';

export const GET: RequestHandler = async (req) => {
	const code = req.url.searchParams.get('code');

	const guildId = z
		.string()
		.regex(/^\d{17,19}$/, { message: 'guildId is not snowflake' })
		.safeParse(req.params.guildId);
	if (!guildId.success) return error(400, makeReadableError(guildId.error));

	const settingsId = z
		.string()
		.regex(/^\d{13}$/, { message: 'settingsId did not match validation regex' })
		.safeParse(req.params.settingsId);
	if (!settingsId.success) return error(400, makeReadableError(settingsId.error));

	const settings = await DataBase.linkedRolesDeco.findFirst({
		where: { guildid: guildId.data, uniquetimestamp: settingsId.data },
	});
	if (!settings) error(404, 'Settings not found');
	if (!settings.botId) error(424, 'Bot ID missing in Settings');
	if (!settings.botSecret) error(424, 'Bot Secret missing in Settings');
	if (!settings.botToken) error(424, 'Bot Token missing in Settings');
	if (!code)
		throw redirect(
			302,
			APIManager.getAPI().oauth2.generateAuthorizationURL({
				client_id: settings.botId,
				redirect_uri: getRedirectURI(settings),
				response_type: 'code',
				scope: `${OAuth2Scopes.RoleConnectionsWrite} ${OAuth2Scopes.Identify}`,
				prompt: 'none',
			}),
		);

	const rest = new REST({ api: `http://${nirn}:8080/api`, authPrefix: 'Bot' });
	const botAPI = new API(rest.setToken(settings.botToken));
	const tokens = await botAPI.oauth2.tokenExchange({
		client_id: settings.botId,
		client_secret: settings.botSecret!,
		grant_type: 'authorization_code',
		code,
		redirect_uri: getRedirectURI(settings),
	});

	const userAPI = APIManager.makeAPI(tokens.access_token);
	const identity = await userAPI.oauth2.getCurrentAuthorizationInformation();
	if (!identity.user) error(401, 'User not found. Scope "identify" missing');
	if (!identity.scopes.includes(OAuth2Scopes.Identify)) error(401, 'Scope "identify" missing');
	if (!identity.scopes.includes(OAuth2Scopes.RoleConnectionsWrite)) {
		error(401, 'Scope "role_connections.write" missing');
	}
	if (!settings.allowedUsers.includes(identity.user.id)) error(403, 'User not allowed');

	await DataBase.linkedRoleTokens.create({
		data: {
			botId: settings.botId,
			token: tokens.refresh_token,
			userId: identity.user.id,
		},
	});

	const bot = await botAPI.applications.getCurrent();

	await userAPI.users.updateApplicationRoleConnection(settings.botId, {
		platform_username: bot.description.slice(0, 100) || undefined,
	});

	return json({ success: 'true', message: 'Close this tab and return to Discord to continue' });
};

const getRedirectURI = (settings: linkedRolesDeco) =>
	`https://api.ayakobot.com/v1/guilds/${settings.guildid}/linked-roles/${settings.uniquetimestamp}/decoration`;
