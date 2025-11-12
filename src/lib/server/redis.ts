import { cacheDB as envCacheDB, devCacheDB as envDevCacheDB, redis } from '$env/static/private';
import Redis from 'ioredis';

import AuditLogCache from '@ayako/gateway/src/BaseClient/Bot/CacheClasses/auditlog.js';
import AutomodCache from '@ayako/gateway/src/BaseClient/Bot/CacheClasses/automod.js';
import BanCache from '@ayako/gateway/src/BaseClient/Bot/CacheClasses/ban.js';
import ChannelCache from '@ayako/gateway/src/BaseClient/Bot/CacheClasses/channel.js';
import ChannelStatusCache from '@ayako/gateway/src/BaseClient/Bot/CacheClasses/channelStatus.js';
import CommandCache from '@ayako/gateway/src/BaseClient/Bot/CacheClasses/command.js';
import CommandPermissionCache from '@ayako/gateway/src/BaseClient/Bot/CacheClasses/commandPermission.js';
import EmojiCache from '@ayako/gateway/src/BaseClient/Bot/CacheClasses/emoji.js';
import EventCache from '@ayako/gateway/src/BaseClient/Bot/CacheClasses/event.js';
import GuildCache from '@ayako/gateway/src/BaseClient/Bot/CacheClasses/guild.js';
import GuildCommandCache from '@ayako/gateway/src/BaseClient/Bot/CacheClasses/guildCommand.js';
import IntegrationCache from '@ayako/gateway/src/BaseClient/Bot/CacheClasses/integration.js';
import InviteCache from '@ayako/gateway/src/BaseClient/Bot/CacheClasses/invite.js';
import MemberCache from '@ayako/gateway/src/BaseClient/Bot/CacheClasses/member.js';
import MessageCache from '@ayako/gateway/src/BaseClient/Bot/CacheClasses/message.js';
import PinCache from '@ayako/gateway/src/BaseClient/Bot/CacheClasses/pin.js';
import ReactionCache from '@ayako/gateway/src/BaseClient/Bot/CacheClasses/reaction.js';
import RoleCache from '@ayako/gateway/src/BaseClient/Bot/CacheClasses/role.js';
import SoundboardCache from '@ayako/gateway/src/BaseClient/Bot/CacheClasses/soundboard.js';
import StageCache from '@ayako/gateway/src/BaseClient/Bot/CacheClasses/stage.js';
import StickerCache from '@ayako/gateway/src/BaseClient/Bot/CacheClasses/sticker.js';
import ThreadCache from '@ayako/gateway/src/BaseClient/Bot/CacheClasses/thread.js';
import ThreadMemberCache from '@ayako/gateway/src/BaseClient/Bot/CacheClasses/threadMember.js';
import UserCache from '@ayako/gateway/src/BaseClient/Bot/CacheClasses/user.js';
import VoiceCache from '@ayako/gateway/src/BaseClient/Bot/CacheClasses/voice.js';
import WebhookCache from '@ayako/gateway/src/BaseClient/Bot/CacheClasses/webhook.js';
import WelcomeScreenCache from '@ayako/gateway/src/BaseClient/Bot/CacheClasses/welcomeScreen.js';

export const prefix = 'cache';
const cacheDBnum = process.argv.includes('--dev') ? envDevCacheDB : envCacheDB;
const schedDBnum = process.argv.includes('--dev') ? envDevCacheDB : '1';

if (!cacheDBnum || isNaN(Number(cacheDBnum))) {
	throw new Error('No cache DB number provided in env vars');
}

export const cacheDB = new Redis({ host: redis, db: Number(cacheDBnum) });
export const schedDB = new Redis({ host: redis, db: Number(schedDBnum) });
await cacheDB.config('SET', 'notify-keyspace-events', 'Ex');

export default cacheDB;

export const cache = {
	auditlogs: new AuditLogCache(cacheDB),
	automods: new AutomodCache(cacheDB),
	bans: new BanCache(cacheDB),
	channels: new ChannelCache(cacheDB),
	channelStatuses: new ChannelStatusCache(cacheDB),
	commands: new CommandCache(cacheDB),
	commandPermissions: new CommandPermissionCache(cacheDB),
	emojis: new EmojiCache(cacheDB),
	events: new EventCache(cacheDB),
	guilds: new GuildCache(cacheDB),
	guildCommands: new GuildCommandCache(cacheDB),
	integrations: new IntegrationCache(cacheDB),
	invites: new InviteCache(cacheDB),
	members: new MemberCache(cacheDB),
	messages: new MessageCache(cacheDB),
	pins: new PinCache(cacheDB),
	reactions: new ReactionCache(cacheDB),
	roles: new RoleCache(cacheDB),
	soundboards: new SoundboardCache(cacheDB),
	stages: new StageCache(cacheDB),
	stickers: new StickerCache(cacheDB),
	threads: new ThreadCache(cacheDB),
	threadMembers: new ThreadMemberCache(cacheDB),
	users: new UserCache(cacheDB),
	voices: new VoiceCache(cacheDB),
	webhooks: new WebhookCache(cacheDB),
	welcomeScreens: new WelcomeScreenCache(cacheDB),
};
