import makeReadableError from '$lib/scripts/util/makeReadableError';
import DataBase from '$lib/server/database.js';
import type { RUser } from '@ayako/gateway/src/BaseClient/Bot/CacheClasses/user';
import { error, json } from '@sveltejs/kit';
import getUser, { AuthTypes } from 'src/lib/scripts/util/getUser';
import validateToken from 'src/lib/scripts/util/validateToken';
import { cache } from 'src/lib/server/redis';
import { z } from 'zod';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async (req) => {
	const userId = z
		.string()
		.regex(/\d{17,19}/gm, { message: 'User ID is not a snowflake' })
		.safeParse(req.params.userId);

	if (!userId.success) return error(400, makeReadableError(userId.error));

	const token = await validateToken(req);
	if (!token) return error(403, 'Invalid or no token provided');

	const user = await getUser(token, [AuthTypes.Bot, AuthTypes.Bearer]);
	if (user instanceof Response) return user;

	const cacheUser = await cache.users.get(userId.data);
	if (cacheUser) return json(cacheUser as GETResponse);

	const dbUser = await DataBase.users.findUnique({
		where: { userid: userId.data },
		select: { avatar: true, displayName: true, userid: true, username: true },
	});

	if (!dbUser) return error(404, { message: 'User not found' });

	return json({
		avatar_url: dbUser.avatar,
		username: dbUser.username,
		display_name: dbUser.displayName,
		id: dbUser.userid,
		discriminator: '0000',
		global_name: dbUser.displayName,
		banner_url: null,
	} as GETResponse);
};

export type GETResponse = RUser;
