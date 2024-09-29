import type { APIUser } from 'discord-api-types/v10';

/**
 * Generates the URL for a user's avatar on Discord.
 *
 * @param user - The user object containing avatar and discriminator information.
 * @returns The URL string pointing to the user's avatar image.
 *
 * If the user does not have a custom avatar, a default avatar URL is generated based on the user's discriminator.
 * If the user has a custom avatar, the URL is generated based on the user's ID and avatar hash.
 */
export default (user: APIUser) => {
	if (!user.avatar) {
		return `https://cdn.discordapp.com/embed/avatars/${user.discriminator === '0' ? Number(BigInt(user.id) >> 22n) % 6 : Number(user.discriminator) % 5}.png`;
	}

	const format = user.avatar.startsWith('a_') ? 'gif' : 'webp';
	return `https://cdn.discordapp.com/avatars/${user.id}/${user.avatar}.${format}`;
};
