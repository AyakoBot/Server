import { PUBLIC_ID } from '$env/static/public';
import DataBase from '$lib/server/database.js';
import type { users, tokens } from '@prisma/client';

export enum AuthTypes {
	Bot = 'Bot',
	Bearer = 'Bearer',
}

export default async (
	auth: string,
	acceptedAuthTypes: AuthTypes[],
): Promise<(users & { tokens: tokens[] }) | Response> => {
	switch (true) {
		case acceptedAuthTypes.includes(AuthTypes.Bearer): {
			const res = await DataBase.users
				.findFirst({
					where: { tokens: { some: { accesstoken: auth } } },
					include: { tokens: true },
				})
				.then((r) => {
					if (!r) return null;

					r.tokens = r.tokens.filter((t) => t.botid === PUBLIC_ID) ?? [];
					return r;
				});

			if (res) return res;
			break;
		}
		case acceptedAuthTypes.includes(AuthTypes.Bot): {
			const res = await DataBase.users
				.findFirst({
					where: { apiToken: auth },
					include: { tokens: true },
				})
				.then((r) => {
					if (!r) return null;

					r.tokens = r.tokens.filter((t) => t.botid === PUBLIC_ID) ?? [];
					return r;
				});

			if (res) return res;
			break;
		}
		default:
			break;
	}

	return new Response(null, { status: 403 });
};
