import { GITHUB_ID, GITHUB_PUBKEY, GITHUB_TOKEN } from '$env/static/private';
import type { APIApplicationCommandInteractionDataStringOption } from '@discordjs/core';
import { Octokit } from '@octokit/rest';
import { error, json } from '@sveltejs/kit';
import {
	InteractionType,
	type APIApplicationCommandAutocompleteInteraction,
	type APIApplicationCommandInteraction,
	type APIApplicationCommandInteractionDataOption,
	type APIApplicationCommandOptionChoice,
	type APIInteraction,
} from 'discord-api-types/v10';
import nacl from 'tweetnacl';
import type { RequestHandler } from './$types';

const octokit = new Octokit({ auth: GITHUB_TOKEN });

export const POST: RequestHandler = async (req) => {
	const signature = req.request.headers.get('X-Signature-Ed25519');
	if (!signature) return error(401, 'Unauthorized');

	const timestamp = req.request.headers.get('X-Signature-Timestamp');
	if (!timestamp) return error(401, 'Unauthorized');

	const rawBody = await req.request.text().catch(() => '{}');
	const body = JSON.parse(rawBody) as APIInteraction;
	if (!body || !('application_id' in body)) return error(401, 'Unauthorized');
	if (body.application_id !== GITHUB_ID) return error(401, 'Unauthorized');

	const isVerified = nacl.sign.detached.verify(
		Buffer.from(timestamp + rawBody),
		Buffer.from(signature, 'hex'),
		Buffer.from(GITHUB_PUBKEY, 'hex'),
	);

	if (!isVerified) return error(401, 'Invalid signature');
	if (body.type === InteractionType.Ping) return json({ type: 1 });

	switch (body.type) {
		case InteractionType.ApplicationCommandAutocomplete:
			return autocomplete(body);
		case InteractionType.ApplicationCommand:
			return command(body);
		default:
			return error(406, 'Unhandled interaction type');
	}
};

const autocomplete = (body: APIApplicationCommandAutocompleteInteraction) => {
	// too lazy to do it properly, and not for public use anyways
	const commandOpts = (
		(body.data.options[0] as unknown as typeof body.data).options[0] as unknown as typeof body.data
	).options as APIApplicationCommandInteractionDataOption[];

	const repo = (
		commandOpts.find((o) => o.name === 'repo') as APIApplicationCommandInteractionDataStringOption
	)?.value as 'Ayako-v2' | 'Ayako' | 'Website' | 'Server';

	const curval = [
		...new Set(
			(
				commandOpts.find((o) => o.name === 'labels') as APIApplicationCommandInteractionDataStringOption
			)?.value.split(/,\s*/g),
		),
	].map((v) => v.trim());

	const joinLabels = (c: APIApplicationCommandOptionChoice[]) =>
		c
			.map((c) => ({ ...c, value: String(c.value).trim() }))
			.filter((v) => !curval.at(-1)?.includes(String(v.value)) || curval.at(-1) === v.value)
			.map((v) => ({
				name: (curval.slice(0, -1).join(', ') + ', ' + v.name).replace(/^,\s*/gm, ''),
				value: (curval.slice(0, -1).join(', ') + ', ' + v.value).replace(/^,\s*/gm, ''),
			}))
			.filter((v) => v.value === [...new Set(v.value.split(/,\s*/g))].join(', '));

	return json({
		type: 8,
		data: {
			choices: joinLabels([
				{ name: 'enhancement', value: 'enhancement' },
				{ name: 'bug', value: 'bug' },
				{ name: '[Prio] Med', value: '[Prio] Med' },
				{ name: '[Prio] High', value: '[Prio] High' },
				{ name: '[Prio] Low', value: '[Prio] Low' },
			]),
		},
	});
};

const command = async (body: APIApplicationCommandInteraction) => {
	if (body?.user?.id !== '318453143476371456' && body?.member?.user?.id !== '318453143476371456') {
		return json({
			type: 4,
			data: { content: "Woah, who're you? This Command is not made for you :c ... Sorry!!" },
		});
	}

	// too lazy to do it properly, and not for public use anyways
	const commandOpts = (
		(
			(body.data as unknown as { options: APIApplicationCommandInteractionDataOption[] })
				.options[0] as unknown as { options: APIApplicationCommandInteractionDataOption[] }
		).options[0] as unknown as { options: APIApplicationCommandInteractionDataOption[] }
	).options as APIApplicationCommandInteractionDataStringOption[];

	const res = await octokit.issues.create({
		owner: 'AyakoBot',
		repo: commandOpts.find((o) => o.name === 'repo')?.value || '',
		title: commandOpts.find((o) => o.name === 'title')?.value || '',
		assignee: 'Larsundso',
		labels: commandOpts.find((o) => o.name === 'labels')?.value.split(/,\s*/g),
		body: commandOpts.find((o) => o.name === 'desc')?.value ?? undefined,
		project: 1,
	});

	const projectId = 'PVT_kwDOB8Blfc4ATIz5';
	const source = 'https://api.github.com/graphql';
	const nodeId = res.data.node_id;
	const query = `
 mutation AddIssueToProject($projectId: ID!, $contentId: ID!) {
     addProjectV2ItemById(input: {
       contentId: $contentId
       projectId: $projectId
     }) {
       item {
         id
       }
     }
   }
`;
	const auth = `Bearer ${GITHUB_TOKEN}`;

	const addResponse = await fetch(source, {
		method: 'POST',
		headers: {
			'Content-Type': 'application/json',
			Authorization: auth,
		},
		body: JSON.stringify({
			query,
			variables: { projectId, contentId: nodeId },
		}),
	});

	const t = await addResponse.text();

	if (!t.includes("errors")) {
		return json({
			type: 4,
			data: {
				content: `Issue created: [${res.data.title}](<${res.data.html_url}>)`,
			},
		});
	}

	return json({
		type: 4,
		data: {
			content: `Issue created: <${res.data.html_url}>\n\nFailed to add issue to project.\n${addResponse.status} ${addResponse.statusText}\n${t}`,
		},
	});
};
