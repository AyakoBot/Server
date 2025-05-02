import type { Reminder as DBReminder, PrismaClient } from '@prisma/client';
import type { Optional } from '@prisma/client/runtime/library.js';
import db from '$lib/server/database.js';
import { schedDB } from '$lib/server/redis.js';
import ExpirableCache, {
	ExpirableCacheType,
	type ExpirableCacheOpts,
} from '@ayako/bot/src/BaseClient/UtilModules/cache/bot/ExpirableCache.js';

// Reference: @ayako/bot/src/BaseClient/UtilModules/cache/bot/Reminder.js

export class Reminder<K extends boolean = true> extends ExpirableCache<DBReminder, K> {
	constructor(opts: ExpirableCacheOpts<DBReminder, K>, init: K = true as K) {
		super(opts, ExpirableCacheType.Reminder, init, schedDB, db as PrismaClient);
	}
}
