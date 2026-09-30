import { userActionWebhookId, userActionWebhookToken } from '$env/static/private';
import {
	PUBLIC_KEY,
	PUBLIC_INFO_PUBLIC_KEY,
	PUBLIC_INFO_APP_ID,
	PUBLIC_INFO_THREAD_ID,
} from '$env/static/public';
import api from '$lib/server/api.js';
import { error } from '@sveltejs/kit';
import {
	ApplicationIntegrationType,
	ApplicationWebhookEventType,
	ApplicationWebhookType,
	type APIUser,
	type APIWebhookEvent,
	type APIWebhookEventApplicationAuthorizedData,
	type APIWebhookEventBody,
	type APIWebhookEventEventBase,
} from 'discord-api-types/v10';
import nacl from 'tweetnacl';
import type { RequestHandler } from './$types';

const publicKeyFor = (applicationId: string) =>
	applicationId === PUBLIC_INFO_APP_ID ? PUBLIC_INFO_PUBLIC_KEY : PUBLIC_KEY;

export const POST: RequestHandler = async (req) => {
	const signature = req.request.headers.get('X-Signature-Ed25519');
	if (!signature) return error(401, 'Unauthorized');

	const timestamp = req.request.headers.get('X-Signature-Timestamp');
	if (!timestamp) return error(401, 'Unauthorized');

	const rawBody = await req.request.text().catch(() => '{}');
	const body = JSON.parse(rawBody) as APIWebhookEvent;
	if (!body || !('application_id' in body)) return error(401, 'Unauthorized');

	const isVerified = nacl.sign.detached.verify(
		Buffer.from(timestamp + rawBody),
		Buffer.from(signature, 'hex'),
		Buffer.from(publicKeyFor(body.application_id), 'hex'),
	);

	if (!isVerified) return error(401, 'Invalid signature');
	if (body.type === ApplicationWebhookType.Ping) return new Response(undefined, { status: 204 });

	console.log(body);

	if (body.application_id === PUBLIC_INFO_APP_ID) infoEvent(body.event);
	else mainEvent(body.event);

	return new Response(undefined, { status: 204 });
};

const mainEvent = (event: APIWebhookEventBody) => {
	switch (event.type) {
		case ApplicationWebhookEventType.ApplicationAuthorized: {
			if (event.data.integration_type === ApplicationIntegrationType.GuildInstall) {
				guildInstall(event);
			} else userInstall(event);

			break;
		}
		default:
			break;
	}
};

const infoEvent = (event: APIWebhookEventBody) => {
	switch (event.type) {
		case ApplicationWebhookEventType.ApplicationAuthorized:
			if (event.data.integration_type !== ApplicationIntegrationType.UserInstall) return;
			infoAuthLog(event.data.user, true, event.data.scopes, event.timestamp);
			break;
		case ApplicationWebhookEventType.ApplicationDeauthorized:
			infoAuthLog(event.data.user, false, [], event.timestamp);
			break;
		default:
			break;
	}
};

const infoAuthLog = async (
	user: APIUser,
	authorized: boolean,
	scopes: string[],
	timestamp: string,
) => {
	await api
		.getAPI()
		.webhooks.execute(userActionWebhookId, userActionWebhookToken, {
			thread_id: PUBLIC_INFO_THREAD_ID,
			allowed_mentions: { parse: [] },
			embeds: [
				{
					description: `<@${PUBLIC_INFO_APP_ID}> was ${authorized ? 'authorized' : 'deauthorized'} by a user`,
					color: authorized ? 0x00ff00 : 0xff0000,
					fields: [
						{ name: 'User', value: user.username, inline: true },
						{ name: 'User ID', value: user.id, inline: true },
						...(authorized ? [{ name: 'Scopes', value: scopes.join(', ') || 'None', inline: true }] : []),
					],
					timestamp,
				},
			],
		})
		.catch((err) => console.error('[webhooks] Info auth log failed:', err));
};

const guildInstall = (
	event: APIWebhookEventEventBase<
		ApplicationWebhookEventType.ApplicationAuthorized,
		APIWebhookEventApplicationAuthorizedData
	>,
) => {};

const userInstall = async (
	event: APIWebhookEventEventBase<
		ApplicationWebhookEventType.ApplicationAuthorized,
		APIWebhookEventApplicationAuthorizedData
	>,
) => {
	await api.getAPI().webhooks.execute(userActionWebhookId, userActionWebhookToken, {
		username: 'User Action',
		avatar_url:
			'https://cdn.discordapp.com/avatars/1076105201884340297/1107c6fbef82e4e18a4b3f2796d5fdad.webp?size=4096',
		embeds: [
			{
				color: 0x00ff00,
				description: `User ${event.data.user.username}#${event.data.user.discriminator} (${event.data.user.id}) has authorized Ayako.\n-# Scopes: ${event.data.scopes.join(', ')}`,
			},
		],
	});
};
