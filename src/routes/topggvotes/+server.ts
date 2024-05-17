import DataBase from '$lib/server/database.js';
import { error, json } from '@sveltejs/kit';
import { InteractionType, type APIInteraction } from 'discord-api-types/v10';
import nacl from 'tweetnacl';
import type { RequestHandler } from './$types';
import pg from '$lib/server/pg.js';

export const POST: RequestHandler = async (req) => {
	console.log('Vote on old URL', await req.request.text());

	return json({ success: true });
};
