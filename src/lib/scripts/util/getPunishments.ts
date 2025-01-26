import DataBase from '$lib/server/database.js';

/**
 * Retrieves a list of punishments for a specific user in a guild.
 *
 * @param {Object} params - The parameters for retrieving punishments.
 * @param {string | undefined} params.guildId - The ID of the guild.
 * @param {string} params.userId - The ID of the user.
 * @param {string} [params.punishmentId] - The unique timestamp of the punishment.
 * @returns {Promise<Array>} A promise that resolves to an array of punishments.
 *
 * The function queries multiple punishment tables in the database and returns
 * a combined list of punishments, each with an added `type` property indicating
 * the type of punishment.
 */
export default async ({
	guildId,
	userId,
	punishmentId,
}: {
	guildId: string | undefined;
	userId: string;
	punishmentId?: string;
}) => {
	const where = {
		where: { userid: userId, guildid: guildId, uniquetimestamp: punishmentId },
		orderBy: { uniquetimestamp: 'desc' } as const,
	};

	return DataBase.punishments.findMany(where);
};
