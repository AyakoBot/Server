import type { Handle } from '@sveltejs/kit';
import { error } from '@sveltejs/kit';
import fs from 'fs';
import { CDN } from '$env/static/private';
import mime from 'mime';

const handle: Handle = ({ event }) => {
	const path = `${CDN}${event.url.pathname}`;

	try {
		return new Response(fs.readFileSync(path), {
			status: 200,
			headers: [['Content-Type', mime.getType(path) || ''], ['Cache-Control', 'pulic, max-age=604800']],
		});
	} catch (e) {
		console.log(e);
		return error(404);
	}
};

export default handle;
