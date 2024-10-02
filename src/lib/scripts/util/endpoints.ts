import { glob } from 'glob';

export default (await glob(`${process.cwd()}/src/routes/**/+server.ts`)).map((r) =>
	r
		.replace(`${process.cwd()}/src/routes`, '')
		.replace('/+server.ts', '')
		.replace(/\[/g, ':')
		.replace(/\]/g, ''),
);
