import validateToken from '$lib/scripts/util/validateToken';
import DataBase from '$lib/server/database.js';
import { type appealquestions } from '@prisma/client';
import { error, json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import getUser, { AuthTypes } from '$lib/scripts/util/getUser';
import EditorTypes, {
	zodValidators as ZodValidators,
} from '@ayako/bot/src/BaseClient/Other/constants/settingsEditorTypes';
import {
	SettingsName2TableName,
	type CRUDResult,
	type SettingNames,
} from '@ayako/bot/src/Typings/Settings';
import z from 'zod';
import prismaToPrimitive from 'src/lib/scripts/util/prismaToPrimitive';

export const GET: RequestHandler = async (req) => {
	const token = await validateToken(req);
	if (!token) return error(403, 'Invalid or no token provided');

	const user = await getUser(token, [AuthTypes.Bot, AuthTypes.Bearer]);
	if (user instanceof Response) return user;

	const guildId = z
		.string()
		.regex(/\d{17,19}/gm, { message: 'Guild ID is not a snowflake' })
		.safeParse(req.params.guildId);

	if (!guildId.success) return error(400, 'Invalid guild ID');

	const setting = z
		.enum([...Object.keys(SettingsName2TableName), 'appeal-questions'])
		.safeParse(req.params.setting);

	if (!setting.success) return error(400, 'Invalid setting');
	if (setting.data === 'appeal-questions') setting.data = 'questions';

	const editorTypes = EditorTypes[setting.data as SettingNames];

	if (!editorTypes) return error(400, 'Invalid setting');

	const guild = await DataBase.guilds.findFirst({
		where: { guildid: guildId.data },
		select: { guildid: true },
	});
	if (!guild) return error(404, 'Guild not found');

	const settings = await (
		DataBase[SettingsName2TableName[setting.data as SettingNames]] as never as {
			findMany: (x: {
				where: { uniquetimestamp?: number; guildid: string; active?: boolean };
			}) => Promise<CRUDResult<SettingNames>[]>;
		}
	)
		.findMany({ where: { guildid: guildId.data } })
		.then((res) =>
			res.map((q) => {
				const data = prismaToPrimitive(q) as unknown as GETResponse<SettingNames>[number];
				if ('uniquetimestamp' in q) data.id = Number(q.uniquetimestamp);

				delete (data as GETResponse<SettingNames>[number] & { uniquetimestamp?: unknown })
					.uniquetimestamp;
				return data;
			}),
		);
	if (!settings) return error(404, 'Settings not found');

	return json(settings.map((s) => s) as GETResponse<SettingNames>);
};

export type GETResponse<T extends SettingNames> = (Omit<CRUDResult<T>, 'uniquetimestamp'> & {
	id: number;
})[];
