import getUser, { AuthTypes } from '$lib/scripts/util/getUser';
import makeReadableError from '$lib/scripts/util/makeReadableError';
import { Reminder as ReminderClass } from '$lib/scripts/util/Reminder';
import validateToken from '$lib/scripts/util/validateToken';
import DataBase from '$lib/server/database';
import type { Reminder } from '@prisma/client';
import { Decimal } from '@prisma/client/runtime/client';
import { error, json, type RequestHandler } from '@sveltejs/kit';
import { z } from 'zod';

export const GET: RequestHandler = async (req) => {
	const token = await validateToken(req);
	if (!token) return error(403, 'Invalid or no token provided');

	const user = await getUser(token, [AuthTypes.Bearer]);
	if (user instanceof Response) return user;

	const reminders = await DataBase.reminder.findMany({ where: { userId: user.userid } });
	if (!reminders) return json([] as GETResponse);

	return json(
		reminders.map((r) => ({
			...r,
			id: Number(r.startTime),
			endTime: Number(r.endTime),
		})) as GETResponse,
	);
};

export type GETResponse = (Omit<Reminder, 'startTime' | 'endTime'> & {
	id: number;
	endTime: number;
})[];

const POSTBody = z.object({
	reason: z
		.string({ message: 'reason is not a string' })
		.max(2000, { message: 'reason is gt 2000' })
		.min(1, { message: 'reason is lt 1' }),
	endTime: z
		.number({ message: 'endTime is not a number' })
		.int({ message: 'endTime is not an int' })
		.min(Date.now(), { message: 'endTime cannot be in the past' }),
	startTime: z
		.number({ message: 'startTime is not a number' })
		.int({ message: 'startTime is not an int' })
		.max(Date.now(), { message: 'startTime cannot be in the future' })
		.min(Date.now() - 10000, { message: 'startTime cannot be this far in the past' })
		.optional(),
});

export const POST: RequestHandler = async (req) => {
	const token = await validateToken(req);
	if (!token) return error(403, 'Invalid or no token provided');

	const user = await getUser(token, [AuthTypes.Bot, AuthTypes.Bearer]);
	if (user instanceof Response) return user;

	const body = POSTBody.safeParse(await req.request.json().catch(() => ({})));
	console.log(body.error ? makeReadableError(body.error) : null);
	if (!body.success) return error(400, makeReadableError(body.error));

	if (body.data.endTime < Date.now()) return error(400, 'endTime cannot be in the past');
	if (body.data.startTime && body.data.startTime < Date.now() - 10000) {
		return error(400, 'startTime cannot be this far in the past');
	}
	if (body.data.startTime && body.data.startTime > Date.now()) {
		return error(400, 'startTime cannot be in the future');
	}

	const reminder = new ReminderClass({
		channelId: 'Website',
		endTime: new Decimal(body.data.endTime),
		reason: body.data.reason,
		userId: user.userid,
		startTime: new Decimal(body.data.startTime || Date.now()),
	});

	return json({
		...reminder.toJSON(),
		id: Number(reminder.toJSON().startTime),
		endTime: Number(reminder.toJSON().endTime),
		startTime: Number(reminder.toJSON().startTime),
	} as POSTResponse);
};

export type POSTResponse = Omit<Reminder, 'startTime' | 'endTime'> & {
	id: number;
	startTime: number;
	endTime: number;
};
