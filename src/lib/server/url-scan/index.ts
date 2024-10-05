import {
	avWebhookId,
	avWebhookToken,
	kasperskyToken,
	npm_package_version,
	phishToken,
	promptAPIToken,
	safeBrowsingToken,
	spamhausToken,
	VTToken,
} from '$env/static/private';
import DataBase from '$lib/server/database.js';
import getPathFromError from '$lib/scripts/util/getPathFromError.js';
import * as VirusVendorsTypings from '$lib/typings/url-scan.js';
import fs from 'fs';
import * as Jobs from 'node-schedule';
import dns from 'dns/promises';

import fishFish from './fishFish';
import sinkingYachts from './sinkingYachts';
import API from '$lib/server/api.js';

const basePath = `${process.cwd()}/../CDN/antivirus`;
const paths = {
	badLinks: `${basePath}/badLinks.txt`,
	allowlisted: `${basePath}/allowlisted.txt`,
	allowlistedCDN: `${basePath}/allowlistedCDN.txt`,
	denylisted: `${basePath}/denylisted.txt`,
};

type VendorType =
	| 'Kaspersky'
	| 'Google Safe Browsing'
	| 'PromptAPI'
	| 'VirusTotal'
	| 'NordVPN'
	| 'Yandex Safe Browsing';

const highlyCredibleVTVendors = [
	'Yandex Safebrowsing',
	'Google Safebrowsing',
	'Kaspersky',
	'BitDefender',
];

const self = {
	get: (path: keyof typeof paths) => fs.readFileSync(paths[path], 'utf8'),
	has: (path: keyof typeof paths, url: string) =>
		self
			.get(path)
			.split(/\n+/g)
			.map((r) => r.replace(/\r+/g, ''))
			.includes(url),
	append: (path: keyof typeof paths, url: string) =>
		self.get(path).endsWith('\n')
			? fs.appendFileSync(paths[path], url + '\n')
			: fs.appendFileSync(paths[path], '\n' + url + '\n'),
	delete: (path: keyof typeof paths, url: string) =>
		fs.writeFileSync(paths[path], self.get(path).replace(url, '').replace(/\n+/g, '\n')),
};

export default self;

export const scanningQueue = new Set<string>();

export const cleanURL = (s: string) =>
	s.replace('https://', '').replace('http://', '').replace('www.', '').split(/\/+/g)[0];

export const scanURL = async (url: string) => {
	if (scanningQueue.has(url)) return;
	scanningQueue.add(url);

	const done = () => {
		scanningQueue.delete(url);
		DataBase.urlScans.updateMany({ where: { url: cleanURL(url) }, data: { done: true } }).then();
	};

	const result = await getTriggersAV(url);
	console.log(result);

	if (result.triggers === null) {
		if (self.has('badLinks', url)) self.delete('badLinks', url);
		if (self.has('allowlisted', url)) self.delete('allowlisted', url);
		return done();
	}

	if (!result.triggers) {
		if (self.has('badLinks', url)) self.delete('badLinks', url);
		if (!self.has('allowlisted', url)) self.append('allowlisted', url);
		return done();
	}

	reportFishFish(url);

	if (self.has('allowlistedCDN', url)) return done();

	if (!self.has('badLinks', url)) self.append('badLinks', url);
	if (self.has('allowlisted', url)) self.delete('allowlisted', url);

	return done();
};

// https://api.fishfish.gg/v1/docs
const inFishFish = (u: string) => fishFish.cache.has(cleanURL(u));

const inKaspersky = async (u: string) => {
	const res = await fetch(
		`https://opentip.kaspersky.com/api/v1/search/domain?request=${cleanURL(u)}`,
		{ headers: { 'x-api-key': kasperskyToken ?? '' } },
	).catch((e: Error) => e);

	if (!('ok' in res) || !res.ok) return { triggered: false };

	const json = (await res.json()) as VirusVendorsTypings.Kaspersky;
	if (json.Zone === 'Red') return { triggered: true, type: 'Kaspersky', result: json };

	return { triggered: false, type: 'Kaspersky', result: json };
};

const checkIfExists = async (url: string) =>
	!!(await dns.lookup(url, { all: true }).catch(() => [])).length;

// https://phish.sinking.yachts/
const inSinkingYachts = (u: string) => sinkingYachts.cache.has(u);

const inSpamHaus = async (u: string) => {
	const res = await fetch(`https://apibl.spamhaus.net/lookup/v1/dbl/${cleanURL(u)}`, {
		headers: {
			Authorization: `Bearer ${spamhausToken}`,
			'Content-Type': 'application/json',
		},
	}).catch((r: Error) => {
		// eslint-disable-next-line no-console
		console.error('Failed to query Spamhaus for', cleanURL(u));
		return r;
	});

	return 'status' in res && res.status === 200;
};

const ageCheck = async (u: string) => {
	const res = await fetch(`https://api.promptapi.com/whois/query?domain=${cleanURL(u)}`, {
		headers: { apikey: promptAPIToken ?? '' },
	}).catch((r: Error) => r);

	if (!('ok' in res) || !res.ok) return { triggers: false };

	const json = (await res.json()) as VirusVendorsTypings.PromptAPI;
	if (json.result === 'not found') return { triggers: false, type: 'PromptAPI' };

	const ageInDays = Math.ceil(
		Math.abs(new Date(json.result.creation_date).getTime() + new Date().getTime()) /
			(1000 * 3600 * 24),
	);

	return { triggers: ageInDays < 8, type: 'PromptAPI', result: json };
};

const inVT = async (u: string) => {
	const body = new FormData();
	body.set('url', u);

	const res = await fetch('https://www.virustotal.com/api/v3/urls', {
		method: 'POST',
		headers: { 'x-apikey': VTToken ?? '' },
		body,
	}).catch((r: Error) => r);

	if (!('ok' in res) || !res.ok) return { triggers: false };

	const urlsData = (await res.json()) as VirusVendorsTypings.VirusTotalURLs;
	const analysesData = await getAnalyses(urlsData.data.id);
	if (typeof analysesData === 'string') return { triggers: false };

	return getSeverity(analysesData)
		? { triggers: true, result: analysesData, type: 'VirusTotal' }
		: { triggers: false };
};

const getAnalyses = async (
	id: string,
	i = 1,
): Promise<false | string | VirusVendorsTypings.VirusTotalAnalyses> => {
	if (i > 5) throw new Error('Too many requests');

	return new Promise((resolve) => {
		Jobs.scheduleJob(getPathFromError(new Error()), new Date(Date.now() + 10000 * i), async () => {
			const res = await fetch(`https://www.virustotal.com/api/v3/analyses/${id}`, {
				headers: {
					'x-apikey': VTToken ?? '',
				},
			}).catch((r: Error) => r);

			if (!('ok' in res)) return resolve(await getAnalyses(id, i + 1));
			if (!res.ok) return resolve((await res.text()) as string);

			const data = (await res.json()) as VirusVendorsTypings.VirusTotalAnalyses;
			if (typeof data === 'string') return resolve(false);

			if (data.data.attributes.status === 'completed') return resolve(data);
			return resolve(await getAnalyses(id, i + 1));
		});
	});
};

const getSeverity = (result: VirusVendorsTypings.VirusTotalAnalyses | false) => {
	if (!result) return false;

	if (
		Object.entries(result.data.attributes.results).find(
			([, v]) =>
				['malicious', 'suspicious'].includes(v.category) &&
				highlyCredibleVTVendors.includes(v.engine_name),
		)
	) {
		console.log(JSON.stringify(result.data.attributes.results, null, 2));
		return true;
	}

	return result.data.attributes.stats.malicious + result.data.attributes.stats.suspicious > 5;
};

const inGoogleSafeBrowsing = async (u: string) => {
	const res = await fetch(
		`https://safebrowsing.googleapis.com/v4/threatMatches:find?key=${safeBrowsingToken ?? ''}`,
		{
			method: 'POST',
			body: JSON.stringify({
				client: {
					clientId: 'Ayako Development',
					clientVersion: npm_package_version,
				},
				threatInfo: {
					threatTypes: [
						'MALWARE',
						'SOCIAL_ENGINEERING',
						'UNWANTED_SOFTWARE',
						'POTENTIALLY_HARMFUL_APPLICATION',
					],
					platformTypes: ['ALL_PLATFORMS'],
					threatEntryTypes: ['URL'],
					threatEntries: [{ url: u }],
				},
			}),
		},
	).catch((e: Error) => e);

	if (!('ok' in res) || !res.ok) return { triggers: false, type: 'Google Safe Browsing' };

	const json = (await res.json()) as VirusVendorsTypings.GoogleSafeBrowsing;
	if (json.matches?.length) return { triggers: true, type: 'Google Safe Browsing', result: json };

	return { triggers: false, type: 'Google Safe Browsing' };
};

const reportFishFish = (u: string) => {
	fetch('https://yuri.bots.lostluma.dev/phish/report', {
		method: 'POST',
		headers: {
			authorization: phishToken ?? '',
		},
		body: JSON.stringify({
			url: u,
			reason:
				'Reported by at least one of the following Vendors: Google Safe Browsing, SpamHaus, VirusTotal, Sinking Yachts, PromptAPI, FishFish',
		}),
	}).catch(() => {});
};

const getTriggersAV = async (
	url: string,
): Promise<{
	url: string;
	type?: VendorType;
	result?:
		| VirusVendorsTypings.Kaspersky
		| VirusVendorsTypings.GoogleSafeBrowsing
		| VirusVendorsTypings.PromptAPI
		| VirusVendorsTypings.VirusTotalAnalyses;
	triggers: boolean | null;
}> => {
	const websiteResponse = await checkIfExists(url);
	if (!websiteResponse) return { url, triggers: null };

	if (inFishFish(url)) return { url, triggers: true };
	if (inSinkingYachts(url)) return { url, triggers: true };
	if (await inSpamHaus(url)) return { url, triggers: true };

	const kaspersky = await inKaspersky(url);
	if (kaspersky.triggered) {
		return { url, type: 'Kaspersky', result: kaspersky.result, triggers: true };
	}

	const googleSafeBrowsing = await inGoogleSafeBrowsing(url);
	if (googleSafeBrowsing.triggers) {
		return {
			...(googleSafeBrowsing as Omit<Awaited<ReturnType<typeof getTriggersAV>>, 'url'>),
			url,
		};
	}

	const yandexSafeBrowsing = await inYandexSafeBrowsing(url);
	if (yandexSafeBrowsing.triggers) {
		return {
			...(yandexSafeBrowsing as Omit<Awaited<ReturnType<typeof getTriggersAV>>, 'url'>),
			url,
		};
	}

	const nordVPN = await inNordVPN(url);
	if (nordVPN.triggers) {
		return {
			...(nordVPN as Omit<Awaited<ReturnType<typeof getTriggersAV>>, 'url'>),
			url,
		};
	}

	const promptAPI = await ageCheck(url);
	if (promptAPI.triggers) {
		return { url, triggers: true, result: promptAPI.result, type: 'PromptAPI' };
	}

	const virusTotal = await inVT(url);
	if (virusTotal.triggers && virusTotal.result !== false && typeof virusTotal.result !== 'string') {
		return { url, triggers: true, result: virusTotal.result, type: 'VirusTotal' };
	}

	return { triggers: false, url };
};

const inYandexSafeBrowsing = async (u: string) => {
	const res = await fetch(
		`https://sba.yandex.net/v4/threatMatches:find?key=${inYandexSafeBrowsing ?? ''}`,
		{
			method: 'POST',
			body: JSON.stringify({
				client: {
					clientId: 'Ayako Development',
					clientVersion: npm_package_version,
				},
				threatInfo: {
					threatTypes: [
						'THREAT_TYPE_UNSPECIFIED',
						'MALWARE',
						'SOCIAL_ENGINEERING',
						'UNWANTED_SOFTWARE',
						'POTENTIALLY_HARMFUL_APPLICATION',
					],
					platformTypes: ['ALL_PLATFORMS'],
					threatEntryTypes: ['URL'],
					threatEntries: [{ url: u }],
				},
			}),
		},
	).catch((e: Error) => e);

	if (!('ok' in res) || !res.ok) return { triggers: false, type: 'Yandex Safe Browsing' };

	const json = (await res.json()) as VirusVendorsTypings.YandexSafeBrowsing;
	if (json.matches?.length) return { triggers: true, type: 'Yandex Safe Browsing', result: json };

	return { triggers: false, type: 'Yandex Safe Browsing' };
};

const inNordVPN = async (u: string) => {
	const res = await fetch(`https://link-checker.nordvpn.com/v1/public-url-checker/check-url`, {
		method: 'POST',
		body: JSON.stringify({ url: u }),
	});

	if (!('ok' in res) || !res.ok) return { triggers: false, type: 'NordVPN' };

	const json = (await res.json()) as VirusVendorsTypings.NordVPN;

	switch (json.category) {
		case VirusVendorsTypings.NordVPNCategories.Suspicious:
		case VirusVendorsTypings.NordVPNCategories.Clean:
			return { triggers: false, type: 'NordVPN' };
		case VirusVendorsTypings.NordVPNCategories.Malicious:
		case VirusVendorsTypings.NordVPNCategories.Phishing:
			return { triggers: true, type: 'NordVPN', result: json };
		default: {
			sendNotification({ content: `${u} @ ${json.category}` });
			return { triggers: false, type: 'NordVPN' };
		}
	}
};

const sendNotification = (payload: { content: string }) => {
	API.getAPI()
		.webhooks.execute(avWebhookId, avWebhookToken, payload)
		.catch(() => {});
};
