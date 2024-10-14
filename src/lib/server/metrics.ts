import { Counter, Registry } from 'prom-client';
import redis from './redis.js';
import { scheduleJob } from 'node-schedule';

const registry = new Registry();

const apiCalls = new Counter({
	name: 'ayako_api_calls',
	help: 'Number of API calls made',
	labelNames: ['method', 'apiVersion', 'path'],
});

const cdnCalls = new Counter({
	name: 'ayako_cdn_calls',
	help: 'Number of CDN calls made',
	labelNames: ['folder'],
});

const responses = new Counter({
	name: 'ayako_api_responses',
	help: 'Type of responses',
	labelNames: ['status', 'path'],
});

registry.registerMetric(apiCalls);
registry.registerMetric(cdnCalls);
registry.registerMetric(responses);

export default {
	apiCall: (
		method: 'GET' | 'PUT' | 'PATCH' | 'DELETE' | 'POST' | 'HEAD' | 'OPTIONS',
		apiVersion: '-' | 'v1',
		path: string,
	) => apiCalls.labels(method, apiVersion, path).inc(),
	cdnCall: (folder: string) => cdnCalls.labels(folder).inc(),
	response: (status: string, path: string) => responses.labels(status, path).inc(),
};

scheduleJob('metrics', '*/5 * * * * *', async () => {
	redis.set(`metrics:api`, await registry.metrics());
});
