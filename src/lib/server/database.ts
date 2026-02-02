import { DATABASE_URL } from '$env/static/private';
import { PrismaClient } from '@prisma/client';
import { PrismaClientKnownRequestError } from '@prisma/client/runtime/client';

const client = new PrismaClient({
	datasources: { db: { url: DATABASE_URL } },
}).$extends({
	query: {
		$allOperations: async ({ args, query }) => {
			try {
				return await query(args);
			} catch (error) {
				if (error instanceof PrismaClientKnownRequestError) return null;
				throw error;
			}
		},
	},
});

export default client;

process.on('SIGINT', async () => {
	await client.$disconnect();
	process.exit();
});
