import { BOT_TOKEN, nirn } from '$env/static/private';
import { API } from '@discordjs/core';
import { REST } from '@discordjs/rest';

let api: API | null = null;

const self = {
	getAPI: () => {
		if (api) return api;

		api = new API(
			new REST({ authPrefix: 'Bot', api: `https://${nirn}/api` }).setToken(BOT_TOKEN),
		);
		return api;
	},
	userAPIs: new Map<string, (typeof API)['prototype']>(),
	makeAPI: (token: string) => {
		const existing = self.userAPIs.get(token);
		if (existing) return existing;

		const api = new API(
			new REST({ authPrefix: 'Bearer', api: `https://${nirn}/api` }).setToken(token),
		);

		self.userAPIs.set(token, api);
		return api;
	},
};

export default self;
