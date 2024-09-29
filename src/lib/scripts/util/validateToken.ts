import DataBase from '$lib/server/database.js';
import type { RequestEvent } from '@sveltejs/kit';
import API from '$lib/server/api.js';
import getAvatarURL from './getAvatarURL';
import type { RESTPostOAuth2AccessTokenResult } from 'discord-api-types/v10';
import { PUBLIC_ID } from '$env/static/public';

/**
 * Validates the authorization token from the request or provided token.
 *
 * @template T - The type of the request event, which can be `RequestEvent` or `undefined`.
 * @param req - The request event object, which contains the request headers.
 * @param token - The token object, which is required if `req` is `undefined`. It contains the access token and bot ID.
 * @returns A promise that resolves to the result of the token validation, or `null` if the authorization header is missing or invalid.
 */
export default async <T extends RequestEvent | undefined>(
	req: T,
	token?: T extends undefined ? RESTPostOAuth2AccessTokenResult & { botId: string } : undefined,
) => {
	const authHeader = req
		? req.request.headers.get('Authorization')
		: (token?.access_token && `Bearer ${token?.access_token}`) || undefined;
	if (!authHeader) return null;

	const [type, auth] = authHeader.split(/\s+/g);

	switch (type as 'Bearer' | 'Bot') {
		case 'Bearer':
			return handleBearer(auth, token);
		case 'Bot':
			return handleBot(auth);
		default:
			return null;
	}
};

/**
 * Asynchronously handles bot authentication by validating the provided API token.
 *
 * @param auth - The API token to be validated.
 * @returns The provided API token if a user with the token is found, otherwise `undefined`.
 */
export const handleBot = async (auth: string) => {
	const user = await DataBase.users.findFirst({ where: { apiToken: auth } });

	return user ? auth : undefined;
};

/**
 * Handles the Bearer token authentication process.
 *
 * @template T - A type that extends `RequestEvent` or `undefined`.
 *
 * @param {string} auth - The authentication token.
 * @param {T extends undefined ? RESTPostOAuth2AccessTokenResult & { botId: string } : undefined} [token] - The OAuth2 access token result with bot ID if `T` is `undefined`.
 *
 * @returns {Promise<string | null>} - Returns the authentication token without 'Bearer ' prefix if successful, otherwise returns `null`.
 *
 * This function performs the following steps:
 * 1. Checks if the provided `auth` token exists in the database.
 * 2. If the token exists, it returns the `auth` token.
 * 3. If the token does not exist, it checks if the provided `token` exists in the database.
 * 4. If the `token` exists, it makes an API call and returns the `auth` token without the 'Bearer ' prefix.
 * 5. If the `token` does not exist, it makes an API call to get the current user.
 * 6. If the user is found, it upserts the user data and tokens in the database.
 * 7. Returns the `auth` token without the 'Bearer ' prefix.
 */
export const handleBearer = async <T extends RequestEvent | undefined>(
	auth: string,
	token?: T extends undefined ? RESTPostOAuth2AccessTokenResult & { botId: string } : undefined,
) => {
	const userToken = await DataBase.users.findFirst({
		where: { apiToken: auth },
	});
	if (userToken) return auth;

	const existing = await DataBase.users.findFirst({
		where: { tokens: { some: { accesstoken: token?.access_token } } },
		select: { userid: true },
	});

	if (existing) {
		API.makeAPI((typeof auth === 'boolean' ? token?.access_token : auth)!);
		return auth.replace('Bearer ', '');
	}

	const api = API.makeAPI(auth);

	const user = await api.users.getCurrent();
	if (!user) return null;

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
						where: { userid_botid: { userid: user.id, botid: token?.botId ?? PUBLIC_ID } },
						create: {
							accesstoken: token?.access_token,
							refreshtoken: token?.refresh_token,
							expires: Number(token?.expires_in) * 1000 + Date.now(),
							botid: token?.botId ?? PUBLIC_ID,
							scopes: token?.scope.split(/\s+/g),
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
						where: { userid_botid: { userid: user.id, botid: token?.botId ?? PUBLIC_ID } },
						create: {
							accesstoken: token?.access_token,
							refreshtoken: token?.refresh_token,
							expires: Number(token?.expires_in) * 1000 + Date.now(),
							botid: token?.botId ?? PUBLIC_ID,
							scopes: token?.scope.split(/\s+/g),
						},
						update: {
							accesstoken: token?.access_token,
							refreshtoken: token?.refresh_token,
							expires: Number(token?.expires_in) * 1000 + Date.now(),
							scopes: token?.scope.split(/\s+/g),
						},
					},
				},
			},
		})
		.then();

	return auth.replace('Bearer ', '');
};
