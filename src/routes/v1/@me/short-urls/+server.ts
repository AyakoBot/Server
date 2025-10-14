import DataBase from '$lib/server/database';
import { error, json } from '@sveltejs/kit';
import getUser, { AuthTypes } from '$lib/scripts/util/getUser';
import validateToken from '$lib/scripts/util/validateToken';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async (req) => {
	const token = await validateToken(req);
	if (!token) return error(403, 'Invalid or no token provided');

	const user = await getUser(token, [AuthTypes.Bearer]);
	if (user instanceof Response) return user;

	const shortURLs = await DataBase.shrtUrls.findMany({ where: { userId: user.userid } });
	const uses = await DataBase.shrtUrlUses.findMany({
		where: { id: { in: shortURLs.map((s) => s.id) } },
	});

	const urlsWithUses = shortURLs.map((s) => ({
		id: s.id,
		forward: s.forward,
		uses: uses.filter((u) => u.id === s.id).length,
	}));

	return json(urlsWithUses as GETResponse);
};

export type GETResponse = { id: string; forward: string; uses: number }[];
