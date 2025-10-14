import getUser, { AuthTypes } from '$lib/scripts/util/getUser';
import type { RequestHandler } from './$types';
import { error, json } from '@sveltejs/kit';
import validateToken from '$lib/scripts/util/validateToken';
import DataBase from '$lib/server/database';

export const GET: RequestHandler = async (req) => {
	const token = await validateToken(req);
	if (!token) return error(403, 'Invalid or no token provided');

	const user = await getUser(token, [AuthTypes.Bearer]);
	if (user instanceof Response) return user;

	const url = await DataBase.shrtUrls.findUnique({
		where: { userId: user.userid, id: req.params.id },
	});
	if (!url) return error(404, 'URL not found');

	const uses = await DataBase.shrtUrlUses.findMany({ where: { id: req.params.id } });

	return json(uses.map((u) => ({ ...u, timestamp: Number(u.timestamp) })) as GETResponse);
};

export type GETResponse = { id: string; timestamp: number }[];
