import Redis from 'redis';

export default await Redis.createClient().connect();
