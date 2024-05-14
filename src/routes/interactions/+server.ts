import DataBase from '$lib/server/database.js';
import { error, json } from '@sveltejs/kit';
import { InteractionType, type APIInteraction } from 'discord-api-types/v10';
import nacl from 'tweetnacl';
import type { RequestHandler } from './$types';
import pg from '$lib/server/pg.js';

export const POST: RequestHandler = async (req) => {
	const signature = req.request.headers.get('X-Signature-Ed25519');
	if (!signature) return error(401, 'Unauthorized');

	const timestamp = req.request.headers.get('X-Signature-Timestamp');
	if (!timestamp) return error(401, 'Unauthorized');

	const rawBody = await req.request.text().catch(() => '{}');
	const body = JSON.parse(rawBody) as APIInteraction;
	if (!body || !('application_id' in body)) return error(401, 'Unauthorized');

	const settings = await DataBase.guildsettings.findFirst({
		where: { appid: body.application_id },
	});
	if (!settings || !settings.publickey) return error(401, 'Unauthorized');

	const isVerified = nacl.sign.detached.verify(
		Buffer.from(timestamp + rawBody),
		Buffer.from(signature, 'hex'),
		Buffer.from(settings.publickey, 'hex'),
	);

	if (!isVerified) return error(401, 'Invalid signature');
	if (body.type === InteractionType.Ping) return json({ type: 1 });

	pg.query(`NOTIFY interaction, '${rawBody.replace(/'/g, '\\\'')}'`);

	return json({ success: true });
};
