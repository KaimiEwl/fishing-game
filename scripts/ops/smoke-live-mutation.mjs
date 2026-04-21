import { createHmac } from 'node:crypto';
import { createClient } from '@supabase/supabase-js';

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
const sessionSecret = readArg('session-secret') || process.env.SESSION_TOKEN_SECRET;
const adminWalletAddress = (readArg('admin-wallet') || process.env.ADMIN_WALLET_ADDRESS || '0x0266bd01196b04a7a57372fc9fb2f34374e6327d').toLowerCase();

if (!supabaseUrl || !anonKey || !serviceRoleKey || !sessionSecret) {
  console.error('Missing required live credentials. Need SUPABASE_URL, anon key, service role key, and SESSION_TOKEN_SECRET.');
  process.exit(1);
}

const toBase64Url = (value) => Buffer
  .from(value)
  .toString('base64')
  .replace(/\+/g, '-')
  .replace(/\//g, '_')
  .replace(/=+$/g, '');

const createSessionToken = (walletAddress, expiresAt = Date.now() + 1000 * 60 * 60) => {
  const payload = JSON.stringify({
    sub: walletAddress.toLowerCase(),
    exp: expiresAt,
  });
  const encodedPayload = toBase64Url(payload);
  const signature = createHmac('sha256', sessionSecret)
    .update(encodedPayload)
    .digest();

  return `${encodedPayload}.${toBase64Url(signature)}`;
};

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const tempWalletAddress = `0x${Date.now().toString(16).padStart(40, 'a').slice(-40)}`.toLowerCase();
const tempNickname = `smoke_${Date.now().toString(36).slice(-6)}`;
const adminSessionToken = createSessionToken(adminWalletAddress);
const playerSessionToken = createSessionToken(tempWalletAddress);

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

const assert = (condition, message) => {
  if (!condition) {
    throw new Error(message);
  }
};

const emptyTasks = {
  check_in: { progress: 0, claimed: false },
  catch_10: { progress: 0, claimed: false },
  rare_1: { progress: 0, claimed: false },
  grill_1: { progress: 0, claimed: false },
  spend_1000: { progress: 0, claimed: false },
};

const emptySpecialTasks = {
  invite_friend: { progress: 0, claimed: false },
};

const cleanup = async () => {
  const deleteByWallet = async (table) => {
    const { error } = await supabase.from(table).delete().eq('wallet_address', tempWalletAddress);
    if (error) throw error;
  };

  for (const table of [
    'mon_withdraw_requests',
    'player_mon_rewards',
    'player_cube_rolls',
    'social_task_verifications',
    'grill_leaderboard',
    'player_audit_logs',
  ]) {
    try {
      await deleteByWallet(table);
    } catch {
      // Ignore cleanup misses for smoke-only rows.
    }
  }

  try {
    await supabase.from('players').delete().eq('wallet_address', tempWalletAddress);
  } catch {
    // Ignore cleanup misses for smoke-only rows.
  }
};

try {
  await cleanup();

  const initialPlayer = {
    wallet_address: tempWalletAddress,
    nickname: tempNickname,
    coins: 1500,
    bait: 20,
    daily_free_bait: 30,
    level: 3,
    xp: 25,
    xp_to_next: 300,
    rod_level: 0,
    equipped_rod: 0,
    inventory: [
      { fishId: 'carp', quantity: 2, caughtAt: new Date().toISOString() },
    ],
    cooked_dishes: [],
    total_catches: 5,
    nft_rods: [],
    login_streak: 1,
    game_progress: {
      date: new Date().toISOString().slice(0, 10),
      tasks: {
        ...emptyTasks,
        check_in: { progress: 1, claimed: false },
      },
      specialTasks: emptySpecialTasks,
      wheelSpun: false,
      wheelPrize: null,
      dailyWheelRolls: 1,
      dailyRollRewardGranted: false,
      paidWheelRolls: 0,
      grillScore: 0,
      dishesToday: 0,
    },
  };

  const { data: createdPlayer, error: createPlayerError } = await supabase
    .from('players')
    .insert(initialPlayer)
    .select('id, wallet_address, coins, cooked_dishes, game_progress')
    .single();
  if (createPlayerError) throw createPlayerError;

  const adminCheck = await invoke('admin', {
    action: 'check_admin',
    wallet_address: adminWalletAddress,
    session_token: adminSessionToken,
  });
  assert(adminCheck.is_admin === true, 'Admin auth failed');

  const weeklyPreview = await invoke('admin', {
    action: 'preview_weekly_payouts',
    wallet_address: adminWalletAddress,
    session_token: adminSessionToken,
  });
  assert(Array.isArray(weeklyPreview.preview), 'Weekly preview did not return array');

  const claimedTask = await invoke('player-actions', {
    action: 'claim_task_reward',
    wallet_address: tempWalletAddress,
    session_token: playerSessionToken,
    task_id: 'check_in',
  });
  assert(claimedTask.player?.coins >= 1600, 'Task reward did not grant coins');

  const cubeRoll = await invoke('player-actions', {
    action: 'roll_cube',
    wallet_address: tempWalletAddress,
    session_token: playerSessionToken,
  });
  assert(typeof cubeRoll.roll?.id === 'string', 'Cube roll id missing');
  assert(cubeRoll.roll?.prize?.type, 'Cube prize missing');

  const appliedCubeReward = await invoke('player-actions', {
    action: 'apply_cube_reward',
    wallet_address: tempWalletAddress,
    session_token: playerSessionToken,
    roll_id: cubeRoll.roll.id,
  });
  assert(appliedCubeReward.player?.wallet_address === tempWalletAddress, 'Cube reward did not return player snapshot');

  const cookedRecipe = await invoke('player-actions', {
    action: 'cook_recipe',
    wallet_address: tempWalletAddress,
    session_token: playerSessionToken,
    recipe_id: 'lake_skewer',
  });
  assert(Array.isArray(cookedRecipe.player?.cooked_dishes) && cookedRecipe.player.cooked_dishes.length > 0, 'Cooked dish not created');

  const soldDish = await invoke('player-actions', {
    action: 'sell_cooked_dish',
    wallet_address: tempWalletAddress,
    session_token: playerSessionToken,
    recipe_id: 'lake_skewer',
  });
  assert(Array.isArray(soldDish.player?.cooked_dishes) && soldDish.player.cooked_dishes.length === 0, 'Cooked dish not sold out');

  const socialVerification = await invoke('admin', {
    action: 'set_social_task_verification',
    wallet_address: adminWalletAddress,
    session_token: adminSessionToken,
    player_id: createdPlayer.id,
    task_id: 'twitter_follow',
    status: 'verified',
    proof_url: 'https://example.com/mock-follow-proof',
  });
  assert(socialVerification.verification?.status === 'verified', 'Social verification update failed');

  const socialList = await invoke('admin', {
    action: 'list_social_task_verifications',
    wallet_address: adminWalletAddress,
    session_token: adminSessionToken,
    status: 'verified',
    limit: 20,
  });
  assert((socialList.verifications ?? []).some((entry) => entry.wallet_address === tempWalletAddress), 'Social verification not listed');

  const holdUntil = new Date(Date.now() - 60_000).toISOString();
  const { error: rewardInsertError } = await supabase
    .from('player_mon_rewards')
    .insert({
      player_id: createdPlayer.id,
      wallet_address: tempWalletAddress,
      amount_mon: 1.25,
      source_type: 'smoke_test_reward',
      source_ref: tempNickname,
      hold_until: holdUntil,
      created_by_wallet: adminWalletAddress,
      admin_note: 'Smoke test reward',
    });
  if (rewardInsertError) throw rewardInsertError;

  const monSummary = await invoke('player-mon', {
    action: 'get_mon_summary',
    wallet_address: tempWalletAddress,
    session_token: playerSessionToken,
  });
  assert(Number(monSummary.summary?.withdrawableMon ?? 0) >= 1.25, 'Withdrawable MON summary missing reward');

  const withdrawRequest = await invoke('player-mon', {
    action: 'create_withdraw_request',
    wallet_address: tempWalletAddress,
    session_token: playerSessionToken,
  });
  assert(withdrawRequest.request?.status === 'pending', 'Withdraw request not created');

  const pendingRequests = await invoke('admin', {
    action: 'list_withdraw_requests',
    wallet_address: adminWalletAddress,
    session_token: adminSessionToken,
    status: 'pending',
    limit: 50,
  });
  const requestRow = (pendingRequests.requests ?? []).find((entry) => entry.wallet_address === tempWalletAddress);
  assert(requestRow?.id, 'Pending withdraw request not visible to admin');

  const approvedRequest = await invoke('admin', {
    action: 'approve_withdraw_request',
    wallet_address: adminWalletAddress,
    session_token: adminSessionToken,
    request_id: requestRow.id,
  });
  assert(approvedRequest.request?.status === 'approved', 'Withdraw approval failed');

  const paidRequest = await invoke('admin', {
    action: 'mark_withdraw_paid',
    wallet_address: adminWalletAddress,
    session_token: adminSessionToken,
    request_id: requestRow.id,
    payout_tx_hash: `0xsmoketest${Date.now().toString(16)}`,
  });
  assert(paidRequest.request?.status === 'paid', 'Withdraw mark-paid failed');

  console.log(JSON.stringify({
    ok: true,
    tempWalletAddress,
    cubePrizeType: cubeRoll.roll.prize.type,
    weeklyPreviewCount: weeklyPreview.preview.length,
    withdrawRequestId: requestRow.id,
  }, null, 2));
} finally {
  await cleanup();
}
