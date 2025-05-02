import { redis } from '$env/static/private';
import Redis from 'ioredis';

const client = new Redis({ host: redis, db: 0 });
export const schedDB = new Redis({ host: redis, db: 1 });

export default client;
