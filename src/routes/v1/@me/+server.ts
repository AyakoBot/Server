import validateToken from '$lib/scripts/util/validateToken.js';
import API from '$lib/server/api.js';
import DataBase from '$lib/server/database.js';
import { error, json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async (req) => {
	const token = await validateToken(req);
	if (!token) return error(403, 'Invalid or no token provided');

	const user = await DataBase.users.findFirst({
		where: { tokens: { some: { accesstoken: token } } },
	});
 if (!user) return error(401, 'Unauthorized');

	return json({
		id: user?.userid,
		name: user?.username,
		avatar: user?.avatar,
		socials: user?.socials.map((s, i) => ({ type: user.socialstype[i], url: s })),
		votereminders: user?.votereminders,
	});
};
