import type { RequestEvent } from '@sveltejs/kit';
import type { APIUser } from 'discord-api-types/v10';
import getAvatarURL from './getAvatarURL';

export default async (req: RequestEvent) => {
	const token = req.cookies.get('discord-token');
	if (!token) return 403;

	const userRes = await fetch('https://discord.com/api/v10/users/@me', {
		headers: { Authorization: `Bearer ${token}` },
	});

	if (!userRes.ok) return 400;
	const user = (await userRes.json()) as APIUser;

	const basicCookieOptions: Parameters<typeof req.cookies.set>[2] = {
		expires: new Date(Date.now() + 86400000),
		path: '/',
  domain: '.ayakobot.com',
		maxAge: 86400,
		sameSite: 'strict',
		httpOnly: false,
		secure: false,
	};

	req.cookies.set('discord-id', user.id, basicCookieOptions);
	req.cookies.set('discord-username', user.username, basicCookieOptions);
	req.cookies.set('discord-avatar', getAvatarURL(user), basicCookieOptions);
};
