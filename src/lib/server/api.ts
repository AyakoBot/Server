import { BOT_TOKEN } from '$env/static/private';
import Core from '@discordjs/core';
import Rest from '@discordjs/rest';

const self = {
	API: new Core.API(
		new Rest.REST({ authPrefix: 'Bot', api: 'http://127.0.0.1:8080/api' }).setToken(BOT_TOKEN),
	),
	userAPIs: new Map<string, (typeof Core.API)['prototype']>(),
	makeAPI: (token: string) => {
		const rest = new Rest.REST({ authPrefix: 'Bearer', api: 'http://127.0.0.1:8080/api' });
		const api = new Core.API(rest.setToken(token));

		self.userAPIs.set(token, api);
  return api;
	},
};

export default self;
