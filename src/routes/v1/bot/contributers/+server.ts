import DataBase from '$lib/server/database.js';
import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async () => {
	const contribs = await DataBase.contributers.findMany();
	const users = await DataBase.users.findMany({
		where: { userid: { in: contribs.map((c) => c.userid) } },
		select: {
			username: true,
			avatar: true,
			socials: true,
			socialstype: true,
			userid: true,
		},
	});

	return json(
		contribs.map((c) => {
			const user = users.find((u) => u.userid === c.userid);

			return {
				...c,
				username: user?.username,
				avatar: user?.avatar,
				socials: user?.socials.map((s, i) => ({
					type: user?.socialstype[i],
					url: s,
				})),
			};
		}) as GETResponse,
	);
};

export type GETResponse = {
	userid: string;
	roles: string[];
	username?: string;
	avatar?: string;
	socials: { type: string; url: string }[];
}[];
