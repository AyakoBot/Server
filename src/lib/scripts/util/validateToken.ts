import API from '$lib/server/api.js';
import DataBase from '$lib/server/database.js';
import type { RequestEvent } from '@sveltejs/kit';
import type { RESTPostOAuth2AccessTokenResult } from 'discord-api-types/v10';

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
	token?: T extends undefined ? RESTPostOAuth2AccessTokenResult : undefined,
) => {
	const authHeader = req
		? req.request.headers.get('Authorization')
		: (token?.access_token && `Bearer ${token?.access_token}`) || undefined;
	if (!authHeader) return null;

	const [type, auth] = authHeader.split(/\s+/g);
 if (!auth) return null;

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

	return user ? auth : null;
};

/**
 * Handles the Bearer token authentication process.
 *
 * @template T - A type that extends `RequestEvent` or is `undefined`.
 *
 * @param auth - The authentication string, which can be a Bearer token or a boolean.
 * @param token - The OAuth2 access token result if `T` is `undefined`.
 *
 * @returns A promise that resolves to the user ID if the token is valid, otherwise `null`.
 */
export const handleBearer = async <T extends RequestEvent | undefined>(
	auth: string,
	token?: T extends undefined ? RESTPostOAuth2AccessTokenResult : undefined,
) => {
	const existing = await DataBase.users.findFirst({
		where: { tokens: { some: { accesstoken: token?.access_token || auth } } },
		select: { userid: true },
	});
	if (!existing) return null;

	API.makeAPI((typeof auth === 'boolean' ? token?.access_token : auth)!);
	return auth.replace('Bearer ', '');
};
