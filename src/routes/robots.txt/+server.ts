export const GET = () =>
	new Response(
		`User-agent: *
Allow: /artworks
Allow: /contributers
Allow: /features
Allow: /stats
Disallow: /stats
Disallow: /coffee
Disallow: /@me/
Disallow: /interactions
Disallow: /login
Disallow: /topggvotes
Disallow: /votes/
Disallow: /guilds/`.trim(),
		{
			headers: {
				'Content-Type': 'text/plain',
			},
		},
	);
