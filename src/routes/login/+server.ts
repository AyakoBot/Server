import { SECRET } from '$env/static/private';
import { PUBLIC_HOSTNAME, PUBLIC_ID } from '$env/static/public';
import validateToken from '$lib/scripts/util/validateToken';
import API from '$lib/server/api.js';
import DataBase from '$lib/server/database.js';
import { error, json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { OAuth2Scopes } from 'discord-api-types/v10';

export const GET: RequestHandler = async (req) => {
	const bearer = req.request.headers.get('Authorization')?.replace('Bearer ', '');
	if (!bearer) return error(401, 'Unauthorized');

	const token = await API.getAPI().oauth2.tokenExchange({
		client_id: PUBLIC_ID,
		client_secret: SECRET,
		grant_type: 'authorization_code',
		code: bearer,
		redirect_uri: `${PUBLIC_HOSTNAME}/login`,
	});

	if (!token) return error(401, 'Invalid code');
	const valid = await validateToken(token.access_token);
	if (!valid) return error(401, 'Invalid token');

	const user = await DataBase.users.findFirst({
		where: { accesstoken: token.access_token },
		select: { userid: true, username: true, avatar: true },
	});
	if (!user) return error(401, 'Invalid token');

	if (token.scope.includes(OAuth2Scopes.GuildsJoin)) {
		API.getAPI()
			.guilds.addMember('298954459172700181', user.userid, { access_token: token.access_token })
			.catch(() => null);
	}

	return json({
		id: user.userid,
		username: user.username,
		avatar: user.avatar,
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
