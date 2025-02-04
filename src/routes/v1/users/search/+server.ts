import { PUBLIC_ID } from '$env/static/public';
import redis from '$lib/server/redis';
import type { RUser } from '@ayako/bot/src/Typings/Redis.js';
import { json } from '@sveltejs/kit';
import makeReadableError from 'src/lib/scripts/util/makeReadableError';
import { z } from 'zod';
import type { RequestHandler } from './$types';

const queryRegex =
	/^(?!.*[@#:```])(?!.*\b(?:everyone|here|system message|discord)\b)(?!.*discord)[^\s]{2,32}$/;

const Query = z
	.string({ message: 'Query is not a string' })
	.regex(queryRegex, { message: 'Invalid query format' })
	.optional();

const Max = z.number({ message: 'Max is not a number' }).max(25).optional();

export const GET: RequestHandler = async (req) => {
	const query = req.url.searchParams.get('query');
	const max = req.url.searchParams.get('max');
	const validQuery = Query.safeParse(query);
	const validMax = Max.safeParse(Number(max));

	if (!validQuery.success || !validMax.success) {
		return new Response(
			JSON.stringify({ message: makeReadableError((validQuery.error || validMax.error)!) }),
			{ status: 400 },
		);
	}

	const searchQuery = validQuery.data as string;
	const userKeys = await redis.keys(`${PUBLIC_ID}:cache:prod:users:*`);
	const matchedUsers: RUser[] = [];

	for (const k of userKeys) {
		const data = await redis.get(k);
		if (!data) continue;

		const u = JSON.parse(data) as RUser;

		if (u.username.includes(searchQuery) || u.global_name?.includes(searchQuery)) {
			matchedUsers.push(u);
			if (matchedUsers.length >= (validMax.data || 25)) break;
		}
	}

	if (!matchedUsers.length) {
		return new Response(JSON.stringify({ message: 'User not found' }), { status: 404 });
	}

	return json(matchedUsers as GETResponse);
};

export type GETResponse = RUser[];
