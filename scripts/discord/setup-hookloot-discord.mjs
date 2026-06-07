import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

const API_BASE_URL = 'https://discord.com/api/v10';
const DRY_RUN = process.argv.includes('--dry-run') || process.env.DISCORD_SERVER_SETUP_DRY_RUN === '1';
const POST_SETUP_MESSAGES = process.env.DISCORD_POST_SETUP_MESSAGES === '1';
const MARKER = '[HookLoot Discord Setup v1]';

const ROLE_SPECS = [
  { name: 'Hook & Loot Admin', color: 0xf3c777, hoist: true },
  { name: 'Moderator', color: 0x55dbff, hoist: true },
  { name: 'HookLoot Bot', color: 0x8cecff, hoist: true },
  { name: 'Verified Angler', color: 0x57f287 },
  { name: 'Beta Tester', color: 0x9b59b6 },
  { name: 'VIP Holder', color: 0xffd56d },
  { name: 'News Ping', color: 0x3498db, mentionable: true },
  { name: 'Events Ping', color: 0xe67e22, mentionable: true },
  { name: 'Rare Catch Club', color: 0x2ecc71 },
  { name: 'Leviathan Hunter', color: 0x71368a },
  { name: 'Grill Master', color: 0xe91e63 },
  { name: 'Cube Winner', color: 0x1abc9c },
  { name: 'Event Winner', color: 0xf1c40f },
];

const CATEGORY_SPECS = [
  {
    name: 'START HERE',
    channels: [
      { name: 'welcome', topic: 'Welcome to Hook & Loot.' },
      { name: 'rules', topic: 'Rules and safety expectations.', readOnly: true },
      { name: 'announcements', topic: 'Official Hook & Loot updates.', readOnly: true },
      { name: 'start-here', topic: 'First steps for new players.' },
      { name: 'official-links', topic: 'Official links only.', readOnly: true },
      { name: 'roles', topic: 'Role explanations and ping opt-ins.' },
    ],
  },
  {
    name: 'GAME',
    channels: [
      { name: 'game-updates', topic: 'Patch notes, balance notes, and release updates.', readOnly: true },
      { name: 'how-to-play', topic: 'Fishing, rods, bait, cube, grill, and MON reward basics.', readOnly: true },
      { name: 'bug-reports', topic: 'Report bugs with device, wallet state, and screenshot/video when possible.' },
      { name: 'feedback', topic: 'Gameplay, economy, UI, and event feedback.' },
      { name: 'known-issues', topic: 'Known issues and current workarounds.', readOnly: true },
      { name: 'leaderboard', topic: 'Weekly highlights, grill rankings, and notable catches.', readOnly: true },
    ],
  },
  {
    name: 'COMMUNITY',
    channels: [
      { name: 'general', topic: 'Main community chat.' },
      { name: 'catches-flex', topic: 'Share rare fish, MON pulls, and big wins.' },
      { name: 'strategy', topic: 'Rods, bait economy, cube choices, and grill routes.' },
      { name: 'memes', topic: 'Community memes and fun posts.' },
      { name: 'events-giveaways', topic: 'Event entries, giveaway posts, and community quests.' },
      { name: 'screenshots', topic: 'Game screenshots and clips.' },
    ],
  },
  {
    name: 'WEB3 MONAD',
    channels: [
      { name: 'wallet-help', topic: 'Wallet connection and verification help.' },
      { name: 'payments-help', topic: 'Purchase and wallet check-in help.' },
      { name: 'security-alerts', topic: 'Official security alerts and scam warnings.', readOnly: true },
      { name: 'withdrawal-status', topic: 'MON withdrawal and payout status.', readOnly: true },
    ],
  },
  {
    name: 'VOICE EVENTS',
    channels: [
      { name: 'Fishing Lounge', type: 2 },
      { name: 'Event Voice', type: 2 },
      { name: 'Dev Talk', type: 2 },
    ],
  },
  {
    name: 'STAFF',
    staffOnly: true,
    channels: [
      { name: 'mod-chat', topic: 'Private staff coordination.' },
      { name: 'mod-log', topic: 'Moderation notes.' },
      { name: 'bot-log', topic: 'Bot action log.' },
      { name: 'automod-alerts', topic: 'AutoMod alerts.' },
    ],
  },
];

const STARTER_MESSAGES = {
  welcome: `Welcome to Hook & Loot.\n\nStart by reading #rules, then visit #start-here. Share catches in #catches-flex and watch #announcements for events.\n\n${MARKER}`,
  rules: `Hook & Loot rules:\n1. Be respectful.\n2. No scams, impersonation, phishing, or fake links.\n3. Keep wallet/payment help in the official support channels.\n4. No spam or exploit sharing.\n5. Mods have final call on safety issues.\n\n${MARKER}`,
  'how-to-play': `Core loop:\n- Fish with bait.\n- Upgrade rods.\n- Catch rare fish.\n- Use the cube and grill systems.\n- Link wallet/game identity for verified quests.\n\n${MARKER}`,
  roles: `Role plan:\n- Verified Angler: linked player.\n- Rare Catch Club: rare+ catch proof.\n- Leviathan Hunter: Cosmic Leviathan catch.\n- Grill Master: weekly grill spotlight.\n- Cube Winner: notable cube prize.\n- News Ping / Events Ping: opt-in notifications.\n\n${MARKER}`,
  'official-links': `Official links will live here only. Treat random links elsewhere as unsafe unless staff confirms them.\n\n${MARKER}`,
};

function loadLocalEnvFiles() {
  const loadedKeys = new Set();

  for (const fileName of ['.env', '.env.local']) {
    const filePath = join(process.cwd(), fileName);
    if (!existsSync(filePath)) continue;

    for (const line of readFileSync(filePath, 'utf8').split(/\r?\n/)) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;

      const equalsIndex = trimmed.indexOf('=');
      if (equalsIndex <= 0) continue;

      const key = trimmed.slice(0, equalsIndex).trim();
      if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(key)) continue;
      if (process.env[key] != null && !loadedKeys.has(key)) continue;

      process.env[key] = parseEnvValue(trimmed.slice(equalsIndex + 1));
      loadedKeys.add(key);
    }
  }
}

function parseEnvValue(rawValue) {
  const trimmed = rawValue.trim();
  const quote = trimmed[0];
  if ((quote === '"' || quote === "'") && trimmed.endsWith(quote)) {
    return trimmed.slice(1, -1);
  }
  return trimmed;
}

function normalizeChannelName(name) {
  return name.toLowerCase();
}

function channelKey(channel) {
  return `${channel.parent_id || 'root'}:${normalizeChannelName(channel.name)}`;
}

function rolePayload(role) {
  return {
    name: role.name,
    color: role.color,
    hoist: Boolean(role.hoist),
    mentionable: Boolean(role.mentionable),
    permissions: '0',
  };
}

function textChannelPayload(channel, parentId, overwrites) {
  return {
    name: channel.name,
    type: channel.type ?? 0,
    parent_id: parentId,
    topic: channel.topic,
    permission_overwrites: overwrites,
  };
}

function categoryPayload(category, overwrites) {
  return {
    name: category.name,
    type: 4,
    permission_overwrites: overwrites,
  };
}

function readonlyOverwrites(guildId) {
  return [
    {
      id: guildId,
      type: 0,
      deny: String(2048),
      allow: '0',
    },
  ];
}

function staffOverwrites(guildId, roleMap) {
  const viewSendHistory = String(1024 | 2048 | 65536);
  const staffRoles = ['Hook & Loot Admin', 'Moderator']
    .map((name) => roleMap.get(name)?.id)
    .filter(Boolean);

  return [
    {
      id: guildId,
      type: 0,
      deny: String(1024),
      allow: '0',
    },
    ...staffRoles.map((id) => ({
      id,
      type: 0,
      allow: viewSendHistory,
      deny: '0',
    })),
  ];
}

function logDryRun(message) {
  if (DRY_RUN) console.log(`[dry-run] ${message}`);
}

async function discordRequest(method, path, body) {
  const token = process.env.DISCORD_BOT_TOKEN;
  if (!token) throw new Error('Missing DISCORD_BOT_TOKEN');

  const response = await fetch(`${API_BASE_URL}${path}`, {
    method,
    headers: {
      Authorization: `Bot ${token}`,
      'Content-Type': 'application/json',
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const payload = await response.json().catch(() => null);

  if (!response.ok) {
    throw new Error(`${method} ${path} failed (${response.status}): ${JSON.stringify(payload)}`);
  }

  return payload;
}

async function ensureRole(role, roleMap) {
  const existing = roleMap.get(role.name);
  if (existing) {
    console.log(`role exists: ${role.name}`);
    return existing;
  }

  if (DRY_RUN) {
    logDryRun(`create role: ${role.name}`);
    return { id: `dry-role-${role.name}`, name: role.name };
  }

  const created = await discordRequest('POST', `/guilds/${process.env.DISCORD_GUILD_ID}/roles`, rolePayload(role));
  roleMap.set(created.name, created);
  console.log(`role created: ${created.name}`);
  return created;
}

async function ensureCategory(category, channels, overwrites) {
  const existing = channels.find((channel) => channel.type === 4 && channel.name === category.name);
  if (existing) {
    console.log(`category exists: ${category.name}`);
    return existing;
  }

  if (DRY_RUN) {
    logDryRun(`create category: ${category.name}`);
    return { id: `dry-category-${category.name}`, name: category.name, type: 4 };
  }

  const created = await discordRequest(
    'POST',
    `/guilds/${process.env.DISCORD_GUILD_ID}/channels`,
    categoryPayload(category, overwrites),
  );
  channels.push(created);
  console.log(`category created: ${created.name}`);
  return created;
}

async function ensureChannel(channel, category, channels, overwrites) {
  const key = `${category.id}:${normalizeChannelName(channel.name)}`;
  const existing = channels.find((item) => channelKey(item) === key);
  if (existing) {
    console.log(`channel exists: ${category.name} / ${channel.name}`);
    return existing;
  }

  if (DRY_RUN) {
    logDryRun(`create channel: ${category.name} / ${channel.name}`);
    return { id: `dry-channel-${category.name}-${channel.name}`, name: channel.name, type: channel.type ?? 0, parent_id: category.id };
  }

  const created = await discordRequest(
    'POST',
    `/guilds/${process.env.DISCORD_GUILD_ID}/channels`,
    textChannelPayload(channel, category.id, overwrites),
  );
  channels.push(created);
  console.log(`channel created: ${category.name} / ${created.name}`);
  return created;
}

async function ensureStarterMessage(channel) {
  const content = STARTER_MESSAGES[channel.name];
  if (!content || !POST_SETUP_MESSAGES) return;

  if (DRY_RUN) {
    logDryRun(`post starter message: #${channel.name}`);
    return;
  }

  const recentMessages = await discordRequest('GET', `/channels/${channel.id}/messages?limit=50`);
  const alreadyPosted = recentMessages.some((message) => String(message.content || '').includes(MARKER));
  if (alreadyPosted) {
    console.log(`starter message exists: #${channel.name}`);
    return;
  }

  await discordRequest('POST', `/channels/${channel.id}/messages`, { content });
  console.log(`starter message posted: #${channel.name}`);
}

async function main() {
  loadLocalEnvFiles();

  if (DRY_RUN) {
    console.log('Hook & Loot Discord setup dry run');
    console.log('Roles:', ROLE_SPECS.map((role) => role.name).join(', '));
    console.log('Categories:', CATEGORY_SPECS.map((category) => category.name).join(', '));
    return;
  }

  if (!process.env.DISCORD_GUILD_ID) throw new Error('Missing DISCORD_GUILD_ID');
  if (!process.env.DISCORD_BOT_TOKEN) throw new Error('Missing DISCORD_BOT_TOKEN');

  const roles = await discordRequest('GET', `/guilds/${process.env.DISCORD_GUILD_ID}/roles`);
  const roleMap = new Map(roles.map((role) => [role.name, role]));

  for (const role of ROLE_SPECS) {
    await ensureRole(role, roleMap);
  }

  const channels = await discordRequest('GET', `/guilds/${process.env.DISCORD_GUILD_ID}/channels`);

  for (const categorySpec of CATEGORY_SPECS) {
    const categoryOverwrites = categorySpec.staffOnly
      ? staffOverwrites(process.env.DISCORD_GUILD_ID, roleMap)
      : [];
    const category = await ensureCategory(categorySpec, channels, categoryOverwrites);

    for (const channelSpec of categorySpec.channels) {
      const overwrites = categorySpec.staffOnly
        ? staffOverwrites(process.env.DISCORD_GUILD_ID, roleMap)
        : channelSpec.readOnly
          ? readonlyOverwrites(process.env.DISCORD_GUILD_ID)
          : [];
      const channel = await ensureChannel(channelSpec, category, channels, overwrites);
      await ensureStarterMessage(channel);
    }
  }

  console.log('Hook & Loot Discord setup complete.');
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
