import { type AppealPunishment } from '@ayako/website/src/lib/scripts/types';
import getPunishments from '$lib/scripts/util/getPunishments.js';
import validateToken from '$lib/scripts/util/validateToken';
import DataBase from '$lib/server/database.js';
import PG from '$lib/server/pg.js';
import { AnswerType, type appealquestions } from '@prisma/client';
import { error, json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async (req) => {
	const token = await validateToken(req);
	if (!token) return error(403, 'Invalid or no token provided');

	const user = await DataBase.users.findFirst({
		where: { accesstoken: token },
		select: { userid: true },
	});

	const { guildId, punishmentId } = req.params;
	if (!user) return error(401, 'Unauthorized');

	const settings = await DataBase.appealsettings.findUnique({
		where: { guildid: guildId, active: true },
		select: { active: true },
	});
	if (!settings) return error(404, 'No appeal settings found');

	const questions = await DataBase.appealquestions.findMany({
		where: { guildid: guildId, active: true },
	});
	if (!questions.length) return error(404, 'No appeal questions found');

	const punishment = (await getPunishments({ guildId, userId: user.userid, punishmentId })).map(
		(p) => ({
			type: p.type,
			reason: p.reason,
			id: Number(p.uniquetimestamp),
			channelname: p.channelname,
			duration: 'duration' in p ? Number(p.duration) : undefined,
		}),
	)[0];

	return json({ punishment, questions } as Returned);
};

export type Returned = {
	punishment: AppealPunishment;
	questions: appealquestions[];
};

export const POST: RequestHandler = async (req) => {
	const token = await validateToken(req);
	if (!token) return error(403, 'Invalid or no token provided');

	const user = await DataBase.users.findFirst({
		where: { accesstoken: token },
		select: { userid: true },
	});
	if (!user) return error(401, 'Unauthorized');

	const { guildId, punishmentId } = req.params;

	const existing = await DataBase.appeals.findUnique({
		where: { punishmentid: punishmentId },
		select: { punishmentid: true },
	});
	if (existing) return error(400, 'Appeal already exists');

	const body = (await req.request.json().catch(() => ({}))) as { [key: string]: string };
	if (typeof body !== 'object') return error(400, 'Body is not an object');

	const keys = Object.keys(body);
	const keysAreStrings = keys.every((key) => typeof key === 'string');
	if (!keysAreStrings) return error(400, 'One or more keys are not strings');

	const values = Object.values(body);
	const valuesAreStrings = values.every((value) => typeof value === 'string');
	if (!valuesAreStrings) return error(400, 'One or more values are not strings');

	const numbersAsKeys = keys.map((k) => Number(k));
	if (!numbersAsKeys.every((k) => !isNaN(k))) {
		return error(400, 'One or more question Ids are not numbers');
	}

	const punishment = await getPunishments({ guildId, punishmentId, userId: user.userid });
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
				if (['off', 'false'].includes(value) && !q.required) return true;
				if (['on', 'true'].includes(value)) return true;
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

	await DataBase.appealanswers.createMany({
		data: questions
			.map((q) => {
				const value = body[Number(q.uniquetimestamp)].trim();
				const base: Parameters<typeof DataBase.appealanswers.create>[0]['data'] = {
					punishmentid: punishmentId,
					type: q.answertype,
					questionid: q.uniquetimestamp,
				};

				switch (q.answertype) {
					case AnswerType.boolean: {
						if (['off', 'false'].includes(value)) base.boolean = false;
						if (['on', 'true'].includes(value)) base.boolean = true;
						break;
					}
					case AnswerType.single_choice: {
						const v = JSON.parse(value) as string[];
						base.singlechoice = v[0];
						break;
					}
					case AnswerType.multiple_choice: {
						const v = JSON.parse(value) as string[];
						base.multiplechoice = v;
						break;
					}
					case AnswerType.number: {
						const v = Number(value);
						base.number = v;
						break;
					}
					case AnswerType.short:
					case AnswerType.paragraph: {
						base.string = value;
						break;
					}
					default:
						break;
				}

				return base;
			})
			.filter((v) => !!v),
	});

	await DataBase.appeals.create({
		data: {
			userid: user.userid,
			guildid: guildId,
			punishmentid: punishmentId,
		},
	});

	await PG.query(
		`NOTIFY appeal, '${JSON.stringify({ guildId, punishmentId, userId: user.userid }).replace(/'/g, "\\'")}'`,
	);

	return json({ success: true });
};
