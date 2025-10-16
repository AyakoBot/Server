import getUser, { AuthTypes } from '$lib/scripts/util/getUser';
import validateToken from '$lib/scripts/util/validateToken';
import DataBase from '$lib/server/database.js';
import type { RMember } from '@ayako/gateway/src/BaseClient/Bot/CacheClasses/member';
import { error, json } from '@sveltejs/kit';
import { cache } from 'src/lib/server/redis';
import z from 'zod';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async (req) => {
	const guildId = z
		.string()
		.regex(/\d{17,19}/gm, { message: 'Guild ID is not a snowflake' })
		.safeParse(req.params.guildId);

	if (!guildId.success) return error(400, 'Invalid guild ID');

	const token = await validateToken(req);
	if (!token) return error(403, 'Invalid or no token provided');

	const user = await getUser(token, [AuthTypes.Bot, AuthTypes.Bearer]);
	if (user instanceof Response) return user;

	const guild = await DataBase.guilds.findFirst({
		where: { guildid: guildId.data },
		select: { guildid: true },
	});
	if (!guild) return error(404, 'Guild not found');

	const member = await cache.members.get(guild.guildid, user.userid);
	if (!member) return error(403, 'You are not in this guild');

	return json(member);
};

export type GETResponse = RMember[];
