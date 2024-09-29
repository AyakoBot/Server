/**
 * Splits an array into smaller chunks of a specified maximum length.
 *
 * @template T - The type of elements in the array.
 * @param {T[]} s - The array to be split into chunks.
 * @param {number} maxLength - The maximum length of each chunk.
 * @returns {T[][]} - A two-dimensional array where each sub-array is a chunk of the original array.
 */
export default <T>(s: T[], maxLength: number): T[][] => {
	const chunks: T[][] = [[]];
	let lastI = 0;

	while (s.length) {
		while (chunks[lastI].length < maxLength && s.length) {
			chunks[lastI].push(s.shift() as T);
		}
		chunks.push([]);
		lastI += 1;
	}

	if (!chunks.at(-1)?.length) chunks.pop();

	return chunks;
};
