import { METRICS_TOKEN, redis } from '$env/static/private';
import Redis from '$lib/server/redis.js';
import { error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async (req) => {
	const auth = req.request.headers.get('authorization');
 console.log('hi', auth);
	if (!auth) return error(401);
	if (auth.replace('Bearer ', '') !== METRICS_TOKEN) return error(403);

	return new Response(mergeMetrics(Object.values(await getAll())), {
		headers: { 'Content-Type': 'text/plain; version=0.0.4; charset=utf-8' },
	});
};

const getAll = async () => {
	const keys = ['metrics:Ayako - Manager', 'metrics:api'];
	const res = await Promise.all(keys.map((k) => Redis.get(k)));

	const finished: { [key: string]: string } = {};
	res.map((r, i) => (finished[keys[i]] = r ?? ''));

	return finished;
};

const mergeMetrics = (metricStrings: string[]) => {
	const metrics: Record<string, { help: string; type: string | null; values: string[] }> = {};

	metricStrings.forEach((str) => {
		const lines = str.split('\n');

		let currentLine = 0;

		while (currentLine < lines.length) {
			const metricNameMatch = lines[currentLine].match(/# HELP (\S+)/);
			if (!metricNameMatch) {
				currentLine += 1;
				continue;
			}

			const metricName = metricNameMatch[1];
			if (!metrics[metricName]) {
				metrics[metricName] = {
					help: lines[currentLine],
					type: null,
					values: [],
				};
			}

			if (currentLine < lines.length && lines[currentLine + 1].startsWith('# TYPE')) {
				metrics[metricName].type = lines[currentLine + 1];
				currentLine += 2;
			}

			while (currentLine < lines.length) {
				const line = lines[currentLine];
				if (line.startsWith('#')) {
					break;
				}
				metrics[metricName].values.push(line);
				currentLine++;
			}
		}
	});

	return Object.values(metrics)
		.map((metric) => {
			return [metric.help, metric.type, ...metric.values].join('\n').replace(/\n\n+/g, '\n');
		})
		.join('\n');
};
