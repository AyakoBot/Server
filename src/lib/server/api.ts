import { BOT_TOKEN } from '$env/static/private';
import { API } from '@discordjs/core';
import { REST } from '@discordjs/rest';

const rest = new REST({ authPrefix: 'Bot' });

const self = {
	getAPI: () => {
  rest.setToken(BOT_TOKEN);
  return new API(rest);
 },
	userAPIs: new Map<string, (typeof API)['prototype']>(),
	makeAPI: (token: string) => {
		const existing = self.userAPIs.get(token);
		if (existing) return existing;

		const rest = new REST({ authPrefix: 'Bearer', api: 'http://nirn:8080/api' });
		const api = new API(rest.setToken(token));

		self.userAPIs.set(token, api);
		return api;
	},
};

export default self;
