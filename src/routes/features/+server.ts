import { json, error } from '@sveltejs/kit';
import DataBase from '$lib/server/database.js';
import type { RequestHandler } from './$types';
import getChunks from '$lib/scripts/util/getChunks';
import { z } from 'zod';

export const GET: RequestHandler = async (req) => {
	const params = req.url.searchParams;

	const blocks = z.string().safeParse(params.get('blocks'));
	if (!blocks.success) return error(400, 'blocks is invalid');

	const blocksNum = z.number().min(1).safe().finite().int().safeParse(blocks.data);
	if (!blocksNum.success) return error(400, 'blocks is invalid');

	return json(getChunks(await DataBase.features.findMany(), Number(blocks.data)) as Returned);
};

export type Returned = {
	title: string;
	subtitle: string;
	image: string;
	placeholder: string;
}[][];
