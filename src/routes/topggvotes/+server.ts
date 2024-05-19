import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

export const POST: RequestHandler = async (req) => {
	console.log('Vote on old URL', await req.request.text());

	return json({ success: true });
};
