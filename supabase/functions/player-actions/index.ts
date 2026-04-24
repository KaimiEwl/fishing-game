import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { verifySessionToken } from "../_shared/session.ts";
import {
  buildServerCubeRoll,
  type CubePrize,
} from "../_shared/cubeConfig.ts";
import { enforceRateLimit } from "../_shared/rateLimit.ts";
import {
  DAILY_TASKS,
  SOCIAL_TASKS,
  SOCIAL_TASK_IDS,
  SPECIAL_TASKS,
  WEEKLY_MISSIONS,
  getTaskDefinition,
  type DailyTaskId,
  type SocialTaskId,
  type SocialTaskStatus,
  type SpecialTaskId,
  type WeeklyMissionId,
} from "../_shared/taskRegistry.ts";
import {
  createDefaultGameProgress,
  sanitizeGameProgress,
} from "../_shared/gameProgress.ts";
import { getGrillRecipe } from "../_shared/grillConfig.ts";
import { grantPlayerReward } from "../_shared/rewards.ts";
import {
  PREMIUM_SESSION_CASTS,
  PREMIUM_SESSION_COST_MON,
  buildPremiumSessionState,
  resolvePremiumCast,
  type PremiumCastRowLike,
  type PremiumReactionQuality,
  type PremiumSessionRowLike,
} from "../_shared/premiumFishing.ts";
import {
  fetchPlayerAuditSnapshot,
  insertPlayerAuditLog,
  sanitizeAuditSnapshot,
} from "../_shared/playerAudit.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const jsonHeaders = { ...corsHeaders, "Content-Type": "application/json" };

const DAILY_TASK_CLAIMS_REQUIRED = 3;
const DAILY_CUBE_ROLL_REWARD = 3;
const MONAD_RPC = "https://rpc.monad.xyz";
const WALLET_CHECK_IN_RECEIVER_ADDRESS = "0x0266Bd01196B04a7A57372Fc9fB2F34374E6327D";
const WALLET_CHECK_IN_AMOUNT_MON = "0.0001";
const WALLET_CHECK_IN_WEI = 100000000000000n;
const PREMIUM_SESSION_PAYMENT_RECEIVER_ADDRESS = WALLET_CHECK_IN_RECEIVER_ADDRESS;
const XP_PER_LEVEL = 100;
const PREMIUM_SESSION_LOW_RECOVERY_THRESHOLD_MON = 0.8;
const PREMIUM_SESSION_RESCUE_REQUIRED_BAD_SESSIONS = 2;
const PREMIUM_BIG_DROP_TIERS = new Set(["big", "spike", "jackpot"]);
const RARE_FISH_RANK = new Set(["rare", "epic", "legendary", "mythical", "secret"]);
const ROD_BONUSES = [0, 5, 10, 15, 25] as const;
const NFT_ROD_BONUSES = new Map<number, { rarityBonus: number; xpBonus: number; sellBonus: number }>([
  [0, { rarityBonus: 3, xpBonus: 10, sellBonus: 0 }],
  [1, { rarityBonus: 5, xpBonus: 15, sellBonus: 10 }],
  [2, { rarityBonus: 7, xpBonus: 20, sellBonus: 15 }],
  [3, { rarityBonus: 10, xpBonus: 25, sellBonus: 20 }],
  [4, { rarityBonus: 15, xpBonus: 30, sellBonus: 25 }],
]);

interface RpcResponse<T> {
  result?: T;
  error?: { message?: string };
}

interface RpcTransactionReceipt {
  status?: string;
  blockHash?: string;
}

interface RpcTransaction {
  from?: string;
  to?: string | null;
  value?: string;
}

interface RpcBlock {
  timestamp?: string;
}

interface WalletCheckInSummary {
  todayCheckedIn: boolean;
  streakDays: number;
  lastCheckInAt: string | null;
  lastCheckInDate: string | null;
  lastCheckInTxHash: string | null;
  receiverAddress: string;
  amountMon: string;
}

interface InventoryEntry {
  fishId: string;
  caughtAt: string;
  quantity: number;
}

interface CookedDishEntry {
  recipeId: string;
  createdAt: string;
  quantity: number;
}

interface SocialTaskVerificationRow {
  id: string;
  player_id: string;
  wallet_address: string;
  task_id: SocialTaskId;
  status: SocialTaskStatus;
  proof_url: string | null;
  verified_by_wallet: string | null;
  updated_at: string;
}

interface PlayerRow {
  id: string;
  wallet_address: string;
  coins: number;
  bait: number;
  daily_free_bait: number;
  daily_free_bait_reset_at: string | null;
  bonus_bait_granted_total: number;
  level: number;
  xp: number;
  xp_to_next: number;
  rod_level: number;
  equipped_rod: number;
  inventory: unknown;
  cooked_dishes: unknown;
  game_progress: unknown;
  total_catches: number;
  login_streak: number;
  nft_rods: unknown;
  nickname: string | null;
  avatar_url: string | null;
  referrer_wallet_address: string | null;
  rewarded_referral_count: number;
  updated_at: string;
}

interface PremiumSessionRow extends PremiumSessionRowLike {
  id: string;
  player_id: string;
  wallet_address: string;
  status: string;
  price_mon: number | string;
  casts_total: number;
  casts_used: number;
  luck_meter_stacks: number;
  zero_drop_streak: number;
  rescue_eligible: boolean;
  recovered_mon_total: number | string;
  started_at: string;
  completed_at: string | null;
}

interface PremiumCastAuditRow extends PremiumCastRowLike {
  id: string;
  session_id: string;
  cast_index: number;
  reaction_quality: string;
  fish_id: string;
  bonus_coins_awarded: number;
  bonus_xp_awarded: number;
  mon_drop_tier: string;
  mon_amount: number | string;
  luck_meter_before: number;
  luck_meter_after: number;
  zero_drop_streak_after: number;
  pity_triggered: boolean;
  rescue_triggered: boolean;
  hot_streak_active: boolean;
  created_at: string;
}

const FULL_PLAYER_SELECT = "id, wallet_address, coins, bait, daily_free_bait, daily_free_bait_reset_at, bonus_bait_granted_total, level, xp, xp_to_next, rod_level, equipped_rod, inventory, cooked_dishes, game_progress, total_catches, login_streak, nft_rods, nickname, avatar_url, referrer_wallet_address, rewarded_referral_count, updated_at";

const jsonResponse = (payload: unknown, status = 200) =>
  new Response(JSON.stringify(payload), { status, headers: jsonHeaders });

const badRequest = (message: string) => jsonResponse({ error: message }, 400);

const normalizeText = (value: unknown) => typeof value === "string" ? value.trim() : "";

const normalizeNullableText = (value: unknown, maxLength: number) => {
  const normalized = normalizeText(value);
  return normalized ? normalized.slice(0, maxLength) : null;
};

const normalizeWalletAddress = (value: unknown) => {
  const text = normalizeText(value);
  if (!/^0x[a-fA-F0-9]{40}$/.test(text)) return null;
  return text.toLowerCase();
};

const normalizeTxHash = (value: unknown) => {
  const text = normalizeText(value);
  if (!/^0x[a-fA-F0-9]{64}$/.test(text)) return null;
  return text.toLowerCase();
};

const clampInt = (value: unknown, fallback: number, min = 0, max = Number.MAX_SAFE_INTEGER) => {
  const parsed = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.max(min, Math.min(max, Math.floor(parsed)));
};

const normalizeIso = (value: unknown, fallback: string) => {
  if (typeof value !== "string" || value.trim() === "") return fallback;
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return fallback;
  return parsed.toISOString();
};

const sleep = (ms: number) => new Promise<void>((resolve) => {
  setTimeout(resolve, ms);
});

const getUtcDayKey = (date = new Date()) => date.toISOString().slice(0, 10);

const shiftUtcDayKey = (dayKey: string, offsetDays: number) => {
  const parsed = new Date(`${dayKey}T00:00:00.000Z`);
  parsed.setUTCDate(parsed.getUTCDate() + offsetDays);
  return parsed.toISOString().slice(0, 10);
};

const rpcCall = async <T>(method: string, params: unknown[]) => {
  const response = await fetch(MONAD_RPC, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      jsonrpc: "2.0",
      id: 1,
      method,
      params,
    }),
  });

  const payload = await response.json() as RpcResponse<T>;
  if (payload.error) {
    throw new Error(payload.error.message || `${method} failed`);
  }

  return payload.result ?? null;
};

const sanitizeInventory = (value: unknown): InventoryEntry[] => {
  if (!Array.isArray(value)) return [];

  return value.flatMap((item) => {
    if (!item || typeof item !== "object") return [];
    const fishId = typeof (item as Record<string, unknown>).fishId === "string"
      ? (item as Record<string, unknown>).fishId.trim()
      : "";
    if (!fishId) return [];

    return [{
      fishId,
      caughtAt: normalizeIso((item as Record<string, unknown>).caughtAt, new Date().toISOString()),
      quantity: clampInt((item as Record<string, unknown>).quantity, 0, 0, 99999),
    }];
  }).filter((item) => item.quantity > 0);
};

const sanitizeCookedDishes = (value: unknown): CookedDishEntry[] => {
  if (!Array.isArray(value)) return [];

  return value.flatMap((item) => {
    if (!item || typeof item !== "object") return [];
    const recipeId = typeof (item as Record<string, unknown>).recipeId === "string"
      ? (item as Record<string, unknown>).recipeId.trim()
      : "";
    if (!recipeId) return [];

    return [{
      recipeId,
      createdAt: normalizeIso((item as Record<string, unknown>).createdAt, new Date().toISOString()),
      quantity: clampInt((item as Record<string, unknown>).quantity, 0, 0, 99999),
    }];
  }).filter((item) => item.quantity > 0);
};

const addInventoryFish = (
  inventory: InventoryEntry[],
  fishId: string,
  quantity: number,
) => {
  const existing = inventory.find((item) => item.fishId === fishId);
  if (existing) {
    return inventory.map((item) => (
      item.fishId === fishId
        ? { ...item, quantity: item.quantity + quantity, caughtAt: new Date().toISOString() }
        : item
    ));
  }

  return [...inventory, {
    fishId,
    quantity,
    caughtAt: new Date().toISOString(),
  }];
};

const consumeInventoryFish = (
  inventory: InventoryEntry[],
  ingredients: Record<string, number>,
) => {
  for (const [fishId, amount] of Object.entries(ingredients)) {
    const owned = inventory.find((item) => item.fishId === fishId)?.quantity ?? 0;
    if (owned < amount) {
      return null;
    }
  }

  return inventory
    .map((item) => ({
      ...item,
      quantity: item.quantity - (ingredients[item.fishId] ?? 0),
    }))
    .filter((item) => item.quantity > 0);
};

const addCookedDish = (
  cookedDishes: CookedDishEntry[],
  recipeId: string,
  quantity: number,
) => {
  const existing = cookedDishes.find((item) => item.recipeId === recipeId);
  if (existing) {
    return cookedDishes.map((item) => (
      item.recipeId === recipeId
        ? { ...item, quantity: item.quantity + quantity, createdAt: new Date().toISOString() }
        : item
    ));
  }

  return [...cookedDishes, {
    recipeId,
    quantity,
    createdAt: new Date().toISOString(),
  }];
};

const consumeCookedDish = (
  cookedDishes: CookedDishEntry[],
  recipeId: string,
) => {
  const owned = cookedDishes.find((item) => item.recipeId === recipeId);
  if (!owned || owned.quantity <= 0) return null;

  return cookedDishes
    .map((item) => (
      item.recipeId === recipeId
        ? { ...item, quantity: item.quantity - 1 }
        : item
    ))
    .filter((item) => item.quantity > 0);
};

const getTodayKey = () => {
  return getUtcDayKey();
};

const getTodayRange = () => {
  const now = new Date();
  const start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  const end = new Date(start);
  end.setUTCDate(end.getUTCDate() + 1);
  return {
    startIso: start.toISOString(),
    endIso: end.toISOString(),
  };
};

const normalizeGameProgressForToday = (value: unknown) => {
  const progress = sanitizeGameProgress(value);
  if (progress.date === getTodayKey()) {
    return progress;
  }

  return {
    ...createDefaultGameProgress(),
    weekKey: progress.weekKey,
    weeklyMissions: progress.weeklyMissions,
    lastWeeklyCubeUnlockDate: progress.lastWeeklyCubeUnlockDate,
    grillScore: progress.grillScore,
    paidWheelRolls: progress.paidWheelRolls,
  };
};

const fetchTodayReferralAttachCount = async (
  supabase: ReturnType<typeof createClient>,
  referrerWalletAddress: string,
) => {
  const { startIso, endIso } = getTodayRange();
  const { data, error } = await supabase
    .from("player_audit_logs")
    .select("metadata")
    .eq("event_type", "referrer_attached")
    .gte("created_at", startIso)
    .lt("created_at", endIso);

  if (error) throw error;

  return (data ?? []).reduce((count, row) => {
    const metadata = row && typeof row === "object"
      ? (row as Record<string, unknown>).metadata as Record<string, unknown> | null
      : null;
    const attachedReferrer = typeof metadata?.referrerWalletAddress === "string"
      ? metadata.referrerWalletAddress.toLowerCase()
      : null;
    return attachedReferrer === referrerWalletAddress ? count + 1 : count;
  }, 0);
};

const loadWalletCheckInEvents = async (
  supabase: ReturnType<typeof createClient>,
  walletAddress: string,
) => {
  const { data, error } = await supabase
    .from("player_audit_logs")
    .select("created_at, metadata")
    .eq("wallet_address", walletAddress)
    .eq("event_type", "wallet_daily_check_in")
    .order("created_at", { ascending: false })
    .limit(120);

  if (error) throw error;
  return data ?? [];
};

const buildWalletCheckInSummary = async (
  supabase: ReturnType<typeof createClient>,
  walletAddress: string,
): Promise<WalletCheckInSummary> => {
  const rows = await loadWalletCheckInEvents(supabase, walletAddress);
  const byDay = new Map<string, { createdAt: string; txHash: string | null }>();

  for (const row of rows) {
    const metadata = row && typeof row === "object"
      ? (row as Record<string, unknown>).metadata as Record<string, unknown> | null
      : null;
    const checkInDate = typeof metadata?.checkInDate === "string"
      ? metadata.checkInDate
      : normalizeIso((row as Record<string, unknown>).created_at, new Date().toISOString()).slice(0, 10);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(checkInDate) || byDay.has(checkInDate)) continue;

    byDay.set(checkInDate, {
      createdAt: normalizeIso((row as Record<string, unknown>).created_at, new Date().toISOString()),
      txHash: typeof metadata?.txHash === "string" ? metadata.txHash : null,
    });
  }

  const orderedDays = [...byDay.keys()].sort((left, right) => right.localeCompare(left));
  const todayKey = getUtcDayKey();
  const yesterdayKey = shiftUtcDayKey(todayKey, -1);
  let streakDays = 0;

  if (orderedDays.length > 0 && [todayKey, yesterdayKey].includes(orderedDays[0])) {
    let expectedDay = orderedDays[0];
    for (const day of orderedDays) {
      if (day !== expectedDay) break;
      streakDays += 1;
      expectedDay = shiftUtcDayKey(expectedDay, -1);
    }
  }

  const todayEntry = byDay.get(todayKey) ?? null;
  const latestDay = orderedDays[0] ?? null;
  const latestEntry = latestDay ? byDay.get(latestDay) ?? null : null;

  return {
    todayCheckedIn: Boolean(todayEntry),
    streakDays,
    lastCheckInAt: latestEntry?.createdAt ?? null,
    lastCheckInDate: latestDay,
    lastCheckInTxHash: latestEntry?.txHash ?? null,
    receiverAddress: WALLET_CHECK_IN_RECEIVER_ADDRESS,
    amountMon: WALLET_CHECK_IN_AMOUNT_MON,
  };
};

const hasWalletCheckInTxHash = async (
  supabase: ReturnType<typeof createClient>,
  walletAddress: string,
  txHash: string,
) => {
  const { data, error } = await supabase
    .from("player_audit_logs")
    .select("id")
    .eq("wallet_address", walletAddress)
    .eq("event_type", "wallet_daily_check_in")
    .contains("metadata", { txHash })
    .limit(1)
    .maybeSingle();

  if (error) throw error;
  return Boolean(data);
};

const verifyWalletCheckInTransaction = async (
  walletAddress: string,
  txHash: string,
) => {
  const receipt = await rpcCall<RpcTransactionReceipt>("eth_getTransactionReceipt", [txHash]);
  if (!receipt) {
    throw new Error("Transaction is still pending. Try again in a few seconds.");
  }

  if (receipt.status !== "0x1") {
    throw new Error("On-chain transaction failed.");
  }

  const tx = await rpcCall<RpcTransaction>("eth_getTransactionByHash", [txHash]);
  if (!tx) {
    throw new Error("Could not fetch transaction details.");
  }

  if (tx.from?.toLowerCase() !== walletAddress) {
    throw new Error("Transaction sender does not match the connected wallet.");
  }

  if (tx.to?.toLowerCase() !== WALLET_CHECK_IN_RECEIVER_ADDRESS.toLowerCase()) {
    throw new Error("Wrong recipient address for wallet check-in.");
  }

  const valueWei = typeof tx.value === "string" ? BigInt(tx.value) : 0n;
  if (valueWei !== WALLET_CHECK_IN_WEI) {
    throw new Error(`Wallet check-in must send exactly ${WALLET_CHECK_IN_AMOUNT_MON} MON.`);
  }

  const block = receipt.blockHash
    ? await rpcCall<RpcBlock>("eth_getBlockByHash", [receipt.blockHash, false])
    : null;

  if (!block?.timestamp) {
    throw new Error("Could not fetch block timestamp for wallet check-in.");
  }

  const txTimestamp = new Date(Number.parseInt(block.timestamp, 16) * 1000);
  if (Number.isNaN(txTimestamp.getTime())) {
    throw new Error("Invalid block timestamp for wallet check-in.");
  }

  const checkInDate = getUtcDayKey(txTimestamp);
  if (checkInDate !== getUtcDayKey()) {
    throw new Error("Wallet check-in transaction must be sent today.");
  }

  return {
    txTimestampIso: txTimestamp.toISOString(),
    checkInDate,
  };
};

const toExpectedMonWei = (amountMon: string) => BigInt(Math.round(Number.parseFloat(amountMon) * 1e18));

const hasPremiumSessionTxHash = async (
  supabase: ReturnType<typeof createClient>,
  walletAddress: string,
  txHash: string,
) => {
  const { data, error } = await supabase
    .from("player_audit_logs")
    .select("id")
    .eq("wallet_address", walletAddress)
    .eq("event_type", "premium_session_started")
    .contains("metadata", { txHash })
    .limit(1)
    .maybeSingle();

  if (error) throw error;
  return Boolean(data);
};

const verifyPremiumSessionPaymentTransaction = async (
  walletAddress: string,
  txHash: string,
  expectedMonAmount: string,
) => {
  const receipt = await rpcCall<RpcTransactionReceipt>("eth_getTransactionReceipt", [txHash]);
  if (!receipt) {
    throw new Error("Premium session transaction is still pending. Try again in a few seconds.");
  }

  if (receipt.status !== "0x1") {
    throw new Error("Premium session payment failed on-chain.");
  }

  const tx = await rpcCall<RpcTransaction>("eth_getTransactionByHash", [txHash]);
  if (!tx) {
    throw new Error("Could not fetch premium session payment details.");
  }

  if (tx.from?.toLowerCase() !== walletAddress) {
    throw new Error("Transaction sender does not match the connected wallet.");
  }

  if (tx.to?.toLowerCase() !== PREMIUM_SESSION_PAYMENT_RECEIVER_ADDRESS.toLowerCase()) {
    throw new Error("Wrong recipient address for premium session payment.");
  }

  const valueWei = typeof tx.value === "string" ? BigInt(tx.value) : 0n;
  const expectedWei = toExpectedMonWei(expectedMonAmount);
  const minExpectedWei = expectedWei * 99n / 100n;
  if (valueWei < minExpectedWei) {
    throw new Error(`Premium session requires at least ${expectedMonAmount} MON.`);
  }

  return {
    paidMon: Number(valueWei) / 1e18,
  };
};

const getNftBonuses = (equippedRod: number, nftRods: unknown) => {
  const ownedNftRods = Array.isArray(nftRods)
    ? nftRods.map((value) => Number(value)).filter((value) => Number.isFinite(value))
    : [];
  if (!ownedNftRods.includes(equippedRod)) {
    return { rarityBonus: 0, xpBonus: 0, sellBonus: 0 };
  }

  return NFT_ROD_BONUSES.get(equippedRod) ?? { rarityBonus: 0, xpBonus: 0, sellBonus: 0 };
};

const applyXpProgress = (
  player: Pick<PlayerRow, "level" | "xp" | "xp_to_next">,
  xpGain: number,
) => {
  let newLevel = player.level;
  let remainingXp = player.xp + xpGain;
  let xpToNext = player.xp_to_next;
  let levelUpCoins = 0;

  while (remainingXp >= xpToNext) {
    remainingXp -= xpToNext;
    newLevel += 1;
    xpToNext = newLevel * XP_PER_LEVEL;
    levelUpCoins += 100 * newLevel;
  }

  return {
    level: newLevel,
    xp: remainingXp,
    xpToNext: xpToNext,
    levelUpCoins,
  };
};

const applyPremiumCatchTasks = (
  progress: ReturnType<typeof normalizeGameProgressForToday>,
  fishRarity: string,
) => {
  const catchTask = progress.tasks.catch_10;
  const rareTask = progress.tasks.rare_1;

  return {
    ...progress,
    tasks: {
      ...progress.tasks,
      catch_10: catchTask.claimed
        ? catchTask
        : {
          ...catchTask,
          progress: Math.min(10, catchTask.progress + 1),
        },
      rare_1: rareTask.claimed || !RARE_FISH_RANK.has(fishRarity)
        ? rareTask
        : {
          ...rareTask,
          progress: 1,
        },
    },
    weeklyMissions: {
      ...progress.weeklyMissions,
      catch_60_fish: progress.weeklyMissions.catch_60_fish.claimed
        ? progress.weeklyMissions.catch_60_fish
        : {
          ...progress.weeklyMissions.catch_60_fish,
          progress: Math.min(60, progress.weeklyMissions.catch_60_fish.progress + 1),
        },
      catch_6_rare: progress.weeklyMissions.catch_6_rare.claimed || !RARE_FISH_RANK.has(fishRarity)
        ? progress.weeklyMissions.catch_6_rare
        : {
          ...progress.weeklyMissions.catch_6_rare,
          progress: Math.min(6, progress.weeklyMissions.catch_6_rare.progress + 1),
        },
    },
  };
};

const applyWeeklyMissionProgress = (
  progress: ReturnType<typeof normalizeGameProgressForToday>,
  missionId: WeeklyMissionId,
  amount = 1,
) => {
  const mission = WEEKLY_MISSIONS.find((item) => item.id === missionId);
  const currentMission = progress.weeklyMissions[missionId];
  if (!mission || !currentMission || currentMission.claimed || amount <= 0) {
    return progress;
  }

  return {
    ...progress,
    weeklyMissions: {
      ...progress.weeklyMissions,
      [missionId]: {
        ...currentMission,
        progress: Math.min(mission.target, currentMission.progress + amount),
      },
    },
  };
};

const applyWeeklyCubeUnlockDay = (
  progress: ReturnType<typeof normalizeGameProgressForToday>,
) => {
  const todayKey = getTodayKey();
  if (progress.lastWeeklyCubeUnlockDate === todayKey) {
    return progress;
  }

  const nextProgress = applyWeeklyMissionProgress(progress, "cube_3_days", 1);
  return {
    ...nextProgress,
    lastWeeklyCubeUnlockDate: todayKey,
  };
};

const loadActivePremiumSession = async (
  supabase: ReturnType<typeof createClient>,
  playerId: string,
  sessionId?: string | null,
) => {
  let query = supabase
    .from("premium_fishing_sessions")
    .select("id, player_id, wallet_address, status, price_mon, casts_total, casts_used, luck_meter_stacks, zero_drop_streak, rescue_eligible, recovered_mon_total, started_at, completed_at")
    .eq("player_id", playerId)
    .eq("status", "active");

  if (sessionId) {
    query = query.eq("id", sessionId);
  }

  const { data, error } = await query.maybeSingle();
  if (error) throw error;
  return data as PremiumSessionRow | null;
};

const loadPremiumSessionById = async (
  supabase: ReturnType<typeof createClient>,
  playerId: string,
  sessionId: string,
) => {
  const { data, error } = await supabase
    .from("premium_fishing_sessions")
    .select("id, player_id, wallet_address, status, price_mon, casts_total, casts_used, luck_meter_stacks, zero_drop_streak, rescue_eligible, recovered_mon_total, started_at, completed_at")
    .eq("player_id", playerId)
    .eq("id", sessionId)
    .maybeSingle();
  if (error) throw error;
  return data as PremiumSessionRow | null;
};

const loadLatestPremiumCast = async (
  supabase: ReturnType<typeof createClient>,
  sessionId: string,
) => {
  const { data, error } = await supabase
    .from("premium_fishing_casts")
    .select("id, session_id, cast_index, reaction_quality, fish_id, bonus_coins_awarded, bonus_xp_awarded, mon_drop_tier, mon_amount, luck_meter_before, luck_meter_after, zero_drop_streak_after, pity_triggered, rescue_triggered, hot_streak_active, created_at")
    .eq("session_id", sessionId)
    .order("cast_index", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) throw error;
  return data as PremiumCastAuditRow | null;
};

const loadRecentPremiumCasts = async (
  supabase: ReturnType<typeof createClient>,
  sessionId: string,
  limit = 4,
) => {
  const { data, error } = await supabase
    .from("premium_fishing_casts")
    .select("id, session_id, cast_index, reaction_quality, fish_id, bonus_coins_awarded, bonus_xp_awarded, mon_drop_tier, mon_amount, luck_meter_before, luck_meter_after, zero_drop_streak_after, pity_triggered, rescue_triggered, hot_streak_active, created_at")
    .eq("session_id", sessionId)
    .order("cast_index", { ascending: false })
    .limit(limit);
  if (error) throw error;
  return (data ?? []) as PremiumCastAuditRow[];
};

const getHotStreakCastsRemaining = (
  currentCastsUsed: number,
  recentCasts: PremiumCastAuditRow[],
) => {
  const latestBigDrop = recentCasts.find((cast) => PREMIUM_BIG_DROP_TIERS.has(cast.mon_drop_tier));
  if (!latestBigDrop) return 0;

  const castsSinceBigDrop = Math.max(0, currentCastsUsed - latestBigDrop.cast_index);
  return Math.max(0, 4 - castsSinceBigDrop);
};

const computePremiumSessionRescueEligible = async (
  supabase: ReturnType<typeof createClient>,
  playerId: string,
) => {
  const { data: recentSessions, error: sessionError } = await supabase
    .from("premium_fishing_sessions")
    .select("id, recovered_mon_total")
    .eq("player_id", playerId)
    .eq("status", "completed")
    .order("started_at", { ascending: false })
    .limit(PREMIUM_SESSION_RESCUE_REQUIRED_BAD_SESSIONS);

  if (sessionError) throw sessionError;
  if (!recentSessions || recentSessions.length < PREMIUM_SESSION_RESCUE_REQUIRED_BAD_SESSIONS) {
    return false;
  }

  const recentWereLowRecovery = recentSessions.every((session) => Number(session.recovered_mon_total ?? 0) < PREMIUM_SESSION_LOW_RECOVERY_THRESHOLD_MON);
  if (!recentWereLowRecovery) return false;

  const sessionIds = recentSessions.map((session) => session.id);
  const { data: recentCasts, error: castsError } = await supabase
    .from("premium_fishing_casts")
    .select("mon_drop_tier")
    .in("session_id", sessionIds)
    .order("created_at", { ascending: false })
    .limit(40);

  if (castsError) throw castsError;
  return !(recentCasts ?? []).some((cast) => PREMIUM_BIG_DROP_TIERS.has(String(cast.mon_drop_tier)));
};

const getClaimedDailyCount = (tasks: ReturnType<typeof normalizeGameProgressForToday>["tasks"]) => (
  DAILY_TASKS.filter((task) => tasks[task.id as DailyTaskId]?.claimed).length
);

const sanitizeLeaderboardName = (value: string | null | undefined) => {
  const normalized = (value ?? "").trim().replace(/\s+/g, " ").slice(0, 24);
  return normalized || "Hook & Loot player";
};

const loadPlayer = async (supabase: ReturnType<typeof createClient>, walletAddress: string) => {
  const { data, error } = await supabase
    .from("players")
    .select(FULL_PLAYER_SELECT)
    .eq("wallet_address", walletAddress)
    .single();

  if (error) throw error;
  return data as PlayerRow;
};

const loadSocialTaskVerifications = async (
  supabase: ReturnType<typeof createClient>,
  playerId: string,
) => {
  const { data, error } = await supabase
    .from("social_task_verifications")
    .select("id, player_id, wallet_address, task_id, status, proof_url, verified_by_wallet, updated_at")
    .eq("player_id", playerId)
    .in("task_id", SOCIAL_TASK_IDS);

  if (error) throw error;
  return (data ?? []) as SocialTaskVerificationRow[];
};

const loadSocialTaskVerification = async (
  supabase: ReturnType<typeof createClient>,
  playerId: string,
  taskId: SocialTaskId,
) => {
  const { data, error } = await supabase
    .from("social_task_verifications")
    .select("id, player_id, wallet_address, task_id, status, proof_url, verified_by_wallet, updated_at")
    .eq("player_id", playerId)
    .eq("task_id", taskId)
    .maybeSingle();

  if (error) throw error;
  return data as SocialTaskVerificationRow | null;
};

const loadPendingCubeRoll = async (
  supabase: ReturnType<typeof createClient>,
  playerId: string,
) => {
  const { data, error } = await supabase
    .from("player_cube_rolls")
    .select("id, cube_faces, target_face_index, target_tile_index, prize, status")
    .eq("player_id", playerId)
    .eq("status", "pending")
    .maybeSingle();
  if (error) throw error;
  return data;
};

const updatePlayer = async (
  supabase: ReturnType<typeof createClient>,
  playerId: string,
  updates: Record<string, unknown>,
) => {
  const { data, error } = await supabase
    .from("players")
    .update(updates)
    .eq("id", playerId)
    .select(FULL_PLAYER_SELECT)
    .single();
  if (error) throw error;
  return data as PlayerRow;
};

const loadCookablePlayerState = async (
  supabase: ReturnType<typeof createClient>,
  walletAddress: string,
  ingredients: Record<string, number>,
) => {
  let player = await loadPlayer(supabase, walletAddress);
  let inventory = sanitizeInventory(player.inventory);
  let nextInventory = consumeInventoryFish(inventory, ingredients);

  if (nextInventory) {
    return { player, inventory, nextInventory };
  }

  for (const delayMs of [180, 320, 520]) {
    await sleep(delayMs);
    player = await loadPlayer(supabase, walletAddress);
    inventory = sanitizeInventory(player.inventory);
    nextInventory = consumeInventoryFish(inventory, ingredients);

    if (nextInventory) {
      return { player, inventory, nextInventory };
    }
  }

  return { player, inventory, nextInventory: null };
};

const upsertGrillLeaderboard = async (
  supabase: ReturnType<typeof createClient>,
  walletAddress: string,
  fallbackName: string,
  score: number,
  dishesDelta: number,
) => {
  const leaderboardId = `wallet:${walletAddress}`;
  const { data: existing, error: existingError } = await supabase
    .from("grill_leaderboard")
    .select("id, name, score, dishes")
    .eq("id", leaderboardId)
    .maybeSingle();
  if (existingError) throw existingError;

  const canonicalName = sanitizeLeaderboardName(fallbackName)
    || sanitizeLeaderboardName(existing?.name)
    || "Hook & Loot player";

  const payload = {
    id: leaderboardId,
    name: canonicalName,
    score: Math.max(existing?.score ?? 0, score),
    dishes: Math.max(0, (existing?.dishes ?? 0) + dishesDelta),
    wallet_address: walletAddress,
  };

  const { data, error } = await supabase
    .from("grill_leaderboard")
    .upsert(payload, { onConflict: "id" })
    .select("id, name, score, dishes, wallet_address, updated_at")
    .single();
  if (error) throw error;

  return data;
};

const runNonCriticalPlayerActionStep = async <T>(
  label: string,
  action: () => Promise<T>,
  fallback: T,
) => {
  try {
    return await action();
  } catch (error) {
    console.error(`[player-actions] non-critical step failed: ${label}`, error);
    return fallback;
  }
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const body = await req.json();
    const action = normalizeText(body.action);
    const walletAddress = normalizeWalletAddress(body.wallet_address);
    const sessionToken = normalizeText(body.session_token);

    if (!walletAddress) return badRequest("Missing wallet");
    if (!sessionToken || !(await verifySessionToken(sessionToken, walletAddress))) {
      return jsonResponse({ error: "Invalid session" }, 401);
    }

    switch (action) {
      case "get_wallet_check_in_summary": {
        await enforceRateLimit(supabase, {
          actionKey: "player_actions.get_wallet_check_in_summary",
          subjectKey: walletAddress,
          windowSeconds: 60,
          maxHits: 30,
        });

        const walletCheckInSummary = await buildWalletCheckInSummary(supabase, walletAddress);
        return jsonResponse({
          wallet_check_in_summary: walletCheckInSummary,
        });
      }

      case "verify_wallet_check_in": {
        await enforceRateLimit(supabase, {
          actionKey: "player_actions.verify_wallet_check_in",
          subjectKey: walletAddress,
          windowSeconds: 60,
          maxHits: 10,
        });

        const txHash = normalizeTxHash(body.tx_hash);
        if (!txHash) return badRequest("Missing wallet check-in transaction hash");

        if (await hasWalletCheckInTxHash(supabase, walletAddress, txHash)) {
          return badRequest("This wallet check-in transaction was already used.");
        }

        const currentSummary = await buildWalletCheckInSummary(supabase, walletAddress);
        if (currentSummary.todayCheckedIn) {
          return badRequest("Wallet check-in was already completed today.");
        }

        const { txTimestampIso, checkInDate } = await verifyWalletCheckInTransaction(walletAddress, txHash);
        const player = await loadPlayer(supabase, walletAddress);
        const beforeState = await fetchPlayerAuditSnapshot(supabase, walletAddress);
        const progress = normalizeGameProgressForToday(player.game_progress);
        const nextProgress = {
          ...progress,
          specialTasks: {
            ...progress.specialTasks,
            wallet_check_in: progress.specialTasks.wallet_check_in.claimed
              ? progress.specialTasks.wallet_check_in
              : {
                ...progress.specialTasks.wallet_check_in,
                progress: 1,
              },
          },
        };

        const updatedPlayer = await updatePlayer(supabase, player.id, {
          game_progress: nextProgress,
        });

        await insertPlayerAuditLog(supabase, {
          walletAddress,
          eventType: "wallet_daily_check_in",
          eventSource: "server",
          beforeState,
          afterState: sanitizeAuditSnapshot(updatedPlayer),
          metadata: {
            txHash,
            amountMon: WALLET_CHECK_IN_AMOUNT_MON,
            recipient: WALLET_CHECK_IN_RECEIVER_ADDRESS,
            txTimestamp: txTimestampIso,
            checkInDate,
          },
        });

        const walletCheckInSummary = await buildWalletCheckInSummary(supabase, walletAddress);
        return jsonResponse({
          player: updatedPlayer,
          wallet_check_in_summary: walletCheckInSummary,
        });
      }

      case "start_premium_session": {
        await enforceRateLimit(supabase, {
          actionKey: "player_actions.start_premium_session",
          subjectKey: walletAddress,
          windowSeconds: 60,
          maxHits: 10,
        });

        const txHash = normalizeTxHash(body.tx_hash);
        if (!txHash) return badRequest("Missing premium session payment transaction hash");

        const player = await loadPlayer(supabase, walletAddress);
        const existingActiveSession = await loadActivePremiumSession(supabase, player.id);
        if (existingActiveSession) {
          const lastCast = await loadLatestPremiumCast(supabase, existingActiveSession.id);
          return jsonResponse({
            player,
            premium_session: buildPremiumSessionState(existingActiveSession, lastCast),
            active_session_exists: true,
          });
        }

        if (await hasPremiumSessionTxHash(supabase, walletAddress, txHash)) {
          return badRequest("This premium session payment transaction was already used.");
        }

        const { paidMon } = await verifyPremiumSessionPaymentTransaction(walletAddress, txHash, PREMIUM_SESSION_COST_MON);
        const beforeState = await fetchPlayerAuditSnapshot(supabase, walletAddress);
        const rescueEligible = await computePremiumSessionRescueEligible(supabase, player.id);

        const { data: createdSession, error: createSessionError } = await supabase
          .from("premium_fishing_sessions")
          .insert({
            player_id: player.id,
            wallet_address: walletAddress,
            status: "active",
            price_mon: Number(PREMIUM_SESSION_COST_MON),
            casts_total: PREMIUM_SESSION_CASTS,
            casts_used: 0,
            luck_meter_stacks: 0,
            zero_drop_streak: 0,
            rescue_eligible: rescueEligible,
            recovered_mon_total: 0,
          })
          .select("id, player_id, wallet_address, status, price_mon, casts_total, casts_used, luck_meter_stacks, zero_drop_streak, rescue_eligible, recovered_mon_total, started_at, completed_at")
          .single();

        if (createSessionError) {
          const details = typeof createSessionError === "object" && createSessionError ? JSON.stringify(createSessionError) : "";
          if (details.includes("idx_premium_fishing_sessions_active_per_player")) {
            const activeSession = await loadActivePremiumSession(supabase, player.id);
            const lastCast = activeSession ? await loadLatestPremiumCast(supabase, activeSession.id) : null;
            return jsonResponse({
              player,
              premium_session: buildPremiumSessionState(activeSession, lastCast),
              active_session_exists: true,
            });
          }
          throw createSessionError;
        }

        await insertPlayerAuditLog(supabase, {
          walletAddress,
          eventType: "premium_session_started",
          eventSource: "server",
          beforeState,
          afterState: sanitizeAuditSnapshot(player),
          metadata: {
            txHash,
            sessionId: createdSession.id,
            paidMon,
            expectedMon: PREMIUM_SESSION_COST_MON,
            castsTotal: PREMIUM_SESSION_CASTS,
            rescueEligible,
          },
        });

        return jsonResponse({
          player,
          premium_session: buildPremiumSessionState(createdSession as PremiumSessionRow, null),
        });
      }

      case "get_premium_session_state": {
        await enforceRateLimit(supabase, {
          actionKey: "player_actions.get_premium_session_state",
          subjectKey: walletAddress,
          windowSeconds: 60,
          maxHits: 30,
        });

        const player = await loadPlayer(supabase, walletAddress);
        const activeSession = await loadActivePremiumSession(supabase, player.id);
        const lastCast = activeSession ? await loadLatestPremiumCast(supabase, activeSession.id) : null;

        return jsonResponse({
          player,
          premium_session: buildPremiumSessionState(activeSession, lastCast),
        });
      }

      case "resolve_premium_cast": {
        await enforceRateLimit(supabase, {
          actionKey: "player_actions.resolve_premium_cast",
          subjectKey: walletAddress,
          windowSeconds: 60,
          maxHits: 40,
        });

        const reactionQuality = normalizeText(body.reaction_quality) as PremiumReactionQuality;
        if (!["miss", "good", "perfect"].includes(reactionQuality)) {
          return badRequest("Invalid premium cast reaction quality");
        }

        const requestedSessionId = normalizeText(body.session_id) || null;
        const player = await loadPlayer(supabase, walletAddress);
        const activeSession = await loadActivePremiumSession(supabase, player.id, requestedSessionId);
        if (!activeSession) {
          return badRequest("No active premium session");
        }

        if (activeSession.casts_used >= activeSession.casts_total) {
          return badRequest("Premium session has no casts remaining");
        }

        const recentCasts = await loadRecentPremiumCasts(supabase, activeSession.id, 4);
        const lastCast = recentCasts[0] ?? null;
        const nftBonuses = getNftBonuses(player.equipped_rod, player.nft_rods);
        const rareFishBonusPercent = (ROD_BONUSES[player.equipped_rod] ?? 0) + nftBonuses.rarityBonus;
        const castResolution = resolvePremiumCast(
          reactionQuality,
          {
            recoveredMonTotal: Number(activeSession.recovered_mon_total ?? 0),
            luckMeterStacks: activeSession.luck_meter_stacks,
            zeroDropStreak: activeSession.zero_drop_streak,
            rescueEligible: activeSession.rescue_eligible,
            hotStreakCastsRemaining: getHotStreakCastsRemaining(activeSession.casts_used, recentCasts),
          },
          { rareFishBonusPercent },
        );

        const xpGain = Math.floor(
          (castResolution.fish.xp + 5 + castResolution.bonusXpAwarded) * (1 + nftBonuses.xpBonus / 100),
        );
        const xpProgress = applyXpProgress(player, xpGain);
        const progress = applyPremiumCatchTasks(
          normalizeGameProgressForToday(player.game_progress),
          castResolution.fish.rarity,
        );
        const inventory = sanitizeInventory(player.inventory);
        const nextCastsUsed = activeSession.casts_used + 1;
        const shouldCompleteSession = nextCastsUsed >= activeSession.casts_total;

        const { data: updatedSession, error: sessionUpdateError } = await supabase
          .from("premium_fishing_sessions")
          .update({
            casts_used: nextCastsUsed,
            luck_meter_stacks: castResolution.monDrop.luckMeterAfter,
            zero_drop_streak: castResolution.monDrop.zeroDropStreakAfter,
            rescue_eligible: castResolution.monDrop.rescueTriggered ? false : activeSession.rescue_eligible,
            recovered_mon_total: castResolution.recoveredMonTotal,
            status: shouldCompleteSession ? "completed" : "active",
            completed_at: shouldCompleteSession ? new Date().toISOString() : null,
          })
          .eq("id", activeSession.id)
          .eq("status", "active")
          .eq("casts_used", activeSession.casts_used)
          .select("id, player_id, wallet_address, status, price_mon, casts_total, casts_used, luck_meter_stacks, zero_drop_streak, rescue_eligible, recovered_mon_total, started_at, completed_at")
          .single();

        if (sessionUpdateError) {
          const details = typeof sessionUpdateError === "object" && sessionUpdateError ? JSON.stringify(sessionUpdateError) : "";
          if (details.includes("Results contain 0 rows")) {
            return badRequest("Premium session state changed. Refresh and try again.");
          }
          throw sessionUpdateError;
        }

        const castIndex = nextCastsUsed;
        const { data: insertedCast, error: castInsertError } = await supabase
          .from("premium_fishing_casts")
          .insert({
            session_id: activeSession.id,
            cast_index: castIndex,
            reaction_quality: reactionQuality,
            fish_id: castResolution.fish.id,
            bonus_coins_awarded: castResolution.bonusCoinsAwarded,
            bonus_xp_awarded: castResolution.bonusXpAwarded,
            mon_drop_tier: castResolution.monDrop.tierId,
            mon_amount: castResolution.monDrop.monAmount,
            luck_meter_before: castResolution.monDrop.luckMeterBefore,
            luck_meter_after: castResolution.monDrop.luckMeterAfter,
            zero_drop_streak_after: castResolution.monDrop.zeroDropStreakAfter,
            pity_triggered: castResolution.monDrop.pityTriggered,
            rescue_triggered: castResolution.monDrop.rescueTriggered,
            hot_streak_active: castResolution.hotStreakActive,
          })
          .select("id, session_id, cast_index, reaction_quality, fish_id, bonus_coins_awarded, bonus_xp_awarded, mon_drop_tier, mon_amount, luck_meter_before, luck_meter_after, zero_drop_streak_after, pity_triggered, rescue_triggered, hot_streak_active, created_at")
          .single();
        if (castInsertError) throw castInsertError;

        const beforeState = await fetchPlayerAuditSnapshot(supabase, walletAddress);
        const updatedPlayer = await updatePlayer(supabase, player.id, {
          coins: player.coins + castResolution.bonusCoinsAwarded + xpProgress.levelUpCoins,
          xp: xpProgress.xp,
          xp_to_next: xpProgress.xpToNext,
          level: xpProgress.level,
          total_catches: player.total_catches + 1,
          inventory: addInventoryFish(inventory, castResolution.fish.id, 1),
          game_progress: progress,
        });

        if (castResolution.monDrop.monAmount > 0) {
          await grantPlayerReward(supabase, {
            walletAddress,
            reward: { mon: castResolution.monDrop.monAmount },
            sourceType: "premium_session_reward",
            sourceRef: `${activeSession.id}:${castIndex}`,
            eventType: "premium_cast_mon_reward",
            metadata: {
              sessionId: activeSession.id,
              castIndex,
              tierId: castResolution.monDrop.tierId,
              monAmount: castResolution.monDrop.monAmount,
            },
          });
        }

        await insertPlayerAuditLog(supabase, {
          walletAddress,
          eventType: "premium_cast_resolved",
          eventSource: "server",
          beforeState,
          afterState: sanitizeAuditSnapshot(updatedPlayer),
          metadata: {
            sessionId: activeSession.id,
            castIndex,
            reactionQuality,
            fishId: castResolution.fish.id,
            fishRarity: castResolution.fish.rarity,
            xpGain,
            bonusCoinsAwarded: castResolution.bonusCoinsAwarded,
            levelUpCoinsAwarded: xpProgress.levelUpCoins,
            monDropTier: castResolution.monDrop.tierId,
            monAmount: castResolution.monDrop.monAmount,
            luckMeterBefore: castResolution.monDrop.luckMeterBefore,
            luckMeterAfter: castResolution.monDrop.luckMeterAfter,
            zeroDropStreakAfter: castResolution.monDrop.zeroDropStreakAfter,
            pityTriggered: castResolution.monDrop.pityTriggered,
            rescueTriggered: castResolution.monDrop.rescueTriggered,
            hotStreakActive: castResolution.hotStreakActive,
            albumPointsAwarded: castResolution.albumPointsAwarded,
            rodMasteryPointsAwarded: castResolution.rodMasteryPointsAwarded,
          },
        });

        return jsonResponse({
          player: updatedPlayer,
          premium_session: buildPremiumSessionState(updatedSession as PremiumSessionRow, insertedCast as PremiumCastAuditRow),
          cast_result: {
            castIndex,
            reactionQuality,
            fishId: castResolution.fish.id,
            fishRarity: castResolution.fish.rarity,
            fishName: castResolution.fish.name,
            bonusCoinsAwarded: castResolution.bonusCoinsAwarded,
            bonusXpAwarded: castResolution.bonusXpAwarded,
            totalXpGain: xpGain,
            levelUpCoinsAwarded: xpProgress.levelUpCoins,
            monDropTier: castResolution.monDrop.tierId,
            monAmount: castResolution.monDrop.monAmount,
            recoveredMonTotal: castResolution.recoveredMonTotal,
            luckMeterStacks: castResolution.monDrop.luckMeterAfter,
            zeroDropStreak: castResolution.monDrop.zeroDropStreakAfter,
            pityTriggered: castResolution.monDrop.pityTriggered,
            rescueTriggered: castResolution.monDrop.rescueTriggered,
            hotStreakActive: castResolution.hotStreakActive,
            albumPointsAwarded: castResolution.albumPointsAwarded,
            rodMasteryPointsAwarded: castResolution.rodMasteryPointsAwarded,
            occurredAt: insertedCast.created_at,
          },
        });
      }

      case "complete_premium_session": {
        await enforceRateLimit(supabase, {
          actionKey: "player_actions.complete_premium_session",
          subjectKey: walletAddress,
          windowSeconds: 60,
          maxHits: 12,
        });

        const requestedSessionId = normalizeText(body.session_id) || null;
        const player = await loadPlayer(supabase, walletAddress);
        const session = requestedSessionId
          ? await loadPremiumSessionById(supabase, player.id, requestedSessionId)
          : await loadActivePremiumSession(supabase, player.id);

        if (!session) {
          return badRequest("Premium session was not found");
        }

        if (session.status === "completed") {
          const lastCast = await loadLatestPremiumCast(supabase, session.id);
          return jsonResponse({
            player,
            premium_session: buildPremiumSessionState(session, lastCast),
          });
        }

        if (session.status !== "active") {
          return badRequest("Premium session is not active");
        }

        if (session.casts_used < session.casts_total) {
          return badRequest("Premium session still has casts remaining");
        }

        const progress = normalizeGameProgressForToday(player.game_progress);
        const nextProgress = applyWeeklyMissionProgress(progress, "complete_1_premium_session", 1);
        const beforeState = await fetchPlayerAuditSnapshot(supabase, walletAddress);
        const { data: completedSession, error: completeError } = await supabase
          .from("premium_fishing_sessions")
          .update({
            status: "completed",
            completed_at: new Date().toISOString(),
          })
          .eq("id", session.id)
          .eq("status", "active")
          .select("id, player_id, wallet_address, status, price_mon, casts_total, casts_used, luck_meter_stacks, zero_drop_streak, rescue_eligible, recovered_mon_total, started_at, completed_at")
          .single();
        if (completeError) throw completeError;

        const updatedPlayer = await updatePlayer(supabase, player.id, {
          game_progress: nextProgress,
        });

        const lastCast = await loadLatestPremiumCast(supabase, session.id);
        await insertPlayerAuditLog(supabase, {
          walletAddress,
          eventType: "premium_session_completed",
          eventSource: "server",
          beforeState,
          afterState: sanitizeAuditSnapshot(updatedPlayer),
          metadata: {
            sessionId: session.id,
            castsUsed: completedSession.casts_used,
            recoveredMonTotal: completedSession.recovered_mon_total,
          },
        });

        return jsonResponse({
          player: updatedPlayer,
          premium_session: buildPremiumSessionState(completedSession as PremiumSessionRow, lastCast),
        });
      }

      case "list_social_tasks": {
        await enforceRateLimit(supabase, {
          actionKey: "player_actions.list_social_tasks",
          subjectKey: walletAddress,
          windowSeconds: 60,
          maxHits: 30,
        });

        const player = await loadPlayer(supabase, walletAddress);
        const verifications = await loadSocialTaskVerifications(supabase, player.id);

        return jsonResponse({
          verifications,
        });
      }

      case "submit_social_task_verification": {
        await enforceRateLimit(supabase, {
          actionKey: "player_actions.submit_social_task_verification",
          subjectKey: walletAddress,
          windowSeconds: 60,
          maxHits: 12,
        });

        const taskId = normalizeText(body.task_id) as SocialTaskId;
        if (!SOCIAL_TASK_IDS.includes(taskId)) {
          return badRequest("Unknown social task");
        }

        const proofUrl = normalizeNullableText(body.proof_url, 2048);
        const player = await loadPlayer(supabase, walletAddress);
        const existingVerification = await loadSocialTaskVerification(supabase, player.id, taskId);

        if (existingVerification?.status === "claimed") {
          return badRequest("Social task was already claimed");
        }

        const beforeState = await fetchPlayerAuditSnapshot(supabase, walletAddress);
        const nextStatus = existingVerification?.status === "verified"
          ? "verified"
          : "pending_verification";

        const { data, error } = await supabase
          .from("social_task_verifications")
          .upsert({
            player_id: player.id,
            wallet_address: walletAddress,
            task_id: taskId,
            status: nextStatus,
            proof_url: proofUrl,
            verified_by_wallet: existingVerification?.verified_by_wallet ?? null,
          }, { onConflict: "player_id,task_id" })
          .select("id, player_id, wallet_address, task_id, status, proof_url, verified_by_wallet, updated_at")
          .single();
        if (error) throw error;

        await insertPlayerAuditLog(supabase, {
          walletAddress,
          eventType: "social_task_submitted",
          eventSource: "server",
          beforeState,
          afterState: sanitizeAuditSnapshot(player),
          metadata: {
            taskId,
            status: nextStatus,
            proofUrl,
          },
        });

        return jsonResponse({
          verification: data,
        });
      }

      case "roll_cube": {
        await enforceRateLimit(supabase, {
          actionKey: "player_actions.roll_cube",
          subjectKey: walletAddress,
          windowSeconds: 60,
          maxHits: 12,
        });

        const player = await loadPlayer(supabase, walletAddress);
        const existingPendingRoll = await loadPendingCubeRoll(supabase, player.id);
        if (existingPendingRoll) {
          return jsonResponse({
            roll: {
              id: existingPendingRoll.id,
              cube_faces: existingPendingRoll.cube_faces,
              target_face_index: existingPendingRoll.target_face_index,
              target_tile_index: existingPendingRoll.target_tile_index,
              prize: existingPendingRoll.prize,
            },
            player,
          });
        }

        const progress = normalizeGameProgressForToday(player.game_progress);
        if (progress.dailyWheelRolls <= 0 && progress.paidWheelRolls <= 0) {
          return badRequest("No cube rolls available");
        }

        const cubeRoll = buildServerCubeRoll();
        const nextProgress = {
          ...progress,
          wheelSpun: progress.wheelSpun || progress.dailyWheelRolls > 0,
          wheelPrize: cubeRoll.prize,
          dailyWheelRolls: progress.dailyWheelRolls > 0 ? progress.dailyWheelRolls - 1 : progress.dailyWheelRolls,
          paidWheelRolls: progress.dailyWheelRolls > 0 ? progress.paidWheelRolls : Math.max(0, progress.paidWheelRolls - 1),
        };

        const updatedPlayer = await updatePlayer(supabase, player.id, {
          game_progress: nextProgress,
        });

        const { data: insertedRoll, error: insertError } = await supabase
          .from("player_cube_rolls")
          .insert({
            player_id: player.id,
            wallet_address: walletAddress,
            cube_faces: cubeRoll.cubeFaces,
            target_face_index: cubeRoll.targetFaceIndex,
            target_tile_index: cubeRoll.targetTileIndex,
            prize: cubeRoll.prize,
          })
          .select("id, cube_faces, target_face_index, target_tile_index, prize")
          .single();
        if (insertError) throw insertError;

        return jsonResponse({
          roll: insertedRoll,
          player: updatedPlayer,
        });
      }

      case "apply_cube_reward": {
        await enforceRateLimit(supabase, {
          actionKey: "player_actions.apply_cube_reward",
          subjectKey: walletAddress,
          windowSeconds: 60,
          maxHits: 18,
        });

        const rollId = normalizeText(body.roll_id);
        if (!rollId) return badRequest("Missing cube roll");

        const { data: roll, error: rollError } = await supabase
          .from("player_cube_rolls")
          .select("id, player_id, prize, status")
          .eq("id", rollId)
          .eq("wallet_address", walletAddress)
          .single();
        if (rollError) throw rollError;
        if (roll.status !== "pending") {
          return badRequest("Cube roll is not pending");
        }

        const prize = roll.prize as CubePrize;
        let updatedPlayer = await loadPlayer(supabase, walletAddress);

        if (prize.type === "coins") {
          await grantPlayerReward(supabase, {
            walletAddress,
            reward: { coins: prize.coins ?? 0 },
            sourceType: "cube_reward",
            sourceRef: roll.id,
            eventType: "cube_coin_reward",
            metadata: {
              prizeId: prize.id,
              coins: prize.coins ?? 0,
            },
          });
          updatedPlayer = await loadPlayer(supabase, walletAddress);
        } else if (prize.type === "bait") {
          await grantPlayerReward(supabase, {
            walletAddress,
            reward: { bait: prize.bait ?? 0 },
            sourceType: "cube_reward",
            sourceRef: roll.id,
            eventType: "cube_bait_reward",
            metadata: {
              prizeId: prize.id,
              bait: prize.bait ?? 0,
            },
          });
          updatedPlayer = await loadPlayer(supabase, walletAddress);
        } else if (prize.type === "mon") {
          await grantPlayerReward(supabase, {
            walletAddress,
            reward: { mon: prize.mon ?? 0 },
            sourceType: "cube_mon_reward",
            sourceRef: roll.id,
            eventType: "cube_mon_reward",
            metadata: {
              prizeId: prize.id,
              mon: prize.mon ?? 0,
            },
          });
          updatedPlayer = await loadPlayer(supabase, walletAddress);
        } else if (prize.type === "fish" && prize.fishId) {
          const beforeState = await fetchPlayerAuditSnapshot(supabase, walletAddress);
          const inventory = sanitizeInventory(updatedPlayer.inventory);
          updatedPlayer = await updatePlayer(supabase, updatedPlayer.id, {
            inventory: addInventoryFish(inventory, prize.fishId, prize.quantity ?? 1),
          });
          await insertPlayerAuditLog(supabase, {
            walletAddress,
            eventType: "cube_fish_reward",
            eventSource: "server",
            beforeState,
            afterState: sanitizeAuditSnapshot(updatedPlayer),
            metadata: {
              prizeId: prize.id,
              fishId: prize.fishId,
              quantity: prize.quantity ?? 1,
            },
          });
        } else {
          return badRequest("Unsupported cube prize");
        }

        const { error: applyError } = await supabase
          .from("player_cube_rolls")
          .update({
            status: "applied",
            applied_at: new Date().toISOString(),
          })
          .eq("id", roll.id);
        if (applyError) throw applyError;

        return jsonResponse({
          prize,
          player: updatedPlayer,
        });
      }

      case "claim_task_reward": {
        await enforceRateLimit(supabase, {
          actionKey: "player_actions.claim_task_reward",
          subjectKey: walletAddress,
          windowSeconds: 60,
          maxHits: 20,
        });

        const taskId = normalizeText(body.task_id);
        const task = getTaskDefinition(taskId);
        const isDailyTask = DAILY_TASKS.some((item) => item.id === taskId);
        const isSpecialTask = SPECIAL_TASKS.some((item) => item.id === taskId);
        const isWeeklyMission = WEEKLY_MISSIONS.some((item) => item.id === taskId);
        if (!task || !(isDailyTask || isSpecialTask || isWeeklyMission)) {
          return badRequest("Unknown task");
        }

        const player = await loadPlayer(supabase, walletAddress);
        const progress = normalizeGameProgressForToday(player.game_progress);
        const beforeState = await fetchPlayerAuditSnapshot(supabase, walletAddress);

        if (isDailyTask) {
          const currentTask = progress.tasks[taskId as DailyTaskId];
          if (!currentTask || currentTask.claimed || currentTask.progress < task.target) {
            return badRequest("Task is not ready to claim");
          }

          const nextTasks = {
            ...progress.tasks,
            [taskId]: {
              ...currentTask,
              claimed: true,
            },
          };
          const nextClaimedCount = getClaimedDailyCount(nextTasks);
          const shouldGrantRolls = !progress.dailyRollRewardGranted && nextClaimedCount >= DAILY_TASK_CLAIMS_REQUIRED;
          const nextProgressBase = {
            ...progress,
            tasks: nextTasks,
            dailyWheelRolls: shouldGrantRolls ? progress.dailyWheelRolls + DAILY_CUBE_ROLL_REWARD : progress.dailyWheelRolls,
            dailyRollRewardGranted: progress.dailyRollRewardGranted || shouldGrantRolls,
          };
          const nextProgress = shouldGrantRolls
            ? applyWeeklyCubeUnlockDay(nextProgressBase)
            : nextProgressBase;

          const updatedPlayer = await updatePlayer(supabase, player.id, {
            game_progress: nextProgress,
            coins: player.coins + (task.rewardCoins ?? 0),
            bait: player.bait + (task.rewardBait ?? 0),
            bonus_bait_granted_total: player.bonus_bait_granted_total + (task.rewardBait ?? 0),
          });

          await insertPlayerAuditLog(supabase, {
            walletAddress,
            eventType: "daily_task_claimed",
            eventSource: "server",
            beforeState,
            afterState: sanitizeAuditSnapshot(updatedPlayer),
            metadata: {
              taskId,
              rewardCoins: task.rewardCoins ?? 0,
              rewardBait: task.rewardBait ?? 0,
              grantedDailyRolls: shouldGrantRolls ? DAILY_CUBE_ROLL_REWARD : 0,
            },
          });

          return jsonResponse({ player: updatedPlayer });
        }

        if (isWeeklyMission) {
          const currentTask = progress.weeklyMissions[taskId as WeeklyMissionId];
          if (!currentTask || currentTask.claimed || currentTask.progress < task.target) {
            return badRequest("Weekly mission is not ready to claim");
          }

          const nextProgress = {
            ...progress,
            weeklyMissions: {
              ...progress.weeklyMissions,
              [taskId]: {
                ...currentTask,
                claimed: true,
              },
            },
            dailyWheelRolls: progress.dailyWheelRolls + (task.rewardCubeCharge ?? 0),
          };

          const updatedPlayer = await updatePlayer(supabase, player.id, {
            game_progress: nextProgress,
            coins: player.coins + (task.rewardCoins ?? 0),
            bait: player.bait + (task.rewardBait ?? 0),
            bonus_bait_granted_total: player.bonus_bait_granted_total + (task.rewardBait ?? 0),
          });

          await insertPlayerAuditLog(supabase, {
            walletAddress,
            eventType: "weekly_mission_claimed",
            eventSource: "server",
            beforeState,
            afterState: sanitizeAuditSnapshot(updatedPlayer),
            metadata: {
              taskId,
              rewardCoins: task.rewardCoins ?? 0,
              rewardBait: task.rewardBait ?? 0,
              rewardCubeCharge: task.rewardCubeCharge ?? 0,
            },
          });

          return jsonResponse({ player: updatedPlayer });
        }

        const nextSpecialTasks = { ...progress.specialTasks };
        if (taskId === "invite_friend") {
          const todayReferralAttachCount = await fetchTodayReferralAttachCount(supabase, walletAddress);
          nextSpecialTasks.invite_friend = {
            ...nextSpecialTasks.invite_friend,
            progress: todayReferralAttachCount > 0 ? 1 : 0,
          };
        } else if (taskId === "wallet_check_in") {
          const walletCheckInSummary = await buildWalletCheckInSummary(supabase, walletAddress);
          nextSpecialTasks.wallet_check_in = {
            ...nextSpecialTasks.wallet_check_in,
            progress: walletCheckInSummary.todayCheckedIn ? 1 : 0,
          };
        }

        const currentTask = nextSpecialTasks[taskId as SpecialTaskId];
        if (!currentTask || currentTask.claimed || currentTask.progress < task.target) {
          return badRequest("Task is not ready to claim");
        }

        const nextProgress = {
          ...progress,
          specialTasks: {
            ...nextSpecialTasks,
            [taskId]: {
              ...currentTask,
              claimed: true,
            },
          },
        };

        const updatedPlayer = await updatePlayer(supabase, player.id, {
          game_progress: nextProgress,
          coins: player.coins + (task.rewardCoins ?? 0),
          bait: player.bait + (task.rewardBait ?? 0),
          bonus_bait_granted_total: player.bonus_bait_granted_total + (task.rewardBait ?? 0),
        });

        await insertPlayerAuditLog(supabase, {
          walletAddress,
          eventType: "special_task_claimed",
          eventSource: "server",
          beforeState,
          afterState: sanitizeAuditSnapshot(updatedPlayer),
          metadata: {
            taskId,
            rewardCoins: task.rewardCoins ?? 0,
            rewardBait: task.rewardBait ?? 0,
          },
        });

        return jsonResponse({ player: updatedPlayer });
      }

      case "claim_social_task_reward": {
        await enforceRateLimit(supabase, {
          actionKey: "player_actions.claim_social_task_reward",
          subjectKey: walletAddress,
          windowSeconds: 60,
          maxHits: 12,
        });

        const taskId = normalizeText(body.task_id) as SocialTaskId;
        const task = SOCIAL_TASKS.find((item) => item.id === taskId);
        if (!task) {
          return badRequest("Unknown social task");
        }

        const player = await loadPlayer(supabase, walletAddress);
        const verification = await loadSocialTaskVerification(supabase, player.id, taskId);
        if (!verification || verification.status !== "verified") {
          return badRequest("Social task is not ready to claim");
        }

        let updatedPlayer = player;
        if ((task.rewardCoins ?? 0) > 0 || (task.rewardBait ?? 0) > 0) {
          await grantPlayerReward(supabase, {
            walletAddress,
            reward: {
              coins: task.rewardCoins ?? 0,
              bait: task.rewardBait ?? 0,
            },
            sourceType: "social_task_reward",
            sourceRef: taskId,
            eventType: "social_task_claimed",
            metadata: {
              taskId,
              rewardCoins: task.rewardCoins ?? 0,
              rewardBait: task.rewardBait ?? 0,
            },
          });
          updatedPlayer = await loadPlayer(supabase, walletAddress);
        } else {
          const beforeState = await fetchPlayerAuditSnapshot(supabase, walletAddress);
          await insertPlayerAuditLog(supabase, {
            walletAddress,
            eventType: "social_task_claimed",
            eventSource: "server",
            beforeState,
            afterState: sanitizeAuditSnapshot(player),
            metadata: {
              taskId,
              rewardCoins: 0,
              rewardBait: 0,
            },
          });
        }

        const { data, error } = await supabase
          .from("social_task_verifications")
          .update({
            status: "claimed",
          })
          .eq("id", verification.id)
          .select("id, player_id, wallet_address, task_id, status, proof_url, verified_by_wallet, updated_at")
          .single();
        if (error) throw error;

        return jsonResponse({
          player: updatedPlayer,
          verification: data,
        });
      }

      case "cook_recipe": {
        await enforceRateLimit(supabase, {
          actionKey: "player_actions.cook_recipe",
          subjectKey: walletAddress,
          windowSeconds: 60,
          maxHits: 20,
        });

        const recipeId = normalizeText(body.recipe_id);
        const recipe = getGrillRecipe(recipeId);
        if (!recipe) return badRequest("Unknown recipe");

        const { player, nextInventory } = await loadCookablePlayerState(
          supabase,
          walletAddress,
          recipe.ingredients,
        );
        const beforeState = await fetchPlayerAuditSnapshot(supabase, walletAddress);
        const cookedDishes = sanitizeCookedDishes(player.cooked_dishes);
        if (!nextInventory) return badRequest("Not enough fish to cook this dish");

        const progress = normalizeGameProgressForToday(player.game_progress);
        const currentTask = progress.tasks.grill_1;
        const nextProgress = {
          ...progress,
          tasks: {
            ...progress.tasks,
            grill_1: currentTask.claimed
              ? currentTask
              : {
                ...currentTask,
                progress: Math.min(1, currentTask.progress + 1),
              },
          },
          grillScore: progress.grillScore + recipe.score,
          dishesToday: progress.dishesToday + 1,
        };
        const nextWeeklyProgress = applyWeeklyMissionProgress(nextProgress, "cook_5_dishes", 1);

        const updatedPlayer = await updatePlayer(supabase, player.id, {
          inventory: nextInventory,
          cooked_dishes: addCookedDish(cookedDishes, recipe.id, 1),
          game_progress: nextWeeklyProgress,
        });

        const leaderboardEntry = await runNonCriticalPlayerActionStep(
          "cook_recipe.leaderboard",
          () => upsertGrillLeaderboard(
            supabase,
            walletAddress,
            player.nickname ?? "Hook & Loot player",
            nextWeeklyProgress.grillScore,
            1,
          ),
          null as Awaited<ReturnType<typeof upsertGrillLeaderboard>> | null,
        );

        await runNonCriticalPlayerActionStep(
          "cook_recipe.audit",
          () => insertPlayerAuditLog(supabase, {
            walletAddress,
            eventType: "grill_recipe_cooked",
            eventSource: "server",
            beforeState,
            afterState: sanitizeAuditSnapshot(updatedPlayer),
            metadata: {
              recipeId: recipe.id,
              recipeScore: recipe.score,
              ingredients: recipe.ingredients,
              leaderboardScore: leaderboardEntry?.score ?? nextWeeklyProgress.grillScore,
            },
          }),
          undefined,
        );

        return jsonResponse({
          player: updatedPlayer,
          leaderboard_entry: leaderboardEntry,
        });
      }

      case "sell_cooked_dish": {
        await enforceRateLimit(supabase, {
          actionKey: "player_actions.sell_cooked_dish",
          subjectKey: walletAddress,
          windowSeconds: 60,
          maxHits: 24,
        });

        const recipeId = normalizeText(body.recipe_id);
        const recipe = getGrillRecipe(recipeId);
        if (!recipe) return badRequest("Unknown recipe");

        const player = await loadPlayer(supabase, walletAddress);
        const beforeState = await fetchPlayerAuditSnapshot(supabase, walletAddress);
        const cookedDishes = sanitizeCookedDishes(player.cooked_dishes);
        const nextCookedDishes = consumeCookedDish(cookedDishes, recipe.id);
        if (!nextCookedDishes) return badRequest("Dish is not available");
        const progress = normalizeGameProgressForToday(player.game_progress);
        const nextProgress = applyWeeklyMissionProgress(progress, "sell_3_dishes", 1);

        const updatedPlayer = await updatePlayer(supabase, player.id, {
          coins: player.coins + recipe.score,
          cooked_dishes: nextCookedDishes,
          game_progress: nextProgress,
        });

        await runNonCriticalPlayerActionStep(
          "sell_cooked_dish.audit",
          () => insertPlayerAuditLog(supabase, {
            walletAddress,
            eventType: "cooked_dish_sold",
            eventSource: "server",
            beforeState,
            afterState: sanitizeAuditSnapshot(updatedPlayer),
            metadata: {
              recipeId: recipe.id,
              coinReward: recipe.score,
            },
          }),
          undefined,
        );

        return jsonResponse({ player: updatedPlayer });
      }

      case "update_grill_leaderboard": {
        await enforceRateLimit(supabase, {
          actionKey: "player_actions.update_grill_leaderboard",
          subjectKey: walletAddress,
          windowSeconds: 60,
          maxHits: 20,
        });

        const name = sanitizeLeaderboardName(body.name);
        const score = clampInt(body.score, 0, 0, 1_000_000_000);
        const dishesDelta = clampInt(body.dishes_delta, 0, 0, 1000);
        const player = await loadPlayer(supabase, walletAddress);
        const leaderboardEntry = await upsertGrillLeaderboard(
          supabase,
          walletAddress,
          player.nickname || name || "Hook & Loot player",
          score,
          dishesDelta,
        );

        return jsonResponse({ leaderboard_entry: leaderboardEntry });
      }

      default:
        return badRequest("Unknown action");
    }
  } catch (error) {
    console.error("Player actions error:", error);
    return jsonResponse({ error: error instanceof Error ? error.message : "Internal error" }, 500);
  }
});
