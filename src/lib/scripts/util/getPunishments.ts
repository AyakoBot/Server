import DataBase from '$lib/server/database.js';
import { PunishmentType } from '@ayako/website/src/lib/scripts/types';

export default async ({
	guildId,
	userId,
	punishmentId,
}: {
	guildId: string;
	userId: string;
	punishmentId?: string;
}) => {
	const where = {
		where: { userid: userId, guildid: guildId, uniquetimestamp: punishmentId },
		orderBy: { uniquetimestamp: 'desc' } as const,
	};

	const results = await DataBase.$transaction([
		DataBase.punish_bans.findMany(where),
		DataBase.punish_channelbans.findMany(where),
		DataBase.punish_kicks.findMany(where),
		DataBase.punish_mutes.findMany(where),
		DataBase.punish_warns.findMany(where),
		DataBase.punish_tempchannelbans.findMany(where),
		DataBase.punish_tempbans.findMany(where),
		DataBase.punish_tempmutes.findMany(where),
	]);

	return results
		.filter((p) => !!p.length)
		.map((r, i) => {
			switch (i) {
				case 0:
					return r.map((p) => ({ ...p, type: PunishmentType.bans }));
				case 1:
					return r.map((p) => ({ ...p, type: PunishmentType.channelbans }));
				case 2:
					return r.map((p) => ({ ...p, type: PunishmentType.kicks }));
				case 3:
					return r.map((p) => ({ ...p, type: PunishmentType.mutes }));
				case 4:
					return r.map((p) => ({ ...p, type: PunishmentType.warns }));
				case 5:
					return r.map((p) => ({ ...p, type: PunishmentType.tempchannelbans }));
				case 6:
					return r.map((p) => ({ ...p, type: PunishmentType.tempbans }));
				case 7:
					return r.map((p) => ({ ...p, type: PunishmentType.tempmutes }));
				default:
					return [];
			}
		})
		.flat();
};
