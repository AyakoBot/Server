import generateToken from '$lib/scripts/util/generateToken.js';
import validateToken from 'src/lib/scripts/util/validateToken';
import type { RequestHandler } from './$types';
import { error, json } from '@sveltejs/kit';
import DataBase from '$lib/server/database.js';

export const GET: RequestHandler = async (req) => {
	const token = await validateToken(req);
	if (!token) return error(403, 'Invalid or no token provided');

	const user = await DataBase.users.findFirst({
		where: { tokens: { some: { accesstoken: token } } },
		select: { userid: true },
	});
	if (!user) return error(401, 'Unauthorized');

	const { apiToken } = await DataBase.users.update({
		where: { userid: user.userid },
		data: { apiToken: await generateToken(user.userid) },
		select: { apiToken: true },
	});
	if (!apiToken) return error(500, 'Failed to generate API token');

	return json({ token: apiToken });
};
