import { ArtType as Type } from '$lib/scripts/types';
import DataBase from '$lib/server/database.js';
import { ArtType, Prisma } from '@prisma/client';
import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async (req) => {
	const params = req.url.searchParams;
	const query = params?.get('q')?.toLowerCase();
	const type = params?.get('type') as Type | null;

	const where: Prisma.artWhereInput = { verified: true };
	switch (type) {
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
			}) as Returned
		).filter((a) =>
			query && query.length
				? a.art.description?.toLowerCase().includes(query) ||
					a.art.url?.toLowerCase().includes(query) ||
					a.user.username?.toLowerCase().includes(query)
				: true,
		),
	);
};

export type Returned = {
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
