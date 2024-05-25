import DataBase from '$lib/server/database.js';
import type { RequestEvent } from '@sveltejs/kit';
import API from '$lib/server/api.js';
import getAvatarURL from './getAvatarURL';

export default async (req: RequestEvent | string) => {
	const auth =
		typeof req === 'string'
			? req.replace('Bearer ', '')
			: req.request.headers.get('Authorization')?.replace('Bearer ', '');
	if (!auth) return null;

	const existing = await DataBase.users.findFirst({
		where: { accesstoken: auth },
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
					accesstoken: auth,
					avatar: getAvatarURL(user),
					username: user.global_name ?? user.username,
					lastfetch: Date.now(),
				},
				update: {
					accesstoken: auth,
					avatar: getAvatarURL(user),
					username: user.global_name ?? user.username,
					lastfetch: Date.now(),
				},
			})
			.then();
	} else API.makeAPI(auth);

	return auth;
};
