import validateToken from '$lib/scripts/util/validateToken';
import DataBase from '$lib/server/database.js';
import { type appealquestions } from '@prisma/client';
import { error, json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { z } from 'zod';

export const GET: RequestHandler = async (req) => {
	const token = await validateToken(req);
	if (!token) return error(403, 'Invalid or no token provided');

	const user = await DataBase.users.findFirst({
		where: { tokens: { some: { accesstoken: token } } },
		select: { userid: true },
	});
	if (!user) return error(401, 'Unauthorized');

	const guildId = req.params.guildId;

	const guild = await DataBase.guilds.findFirst({
		where: { guildid: guildId },
		select: { guildid: true },
	});
	if (!guild) return error(404, 'Guild not found');

	const settings = await DataBase.appealsettings.findUnique({
		where: { guildid: guildId, active: true },
		select: { active: true },
	});
	if (!settings) return error(404, 'Appeals are not enabled for this server');

	const questions = await DataBase.appealquestions
		.findMany({
			where: { guildid: guildId, active: true },
		})
		.then((res) =>
			res.map((q) => {
				const question = q as unknown as Returned[number];
				question.id = Number(q.uniquetimestamp);
				delete (question as Returned[number] & { uniquetimestamp?: unknown }).uniquetimestamp;
				return question;
			}),
		);
	if (!questions.length) return error(404, 'Appeals are not enabled for this server');

	return json(questions as Returned);
};

export type Returned = (Omit<appealquestions, 'uniquetimestamp'> & { id: number })[];
