import generateToken from '$lib/scripts/util/generateToken.js';
import getUser, { AuthTypes } from '$lib/scripts/util/getUser';
import validateToken from '$lib/scripts/util/validateToken';
import DataBase from '$lib/server/database.js';
import { error, json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

export const POST: RequestHandler = async (req) => {
	const token = await validateToken(req);
	if (!token) return error(403, 'Invalid or no token provided');

	const user = await getUser(token, [AuthTypes.Bearer]);
	if (user instanceof Response) return user;

	const { apiToken } = await DataBase.users.update({
		where: { userid: user.userid },
		data: { apiToken: await generateToken(user.userid) },
		select: { apiToken: true },
	});
	if (!apiToken) return error(500, 'Failed to generate API token');

	return json({ token: apiToken });
};
