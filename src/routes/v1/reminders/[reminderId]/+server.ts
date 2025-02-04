import getUser, { AuthTypes } from '$lib/scripts/util/getUser';
import type { RequestHandler } from './$types';
import { error, json } from '@sveltejs/kit';
import validateToken from '$lib/scripts/util/validateToken';
import DataBase from '$lib/server/database';
import type { reminders } from '@prisma/client';

export const GET: RequestHandler = async (req) => {
	const token = await validateToken(req);
	if (!token) return error(403, 'Invalid or no token provided');

	const user = await getUser(token, [AuthTypes.Bot, AuthTypes.Bearer]);
	if (user instanceof Response) return user;

	const { reminderId } = req.params;

	const reminder = await DataBase.reminders.findUnique({
		where: { uniquetimestamp: reminderId, userid: user.userid },
	});

	if (!reminder) return error(404, 'Reminder not found');

	return json({
		...reminder,
		id: Number(reminder.uniquetimestamp),
		endtime: Number(reminder.endtime),
	} as GETResponse);
};

export type GETResponse = Omit<reminders, 'uniquetimestamp' | 'endtime'> & {
	id: number;
	endtime: number;
};

export const DELETE: RequestHandler = async (req) => {
	const token = await validateToken(req);
	if (!token) return error(403, 'Invalid or no token provided');

	const user = await getUser(token, [AuthTypes.Bot, AuthTypes.Bearer]);
	if (user instanceof Response) return user;

	const { reminderId } = req.params;

	await DataBase.reminders.delete({ where: { uniquetimestamp: reminderId, userid: user.userid } });

	return new Response(null, { status: 204 });
};
