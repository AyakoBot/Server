import { error, json } from '@sveltejs/kit';
import {
	ButtonStyle,
	ComponentType,
	InteractionType,
	MessageFlags,
	type APIInteraction,
	type RESTPostAPIChannelMessageJSONBody,
} from 'discord-api-types/v10';
import nacl from 'tweetnacl';
import type { RequestHandler } from './$types';

export const POST: RequestHandler = async (req) => {
	const signature = req.request.headers.get('X-Signature-Ed25519');
	if (!signature) return error(401, 'Unauthorized');

	const timestamp = req.request.headers.get('X-Signature-Timestamp');
	if (!timestamp) return error(401, 'Unauthorized');

	const rawBody = await req.request.text().catch(() => '{}');
	const body = JSON.parse(rawBody) as APIInteraction;
	if (!body || !('application_id' in body)) return error(401, 'Unauthorized');

	const isVerified = nacl.sign.detached.verify(
		Buffer.from(timestamp + rawBody),
		Buffer.from(signature, 'hex'),
		Buffer.from('44385ecb3504ae51a9b101bafe798b47b85ed5a8f5d838cdf45a39a3c1d50dd7', 'hex'),
	);

	if (!isVerified) return error(401, 'Invalid signature');
	if (body.type === InteractionType.Ping) return json({ type: 1 });

	switch (body.type) {
		case InteractionType.ApplicationCommand:
			return json({
				type: 4,
				data: {
					flags: MessageFlags.Ephemeral,
					components: [
						{
							type: ComponentType.ActionRow,
							components: [
								{
									type: ComponentType.Button,
									style: ButtonStyle.Link,
									url: `https://support.ayakobot.com`,
									label: 'Support Server',
									emoji: { name: 'AMayakoLove', id: '874102206176034826', animated: false },
								},
								{
									type: ComponentType.Button,
									style: ButtonStyle.Link,
									url: `https://invite.ayakobot.com`,
									label: 'Invite Ayako',
									emoji: { name: 'AMayakoLove', id: '792822369563181067', animated: false },
								},
							],
						},
					],
					embeds: [
						{
							description: 'Kori has been discontinued!',
							color: 0xb0ff00,
							fields: [
								{
									name: 'Why?',
									value: 'The dev team has abandoned the Project.',
								},
								{
									name: 'What now?',
									value: `Kori has been given to the Developer of [Ayako](https://discord.com/application-directory/650691698409734151)
A multi-purpose Discord Bot with focus on Moderation and Automation
__She has a Giveaway-Command__ (\`/giveaway create\`) with Auto-Payout and simple Requirements Support

Sadly I, as Dev of Ayako, don't exactly know what Features Kori supported. So I need your help to make Ayako as good as Kori was.
Please join our Support Server and tell me what you liked about Kori and what you want to see in Ayako via the Support or Suggestions-Channel`,
								},
							],
						},
					],
				} as RESTPostAPIChannelMessageJSONBody,
			});

		default:
			return new Response(undefined, { status: 204 });
	}
};
