import getUser, { AuthTypes } from '$lib/scripts/util/getUser';
import makeReadableError from '$lib/scripts/util/makeReadableError';
import validateToken from '$lib/scripts/util/validateToken';
import DataBase from '$lib/server/database.js';
import interactions from '@ayako/bot/src/BaseClient/Other/constants/interactions';
import { error, json } from '@sveltejs/kit';
import z from 'zod';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async (req) => {
	const token = await validateToken(req);
	if (!token) return error(403, 'Invalid or no token provided');

	const user = await getUser(token, [AuthTypes.Bearer]);
	if (user instanceof Response) return user;

	const blocked = await DataBase.blockedusers.findMany({
		where: { userid: user.userid },
		select: { blockedcmd: true, blockeduserid: true },
	});

	return json(
		blocked.map((b) => ({ commands: b.blockedcmd, user: b.blockeduserid })) as GETResponse,
	);
};

export type GETResponse = {
	commands: string[];
	user: string | '0';
}[];

const Command = z
	.string({ message: 'command is not string' })
	.max(
		interactions.reduce((a, b) => Math.max(a, b.name.length), 0),
		{ message: 'command is too long' },
	)
	.min(
		interactions.reduce((a, b) => Math.min(a, b.name.length), Infinity),
		'command is too short',
	);

const PatchPayload = z.object(
	{
		command: Command,
		enabled: z.boolean({ message: 'enabled is not boolean' }),
		userId: z
			.literal('0', { message: 'userId is not a snowflake or 0' })
			.or(z.string().regex(/\d{17,19}/g, { message: 'userId is not a snowflake or 0' })),
	},
	{ message: 'body is not an object' },
);

export const PATCH: RequestHandler = async (req) => {
	const token = await validateToken(req);
	if (!token) return error(403, 'Invalid or no token provided');

	const user = await getUser(token, [AuthTypes.Bearer]);
	if (user instanceof Response) return user;

	const validBody = PatchPayload.safeParse(await req.request.json().catch(() => ({})));
	if (!validBody.success) return error(400, makeReadableError(validBody.error));

	if (!interactions.find((i) => i.name === validBody.data.command)) {
		return error(400, 'Command not found');
	}

	if (validBody.data.enabled) {
		const blocked = await DataBase.blockedusers.findUnique({
			where: { userid_blockeduserid: { userid: user.userid, blockeduserid: validBody.data.userId } },
		});

		if (!blocked) return new Response(undefined, { status: 204 });

		await DataBase.blockedusers.update({
			where: { userid_blockeduserid: { userid: user.userid, blockeduserid: validBody.data.userId } },
			data: { blockedcmd: { set: blocked.blockedcmd.filter((c) => c !== validBody.data.command) } },
		});

		return new Response(undefined, { status: 204 });
	}

	await DataBase.blockedusers.upsert({
		where: { userid_blockeduserid: { userid: user.userid, blockeduserid: validBody.data.userId } },
		create: {
			userid: user.userid,
			blockeduserid: validBody.data.userId,
			blockedcmd: [validBody.data.command],
		},
		update: { blockedcmd: { push: validBody.data.command } },
	});

	return new Response(undefined, { status: 204 });
};

const DeletePayload = z.object(
{
		userId: z.string().regex(/\d{17,19}/g, { message: 'Id did not match validation regex' }),
		command: Command,
	},
	{ message: 'body is not an object' },
);

export const DELETE: RequestHandler = async (req) => {
	const token = await validateToken(req);
	if (!token) return error(403, 'Invalid or no token provided');

	const user = await getUser(token, [AuthTypes.Bearer]);
	if (user instanceof Response) return user;

	const validBody = DeletePayload.safeParse(await req.request.json().catch(() => ({})));
	if (!validBody.success) return error(400, makeReadableError(validBody.error));

	const block = await DataBase.blockedusers.findUnique({
		where: {
			blockedcmd: { has: validBody.data.command },
			userid_blockeduserid: { userid: user.userid, blockeduserid: validBody.data.userId },
		},
	});

	if (!block) return new Response(undefined, { status: 204 });

	if (block.blockedcmd.length === 1) {
		await DataBase.blockedusers.delete({
			where: { userid_blockeduserid: { userid: user.userid, blockeduserid: validBody.data.userId } },
		});
	}

	await DataBase.blockedusers.update({
		where: {
			userid_blockeduserid: { userid: user.userid, blockeduserid: validBody.data.userId },
		},
		data: {
			blockedcmd: { set: block.blockedcmd.filter((c) => c !== validBody.data.command) },
		},
	});

	return new Response(undefined, { status: 204 });
};

const PostPayload = z.object(
	{
		userId: z.string().regex(/\d{17,19}/g, { message: 'Id did not match validation regex' }),
		command: Command,
	},
	{ message: 'body is not an object' },
);

export const POST: RequestHandler = async (req) => {
	const token = await validateToken(req);
	if (!token) return error(403, 'Invalid or no token provided');

	const user = await getUser(token, [AuthTypes.Bearer]);
	if (user instanceof Response) return user;

	const validBody = PostPayload.safeParse(await req.request.json().catch(() => ({})));
	if (!validBody.success) return error(400, makeReadableError(validBody.error));

	const blocked = await DataBase.blockedusers.findUnique({
		where: {
			userid_blockeduserid: { userid: user.userid, blockeduserid: validBody.data.userId },
		},
	});

	if (blocked?.blockedcmd.includes(validBody.data.command)) {
		return new Response(undefined, { status: 204 });
	}

	await DataBase.blockedusers.upsert({
		where: {
			userid_blockeduserid: { userid: user.userid, blockeduserid: validBody.data.userId },
		},
		create: {
			userid: user.userid,
			blockeduserid: validBody.data.userId,
			blockedcmd: [validBody.data.command],
		},
		update: { blockedcmd: { push: validBody.data.command } },
	});

	return new Response(undefined, { status: 204 });
};
