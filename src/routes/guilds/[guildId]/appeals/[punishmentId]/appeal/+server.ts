import user2Cookies from '$lib/scripts/util/user2Cookies';
import DataBase from '$lib/server/database.js';
import { error, json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { PunishmentType, type AppealPunishment } from '$lib/scripts/types';
import { AnswerType, type appealquestions } from '@prisma/client';
import getPunishments from '$lib/scripts/util/getPunishments.js';

export const GET: RequestHandler = async (req) => {
	const authenticated = await user2Cookies(req);
	if (authenticated) return error(authenticated, 'Invalid or no token provided');

	const { guildId, punishmentId } = req.params;
	const userId = req.cookies.get('discord-id');
	if (!userId) return error(401, 'Unauthorized');

	const settings = await DataBase.appealsettings.findUnique({
		where: { guildid: guildId, active: true },
		select: { active: true },
	});
	if (!settings) return error(404, 'No appeal settings found');

	const questions = await DataBase.appealquestions.findMany({
		where: { guildid: guildId, active: true },
	});
	if (!questions.length) return error(404, 'No appeal questions found');

	const punishment = (await getPunishments({ guildId, userId, punishmentId })).map((p) => ({
		type: p.type,
		reason: p.reason,
		id: Number(p.uniquetimestamp),
		channelname: p.channelname,
		duration: 'duration' in p ? Number(p.duration) : undefined,
	}))[0];

	return json({ punishment, settings, questions } as Returned);
};

export type Returned = {
	punishment: AppealPunishment;
	questions: appealquestions[];
};

export const POST: RequestHandler = async (req) => {
	const authenticated = await user2Cookies(req);
	if (authenticated) return error(authenticated, 'Invalid or no token provided');

	const userId = req.cookies.get('discord-id');
	if (!userId) return error(401, 'Unauthorized');

	const { guildId, punishmentId } = req.params;

	const body = (await req.request.json().catch(() => 0)) as { [key: string]: string };
	if (typeof body !== 'object') return error(400, 'Body is not an object');

	const keys = Object.keys(body);
	const keysAreStrings = keys.every((key) => typeof key === 'string');
	if (!keysAreStrings) return error(400, 'One or more keys are not strings');

	const values = Object.values(body);
	const valuesAreStrings = values.every((value) => typeof value === 'string');
	if (!valuesAreStrings) return error(400, 'One or more values are not strings');

	const numbersAsKeys = keys.map((k) => Number(k));
	if (!numbersAsKeys.every((k) => isNaN(k)))
		return error(400, 'One or more question Ids are not numbers');

	const punishment = await getPunishments({ guildId, punishmentId, userId });
	if (!punishment.length) return error(400, 'Unknown punishment Id');

	const questions = await DataBase.appealquestions.findMany({
		where: { uniquetimestamp: { in: numbersAsKeys } },
	});

	if (!numbersAsKeys.every((k) => questions.find((q) => Number(q.uniquetimestamp) === k))) {
		return error(400, 'Unknown question Id');
	}

	if (!questions.every((q) => q.guildid === guildId)) {
		return error(400, 'One or more questions are not from this guild');
	}

	const valid = questions.every((q) => {
		const value = body[Number(q.uniquetimestamp)].trim();
		if (!value) return false;

		switch (q.answertype) {
			case AnswerType.boolean: {
				if (value === 'false' && !q.required) return true;
				if (value === 'true') return true;
				return false;
			}
			case AnswerType.single_choice:
			case AnswerType.multiple_choice: {
				try {
					JSON.parse(value);
				} catch {
					return false;
				}

				const v = JSON.parse(value) as string[];
				if (!Array.isArray(v)) return false;
				if (q.required && !v.length) return false;
				if (q.options && !v.every((o) => q.options.includes(o))) return false;
				if (q.answertype === AnswerType.single_choice && v.length > 1) return false;
				return true;
			}
			case AnswerType.number: {
				if (isNaN(Number(value))) return false;
				const v = Number(value);
				if (q.required && !v) return false;
				return true;
			}
			case AnswerType.short:
			case AnswerType.paragraph: {
				if (q.required && !value.length) return false;
				return true;
			}
			case AnswerType.text:
				return true;
			default:
				return false;
		}
	});

  if (!valid) return error(400, 'Invalid answer');

	return json({ goofy: true });
};
