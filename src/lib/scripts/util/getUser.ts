import DataBase from '$lib/server/database.js';
import type { users } from '@prisma/client';

export enum AuthTypes {
	Bot = 'Bot',
	Bearer = 'Bearer',
}

export default async (auth: string, acceptedAuthTypes: AuthTypes[]): Promise<users | Response> => {
	switch (true) {
		case acceptedAuthTypes.includes(AuthTypes.Bearer): {
			const res = await DataBase.users.findFirst({
				where: { tokens: { some: { accesstoken: auth } } },
			});

			if (res) return res;
			break;
		}
		case acceptedAuthTypes.includes(AuthTypes.Bot): {
			const res = await DataBase.users.findFirst({ where: { apiToken: auth } });

			if (res) return res;
			break;
		}
		default:
			break;
	}

	return new Response(null, { status: 403 });
};
