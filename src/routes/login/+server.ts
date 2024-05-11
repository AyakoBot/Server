import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import type { RESTPostOAuth2AccessTokenResult, RESTGetAPIUserResult } from 'discord-api-types/v10';
import getAvatarURL from '$lib/scripts/util/getAvatarURL.js';
import { SECRET, BOT_TOKEN } from '$env/static/private';
import { PUBLIC_ID, PUBLIC_HOSTNAME } from '$env/static/public';

export const GET: RequestHandler = async (req) => {
	const bearer = req.request.headers.get('Authorization')?.replace('Bearer ', '');
	if (!bearer) return error(401, 'Unauthorized');

	const body = new URLSearchParams({
		client_id: PUBLIC_ID,
		client_secret: SECRET as string,
		grant_type: 'authorization_code',
		code: bearer,
		redirect_uri: `${PUBLIC_HOSTNAME}/login`,
	});

	const tokeRes = await fetch('https://discord.com/api/v10/oauth2/token', {
		method: 'POST',
		headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
		body,
	});

	const token = (await tokeRes.json()) as
		| RESTPostOAuth2AccessTokenResult
		| { errors: string[]; error: string };
	if ('error' in token) return error(400, token.error);
	if ('errors' in token) return error(400, JSON.stringify(token.errors));

	const userRes = await fetch('https://discord.com/api/v10/users/@me', {
		headers: { Authorization: `${token.token_type} ${token.access_token}` },
	});

	const user = (await userRes.json()) as RESTGetAPIUserResult | { error: string };
	if ('error' in user) return error(400, user.error);

	if (token.scope.includes('guilds.join')) joinGuild(token.access_token, user.id);

	const basicCookieOptions: Parameters<typeof req.cookies.set>[2] = {
		expires: new Date(Date.now() + token.expires_in),
		path: '/',
		domain: '.ayakobot.com',
		maxAge: token.expires_in,
		sameSite: true,
		httpOnly: false,
		secure: false,
	};

	req.cookies.set('discord-token', token.access_token, {
		...basicCookieOptions,
		secure: import.meta.env.VITE_ENV === 'prod',
		httpOnly: true,
	});

	return json({
		id: user.id,
		username: user.global_name ?? user.username,
		avatar: getAvatarURL(user),
		expires: token.expires_in,
	} as Returned);
};

export type Returned = {
	id: string;
	username: string;
	avatar: string;
	expires: number;
};

const joinGuild = (auth: string, userId: string) => {
	fetch(`https://discord.com/api/v10/guilds/298954459172700181/members/${userId}`, {
		method: 'PUT',
		headers: {
			'Content-Type': 'application/json',
			Authorization: `Bot ${BOT_TOKEN}`,
		},
		body: JSON.stringify({ access_token: auth }),
	});
};
