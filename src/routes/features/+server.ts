import { json, error } from '@sveltejs/kit';
import DataBase from '$lib/server/database.js';
import type { RequestHandler } from './$types';
import getChunks from '$lib/scripts/util/getChunks';

export const GET: RequestHandler = async (req) => {
	const params = req.url.searchParams;
	if (!params.get('blocks')) {
		return error(400, {
			message: 'Invalid request. Missing "blocks" parameter.',
		});
	}

	const features = await DataBase.features.findMany();

	return json(getChunks(features, Number(params.get('blocks'))) as Returned);
};

export type Returned = {
	title: string;
	subtitle: string;
	image: string;
	placeholder: string;
}[][];
