import type { TopGGVote } from '@ayako/bot/src/Typings/TopGG.js';
import type { RequestHandler } from './$types';
import DataBase from '$lib/server/database.js';
import redis from '$lib/server/redis.js';
import { error, json } from '@sveltejs/kit';
import { z } from 'zod';

const vote = z.object({
	bot: z
		.string({ message: 'bot is not snowflake' })
		.regex(/^\d{17,19}$/, { message: 'bot is not snowflake' }),
	user: z
		.string({ message: 'user is not snowflake' })
		.regex(/^\d{17,19}$/, { message: 'user is not snowflake' }),
	type: z.string().regex(/^(test|upvote)$/gm),
	isWeekend: z.boolean(),
	query: z.string().optional(),
});

export const POST: RequestHandler = async (req) => {
	const payload = vote.safeParse(await req.request.json().catch(() => ({})));
	if (!payload.success) return error(400, payload.error.message);

	const parsed: TopGGVote = {
		...payload.data,
		type: payload.data.type as TopGGVote['type'],
		authorization:
			req.request.headers.get('authorization') || req.request.headers.get('Authorization') || '',
	};

	const exists = await DataBase.votesettings.count({ where: { token: parsed.authorization } });
	if (!exists) return error(498, 'Invalid token');

	redis.publish('vote', JSON.stringify(payload));

	return json({ success: true });
};
