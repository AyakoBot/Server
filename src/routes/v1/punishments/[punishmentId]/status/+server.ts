import validateToken from '$lib/scripts/util/validateToken';
import DataBase from '$lib/server/database.js';
import type { AppealStatus } from '@prisma/client';
import { error, json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async (req) => {
	const token = await validateToken(req);
	if (!token) return error(403, 'Invalid or no token provided');

	const appeal = await DataBase.appeals.findUnique({
		where: { punishmentid: req.params.punishmentId },
		select: { status: true },
	});
	if (!appeal) return error(404, 'No appeal found');

	return json({ status: appeal.status } as Returned);
};

export type Returned = {
	status: AppealStatus;
};
