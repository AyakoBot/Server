import getUser, { AuthTypes } from '$lib/scripts/util/getUser';
import validateToken from '$lib/scripts/util/validateToken';
import DataBase from '$lib/server/database.js';
import type { RChannel } from '@ayako/gateway/src/BaseClient/Bot/CacheClasses/channel';
import { error, json } from '@sveltejs/kit';
import { ChannelType } from 'discord-api-types/v10';
import checkChannelPermissions from 'src/lib/scripts/util/checkChannelPermissions';
import checkPermissions from 'src/lib/scripts/util/checkPermissions';
import { cache } from 'src/lib/server/redis';
import z from 'zod';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async (req) => {
	const guildId = z
		.string()
		.regex(/\d{17,19}/gm, { message: 'Guild ID is not a snowflake' })
		.safeParse(req.params.guildId);

	if (!guildId.success) return error(400, 'Invalid guild ID');

	const typesRaw = decodeURIComponent(req.url.searchParams.get('types') ?? '');
	const types = z
		.string()
		.optional()
		.transform((str) => str?.split(','))
		.pipe(z.array(z.enum(Object.values(ChannelType).map((v) => String(v)))).optional())
		.safeParse(typesRaw.length ? typesRaw : undefined);

	if (!types.success) return error(400, 'Invalid channel types');

	const token = await validateToken(req);
	if (!token) return error(403, 'Invalid or no token provided');

	const user = await getUser(token, [AuthTypes.Bot, AuthTypes.Bearer]);
	if (user instanceof Response) return user;

	const guild = await DataBase.guilds.findFirst({
		where: { guildid: guildId.data },
		select: { guildid: true },
	});
	if (!guild) return error(404, 'Guild not found');

	if (!checkPermissions(guildId.data, [], user.userid)) return error(403, 'Missing Permissions');

	const channels = await cache.channels.getAll(guildId.data);
	const channelPermissions = await Promise.all(
		channels.map((c) =>
			checkChannelPermissions(guildId.data, c.id, ['ViewChannel'], user.userid).then((p) => ({
				id: c.id,
				perms: p,
			})),
		),
	);

	return json(
		channels
			.filter((c) => (types.data ? types.data.includes(String(c.type)) : true))
			.filter((c) => channelPermissions.find((cp) => cp.id === c.id)?.perms || false) as GETResponse,
	);
};

export type GETResponse = RChannel[];
