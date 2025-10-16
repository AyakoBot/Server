import makeReadableError from '$lib/scripts/util/makeReadableError';
import redis from '$lib/server/redis';
import type { RUser } from '@ayako/bot/src/Typings/Redis.js';
import { json } from '@sveltejs/kit';
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
	const searchLower = searchQuery.toLowerCase();
	const maxResults = validMax.data || 25;
	const matchedUsers: RUser[] = [];

	let cursor = '0';

	do {
		const result = await redis.hscan('keystore:users', cursor, 'COUNT', 100);
		cursor = result[0];
		const entries = result[1];

		if (entries.length === 0) break;

		const userKeys: string[] = [];
		for (let i = 1; i < entries.length; i += 2) {
			userKeys.push(entries[i]);
		}

		if (userKeys.length === 0) continue;

		const pipeline = redis.pipeline();
		userKeys.forEach((key) => pipeline.get(key));
		const results = await pipeline.exec();

		if (!results) continue;

		for (const [err, data] of results) {
			if (err || !data) continue;

			try {
				const user = JSON.parse(String(data)) as RUser;

				if (
					user &&
					(user.username?.toLowerCase().includes(searchLower) ||
						user.global_name?.toLowerCase().includes(searchLower) ||
						user.id?.includes(searchQuery))
				) {
					matchedUsers.push(user);

					if (matchedUsers.length >= maxResults) {
						return json(matchedUsers as GETResponse);
					}
				}
			} catch {
				continue;
			}
		}
	} while (cursor !== '0');

	if (!matchedUsers.length) {
		return new Response(JSON.stringify({ message: 'User not found' }), { status: 404 });
	}

	return json(matchedUsers as GETResponse);
};

export type GETResponse = RUser[];
