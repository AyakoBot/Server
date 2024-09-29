import bcrypt from 'bcrypt';
import crypto from 'crypto';
import getRandom from './getRandom.js';

/**
 * Generates a URL-safe token for a given user ID.
 *
 * This function creates a random UUID, hashes it using bcrypt, encodes the user ID in base64,
 * and combines these elements into a URL-safe base64 string.
 *
 * @param userId - The user ID to be included in the token.
 * @returns A promise that resolves to a URL-safe base64 encoded token.
 */
export default async (userId: string) =>
	`${Buffer.from(userId).toString('base64')}.${(
		await bcrypt.hash(crypto.randomUUID(), getRandom(5, 10))
	)
		.split(/\$/g)
		.at(-1)}`
		.replace(/\+/g, '-')
		.replace(/\//g, '_')
		.replace(/=+$/, '');
