import { cacheDB as envCacheDB, devCacheDB as envDevCacheDB } from '$env/static/private';
import { Cache } from '@ayako/utility';

export const prefix = 'cache';
const cacheDBnum = process.argv.includes('--dev') ? envDevCacheDB : envCacheDB;

if (!cacheDBnum || isNaN(Number(cacheDBnum))) {
	throw new Error('No cache DB number provided in env vars');
}

export default new Cache(Number(cacheDBnum), undefined, false);
