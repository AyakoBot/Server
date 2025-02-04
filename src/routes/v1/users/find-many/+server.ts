import redis from '$lib/server/redis.js';
import makeReadableError from 'src/lib/scripts/util/makeReadableError';
import type { RequestHandler } from './$types';
import z from 'zod';
import { env } from '$env/dynamic/public';
import type { RUser } from '@ayako/bot/src/Typings/Redis';
import { json } from '@sveltejs/kit';

const Body = z.object(
	{
		userIds: z
			.array(
				z
					.string({ message: 'userId is not string' })
					.regex(/\d{17,19}/g, { message: 'userId did not match validation regex' }),
				{ message: 'userIds is not an array' },
			)
			.min(1, { message: 'userIds is empty' })
			.max(1000, { message: 'userIds is longer than 1000' }),
	},
	{ message: 'body is not object' },
);

export const PUT: RequestHandler = async (req) => {
  const validBody = Body.safeParse(await req.request.json());
	if (!validBody.success) {
		const error = makeReadableError(validBody.error);
		return new Response(JSON.stringify({ message: error }), { status: 400 });
	}

	const { userIds } = validBody.data;

	const userKeys = await redis
		.keys(`${env.PUBLIC_ID}:cache:prod:users:*`)
		.then((keys) => keys.filter((k) => userIds.includes(k.split(':').pop()!)));

	const users = await Promise.all(userKeys.map((k) => redis.get(k))).then((us) =>
		us.map((u) => (u ? (JSON.parse(u) as RUser) : null)),
	);

	return json(users.filter((u): u is RUser => !!u) as PUTResponse);
};

export type PUTResponse = RUser[];
