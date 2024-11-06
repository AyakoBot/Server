import { redis } from '$env/static/private';
import Redis from 'ioredis';

const client = new Redis({ host: redis });

export default client;
