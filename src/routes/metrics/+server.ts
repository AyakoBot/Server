import { text, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { METRICS_SECRET } from '$env/static/private';
import Redis from '$lib/server/redis.js';

export const GET: RequestHandler = async () =>
	new Response(mergeMetrics(Object.values(await getAll())), {
		headers: { 'Content-Type': 'text/plain; version=0.0.4; charset=utf-8' },
	});

export const POST: RequestHandler = async (req) => {
	const auth = req.request.headers.get('authorization');
	if (!auth) return error(401);
	if (auth !== METRICS_SECRET) return error(403);

	const { instanceId, metrics } = (await req.request.json()) as {
		instanceId: string;
		metrics: string;
	};

	if (!instanceId) return error(400, 'Missing instanceId');
	if (!metrics) return error(400, 'Missing metrics');

	await Redis.set(`metrics:${instanceId}`, metrics);

	return new Response(undefined, { status: 204 });
};

const getAll = async () => {
	const keys = await Redis.keys('metrics:*');
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
