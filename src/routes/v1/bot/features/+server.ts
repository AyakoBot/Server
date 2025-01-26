import { json, error } from '@sveltejs/kit';
import DataBase from '$lib/server/database.js';
import type { RequestHandler } from './$types';
import getChunks from '$lib/scripts/util/getChunks';
import { z } from 'zod';
import makeReadableError from '$lib/scripts/util/makeReadableError';

export const GET: RequestHandler = async (req) => {
	const params = req.url.searchParams;

	const blocks = z.string().safeParse(params.get('blocks'));
	if (!blocks.success) return error(400, 'blocks is invalid');

	const blocksNum = z
		.number({ message: 'blocks is NaN' })
		.min(1, { message: 'blocks is not gte 1' })
		.safe({ message: `blocks is not lt ${Number.MAX_SAFE_INTEGER}` })
		.finite({ message: 'blocks is not finite' })
		.int({ message: 'blocks is not an int' })
		.safeParse(parseInt(blocks.data));

	if (!blocksNum.success) return error(400, makeReadableError(blocksNum.error));

	return json(getChunks(await DataBase.features.findMany(), Number(blocks.data)) as GETResponse);
};

export type GETResponse = {
	title: string;
	subtitle: string;
	image: string;
	placeholder: string;
}[][];
