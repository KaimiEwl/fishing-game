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

if (!supabaseUrl || !anonKey || !serviceRoleKey) {
  console.error('Missing required live credentials. Need SUPABASE_URL, anon key, and service role key.');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const createTempAccount = () => {
  const privateKey = generatePrivateKey();
  return privateKeyToAccount(privateKey);
};

const adminAccount = createTempAccount();
const playerAccount = createTempAccount();
const smokeRef = `smoke_${Date.now().toString(36)}`;

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

const createVerificationPayload = async (account, referrerWalletAddress) => {
  const message = `Hook & Loot: Sign to verify your wallet\nAddress: ${account.address}\nTimestamp: ${Date.now()}`;
  const signature = await account.signMessage({ message });
  return {
    wallet_address: account.address.toLowerCase(),
    message,
    signature,
    ...(referrerWalletAddress ? { referrer_wallet_address: referrerWalletAddress.toLowerCase() } : {}),
  };
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

const cleanupWallet = async (walletAddress) => {
  for (const table of [
    'mon_withdraw_requests',
    'player_mon_rewards',
    'player_cube_rolls',
    'social_task_verifications',
    'grill_leaderboard',
    'player_audit_logs',
    'admin_roles',
  ]) {
    try {
      await supabase.from(table).delete().eq('wallet_address', walletAddress);
    } catch {
      // ignore cleanup misses
    }
  }

  try {
    await supabase.from('edge_rate_limits').delete().eq('subject_key', walletAddress);
  } catch {
    // ignore cleanup misses
  }

  try {
    await supabase.from('players').delete().eq('wallet_address', walletAddress);
  } catch {
    // ignore cleanup misses
  }
};

const cleanup = async () => {
  await cleanupWallet(adminAccount.address.toLowerCase());
  await cleanupWallet(playerAccount.address.toLowerCase());
};

try {
  await cleanup();

  const { error: adminRoleError } = await supabase.from('admin_roles').insert({
    wallet_address: adminAccount.address.toLowerCase(),
    role: 'admin',
  });
  if (adminRoleError) throw adminRoleError;

  const adminVerify = await invoke('verify-wallet', await createVerificationPayload(adminAccount));
  const playerVerify = await invoke('verify-wallet', await createVerificationPayload(playerAccount));

  assert(typeof adminVerify.session_token === 'string', 'Admin session token missing');
  assert(typeof playerVerify.session_token === 'string', 'Player session token missing');

  const adminWalletAddress = adminAccount.address.toLowerCase();
  const playerWalletAddress = playerAccount.address.toLowerCase();
  const playerId = playerVerify.player?.id;
  assert(typeof playerId === 'string', 'Player id missing after verify-wallet');

  const { error: preparePlayerError } = await supabase
    .from('players')
    .update({
      nickname: smokeRef,
      coins: 1500,
      inventory: [
        { fishId: 'carp', quantity: 2, caughtAt: new Date().toISOString() },
      ],
      cooked_dishes: [],
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
    })
    .eq('wallet_address', playerWalletAddress);
  if (preparePlayerError) throw preparePlayerError;

  const adminCheck = await invoke('admin', {
    action: 'check_admin',
    wallet_address: adminWalletAddress,
    session_token: adminVerify.session_token,
  });
  assert(adminCheck.is_admin === true, 'Admin auth failed');

  const weeklyPreview = await invoke('admin', {
    action: 'preview_weekly_payouts',
    wallet_address: adminWalletAddress,
    session_token: adminVerify.session_token,
  });
  assert(Array.isArray(weeklyPreview.preview), 'Weekly preview did not return array');

  const claimedTask = await invoke('player-actions', {
    action: 'claim_task_reward',
    wallet_address: playerWalletAddress,
    session_token: playerVerify.session_token,
    task_id: 'check_in',
  });
  assert(claimedTask.player?.coins >= 1600, 'Task reward did not grant coins');

  const cubeRoll = await invoke('player-actions', {
    action: 'roll_cube',
    wallet_address: playerWalletAddress,
    session_token: playerVerify.session_token,
  });
  assert(typeof cubeRoll.roll?.id === 'string', 'Cube roll id missing');
  assert(cubeRoll.roll?.prize?.type, 'Cube prize missing');

  const appliedCubeReward = await invoke('player-actions', {
    action: 'apply_cube_reward',
    wallet_address: playerWalletAddress,
    session_token: playerVerify.session_token,
    roll_id: cubeRoll.roll.id,
  });
  assert(appliedCubeReward.player?.wallet_address === playerWalletAddress, 'Cube reward did not return player snapshot');

  const cookedRecipe = await invoke('player-actions', {
    action: 'cook_recipe',
    wallet_address: playerWalletAddress,
    session_token: playerVerify.session_token,
    recipe_id: 'lake_skewer',
  });
  assert(Array.isArray(cookedRecipe.player?.cooked_dishes) && cookedRecipe.player.cooked_dishes.length > 0, 'Cooked dish not created');

  const soldDish = await invoke('player-actions', {
    action: 'sell_cooked_dish',
    wallet_address: playerWalletAddress,
    session_token: playerVerify.session_token,
    recipe_id: 'lake_skewer',
  });
  assert(Array.isArray(soldDish.player?.cooked_dishes) && soldDish.player.cooked_dishes.length === 0, 'Cooked dish not sold out');

  const socialVerification = await invoke('admin', {
    action: 'set_social_task_verification',
    wallet_address: adminWalletAddress,
    session_token: adminVerify.session_token,
    player_id: playerId,
    task_id: 'twitter_follow',
    status: 'verified',
    proof_url: 'https://example.com/mock-follow-proof',
  });
  assert(socialVerification.verification?.status === 'verified', 'Social verification update failed');

  const socialList = await invoke('admin', {
    action: 'list_social_task_verifications',
    wallet_address: adminWalletAddress,
    session_token: adminVerify.session_token,
    status: 'verified',
    limit: 20,
  });
  assert((socialList.verifications ?? []).some((entry) => entry.wallet_address === playerWalletAddress), 'Social verification not listed');

  const { error: rateLimitSeedError } = await supabase.from('edge_rate_limits').insert({
    action_key: 'player_actions.roll_cube',
    subject_key: playerWalletAddress,
    window_started_at: new Date().toISOString(),
    hit_count: 12,
  });
  if (rateLimitSeedError) throw rateLimitSeedError;

  const suspiciousSummary = await invoke('admin', {
    action: 'get_suspicious_summary',
    wallet_address: adminWalletAddress,
    session_token: adminVerify.session_token,
  });
  assert(Number(suspiciousSummary.summary?.flagged_players ?? 0) >= 1, 'Suspicious summary did not report any flagged players');

  const suspiciousPlayers = await invoke('admin', {
    action: 'list_suspicious_players',
    wallet_address: adminWalletAddress,
    session_token: adminVerify.session_token,
    limit: 20,
  });
  assert((suspiciousPlayers.players ?? []).some((entry) => entry.wallet_address === playerWalletAddress), 'Suspicious players list did not include seeded player');

  await invoke('admin', {
    action: 'grant_mon_reward',
    wallet_address: adminWalletAddress,
    session_token: adminVerify.session_token,
    player_id: playerId,
    amount_mon: 1.25,
    admin_note: 'Smoke test reward',
    source_ref: smokeRef,
  });

  const monSummary = await invoke('player-mon', {
    action: 'get_mon_summary',
    wallet_address: playerWalletAddress,
    session_token: playerVerify.session_token,
  });
  assert(Number(monSummary.summary?.pendingHoldMon ?? 0) >= 1.25, 'MON summary missing granted reward');

  const { error: makeWithdrawableError } = await supabase
    .from('player_mon_rewards')
    .update({ hold_until: new Date(Date.now() - 60_000).toISOString() })
    .eq('wallet_address', playerWalletAddress)
    .eq('source_type', 'admin_manual_grant');
  if (makeWithdrawableError) throw makeWithdrawableError;

  const withdrawableSummary = await invoke('player-mon', {
    action: 'get_mon_summary',
    wallet_address: playerWalletAddress,
    session_token: playerVerify.session_token,
  });
  assert(Number(withdrawableSummary.summary?.withdrawableMon ?? 0) >= 1.25, 'Withdrawable MON summary missing reward');

  const withdrawRequest = await invoke('player-mon', {
    action: 'create_withdraw_request',
    wallet_address: playerWalletAddress,
    session_token: playerVerify.session_token,
  });
  assert(withdrawRequest.request?.status === 'pending', 'Withdraw request not created');

  const pendingRequests = await invoke('admin', {
    action: 'list_withdraw_requests',
    wallet_address: adminWalletAddress,
    session_token: adminVerify.session_token,
    status: 'pending',
    limit: 50,
  });
  const requestRow = (pendingRequests.requests ?? []).find((entry) => entry.wallet_address === playerWalletAddress);
  assert(requestRow?.id, 'Pending withdraw request not visible to admin');

  const approvedRequest = await invoke('admin', {
    action: 'approve_withdraw_request',
    wallet_address: adminWalletAddress,
    session_token: adminVerify.session_token,
    request_id: requestRow.id,
  });
  assert(approvedRequest.request?.status === 'approved', 'Withdraw approval failed');

  const paidRequest = await invoke('admin', {
    action: 'mark_withdraw_paid',
    wallet_address: adminWalletAddress,
    session_token: adminVerify.session_token,
    request_id: requestRow.id,
    payout_tx_hash: `0xsmoketest${Date.now().toString(16)}`,
  });
  assert(paidRequest.request?.status === 'paid', 'Withdraw mark-paid failed');

  console.log(JSON.stringify({
    ok: true,
    adminWalletAddress,
    playerWalletAddress,
    playerId,
    cubePrizeType: cubeRoll.roll.prize.type,
    weeklyPreviewCount: weeklyPreview.preview.length,
    suspiciousFlaggedPlayers: suspiciousSummary.summary.flagged_players,
    withdrawRequestId: requestRow.id,
  }, null, 2));
} finally {
  await cleanup();
}
