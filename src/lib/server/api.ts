import { BOT_TOKEN } from '$env/static/private';
import { API } from '@discordjs/core';
import { REST } from '@discordjs/rest';

const rest = new REST({ authPrefix: 'Bot' });
rest.setToken(BOT_TOKEN);
const api = new API(rest);

const self = {
	API: api,
	userAPIs: new Map<string, (typeof API)['prototype']>(),
	makeAPI: (token: string) => {
		const rest = new REST({ authPrefix: 'Bearer' });
		const api = new API(rest.setToken(token));

		self.userAPIs.set(token, api);
		return api;
	},
};

export default self;
