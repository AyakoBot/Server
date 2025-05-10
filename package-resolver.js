// Custom resolver for problematic packages
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';
import fs from 'node:fs';

// This plugin helps properly handle the import of problematic packages
export function packageResolver() {
	const require = createRequire(import.meta.url);

	return {
		name: 'package-resolver',
		resolveId(id) {
			if (id === '@discordjs/rest' || id === 'cookie') {
				// Return the path to the main entry point
				return require.resolve(id);
			}
			return null;
		},
		load(id) {
			// Handle discord.js rest package
			if (id.includes('@discordjs/rest')) {
				// Return a custom wrapper for the module that exports the named exports
				return `
          import * as mod from '${id}';
          export const REST = mod.REST;
          export const DiscordAPIError = mod.DiscordAPIError;
          export * from '${id}';
          export default mod;
        `;
			}

			// Handle cookie package
			if (id.includes('cookie')) {
				try {
					// Don't modify the content, just add a default export wrapping the named exports
					return `
            import * as cookieModule from '${id}';
            export const parse = cookieModule.parse;
            export const serialize = cookieModule.serialize;
            export default cookieModule;
          `;
				} catch (error) {
					console.error('Error processing cookie module:', error);
					return null;
				}
			}

			return null;
		},
	};
}
