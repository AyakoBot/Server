import { z } from 'zod';

/**
 * Converts a ZodError into a readable string format.
 *
 * @param error - The ZodError object containing validation issues.
 * @returns A string that concatenates all error messages, separated by ' & '.
 */
export default (error: z.ZodError) => error.issues.map((i) => `${i.message}`).join(' & ');
