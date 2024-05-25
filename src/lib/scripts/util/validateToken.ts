import DataBase from '$lib/server/database.js';
import type { RequestEvent } from '@sveltejs/kit';
import API from '$lib/server/api.js';
import getAvatarURL from './getAvatarURL';
import type { RESTPostOAuth2AccessTokenResult } from 'discord-api-types/v10';
import { PUBLIC_ID } from '$env/static/public';

export default async (
	req: RequestEvent | string,
	token?: RESTPostOAuth2AccessTokenResult & { botId: string },
) => {
	const auth =
		typeof req === 'string'
			? req.replace('Bearer ', '')
			: req.request.headers.get('Authorization')?.replace('Bearer ', '');
	if (!auth) return null;

	const existing = await DataBase.users.findFirst({
		where: { tokens: { some: { accesstoken: auth } } },
		select: { userid: true },
	});

	if (!existing) {
		const api = API.makeAPI(auth);

		const user = await api.users.getCurrent().catch(() => undefined);
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
	} else API.makeAPI(auth);

	return auth;
};
