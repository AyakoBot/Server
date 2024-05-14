import { DATABASE_URL } from '$env/static/private';
import PG from 'pg';
import str from 'pg-connection-string';

const pg = new PG.Client(str.parse(DATABASE_URL) as PG.ClientConfig);

await pg.connect();

try {
	const res = await pg.query('SELECT $1::text as message', ['DB Connection Online']);
	console.log(res.rows[0].message);
} catch (err) {
	console.error(err);
}

export default pg;

process.on('SIGINT', async () => {
	return pg.end();
});
