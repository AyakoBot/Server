import { Decimal } from '@prisma/client/runtime/library';

const prismaToPrimitive = <T extends Record<string, any>>(data: T): T => {
	const transformed = { ...data };

	for (const [key, value] of Object.entries(transformed)) {
		switch (true) {
			case value instanceof Decimal:
				(transformed as any)[key] = value.toNumber();
				break;
			case value instanceof Date:
				(transformed as any)[key] = value.getTime();
				break;
			case typeof value === 'bigint':
				(transformed as any)[key] = Number(value);
				break;
			case Array.isArray(value):
				(transformed as any)[key] = value.map((item) =>
					typeof item === 'object' && item !== null ? prismaToPrimitive(item) : item,
				);
				break;
			case value && typeof value === 'object' && 's' in value && 'e' in value && 'd' in value:
				(transformed as any)[key] = new Decimal(value).toNumber();
				break;
			case typeof value === 'object' && value !== null:
				(transformed as any)[key] = prismaToPrimitive(value);
				break;
		}
	}

	return transformed;
};

export default prismaToPrimitive;
