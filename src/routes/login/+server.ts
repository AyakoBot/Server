import { BOT_SECRET, BOT_TOKEN } from '$env/static/private';
import { PUBLIC_HOSTNAME, PUBLIC_ID } from '$env/static/public';
import getAvatarURL from '$lib/scripts/util/getAvatarURL';
import DataBase from '$lib/server/database.js';
import { error, json } from '@sveltejs/kit';
import {
	OAuth2Scopes,
	type APIUser,
	type RESTPostOAuth2AccessTokenResult,
} from 'discord-api-types/v10';
import type { RequestHandler } from './$types';
import { REST } from '@discordjs/rest';
import { API } from '@discordjs/core';
import APIManager from '$lib/server/api.js';

export const GET: RequestHandler = async (req) => {
	const bearer = req.request.headers.get('Authorization')?.replace('Bearer ', '');
	if (!bearer) return error(401, 'Unauthorized');

	const state = req.url.searchParams.get('state');

	const settings = state
		? await DataBase.customclients.findUnique({ where: { guildid: state } })
		: undefined;

	const redirectUri = req.url.searchParams.get('redirect_uri');

	const tokenExchangeRest = new REST({ authPrefix: 'Bot' });
	const tokenExchangeAPI = new API(tokenExchangeRest.setToken(BOT_TOKEN));

	const token = await tokenExchangeAPI.oauth2.tokenExchange({
		client_id: settings ? (settings.appid ?? PUBLIC_ID) : PUBLIC_ID,
		client_secret: settings ? (settings.secret ?? BOT_SECRET) : BOT_SECRET,
		grant_type: 'authorization_code',
		code: bearer,
		redirect_uri: redirectUri || `${PUBLIC_HOSTNAME}/login`,
	});

	if (!token) return error(401, 'Invalid code');
	if (!token.scope.includes(OAuth2Scopes.Identify)) return error(401, 'Invalid scope');

	const user = await APIManager.makeAPI(token.access_token).users.getCurrent();
	upsertUser(user, token, settings?.appid ?? PUBLIC_ID);
	if (!user) return error(401, 'Invalid token');

	if (token.scope.includes(OAuth2Scopes.GuildsJoin)) {
		APIManager.getAPI()
			.guilds.addMember('298954459172700181', user.id, { access_token: token.access_token })
			.catch(() => null);
	}

	return json({
		id: user.id,
		username: user.username,
		avatar: getAvatarURL(user),
		expires: token.expires_in,
		access_token: token.access_token,
	} as Returned);
};

export type Returned = {
	id: string;
	username: string;
	avatar: string;
	expires: number;
	access_token: string;
};

const upsertUser = async (user: APIUser, token: RESTPostOAuth2AccessTokenResult, botid: string) =>
	DataBase.users
		.upsert({
			where: { userid: user.id },
			create: {
				userid: user.id,
				avatar: getAvatarURL(user),
				username: user.global_name ?? user.username,
				lastfetch: Date.now(),
				tokens: {
					connectOrCreate: {
						where: { userid_botid: { userid: user.id, botid } },
						create: {
							accesstoken: token.access_token,
							refreshtoken: token.refresh_token,
							expires: Number(token.expires_in) * 1000 + Date.now(),
							botid,
							scopes: token.scope.split(/\s+/g),
						},
					},
				},
			},
			update: {
				avatar: getAvatarURL(user),
				username: user.global_name ?? user.username,
				lastfetch: Date.now(),
				tokens: {
					upsert: {
						where: { userid_botid: { userid: user.id, botid } },
						create: {
							accesstoken: token.access_token,
							refreshtoken: token.refresh_token,
							expires: Number(token.expires_in) * 1000 + Date.now(),
							botid,
							scopes: token.scope.split(/\s+/g),
						},
						update: {
							accesstoken: token.access_token,
							refreshtoken: token.refresh_token,
							expires: Number(token.expires_in) * 1000 + Date.now(),
							scopes: token.scope.split(/\s+/g),
						},
					},
				},
			},
		})
		.then();
