import { DATABASE_URL } from '$env/static/private';
import { Prisma, PrismaClient } from '@prisma/client';

const prisma = new PrismaClient({ datasources: { db: { url: DATABASE_URL } } });

prisma.$use(async (params, next) => {
	try {
		const result = await next(params);
		return result;
	} catch (error) {
		if (error instanceof Prisma.PrismaClientKnownRequestError) return null;
		throw error;
	}
});

export default prisma;

process.on('SIGINT', async () => {
	return prisma.$disconnect();
});
