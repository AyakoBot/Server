import crypto from 'crypto';

/**
 * Generates a URL-safe token for a given user ID.
 *
 * This function creates a random token using Node.js crypto module,
 * encodes the user ID in base64, and combines these elements 
 * into a URL-safe base64 string.
 *
 * @param userId - The user ID to be included in the token.
 * @returns A promise that resolves to a URL-safe base64 encoded token.
 */
export default async (userId: string) => {
  const randomBytes = crypto.randomBytes(32);
  const hash = crypto
    .createHash('sha256')
    .update(randomBytes)
    .update(crypto.randomUUID())
    .digest('base64');
  
  return `${Buffer.from(userId).toString('base64')}.${hash}`
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
};
