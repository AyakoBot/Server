import { DATABASE_URL } from '$env/static/private';
import { Prisma, PrismaClient } from '@prisma/client';

const client = new PrismaClient({
	datasources: { db: { url: DATABASE_URL } },
}).$extends({
	query: {
		$allOperations: async ({ args, query }) => {
			try {
				return await query(args);
			} catch (error) {
				if (error instanceof Prisma.PrismaClientKnownRequestError) return null;
				throw error;
			}
		},
	},
});

export default client;

process.on('SIGINT', async () => {
	return client.$disconnect();
});
