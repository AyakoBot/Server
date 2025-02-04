import { error, json, type RequestHandler } from '@sveltejs/kit';
import getUser, { AuthTypes } from '$lib/scripts/util/getUser';
import validateToken from '$lib/scripts/util/validateToken';
import DataBase from '$lib/server/database';
import type { reminders } from '@prisma/client';

export const GET: RequestHandler = async (req) => {
	const token = await validateToken(req);
	if (!token) return error(403, 'Invalid or no token provided');

	const user = await getUser(token, [AuthTypes.Bearer]);
	if (user instanceof Response) return user;

	const reminders = await DataBase.reminders.findMany({ where: { userid: user.userid } });

	return json(
		reminders.map((r) => ({
			...r,
			id: Number(r.uniquetimestamp),
			endtime: Number(r.endtime),
			content: r.reason,
		})) as GETResponse,
	);
};

export type GETResponse = (Omit<reminders, 'uniquetimestamp' | 'endtime' | 'reason'> & {
	id: number;
	endtime: number;
	content: string;
})[];
