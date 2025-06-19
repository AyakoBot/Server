import { userActionWebhookId, userActionWebhookToken } from '$env/static/private';
import { PUBLIC_KEY } from '$env/static/public';
import { error } from '@sveltejs/kit';
import {
	ApplicationIntegrationType,
	ApplicationWebhookEventType,
	ComponentType,
	MessageFlags,
	type APIInteraction,
	type APIWebhookEvent,
	type APIWebhookEventApplicationAuthorizedData,
	type APIWebhookEventBody,
	type APIWebhookEventEventBase,
} from 'discord-api-types/v10';
import nacl from 'tweetnacl';
import type { RequestHandler } from './$types';
import api from '$lib/server/api.js';

export const POST: RequestHandler = async (req) => {
	const signature = req.request.headers.get('X-Signature-Ed25519');
	if (!signature) return error(401, 'Unauthorized');

	const timestamp = req.request.headers.get('X-Signature-Timestamp');
	if (!timestamp) return error(401, 'Unauthorized');

	const rawBody = await req.request.text().catch(() => '{}');
	const body = JSON.parse(rawBody) as APIWebhookEvent;
	if (!body || !('application_id' in body) || !('event' in body)) return error(401, 'Unauthorized');

	const isVerified = nacl.sign.detached.verify(
		Buffer.from(timestamp + rawBody),
		Buffer.from(signature, 'hex'),
		Buffer.from(PUBLIC_KEY, 'hex'),
	);

	if (!isVerified) return error(401, 'Invalid signature');

	console.log(body);

	switch (body.event.type) {
		case ApplicationWebhookEventType.ApplicationAuthorized: {
			if (body.event.data.integration_type === ApplicationIntegrationType.GuildInstall) {
				guildInstall(body.event);
			} else userInstall(body.event);

			break;
		}
		default:
			break;
	}

	return new Response(undefined, { status: 204 });
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
