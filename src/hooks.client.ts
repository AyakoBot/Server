/** @type {import('@sveltejs/kit').Reroute} */

import type { Reroute } from '@sveltejs/kit';

export const reroute: Reroute = ({ url }) => {
	console.log('req at', url.href);

	const makeNew = (newUrl: string) => `/${new URL(newUrl).href.split(/\/+/g).slice(2).join('/')}`;

	if (url.pathname.startsWith('/api/')) return makeNew(url.href.replace('/api/', '/'));
	if (url.hostname === 'wzxy.org') return makeNew(`https://wzxy.org/shorturl/${url.pathname}`);
};
