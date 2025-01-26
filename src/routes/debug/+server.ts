import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async (req) =>
	json({ message: `You are ${req.request.headers.get('X-forwarded-for')}` });
