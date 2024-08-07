import { error, json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import qotd from '$lib/server/questions.json';

export const GET: RequestHandler = async () =>
	json({ question: qotd[new Date().getUTCDate() % qotd.length] });
