import DataBase from '$lib/server/database.js';
import { ArtType as Type } from '@ayako/website/src/lib/scripts/types.js';
import { ArtType, Prisma } from '@prisma/client';
import { error, json } from '@sveltejs/kit';
import { z } from 'zod';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async (req) => {
	const params = req.url.searchParams;
	const query = z
		.string()
		.optional()
		.safeParse(params?.get('q')?.toLowerCase() || undefined);
	const type = z
		.string()
		.optional()
		.safeParse(params?.get('type')?.toLowerCase() || undefined);

	if (!query.success) return error(400, 'Invalid query');
	if (!type.success) return error(400, 'Invalid type');

	const where: Prisma.artWhereInput = { verified: true };
	switch (type.data as Type) {
		case Type.emoji:
			where.type = ArtType.emoji;
			break;
		case Type.full:
			where.type = ArtType.full;
			break;
		case Type.icon:
			where.type = ArtType.icon;
			break;
		default:
			break;
	}

	const art = await DataBase.art.findMany({ where, orderBy: { created: 'desc' } });
	const users = await DataBase.users.findMany({
		where: { userid: { in: art.map((c) => c.userid) } },
		select: {
			username: true,
			avatar: true,
			socials: true,
			socialstype: true,
			userid: true,
		},
	});

	return json(
		(
			art.map((c) => {
				const user = users.find((u) => u.userid === c.userid);

				return {
					user: {
						username: user?.username,
						avatar: user?.avatar,
						socials: user?.socials.map((s, i) => ({
							type: user?.socialstype[i],
							url: s,
						})),
					},
					art: {
						url: c.url,
						type: c.type,
						created: Number(c.created),
						description: c.desc,
					},
				};
			}) as GETResponse
		).filter((a) =>
			query.data && query.data.length
				? a.art.description?.toLowerCase().includes(query.data) ||
					a.art.url?.toLowerCase().includes(query.data) ||
					a.user.username?.toLowerCase().includes(query.data)
				: true,
		),
	);
};

export type GETResponse = {
	user: {
		username: string;
		avatar: string;
		socials: {
			type: string;
			url: string;
		}[];
	};
	art: {
		url: string;
		type: ArtType;
		created: number;
		description: string | null;
	};
}[];
