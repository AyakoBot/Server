import type { Handle } from '@sveltejs/kit';
import { error } from '@sveltejs/kit';
import fs from 'fs';
import mime from 'mime';
import { resolve, sep } from 'path';

const root = '/app/Ayako/packages/CDN';

const resolveAsset = (pathname: string): string | null => {
	try {
		const target = resolve(root, `.${decodeURIComponent(pathname)}`);
		return target.startsWith(`${root}${sep}`) ? target : null;
	} catch {
		return null;
	}
};

const handle: Handle = ({ event }) => {
	const path = resolveAsset(event.url.pathname);
	if (!path) return error(404);

	try {
		return new Response(fs.readFileSync(path), {
			status: 200,
			headers: [
				['Content-Type', mime.getType(path) || ''],
				['Cache-Control', `pulic, max-age=${path.includes('antivirus') ? 1 : 604800}`],
				['Strict-Transport-Security', 'max-age=31536000; includeSubDomains; preload'],
			],
		});
	} catch (e) {
		console.log(e);
		return error(404);
	}
};

export default handle;
