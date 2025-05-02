import getUser, { AuthTypes } from '$lib/scripts/util/getUser';
import type { RequestHandler } from './$types';
import { error, json } from '@sveltejs/kit';
import validateToken from '$lib/scripts/util/validateToken';
import DataBase from '$lib/server/database';
import type { Reminder } from '@prisma/client';
import { Reminder as ReminderClass } from 'src/lib/scripts/util/Reminder';
import { Decimal } from '@prisma/client/runtime/client';

export const GET: RequestHandler = async (req) => {
	const token = await validateToken(req);
	if (!token) return error(403, 'Invalid or no token provided');

	const user = await getUser(token, [AuthTypes.Bot, AuthTypes.Bearer]);
	if (user instanceof Response) return user;

	const { reminderId } = req.params;

	const reminder = await DataBase.reminder.findUnique({
		where: { startTime: reminderId, userId: user.userid },
	});

	if (!reminder) return error(404, 'Reminder not found');

	return json({
		...reminder,
		id: Number(reminder.startTime),
		endTime: Number(reminder.endTime),
	} as GETResponse);
};

export type GETResponse = Omit<Reminder, 'startTime' | 'endTime'> & {
	id: number;
	endTime: number;
};

export const DELETE: RequestHandler = async (req) => {
	const token = await validateToken(req);
	if (!token) return error(403, 'Invalid or no token provided');

	const user = await getUser(token, [AuthTypes.Bot, AuthTypes.Bearer]);
	if (user instanceof Response) return user;

	const { reminderId } = req.params;

	new ReminderClass({ startTime: new Decimal(reminderId), userId: user.userid }, false).delete();

	return new Response(null, { status: 204 });
};
