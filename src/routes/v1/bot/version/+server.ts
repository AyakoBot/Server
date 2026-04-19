import { error, json } from '@sveltejs/kit';
import fs from 'fs/promises';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async () => {
	const version = await fs
		.readFile('/app/Ayako/packages/Bot/package.json', 'utf-8')
		.then((data) => JSON.parse(data).version)
		.catch(() => 'unknown');

	return json({ version } as GETResponse);
};

export type GETResponse = {
	version: string;
};
