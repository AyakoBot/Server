import getPunishments from '$lib/scripts/util/getPunishments.js';
import validateToken from '$lib/scripts/util/validateToken';
import DataBase from '$lib/server/database.js';
import redis from '$lib/server/redis.js';
import { AnswerType, type appealquestions } from '@prisma/client';
import { error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

export const POST: RequestHandler = async (req) => {
	const token = await validateToken(req);
	if (!token) return error(403, 'Invalid or no token provided');

	const user = await DataBase.users.findFirst({
		where: { tokens: { some: { accesstoken: token } } },
		select: { userid: true },
	});
	if (!user) return error(401, 'Unauthorized');

	const { punishmentId } = req.params;

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

	const punishments = await getPunishments({
		guildId: undefined,
		punishmentId,
		userId: user.userid,
	});
	if (!punishments.length) return error(400, 'Unknown punishment Id');
	const [punishment] = punishments;

	const questions = await DataBase.appealquestions.findMany({
		where: { uniquetimestamp: { in: numbersAsKeys } },
	});

	if (!numbersAsKeys.every((k) => questions.find((q) => Number(q.uniquetimestamp) === k))) {
		return error(400, 'Unknown question Id');
	}

	if (!questions.every((q) => q.guildid === punishment.guildid)) {
		return error(400, 'One or more questions are not from this guild');
	}

	const valid = questions.every((q) => checkAnswerValid(q, body[Number(q.uniquetimestamp)].trim()));
	if (!valid) return error(400, 'Invalid answer');

	await DataBase.appealanswers.createMany({
		data: questions
			.map((q) => createData(q, body[Number(q.uniquetimestamp)].trim(), punishmentId))
			.filter((v) => !!v),
	});

	await DataBase.appeals.create({
		data: {
			userid: user.userid,
			guildid: punishment.guildid,
			punishmentid: punishmentId,
		},
	});

	redis.publish(
		'appeal',
		JSON.stringify({ guildId: punishment.guildid, punishmentId, userId: user.userid }),
	);

	return new Response(null, { status: 201 });
};

const createData = (q: appealquestions, value: string, punishmentId: string) => {
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
};

const checkAnswerValid = (q: appealquestions, value: string) => {
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
   if (value.length > 2000) return false;
			return true;
		}
		case AnswerType.text:
			return true;
		default:
			return false;
	}
};
