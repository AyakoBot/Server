import type { Handle } from '@sveltejs/kit';
import { error } from '@sveltejs/kit';
import fs from 'fs';
import mime from 'mime';

const handle: Handle = ({ event }) => {
	const path = `/app/Ayako/packages/CDN/${event.url.pathname}`;

	try {
		return new Response(fs.readFileSync(path), {
			status: 200,
			headers: [
				['Content-Type', mime.getType(path) || ''],
				['Cache-Control', `pulic, max-age=${path.includes('antivirus') ? 1 : 604800}`],
			],
		});
	} catch (e) {
		console.log(e);
		return error(404);
	}
};

export default handle;
