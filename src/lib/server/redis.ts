import Redis from 'ioredis';
import { dev } from '$env/static/private';

const client = new Redis({ host: dev ? '127.0.0.1' : 'redis' });

export default client;
