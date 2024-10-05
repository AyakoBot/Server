import getPathFromError from '$lib/scripts/util/getPathFromError.js';
import * as Jobs from 'node-schedule';

/**
 * Interface for the PhishingArmy cache module.
 */
export interface PhishingArmy {
	/**
	 * The refresh job for the cache.
	 */
	refreshJob: Jobs.Job | null;

	/**
	 * Starts the cache module.
	 */
	start: () => Promise<void>;

	/**
	 * Returns an array of cached URLs.
	 * @returns An array of cached URLs.
	 */
	toArray: () => string[];

	/**
	 * The cache set.
	 */
	cache: Set<string>;
}

const self: PhishingArmy = {
	refreshJob: null,
	start: async () => {
		const res = await fetch('https://phishing.army/download/phishing_army_blocklist_extended.txt', {
			headers: {
				'X-Identity': `ayakobot.com @ animekos.com`,
				Authorization: `ayakobot.com @ animekos.com`,
				ClientId: `ayakobot.com @ animekos.com`,
			},
		});

		if (!res.ok) throw new Error('Failed to fetch PhishingArmy List');

		self.refreshJob = Jobs.scheduleJob(
			getPathFromError(new Error()),
			new Date(Date.now() + 3600000),
			() => {
				self.start();
			},
		);

		self.cache = new Set();
		const data = (await res.text()).split(/\n+/g).filter((l) => !l.startsWith('#'));
		data.forEach((d) => self.cache.add(d));
	},
	toArray: () => [...self.cache],
	cache: new Set(),
};

export default self;
