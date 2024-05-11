import { redirect } from '@sveltejs/kit';
import type { Actions } from './$types';

export const actions = {
	logout: async (event) => {
		// TODO: logout 403

		const basicCookieOptions: Parameters<typeof event.cookies.set>[2] = {
			path: '/',
			domain: '.ayakobot.com',
			sameSite: true,
			httpOnly: false,
			secure: false,
		};

		event.cookies.delete('discord-token', {
			...basicCookieOptions,
			secure: import.meta.env.VITE_ENV === 'prod',
			httpOnly: true,
		});
		event.cookies.delete('discord-id', basicCookieOptions);
		event.cookies.delete('discord-username', basicCookieOptions);
		event.cookies.delete('discord-avatar', basicCookieOptions);

		redirect(307, '/');
	},
} satisfies Actions;
