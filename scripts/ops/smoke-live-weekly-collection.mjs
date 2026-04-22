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

if (!supabaseUrl || !anonKey) {
  console.error('Missing required credentials. Need SUPABASE_URL and anon key.');
  process.exit(1);
}

const account = privateKeyToAccount(generatePrivateKey());

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

const createVerificationPayload = async () => {
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

const baseTasks = () => ({
  check_in: { progress: 0, claimed: false },
  catch_10: { progress: 0, claimed: false },
  rare_1: { progress: 0, claimed: false },
  grill_1: { progress: 0, claimed: false },
  spend_1000: { progress: 0, claimed: false },
});

const baseSpecialTasks = () => ({
  wallet_check_in: { progress: 0, claimed: false },
  invite_friend: { progress: 0, claimed: false },
});

const weekKey = () => {
  const current = new Date();
  const mondayBasedDay = (current.getDay() + 6) % 7;
  current.setHours(0, 0, 0, 0);
  current.setDate(current.getDate() - mondayBasedDay);
  const y = current.getFullYear();
  const m = String(current.getMonth() + 1).padStart(2, '0');
  const d = String(current.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
};

try {
  const verify = await invoke('verify-wallet', await createVerificationPayload());
  const walletAddress = account.address.toLowerCase();
  const sessionToken = verify.session_token;
  const baseUpdatedAt = verify.player?.updated_at ?? null;

  assert(typeof sessionToken === 'string' && sessionToken.length > 0, 'Session token missing after verify-wallet');

  const seededPlayer = {
    coins: 5000,
    bait: 0,
    daily_free_bait: 30,
    daily_free_bait_reset_at: currentUtcResetIso(),
    bonus_bait_granted_total: verify.player?.bonus_bait_granted_total ?? 0,
    level: 5,
    xp: 220,
    xp_to_next: 500,
    rod_level: 2,
    equipped_rod: 2,
    inventory: [
      { fishId: 'carp', quantity: 10, caughtAt: new Date('2026-04-22T20:00:00.000Z').toISOString() },
    ],
    cooked_dishes: [],
    total_catches: 15,
    login_streak: 3,
    nft_rods: [],
    nickname: 'weekly-smoke',
    avatar_url: null,
    collection_book: {
      species: {
        carp: {
          fishId: 'carp',
          discovered: true,
          catches: 3,
          firstCaughtAt: new Date('2026-04-21T10:00:00.000Z').toISOString(),
          lastCaughtAt: new Date('2026-04-22T10:00:00.000Z').toISOString(),
          firstCatchBonusClaimed: true,
        },
      },
      pages: [
        {
          pageId: 'lake_basics',
          completed: false,
          claimed: false,
        },
      ],
      totalSpeciesCaught: 1,
      totalFirstCatchBonusesClaimed: 1,
    },
  };

  const seededProgress = {
    date: todayKey(),
    weekKey: weekKey(),
    tasks: baseTasks(),
    specialTasks: baseSpecialTasks(),
    weeklyMissions: {
      catch_60_fish: { progress: 60, claimed: false },
      catch_6_rare: { progress: 0, claimed: false },
      cook_5_dishes: { progress: 0, claimed: false },
      sell_3_dishes: { progress: 0, claimed: false },
      cube_3_days: { progress: 3, claimed: false },
      complete_1_premium_session: { progress: 0, claimed: false },
    },
    lastWeeklyCubeUnlockDate: todayKey(),
    wheelSpun: false,
    wheelPrize: null,
    dailyWheelRolls: 0,
    dailyRollRewardGranted: false,
    paidWheelRolls: 0,
    grillScore: 0,
    dishesToday: 0,
  };

  const firstSave = await invoke('save-player-progress', {
    wallet_address: walletAddress,
    session_token: sessionToken,
    base_updated_at: baseUpdatedAt,
    player_data: seededPlayer,
    game_progress: seededProgress,
  });

  assert(firstSave.player?.game_progress?.weeklyMissions?.catch_60_fish?.progress === 60, 'Seeded weekly mission progress did not persist');
  assert(firstSave.player?.game_progress?.collectionBook?.species?.carp?.discovered === true, 'Collection book did not persist after first save');

  let latestPlayer = firstSave.player;

  for (let index = 0; index < 5; index += 1) {
    const cooked = await invoke('player-actions', {
      action: 'cook_recipe',
      wallet_address: walletAddress,
      session_token: sessionToken,
      recipe_id: 'lake_skewer',
    });
    latestPlayer = cooked.player;
  }

  assert(latestPlayer?.game_progress?.weeklyMissions?.cook_5_dishes?.progress === 5, 'cook_5_dishes weekly mission did not progress to 5');

  for (let index = 0; index < 3; index += 1) {
    const sold = await invoke('player-actions', {
      action: 'sell_cooked_dish',
      wallet_address: walletAddress,
      session_token: sessionToken,
      recipe_id: 'lake_skewer',
    });
    latestPlayer = sold.player;
  }

  assert(latestPlayer?.game_progress?.weeklyMissions?.sell_3_dishes?.progress === 3, 'sell_3_dishes weekly mission did not progress to 3');

  const beforeCatchMissionCoins = latestPlayer.coins;
  const catchMissionClaim = await invoke('player-actions', {
    action: 'claim_task_reward',
    wallet_address: walletAddress,
    session_token: sessionToken,
    task_id: 'catch_60_fish',
  });
  latestPlayer = catchMissionClaim.player;
  assert(latestPlayer.coins === beforeCatchMissionCoins + 300, 'catch_60_fish weekly reward did not add 300 coins');

  const beforeCubeDaysRolls = latestPlayer.game_progress.dailyWheelRolls;
  const cubeDaysClaim = await invoke('player-actions', {
    action: 'claim_task_reward',
    wallet_address: walletAddress,
    session_token: sessionToken,
    task_id: 'cube_3_days',
  });
  latestPlayer = cubeDaysClaim.player;
  assert(latestPlayer.game_progress.dailyWheelRolls === beforeCubeDaysRolls + 1, 'cube_3_days weekly reward did not add one cube charge');

  const beforeCookMissionBait = latestPlayer.bait;
  const cookMissionClaim = await invoke('player-actions', {
    action: 'claim_task_reward',
    wallet_address: walletAddress,
    session_token: sessionToken,
    task_id: 'cook_5_dishes',
  });
  latestPlayer = cookMissionClaim.player;
  assert(latestPlayer.bait === beforeCookMissionBait + 10, 'cook_5_dishes weekly reward did not add 10 bait');

  const staleSave = await invoke('save-player-progress', {
    wallet_address: walletAddress,
    session_token: sessionToken,
    base_updated_at: baseUpdatedAt,
    player_data: {
      ...seededPlayer,
      collection_book: {
        species: {},
        pages: [],
        totalSpeciesCaught: 0,
        totalFirstCatchBonusesClaimed: 0,
      },
    },
    game_progress: {
      ...seededProgress,
      weeklyMissions: {
        ...seededProgress.weeklyMissions,
        catch_60_fish: { progress: 1, claimed: false },
      },
    },
  });

  assert(staleSave.player?.game_progress?.collectionBook?.species?.carp?.discovered === true, 'Stale save wiped collection book species progress');
  assert(staleSave.player?.game_progress?.weeklyMissions?.catch_60_fish?.claimed === true, 'Stale save lowered claimed weekly mission state');

  console.log(JSON.stringify({
    ok: true,
    walletAddress,
    weeklyRewards: {
      catch60CoinsDelta: 300,
      cube3DaysRollsDelta: 1,
      cook5DishesBaitDelta: 10,
    },
    collection: {
      carpDiscovered: true,
      totalSpeciesCaught: staleSave.player?.game_progress?.collectionBook?.totalSpeciesCaught ?? null,
    },
  }, null, 2));
} catch (error) {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
}
