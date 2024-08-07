import { z } from 'zod';

export default (error: z.ZodError) => error.issues.map((i) => `${i.message}`).join(' & ');
