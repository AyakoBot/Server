import getUser, { AuthTypes } from '$lib/scripts/util/getUser';
import validateToken from '$lib/scripts/util/validateToken.js';
import { error, json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import getAvatarURL from '$lib/scripts/util/getAvatarURL';

export const GET: RequestHandler = async (req) => {
	const token = await validateToken(req);
	if (!token) return error(401, 'Invalid or no token provided');

	const user = await getUser(token, [AuthTypes.Bearer]);
	if (user instanceof Response) return user;

	return json({
		id: user.userid,
		name: user.username,
		avatar: getAvatarURL({ discriminator: 0, avatar: user.avatar, id: user.userid }),
		socials: user.socials.map((s, i) => ({ type: user.socialstype[i], url: s })),
		votereminders: user.votereminders,
	} as GETResponse);
};

export type GETResponse = {
	id: string;
	name: string;
	avatar: string;
	socials: { type: string; url: string }[];
	votereminders: boolean;
};
