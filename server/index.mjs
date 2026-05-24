import { createServer } from 'node:http';
import { createHmac, randomUUID, timingSafeEqual } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { extname, join, normalize } from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import { hashMessage, recoverAddress } from 'viem';
import { buildPlayerProgressProfile } from './player-progress-profile.mjs';

const loadLocalEnvFiles = () => {
  const locallyLoadedKeys = new Set();

  const assignLocalValue = (key, value) => {
    if (process.env[key] != null && !locallyLoadedKeys.has(key)) return;
    process.env[key] = value;
    locallyLoadedKeys.add(key);
  };

  const parseValue = (rawValue) => {
    const trimmed = rawValue.trim();
    const quote = trimmed[0];
    if ((quote === '"' || quote === "'") && trimmed.endsWith(quote)) {
      return trimmed.slice(1, -1);
    }
    return trimmed;
  };

  for (const fileName of ['.env', '.env.local']) {
    const filePath = join(process.cwd(), fileName);
    if (!existsSync(filePath)) continue;

    const contents = readFileSync(filePath, 'utf8');
    for (const line of contents.split(/\r?\n/)) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;

      const equalsIndex = trimmed.indexOf('=');
      if (equalsIndex <= 0) continue;

      const key = trimmed.slice(0, equalsIndex).trim();
      if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(key)) continue;

      assignLocalValue(key, parseValue(trimmed.slice(equalsIndex + 1)));
    }
  }
};

loadLocalEnvFiles();

const PORT = Number(process.env.HOOKLOOT_API_PORT || process.env.PORT || 8787);
const DATA_DIR = process.env.HOOKLOOT_DATA_DIR || join(process.cwd(), 'server', '.data');
const DB_PATH = process.env.HOOKLOOT_DB_PATH || join(DATA_DIR, 'hookloot.sqlite');
const UPLOAD_DIR = process.env.HOOKLOOT_UPLOAD_DIR || join(DATA_DIR, 'uploads');
const SESSION_SECRET = process.env.SESSION_TOKEN_SECRET || process.env.HOOKLOOT_SESSION_SECRET || 'hookloot-local-dev-secret';
const MONAD_RPC_URL = process.env.MONAD_RPC_URL || 'https://rpc.monad.xyz';
const RECEIVER_ADDRESS = (process.env.HOOKLOOT_RECEIVER_ADDRESS || '0x0266Bd01196B04a7A57372Fc9fB2F34374E6327D').toLowerCase();
const readEnvFlag = (value, fallback) => {
  if (value == null || String(value).trim() === '') return fallback;
  if (/^(1|true|yes|on)$/i.test(String(value))) return true;
  if (/^(0|false|no|off)$/i.test(String(value))) return false;
  return fallback;
};
const TEST_ACTIVITY_LOGS_ENABLED = readEnvFlag(process.env.HOOKLOOT_TEST_ACTIVITY_LOGS_ENABLED, true);
const MONAD_SHOP_TEST_MODE_ENABLED = readEnvFlag(
  process.env.HOOKLOOT_MONAD_SHOP_TEST_MODE_ENABLED ?? process.env.VITE_MONAD_SHOP_TEST_MODE_ENABLED,
  false,
);
const MONAD_TEST_DROPS_ALWAYS = readEnvFlag(process.env.HOOKLOOT_MONAD_TEST_DROPS_ALWAYS, MONAD_SHOP_TEST_MODE_ENABLED);
const ADMIN_WALLETS = new Set(
  (process.env.HOOKLOOT_ADMIN_WALLETS || process.env.ADMIN_WALLET_ADDRESS || RECEIVER_ADDRESS)
    .split(',')
    .map((wallet) => normalizeWallet(wallet))
    .filter(Boolean),
);
const ALLOW_UNVERIFIED_PAYMENTS = readEnvFlag(process.env.HOOKLOOT_ALLOW_UNVERIFIED_PAYMENTS, MONAD_SHOP_TEST_MODE_ENABLED);
const TOKEN_TTL_MS = 1000 * 60 * 60 * 24 * 30;
const DAILY_FREE_BAIT = 30;
const REFERRAL_BAIT_BONUS = 10;
const MAX_REWARDED_REFERRALS = 10;
const PREMIUM_SESSION_COST_MON = '3';
const PREMIUM_SESSION_CASTS = 20;
const WALLET_CHECK_IN_COST_MON = '0.0001';
const BAIT_PACKAGES = [
  { amount: 5, cost: 400, label: 'Small bait pack' },
  { amount: 10, cost: 800, label: 'Double bait pack' },
  { amount: 25, cost: 2000, label: 'Big bait pack' },
  { amount: 50, cost: 4000, label: 'Bulk bait box' },
];
const BAIT_PACKAGES_BY_AMOUNT = new Map(BAIT_PACKAGES.map((item) => [item.amount, item]));
const COIN_ROD_COSTS = new Map();
const MON_FISHING_NET_PACKAGES = [
  { dailyFishCount: 10, monAmount: '3', label: 'Scout Net' },
  { dailyFishCount: 25, monAmount: '30', label: 'Harbor Net' },
  { dailyFishCount: 50, monAmount: '60', label: 'Fleet Net' },
];
const MON_FISHING_NET_PACKAGES_BY_COUNT = new Map(MON_FISHING_NET_PACKAGES.map((item) => [item.dailyFishCount, item]));
const MON_CUBE_ROLL_PACKAGES = [
  { rolls: 1, monAmount: '1', label: '1 cube roll' },
  { rolls: 3, monAmount: '3', label: '3 cube rolls' },
  { rolls: 5, monAmount: '5', label: '5 cube rolls' },
];
const MON_CUBE_ROLL_PACKAGES_BY_ROLLS = new Map(MON_CUBE_ROLL_PACKAGES.map((item) => [item.rolls, item]));
const MON_HOLD_DAYS = 7;
const MIN_WITHDRAW_MON = 1;
const XP_PER_LEVEL = 100;
const CATCH_CHANCE = 60;
const MIN_CAST_INTERVAL_MS = 4000;
const BITE_WINDOW_MIN_MS = 1500;
const BITE_WINDOW_MAX_MS = 2500;
const REEL_EARLY_GRACE_MS = 450;
const REEL_LATE_GRACE_MS = 1200;

const FISH_DATA = [
  { id: 'carp', name: 'Carp', rarity: 'common', chance: 45.14, price: 8, xp: 10 },
  { id: 'perch', name: 'Perch', rarity: 'uncommon', chance: 28, price: 15, xp: 20 },
  { id: 'bream', name: 'Bream', rarity: 'rare', chance: 15, price: 35, xp: 35 },
  { id: 'catfish', name: 'Catfish', rarity: 'epic', chance: 8, price: 75, xp: 50 },
  { id: 'goldfish', name: 'Goldfish', rarity: 'legendary', chance: 3, price: 200, xp: 100 },
  { id: 'mutant', name: 'Mutant Fish', rarity: 'mythical', chance: 0.8, price: 800, xp: 200 },
  { id: 'pike', name: 'Purple Fish', rarity: 'secret', chance: 0.05, price: 10000, xp: 1000 },
  { id: 'leviathan', name: 'Cosmic Leviathan', rarity: 'mythical', chance: 0.01, price: 50000, xp: 10000 },
];
const FISH_BY_ID = new Map(FISH_DATA.map((fish) => [fish.id, fish]));
const ROD_DATA = [
  { id: 'common_rod', level: 0, name: 'Common Rod', rarity: 'common', bonus: 0, monadDropChance: 0, monadMinReward: 0, monadMaxReward: 0 },
  { id: 'rare_rod', level: 1, name: 'Rare Rod', rarity: 'rare', bonus: 8, monadDropChance: 4, monadMinReward: 0.01, monadMaxReward: 0.03 },
  { id: 'epic_rod', level: 2, name: 'Epic Rod', rarity: 'epic', bonus: 16, monadDropChance: 8, monadMinReward: 0.02, monadMaxReward: 0.07 },
  { id: 'legendary_rod', level: 3, name: 'Legendary Rod', rarity: 'legendary', bonus: 28, monadDropChance: 14, monadMinReward: 0.04, monadMaxReward: 0.12 },
  { id: 'legacy_gold_rod', level: 4, name: 'Legacy Gold Rod', rarity: 'legendary', bonus: 25, monadDropChance: 0, monadMinReward: 0, monadMaxReward: 0 },
];
const NFT_ROD_BONUSES = {
  0: { rarityBonus: 6, xpBonus: 15, sellBonus: 5 },
  1: { rarityBonus: 12, xpBonus: 30, sellBonus: 15 },
  2: { rarityBonus: 18, xpBonus: 45, sellBonus: 25 },
  3: { rarityBonus: 24, xpBonus: 60, sellBonus: 35 },
  4: { rarityBonus: 32, xpBonus: 80, sellBonus: 50 },
};
const ALBUM_FIRST_CATCH_BONUSES = {
  carp: 25,
  perch: 50,
  bream: 100,
  catfish: 200,
  goldfish: 500,
  mutant: 1500,
  pike: 5000,
  leviathan: 10000,
};
const COLLECTION_BOOK_PAGES = [
  { id: 'lake_basics', fishIds: ['carp', 'perch', 'bream'] },
  { id: 'deepwater_odds', fishIds: ['catfish', 'goldfish', 'mutant'] },
  { id: 'trophy_legends', fishIds: ['pike', 'leviathan'] },
];

const WHEEL_PRIZES = [
  { id: 'coin_60', type: 'coins', label: '60 coins', coins: 60 },
  { id: 'coin_120', type: 'coins', label: '120 coins', coins: 120 },
  { id: 'coin_200', type: 'coins', label: '200 coins', coins: 200 },
  { id: 'coin_350', type: 'coins', label: '350 coins', coins: 350 },
  { id: 'coin_550', type: 'coins', label: '550 coins', coins: 550 },
  { id: 'coin_900', type: 'coins', label: '900 coins', coins: 900 },
  { id: 'coin_1500', type: 'coins', label: '1,500 coins', coins: 1500 },
  { id: 'coin_2200', type: 'coins', label: '2,200 coins', coins: 2200 },
  { id: 'bait_3', type: 'bait', label: '3 bait', bait: 3 },
  { id: 'bait_5', type: 'bait', label: '5 bait', bait: 5 },
  { id: 'bait_8', type: 'bait', label: '8 bait', bait: 8 },
  { id: 'bait_12', type: 'bait', label: '12 bait', bait: 12 },
  { id: 'bait_18', type: 'bait', label: '18 bait', bait: 18 },
  { id: 'secret_mon_1', type: 'mon', label: '1 MON', mon: 1, secret: true },
];

const TASK_REWARDS = {
  check_in: { coins: 100 },
  catch_10: { coins: 100 },
  rare_1: { coins: 100 },
  grill_1: { coins: 100 },
  spend_1000: { bait: 10 },
  wallet_check_in: { bait: 10 },
  invite_friend: { bait: 10 },
  catch_60_fish: { coins: 600 },
  catch_6_rare: { coins: 700 },
  cook_5_dishes: { coins: 500 },
  sell_3_dishes: { coins: 350 },
  cube_3_days: { cubeCharge: 3 },
  complete_1_premium_session: { bait: 20 },
};
const DAILY_TASK_TARGETS = {
  check_in: 1,
  catch_10: 10,
  rare_1: 1,
  grill_1: 1,
  spend_1000: 1000,
};
const SPECIAL_TASK_TARGETS = {
  wallet_check_in: 1,
  invite_friend: 1,
};
const WEEKLY_MISSION_TARGETS = {
  catch_60_fish: 60,
  catch_6_rare: 6,
  cook_5_dishes: 5,
  sell_3_dishes: 3,
  cube_3_days: 3,
  complete_1_premium_session: 1,
};
const RARE_TASK_RARITIES = new Set(['rare', 'epic', 'legendary', 'mythical', 'secret']);
const DAILY_CLAIMS_FOR_CUBE = 3;
const DAILY_CUBE_ROLL_REWARD = 3;

const SOCIAL_TASKS = ['twitter_follow', 'twitter_repost', 'twitter_like', 'discord_join', 'telegram_join'];
const GRILL_RECIPES = {
  lake_skewer: { ingredients: { carp: 2 }, score: 25 },
  crispy_perch_plate: { ingredients: { perch: 2, carp: 1 }, score: 65 },
  rare_bream_steak: { ingredients: { bream: 1, perch: 1 }, score: 150 },
  deepwater_platter: { ingredients: { catfish: 2, bream: 1 }, score: 420 },
  cosmic_grill: { ingredients: { goldfish: 1, mutant: 1 }, score: 1200 },
};
const PREMIUM_FISH_IDS = ['carp', 'perch', 'bream', 'catfish', 'goldfish', 'mutant'];

mkdirSync(DATA_DIR, { recursive: true });
mkdirSync(join(UPLOAD_DIR, 'avatars'), { recursive: true });

const db = new DatabaseSync(DB_PATH);
db.exec(`
  PRAGMA journal_mode = WAL;
  PRAGMA foreign_keys = ON;

  CREATE TABLE IF NOT EXISTS players (
    id TEXT PRIMARY KEY,
    wallet_address TEXT NOT NULL UNIQUE,
    coins INTEGER NOT NULL DEFAULT 100,
    bait INTEGER NOT NULL DEFAULT 0,
    daily_free_bait INTEGER NOT NULL DEFAULT 30,
    daily_free_bait_reset_at TEXT,
    bonus_bait_granted_total INTEGER NOT NULL DEFAULT 0,
    level INTEGER NOT NULL DEFAULT 1,
    xp INTEGER NOT NULL DEFAULT 0,
    xp_to_next INTEGER NOT NULL DEFAULT 100,
    rod_level INTEGER NOT NULL DEFAULT 0,
    equipped_rod INTEGER NOT NULL DEFAULT 0,
    inventory TEXT NOT NULL DEFAULT '[]',
    cooked_dishes TEXT NOT NULL DEFAULT '[]',
    game_progress TEXT NOT NULL DEFAULT '{}',
    total_catches INTEGER NOT NULL DEFAULT 0,
    login_streak INTEGER NOT NULL DEFAULT 1,
    nft_rods TEXT NOT NULL DEFAULT '[]',
    nickname TEXT,
    avatar_url TEXT,
    wallet_bait_bonus_claimed INTEGER NOT NULL DEFAULT 0,
    referrer_wallet_address TEXT,
    referral_reward_granted INTEGER NOT NULL DEFAULT 0,
    rewarded_referral_count INTEGER NOT NULL DEFAULT 0,
    last_login TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS admin_roles (
    wallet_address TEXT PRIMARY KEY,
    role TEXT NOT NULL DEFAULT 'admin',
    created_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS grill_leaderboard (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    score INTEGER NOT NULL DEFAULT 0,
    dishes INTEGER NOT NULL DEFAULT 0,
    wallet_address TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  );
  CREATE INDEX IF NOT EXISTS idx_grill_leaderboard_score ON grill_leaderboard(score DESC, updated_at DESC);

  CREATE TABLE IF NOT EXISTS player_audit_logs (
    id TEXT PRIMARY KEY,
    wallet_address TEXT NOT NULL,
    event_type TEXT NOT NULL,
    event_source TEXT NOT NULL DEFAULT 'server',
    before_state TEXT NOT NULL DEFAULT '{}',
    after_state TEXT NOT NULL DEFAULT '{}',
    delta_state TEXT NOT NULL DEFAULT '{}',
    metadata TEXT NOT NULL DEFAULT '{}',
    created_at TEXT NOT NULL
  );
  CREATE INDEX IF NOT EXISTS idx_player_audit_wallet_created ON player_audit_logs(wallet_address, created_at DESC);

  CREATE TABLE IF NOT EXISTS payment_transactions (
    tx_hash TEXT PRIMARY KEY,
    wallet_address TEXT NOT NULL,
    purpose TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'reserved',
    expected_mon TEXT NOT NULL,
    paid_mon REAL,
    metadata TEXT NOT NULL DEFAULT '{}',
    error_message TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    verified_at TEXT
  );
  CREATE INDEX IF NOT EXISTS idx_payment_transactions_wallet_created ON payment_transactions(wallet_address, created_at DESC);

  CREATE TABLE IF NOT EXISTS player_messages (
    id TEXT PRIMARY KEY,
    player_id TEXT NOT NULL,
    title TEXT NOT NULL,
    body TEXT NOT NULL,
    created_by_wallet TEXT NOT NULL,
    created_at TEXT NOT NULL,
    delivered_at TEXT NOT NULL,
    read_at TEXT
  );

  CREATE TABLE IF NOT EXISTS player_mon_rewards (
    id TEXT PRIMARY KEY,
    player_id TEXT NOT NULL,
    wallet_address TEXT NOT NULL,
    amount_mon REAL NOT NULL,
    source_type TEXT NOT NULL,
    source_ref TEXT,
    hold_until TEXT NOT NULL,
    created_by_wallet TEXT,
    admin_note TEXT,
    created_at TEXT NOT NULL
  );
  DELETE FROM player_mon_rewards
    WHERE source_ref IS NOT NULL
      AND source_ref <> ''
      AND rowid NOT IN (
        SELECT MIN(rowid) FROM player_mon_rewards
        WHERE source_ref IS NOT NULL AND source_ref <> ''
        GROUP BY wallet_address, source_type, source_ref
      );
  CREATE UNIQUE INDEX IF NOT EXISTS idx_player_mon_rewards_unique_source
    ON player_mon_rewards(wallet_address, source_type, source_ref)
    WHERE source_ref IS NOT NULL AND source_ref <> '';

  CREATE TABLE IF NOT EXISTS mon_withdraw_requests (
    id TEXT PRIMARY KEY,
    player_id TEXT NOT NULL,
    wallet_address TEXT NOT NULL,
    amount_mon REAL NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending',
    requested_at TEXT NOT NULL,
    processed_at TEXT,
    payout_tx_hash TEXT,
    processed_by_wallet TEXT,
    admin_note TEXT
  );

  CREATE TABLE IF NOT EXISTS player_cube_rolls (
    id TEXT PRIMARY KEY,
    player_id TEXT NOT NULL,
    wallet_address TEXT NOT NULL,
    cube_faces TEXT NOT NULL,
    target_face_index INTEGER NOT NULL,
    target_tile_index INTEGER NOT NULL,
    prize TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending',
    created_at TEXT NOT NULL,
    applied_at TEXT
  );

  CREATE TABLE IF NOT EXISTS social_task_verifications (
    id TEXT PRIMARY KEY,
    player_id TEXT NOT NULL,
    wallet_address TEXT NOT NULL,
    task_id TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'available',
    proof_url TEXT,
    verified_by_wallet TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    UNIQUE(player_id, task_id)
  );

  CREATE TABLE IF NOT EXISTS guest_wallet_links (
    guest_wallet_address TEXT PRIMARY KEY,
    wallet_address TEXT NOT NULL,
    linked_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS edge_rate_limits (
    action_key TEXT NOT NULL,
    subject_key TEXT NOT NULL,
    window_started_at TEXT NOT NULL,
    hit_count INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    PRIMARY KEY(action_key, subject_key, window_started_at)
  );

  CREATE TABLE IF NOT EXISTS premium_fishing_sessions (
    id TEXT PRIMARY KEY,
    player_id TEXT NOT NULL,
    wallet_address TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'active',
    price_mon REAL NOT NULL DEFAULT 0,
    casts_total INTEGER NOT NULL,
    casts_used INTEGER NOT NULL DEFAULT 0,
    luck_meter_stacks INTEGER NOT NULL DEFAULT 0,
    zero_drop_streak INTEGER NOT NULL DEFAULT 0,
    rescue_eligible INTEGER NOT NULL DEFAULT 0,
    recovered_mon_total REAL NOT NULL DEFAULT 0,
    started_at TEXT NOT NULL,
    completed_at TEXT,
    tx_hash TEXT
  );

  CREATE TABLE IF NOT EXISTS premium_fishing_casts (
    id TEXT PRIMARY KEY,
    session_id TEXT NOT NULL,
    cast_index INTEGER NOT NULL,
    reaction_quality TEXT NOT NULL,
    fish_id TEXT NOT NULL,
    bonus_coins_awarded INTEGER NOT NULL DEFAULT 0,
    bonus_xp_awarded INTEGER NOT NULL DEFAULT 0,
    mon_drop_tier TEXT NOT NULL,
    mon_amount REAL NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL
  );
  DELETE FROM premium_fishing_casts
    WHERE rowid NOT IN (
      SELECT MIN(rowid) FROM premium_fishing_casts
      GROUP BY session_id, cast_index
    );
  CREATE UNIQUE INDEX IF NOT EXISTS idx_premium_fishing_casts_session_index
    ON premium_fishing_casts(session_id, cast_index);

  CREATE TABLE IF NOT EXISTS player_fishing_casts (
    id TEXT PRIMARY KEY,
    player_id TEXT NOT NULL,
    wallet_address TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending',
    consumed_bucket TEXT,
    fish_id TEXT,
    wait_ms INTEGER NOT NULL,
    bite_window_ms INTEGER NOT NULL,
    started_at TEXT NOT NULL,
    resolved_at TEXT,
    result_json TEXT NOT NULL DEFAULT '{}'
  );
  CREATE INDEX IF NOT EXISTS idx_player_fishing_casts_wallet_status
    ON player_fishing_casts(wallet_address, status, started_at DESC);
`);

function tableHasColumn(tableName, columnName) {
  return db.prepare(`PRAGMA table_info(${tableName})`).all().some((column) => column.name === columnName);
}

if (!tableHasColumn('player_fishing_casts', 'resolve_token_hash')) {
  db.exec('ALTER TABLE player_fishing_casts ADD COLUMN resolve_token_hash TEXT');
}

for (const wallet of ADMIN_WALLETS) {
  db.prepare('INSERT OR IGNORE INTO admin_roles (wallet_address, role, created_at) VALUES (?, ?, ?)').run(wallet, 'admin', nowIso());
}

function nowIso() {
  return new Date().toISOString();
}

function todayKey(date = new Date()) {
  return date.toISOString().slice(0, 10);
}

function weekKey(date = new Date()) {
  const cursor = new Date(date);
  const mondayBasedDay = (cursor.getUTCDay() + 6) % 7;
  cursor.setUTCHours(0, 0, 0, 0);
  cursor.setUTCDate(cursor.getUTCDate() - mondayBasedDay);
  return todayKey(cursor);
}

function normalizeWallet(value) {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  return /^0x[a-fA-F0-9]{40}$/.test(trimmed) ? trimmed.toLowerCase() : null;
}

function normalizeTxHash(value) {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  return /^0x[a-fA-F0-9]{64}$/.test(trimmed) ? trimmed.toLowerCase() : null;
}

function requireTxHash(value, missingMessage = 'Missing transaction hash') {
  if (typeof value !== 'string' || !value.trim()) {
    throw httpError(400, missingMessage);
  }

  const normalized = normalizeTxHash(value);
  if (!normalized) throw httpError(400, 'Invalid transaction hash');
  return normalized;
}

function normalizeGuestIdentity(value) {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim().toLowerCase();
  return /^guest:[a-z0-9][a-z0-9:_-]{7,95}$/.test(trimmed) ? trimmed : null;
}

function normalizePlayerIdentity(value) {
  return normalizeWallet(value) || normalizeGuestIdentity(value);
}

function normalizePaymentIdentity(value) {
  return MONAD_SHOP_TEST_MODE_ENABLED ? normalizePlayerIdentity(value) : normalizeWallet(value);
}

function createGuestIdentity() {
  return `guest:${randomUUID()}`;
}

function isGuestIdentity(value) {
  return Boolean(normalizeGuestIdentity(value));
}

function isGuestPlayer(player) {
  return isGuestIdentity(player?.wallet_address);
}

function deriveGuestNickname(guestId) {
  const suffix = String(guestId || '')
    .replace(/^guest:/i, '')
    .replace(/[^a-z0-9]/gi, '')
    .slice(0, 6)
    .toUpperCase();
  return `Guest_${suffix || 'PLAYER'}`;
}

function isGeneratedGuestNickname(value) {
  return typeof value === 'string' && /^Guest_[A-Z0-9]{4,12}$/i.test(value.trim());
}

function safeJsonParse(value, fallback) {
  try {
    if (value == null || value === '') return fallback;
    return JSON.parse(value);
  } catch {
    return fallback;
  }
}

function toJson(value, fallback) {
  return JSON.stringify(value ?? fallback);
}

function playerFromRow(row) {
  if (!row) return null;
  return {
    id: row.id,
    wallet_address: row.wallet_address,
    coins: row.coins,
    bait: row.bait,
    daily_free_bait: row.daily_free_bait,
    daily_free_bait_reset_at: row.daily_free_bait_reset_at,
    bonus_bait_granted_total: row.bonus_bait_granted_total,
    level: row.level,
    xp: row.xp,
    xp_to_next: row.xp_to_next,
    rod_level: row.rod_level,
    equipped_rod: row.equipped_rod,
    inventory: safeJsonParse(row.inventory, []),
    cooked_dishes: safeJsonParse(row.cooked_dishes, []),
    game_progress: safeJsonParse(row.game_progress, {}),
    total_catches: row.total_catches,
    login_streak: row.login_streak,
    nft_rods: safeJsonParse(row.nft_rods, []),
    nickname: row.nickname,
    avatar_url: row.avatar_url,
    wallet_bait_bonus_claimed: Boolean(row.wallet_bait_bonus_claimed),
    referrer_wallet_address: row.referrer_wallet_address,
    referral_reward_granted: Boolean(row.referral_reward_granted),
    rewarded_referral_count: row.rewarded_referral_count,
    last_login: row.last_login,
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

function getPlayerByWallet(walletAddress) {
  return playerFromRow(db.prepare('SELECT * FROM players WHERE wallet_address = ?').get(walletAddress));
}

function getPlayerById(playerId) {
  return playerFromRow(db.prepare('SELECT * FROM players WHERE id = ?').get(playerId));
}

function ensurePlayer(walletAddress) {
  const wallet = normalizePlayerIdentity(walletAddress);
  if (!wallet) throw httpError(400, 'Invalid player identity');

  let player = getPlayerByWallet(wallet);
  const now = nowIso();
  if (!player) {
    const nickname = isGuestIdentity(wallet) ? deriveGuestNickname(wallet) : null;
    db.prepare(`
      INSERT INTO players (
        id, wallet_address, coins, bait, daily_free_bait, daily_free_bait_reset_at,
        level, xp, xp_to_next, rod_level, equipped_rod, inventory, cooked_dishes,
        game_progress, total_catches, login_streak, nft_rods, nickname, created_at, updated_at, last_login
      ) VALUES (?, ?, 100, 0, ?, ?, 1, 0, 100, 0, 0, '[]', '[]', '{}', 0, 1, '[]', ?, ?, ?, ?)
    `).run(randomUUID(), wallet, DAILY_FREE_BAIT, todayKey(), nickname, now, now, now);
    player = getPlayerByWallet(wallet);
  }

  const resetKey = todayKey();
  if (player.daily_free_bait_reset_at !== resetKey) {
    updatePlayer(wallet, {
      daily_free_bait: DAILY_FREE_BAIT,
      daily_free_bait_reset_at: resetKey,
      last_login: now,
    });
  } else {
    updatePlayer(wallet, { last_login: now });
  }

  player = getPlayerByWallet(wallet);
  if (isGuestIdentity(wallet) && !player.nickname) {
    updatePlayer(wallet, { nickname: deriveGuestNickname(wallet) });
    player = getPlayerByWallet(wallet);
  }

  const normalizedProgress = ensureGameProgress(player.game_progress);
  if (JSON.stringify(normalizedProgress) !== JSON.stringify(player.game_progress || {})) {
    updatePlayer(wallet, { game_progress: normalizedProgress });
  }

  return getPlayerByWallet(wallet);
}

function updatePlayer(walletAddress, patch) {
  const allowed = new Set([
    'coins', 'bait', 'daily_free_bait', 'daily_free_bait_reset_at', 'bonus_bait_granted_total',
    'level', 'xp', 'xp_to_next', 'rod_level', 'equipped_rod', 'inventory', 'cooked_dishes',
    'game_progress', 'total_catches', 'login_streak', 'nft_rods', 'nickname', 'avatar_url',
    'wallet_bait_bonus_claimed', 'referrer_wallet_address', 'referral_reward_granted',
    'rewarded_referral_count', 'last_login',
  ]);
  const entries = Object.entries(patch).filter(([key]) => allowed.has(key));
  if (!entries.length) return getPlayerByWallet(walletAddress);

  const now = nowIso();
  const sets = entries.map(([key]) => `${key} = ?`).join(', ');
  const values = entries.map(([key, value]) => (
    ['inventory', 'cooked_dishes', 'game_progress', 'nft_rods'].includes(key)
      ? toJson(value, null)
      : typeof value === 'boolean' ? (value ? 1 : 0) : value
  ));
  db.prepare(`UPDATE players SET ${sets}, updated_at = ? WHERE wallet_address = ?`).run(...values, now, walletAddress);
  return getPlayerByWallet(walletAddress);
}

function safeAdminInteger(value, fallback = 0, min = 0, max = 1_000_000_000) {
  const next = Math.floor(Number(value));
  if (!Number.isFinite(next)) return fallback;
  return Math.min(max, Math.max(min, next));
}

function normalizeInventoryStack(value) {
  const totals = new Map();
  for (const item of Array.isArray(value) ? value : []) {
    const fishId = typeof item?.fishId === 'string' && FISH_BY_ID.has(item.fishId) ? item.fishId : null;
    const quantity = safeAdminInteger(item?.quantity, 0, 0, 999_999);
    if (!fishId || quantity <= 0) continue;
    const existing = totals.get(fishId) || { fishId, quantity: 0, caughtAt: typeof item?.caughtAt === 'string' ? item.caughtAt : nowIso() };
    totals.set(fishId, { ...existing, quantity: existing.quantity + quantity });
  }
  return Array.from(totals.values());
}

function normalizeCookedDishStack(value) {
  const totals = new Map();
  for (const item of Array.isArray(value) ? value : []) {
    const recipeId = typeof item?.recipeId === 'string' && GRILL_RECIPES[item.recipeId] ? item.recipeId : null;
    const quantity = safeAdminInteger(item?.quantity, 0, 0, 999_999);
    if (!recipeId || quantity <= 0) continue;
    const existing = totals.get(recipeId) || { recipeId, quantity: 0, createdAt: typeof item?.createdAt === 'string' ? item.createdAt : nowIso() };
    totals.set(recipeId, { ...existing, quantity: existing.quantity + quantity });
  }
  return Array.from(totals.values());
}

function normalizeNftRods(value) {
  return Array.from(new Set((Array.isArray(value) ? value : [])
    .map((rodLevel) => safeAdminInteger(rodLevel, 0, 0, 99))));
}

function sanitizeAdminPlayerPatch(rawPatch, currentPlayer) {
  const patch = {};
  const incoming = rawPatch && typeof rawPatch === 'object' ? rawPatch : {};
  const integerFields = {
    coins: [0, 1_000_000_000],
    bait: [0, 1_000_000],
    daily_free_bait: [0, 1_000_000],
    bonus_bait_granted_total: [0, 1_000_000],
    level: [1, 10_000],
    xp: [0, 1_000_000_000],
    xp_to_next: [1, 1_000_000_000],
    rod_level: [0, 99],
    equipped_rod: [0, 99],
    total_catches: [0, 1_000_000_000],
    login_streak: [0, 100_000],
    rewarded_referral_count: [0, MAX_REWARDED_REFERRALS],
  };

  for (const [field, [min, max]] of Object.entries(integerFields)) {
    if (Object.prototype.hasOwnProperty.call(incoming, field)) {
      patch[field] = safeAdminInteger(incoming[field], currentPlayer?.[field] ?? min, min, max);
    }
  }

  if (Object.prototype.hasOwnProperty.call(incoming, 'nickname')) {
    const nickname = typeof incoming.nickname === 'string' ? incoming.nickname.trim().slice(0, 20) : '';
    patch.nickname = nickname || null;
  }
  if (Object.prototype.hasOwnProperty.call(incoming, 'avatar_url')) {
    const avatarUrl = typeof incoming.avatar_url === 'string' ? incoming.avatar_url.trim().slice(0, 500) : '';
    patch.avatar_url = avatarUrl || null;
  }
  if (Object.prototype.hasOwnProperty.call(incoming, 'wallet_bait_bonus_claimed')) {
    patch.wallet_bait_bonus_claimed = Boolean(incoming.wallet_bait_bonus_claimed);
  }
  if (Object.prototype.hasOwnProperty.call(incoming, 'referral_reward_granted')) {
    patch.referral_reward_granted = Boolean(incoming.referral_reward_granted);
  }
  if (Object.prototype.hasOwnProperty.call(incoming, 'inventory')) {
    patch.inventory = normalizeInventoryStack(incoming.inventory);
  }
  if (Object.prototype.hasOwnProperty.call(incoming, 'cooked_dishes')) {
    patch.cooked_dishes = normalizeCookedDishStack(incoming.cooked_dishes);
  }
  if (Object.prototype.hasOwnProperty.call(incoming, 'nft_rods')) {
    patch.nft_rods = normalizeNftRods(incoming.nft_rods);
  }
  if (Object.prototype.hasOwnProperty.call(incoming, 'game_progress')) {
    patch.game_progress = ensureGameProgress(incoming.game_progress);
  }

  return patch;
}

function adminPatchPlayerById(playerId, rawPatch, adminWalletAddress) {
  const before = getPlayerById(playerId);
  if (!before) throw httpError(404, 'Player not found');
  const patch = sanitizeAdminPlayerPatch(rawPatch, before);
  const updated = updatePlayer(before.wallet_address, patch);
  addAudit(before.wallet_address, 'admin_player_updated', {
    updatedByWallet: adminWalletAddress,
    fields: Object.keys(patch),
  }, before, updated);
  return updated;
}

function buildAdminPlayerProgressProfile(player) {
  return buildPlayerProgressProfile(player, {
    progress: ensureGameProgress(player.game_progress),
    dailyTaskTargets: DAILY_TASK_TARGETS,
    specialTaskTargets: SPECIAL_TASK_TARGETS,
    weeklyMissionTargets: WEEKLY_MISSION_TARGETS,
    monSummary: isGuestPlayer(player) ? null : monSummary(player),
  });
}

function getGuestWalletLink(guestWalletAddress) {
  const guestWallet = normalizeGuestIdentity(guestWalletAddress);
  if (!guestWallet) return null;
  return db.prepare('SELECT * FROM guest_wallet_links WHERE guest_wallet_address = ?').get(guestWallet) || null;
}

function withTransaction(callback) {
  db.exec('BEGIN IMMEDIATE');
  try {
    const result = callback();
    db.exec('COMMIT');
    return result;
  } catch (error) {
    db.exec('ROLLBACK');
    throw error;
  }
}

function toTimeValue(value) {
  if (!value) return 0;
  const timestamp = new Date(value).getTime();
  return Number.isFinite(timestamp) ? timestamp : 0;
}

function earlierIso(first, second) {
  if (!first) return second || null;
  if (!second) return first || null;
  return toTimeValue(first) <= toTimeValue(second) ? first : second;
}

function laterIso(first, second) {
  if (!first) return second || null;
  if (!second) return first || null;
  return toTimeValue(first) >= toTimeValue(second) ? first : second;
}

function mergeQuantityStacksBySum(currentValue, nextValue, keyField, timeField) {
  const current = Array.isArray(currentValue) ? currentValue : [];
  const next = Array.isArray(nextValue) ? nextValue : [];
  const merged = new Map();

  for (const item of current) {
    const key = typeof item?.[keyField] === 'string' ? item[keyField] : null;
    const quantity = Math.max(0, Math.floor(Number(item?.quantity || 0)));
    if (key && quantity > 0) merged.set(key, { ...item, quantity });
  }

  for (const item of next) {
    const key = typeof item?.[keyField] === 'string' ? item[keyField] : null;
    const quantity = Math.max(0, Math.floor(Number(item?.quantity || 0)));
    if (!key || quantity <= 0) continue;

    const existing = merged.get(key);
    if (!existing) {
      merged.set(key, { ...item, quantity });
      continue;
    }

    merged.set(key, {
      ...existing,
      ...item,
      [keyField]: key,
      quantity: Math.max(0, Number(existing.quantity || 0)) + quantity,
      [timeField]: laterIso(existing[timeField], item[timeField]) || existing[timeField] || item[timeField] || nowIso(),
    });
  }

  return Array.from(merged.values()).filter((item) => Number(item.quantity || 0) > 0);
}

function mergeProgressEntries(currentEntries, nextEntries, targets) {
  return Object.fromEntries(Object.keys(targets).map((id) => {
    const current = currentEntries?.[id] || {};
    const next = nextEntries?.[id] || {};
    return [id, {
      progress: Math.min(
        targets[id],
        Math.max(
          Math.max(0, Math.floor(Number(current.progress || 0))),
          Math.max(0, Math.floor(Number(next.progress || 0))),
        ),
      ),
      claimed: Boolean(current.claimed || next.claimed),
    }];
  }));
}

function mergeCollectionBooks(currentBook, nextBook) {
  if (!currentBook && !nextBook) return null;
  const current = ensureCollectionBook(currentBook);
  const next = ensureCollectionBook(nextBook);
  const species = Object.fromEntries(FISH_DATA.map((fish) => {
    const currentSpecies = current.species[fish.id] || {};
    const nextSpecies = next.species[fish.id] || {};
    return [fish.id, {
      fishId: fish.id,
      discovered: Boolean(currentSpecies.discovered || nextSpecies.discovered),
      catches: Math.max(0, Number(currentSpecies.catches || 0)) + Math.max(0, Number(nextSpecies.catches || 0)),
      firstCaughtAt: earlierIso(currentSpecies.firstCaughtAt, nextSpecies.firstCaughtAt),
      lastCaughtAt: laterIso(currentSpecies.lastCaughtAt, nextSpecies.lastCaughtAt),
      firstCatchBonusClaimed: Boolean(currentSpecies.firstCatchBonusClaimed || nextSpecies.firstCatchBonusClaimed),
    }];
  }));
  const pages = COLLECTION_BOOK_PAGES.map((page) => {
    const currentPage = current.pages.find((item) => item.pageId === page.id);
    const nextPage = next.pages.find((item) => item.pageId === page.id);
    return {
      pageId: page.id,
      completed: Boolean(currentPage?.completed || nextPage?.completed || page.fishIds.every((fishId) => species[fishId]?.discovered)),
      claimed: Boolean(currentPage?.claimed || nextPage?.claimed),
    };
  });
  return {
    species,
    pages,
    totalSpeciesCaught: Object.values(species).filter((item) => item.discovered).length,
    totalFirstCatchBonusesClaimed: Object.values(species).filter((item) => item.firstCatchBonusClaimed).length,
  };
}

function mergeRodMastery(currentValue, nextValue) {
  if (!currentValue && !nextValue) return null;
  const current = currentValue && typeof currentValue === 'object' ? currentValue : {};
  const next = nextValue && typeof nextValue === 'object' ? nextValue : {};
  const trackKeys = new Set([
    ...Object.keys(current.tracks || {}),
    ...Object.keys(next.tracks || {}),
  ]);
  const tracks = Object.fromEntries(Array.from(trackKeys).map((key) => {
    const currentTrack = current.tracks?.[key] || {};
    const nextTrack = next.tracks?.[key] || {};
    return [key, {
      ...currentTrack,
      ...nextTrack,
      masteryLevel: Math.max(0, Number(currentTrack.masteryLevel || 0), Number(nextTrack.masteryLevel || 0)),
      masteryPoints: Math.max(0, Number(currentTrack.masteryPoints || 0), Number(nextTrack.masteryPoints || 0)),
      lastUpdatedAt: laterIso(currentTrack.lastUpdatedAt, nextTrack.lastUpdatedAt),
    }];
  }));
  return {
    totalMasteryPoints: Math.max(0, Number(current.totalMasteryPoints || 0), Number(next.totalMasteryPoints || 0)),
    tracks,
  };
}

function mergeDailyFreeBait(currentPlayer, nextPlayer, preferNext = false) {
  if (preferNext) {
    return {
      daily_free_bait: nextPlayer.daily_free_bait,
      daily_free_bait_reset_at: nextPlayer.daily_free_bait_reset_at,
    };
  }

  const currentReset = currentPlayer.daily_free_bait_reset_at || null;
  const nextReset = nextPlayer.daily_free_bait_reset_at || null;
  if (currentReset && nextReset && currentReset === nextReset) {
    return {
      daily_free_bait: Math.min(currentPlayer.daily_free_bait, nextPlayer.daily_free_bait),
      daily_free_bait_reset_at: currentReset,
    };
  }
  if (currentReset && (!nextReset || currentReset > nextReset)) {
    return {
      daily_free_bait: currentPlayer.daily_free_bait,
      daily_free_bait_reset_at: currentReset,
    };
  }
  if (nextReset) {
    return {
      daily_free_bait: nextPlayer.daily_free_bait,
      daily_free_bait_reset_at: nextReset,
    };
  }
  return {
    daily_free_bait: Math.min(currentPlayer.daily_free_bait, nextPlayer.daily_free_bait),
    daily_free_bait_reset_at: null,
  };
}

function mergeGameProgress(currentValue, nextValue, preferNextDaily = false) {
  const current = ensureGameProgress(currentValue);
  const next = ensureGameProgress(nextValue);
  return {
    ...current,
    ...next,
    date: todayKey(),
    weekKey: weekKey(),
    tasks: mergeProgressEntries(current.tasks, next.tasks, DAILY_TASK_TARGETS),
    specialTasks: mergeProgressEntries(current.specialTasks, next.specialTasks, SPECIAL_TASK_TARGETS),
    weeklyMissions: mergeProgressEntries(current.weeklyMissions, next.weeklyMissions, WEEKLY_MISSION_TARGETS),
    lastWeeklyCubeUnlockDate: current.lastWeeklyCubeUnlockDate || next.lastWeeklyCubeUnlockDate || null,
    wheelSpun: preferNextDaily ? Boolean(next.wheelSpun) : Boolean(current.wheelSpun || next.wheelSpun),
    wheelPrize: preferNextDaily ? next.wheelPrize ?? null : current.wheelPrize ?? next.wheelPrize ?? null,
    dailyWheelRolls: preferNextDaily
      ? Math.max(0, Math.floor(Number(next.dailyWheelRolls || 0)))
      : Math.max(0, Math.floor(Number(current.dailyWheelRolls || 0)), Math.floor(Number(next.dailyWheelRolls || 0))),
    dailyRollRewardGranted: preferNextDaily ? Boolean(next.dailyRollRewardGranted) : Boolean(current.dailyRollRewardGranted || next.dailyRollRewardGranted),
    paidWheelRolls: Math.max(0, Math.floor(Number(current.paidWheelRolls || 0)), Math.floor(Number(next.paidWheelRolls || 0))),
    grillScore: Math.max(0, Math.floor(Number(current.grillScore || 0)), Math.floor(Number(next.grillScore || 0))),
    dishesToday: preferNextDaily
      ? Math.max(0, Math.floor(Number(next.dishesToday || 0)))
      : Math.max(0, Math.floor(Number(current.dishesToday || 0)), Math.floor(Number(next.dishesToday || 0))),
    premiumSession: current.premiumSession ?? null,
    fishingNet: preferNextDaily ? next.fishingNet : current.fishingNet?.owned ? current.fishingNet : next.fishingNet,
    collectionBook: mergeCollectionBooks(current.collectionBook, next.collectionBook),
    rodMastery: mergeRodMastery(current.rodMastery, next.rodMastery),
    lastWalletCheckInTxHash: current.lastWalletCheckInTxHash ?? next.lastWalletCheckInTxHash ?? null,
  };
}

function buildGuestMergePatch(walletPlayer, guestPlayer, walletExisted) {
  const preferGuest = !walletExisted;
  const dailyBait = mergeDailyFreeBait(walletPlayer, guestPlayer, preferGuest);
  const guestNickname = typeof guestPlayer.nickname === 'string' ? guestPlayer.nickname.trim() : '';
  const shouldCarryGuestNickname = guestNickname && !isGeneratedGuestNickname(guestNickname);

  return {
    coins: preferGuest ? guestPlayer.coins : Math.max(walletPlayer.coins, guestPlayer.coins),
    bait: preferGuest ? guestPlayer.bait : Math.max(walletPlayer.bait, guestPlayer.bait),
    ...dailyBait,
    bonus_bait_granted_total: preferGuest
      ? guestPlayer.bonus_bait_granted_total
      : Math.max(walletPlayer.bonus_bait_granted_total, guestPlayer.bonus_bait_granted_total),
    level: preferGuest ? guestPlayer.level : Math.max(walletPlayer.level, guestPlayer.level),
    xp: preferGuest ? guestPlayer.xp : Math.max(walletPlayer.xp, guestPlayer.xp),
    xp_to_next: preferGuest ? guestPlayer.xp_to_next : Math.max(walletPlayer.xp_to_next, guestPlayer.xp_to_next),
    rod_level: preferGuest ? guestPlayer.rod_level : Math.max(walletPlayer.rod_level, guestPlayer.rod_level),
    equipped_rod: preferGuest ? guestPlayer.equipped_rod : Math.max(walletPlayer.equipped_rod, guestPlayer.equipped_rod),
    inventory: mergeQuantityStacksBySum(preferGuest ? [] : walletPlayer.inventory, guestPlayer.inventory, 'fishId', 'caughtAt'),
    cooked_dishes: mergeQuantityStacksBySum(preferGuest ? [] : walletPlayer.cooked_dishes, guestPlayer.cooked_dishes, 'recipeId', 'createdAt'),
    game_progress: mergeGameProgress(preferGuest ? {} : walletPlayer.game_progress, guestPlayer.game_progress, preferGuest),
    total_catches: preferGuest ? guestPlayer.total_catches : Math.max(walletPlayer.total_catches, guestPlayer.total_catches),
    login_streak: preferGuest ? guestPlayer.login_streak : Math.max(walletPlayer.login_streak, guestPlayer.login_streak),
    nft_rods: Array.from(new Set([
      ...(Array.isArray(walletPlayer.nft_rods) && !preferGuest ? walletPlayer.nft_rods : []),
      ...(Array.isArray(guestPlayer.nft_rods) ? guestPlayer.nft_rods : []),
    ])).sort((a, b) => Number(a) - Number(b)),
    nickname: walletPlayer.nickname || (shouldCarryGuestNickname ? guestNickname : null),
    avatar_url: walletPlayer.avatar_url || guestPlayer.avatar_url || null,
  };
}

function moveGuestOwnedRowsToWallet(guestPlayer, walletPlayer) {
  const guestWallet = guestPlayer.wallet_address;
  const wallet = walletPlayer.wallet_address;
  db.prepare('UPDATE player_audit_logs SET wallet_address = ? WHERE wallet_address = ?').run(wallet, guestWallet);
  db.prepare('UPDATE player_messages SET player_id = ? WHERE player_id = ?').run(walletPlayer.id, guestPlayer.id);
  db.prepare('UPDATE social_task_verifications SET player_id = ?, wallet_address = ? WHERE player_id = ? OR wallet_address = ?')
    .run(walletPlayer.id, wallet, guestPlayer.id, guestWallet);
  db.prepare('UPDATE player_cube_rolls SET player_id = ?, wallet_address = ? WHERE player_id = ? OR wallet_address = ?')
    .run(walletPlayer.id, wallet, guestPlayer.id, guestWallet);
  db.prepare('UPDATE player_fishing_casts SET player_id = ?, wallet_address = ? WHERE player_id = ? OR wallet_address = ?')
    .run(walletPlayer.id, wallet, guestPlayer.id, guestWallet);

  const guestLeaderboardId = `wallet:${guestWallet}`;
  const walletLeaderboardId = `wallet:${wallet}`;
  const guestEntry = db.prepare('SELECT * FROM grill_leaderboard WHERE id = ?').get(guestLeaderboardId);
  if (guestEntry) {
    const walletEntry = db.prepare('SELECT * FROM grill_leaderboard WHERE id = ?').get(walletLeaderboardId);
    const name = walletPlayer.nickname || guestEntry.name || 'Guest griller';
    const nextScore = Math.max(Number(walletEntry?.score || 0), Number(guestEntry.score || 0));
    const nextDishes = Math.max(Number(walletEntry?.dishes || 0), Number(guestEntry.dishes || 0));
    if (walletEntry) {
      db.prepare('UPDATE grill_leaderboard SET name = ?, score = ?, dishes = ?, wallet_address = ?, updated_at = ? WHERE id = ?')
        .run(name, nextScore, nextDishes, wallet, nowIso(), walletLeaderboardId);
    } else {
      db.prepare('INSERT INTO grill_leaderboard (id, name, score, dishes, wallet_address, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)')
        .run(walletLeaderboardId, name, nextScore, nextDishes, wallet, guestEntry.created_at || nowIso(), nowIso());
    }
    db.prepare('DELETE FROM grill_leaderboard WHERE id = ?').run(guestLeaderboardId);
  }
}

function linkGuestToWallet(guestWalletAddress, walletAddress, walletExisted) {
  const guestWallet = normalizeGuestIdentity(guestWalletAddress);
  const wallet = normalizeWallet(walletAddress);
  if (!guestWallet || !wallet) throw httpError(400, 'Invalid guest or wallet identity');
  if (guestWallet === wallet) throw httpError(400, 'Guest and wallet identities cannot match');

  return withTransaction(() => {
    const existingLink = db.prepare('SELECT * FROM guest_wallet_links WHERE guest_wallet_address = ?').get(guestWallet);
    if (existingLink) {
      if (existingLink.wallet_address !== wallet) {
        throw httpError(409, 'This guest profile is already linked to another wallet');
      }
      return {
        player: getPlayerByWallet(wallet),
        linked: false,
        alreadyLinked: true,
      };
    }

    const guestPlayer = ensurePlayer(guestWallet);
    const walletPlayer = ensurePlayer(wallet);
    const patch = buildGuestMergePatch(walletPlayer, guestPlayer, walletExisted);
    const linkedPlayer = updatePlayer(wallet, patch);
    moveGuestOwnedRowsToWallet(guestPlayer, linkedPlayer);
    db.prepare('INSERT INTO guest_wallet_links (guest_wallet_address, wallet_address, linked_at) VALUES (?, ?, ?)')
      .run(guestWallet, wallet, nowIso());
    const finalPlayer = getPlayerByWallet(wallet);
    addAudit(wallet, 'guest_profile_linked', {
      guestWalletAddress: guestWallet,
      walletExisted,
    }, walletPlayer, finalPlayer);
    return {
      player: finalPlayer,
      linked: true,
      alreadyLinked: false,
    };
  });
}

function addAudit(walletAddress, eventType, metadata = {}, beforeState = {}, afterState = {}, eventSource = 'server') {
  db.prepare(`
    INSERT INTO player_audit_logs
      (id, wallet_address, event_type, event_source, before_state, after_state, delta_state, metadata, created_at)
    VALUES (?, ?, ?, ?, ?, ?, '{}', ?, ?)
  `).run(
    randomUUID(),
    walletAddress,
    eventType,
    String(eventSource || 'server') === 'client' ? 'client' : 'server',
    toJson(beforeState, {}),
    toJson(afterState, {}),
    toJson(metadata, {}),
    nowIso(),
  );
}

const LEGACY_PAYMENT_AUDIT_EVENTS = [
  'coin_purchase_verified',
  'rod_purchase_verified',
  'nft_rod_minted',
  'wallet_check_in',
  'fishing_net_bought_with_mon',
  'cube_rolls_bought_with_mon',
  'premium_session_payment',
];

function findPaymentTxUse(txHash) {
  const normalizedTxHash = normalizeTxHash(txHash);
  if (!normalizedTxHash) return null;

  const premiumSession = db.prepare(`
    SELECT wallet_address, status, started_at FROM premium_fishing_sessions
    WHERE lower(tx_hash) = ?
    LIMIT 1
  `).get(normalizedTxHash);
  if (premiumSession) {
    return {
      source: 'premium_fishing_sessions',
      walletAddress: premiumSession.wallet_address,
      eventType: 'premium_session_payment',
      createdAt: premiumSession.started_at,
    };
  }

  const eventPlaceholders = LEGACY_PAYMENT_AUDIT_EVENTS.map(() => '?').join(', ');
  const auditRows = db.prepare(`
    SELECT wallet_address, event_type, metadata, created_at FROM player_audit_logs
    WHERE event_source = 'server'
      AND event_type IN (${eventPlaceholders})
      AND metadata LIKE ?
    ORDER BY created_at DESC
    LIMIT 250
  `).all(...LEGACY_PAYMENT_AUDIT_EVENTS, `%${normalizedTxHash.slice(2)}%`);

  for (const row of auditRows) {
    const metadata = safeJsonParse(row.metadata, {});
    const metadataTxHash = normalizeTxHash(metadata.txHash || metadata.tx_hash);
    if (metadataTxHash === normalizedTxHash) {
      return {
        source: 'player_audit_logs',
        walletAddress: row.wallet_address,
        eventType: row.event_type,
        createdAt: row.created_at,
      };
    }
  }

  return null;
}

function getPaymentTransaction(txHash) {
  const normalizedTxHash = normalizeTxHash(txHash);
  if (!normalizedTxHash) return null;
  return db.prepare('SELECT * FROM payment_transactions WHERE tx_hash = ?').get(normalizedTxHash);
}

function reservePaymentTx(walletAddress, txHash, purpose, expectedMon, metadata = {}) {
  const wallet = normalizePaymentIdentity(walletAddress);
  if (!wallet) throw httpError(400, 'Invalid payment identity');
  const normalizedTxHash = requireTxHash(txHash);
  const normalizedPurpose = String(purpose || '').trim();
  const normalizedExpectedMon = String(expectedMon || '').trim();
  if (!normalizedPurpose || !normalizedExpectedMon) throw httpError(400, 'Missing payment reservation data');

  const now = nowIso();
  const metadataJson = toJson(metadata, {});
  try {
    db.prepare(`
      INSERT INTO payment_transactions
        (tx_hash, wallet_address, purpose, status, expected_mon, metadata, created_at, updated_at)
      VALUES (?, ?, ?, 'reserved', ?, ?, ?, ?)
    `).run(normalizedTxHash, wallet, normalizedPurpose, normalizedExpectedMon, metadataJson, now, now);
    return {
      txHash: normalizedTxHash,
      status: 'reserved',
      paidMon: null,
    };
  } catch (error) {
    const message = String(error?.message || '');
    if (!/constraint|unique/i.test(message)) throw error;

    const existing = getPaymentTransaction(normalizedTxHash);
    const samePayment = existing
      && existing.wallet_address === wallet
      && existing.purpose === normalizedPurpose
      && String(existing.expected_mon) === normalizedExpectedMon;

    if (samePayment && existing.status === 'verified') {
      return {
        txHash: normalizedTxHash,
        status: 'verified',
        paidMon: Number(existing.paid_mon || 0),
      };
    }

    if (samePayment && existing.status === 'applied') {
      return {
        txHash: normalizedTxHash,
        status: 'applied',
        paidMon: Number(existing.paid_mon || 0),
      };
    }

    if (existing?.status !== 'failed') {
      throw httpError(409, `Transaction already used for ${existing?.purpose || 'another payment'}`);
    }

    db.prepare(`
      UPDATE payment_transactions
      SET wallet_address = ?, purpose = ?, expected_mon = ?, status = 'reserved',
          metadata = ?, error_message = NULL, updated_at = ?, verified_at = NULL, paid_mon = NULL
      WHERE tx_hash = ?
    `).run(wallet, normalizedPurpose, normalizedExpectedMon, metadataJson, now, normalizedTxHash);
    return {
      txHash: normalizedTxHash,
      status: 'reserved',
      paidMon: null,
    };
  }
}

function markPaymentTxVerified(txHash, paidMon) {
  const normalizedTxHash = requireTxHash(txHash);
  const result = db.prepare(`
    UPDATE payment_transactions
    SET status = 'verified', paid_mon = ?, error_message = NULL, updated_at = ?, verified_at = ?
    WHERE tx_hash = ? AND status = 'reserved'
  `).run(Number(paidMon || 0), nowIso(), nowIso(), normalizedTxHash);
  if (result.changes !== 1) {
    const existing = getPaymentTransaction(normalizedTxHash);
    if (existing?.status === 'verified') return;
    throw httpError(409, `Transaction is already ${existing?.status || 'unavailable'}`);
  }
}

function markPaymentTxFailed(txHash, error) {
  const normalizedTxHash = normalizeTxHash(txHash);
  if (!normalizedTxHash) return;
  db.prepare(`
    UPDATE payment_transactions
    SET status = 'failed', error_message = ?, updated_at = ?
    WHERE tx_hash = ? AND status = 'reserved'
  `).run(error instanceof Error ? error.message : String(error || 'Payment verification failed'), nowIso(), normalizedTxHash);
}

function markPaymentTxApplied(txHash) {
  const normalizedTxHash = normalizeTxHash(txHash);
  if (!normalizedTxHash) return;
  db.prepare(`
    UPDATE payment_transactions
    SET status = 'applied', error_message = NULL, updated_at = ?
    WHERE tx_hash = ? AND status = 'verified'
  `).run(nowIso(), normalizedTxHash);
}

async function verifyPaymentWithLedger(walletAddress, txHash, expectedMon, purpose, metadata = {}) {
  const reservation = reservePaymentTx(walletAddress, txHash, purpose, expectedMon, metadata);
  const normalizedTxHash = reservation.txHash;
  if (reservation.status === 'applied') {
    return { paidMon: reservation.paidMon, txHash: normalizedTxHash, alreadyApplied: true };
  }

  const legacyUse = findPaymentTxUse(normalizedTxHash);
  if (legacyUse) {
    if (reservation.status === 'reserved') {
      markPaymentTxFailed(normalizedTxHash, `Transaction already used for ${legacyUse.eventType}`);
    } else if (reservation.status === 'verified') {
      markPaymentTxApplied(normalizedTxHash);
      return { paidMon: reservation.paidMon, txHash: normalizedTxHash, alreadyApplied: true };
    }
    throw httpError(409, `Transaction already used for ${legacyUse.eventType}`);
  }

  if (reservation.status === 'verified') {
    return { paidMon: reservation.paidMon, txHash: normalizedTxHash };
  }

  try {
    const payment = await verifyPaymentTx(walletAddress, normalizedTxHash, expectedMon);
    markPaymentTxVerified(normalizedTxHash, payment.paidMon);
    return payment;
  } catch (error) {
    markPaymentTxFailed(normalizedTxHash, error);
    throw error;
  }
}

function applyVerifiedPaymentTx(txHash, purpose, callback, onAlreadyApplied = null) {
  const normalizedTxHash = requireTxHash(txHash);
  const normalizedPurpose = String(purpose || '').trim();
  if (!normalizedPurpose) throw httpError(400, 'Missing payment application purpose');

  return withTransaction(() => {
    const payment = getPaymentTransaction(normalizedTxHash);
    if (!payment) throw httpError(409, 'Payment transaction was not reserved');
    if (payment.purpose !== normalizedPurpose) {
      throw httpError(409, `Transaction already used for ${payment.purpose || 'another payment'}`);
    }
    if (payment.status === 'applied') {
      if (typeof onAlreadyApplied === 'function') return onAlreadyApplied(payment);
      throw httpError(409, 'Transaction already applied');
    }
    if (payment.status !== 'verified') {
      throw httpError(409, `Transaction is ${payment.status || 'not verified'}`);
    }

    const result = callback(payment);
    const updated = db.prepare(`
      UPDATE payment_transactions
      SET status = 'applied', error_message = NULL, updated_at = ?
      WHERE tx_hash = ? AND purpose = ? AND status = 'verified'
    `).run(nowIso(), normalizedTxHash, normalizedPurpose);
    if (updated.changes !== 1) throw httpError(409, 'Payment transaction changed while applying');
    return result;
  });
}

function isAppliedPaymentTx(walletAddress, txHash, purpose, expectedMon) {
  const wallet = normalizePaymentIdentity(walletAddress);
  const payment = getPaymentTransaction(txHash);
  return Boolean(payment
    && wallet
    && payment.wallet_address === wallet
    && payment.purpose === purpose
    && String(payment.expected_mon) === String(expectedMon)
    && payment.status === 'applied');
}

function createProgressEntries(targets, seed = {}) {
  return Object.fromEntries(Object.keys(targets).map((id) => {
    const current = seed && typeof seed === 'object' ? seed[id] : null;
    const progress = Math.max(0, Math.min(targets[id], Math.floor(Number(current?.progress || 0))));
    return [id, {
      progress,
      claimed: Boolean(current?.claimed),
    }];
  }));
}

function ensureGameProgress(progressValue) {
  const current = progressValue && typeof progressValue === 'object' ? progressValue : {};
  const currentDate = todayKey();
  const currentWeek = weekKey();
  const sameDay = current.date === currentDate;
  const sameWeek = current.weekKey === currentWeek;
  const tasks = createProgressEntries(DAILY_TASK_TARGETS, sameDay ? current.tasks : {});
  tasks.check_in.progress = Math.max(tasks.check_in.progress, 1);

  return {
    ...current,
    date: currentDate,
    weekKey: currentWeek,
    tasks,
    specialTasks: createProgressEntries(SPECIAL_TASK_TARGETS, sameDay ? current.specialTasks : {}),
    weeklyMissions: createProgressEntries(WEEKLY_MISSION_TARGETS, sameWeek ? current.weeklyMissions : {}),
    lastWeeklyCubeUnlockDate: sameWeek ? current.lastWeeklyCubeUnlockDate ?? null : null,
    wheelSpun: sameDay ? Boolean(current.wheelSpun) : false,
    wheelPrize: sameDay ? current.wheelPrize ?? null : null,
    dailyWheelRolls: sameDay ? Math.max(0, Math.floor(Number(current.dailyWheelRolls || 0))) : 0,
    dailyRollRewardGranted: sameDay ? Boolean(current.dailyRollRewardGranted) : false,
    paidWheelRolls: Math.max(0, Math.floor(Number(current.paidWheelRolls || 0))),
    grillScore: Math.max(0, Math.floor(Number(current.grillScore || 0))),
    dishesToday: sameDay ? Math.max(0, Math.floor(Number(current.dishesToday || 0))) : 0,
    premiumSession: current.premiumSession ?? null,
    fishingNet: ensureFishingNetState(current.fishingNet, currentDate),
    collectionBook: current.collectionBook ?? null,
    rodMastery: current.rodMastery ?? null,
    lastWalletCheckInTxHash: current.lastWalletCheckInTxHash ?? null,
  };
}

function chooseFishForNet() {
  const totalChance = FISH_DATA.reduce((sum, fish) => sum + Number(fish.chance || 0), 0);
  let roll = Math.random() * totalChance;
  for (const fish of FISH_DATA) {
    roll -= Number(fish.chance || 0);
    if (roll <= 0) return fish;
  }
  return FISH_DATA[0];
}

function rollFishingNetCatch(dailyFishCount) {
  const quantities = new Map();
  const rolls = Math.max(1, Math.floor(Number(dailyFishCount || 0)));
  for (let index = 0; index < rolls; index += 1) {
    const fish = chooseFishForNet();
    quantities.set(fish.id, (quantities.get(fish.id) || 0) + 1);
  }
  return Array.from(quantities.entries()).map(([fishId, quantity]) => ({ fishId, quantity }));
}

function sanitizeFishingNet(value) {
  if (!value || typeof value !== 'object' || !value.owned) {
    return {
      owned: false,
      dailyFishCount: 0,
      purchasedAt: null,
      readyDate: null,
    lastCollectedDate: null,
    lastNotificationDate: null,
    pendingCatch: [],
    txHash: null,
  };
  }

  const pendingCatch = Array.isArray(value.pendingCatch)
    ? value.pendingCatch.flatMap((item) => {
      const fishId = typeof item?.fishId === 'string' && FISH_BY_ID.has(item.fishId) ? item.fishId : null;
      const quantity = Math.max(0, Math.floor(Number(item?.quantity || 0)));
      return fishId && quantity > 0 ? [{ fishId, quantity }] : [];
    })
    : [];

  return {
    owned: true,
    dailyFishCount: Math.max(1, Math.floor(Number(value.dailyFishCount || 10))),
    purchasedAt: typeof value.purchasedAt === 'string' ? value.purchasedAt : nowIso(),
    readyDate: typeof value.readyDate === 'string' ? value.readyDate : null,
    lastCollectedDate: typeof value.lastCollectedDate === 'string' ? value.lastCollectedDate : null,
    lastNotificationDate: typeof value.lastNotificationDate === 'string' ? value.lastNotificationDate : null,
    pendingCatch,
    txHash: normalizeTxHash(value.txHash) || null,
  };
}

function ensureFishingNetState(value, currentDate = todayKey()) {
  const net = sanitizeFishingNet(value);
  if (!net.owned) return net;
  if (net.pendingCatch.length > 0 || net.lastCollectedDate === currentDate) return net;

  return {
    ...net,
    readyDate: currentDate,
    lastNotificationDate: null,
    pendingCatch: rollFishingNetCatch(net.dailyFishCount),
  };
}

function countClaimedDailyTasks(progress) {
  return Object.values(progress.tasks || {}).filter((task) => task.claimed).length;
}

function incrementProgressEntry(entries, targets, id, amount = 1) {
  if (!entries?.[id] || entries[id].claimed || amount <= 0) return;
  entries[id] = {
    ...entries[id],
    progress: Math.min(targets[id], Math.max(0, Number(entries[id].progress || 0) + amount)),
  };
}

function updateGameProgress(player, updater) {
  const progress = ensureGameProgress(player.game_progress);
  const nextProgress = ensureGameProgress(updater(progress) || progress);
  return {
    progress: nextProgress,
    patch: { game_progress: nextProgress },
  };
}

function progressFishingCatch(player, fish) {
  return updateGameProgress(player, (progress) => {
    incrementProgressEntry(progress.tasks, DAILY_TASK_TARGETS, 'catch_10', 1);
    incrementProgressEntry(progress.weeklyMissions, WEEKLY_MISSION_TARGETS, 'catch_60_fish', 1);
    if (RARE_TASK_RARITIES.has(fish.rarity)) {
      incrementProgressEntry(progress.tasks, DAILY_TASK_TARGETS, 'rare_1', 1);
      incrementProgressEntry(progress.weeklyMissions, WEEKLY_MISSION_TARGETS, 'catch_6_rare', 1);
    }
    return progress;
  });
}

function progressCoinsSpent(player, amount) {
  return updateGameProgress(player, (progress) => {
    incrementProgressEntry(progress.tasks, DAILY_TASK_TARGETS, 'spend_1000', amount);
    return progress;
  });
}

function progressGrillCook(player, score) {
  return updateGameProgress(player, (progress) => {
    incrementProgressEntry(progress.tasks, DAILY_TASK_TARGETS, 'grill_1', 1);
    incrementProgressEntry(progress.weeklyMissions, WEEKLY_MISSION_TARGETS, 'cook_5_dishes', 1);
    progress.grillScore = Math.max(0, Number(progress.grillScore || 0)) + Math.max(0, Number(score || 0));
    progress.dishesToday = Math.max(0, Number(progress.dishesToday || 0)) + 1;
    return progress;
  });
}

function progressDishSold(player) {
  return updateGameProgress(player, (progress) => {
    incrementProgressEntry(progress.weeklyMissions, WEEKLY_MISSION_TARGETS, 'sell_3_dishes', 1);
    return progress;
  });
}

function progressPremiumSessionCompleted(player) {
  return updateGameProgress(player, (progress) => {
    incrementProgressEntry(progress.weeklyMissions, WEEKLY_MISSION_TARGETS, 'complete_1_premium_session', 1);
    return progress;
  });
}

function progressSpecialTask(player, taskId, metadata = {}) {
  return updateGameProgress(player, (progress) => {
    incrementProgressEntry(progress.specialTasks, SPECIAL_TASK_TARGETS, taskId, 1);
    if (taskId === 'wallet_check_in') {
      progress.lastWalletCheckInTxHash = metadata.txHash || progress.lastWalletCheckInTxHash;
    }
    return progress;
  });
}

function claimProgressReward(player, taskId) {
  return withTransaction(() => {
    const currentPlayer = getPlayerByWallet(player.wallet_address) || player;
    const isDaily = Object.prototype.hasOwnProperty.call(DAILY_TASK_TARGETS, taskId);
    const isSpecial = Object.prototype.hasOwnProperty.call(SPECIAL_TASK_TARGETS, taskId);
    const isWeekly = Object.prototype.hasOwnProperty.call(WEEKLY_MISSION_TARGETS, taskId);
    if (!isDaily && !isSpecial && !isWeekly) throw httpError(400, 'Unknown task');

    const progress = ensureGameProgress(currentPlayer.game_progress);
    const bucket = isWeekly ? progress.weeklyMissions : isSpecial ? progress.specialTasks : progress.tasks;
    const targets = isWeekly ? WEEKLY_MISSION_TARGETS : isSpecial ? SPECIAL_TASK_TARGETS : DAILY_TASK_TARGETS;
    const entry = bucket[taskId];
    if (!entry || entry.claimed || Number(entry.progress || 0) < targets[taskId]) {
      throw httpError(400, isWeekly ? 'Weekly mission is not ready to claim' : 'Task is not ready to claim');
    }

    bucket[taskId] = { ...entry, claimed: true };
    const reward = TASK_REWARDS[taskId] || {};
    const patch = {
      coins: Number(currentPlayer.coins || 0) + Number(reward.coins || 0),
      bait: Number(currentPlayer.bait || 0) + Number(reward.bait || 0),
    };

    if (isDaily && countClaimedDailyTasks(progress) >= DAILY_CLAIMS_FOR_CUBE && !progress.dailyRollRewardGranted) {
      progress.dailyWheelRolls = Number(progress.dailyWheelRolls || 0) + DAILY_CUBE_ROLL_REWARD;
      progress.dailyRollRewardGranted = true;
      if (progress.lastWeeklyCubeUnlockDate !== progress.date) {
        incrementProgressEntry(progress.weeklyMissions, WEEKLY_MISSION_TARGETS, 'cube_3_days', 1);
        progress.lastWeeklyCubeUnlockDate = progress.date;
      }
    }

    if (reward.cubeCharge) {
      progress.dailyWheelRolls = Number(progress.dailyWheelRolls || 0) + Number(reward.cubeCharge || 0);
    }

    patch.game_progress = progress;
    const updated = updatePlayer(currentPlayer.wallet_address, patch);
    addAudit(currentPlayer.wallet_address, isWeekly ? 'weekly_mission_claimed' : 'task_claimed', { taskId, reward }, currentPlayer, updated);
    return updated;
  });
}

function httpError(status, message) {
  return Object.assign(new Error(message), { status });
}

function base64Url(input) {
  return Buffer.from(input).toString('base64url');
}

function readSessionToken(token) {
  if (typeof token !== 'string') return null;
  const [payload, signature] = token.split('.');
  if (!payload || !signature) return null;
  const expected = createHmac('sha256', SESSION_SECRET).update(payload).digest('base64url');
  if (expected !== signature) return null;
  try {
    const parsed = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8'));
    if (typeof parsed.exp !== 'number' || parsed.exp <= Date.now()) return null;
    if (typeof parsed.sub !== 'string' || !parsed.sub.trim()) return null;
    return {
      sub: parsed.sub.toLowerCase(),
      exp: parsed.exp,
      typ: typeof parsed.typ === 'string' ? parsed.typ : 'wallet',
    };
  } catch {
    return null;
  }
}

function createSessionToken(walletAddress, expiresAt = Date.now() + TOKEN_TTL_MS, type = 'wallet') {
  const encodedPayload = base64Url(JSON.stringify({ sub: walletAddress.toLowerCase(), exp: expiresAt, typ: type }));
  const signature = createHmac('sha256', SESSION_SECRET).update(encodedPayload).digest('base64url');
  return `${encodedPayload}.${signature}`;
}

function verifySessionToken(token, walletAddress, type = null) {
  const parsed = readSessionToken(token);
  if (!parsed) return false;
  return parsed.sub === walletAddress.toLowerCase() && (!type || parsed.typ === type);
}

function safeCompare(value, expected) {
  const left = Buffer.from(String(value || ''));
  const right = Buffer.from(String(expected || ''));
  return left.length === right.length && timingSafeEqual(left, right);
}

function createCastResolveToken() {
  return `${randomUUID()}.${randomUUID()}`;
}

function hashCastResolveToken(walletAddress, castId, token) {
  const wallet = normalizePlayerIdentity(walletAddress) || '';
  return createHmac('sha256', SESSION_SECRET)
    .update(`${wallet}:${castId}:${String(token || '')}`)
    .digest('base64url');
}

function verifyCastResolveToken(row, token) {
  if (!row.resolve_token_hash) return true;
  if (typeof token !== 'string' || !token.trim()) return false;
  return safeCompare(hashCastResolveToken(row.wallet_address, row.id, token.trim()), row.resolve_token_hash);
}

function requireWalletSession(body) {
  const wallet = normalizePlayerIdentity(body.wallet_address || body.walletAddress);
  if (!wallet) throw httpError(400, 'Invalid player identity');
  if (!verifySessionToken(body.session_token, wallet)) throw httpError(401, 'Invalid session');
  const session = readSessionToken(body.session_token);
  if (session?.typ === 'guest' && getGuestWalletLink(wallet)) {
    throw httpError(409, 'This guest profile is already linked to a wallet. Start a new guest session or connect that wallet.');
  }
  const player = ensurePlayer(wallet);
  return {
    ...player,
    session_type: session?.typ === 'guest' ? 'guest' : 'wallet',
  };
}

function requireRealWalletPlayer(player, message = 'Connect a verified wallet for this action') {
  if (isGuestPlayer(player) || player.session_type === 'guest') {
    throw httpError(403, message);
  }
}

function requireRealWalletOrMonadTestPlayer(player, message = 'Connect a verified wallet for this action') {
  if (MONAD_SHOP_TEST_MODE_ENABLED) return;
  requireRealWalletPlayer(player, message);
}

function consumeRateLimit(actionKey, subjectKey, windowSeconds, maxHits) {
  const started = new Date(Math.floor(Date.now() / (windowSeconds * 1000)) * windowSeconds * 1000).toISOString();
  const now = nowIso();
  const row = db.prepare('SELECT hit_count FROM edge_rate_limits WHERE action_key = ? AND subject_key = ? AND window_started_at = ?')
    .get(actionKey, subjectKey, started);
  const hitCount = row ? row.hit_count + 1 : 1;
  if (row) {
    db.prepare('UPDATE edge_rate_limits SET hit_count = ?, updated_at = ? WHERE action_key = ? AND subject_key = ? AND window_started_at = ?')
      .run(hitCount, now, actionKey, subjectKey, started);
  } else {
    db.prepare('INSERT INTO edge_rate_limits (action_key, subject_key, window_started_at, hit_count, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)')
      .run(actionKey, subjectKey, started, hitCount, now, now);
  }
  if (hitCount > maxHits) throw httpError(429, 'Too many requests. Please wait a moment and try again.');
}

async function readJson(req) {
  let raw = '';
  for await (const chunk of req) {
    raw += chunk;
    if (raw.length > 8_000_000) throw httpError(413, 'Request body too large');
  }
  if (!raw) return {};
  try {
    return JSON.parse(raw);
  } catch {
    throw httpError(400, 'Invalid JSON body');
  }
}

function sendJson(res, status, payload, headers = {}) {
  res.writeHead(status, {
    'Content-Type': 'application/json',
    'Cache-Control': 'no-store',
    ...headers,
  });
  res.end(JSON.stringify(payload));
}

function sendText(res, status, text) {
  res.writeHead(status, { 'Content-Type': 'text/plain; charset=utf-8', 'Cache-Control': 'no-store' });
  res.end(text);
}

function edgeResponse(payload) {
  return payload;
}

async function verifyWallet(body) {
  const wallet = normalizeWallet(body.wallet_address);
  if (!wallet) throw httpError(400, 'Invalid wallet address');
  consumeRateLimit('verify_wallet', wallet, 60, 24);

  if (body.session_token) {
    if (!verifySessionToken(body.session_token, wallet)) throw httpError(401, 'Invalid session');
  } else {
    if (!body.signature || !body.message) throw httpError(400, 'Missing signature or message');
    const recovered = await recoverAddress({
      hash: hashMessage(String(body.message)),
      signature: String(body.signature),
    });
    if (recovered.toLowerCase() !== wallet) throw httpError(401, 'Signature does not match wallet');
  }

  const beforePlayer = getPlayerByWallet(wallet);
  let player = ensurePlayer(wallet);
  let linkedGuestId = null;
  const guestLinkId = normalizeGuestIdentity(body.guest_id || body.guest_wallet_address || body.guestWalletAddress);
  const guestLinkToken = typeof body.guest_session_token === 'string'
    ? body.guest_session_token
    : typeof body.guest_token === 'string'
      ? body.guest_token
      : null;

  if (guestLinkId || guestLinkToken) {
    if (!guestLinkId || !guestLinkToken) throw httpError(400, 'Guest link requires guest id and guest session token');
    if (!verifySessionToken(guestLinkToken, guestLinkId, 'guest')) throw httpError(401, 'Invalid guest session');
    const linkResult = linkGuestToWallet(guestLinkId, wallet, Boolean(beforePlayer));
    player = linkResult.player || getPlayerByWallet(wallet);
    linkedGuestId = linkResult.linked || linkResult.alreadyLinked ? guestLinkId : null;
  }

  const referrer = normalizeWallet(body.referrer_wallet_address);
  if (referrer && referrer !== wallet && !player.referrer_wallet_address) {
    const inviter = ensurePlayer(referrer);
    updatePlayer(wallet, { referrer_wallet_address: referrer, referral_reward_granted: true });
    if (inviter.rewarded_referral_count < MAX_REWARDED_REFERRALS) {
      const referralProgressUpdate = progressSpecialTask(inviter, 'invite_friend');
      updatePlayer(referrer, {
        ...referralProgressUpdate.patch,
        bait: inviter.bait + REFERRAL_BAIT_BONUS,
        rewarded_referral_count: inviter.rewarded_referral_count + 1,
        bonus_bait_granted_total: inviter.bonus_bait_granted_total + REFERRAL_BAIT_BONUS,
      });
      addAudit(referrer, 'referral_bait_reward', {
        invitedWalletAddress: wallet,
        rewardBait: REFERRAL_BAIT_BONUS,
      }, inviter, getPlayerByWallet(referrer));
    }
    player = getPlayerByWallet(wallet);
  }

  if (!beforePlayer) addAudit(wallet, 'wallet_created', {}, {}, player);

  return edgeResponse({
    player,
    isNew: !beforePlayer,
    session_token: createSessionToken(wallet, Date.now() + TOKEN_TTL_MS, 'wallet'),
    linked_guest_id: linkedGuestId,
    latest_referral_reward: null,
  });
}

async function guestSession(body) {
  const requestedGuest = normalizeGuestIdentity(body.guest_id || body.wallet_address || body.walletAddress);
  const requestedToken = typeof body.session_token === 'string' ? body.session_token : null;

  let guestId = requestedGuest;
  if (guestId && requestedToken && !verifySessionToken(requestedToken, guestId, 'guest')) {
    guestId = null;
  }
  if (guestId && getGuestWalletLink(guestId)) {
    guestId = null;
  }

  if (!guestId) {
    guestId = createGuestIdentity();
  }

  const player = ensurePlayer(guestId);
  return edgeResponse({
    guest_id: guestId,
    player,
    session_token: createSessionToken(guestId, Date.now() + TOKEN_TTL_MS, 'guest'),
  });
}

function savePlayerProgress(body) {
  const player = requireWalletSession(body);
  const data = body.player_data && typeof body.player_data === 'object' ? body.player_data : {};
  const patch = {};
  for (const [key, value] of Object.entries(data)) {
    if (['nickname', 'avatar_url'].includes(key)) {
      patch[key] = value;
    }
  }
  if (data.rod_mastery) {
    const currentProgress = ensureGameProgress(player.game_progress);
    patch.game_progress = {
      ...currentProgress,
      rodMastery: data.rod_mastery ?? currentProgress.rodMastery,
    };
  }
  if (body.game_progress && typeof body.game_progress === 'object') {
    const currentProgress = ensureGameProgress(player.game_progress);
    const incomingProgress = body.game_progress;
    patch.game_progress = {
      ...currentProgress,
      rodMastery: patch.game_progress?.rodMastery ?? incomingProgress.rodMastery ?? currentProgress.rodMastery,
      fishingNet: currentProgress.fishingNet ?? incomingProgress.fishingNet ?? null,
      ...(patch.game_progress || {}),
    };
  }
  const updated = updatePlayer(player.wallet_address, patch);
  return edgeResponse({ player: updated });
}

function savePlayerName(body) {
  const player = requireWalletSession(body);
  const nickname = typeof body.nickname === 'string' ? body.nickname.trim().slice(0, 20) : '';
  if (!nickname) throw httpError(400, 'Missing nickname');
  const updated = updatePlayer(player.wallet_address, { nickname });
  db.prepare('UPDATE grill_leaderboard SET name = ?, updated_at = ? WHERE id = ?')
    .run(nickname, nowIso(), `wallet:${player.wallet_address}`);
  return edgeResponse({ player: updated });
}

async function rpcCall(method, params) {
  const response = await fetch(MONAD_RPC_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ jsonrpc: '2.0', id: 1, method, params }),
  });
  if (!response.ok) throw new Error(`RPC request failed: ${response.status}`);
  const payload = await response.json();
  if (payload.error) throw new Error(payload.error.message || 'RPC error');
  return payload.result;
}

async function verifyPaymentTx(walletAddress, txHash, expectedMon) {
  const normalizedTxHash = requireTxHash(txHash);
  if (ALLOW_UNVERIFIED_PAYMENTS) return { paidMon: Number(expectedMon) || 0, txHash: normalizedTxHash };
  const receipt = await rpcCall('eth_getTransactionReceipt', [normalizedTxHash]);
  if (!receipt) throw httpError(202, 'Transaction pending, try again later');
  if (receipt.status !== '0x1') throw httpError(400, 'Transaction failed on-chain');
  const tx = await rpcCall('eth_getTransactionByHash', [normalizedTxHash]);
  if (!tx) throw httpError(400, 'Cannot fetch transaction details');
  if (tx.from?.toLowerCase() !== walletAddress.toLowerCase()) throw httpError(403, 'Transaction sender mismatch');
  if (tx.to?.toLowerCase() !== RECEIVER_ADDRESS) throw httpError(400, 'Wrong recipient address');
  const value = BigInt(tx.value);
  const expectedWei = BigInt(Math.round(Number(expectedMon) * 1e18));
  if (value < (expectedWei * 99n / 100n)) throw httpError(400, 'Insufficient payment amount');
  return { paidMon: Number(value) / 1e18, txHash: normalizedTxHash };
}

async function verifyPurchase(body) {
  const player = requireWalletSession(body);
  requireRealWalletOrMonadTestPlayer(player, 'Connect a verified wallet to verify purchases.');
  const wallet = player.wallet_address;
  const txHash = requireTxHash(body.tx_hash);
  const rodLevel = Number.isInteger(body.rod_level) ? Number(body.rod_level) : null;
  const rodPurchaseLevel = Number.isInteger(body.rod_purchase_level) ? Number(body.rod_purchase_level) : null;
  const nftCosts = { 0: '1', 1: '3', 2: '5', 3: '10', 4: '25' };
  const rodCosts = { 1: '3', 2: '10', 3: '25' };
  const expectedMon = rodLevel !== null ? nftCosts[rodLevel] : rodPurchaseLevel !== null ? rodCosts[rodPurchaseLevel] : String(body.expected_mon || '0');
  if (!expectedMon) throw httpError(400, 'Missing required fields');
  const purchasePurpose = rodLevel !== null
    ? 'nft_rod_mint'
    : rodPurchaseLevel !== null
      ? 'mon_rod_purchase'
      : 'coin_purchase';
  const alreadyAppliedPurchaseResponse = (paidMon = 0) => {
    const currentPlayer = getPlayerByWallet(wallet) || player;
    if (rodLevel !== null) {
      return edgeResponse({ success: true, player: currentPlayer, nft_rods: currentPlayer.nft_rods || [], rod_level: rodLevel, already_applied: true });
    }
    if (rodPurchaseLevel !== null) {
      return edgeResponse({ success: true, player: currentPlayer, rod_level: currentPlayer.rod_level, equipped_rod: currentPlayer.equipped_rod, already_applied: true });
    }
    return edgeResponse({
      success: true,
      player: currentPlayer,
      coins_credited: Math.floor(Number(paidMon || 0) * 1000),
      already_applied: true,
    });
  };
  const payment = await verifyPaymentWithLedger(wallet, txHash, expectedMon, purchasePurpose, {
    rodLevel,
    rodPurchaseLevel,
  });

  if (payment.alreadyApplied) {
    return alreadyAppliedPurchaseResponse(payment.paidMon);
  }

  return applyVerifiedPaymentTx(payment.txHash, purchasePurpose, () => {
    const currentPlayer = getPlayerByWallet(wallet) || player;

    if (rodLevel !== null) {
      const rods = Array.isArray(currentPlayer.nft_rods) ? currentPlayer.nft_rods : [];
      const next = Array.from(new Set([...rods, rodLevel])).sort((a, b) => a - b);
      const updated = updatePlayer(wallet, { nft_rods: next });
      addAudit(wallet, 'nft_rod_minted', { txHash: payment.txHash, rodLevel }, currentPlayer, updated);
      return edgeResponse({ success: true, player: updated, nft_rods: next, rod_level: rodLevel });
    }

    if (rodPurchaseLevel !== null) {
      const nextRod = Math.max(currentPlayer.rod_level || 0, rodPurchaseLevel);
      const nextEquipped = Math.max(currentPlayer.equipped_rod || 0, nextRod);
      const updated = updatePlayer(wallet, { rod_level: nextRod, equipped_rod: nextEquipped });
      addAudit(wallet, 'rod_purchase_verified', { txHash: payment.txHash, rodLevel: nextRod }, currentPlayer, updated);
      return edgeResponse({ success: true, player: updated, rod_level: nextRod, equipped_rod: nextEquipped });
    }

    const coinsCredited = Math.floor(payment.paidMon * 1000);
    const updated = updatePlayer(wallet, { coins: Number(currentPlayer.coins || 0) + coinsCredited });
    addAudit(wallet, 'coin_purchase_verified', { txHash: payment.txHash, coinsCredited, paidMon: payment.paidMon }, currentPlayer, updated);
    return edgeResponse({ success: true, player: updated, coins_credited: coinsCredited });
  }, (paymentRow) => alreadyAppliedPurchaseResponse(paymentRow.paid_mon));
}

function getWalletCheckInSummary(walletAddress) {
  const logs = db.prepare(`
    SELECT metadata, created_at FROM player_audit_logs
    WHERE wallet_address = ? AND event_type = 'wallet_check_in'
    ORDER BY created_at DESC LIMIT 14
  `).all(walletAddress);
  const today = todayKey();
  const latest = logs[0];
  const latestMeta = latest ? safeJsonParse(latest.metadata, {}) : {};
  const latestDate = latestMeta.checkInDate || (latest?.created_at || '').slice(0, 10) || null;
  let streak = 0;
  let cursor = today;
  const dates = new Set(logs.map((row) => safeJsonParse(row.metadata, {}).checkInDate || row.created_at.slice(0, 10)));
  while (dates.has(cursor)) {
    streak += 1;
    const prev = new Date(`${cursor}T00:00:00.000Z`);
    prev.setUTCDate(prev.getUTCDate() - 1);
    cursor = todayKey(prev);
  }
  return {
    todayCheckedIn: latestDate === today,
    streakDays: streak,
    lastCheckInAt: latest?.created_at ?? null,
    lastCheckInDate: latestDate,
    lastCheckInTxHash: latestMeta.txHash ?? null,
    receiverAddress: RECEIVER_ADDRESS,
    amountMon: WALLET_CHECK_IN_COST_MON,
    source: 'server',
  };
}

function activePremiumSession(walletAddress) {
  const row = db.prepare('SELECT * FROM premium_fishing_sessions WHERE wallet_address = ? AND status = ? ORDER BY started_at DESC LIMIT 1')
    .get(walletAddress, 'active');
  return row || null;
}

function premiumSessionByTxHash(walletAddress, txHash) {
  const wallet = normalizeWallet(walletAddress);
  const normalizedTxHash = normalizeTxHash(txHash);
  if (!wallet || !normalizedTxHash) return null;
  return db.prepare('SELECT * FROM premium_fishing_sessions WHERE wallet_address = ? AND lower(tx_hash) = ? ORDER BY started_at DESC LIMIT 1')
    .get(wallet, normalizedTxHash) || null;
}

function premiumSessionState(row) {
  if (!row) {
    return {
      sessionId: null,
      status: 'idle',
      priceMon: PREMIUM_SESSION_COST_MON,
      castsTotal: PREMIUM_SESSION_CASTS,
      castsUsed: 0,
      castsRemaining: 0,
      recoveredMon: 0,
      luckMeterStacks: 0,
      zeroDropStreak: 0,
      guaranteedRewardTier: null,
      rescueEligible: false,
      lastDropTier: null,
      lastCastAt: null,
    };
  }
  const lastCast = db.prepare('SELECT mon_drop_tier, created_at FROM premium_fishing_casts WHERE session_id = ? ORDER BY created_at DESC LIMIT 1').get(row.id);
  return {
    sessionId: row.id,
    status: row.status,
    priceMon: String(row.price_mon || PREMIUM_SESSION_COST_MON),
    castsTotal: row.casts_total,
    castsUsed: row.casts_used,
    castsRemaining: Math.max(0, row.casts_total - row.casts_used),
    recoveredMon: row.recovered_mon_total,
    luckMeterStacks: row.luck_meter_stacks,
    zeroDropStreak: row.zero_drop_streak,
    guaranteedRewardTier: row.zero_drop_streak >= 4 ? 'small' : null,
    rescueEligible: Boolean(row.rescue_eligible),
    lastDropTier: lastCast?.mon_drop_tier ?? null,
    lastCastAt: lastCast?.created_at ?? null,
  };
}

function getMonRewardBySource(walletAddress, sourceType, sourceRef) {
  const wallet = normalizeWallet(walletAddress);
  const normalizedSourceType = String(sourceType || '').trim();
  const normalizedSourceRef = sourceRef == null ? '' : String(sourceRef).trim();
  if (!wallet || !normalizedSourceType || !normalizedSourceRef) return null;
  return db.prepare(`
    SELECT * FROM player_mon_rewards
    WHERE wallet_address = ? AND source_type = ? AND source_ref = ?
    LIMIT 1
  `).get(wallet, normalizedSourceType, normalizedSourceRef) || null;
}

function insertMonReward(player, amountMon, sourceType, sourceRef, createdByWallet = null, adminNote = null) {
  const normalizedSourceType = String(sourceType || '').trim();
  const normalizedSourceRef = sourceRef == null ? null : String(sourceRef).trim();
  if (normalizedSourceRef) {
    const existing = getMonRewardBySource(player.wallet_address, normalizedSourceType, normalizedSourceRef);
    if (existing) return existing;
  }

  const holdUntil = new Date(Date.now() + MON_HOLD_DAYS * 24 * 60 * 60 * 1000).toISOString();
  const id = randomUUID();
  try {
    db.prepare(`
      INSERT INTO player_mon_rewards
        (id, player_id, wallet_address, amount_mon, source_type, source_ref, hold_until, created_by_wallet, admin_note, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(id, player.id, player.wallet_address, amountMon, normalizedSourceType, normalizedSourceRef, holdUntil, createdByWallet, adminNote, nowIso());
  } catch (error) {
    const message = String(error?.message || '');
    if (!/constraint|unique/i.test(message) || !normalizedSourceRef) throw error;
    const existing = getMonRewardBySource(player.wallet_address, normalizedSourceType, normalizedSourceRef);
    if (existing) return existing;
    throw error;
  }
  return db.prepare('SELECT * FROM player_mon_rewards WHERE id = ?').get(id);
}

function getWheelPrizesForPlayer(player) {
  if (!isGuestPlayer(player) || MONAD_SHOP_TEST_MODE_ENABLED) return WHEEL_PRIZES;
  return WHEEL_PRIZES.filter((prize) => prize.type !== 'mon');
}

function generateCubeRoll(player) {
  const wheelPrizes = getWheelPrizesForPlayer(player);
  const faces = Array.from({ length: 6 }, () => (
    Array.from({ length: 25 }, () => ({ ...wheelPrizes[Math.floor(Math.random() * wheelPrizes.length)] }))
  ));
  let targetFace = Math.floor(Math.random() * 6);
  let targetTile = Math.floor(Math.random() * 25);
  const testMonPrize = MONAD_TEST_DROPS_ALWAYS
    ? wheelPrizes.find((prize) => prize.type === 'mon' && Number(prize.mon || 0) > 0)
    : null;
  if (testMonPrize) {
    targetFace = 0;
    targetTile = 0;
    faces[targetFace][targetTile] = { ...testMonPrize };
  }
  const prize = faces[targetFace][targetTile];
  return { faces, targetFace, targetTile, prize };
}

function applyPrize(player, prize, options = {}) {
  const patch = {};
  if (prize.type === 'coins') patch.coins = player.coins + Number(prize.coins || 0);
  if (prize.type === 'bait') patch.bait = player.bait + Number(prize.bait || 0);
  if (prize.type === 'fish' && prize.fishId) {
    const inventory = Array.isArray(player.inventory) ? [...player.inventory] : [];
    const existing = inventory.find((item) => item.fishId === prize.fishId);
    if (existing) existing.quantity = Number(existing.quantity || 0) + Number(prize.quantity || 1);
    else inventory.push({ fishId: prize.fishId, quantity: Number(prize.quantity || 1), caughtAt: nowIso() });
    patch.inventory = inventory;
  }
  if (prize.type === 'rod' && Number.isInteger(prize.rodLevel)) {
    patch.rod_level = Math.max(player.rod_level, prize.rodLevel);
    patch.equipped_rod = Math.max(player.equipped_rod, prize.rodLevel);
  }
  const updated = Object.keys(patch).length ? updatePlayer(player.wallet_address, patch) : player;
  if (prize.type === 'mon' && Number(prize.mon || 0) > 0 && (!isGuestPlayer(player) || MONAD_SHOP_TEST_MODE_ENABLED)) {
    insertMonReward(player, Number(prize.mon), 'cube', options.monSourceRef || prize.id);
  }
  return updated;
}

function getSafeRodLevel(player) {
  const maxRodLevel = Math.max(0, Math.min(ROD_DATA.length - 1, Number(player.rod_level || 0)));
  const equipped = Math.max(0, Math.min(ROD_DATA.length - 1, Number(player.equipped_rod ?? maxRodLevel)));
  return Math.min(equipped, maxRodLevel);
}

function getNftBonus(player, rodLevel) {
  return Array.isArray(player.nft_rods) && player.nft_rods.includes(rodLevel)
    ? NFT_ROD_BONUSES[rodLevel] || { rarityBonus: 0, xpBonus: 0, sellBonus: 0 }
    : { rarityBonus: 0, xpBonus: 0, sellBonus: 0 };
}

function calculateFishCatch(player) {
  const levelBonus = Math.min(Number(player.level || 1) - 1, 20) * 0.5;
  if (Math.random() * 100 > CATCH_CHANCE + levelBonus) return null;

  const rodLevel = getSafeRodLevel(player);
  const rodBonus = ROD_DATA[rodLevel]?.bonus || 0;
  const nftBonus = getNftBonus(player, rodLevel);
  const totalRodBonus = rodBonus + nftBonus.rarityBonus;
  const adjustedFish = FISH_DATA.map((fish) => {
    const boosted = fish.rarity !== 'common' && fish.rarity !== 'uncommon'
      ? fish.chance + (fish.chance * totalRodBonus) / 100
      : fish.chance;
    return { ...fish, adjustedChance: boosted };
  });
  const totalChance = adjustedFish.reduce((sum, fish) => sum + fish.adjustedChance, 0);
  const roll = Math.random() * 100;
  let cumulative = 0;

  for (const fish of adjustedFish) {
    cumulative += (fish.adjustedChance / totalChance) * 100;
    if (roll <= cumulative) return FISH_BY_ID.get(fish.id) || FISH_DATA[0];
  }

  return FISH_DATA[0];
}

function addFishToInventory(inventoryValue, fishId, quantity = 1, caughtAt = nowIso()) {
  const inventory = Array.isArray(inventoryValue) ? [...inventoryValue] : [];
  const existing = inventory.find((item) => item.fishId === fishId);
  if (existing) {
    existing.quantity = Math.max(0, Number(existing.quantity || 0)) + quantity;
    existing.caughtAt = existing.caughtAt || caughtAt;
  } else {
    inventory.push({ fishId, caughtAt, quantity });
  }
  return inventory.filter((item) => Number(item.quantity || 0) > 0);
}

function createEmptyCollectionBook() {
  return {
    species: Object.fromEntries(FISH_DATA.map((fish) => [fish.id, {
      fishId: fish.id,
      discovered: false,
      catches: 0,
      firstCaughtAt: null,
      lastCaughtAt: null,
      firstCatchBonusClaimed: false,
    }])),
    pages: COLLECTION_BOOK_PAGES.map((page) => ({ pageId: page.id, completed: false, claimed: false })),
    totalSpeciesCaught: 0,
    totalFirstCatchBonusesClaimed: 0,
  };
}

function ensureCollectionBook(book) {
  const base = createEmptyCollectionBook();
  if (!book || typeof book !== 'object') return base;

  const species = Object.fromEntries(FISH_DATA.map((fish) => {
    const current = book.species?.[fish.id] || {};
    return [fish.id, {
      ...base.species[fish.id],
      ...current,
      fishId: fish.id,
      catches: Math.max(0, Number(current.catches || 0)),
    }];
  }));
  const pages = COLLECTION_BOOK_PAGES.map((page) => {
    const existing = Array.isArray(book.pages) ? book.pages.find((item) => item.pageId === page.id) : null;
    return {
      pageId: page.id,
      completed: Boolean(existing?.completed || page.fishIds.every((fishId) => species[fishId]?.discovered)),
      claimed: Boolean(existing?.claimed),
    };
  });

  return {
    species,
    pages,
    totalSpeciesCaught: Object.values(species).filter((item) => item.discovered).length,
    totalFirstCatchBonusesClaimed: Object.values(species).filter((item) => item.firstCatchBonusClaimed).length,
  };
}

function recordCollectionCatchServer(collectionBook, fishId, caughtAt) {
  const book = ensureCollectionBook(collectionBook);
  const existing = book.species[fishId] || {
    fishId,
    discovered: false,
    catches: 0,
    firstCaughtAt: null,
    lastCaughtAt: null,
    firstCatchBonusClaimed: false,
  };
  const isFirstCatch = !existing.discovered;
  const species = {
    ...book.species,
    [fishId]: {
      ...existing,
      discovered: true,
      catches: Number(existing.catches || 0) + 1,
      firstCaughtAt: existing.firstCaughtAt || caughtAt,
      lastCaughtAt: caughtAt,
      firstCatchBonusClaimed: existing.firstCatchBonusClaimed || isFirstCatch,
    },
  };
  const pageCompletedIds = [];
  const pages = COLLECTION_BOOK_PAGES.map((page) => {
    const wasCompleted = book.pages.find((item) => item.pageId === page.id)?.completed ?? false;
    const completed = page.fishIds.every((pageFishId) => species[pageFishId]?.discovered);
    if (!wasCompleted && completed) pageCompletedIds.push(page.id);
    return {
      pageId: page.id,
      completed,
      claimed: book.pages.find((item) => item.pageId === page.id)?.claimed ?? false,
    };
  });

  return {
    nextBook: {
      species,
      pages,
      totalSpeciesCaught: Object.values(species).filter((item) => item.discovered).length,
      totalFirstCatchBonusesClaimed: Object.values(species).filter((item) => item.firstCatchBonusClaimed).length,
    },
    isFirstCatch,
    pageCompletedIds,
  };
}

function advanceXp(player, xpGain, extraCoins = 0) {
  let remainingXp = Number(player.xp || 0) + xpGain;
  let newLevel = Math.max(1, Number(player.level || 1));
  let xpToNext = Math.max(1, Number(player.xp_to_next || newLevel * XP_PER_LEVEL));
  let levelBonusCoins = 0;

  while (remainingXp >= xpToNext) {
    remainingXp -= xpToNext;
    newLevel += 1;
    xpToNext = newLevel * XP_PER_LEVEL;
    levelBonusCoins += 100 * newLevel;
  }

  return {
    level: newLevel,
    xp: remainingXp,
    xp_to_next: xpToNext,
    coins: Number(player.coins || 0) + extraCoins + levelBonusCoins,
    levelUp: newLevel > Number(player.level || 1)
      ? { newLevel, coinsReward: levelBonusCoins }
      : null,
  };
}

function rollRodMonRewardForServer(player, sourceRef) {
  if (isGuestPlayer(player) && !MONAD_SHOP_TEST_MODE_ENABLED) return null;

  const rodLevel = getSafeRodLevel(player);
  const rod = ROD_DATA[rodLevel] || ROD_DATA[0];
  const chance = Number(rod.monadDropChance || 0);
  if (chance <= 0 || (!MONAD_TEST_DROPS_ALWAYS && Math.random() * 100 > chance)) return null;

  const min = Number(rod.monadMinReward || 0);
  const max = Number(rod.monadMaxReward || min);
  const amount = Number((MONAD_TEST_DROPS_ALWAYS ? Math.max(min, max) : min + Math.random() * Math.max(0, max - min)).toFixed(6));
  if (amount <= 0) return null;

  insertMonReward(player, amount, 'fishing_rod', sourceRef);
  return {
    amountMon: amount,
    sourceRef,
    rodId: rod.id,
    rodLevel,
  };
}

function expireOldFishingCasts(walletAddress) {
  const staleBefore = new Date(Date.now() - 2 * 60 * 1000).toISOString();
  db.prepare("UPDATE player_fishing_casts SET status = 'expired', resolved_at = COALESCE(resolved_at, ?) WHERE wallet_address = ? AND status = 'pending' AND started_at < ?")
    .run(nowIso(), walletAddress, staleBefore);
}

function startFishingCast(player) {
  return withTransaction(() => {
    const currentPlayer = getPlayerByWallet(player.wallet_address) || player;
    expireOldFishingCasts(currentPlayer.wallet_address);

    const latest = db.prepare('SELECT started_at FROM player_fishing_casts WHERE wallet_address = ? ORDER BY started_at DESC LIMIT 1')
      .get(currentPlayer.wallet_address);
    if (latest && Date.now() - new Date(latest.started_at).getTime() < MIN_CAST_INTERVAL_MS) {
      throw httpError(429, 'Casting too fast. Wait a moment before casting again.');
    }

    let consumedBucket = null;
    const patch = {};
    if (Number(currentPlayer.daily_free_bait || 0) > 0) {
      consumedBucket = 'daily_free_bait';
      patch.daily_free_bait = Number(currentPlayer.daily_free_bait || 0) - 1;
    } else if (Number(currentPlayer.bait || 0) > 0) {
      consumedBucket = 'bait';
      patch.bait = Number(currentPlayer.bait || 0) - 1;
    } else {
      throw httpError(400, 'No bait available');
    }

    const id = randomUUID();
    const resolveToken = createCastResolveToken();
    const resolveTokenHash = hashCastResolveToken(currentPlayer.wallet_address, id, resolveToken);
    const startedAt = nowIso();
    const waitMs = Math.floor(1000 + Math.random() * 2000);
    const biteWindowMs = Math.floor(BITE_WINDOW_MIN_MS + Math.random() * (BITE_WINDOW_MAX_MS - BITE_WINDOW_MIN_MS));
    const fish = calculateFishCatch(currentPlayer);
    const updated = updatePlayer(currentPlayer.wallet_address, patch);
    db.prepare(`
      INSERT INTO player_fishing_casts
        (id, player_id, wallet_address, status, consumed_bucket, fish_id, wait_ms, bite_window_ms, started_at, resolve_token_hash)
      VALUES (?, ?, ?, 'pending', ?, ?, ?, ?, ?, ?)
    `).run(id, currentPlayer.id, currentPlayer.wallet_address, consumedBucket, fish?.id ?? null, waitMs, biteWindowMs, startedAt, resolveTokenHash);
    addAudit(currentPlayer.wallet_address, 'cast_started', { consumedBucket, castId: id }, currentPlayer, updated);

    return edgeResponse({
      player: updated,
      fishing_cast: {
        id,
        waitMs,
        biteWindowMs,
        startedAt,
        consumedBucket,
        resolveToken,
      },
    });
  });
}

function applyFishingMiss(player, castId) {
  const rodLevel = getSafeRodLevel(player);
  const nftBonus = getNftBonus(player, rodLevel);
  const xpGain = Math.floor(5 * (1 + nftBonus.xpBonus / 100));
  const xpPatch = advanceXp(player, xpGain);
  const updated = updatePlayer(player.wallet_address, xpPatch);
  const result = {
    success: false,
    fishId: null,
    xpGain,
    levelUp: xpPatch.levelUp,
    occurredAt: nowIso(),
  };
  addAudit(player.wallet_address, 'fish_escaped', { castId, xpGain }, player, updated);
  return { player: updated, result };
}

function applyFishingCatch(player, castId, fishId) {
  const fish = FISH_BY_ID.get(fishId);
  if (!fish) return applyFishingMiss(player, castId);

  const caughtAt = nowIso();
  const rodLevel = getSafeRodLevel(player);
  const nftBonus = getNftBonus(player, rodLevel);
  const xpGain = Math.floor((fish.xp + 5) * (1 + nftBonus.xpBonus / 100));
  const progressUpdate = progressFishingCatch(player, fish);
  const currentProgress = progressUpdate.progress;
  const collectionUpdate = recordCollectionCatchServer(currentProgress.collectionBook, fish.id, caughtAt);
  const firstCatchBonus = collectionUpdate.isFirstCatch ? (ALBUM_FIRST_CATCH_BONUSES[fish.id] || 0) : 0;
  const xpPatch = advanceXp(player, xpGain, firstCatchBonus);
  const inventory = addFishToInventory(player.inventory, fish.id, 1, caughtAt);
  const patch = {
    ...progressUpdate.patch,
    ...xpPatch,
    inventory,
    total_catches: Number(player.total_catches || 0) + 1,
    game_progress: {
      ...currentProgress,
      collectionBook: collectionUpdate.nextBook,
    },
  };
  const monReward = rollRodMonRewardForServer(player, `fishing:${castId}`);
  let leviathanBonus = null;

  if (fish.id === 'leviathan' && getSafeRodLevel(player) === 0) {
    if (Number(player.rod_level || 0) < 2) {
      patch.rod_level = 2;
      patch.equipped_rod = 2;
      leviathanBonus = {
        type: 'rod',
        sourceRef: `leviathan:${castId}`,
        bonusRodId: 'epic_rod',
        bonusRodLevel: 2,
        credited: true,
      };
    } else if (!isGuestPlayer(player)) {
      insertMonReward(player, 2, 'leviathan_common_rod_bonus', `leviathan:${castId}`);
      leviathanBonus = {
        type: 'mon_compensation',
        sourceRef: `leviathan:${castId}`,
        bonusRodId: 'epic_rod',
        bonusRodLevel: 2,
        compensationMon: 2,
        credited: true,
      };
    }
  }

  const updated = updatePlayer(player.wallet_address, patch);
  const albumReward = collectionUpdate.isFirstCatch
    ? {
      fishId: fish.id,
      fishName: fish.name,
      bonusCoins: firstCatchBonus,
      totalSpeciesCaught: collectionUpdate.nextBook.totalSpeciesCaught,
      pageCompletedIds: collectionUpdate.pageCompletedIds,
    }
    : null;
  const result = {
    success: true,
    fishId: fish.id,
    xpGain,
    firstCatchBonus,
    levelUp: xpPatch.levelUp,
    albumReward,
    monReward,
    specialReward: leviathanBonus,
    occurredAt: caughtAt,
  };
  addAudit(player.wallet_address, 'fish_caught', {
    castId,
    fishId: fish.id,
    rarity: fish.rarity,
    sellPrice: fish.price,
    xpGain,
    firstCatchBonus,
  }, player, updated);
  return { player: updated, result };
}

function resolveFishingCast(player, body) {
  return withTransaction(() => {
    const castId = String(body.cast_id || body.castId || '');
    if (!castId) throw httpError(400, 'Missing cast id');
    const row = db.prepare('SELECT * FROM player_fishing_casts WHERE id = ? AND wallet_address = ?').get(castId, player.wallet_address);
    if (!row) throw httpError(404, 'Fishing cast not found');
    if (row.status !== 'pending') {
      throw httpError(409, 'Fishing cast is already resolved');
    }
    const resolveToken = typeof body.resolve_token === 'string'
      ? body.resolve_token
      : typeof body.resolveToken === 'string'
        ? body.resolveToken
        : '';
    if (!verifyCastResolveToken(row, resolveToken)) {
      throw httpError(401, 'Invalid fishing cast token');
    }

    const resolution = String(body.resolution || 'reel');
    const nowMs = Date.now();
    const startedMs = new Date(row.started_at).getTime();
    const biteStartMs = startedMs + Number(row.wait_ms || 0);
    const biteEndMs = biteStartMs + Number(row.bite_window_ms || 0);
    const isTimedOut = resolution === 'timeout';
    if (!isTimedOut && nowMs < biteStartMs - REEL_EARLY_GRACE_MS) {
      throw httpError(400, 'Fish is not biting yet');
    }

    const latestPlayer = getPlayerByWallet(player.wallet_address) || player;
    const shouldCatch = !isTimedOut
      && Boolean(row.fish_id)
      && nowMs <= biteEndMs + REEL_LATE_GRACE_MS;
    const resolved = shouldCatch
      ? applyFishingCatch(latestPlayer, castId, row.fish_id)
      : applyFishingMiss(latestPlayer, castId);
    const status = shouldCatch ? 'caught' : isTimedOut || nowMs > biteEndMs + REEL_LATE_GRACE_MS ? 'escaped' : 'missed';
    const updatedCast = db.prepare("UPDATE player_fishing_casts SET status = ?, resolved_at = ?, result_json = ? WHERE id = ? AND wallet_address = ? AND status = 'pending'")
      .run(status, nowIso(), toJson(resolved.result, {}), castId, player.wallet_address);
    if (updatedCast.changes !== 1) {
      throw httpError(409, 'Fishing cast is already resolved');
    }

    return edgeResponse({
      player: resolved.player,
      fishing_result: resolved.result,
    });
  });
}

function sellFishAction(player, body) {
  return withTransaction(() => {
    const currentPlayer = getPlayerByWallet(player.wallet_address) || player;
    const fishId = String(body.fish_id || body.fishId || '');
    const fish = FISH_BY_ID.get(fishId);
    if (!fish) throw httpError(400, 'Unknown fish');
    const inventory = Array.isArray(currentPlayer.inventory) ? [...currentPlayer.inventory] : [];
    const item = inventory.find((entry) => entry.fishId === fishId);
    if (!item || Number(item.quantity || 0) <= 0) throw httpError(400, 'Fish not found');

    const rodLevel = getSafeRodLevel(currentPlayer);
    const nftBonus = getNftBonus(currentPlayer, rodLevel);
    const sellPrice = Math.floor(fish.price * (1 + nftBonus.sellBonus / 100));
    item.quantity = Number(item.quantity || 0) - 1;
    const updated = updatePlayer(currentPlayer.wallet_address, {
      coins: Number(currentPlayer.coins || 0) + sellPrice,
      inventory: inventory.filter((entry) => Number(entry.quantity || 0) > 0),
    });
    addAudit(currentPlayer.wallet_address, 'fish_sold', { fishId, sellPrice, quantity: 1 }, currentPlayer, updated);
    return edgeResponse({ player: updated, sell_price: sellPrice });
  });
}

function buyBaitAction(player, body) {
  const amount = Math.max(0, Math.floor(Number(body.amount || 0)));
  const baitPackage = BAIT_PACKAGES_BY_AMOUNT.get(amount);
  if (!baitPackage) throw httpError(400, 'Unknown bait package');
  const cost = baitPackage.cost;
  if (Number(player.coins || 0) < cost) throw httpError(400, 'Not enough coins');
  const progressUpdate = progressCoinsSpent(player, cost);
  const updated = updatePlayer(player.wallet_address, {
    ...progressUpdate.patch,
    coins: Number(player.coins || 0) - cost,
    bait: Number(player.bait || 0) + amount,
  });
  addAudit(player.wallet_address, 'bait_bought_with_coins', { baitAmount: amount, coinCost: cost }, player, updated);
  return edgeResponse({ player: updated });
}

function buyRodAction(player, body) {
  const level = Math.max(0, Math.floor(Number(body.level || 0)));
  if (!ROD_DATA[level] || level <= 0) throw httpError(400, 'Invalid rod level');
  if (Number(player.rod_level || 0) >= level) return edgeResponse({ player });
  const cost = COIN_ROD_COSTS.get(level);
  if (!Number.isFinite(cost)) throw httpError(400, 'Coin rod purchase is not available for this rod');
  if (Number(player.coins || 0) < cost) throw httpError(400, 'Not enough coins');
  const progressUpdate = progressCoinsSpent(player, cost);
  const updated = updatePlayer(player.wallet_address, {
    ...progressUpdate.patch,
    coins: Number(player.coins || 0) - cost,
    rod_level: level,
    equipped_rod: level,
  });
  addAudit(player.wallet_address, 'rod_bought_with_coins', { rodLevel: level, coinCost: cost }, player, updated);
  return edgeResponse({ player: updated });
}

async function buyFishingNetAction(player, body) {
  const dailyFishCount = Math.max(1, Math.floor(Number(body.daily_fish_count || body.dailyFishCount || 0)));
  const netPackage = MON_FISHING_NET_PACKAGES_BY_COUNT.get(dailyFishCount);
  if (!netPackage) throw httpError(400, 'Unknown fishing net package');
  const txHash = requireTxHash(body.tx_hash, 'Missing fishing net payment transaction hash');

  const progress = ensureGameProgress(player.game_progress);
  const currentNet = ensureFishingNetState(progress.fishingNet, progress.date);
  if (currentNet.owned && Number(currentNet.dailyFishCount || 0) >= dailyFishCount) {
    if (normalizeTxHash(currentNet.txHash) === txHash || isAppliedPaymentTx(player.wallet_address, txHash, 'fishing_net', netPackage.monAmount)) {
      return edgeResponse({ player, fishing_net: currentNet, already_applied: true });
    }
    throw httpError(409, 'Fishing net is already owned');
  }

  const payment = await verifyPaymentWithLedger(
    player.wallet_address,
    txHash,
    netPackage.monAmount,
    'fishing_net',
    { dailyFishCount, packageLabel: netPackage.label },
  );

  if (payment.alreadyApplied) {
    const currentPlayer = getPlayerByWallet(player.wallet_address) || player;
    const currentProgress = ensureGameProgress(currentPlayer.game_progress);
    const currentFishingNet = ensureFishingNetState(currentProgress.fishingNet, currentProgress.date);
    if (currentFishingNet.owned) {
      return edgeResponse({ player: currentPlayer, fishing_net: currentFishingNet, already_applied: true });
    }
    throw httpError(409, 'Fishing net payment was already applied');
  }

  return applyVerifiedPaymentTx(payment.txHash, 'fishing_net', () => {
    const currentPlayer = getPlayerByWallet(player.wallet_address) || player;
    const latestProgress = ensureGameProgress(currentPlayer.game_progress);
    const latestNet = ensureFishingNetState(latestProgress.fishingNet, latestProgress.date);
    if (latestNet.owned && Number(latestNet.dailyFishCount || 0) >= dailyFishCount) {
      throw httpError(409, 'Fishing net is already owned');
    }

    const nextNet = {
      ...latestNet,
      owned: true,
      dailyFishCount,
      purchasedAt: latestNet.purchasedAt || nowIso(),
      readyDate: latestNet.pendingCatch.length > 0 ? latestNet.readyDate : latestProgress.date,
      lastNotificationDate: null,
      pendingCatch: latestNet.pendingCatch.length > 0
        ? latestNet.pendingCatch
        : rollFishingNetCatch(dailyFishCount),
      txHash: payment.txHash,
    };
    latestProgress.fishingNet = nextNet;
    const updated = updatePlayer(currentPlayer.wallet_address, { game_progress: latestProgress });
    addAudit(currentPlayer.wallet_address, 'fishing_net_bought_with_mon', {
      txHash: payment.txHash,
      dailyFishCount,
      expectedMon: netPackage.monAmount,
      packageLabel: netPackage.label,
    }, currentPlayer, updated);
    return edgeResponse({ player: updated, fishing_net: nextNet });
  }, () => {
    const currentPlayer = getPlayerByWallet(player.wallet_address) || player;
    const currentProgress = ensureGameProgress(currentPlayer.game_progress);
    return edgeResponse({
      player: currentPlayer,
      fishing_net: ensureFishingNetState(currentProgress.fishingNet, currentProgress.date),
      already_applied: true,
    });
  });
}

function claimFishingNetAction(player) {
  return withTransaction(() => {
    const currentPlayer = getPlayerByWallet(player.wallet_address) || player;
    const progress = ensureGameProgress(currentPlayer.game_progress);
    const net = ensureFishingNetState(progress.fishingNet, progress.date);
    if (!net.owned || net.pendingCatch.length <= 0) throw httpError(400, 'Fishing net is empty');

    let inventory = Array.isArray(currentPlayer.inventory) ? [...currentPlayer.inventory] : [];
    let quantityTotal = 0;
    for (const entry of net.pendingCatch) {
      const quantity = Math.max(0, Math.floor(Number(entry.quantity || 0)));
      if (!FISH_BY_ID.has(entry.fishId) || quantity <= 0) continue;
      inventory = addFishToInventory(inventory, entry.fishId, quantity, nowIso());
      quantityTotal += quantity;
    }

    const claimedCatch = net.pendingCatch;
    progress.fishingNet = {
      ...net,
      readyDate: null,
      lastCollectedDate: progress.date,
      lastNotificationDate: null,
      pendingCatch: [],
    };
    const updated = updatePlayer(currentPlayer.wallet_address, {
      inventory,
      game_progress: progress,
    });
    addAudit(currentPlayer.wallet_address, 'fishing_net_claimed', {
      claimedCatch,
      quantityTotal,
    }, currentPlayer, updated);
    return edgeResponse({ player: updated, claimed_catch: claimedCatch });
  });
}

async function buyCubeRollsAction(player, body) {
  const rolls = Math.max(1, Math.floor(Number(body.rolls || body.amount || 0)));
  const rollPackage = MON_CUBE_ROLL_PACKAGES_BY_ROLLS.get(rolls);
  if (!rollPackage) throw httpError(400, 'Unknown cube roll package');
  const payment = await verifyPaymentWithLedger(
    player.wallet_address,
    requireTxHash(body.tx_hash, 'Missing cube roll payment transaction hash'),
    rollPackage.monAmount,
    'cube_rolls',
    { rolls, packageLabel: rollPackage.label },
  );

  if (payment.alreadyApplied) {
    return edgeResponse({ player: getPlayerByWallet(player.wallet_address) || player, rolls, already_applied: true });
  }

  return applyVerifiedPaymentTx(payment.txHash, 'cube_rolls', () => {
    const currentPlayer = getPlayerByWallet(player.wallet_address) || player;
    const progress = ensureGameProgress(currentPlayer.game_progress);
    progress.paidWheelRolls = Number(progress.paidWheelRolls || 0) + rolls;
    const updated = updatePlayer(currentPlayer.wallet_address, { game_progress: progress });
    addAudit(currentPlayer.wallet_address, 'cube_rolls_bought_with_mon', {
      txHash: payment.txHash,
      rolls,
      expectedMon: rollPackage.monAmount,
      packageLabel: rollPackage.label,
    }, currentPlayer, updated);
    return edgeResponse({ player: updated, rolls });
  }, () => edgeResponse({
    player: getPlayerByWallet(player.wallet_address) || player,
    rolls,
    already_applied: true,
  }));
}

function equipRodAction(player, body) {
  const level = Math.max(0, Math.floor(Number(body.level || 0)));
  if (!ROD_DATA[level] || level > Number(player.rod_level || 0)) throw httpError(400, 'Rod is not owned');
  const updated = updatePlayer(player.wallet_address, { equipped_rod: level });
  return edgeResponse({ player: updated });
}

async function playerActions(body) {
  const player = requireWalletSession(body);
  const action = String(body.action || '');
  consumeRateLimit(`player_actions.${action || 'unknown'}`, player.wallet_address, action === 'get_premium_session_state' ? 60 : 30, action === 'get_premium_session_state' ? 12 : 30);

  switch (action) {
    case 'start_fishing_cast':
      return startFishingCast(player);

    case 'resolve_fishing_cast':
      return resolveFishingCast(player, body);

    case 'sell_fish':
      return sellFishAction(player, body);

    case 'buy_bait':
      return buyBaitAction(player, body);

    case 'buy_rod':
      return buyRodAction(player, body);

    case 'buy_fishing_net':
      requireRealWalletOrMonadTestPlayer(player, 'Connect a verified wallet to buy MON fishing nets.');
      return buyFishingNetAction(player, body);

    case 'claim_fishing_net':
      return claimFishingNetAction(player);

    case 'buy_cube_rolls':
      requireRealWalletOrMonadTestPlayer(player, 'Connect a verified wallet to buy MON cube rolls.');
      return buyCubeRollsAction(player, body);

    case 'equip_rod':
      return equipRodAction(player, body);

    case 'get_wallet_check_in_summary':
      return edgeResponse({ wallet_check_in_summary: getWalletCheckInSummary(player.wallet_address) });

    case 'verify_wallet_check_in': {
      requireRealWalletOrMonadTestPlayer(player, 'Connect a verified wallet to use wallet check-in.');
      const txHash = requireTxHash(body.tx_hash, 'Missing wallet check-in transaction hash');
      const currentSummary = getWalletCheckInSummary(player.wallet_address);
      if (currentSummary.todayCheckedIn) {
        if (normalizeTxHash(currentSummary.lastCheckInTxHash) === txHash || isAppliedPaymentTx(player.wallet_address, txHash, 'wallet_check_in', WALLET_CHECK_IN_COST_MON)) {
          return edgeResponse({ player, wallet_check_in_summary: currentSummary, already_applied: true });
        }
        throw httpError(409, 'Wallet check-in is already complete today');
      }
      const checkInDate = todayKey();

      const payment = await verifyPaymentWithLedger(
        player.wallet_address,
        txHash,
        WALLET_CHECK_IN_COST_MON,
        'wallet_check_in',
        { checkInDate },
      );
      if (payment.alreadyApplied) {
        return edgeResponse({
          player: getPlayerByWallet(player.wallet_address) || player,
          wallet_check_in_summary: getWalletCheckInSummary(player.wallet_address),
          already_applied: true,
        });
      }
      return applyVerifiedPaymentTx(payment.txHash, 'wallet_check_in', (paymentRow) => {
        const paymentMeta = safeJsonParse(paymentRow.metadata, {});
        if (paymentMeta.checkInDate && paymentMeta.checkInDate !== checkInDate) {
          throw httpError(409, 'Wallet check-in payment was reserved for another date');
        }

        const currentPlayer = getPlayerByWallet(player.wallet_address) || player;
        const latestSummary = getWalletCheckInSummary(currentPlayer.wallet_address);
        if (latestSummary.todayCheckedIn) {
          if (normalizeTxHash(latestSummary.lastCheckInTxHash) === payment.txHash) {
            return edgeResponse({ player: currentPlayer, wallet_check_in_summary: latestSummary });
          }
          throw httpError(409, 'Wallet check-in is already complete today');
        }

        addAudit(currentPlayer.wallet_address, 'wallet_check_in', {
          txHash: payment.txHash,
          checkInDate,
          recipient: RECEIVER_ADDRESS,
          expectedMon: WALLET_CHECK_IN_COST_MON,
        });
        const progressUpdate = progressSpecialTask(currentPlayer, 'wallet_check_in', { txHash: payment.txHash });
        const updated = updatePlayer(currentPlayer.wallet_address, progressUpdate.patch);
        return edgeResponse({
          player: updated,
          wallet_check_in_summary: getWalletCheckInSummary(currentPlayer.wallet_address),
        });
      }, () => edgeResponse({
        player: getPlayerByWallet(player.wallet_address) || player,
        wallet_check_in_summary: getWalletCheckInSummary(player.wallet_address),
        already_applied: true,
      }));
    }

    case 'start_premium_session': {
      requireRealWalletOrMonadTestPlayer(player, 'Connect a verified wallet to start a MON expedition.');
      const txHash = requireTxHash(body.tx_hash, 'Missing premium session payment transaction hash');
      const existing = activePremiumSession(player.wallet_address);
      if (existing) {
        if (normalizeTxHash(existing.tx_hash) === txHash || isAppliedPaymentTx(player.wallet_address, txHash, 'premium_session', PREMIUM_SESSION_COST_MON)) {
          return edgeResponse({ player, premium_session: premiumSessionState(existing), already_applied: true });
        }
        throw httpError(409, 'Active premium session already exists');
      }

      const payment = await verifyPaymentWithLedger(
        player.wallet_address,
        txHash,
        PREMIUM_SESSION_COST_MON,
        'premium_session',
        { castsTotal: PREMIUM_SESSION_CASTS },
      );
      if (payment.alreadyApplied) {
        const currentPlayer = getPlayerByWallet(player.wallet_address) || player;
        const sessionByTx = premiumSessionByTxHash(currentPlayer.wallet_address, payment.txHash);
        return edgeResponse({
          player: currentPlayer,
          premium_session: premiumSessionState(sessionByTx || activePremiumSession(currentPlayer.wallet_address)),
          already_applied: true,
        });
      }
      return applyVerifiedPaymentTx(payment.txHash, 'premium_session', () => {
        const currentPlayer = getPlayerByWallet(player.wallet_address) || player;
        const currentSession = activePremiumSession(currentPlayer.wallet_address);
        if (currentSession) {
          if (normalizeTxHash(currentSession.tx_hash) === payment.txHash) {
            return edgeResponse({ player: currentPlayer, premium_session: premiumSessionState(currentSession) });
          }
          throw httpError(409, 'Active premium session already exists');
        }

        const id = randomUUID();
        db.prepare(`
          INSERT INTO premium_fishing_sessions
            (id, player_id, wallet_address, status, price_mon, casts_total, casts_used, started_at, tx_hash)
          VALUES (?, ?, ?, 'active', ?, ?, 0, ?, ?)
        `).run(id, currentPlayer.id, currentPlayer.wallet_address, Number(PREMIUM_SESSION_COST_MON), PREMIUM_SESSION_CASTS, nowIso(), payment.txHash);
        return edgeResponse({ player: currentPlayer, premium_session: premiumSessionState(activePremiumSession(currentPlayer.wallet_address)) });
      }, () => {
        const currentPlayer = getPlayerByWallet(player.wallet_address) || player;
        const sessionByTx = premiumSessionByTxHash(currentPlayer.wallet_address, payment.txHash);
        return edgeResponse({
          player: currentPlayer,
          premium_session: premiumSessionState(sessionByTx || activePremiumSession(currentPlayer.wallet_address)),
          already_applied: true,
        });
      });
    }

    case 'get_premium_session_state':
      return edgeResponse({ player, premium_session: premiumSessionState(activePremiumSession(player.wallet_address)) });

    case 'resolve_premium_cast': {
      requireRealWalletOrMonadTestPlayer(player, 'Connect a verified wallet to use MON expeditions.');
      return withTransaction(() => {
        const session = activePremiumSession(player.wallet_address);
        if (!session) throw httpError(400, 'No active premium session');
        if (session.casts_used >= session.casts_total) throw httpError(400, 'Premium session is complete');
        const latestPlayer = getPlayerByWallet(player.wallet_address) || player;
        const reactionQuality = 'good';
        const castIndex = session.casts_used + 1;
        const fishId = PREMIUM_FISH_IDS[Math.floor(Math.random() * PREMIUM_FISH_IDS.length)];
        const qualityMultiplier = reactionQuality === 'perfect' ? 3 : reactionQuality === 'good' ? 2 : 1;
        const monAmount = MONAD_TEST_DROPS_ALWAYS
          ? 0.05 * qualityMultiplier
          : Math.random() < (reactionQuality === 'perfect' ? 0.12 : 0.05) ? 0.05 * qualityMultiplier : 0;
        const tier = monAmount > 0 ? 'small' : 'zero';
        const bonusCoins = 30 * qualityMultiplier;
        const bonusXp = 10 * qualityMultiplier;
        const now = nowIso();
        const nextZeroDropStreak = monAmount > 0 ? 0 : Number(session.zero_drop_streak || 0) + 1;
        const sessionUpdate = db.prepare(`
          UPDATE premium_fishing_sessions
          SET casts_used = ?, recovered_mon_total = recovered_mon_total + ?, zero_drop_streak = ?,
              completed_at = CASE WHEN ? >= casts_total THEN ? ELSE completed_at END,
              status = CASE WHEN ? >= casts_total THEN 'completed' ELSE status END
          WHERE id = ? AND status = 'active' AND casts_used = ? AND casts_used < casts_total
        `).run(castIndex, monAmount, nextZeroDropStreak, castIndex, now, castIndex, session.id, session.casts_used);
        if (sessionUpdate.changes !== 1) throw httpError(409, 'Premium session changed while resolving cast');

        db.prepare(`
          INSERT INTO premium_fishing_casts
            (id, session_id, cast_index, reaction_quality, fish_id, bonus_coins_awarded, bonus_xp_awarded, mon_drop_tier, mon_amount, created_at)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `).run(randomUUID(), session.id, castIndex, reactionQuality, fishId, bonusCoins, bonusXp, tier, monAmount, now);
        if (monAmount > 0) insertMonReward(latestPlayer, monAmount, 'premium_fishing', `premium:${session.id}:${castIndex}`);
        const completedProgressUpdate = castIndex >= session.casts_total
          ? progressPremiumSessionCompleted(latestPlayer)
          : null;
        const updatedPlayer = updatePlayer(latestPlayer.wallet_address, {
          ...(completedProgressUpdate?.patch || {}),
          coins: Number(latestPlayer.coins || 0) + bonusCoins,
          xp: Number(latestPlayer.xp || 0) + bonusXp,
        });
        return edgeResponse({
          player: updatedPlayer,
          premium_session: premiumSessionState(db.prepare('SELECT * FROM premium_fishing_sessions WHERE id = ?').get(session.id)),
          cast_result: {
            castIndex,
            reactionQuality,
            fishId,
            bonusCoinsAwarded: bonusCoins,
            bonusXpAwarded: bonusXp,
            monDropTier: tier,
            monAmount,
            recoveredMonTotal: Number(session.recovered_mon_total || 0) + monAmount,
            luckMeterStacks: session.luck_meter_stacks,
            zeroDropStreak: nextZeroDropStreak,
            pityTriggered: false,
            rescueTriggered: false,
            hotStreakActive: false,
            occurredAt: now,
          },
        });
      });
    }

    case 'complete_premium_session': {
      throw httpError(410, 'Premium sessions are completed by the server when the final cast resolves');
    }

    case 'grant_fishing_mon_reward': {
      throw httpError(410, 'Fishing MON rewards are resolved by the server when a cast is resolved');
    }

    case 'grant_leviathan_common_rod_bonus': {
      throw httpError(410, 'Leviathan bonuses are resolved by the server when a cast is resolved');
    }

    case 'roll_cube': {
      return withTransaction(() => {
        const latestPlayer = getPlayerByWallet(player.wallet_address) || player;
        const progress = ensureGameProgress(latestPlayer.game_progress);
        const dailyRolls = Number(progress.dailyWheelRolls || 0);
        const paidRolls = Number(progress.paidWheelRolls || 0);
        if (dailyRolls + paidRolls <= 0) throw httpError(400, 'No cube rolls available');
        if (dailyRolls > 0) progress.dailyWheelRolls = dailyRolls - 1;
        else progress.paidWheelRolls = paidRolls - 1;
        const rolledPlayer = updatePlayer(latestPlayer.wallet_address, { game_progress: progress });
        const roll = generateCubeRoll(latestPlayer);
        const id = randomUUID();
        db.prepare(`
          INSERT INTO player_cube_rolls
            (id, player_id, wallet_address, cube_faces, target_face_index, target_tile_index, prize, status, created_at)
          VALUES (?, ?, ?, ?, ?, ?, ?, 'pending', ?)
        `).run(id, latestPlayer.id, latestPlayer.wallet_address, toJson(roll.faces, []), roll.targetFace, roll.targetTile, toJson(roll.prize, {}), nowIso());
        return edgeResponse({
          player: rolledPlayer,
          roll: {
            id,
            cube_faces: roll.faces,
            target_face_index: roll.targetFace,
            target_tile_index: roll.targetTile,
            prize: roll.prize,
          },
        });
      });
    }

    case 'apply_cube_reward': {
      return withTransaction(() => {
        const rollId = String(body.roll_id || '');
        const row = db.prepare('SELECT * FROM player_cube_rolls WHERE id = ? AND wallet_address = ?').get(rollId, player.wallet_address);
        if (!row) throw httpError(404, 'Cube roll not found');
        if (row.status !== 'pending') throw httpError(400, 'Cube reward already applied');
        const latestPlayer = getPlayerByWallet(player.wallet_address) || player;
        const prize = safeJsonParse(row.prize, {});
        const updated = applyPrize(latestPlayer, prize, { monSourceRef: `cube:${rollId}` });
        const applied = db.prepare("UPDATE player_cube_rolls SET status = 'applied', applied_at = ? WHERE id = ? AND wallet_address = ? AND status = 'pending'")
          .run(nowIso(), rollId, latestPlayer.wallet_address);
        if (applied.changes !== 1) throw httpError(409, 'Cube reward already applied');
        return edgeResponse({ player: updated, prize });
      });
    }

    case 'claim_task_reward': {
      const taskId = String(body.task_id || '');
      const updated = claimProgressReward(player, taskId);
      return edgeResponse({ player: updated });
    }

    case 'claim_social_task_reward': {
      const taskId = String(body.task_id || '');
      const verification = getSocialVerification(player, taskId);
      if (verification.status !== 'verified') throw httpError(400, 'Social task is not verified yet');
      db.prepare("UPDATE social_task_verifications SET status = 'claimed', updated_at = ? WHERE player_id = ? AND task_id = ?")
        .run(nowIso(), player.id, taskId);
      return edgeResponse({ player, verification: getSocialVerification(player, taskId) });
    }

    case 'cook_recipe': {
      return withTransaction(() => {
        const currentPlayer = getPlayerByWallet(player.wallet_address) || player;
        const recipeId = String(body.recipe_id || '');
        const recipe = GRILL_RECIPES[recipeId];
        if (!recipe) throw httpError(400, 'Unknown recipe');
        const inventory = Array.isArray(currentPlayer.inventory) ? [...currentPlayer.inventory] : [];
        for (const [fishId, qty] of Object.entries(recipe.ingredients)) {
          const item = inventory.find((entry) => entry.fishId === fishId);
          if (!item || Number(item.quantity || 0) < qty) throw httpError(400, 'Not enough fish');
        }
        for (const [fishId, qty] of Object.entries(recipe.ingredients)) {
          const item = inventory.find((entry) => entry.fishId === fishId);
          item.quantity -= qty;
        }
        const cooked = Array.isArray(currentPlayer.cooked_dishes) ? [...currentPlayer.cooked_dishes] : [];
        const dish = cooked.find((entry) => entry.recipeId === recipeId);
        if (dish) dish.quantity = Number(dish.quantity || 0) + 1;
        else cooked.push({ recipeId, quantity: 1, createdAt: nowIso() });
        const progressUpdate = progressGrillCook(currentPlayer, recipe.score);
        const updated = updatePlayer(currentPlayer.wallet_address, {
          ...progressUpdate.patch,
          inventory: inventory.filter((item) => Number(item.quantity || 0) > 0),
          cooked_dishes: cooked,
        });
        const leaderboard = upsertLeaderboard({
          id: `wallet:${currentPlayer.wallet_address}`,
          name: currentPlayer.nickname || 'Guest griller',
          score: Number(ensureGameProgress(updated.game_progress).grillScore || 0),
          dishesDelta: 1,
          walletAddress: currentPlayer.wallet_address,
        });
        return edgeResponse({ player: updated, leaderboard_entry: leaderboard });
      });
    }

    case 'sell_cooked_dish': {
      return withTransaction(() => {
        const currentPlayer = getPlayerByWallet(player.wallet_address) || player;
        const recipeId = String(body.recipe_id || '');
        const recipe = GRILL_RECIPES[recipeId];
        const cooked = Array.isArray(currentPlayer.cooked_dishes) ? [...currentPlayer.cooked_dishes] : [];
        const dish = cooked.find((entry) => entry.recipeId === recipeId);
        if (!dish || Number(dish.quantity || 0) <= 0) throw httpError(400, 'Dish not found');
        dish.quantity -= 1;
        const progressUpdate = progressDishSold(currentPlayer);
        const updated = updatePlayer(currentPlayer.wallet_address, {
          ...progressUpdate.patch,
          cooked_dishes: cooked.filter((item) => Number(item.quantity || 0) > 0),
          coins: Number(currentPlayer.coins || 0) + Number(recipe?.score || 0),
        });
        return edgeResponse({ player: updated });
      });
    }

    case 'update_grill_leaderboard': {
      const leaderboardId = `wallet:${player.wallet_address}`;
      const existing = db.prepare('SELECT * FROM grill_leaderboard WHERE id = ?').get(leaderboardId);
      const leaderboard = upsertLeaderboard({
        id: leaderboardId,
        name: String(body.name || player.nickname || 'Guest griller'),
        score: Number(existing?.score || 0),
        dishes: Number(existing?.dishes || 0),
        walletAddress: player.wallet_address,
      });
      return edgeResponse({ leaderboard_entry: leaderboard });
    }

    case 'list_social_tasks':
      return edgeResponse({ verifications: SOCIAL_TASKS.map((taskId) => getSocialVerification(player, taskId)) });

    case 'submit_social_task_verification': {
      const taskId = String(body.task_id || '');
      if (!SOCIAL_TASKS.includes(taskId)) throw httpError(400, 'Unknown social task');
      const now = nowIso();
      db.prepare(`
        INSERT INTO social_task_verifications
          (id, player_id, wallet_address, task_id, status, proof_url, created_at, updated_at)
        VALUES (?, ?, ?, ?, 'pending_verification', ?, ?, ?)
        ON CONFLICT(player_id, task_id) DO UPDATE SET
          status = 'pending_verification', proof_url = excluded.proof_url, updated_at = excluded.updated_at
      `).run(randomUUID(), player.id, player.wallet_address, taskId, body.proof_url || null, now, now);
      return edgeResponse({ verification: getSocialVerification(player, taskId) });
    }

    default:
      throw httpError(400, 'Unknown action');
  }
}

function getSocialVerification(player, taskId) {
  const row = db.prepare('SELECT * FROM social_task_verifications WHERE player_id = ? AND task_id = ?').get(player.id, taskId);
  return {
    task_id: taskId,
    status: row?.status || 'available',
    proof_url: row?.proof_url || null,
    updated_at: row?.updated_at || nowIso(),
    verified_by_wallet: row?.verified_by_wallet || null,
  };
}

function monSummary(player) {
  const rewards = db.prepare('SELECT amount_mon, hold_until FROM player_mon_rewards WHERE wallet_address = ?').all(player.wallet_address);
  const requests = db.prepare("SELECT amount_mon, status FROM mon_withdraw_requests WHERE wallet_address = ? AND status IN ('pending', 'approved')").all(player.wallet_address);
  const now = Date.now();
  const totalEarnedMon = rewards.reduce((sum, row) => sum + Number(row.amount_mon || 0), 0);
  const pendingHoldMon = rewards.reduce((sum, row) => (
    new Date(row.hold_until).getTime() > now ? sum + Number(row.amount_mon || 0) : sum
  ), 0);
  const pendingRequestMon = requests.reduce((sum, row) => sum + Number(row.amount_mon || 0), 0);
  return {
    totalEarnedMon,
    pendingHoldMon,
    withdrawableMon: Math.max(0, totalEarnedMon - pendingHoldMon - pendingRequestMon),
    pendingRequestMon,
    minWithdrawMon: MIN_WITHDRAW_MON,
    holdDays: MON_HOLD_DAYS,
  };
}

function playerMon(body) {
  const player = requireWalletSession(body);
  requireRealWalletPlayer(player, 'Connect a verified wallet to use MON rewards.');
  const action = String(body.action || '');
  if (action === 'get_mon_summary') return edgeResponse({ summary: monSummary(player) });
  if (action === 'list_my_withdraw_requests') {
    const limit = Math.max(1, Math.min(50, Number(body.limit || 12)));
    const requests = db.prepare('SELECT * FROM mon_withdraw_requests WHERE wallet_address = ? ORDER BY requested_at DESC LIMIT ?')
      .all(player.wallet_address, limit);
    return edgeResponse({ requests });
  }
  if (action === 'create_withdraw_request') {
    const summary = monSummary(player);
    if (summary.withdrawableMon < MIN_WITHDRAW_MON) throw httpError(400, 'Minimum withdraw balance is not available yet.');
    const now = nowIso();
    const id = randomUUID();
    db.prepare(`
      INSERT INTO mon_withdraw_requests
        (id, player_id, wallet_address, amount_mon, status, requested_at)
      VALUES (?, ?, ?, ?, 'pending', ?)
    `).run(id, player.id, player.wallet_address, summary.withdrawableMon, now);
    const request = db.prepare('SELECT * FROM mon_withdraw_requests WHERE id = ?').get(id);
    return edgeResponse({ request, summary: monSummary(player) });
  }
  throw httpError(400, 'Unknown action');
}

function playerMessages(body) {
  const player = requireWalletSession(body);
  const action = String(body.action || '');
  if (action === 'list_my_messages') {
    const limit = Math.max(1, Math.min(50, Number(body.limit || 8)));
    return edgeResponse({
      messages: db.prepare('SELECT * FROM player_messages WHERE player_id = ? ORDER BY created_at DESC LIMIT ?').all(player.id, limit),
    });
  }
  if (action === 'get_unread_count') {
    const row = db.prepare('SELECT COUNT(*) AS count FROM player_messages WHERE player_id = ? AND read_at IS NULL').get(player.id);
    return edgeResponse({ unread_count: row.count });
  }
  if (action === 'mark_message_read') {
    const messageId = String(body.message_id || '');
    db.prepare('UPDATE player_messages SET read_at = COALESCE(read_at, ?) WHERE id = ? AND player_id = ?').run(nowIso(), messageId, player.id);
    const message = db.prepare('SELECT * FROM player_messages WHERE id = ? AND player_id = ?').get(messageId, player.id);
    if (!message) throw httpError(404, 'Message not found');
    return edgeResponse({ message });
  }
  throw httpError(400, 'Unknown action');
}

function isAdminWallet(walletAddress) {
  return ADMIN_WALLETS.has(walletAddress) || Boolean(db.prepare('SELECT wallet_address FROM admin_roles WHERE wallet_address = ?').get(walletAddress));
}

function requireAdmin(body) {
  const player = requireWalletSession(body);
  if (!isAdminWallet(player.wallet_address)) throw httpError(403, 'Admin access required');
  return player;
}

function auditRowsForPlayer(playerId, limit = 25) {
  const player = getPlayerById(playerId);
  if (!player) return [];
  return db.prepare('SELECT * FROM player_audit_logs WHERE wallet_address = ? ORDER BY created_at DESC LIMIT ?').all(player.wallet_address, limit)
    .map((row) => ({
      ...row,
      before_state: safeJsonParse(row.before_state, {}),
      after_state: safeJsonParse(row.after_state, {}),
      delta_state: safeJsonParse(row.delta_state, {}),
      metadata: safeJsonParse(row.metadata, {}),
    }));
}

function admin(body) {
  const action = String(body.action || '');
  if (action === 'check_admin') {
    const player = requireWalletSession(body);
    return edgeResponse({ is_admin: isAdminWallet(player.wallet_address) });
  }

  const adminPlayer = requireAdmin(body);

  if (action === 'list_players') {
    const perPage = Math.max(1, Math.min(100, Number(body.per_page || 25)));
    const page = Math.max(1, Number(body.page || 1));
    const search = typeof body.search === 'string' ? body.search.trim().toLowerCase() : '';
    const allPlayers = db.prepare('SELECT * FROM players ORDER BY updated_at DESC').all().map(playerFromRow)
      .filter((player) => !search || player.wallet_address.includes(search) || (player.nickname || '').toLowerCase().includes(search));
    return edgeResponse({ players: allPlayers.slice((page - 1) * perPage, page * perPage), total: allPlayers.length });
  }

  if (action === 'get_player' || action === 'get_player_details') {
    const player = getPlayerById(String(body.player_id || ''));
    if (!player) throw httpError(404, 'Player not found');
    const grill = db.prepare('SELECT * FROM grill_leaderboard WHERE wallet_address = ?').get(player.wallet_address) || null;
    return edgeResponse({
      player,
      progress_profile: buildAdminPlayerProgressProfile(player),
      grill_summary: grill ? { score: grill.score, dishes: grill.dishes, updated_at: grill.updated_at } : null,
      inventory_summary: Array.isArray(player.inventory) ? player.inventory.map((item) => ({ fish_id: item.fishId, quantity: item.quantity })) : [],
      referral_summary: {
        referrer_wallet_address: player.referrer_wallet_address,
        rewarded_referral_count: player.rewarded_referral_count,
        wallet_bait_bonus_claimed: player.wallet_bait_bonus_claimed,
      },
      suspicious_flags: [],
    });
  }

  if (action === 'list_player_activity') return edgeResponse({ activity: auditRowsForPlayer(String(body.player_id || ''), Number(body.limit || 25)) });
  if (action === 'list_player_messages') {
    return edgeResponse({ messages: db.prepare('SELECT * FROM player_messages WHERE player_id = ? ORDER BY created_at DESC LIMIT ?').all(String(body.player_id || ''), Number(body.limit || 25)) });
  }
  if (action === 'send_player_message') {
    const target = getPlayerById(String(body.player_id || ''));
    if (!target) throw httpError(404, 'Player not found');
    insertMessage(target, adminPlayer.wallet_address, body.title, body.body);
    return edgeResponse({ success: true });
  }
  if (action === 'send_broadcast_message') {
    const players = db.prepare('SELECT * FROM players').all().map(playerFromRow);
    for (const player of players) insertMessage(player, adminPlayer.wallet_address, body.title, body.body);
    return edgeResponse({ inserted_count: players.length });
  }
  if (action === 'update_player') {
    const patch = body.updates && typeof body.updates === 'object' ? body.updates : {};
    const updatedPlayer = adminPatchPlayerById(String(body.player_id || ''), patch, adminPlayer.wallet_address);
    return edgeResponse({
      player: updatedPlayer,
      progress_profile: buildAdminPlayerProgressProfile(updatedPlayer),
    });
  }
  if (action === 'delete_player') {
    const playerId = String(body.player_id || '');
    db.prepare('DELETE FROM players WHERE id = ?').run(playerId);
    return edgeResponse({ success: true });
  }
  if (action === 'get_stats') {
    const players = db.prepare('SELECT * FROM players').all().map(playerFromRow);
    return edgeResponse({
      stats: {
        totalPlayers: players.length,
        totalCoins: players.reduce((sum, player) => sum + player.coins, 0),
        totalCatches: players.reduce((sum, player) => sum + player.total_catches, 0),
        avgLevel: players.length ? players.reduce((sum, player) => sum + player.level, 0) / players.length : 0,
        maxLevel: Math.max(0, ...players.map((player) => player.level)),
        activeToday: players.filter((player) => (player.last_login || '').slice(0, 10) === todayKey()).length,
        levelDistribution: {},
        rodDistribution: {},
        topByLevel: [...players].sort((a, b) => b.level - a.level).slice(0, 10),
        topByCoins: [...players].sort((a, b) => b.coins - a.coins).slice(0, 10),
        topByCatches: [...players].sort((a, b) => b.total_catches - a.total_catches).slice(0, 10),
      },
    });
  }
  if (action === 'list_withdraw_requests') {
    const rows = db.prepare('SELECT * FROM mon_withdraw_requests ORDER BY requested_at DESC LIMIT ?').all(Number(body.limit || 50));
    return edgeResponse({ requests: rows.map((row) => ({ ...row, player_nickname: getPlayerById(row.player_id)?.nickname || null })) });
  }
  if (action === 'get_admin_withdraw_summary') {
    const rows = db.prepare('SELECT status, amount_mon FROM mon_withdraw_requests').all();
    return edgeResponse({ summary: summarizeWithdraws(rows) });
  }
  if (['approve_withdraw_request', 'reject_withdraw_request', 'mark_withdraw_paid'].includes(action)) {
    const status = action === 'approve_withdraw_request' ? 'approved' : action === 'reject_withdraw_request' ? 'rejected' : 'paid';
    db.prepare('UPDATE mon_withdraw_requests SET status = ?, processed_at = ?, processed_by_wallet = ?, payout_tx_hash = COALESCE(?, payout_tx_hash), admin_note = COALESCE(?, admin_note) WHERE id = ?')
      .run(status, nowIso(), adminPlayer.wallet_address, body.payout_tx_hash || null, body.admin_note || null, String(body.request_id || ''));
    return edgeResponse({ request: db.prepare('SELECT * FROM mon_withdraw_requests WHERE id = ?').get(String(body.request_id || '')) });
  }
  if (action === 'grant_mon_reward') {
    const target = getPlayerById(String(body.player_id || ''));
    if (!target) throw httpError(404, 'Player not found');
    insertMonReward(target, Number(body.amount_mon || 0), 'admin_grant', randomUUID(), adminPlayer.wallet_address, body.admin_note || null);
    return edgeResponse({ success: true });
  }
  if (action === 'get_suspicious_summary') {
    return edgeResponse({ summary: { flagged_players: 0, high_coin_gain_players: 0, high_bait_gain_players: 0, high_cube_reward_players: 0, withdraw_spam_players: 0, rate_limited_subjects: 0, latest_signal_at: null } });
  }
  if (action === 'list_suspicious_players') return edgeResponse({ players: [] });
  if (action === 'preview_weekly_payouts') return edgeResponse({ week_key: todayKey(), already_applied: false, preview: [], existing_batch: null });
  if (action === 'apply_weekly_payouts') return edgeResponse({ batch: { id: randomUUID(), week_key: todayKey(), payouts: [], total_amount_mon: 0, created_by_wallet: adminPlayer.wallet_address, created_at: nowIso(), applied_at: nowIso() } });
  if (action === 'list_weekly_payout_batches') return edgeResponse({ batches: [] });
  if (action === 'list_social_task_verifications') {
    const rows = db.prepare('SELECT * FROM social_task_verifications ORDER BY updated_at DESC LIMIT ?').all(Number(body.limit || 100));
    return edgeResponse({ verifications: rows.map((row) => ({ ...row, player_nickname: getPlayerById(row.player_id)?.nickname || null })) });
  }
  if (action === 'set_social_task_verification') {
    db.prepare('UPDATE social_task_verifications SET status = ?, verified_by_wallet = ?, updated_at = ? WHERE id = ?')
      .run(String(body.status || 'verified'), adminPlayer.wallet_address, nowIso(), String(body.verification_id || ''));
    const row = db.prepare('SELECT * FROM social_task_verifications WHERE id = ?').get(String(body.verification_id || ''));
    return edgeResponse({ verification: { ...row, player_nickname: row ? getPlayerById(row.player_id)?.nickname || null : null } });
  }

  throw httpError(400, 'Unknown action');
}

function insertMessage(player, createdByWallet, title, body) {
  const now = nowIso();
  db.prepare(`
    INSERT INTO player_messages
      (id, player_id, title, body, created_by_wallet, created_at, delivered_at)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run(randomUUID(), player.id, String(title || '').slice(0, 120), String(body || '').slice(0, 2000), createdByWallet, now, now);
}

function summarizeWithdraws(rows) {
  const summary = { pending_count: 0, approved_count: 0, rejected_count: 0, paid_count: 0, pending_amount_mon: 0 };
  for (const row of rows) {
    if (row.status === 'pending') {
      summary.pending_count += 1;
      summary.pending_amount_mon += Number(row.amount_mon || 0);
    }
    if (row.status === 'approved') summary.approved_count += 1;
    if (row.status === 'rejected') summary.rejected_count += 1;
    if (row.status === 'paid') summary.paid_count += 1;
  }
  return summary;
}

function upsertLeaderboard({ id, name, score, dishes, dishesDelta = 0, walletAddress = null }) {
  const now = nowIso();
  const existing = db.prepare('SELECT * FROM grill_leaderboard WHERE id = ?').get(id);
  const next = {
    id,
    name: String(name || 'Guest griller').trim().slice(0, 24) || 'Guest griller',
    score: Math.max(Number(existing?.score || 0), Number(score || 0)),
    dishes: dishes == null
      ? Math.max(0, Number(existing?.dishes || 0) + Number(dishesDelta || 0))
      : Math.max(0, Number(dishes || 0)),
    wallet_address: walletAddress,
    updated_at: now,
  };
  if (existing) {
    db.prepare('UPDATE grill_leaderboard SET name = ?, score = ?, dishes = ?, wallet_address = ?, updated_at = ? WHERE id = ?')
      .run(next.name, next.score, next.dishes, next.wallet_address, now, id);
  } else {
    db.prepare('INSERT INTO grill_leaderboard (id, name, score, dishes, wallet_address, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)')
      .run(id, next.name, next.score, next.dishes, next.wallet_address, now, now);
  }
  return db.prepare('SELECT * FROM grill_leaderboard WHERE id = ?').get(id);
}

function listLeaderboard() {
  return db.prepare('SELECT * FROM grill_leaderboard ORDER BY score DESC, updated_at DESC LIMIT 100').all();
}

async function uploadAvatar(body) {
  const player = requireWalletSession(body);
  const filename = typeof body.filename === 'string' ? body.filename : 'avatar.png';
  const dataUrl = typeof body.dataUrl === 'string' ? body.dataUrl : '';
  const match = dataUrl.match(/^data:([^;]+);base64,(.+)$/);
  if (!match) throw httpError(400, 'Invalid avatar data');
  const ext = (extname(filename).replace('.', '').toLowerCase() || 'png').replace(/[^a-z0-9]/g, '');
  const safeExt = ['png', 'jpg', 'jpeg', 'webp', 'gif'].includes(ext) ? ext : 'png';
  const relativePath = `avatars/${player.wallet_address}.${safeExt}`;
  const diskPath = join(UPLOAD_DIR, relativePath);
  writeFileSync(diskPath, Buffer.from(match[2], 'base64'));
  const publicUrl = `/api/uploads/${relativePath}`;
  const updated = updatePlayer(player.wallet_address, { avatar_url: publicUrl });
  return { player: updated, publicUrl };
}

function sanitizeClientEventType(value) {
  return String(value || 'client_event')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_.:-]+/g, '_')
    .slice(0, 80) || 'client_event';
}

function sanitizeClientAuditValue(value, fallback = {}) {
  try {
    const serialized = JSON.stringify(value ?? fallback);
    if (serialized.length <= 12_000) return JSON.parse(serialized);
    return {
      truncated: true,
      preview: serialized.slice(0, 12_000),
    };
  } catch {
    return fallback;
  }
}

function logClientPlayerEvent(body) {
  const wallet = normalizePlayerIdentity(body.wallet_address || body.walletAddress);
  if (!wallet) return { success: true, skipped: 'missing_identity' };
  if (!verifySessionToken(body.session_token, wallet)) return { success: true, skipped: 'invalid_session' };

  const player = ensurePlayer(wallet);
  const eventType = sanitizeClientEventType(body.event_type);
  addAudit(
    player.wallet_address,
    eventType,
    sanitizeClientAuditValue(body.metadata),
    sanitizeClientAuditValue(body.before_state),
    sanitizeClientAuditValue(body.after_state),
    'client',
  );

  if (TEST_ACTIVITY_LOGS_ENABLED) {
    console.info(`[hookloot-activity] ${new Date().toISOString()} ${player.wallet_address} ${eventType}`);
  }

  return { success: true };
}

async function handleEdge(functionName, body) {
  switch (functionName) {
    case 'guest-session': return guestSession(body);
    case 'verify-wallet': return verifyWallet(body);
    case 'save-player-progress': return savePlayerProgress(body);
    case 'save-player-name': return savePlayerName(body);
    case 'verify-purchase': return verifyPurchase(body);
    case 'player-actions': return playerActions(body);
    case 'player-mon': return playerMon(body);
    case 'player-messages': return playerMessages(body);
    case 'admin': return admin(body);
    case 'log-player-event': return logClientPlayerEvent(body);
    default:
      throw httpError(404, 'Unknown function');
  }
}

function serveUpload(req, res, url) {
  const relative = decodeURIComponent(url.pathname.replace('/api/uploads/', ''));
  const diskPath = normalize(join(UPLOAD_DIR, relative));
  if (!diskPath.startsWith(normalize(UPLOAD_DIR)) || !existsSync(diskPath)) {
    sendJson(res, 404, { error: 'File not found' });
    return;
  }
  const ext = extname(diskPath).toLowerCase();
  const type = ext === '.png' ? 'image/png'
    : ext === '.jpg' || ext === '.jpeg' ? 'image/jpeg'
      : ext === '.webp' ? 'image/webp'
        : ext === '.gif' ? 'image/gif'
          : 'application/octet-stream';
  res.writeHead(200, { 'Content-Type': type, 'Cache-Control': 'public, max-age=31536000, immutable' });
  res.end(readFileSync(diskPath));
}

const server = createServer(async (req, res) => {
  const url = new URL(req.url || '/', `http://${req.headers.host || 'localhost'}`);
  const requestStartedAt = Date.now();

  if (TEST_ACTIVITY_LOGS_ENABLED) {
    res.on('finish', () => {
      console.info(`[hookloot-api] ${new Date().toISOString()} ${req.method} ${url.pathname} ${res.statusCode} ${Date.now() - requestStartedAt}ms`);
    });
  }

  try {
    if (req.method === 'OPTIONS') {
      res.writeHead(204, {
        'Access-Control-Allow-Origin': req.headers.origin || '*',
        'Access-Control-Allow-Headers': 'authorization, content-type, apikey',
        'Access-Control-Allow-Methods': 'GET,POST,DELETE,OPTIONS',
      });
      res.end();
      return;
    }

    if (req.method === 'GET' && (url.pathname === '/healthz' || url.pathname === '/api/healthz')) {
      sendText(res, 200, 'ok\n');
      return;
    }

    if (req.method === 'GET' && url.pathname.startsWith('/api/uploads/')) {
      serveUpload(req, res, url);
      return;
    }

    if (req.method === 'POST' && url.pathname.startsWith('/api/edge/')) {
      const functionName = url.pathname.slice('/api/edge/'.length);
      const body = await readJson(req);
      sendJson(res, 200, await handleEdge(functionName, body));
      return;
    }

    if (req.method === 'GET' && url.pathname === '/api/leaderboard/grill') {
      sendJson(res, 200, { entries: listLeaderboard() });
      return;
    }

    if (req.method === 'POST' && url.pathname === '/api/leaderboard/grill') {
      sendJson(res, 410, { error: 'Leaderboard writes are handled by authenticated player actions' });
      return;
    }

    if (req.method === 'DELETE' && url.pathname.startsWith('/api/leaderboard/grill/')) {
      sendJson(res, 410, { error: 'Leaderboard deletion is handled by admin tools' });
      return;
    }

    if (req.method === 'POST' && url.pathname === '/api/player/avatar') {
      sendJson(res, 200, await uploadAvatar(await readJson(req)));
      return;
    }

    sendJson(res, 404, { error: 'Not found' });
  } catch (error) {
    const status = Number(error?.status || 500);
    const message = error instanceof Error ? error.message : 'Internal error';
    if (status >= 500) {
      console.error(`[hookloot-api] ${req.method} ${url.pathname} failed`, error);
    } else if (TEST_ACTIVITY_LOGS_ENABLED && status >= 400) {
      console.info(`[hookloot-api-error] ${new Date().toISOString()} ${req.method} ${url.pathname} ${status} ${message}`);
    }
    sendJson(res, status, { error: message });
  }
});

server.listen(PORT, () => {
  console.log(`Hook & Loot API listening on http://127.0.0.1:${PORT}`);
  console.log(`Data: ${DB_PATH}`);
});
