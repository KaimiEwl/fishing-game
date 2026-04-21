import { createClient } from '@supabase/supabase-js';
import { generatePrivateKey, privateKeyToAccount } from 'viem/accounts';

const args = process.argv.slice(2);

const readArg = (name) => {
  const prefix = `--${name}=`;
  const direct = args.find((arg) => arg.startsWith(prefix));
  if (direct) return direct.slice(prefix.length);

  const index = args.findIndex((arg) => arg === `--${name}`);
  if (index >= 0 && index + 1 < args.length) {
    return args[index + 1];
  }

  return undefined;
};

const supabaseUrl = readArg('url') || process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const anonKey = readArg('anon-key') || process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_PUBLISHABLE_KEY;
const serviceRoleKey = readArg('service-role-key') || process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !anonKey) {
  console.error('Missing required credentials. Need SUPABASE_URL and anon key.');
  process.exit(1);
}

const adminSupabase = serviceRoleKey
  ? createClient(supabaseUrl, serviceRoleKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    })
  : null;

const createTempAccount = () => privateKeyToAccount(generatePrivateKey());
const playerAccount = createTempAccount();
const smokeRef = `persist_${Date.now().toString(36)}`;

const assert = (condition, message) => {
  if (!condition) {
    throw new Error(message);
  }
};

const invoke = async (fnName, body) => {
  const response = await fetch(`${supabaseUrl}/functions/v1/${fnName}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      apikey: anonKey,
      Authorization: `Bearer ${anonKey}`,
    },
    body: JSON.stringify(body),
  });

  const json = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(`[${fnName}] ${response.status} ${JSON.stringify(json)}`);
  }

  if (json?.error) {
    throw new Error(`[${fnName}] ${json.error}`);
  }

  return json;
};

const createVerificationPayload = async (account) => {
  const message = `Hook & Loot: Sign to verify your wallet\nAddress: ${account.address}\nTimestamp: ${Date.now()}`;
  const signature = await account.signMessage({ message });
  return {
    wallet_address: account.address.toLowerCase(),
    message,
    signature,
  };
};

const todayKey = () => new Date().toISOString().slice(0, 10);
const currentUtcResetIso = () => {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate())).toISOString();
};

const findQuantity = (items, keyField, keyValue) => (
  Array.isArray(items)
    ? items.find((item) => item?.[keyField] === keyValue)?.quantity ?? 0
    : 0
);

const cleanup = async () => {
  if (!adminSupabase) return;
  try {
    await adminSupabase.from('player_audit_logs').delete().eq('wallet_address', playerAccount.address.toLowerCase());
  } catch {
    // ignore cleanup misses
  }
  try {
    await adminSupabase.from('players').delete().eq('wallet_address', playerAccount.address.toLowerCase());
  } catch {
    // ignore cleanup misses
  }
};

try {
  await cleanup();

  const verify = await invoke('verify-wallet', await createVerificationPayload(playerAccount));
  const walletAddress = playerAccount.address.toLowerCase();
  const sessionToken = verify.session_token;
  const baseUpdatedAt = verify.player?.updated_at ?? null;

  assert(typeof sessionToken === 'string' && sessionToken.length > 0, 'Session token missing after verify-wallet');

  const expectedPlayer = {
    coins: 34567,
    bait: 222,
    daily_free_bait: 17,
    daily_free_bait_reset_at: currentUtcResetIso(),
    bonus_bait_granted_total: verify.player?.bonus_bait_granted_total ?? 0,
    level: 8,
    xp: 765,
    xp_to_next: 800,
    rod_level: 3,
    equipped_rod: 2,
    inventory: [
      { fishId: 'carp', quantity: 4, caughtAt: new Date('2026-04-21T11:00:00.000Z').toISOString() },
      { fishId: 'bream', quantity: 2, caughtAt: new Date('2026-04-21T11:05:00.000Z').toISOString() },
    ],
    cooked_dishes: [
      { recipeId: 'lake_skewer', quantity: 3, createdAt: new Date('2026-04-21T11:10:00.000Z').toISOString() },
    ],
    total_catches: 44,
    login_streak: 5,
    nft_rods: [1, 3],
    nickname: smokeRef,
    avatar_url: 'https://example.com/avatar.png',
  };

  const expectedProgress = {
    date: todayKey(),
    tasks: {
      check_in: { progress: 1, claimed: true },
      catch_10: { progress: 10, claimed: true },
      rare_1: { progress: 1, claimed: false },
      grill_1: { progress: 1, claimed: false },
      spend_1000: { progress: 1000, claimed: false },
    },
    specialTasks: {
      wallet_check_in: { progress: 1, claimed: false },
      invite_friend: { progress: 1, claimed: true },
    },
    wheelSpun: true,
    wheelPrize: { id: 'coin_1500', label: '1,500 coins', type: 'coins', coins: 1500 },
    dailyWheelRolls: 2,
    dailyRollRewardGranted: true,
    paidWheelRolls: 4,
    grillScore: 777,
    dishesToday: 5,
  };

  const firstSave = await invoke('save-player-progress', {
    wallet_address: walletAddress,
    session_token: sessionToken,
    base_updated_at: baseUpdatedAt,
    player_data: expectedPlayer,
    game_progress: expectedProgress,
  });

  const savedPlayer = firstSave.player;
  assert(savedPlayer?.wallet_address === walletAddress, 'First save did not return saved player');
  assert(savedPlayer.coins === expectedPlayer.coins, 'Coins did not persist');
  assert(savedPlayer.bait === expectedPlayer.bait, 'Bait did not persist');
  assert(savedPlayer.daily_free_bait === expectedPlayer.daily_free_bait, 'Daily free bait did not persist');
  assert(savedPlayer.level === expectedPlayer.level, 'Level did not persist');
  assert(savedPlayer.xp === expectedPlayer.xp, 'XP did not persist');
  assert(savedPlayer.xp_to_next === expectedPlayer.xp_to_next, 'XP to next did not persist');
  assert(savedPlayer.rod_level === expectedPlayer.rod_level, 'Rod level did not persist');
  assert(savedPlayer.equipped_rod === expectedPlayer.equipped_rod, 'Equipped rod did not persist');
  assert(savedPlayer.total_catches === expectedPlayer.total_catches, 'Total catches did not persist');
  assert(savedPlayer.login_streak === expectedPlayer.login_streak, 'Login streak did not persist');
  assert(savedPlayer.nickname === expectedPlayer.nickname, 'Nickname did not persist');
  assert(savedPlayer.avatar_url === expectedPlayer.avatar_url, 'Avatar URL did not persist');
  assert(JSON.stringify(savedPlayer.nft_rods) === JSON.stringify(expectedPlayer.nft_rods), 'NFT rods did not persist');
  assert(findQuantity(savedPlayer.inventory, 'fishId', 'carp') === 4, 'Carp inventory did not persist');
  assert(findQuantity(savedPlayer.inventory, 'fishId', 'bream') === 2, 'Bream inventory did not persist');
  assert(findQuantity(savedPlayer.cooked_dishes, 'recipeId', 'lake_skewer') === 3, 'Cooked dishes did not persist');
  assert(savedPlayer.game_progress?.tasks?.check_in?.claimed === true, 'Daily task claim state did not persist');
  assert(savedPlayer.game_progress?.specialTasks?.wallet_check_in?.progress === 1, 'wallet_check_in progress did not persist');
  assert(savedPlayer.game_progress?.specialTasks?.invite_friend?.claimed === true, 'invite_friend claimed state did not persist');
  assert(savedPlayer.game_progress?.dailyWheelRolls === 2, 'Daily wheel rolls did not persist');
  assert(savedPlayer.game_progress?.paidWheelRolls === 4, 'Paid wheel rolls did not persist');
  assert(savedPlayer.game_progress?.grillScore === 777, 'Grill score did not persist');
  assert(savedPlayer.game_progress?.dishesToday === 5, 'Dishes today did not persist');

  const stalePlayer = {
    ...expectedPlayer,
    coins: 1000,
    bait: 80,
    daily_free_bait: 1,
    level: 2,
    xp: 50,
    xp_to_next: 200,
    rod_level: 1,
    equipped_rod: 1,
    inventory: [
      { fishId: 'carp', quantity: 1, caughtAt: new Date('2026-04-20T10:00:00.000Z').toISOString() },
    ],
    cooked_dishes: [],
    total_catches: 4,
    login_streak: 2,
    nft_rods: [1],
    nickname: 'stale-device',
    avatar_url: 'https://example.com/stale-avatar.png',
  };

  const staleProgress = {
    ...expectedProgress,
    tasks: {
      ...expectedProgress.tasks,
      catch_10: { progress: 3, claimed: false },
    },
    specialTasks: {
      wallet_check_in: { progress: 0, claimed: false },
      invite_friend: { progress: 0, claimed: false },
    },
    wheelSpun: false,
    dailyWheelRolls: 0,
    paidWheelRolls: 1,
    grillScore: 10,
    dishesToday: 1,
  };

  const staleSave = await invoke('save-player-progress', {
    wallet_address: walletAddress,
    session_token: sessionToken,
    base_updated_at: baseUpdatedAt,
    player_data: stalePlayer,
    game_progress: staleProgress,
  });

  const mergedPlayer = staleSave.player;
  assert(mergedPlayer.coins === expectedPlayer.coins, 'Stale save lowered coins');
  assert(mergedPlayer.bait === expectedPlayer.bait, 'Stale save lowered bait');
  assert(mergedPlayer.daily_free_bait === 1, 'Daily free bait should allow current-day decrease');
  assert(mergedPlayer.level === expectedPlayer.level, 'Stale save lowered level');
  assert(mergedPlayer.xp === expectedPlayer.xp, 'Stale save lowered XP');
  assert(mergedPlayer.xp_to_next === expectedPlayer.xp_to_next, 'Stale save lowered XP-to-next');
  assert(mergedPlayer.rod_level === expectedPlayer.rod_level, 'Stale save lowered rod level');
  assert(mergedPlayer.equipped_rod === expectedPlayer.equipped_rod, 'Stale save lowered equipped rod');
  assert(findQuantity(mergedPlayer.inventory, 'fishId', 'carp') === 4, 'Stale save lowered carp inventory');
  assert(findQuantity(mergedPlayer.inventory, 'fishId', 'bream') === 2, 'Stale save dropped bream inventory');
  assert(findQuantity(mergedPlayer.cooked_dishes, 'recipeId', 'lake_skewer') === 3, 'Stale save dropped cooked dishes');
  assert(mergedPlayer.total_catches === expectedPlayer.total_catches, 'Stale save lowered total catches');
  assert(mergedPlayer.login_streak === expectedPlayer.login_streak, 'Stale save lowered login streak');
  assert(JSON.stringify(mergedPlayer.nft_rods) === JSON.stringify(expectedPlayer.nft_rods), 'Stale save lost NFT rods');
  assert(mergedPlayer.nickname === expectedPlayer.nickname, 'Stale save overwrote nickname');
  assert(mergedPlayer.avatar_url === expectedPlayer.avatar_url, 'Stale save overwrote avatar');
  assert(mergedPlayer.game_progress?.tasks?.catch_10?.progress === 10, 'Stale save lowered daily task progress');
  assert(mergedPlayer.game_progress?.tasks?.check_in?.claimed === true, 'Stale save lowered claimed daily task state');
  assert(mergedPlayer.game_progress?.specialTasks?.wallet_check_in?.progress === 1, 'Stale save lowered wallet_check_in progress');
  assert(mergedPlayer.game_progress?.specialTasks?.invite_friend?.claimed === true, 'Stale save lowered invite_friend claimed state');
  assert(mergedPlayer.game_progress?.dailyWheelRolls === 2, 'Stale save lowered daily wheel rolls');
  assert(mergedPlayer.game_progress?.paidWheelRolls === 4, 'Stale save lowered paid wheel rolls');
  assert(mergedPlayer.game_progress?.grillScore === 777, 'Stale save lowered grill score');
  assert(mergedPlayer.game_progress?.dishesToday === 5, 'Stale save lowered dishes today');

  const refreshed = await invoke('verify-wallet', {
    wallet_address: walletAddress,
    session_token: sessionToken,
  });

  const refreshedPlayer = refreshed.player;
  assert(refreshedPlayer.wallet_address === walletAddress, 'verify-wallet refresh did not return player');
  assert(refreshedPlayer.coins === expectedPlayer.coins, 'Refreshed player lost coins');
  assert(refreshedPlayer.level === expectedPlayer.level, 'Refreshed player lost level');
  assert(refreshedPlayer.total_catches === expectedPlayer.total_catches, 'Refreshed player lost total catches');
  assert(findQuantity(refreshedPlayer.inventory, 'fishId', 'bream') === 2, 'Refreshed player lost bream inventory');
  assert(findQuantity(refreshedPlayer.cooked_dishes, 'recipeId', 'lake_skewer') === 3, 'Refreshed player lost cooked dishes');
  assert(refreshedPlayer.game_progress?.specialTasks?.wallet_check_in?.progress === 1, 'Refreshed player lost wallet_check_in state');
  assert(refreshedPlayer.game_progress?.paidWheelRolls === 4, 'Refreshed player lost paid wheel rolls');
  assert(refreshedPlayer.game_progress?.grillScore === 777, 'Refreshed player lost grill score');

  console.log(JSON.stringify({
    ok: true,
    walletAddress,
    persistedMetrics: {
      coins: refreshedPlayer.coins,
      bait: refreshedPlayer.bait,
      level: refreshedPlayer.level,
      catches: refreshedPlayer.total_catches,
      paidWheelRolls: refreshedPlayer.game_progress?.paidWheelRolls,
      grillScore: refreshedPlayer.game_progress?.grillScore,
      walletCheckInProgress: refreshedPlayer.game_progress?.specialTasks?.wallet_check_in?.progress,
    },
    note: adminSupabase ? 'cleanup-enabled' : 'cleanup-skipped-no-service-role',
  }, null, 2));
} finally {
  await cleanup();
}
