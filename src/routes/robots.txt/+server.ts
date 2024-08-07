export const GET = () =>
	new Response(
		`User-agent: *
Allow: /artworks
Allow: /contributers
Allow: /features
Allow: /stats
Disallow: /v1
Disallow: /coffee
Disallow: /interactions
Disallow: /login
Disallow: /topggvotes
Disallow: /votes/`.trim(),
		{ headers: { 'Content-Type': 'text/plain' } },
	);
