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
  console.error('Missing required live credentials. Need SUPABASE_URL and anon key.');
  process.exit(1);
}

const createTempAccount = () => {
  const privateKey = generatePrivateKey();
  return privateKeyToAccount(privateKey);
};

const inviterAccount = createTempAccount();
const inviteeOneAccount = createTempAccount();
const inviteeTwoAccount = createTempAccount();

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

const todayKey = () => new Date().toISOString().slice(0, 10);

const defaultTasks = () => ({
  check_in: { progress: 0, claimed: false },
  catch_10: { progress: 0, claimed: false },
  rare_1: { progress: 0, claimed: false },
  grill_1: { progress: 0, claimed: false },
  spend_1000: { progress: 0, claimed: false },
});

const defaultSpecialTasks = () => ({
  wallet_check_in: { progress: 0, claimed: false },
  invite_friend: { progress: 0, claimed: false },
});

const saveProgress = async ({
  walletAddress,
  sessionToken,
  baseUpdatedAt,
  playerData,
  gameProgress,
}) => invoke('save-player-progress', {
  wallet_address: walletAddress.toLowerCase(),
  session_token: sessionToken,
  base_updated_at: baseUpdatedAt ?? null,
  player_data: playerData,
  game_progress: gameProgress,
});

const getInventoryQuantity = (inventory, fishId) => (
  Array.isArray(inventory)
    ? inventory.find((item) => item?.fishId === fishId)?.quantity ?? 0
    : 0
);

const getDishQuantity = (cookedDishes, recipeId) => (
  Array.isArray(cookedDishes)
    ? cookedDishes.find((item) => item?.recipeId === recipeId)?.quantity ?? 0
    : 0
);

try {
  const inviterVerify = await invoke('verify-wallet', await createVerificationPayload(inviterAccount));
  const inviterWallet = inviterAccount.address.toLowerCase();
  let inviterSessionToken = inviterVerify.session_token;
  let inviterPlayer = inviterVerify.player;

  assert(inviterPlayer.bait === 0, `Expected inviter first verify to yield 0 reserve bait, got ${inviterPlayer.bait}`);
  assert(inviterPlayer.daily_free_bait === 30, `Expected inviter daily free bait to be 30, got ${inviterPlayer.daily_free_bait}`);
  assert(inviterPlayer.bonus_bait_granted_total === 0, `Expected inviter server bonus total to be 0, got ${inviterPlayer.bonus_bait_granted_total}`);
  assert(inviterPlayer.rewarded_referral_count === 0, `Expected inviter referral count to start at 0, got ${inviterPlayer.rewarded_referral_count}`);

  const inviterRefresh = await invoke('verify-wallet', {
    wallet_address: inviterWallet,
    session_token: inviterSessionToken,
  });
  inviterSessionToken = inviterRefresh.session_token;
  const inviterAfterRefresh = inviterRefresh.player;
  assert(inviterAfterRefresh.bait === inviterPlayer.bait, 'Repeated inviter verify changed reserve bait');
  assert(inviterAfterRefresh.daily_free_bait === inviterPlayer.daily_free_bait, 'Repeated inviter verify changed daily free bait');
  assert(inviterAfterRefresh.rewarded_referral_count === 0, 'Repeated inviter verify changed referral count');

  const inviteeOneVerify = await invoke('verify-wallet', await createVerificationPayload(inviteeOneAccount, inviterWallet));
  const inviteeOneWallet = inviteeOneAccount.address.toLowerCase();
  let inviteeOneSessionToken = inviteeOneVerify.session_token;
  const inviteeOnePlayer = inviteeOneVerify.player;
  const inviterAfterInviteeOne = await invoke('verify-wallet', {
    wallet_address: inviterWallet,
    session_token: inviterSessionToken,
  });
  inviterSessionToken = inviterAfterInviteeOne.session_token;
  inviterPlayer = inviterAfterInviteeOne.player;

  assert(inviteeOnePlayer.referrer_wallet_address === inviterWallet, 'First invitee did not attach inviter wallet');
  assert(inviteeOnePlayer.bait === 0, `Expected invitee one reserve bait to stay at 0 after first verify, got ${inviteeOnePlayer.bait}`);
  assert(inviterPlayer.bait === 10, `Expected inviter reserve bait to increase to 10 after first referral, got ${inviterPlayer.bait}`);
  assert(inviterPlayer.bonus_bait_granted_total === 10, `Expected inviter server bonus total to increase to 10 after first referral, got ${inviterPlayer.bonus_bait_granted_total}`);
  assert(inviterPlayer.rewarded_referral_count === 1, `Expected inviter rewarded referral count to be 1 after first referral, got ${inviterPlayer.rewarded_referral_count}`);

  await invoke('verify-wallet', {
    wallet_address: inviteeOneWallet,
    session_token: inviteeOneSessionToken,
  });
  const inviterAfterInviteeOneRefreshPayload = await invoke('verify-wallet', {
    wallet_address: inviterWallet,
    session_token: inviterSessionToken,
  });
  inviterSessionToken = inviterAfterInviteeOneRefreshPayload.session_token;
  const inviterAfterInviteeOneRefresh = inviterAfterInviteeOneRefreshPayload.player;
  assert(inviterAfterInviteeOneRefresh.bait === inviterPlayer.bait, 'Invitee one refresh duplicated referral reserve bait');
  assert(inviterAfterInviteeOneRefresh.rewarded_referral_count === inviterPlayer.rewarded_referral_count, 'Invitee one refresh duplicated referral count');

  const inviteeOneReSign = await invoke('verify-wallet', await createVerificationPayload(inviteeOneAccount, inviterWallet));
  inviteeOneSessionToken = inviteeOneReSign.session_token;
  const inviterAfterInviteeOneReSignPayload = await invoke('verify-wallet', {
    wallet_address: inviterWallet,
    session_token: inviterSessionToken,
  });
  inviterSessionToken = inviterAfterInviteeOneReSignPayload.session_token;
  const inviterAfterInviteeOneReSign = inviterAfterInviteeOneReSignPayload.player;
  assert(inviterAfterInviteeOneReSign.bait === inviterPlayer.bait, 'Invitee one re-sign duplicated referral reserve bait');
  assert(inviterAfterInviteeOneReSign.rewarded_referral_count === inviterPlayer.rewarded_referral_count, 'Invitee one re-sign duplicated referral count');

  const inviteeTwoVerify = await invoke('verify-wallet', await createVerificationPayload(inviteeTwoAccount, inviterWallet));
  const inviteeTwoWallet = inviteeTwoAccount.address.toLowerCase();
  let inviteeTwoSessionToken = inviteeTwoVerify.session_token;
  let inviteeTwoPlayer = inviteeTwoVerify.player;
  const inviterAfterInviteeTwo = await invoke('verify-wallet', {
    wallet_address: inviterWallet,
    session_token: inviterSessionToken,
  });
  inviterSessionToken = inviterAfterInviteeTwo.session_token;
  inviterPlayer = inviterAfterInviteeTwo.player;

  assert(inviteeTwoPlayer.referrer_wallet_address === inviterWallet, 'Second invitee did not attach inviter wallet');
  assert(inviterPlayer.bait === 20, `Expected inviter reserve bait to increase to 20 after second referral, got ${inviterPlayer.bait}`);
  assert(inviterPlayer.rewarded_referral_count === 2, `Expected inviter rewarded referral count to be 2 after second referral, got ${inviterPlayer.rewarded_referral_count}`);

  const seededState = {
    coins: 5000,
    bait: inviteeTwoPlayer.bait,
    daily_free_bait: inviteeTwoPlayer.daily_free_bait,
    daily_free_bait_reset_at: inviteeTwoPlayer.daily_free_bait_reset_at,
    bonus_bait_granted_total: inviteeTwoPlayer.bonus_bait_granted_total,
    level: 3,
    xp: 25,
    xp_to_next: 300,
    rod_level: 1,
    equipped_rod: 1,
    inventory: [
      { fishId: 'carp', quantity: 2, caughtAt: new Date().toISOString() },
    ],
    cooked_dishes: [],
    total_catches: 3,
    login_streak: 1,
    nft_rods: [],
    nickname: null,
    avatar_url: null,
  };

  const seededProgress = {
    date: todayKey(),
    tasks: {
      ...defaultTasks(),
      check_in: { progress: 1, claimed: false },
      spend_1000: { progress: 1000, claimed: false },
    },
    specialTasks: defaultSpecialTasks(),
    wheelSpun: false,
    wheelPrize: null,
    dailyWheelRolls: 0,
    dailyRollRewardGranted: false,
    paidWheelRolls: 1,
    grillScore: 0,
    dishesToday: 0,
  };

  const seededSave = await saveProgress({
    walletAddress: inviteeTwoWallet,
    sessionToken: inviteeTwoSessionToken,
    baseUpdatedAt: inviteeTwoPlayer.updated_at,
    playerData: seededState,
    gameProgress: seededProgress,
  });

  inviteeTwoPlayer = seededSave.player;
  const beforeCheckInCoins = inviteeTwoPlayer.coins;
  const checkInClaim = await invoke('player-actions', {
    action: 'claim_task_reward',
    wallet_address: inviteeTwoWallet,
    session_token: inviteeTwoSessionToken,
    task_id: 'check_in',
  });
  inviteeTwoPlayer = checkInClaim.player;
  assert(inviteeTwoPlayer.coins === beforeCheckInCoins + 100, `Check-in task should add 100 coins, got delta ${inviteeTwoPlayer.coins - beforeCheckInCoins}`);

  const beforeSpendTaskBait = inviteeTwoPlayer.bait;
  const spendClaim = await invoke('player-actions', {
    action: 'claim_task_reward',
    wallet_address: inviteeTwoWallet,
    session_token: inviteeTwoSessionToken,
    task_id: 'spend_1000',
  });
  inviteeTwoPlayer = spendClaim.player;
  assert(inviteeTwoPlayer.bait === beforeSpendTaskBait + 10, `Spend-1000 task should add 10 reserve bait, got delta ${inviteeTwoPlayer.bait - beforeSpendTaskBait}`);

  let doubleClaimBlocked = false;
  try {
    await invoke('player-actions', {
      action: 'claim_task_reward',
      wallet_address: inviteeTwoWallet,
      session_token: inviteeTwoSessionToken,
      task_id: 'spend_1000',
    });
  } catch {
    doubleClaimBlocked = true;
  }
  assert(doubleClaimBlocked, 'Second claim of spend_1000 was not blocked');

  const grillPrepSave = await saveProgress({
    walletAddress: inviteeTwoWallet,
    sessionToken: inviteeTwoSessionToken,
    baseUpdatedAt: inviteeTwoPlayer.updated_at,
    playerData: {
      ...seededState,
      coins: inviteeTwoPlayer.coins,
      bait: inviteeTwoPlayer.bait,
      daily_free_bait: inviteeTwoPlayer.daily_free_bait,
      daily_free_bait_reset_at: inviteeTwoPlayer.daily_free_bait_reset_at,
      bonus_bait_granted_total: inviteeTwoPlayer.bonus_bait_granted_total,
      inventory: [
        { fishId: 'carp', quantity: 2, caughtAt: new Date().toISOString() },
      ],
      cooked_dishes: [],
    },
    gameProgress: {
      ...(inviteeTwoPlayer.game_progress ?? seededProgress),
      date: todayKey(),
      tasks: {
        ...defaultTasks(),
        grill_1: { progress: 0, claimed: false },
      },
      specialTasks: defaultSpecialTasks(),
      wheelSpun: false,
      wheelPrize: null,
      dailyWheelRolls: 0,
      dailyRollRewardGranted: false,
      paidWheelRolls: 1,
      grillScore: 0,
      dishesToday: 0,
    },
  });

  inviteeTwoPlayer = grillPrepSave.player;
  const cooked = await invoke('player-actions', {
    action: 'cook_recipe',
    wallet_address: inviteeTwoWallet,
    session_token: inviteeTwoSessionToken,
    recipe_id: 'lake_skewer',
  });
  inviteeTwoPlayer = cooked.player;
  assert(getInventoryQuantity(inviteeTwoPlayer.inventory, 'carp') === 0, 'Cook recipe did not consume 2 carp');
  assert(getDishQuantity(inviteeTwoPlayer.cooked_dishes, 'lake_skewer') === 1, 'Cook recipe did not create cooked dish');
  assert(inviteeTwoPlayer.game_progress?.grillScore === 25, `Cook recipe should add 25 grill score, got ${inviteeTwoPlayer.game_progress?.grillScore ?? 'null'}`);
  assert(inviteeTwoPlayer.game_progress?.dishesToday === 1, `Cook recipe should increment dishesToday to 1, got ${inviteeTwoPlayer.game_progress?.dishesToday ?? 'null'}`);

  const beforeSellDishCoins = inviteeTwoPlayer.coins;
  const soldDish = await invoke('player-actions', {
    action: 'sell_cooked_dish',
    wallet_address: inviteeTwoWallet,
    session_token: inviteeTwoSessionToken,
    recipe_id: 'lake_skewer',
  });
  inviteeTwoPlayer = soldDish.player;
  assert(inviteeTwoPlayer.coins === beforeSellDishCoins + 25, `Selling lake_skewer should add 25 coins, got delta ${inviteeTwoPlayer.coins - beforeSellDishCoins}`);
  assert(getDishQuantity(inviteeTwoPlayer.cooked_dishes, 'lake_skewer') === 0, 'Sell cooked dish did not remove dish from inventory');

  const cubePrepSave = await saveProgress({
    walletAddress: inviteeTwoWallet,
    sessionToken: inviteeTwoSessionToken,
    baseUpdatedAt: inviteeTwoPlayer.updated_at,
    playerData: {
      ...seededState,
      coins: inviteeTwoPlayer.coins,
      bait: inviteeTwoPlayer.bait,
      daily_free_bait: inviteeTwoPlayer.daily_free_bait,
      daily_free_bait_reset_at: inviteeTwoPlayer.daily_free_bait_reset_at,
      bonus_bait_granted_total: inviteeTwoPlayer.bonus_bait_granted_total,
      inventory: inviteeTwoPlayer.inventory,
      cooked_dishes: inviteeTwoPlayer.cooked_dishes,
    },
    gameProgress: {
      ...(inviteeTwoPlayer.game_progress ?? seededProgress),
      date: todayKey(),
      tasks: defaultTasks(),
      specialTasks: defaultSpecialTasks(),
      wheelSpun: false,
      wheelPrize: null,
      dailyWheelRolls: 0,
      dailyRollRewardGranted: false,
      paidWheelRolls: 1,
      grillScore: inviteeTwoPlayer.game_progress?.grillScore ?? 0,
      dishesToday: inviteeTwoPlayer.game_progress?.dishesToday ?? 0,
    },
  });

  inviteeTwoPlayer = cubePrepSave.player;
  const beforeCubeCoins = inviteeTwoPlayer.coins;
  const beforeCubeBait = inviteeTwoPlayer.bait;
  const beforeCubeFish = getInventoryQuantity(inviteeTwoPlayer.inventory, 'carp')
    + getInventoryQuantity(inviteeTwoPlayer.inventory, 'perch')
    + getInventoryQuantity(inviteeTwoPlayer.inventory, 'bream')
    + getInventoryQuantity(inviteeTwoPlayer.inventory, 'catfish')
    + getInventoryQuantity(inviteeTwoPlayer.inventory, 'goldfish')
    + getInventoryQuantity(inviteeTwoPlayer.inventory, 'mutant')
    + getInventoryQuantity(inviteeTwoPlayer.inventory, 'pike')
    + getInventoryQuantity(inviteeTwoPlayer.inventory, 'leviathan');

  const rolledCube = await invoke('player-actions', {
    action: 'roll_cube',
    wallet_address: inviteeTwoWallet,
    session_token: inviteeTwoSessionToken,
  });
  assert(typeof rolledCube.roll?.id === 'string', 'Cube roll did not return roll id');

  const appliedCube = await invoke('player-actions', {
    action: 'apply_cube_reward',
    wallet_address: inviteeTwoWallet,
    session_token: inviteeTwoSessionToken,
    roll_id: rolledCube.roll.id,
  });
  inviteeTwoPlayer = appliedCube.player;
  const appliedPrize = appliedCube.prize;

  if (appliedPrize.type === 'coins') {
    assert(inviteeTwoPlayer.coins === beforeCubeCoins + (appliedPrize.coins ?? 0), `Coin cube prize mismatch, expected +${appliedPrize.coins ?? 0}`);
  } else if (appliedPrize.type === 'fish') {
    const afterCubeFish = getInventoryQuantity(inviteeTwoPlayer.inventory, 'carp')
      + getInventoryQuantity(inviteeTwoPlayer.inventory, 'perch')
      + getInventoryQuantity(inviteeTwoPlayer.inventory, 'bream')
      + getInventoryQuantity(inviteeTwoPlayer.inventory, 'catfish')
      + getInventoryQuantity(inviteeTwoPlayer.inventory, 'goldfish')
      + getInventoryQuantity(inviteeTwoPlayer.inventory, 'mutant')
      + getInventoryQuantity(inviteeTwoPlayer.inventory, 'pike')
      + getInventoryQuantity(inviteeTwoPlayer.inventory, 'leviathan');
    assert(afterCubeFish === beforeCubeFish + (appliedPrize.quantity ?? 1), `Fish cube prize mismatch, expected +${appliedPrize.quantity ?? 1} fish`);
  } else if (appliedPrize.type === 'bait') {
    assert(inviteeTwoPlayer.bait === beforeCubeBait + (appliedPrize.bait ?? 0), `Bait cube prize mismatch, expected +${appliedPrize.bait ?? 0} reserve bait`);
  } else if (appliedPrize.type === 'mon') {
    const monSummary = await invoke('player-mon', {
      action: 'get_mon_summary',
      wallet_address: inviteeTwoWallet,
      session_token: inviteeTwoSessionToken,
    });
    assert(Number(monSummary.summary?.totalEarnedMon ?? 0) >= 1, 'MON cube prize did not hit MON ledger');
  }

  let doubleCubeApplyBlocked = false;
  try {
    await invoke('player-actions', {
      action: 'apply_cube_reward',
      wallet_address: inviteeTwoWallet,
      session_token: inviteeTwoSessionToken,
      roll_id: rolledCube.roll.id,
    });
  } catch {
    doubleCubeApplyBlocked = true;
  }
  assert(doubleCubeApplyBlocked, 'Second apply_cube_reward call was not blocked');

  console.log(JSON.stringify({
    ok: true,
    wallets: {
      inviter: inviterWallet,
      inviteeOne: inviteeOneWallet,
      inviteeTwo: inviteeTwoWallet,
    },
    referral: {
      inviterReserveBait: inviterPlayer.bait,
      inviterRewardedReferralCount: inviterPlayer.rewarded_referral_count,
      inviteeOneReserveBait: inviteeOnePlayer.bait,
      inviteeTwoReserveBait: inviteeTwoPlayer.bait,
    },
    taskRewards: {
      checkInCoinsDelta: 100,
      spend1000BaitDelta: 10,
    },
    grill: {
      grillScore: inviteeTwoPlayer.game_progress?.grillScore ?? null,
      dishesToday: inviteeTwoPlayer.game_progress?.dishesToday ?? null,
    },
    cube: {
      prizeType: appliedPrize.type,
      prize: appliedPrize,
    },
  }, null, 2));
} catch (error) {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
}
