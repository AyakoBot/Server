import getUser, { AuthTypes } from 'src/lib/scripts/util/getUser';
import validateToken from 'src/lib/scripts/util/validateToken';
import { z } from 'zod';
import type { RequestHandler } from './$types';
import { error, json } from '@sveltejs/kit';
import DataBase from '$lib/server/database';
import makeReadableError from 'src/lib/scripts/util/makeReadableError';
import type { reminders } from '@prisma/client';

const POSTBody = z.object({
	content: z
		.string({ message: 'content is not a string' })
		.max(2000, { message: 'content is gt 2000' })
		.min(1, { message: 'content is lt 1' }),
	endtime: z
		.number({ message: 'endtime is not a number' })
		.int({ message: 'endtime is not an int' })
		.min(Date.now(), { message: 'endtime cannot be in the past' })
		.finite({ message: 'endtime is not finite' })
		.safe({ message: `endtime is gt ${Number.MAX_SAFE_INTEGER}` }),
});

export const POST: RequestHandler = async (req) => {
	const token = await validateToken(req);
	if (!token) return error(403, 'Invalid or no token provided');

	const user = await getUser(token, [AuthTypes.Bot, AuthTypes.Bearer]);
	if (user instanceof Response) return user;

	const body = POSTBody.safeParse(await req.request.json().catch(() => ({})));
	if (!body.success) return error(400, makeReadableError(body.error));

	if (body.data.endtime < Date.now()) return error(400, 'endtime cannot be in the past');

	const reminder = await DataBase.reminders.create({
		data: {
			userid: user.userid,
			endtime: body.data.endtime,
			reason: body.data.content,
			uniquetimestamp: Date.now(),
			channelid: 'Website',
		},
	});

	return json({
		...reminder,
		id: Number(reminder.uniquetimestamp),
		endtime: Number(reminder.endtime),
	});
};

export type POSTResponse = Omit<reminders, 'uniquetimestamp' | 'endtime'> & {
	id: number;
	endtime: number;
};
