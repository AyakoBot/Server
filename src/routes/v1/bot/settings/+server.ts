import type { RequestHandler } from './$types';
import settingsEditorTypes from '@ayako/bot/src/BaseClient/Other/constants/settingsEditorTypes';
import settings from '@ayako/bot/src/SlashCommands/Commands/settings';
import type { EditorTypes } from '@ayako/bot/src/Typings/Settings';
import {
	ApplicationCommandOptionType,
	type APIApplicationCommandSubcommandGroupOption,
	type APIApplicationCommandSubcommandOption,
} from 'discord-api-types/v10';
import lang from '@ayako/bot/src/Languages/en-GB.json' with { type: 'json' };
import { json } from '@sveltejs/kit';

interface Command {
	name: string;
	id: keyof EditorTypes;
	isMulti: boolean;
	category: string;
	description: string;
	explainDescription: string | undefined;
	fields: {
		id: string;
		type: EditorTypes;
		name: string;
		description: string;
	}[];
}

const getCommandFromSubCommand = (
	command: APIApplicationCommandSubcommandOption,
	category: string,
): Command | undefined => {
	const lan =
		lang.slashCommands.settings.categories[
			command.name as keyof typeof lang.slashCommands.settings.categories
		];

	if (!lan) return undefined;

	const fieldLookupKey = category && category !== 'Basic' ? category : command.name;

	return {
		name: lan?.name,
		id: command.name as keyof EditorTypes,
		explainDescription: 'desc' in lan ? lan.desc : undefined,
		isMulti: !!command.options?.find(
			(option) => option.type === ApplicationCommandOptionType.String && option.name === 'id',
		),
		category:
			lang.slashCommands.help.categories[category as keyof typeof lang.slashCommands.help.categories],
		description: command.description,
		fields: Object.entries(
			(Object.entries(settingsEditorTypes).find(
				([key]) => key.toLowerCase() === fieldLookupKey.toLowerCase(),
			)?.[1] as Record<string, EditorTypes>) || {},
		)
			.map(([fieldName, fieldType]) => ({
				...getField(fieldName, fieldType, fieldLookupKey),
				id: fieldName,
			}))
			.filter((f): f is Command['fields'][number] => !!f),
	};
};

const getField = (fieldName: string, fieldType: EditorTypes, commandName: string) => {
	const lan =
		lang.slashCommands.settings.categories[
			commandName as keyof typeof lang.slashCommands.settings.categories
		];
	const fields = Object.entries(lan?.fields || {});

	let field = fields.find(([name]) => name === fieldName)?.[1] as
		| { name: string; desc: string }
		| Object
		| undefined;

	switch (true) {
		case fieldName.startsWith('bl'):
		case fieldName.startsWith('wl'): {
			const blwlField = Object.entries(lang.slashCommands.settings.BLWL).find(
				([key]) => key.toLowerCase() === fieldName.toLowerCase(),
			)?.[1];

			return { name: blwlField, desc: '-' };
		}
		case fieldName === 'action':
			return lang.punishmentAction;
		case fieldName === 'deletemessageseconds':
			return lang.punishmentDeleteMessageSeconds;
		case fieldName === 'duration':
			return lang.punishmentDuration;
		case fieldName === 'appid':
			return undefined;
		case fieldName === 'linkedid':
		case fieldName === 'multiplier':
			return lang[fieldName];
		case fieldName === 'xpmultiplier':
			return lang.multiplier;
		case !field:
			console.log(fieldName, fieldType, commandName);
		default:
			return {
				type: fieldType,
				name: field && 'name' in field ? (field?.name as string) : '-',
				description: field && 'desc' in field ? (field?.desc as string) : '-',
			};
	}
};

const getCommandFromSubCommandGroup = (
	command: APIApplicationCommandSubcommandGroupOption,
): (Command | undefined)[] | undefined =>
	command.options?.map((subCommand) => getCommandFromSubCommand(subCommand, command.name));

export const GET: RequestHandler = (req) => {
	const commands: Command[] = settings
		.toJSON()
		.options?.map((subCommandGroupOrSubCommand) => {
			if (subCommandGroupOrSubCommand.type === ApplicationCommandOptionType.Subcommand) {
				return getCommandFromSubCommand(subCommandGroupOrSubCommand, 'Basic');
			}

			if (subCommandGroupOrSubCommand.type === ApplicationCommandOptionType.SubcommandGroup) {
				return getCommandFromSubCommandGroup(subCommandGroupOrSubCommand);
			}
		})
		.flat()
		.filter((c) => !!c) as Command[];

	return json(commands as GETResponse);
};

export type GETResponse = Command[];
