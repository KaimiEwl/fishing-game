import { generatePrivateKey, privateKeyToAccount } from 'viem/accounts';

const baseUrl = (process.env.HOOKLOOT_API_BASE_URL || 'http://127.0.0.1:8787').replace(/\/$/, '');
const privateKey = process.env.HOOKLOOT_SMOKE_PRIVATE_KEY
  || generatePrivateKey();
const fakePaymentsEnabled = /^(1|true|yes|on)$/i.test(
  process.env.HOOKLOOT_SMOKE_FAKE_PAYMENTS
    || process.env.HOOKLOOT_ALLOW_UNVERIFIED_PAYMENTS
    || '',
);

const account = privateKeyToAccount(privateKey);

async function post(path, body) {
  const response = await fetch(`${baseUrl}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const payload = await response.json().catch(() => null);
  if (!response.ok) {
    throw new Error(`${path} failed (${response.status}): ${JSON.stringify(payload)}`);
  }
  return payload;
}

async function expectPostFailure(path, body, expectedStatuses, label) {
  const response = await fetch(`${baseUrl}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const payload = await response.json().catch(() => null);
  if (response.ok || !expectedStatuses.includes(response.status)) {
    throw new Error(`${label} unexpectedly returned ${response.status}: ${JSON.stringify(payload)}`);
  }
  return {
    status: response.status,
    error: payload?.error ?? null,
  };
}

function assertEqualJson(label, actual, expected) {
  if (JSON.stringify(actual) !== JSON.stringify(expected)) {
    throw new Error(`${label} changed unexpectedly: actual=${JSON.stringify(actual)} expected=${JSON.stringify(expected)}`);
  }
}

async function main() {
  const health = await fetch(`${baseUrl}/healthz`);
  if (!health.ok) throw new Error(`healthz failed: ${health.status}`);

  const message = `Hook & Loot smoke ${Date.now()}`;
  const signature = await account.signMessage({ message });
  const verified = await post('/api/edge/verify-wallet', {
    wallet_address: account.address,
    message,
    signature,
  });

  const wallet = verified.player.wallet_address;
  const session = verified.session_token;

  const saved = await post('/api/edge/save-player-progress', {
    wallet_address: wallet,
    session_token: session,
    player_data: {
      coins: 125,
      bait: 7,
      level: 2,
      xp: 40,
      xp_to_next: 100,
      rod_level: 0,
      equipped_rod: 0,
      inventory: [{ fishId: 'carp', quantity: 2, caughtAt: new Date().toISOString() }],
      cooked_dishes: [],
      total_catches: 2,
      login_streak: 1,
      nft_rods: [],
      nickname: 'Smoke Tester',
    },
    game_progress: {
      date: new Date().toISOString().slice(0, 10),
      tasks: {},
      specialTasks: {},
      wheelSpun: false,
      wheelPrize: null,
      dailyWheelRolls: 1,
      dailyRollRewardGranted: false,
      paidWheelRolls: 0,
      grillScore: 0,
      dishesToday: 0,
    },
  });

  const startedCast = await post('/api/edge/player-actions', {
    action: 'start_fishing_cast',
    wallet_address: wallet,
    session_token: session,
  });

  await new Promise((resolve) => {
    setTimeout(resolve, startedCast.fishing_cast.waitMs + 100);
  });

  const resolvedCast = await post('/api/edge/player-actions', {
    action: 'resolve_fishing_cast',
    wallet_address: wallet,
    session_token: session,
    cast_id: startedCast.fishing_cast.id,
    resolution: 'reel',
  });

  const guest = await post('/api/edge/guest-session', {});
  const guestId = guest.guest_id || guest.player?.wallet_address;
  const guestSession = guest.session_token;
  if (!guestId || !guestSession) {
    throw new Error(`guest-session returned incomplete identity: ${JSON.stringify(guest)}`);
  }

  const guestStartedCast = await post('/api/edge/player-actions', {
    action: 'start_fishing_cast',
    wallet_address: guestId,
    session_token: guestSession,
  });

  const guestRestoredAfterStart = await post('/api/edge/guest-session', {
    guest_id: guestId,
    session_token: guestSession,
  });
  if (guestRestoredAfterStart.player?.daily_free_bait !== guestStartedCast.player?.daily_free_bait) {
    throw new Error(`guest bait was not persisted on the server: start=${guestStartedCast.player?.daily_free_bait} restore=${guestRestoredAfterStart.player?.daily_free_bait}`);
  }

  await new Promise((resolve) => {
    setTimeout(resolve, guestStartedCast.fishing_cast.waitMs + 100);
  });

  const guestResolvedCast = await post('/api/edge/player-actions', {
    action: 'resolve_fishing_cast',
    wallet_address: guestId,
    session_token: guestSession,
    cast_id: guestStartedCast.fishing_cast.id,
    resolution: 'reel',
  });

  const guestRestoredAfterResolve = await post('/api/edge/guest-session', {
    guest_id: guestId,
    session_token: guestSession,
  });
  if (guestRestoredAfterResolve.player?.xp !== guestResolvedCast.player?.xp) {
    throw new Error(`guest XP was not persisted on the server: resolve=${guestResolvedCast.player?.xp} restore=${guestRestoredAfterResolve.player?.xp}`);
  }
  const duplicateResolveFailure = await expectPostFailure('/api/edge/player-actions', {
    action: 'resolve_fishing_cast',
    wallet_address: guestId,
    session_token: guestSession,
    cast_id: guestStartedCast.fishing_cast.id,
    resolution: 'reel',
  }, [400, 409], 'duplicate fishing cast resolve');

  const authoritativeGuestPlayer = guestRestoredAfterResolve.player;
  const authoritativeProgress = authoritativeGuestPlayer?.game_progress || {};
  await post('/api/edge/save-player-progress', {
    wallet_address: guestId,
    session_token: guestSession,
    player_data: {
      coins: 999_999,
      bait: 999,
      daily_free_bait: 999,
      level: 99,
      xp: 99_999,
      xp_to_next: 1,
      rod_level: 99,
      equipped_rod: 99,
      inventory: [{ fishId: 'leviathan', quantity: 999, caughtAt: new Date().toISOString() }],
      cooked_dishes: [{ recipeId: 'legendary_feast', quantity: 999, createdAt: new Date().toISOString() }],
      total_catches: 999,
      nft_rods: [99],
    },
    game_progress: {
      ...authoritativeProgress,
      tasks: {
        ...(authoritativeProgress.tasks || {}),
        catch_10: { progress: 10, claimed: true },
        rare_1: { progress: 1, claimed: true },
      },
      weeklyMissions: {
        ...(authoritativeProgress.weeklyMissions || {}),
        catch_60_fish: { progress: 60, claimed: true },
      },
      dailyWheelRolls: 999,
      paidWheelRolls: 999,
      grillScore: 999_999,
      dishesToday: 999,
      fishingNet: {
        owned: true,
        dailyFishCount: 999,
        pendingCatch: [{ fishId: 'leviathan', quantity: 999 }],
      },
    },
  });
  const guestRestoredAfterTamper = await post('/api/edge/guest-session', {
    guest_id: guestId,
    session_token: guestSession,
  });
  const tamperPlayer = guestRestoredAfterTamper.player;
  for (const field of [
    'coins',
    'bait',
    'daily_free_bait',
    'level',
    'xp',
    'xp_to_next',
    'rod_level',
    'equipped_rod',
    'total_catches',
  ]) {
    if (tamperPlayer?.[field] !== authoritativeGuestPlayer?.[field]) {
      throw new Error(`client-authored ${field} was accepted by save-player-progress: before=${authoritativeGuestPlayer?.[field]} after=${tamperPlayer?.[field]}`);
    }
  }
  assertEqualJson('client-authored inventory', tamperPlayer?.inventory, authoritativeGuestPlayer?.inventory);
  assertEqualJson('client-authored cooked dishes', tamperPlayer?.cooked_dishes, authoritativeGuestPlayer?.cooked_dishes);
  assertEqualJson('client-authored task progress', tamperPlayer?.game_progress?.tasks, authoritativeGuestPlayer?.game_progress?.tasks);
  assertEqualJson('client-authored weekly progress', tamperPlayer?.game_progress?.weeklyMissions, authoritativeGuestPlayer?.game_progress?.weeklyMissions);
  if (tamperPlayer?.game_progress?.dailyWheelRolls !== authoritativeGuestPlayer?.game_progress?.dailyWheelRolls) {
    throw new Error('client-authored daily cube rolls were accepted by save-player-progress');
  }
  if (tamperPlayer?.game_progress?.paidWheelRolls !== authoritativeGuestPlayer?.game_progress?.paidWheelRolls) {
    throw new Error('client-authored paid cube rolls were accepted by save-player-progress');
  }

  const linkAccount = privateKeyToAccount(generatePrivateKey());
  const linkMessage = `Hook & Loot guest link smoke ${Date.now()}`;
  const linkSignature = await linkAccount.signMessage({ message: linkMessage });
  const linkedWallet = await post('/api/edge/verify-wallet', {
    wallet_address: linkAccount.address,
    message: linkMessage,
    signature: linkSignature,
    guest_id: guestId,
    guest_session_token: guestSession,
  });
  if (linkedWallet.linked_guest_id !== guestId) {
    throw new Error(`guest link did not return the linked guest id: ${JSON.stringify(linkedWallet)}`);
  }
  if (linkedWallet.player?.wallet_address?.toLowerCase() !== linkAccount.address.toLowerCase()) {
    throw new Error(`guest link did not produce the expected wallet player: ${JSON.stringify(linkedWallet.player)}`);
  }
  if (linkedWallet.player?.daily_free_bait !== guestResolvedCast.player?.daily_free_bait) {
    throw new Error(`guest daily bait was not carried into the wallet: guest=${guestResolvedCast.player?.daily_free_bait} wallet=${linkedWallet.player?.daily_free_bait}`);
  }
  if (linkedWallet.player?.xp !== guestResolvedCast.player?.xp) {
    throw new Error(`guest XP was not carried into the wallet: guest=${guestResolvedCast.player?.xp} wallet=${linkedWallet.player?.xp}`);
  }
  const guestAfterLink = await post('/api/edge/guest-session', {
    guest_id: guestId,
    session_token: guestSession,
  });
  if (guestAfterLink.guest_id === guestId) {
    throw new Error('linked guest profile was restored as an active guest instead of rotating to a new guest identity');
  }
  if (guestAfterLink.player?.wallet_address !== guestAfterLink.guest_id) {
    throw new Error(`rotated guest session did not return its own player row: ${JSON.stringify(guestAfterLink)}`);
  }

  let purchaseSmoke = { skipped: 'set HOOKLOOT_ALLOW_UNVERIFIED_PAYMENTS=1 for local fake-payment checks' };
  if (fakePaymentsEnabled) {
    const fakeTxHash = `0x${'1'.repeat(64)}`;
    const coinPurchase = await post('/api/edge/verify-purchase', {
      tx_hash: fakeTxHash,
      wallet_address: wallet,
      expected_coins: 100,
      expected_mon: '0.1',
    });

    const netPurchase = await post('/api/edge/player-actions', {
      action: 'buy_fishing_net',
      wallet_address: wallet,
      session_token: session,
      daily_fish_count: 2,
      tx_hash: fakeTxHash,
      expected_mon: '1',
    });

    const netClaim = await post('/api/edge/player-actions', {
      action: 'claim_fishing_net',
      wallet_address: wallet,
      session_token: session,
    });

    const cubeTopUp = await post('/api/edge/player-actions', {
      action: 'buy_cube_rolls',
      wallet_address: wallet,
      session_token: session,
      rolls: 1,
      tx_hash: fakeTxHash,
      expected_mon: '1',
    });

    purchaseSmoke = {
      coinPurchasePlayerCoins: coinPurchase.player?.coins,
      netOwned: netPurchase.fishing_net?.owned,
      netClaimed: netClaim.claimed_catch,
      paidWheelRolls: cubeTopUp.player?.game_progress?.paidWheelRolls,
    };
  }

  let cubePrize = null;
  let cubeSkipped = null;
  try {
    const rolled = await post('/api/edge/player-actions', {
      action: 'roll_cube',
      wallet_address: wallet,
      session_token: session,
    });

    const applied = await post('/api/edge/player-actions', {
      action: 'apply_cube_reward',
      wallet_address: wallet,
      session_token: session,
      roll_id: rolled.roll.id,
    });
    cubePrize = applied.prize;
  } catch (error) {
    cubeSkipped = error instanceof Error ? error.message : String(error);
  }

  const mon = await post('/api/edge/player-mon', {
    action: 'get_mon_summary',
    wallet_address: wallet,
    session_token: session,
  });

  const leaderboard = await post('/api/leaderboard/grill', {
    id: `wallet:${wallet}`,
    name: 'Smoke Tester',
    score: 10,
    dishes: 1,
    walletAddress: wallet,
  });

  console.log(JSON.stringify({
    ok: true,
    baseUrl,
    wallet,
    savedCoins: saved.player.coins,
    fishingResult: resolvedCast.fishing_result,
    guestSmoke: {
      guestId,
      startingDailyBait: guest.player?.daily_free_bait,
      afterStartDailyBait: guestStartedCast.player?.daily_free_bait,
      restoredDailyBait: guestRestoredAfterStart.player?.daily_free_bait,
      fishingResult: guestResolvedCast.fishing_result,
      restoredXp: guestRestoredAfterResolve.player?.xp,
      linkedWallet: linkedWallet.player?.wallet_address,
      linkedWalletBait: linkedWallet.player?.daily_free_bait,
      linkedWalletXp: linkedWallet.player?.xp,
      rotatedGuestId: guestAfterLink.guest_id,
      duplicateResolveRejected: duplicateResolveFailure.status,
      clientAuthoredProgressRejected: true,
    },
    purchaseSmoke,
    cubePrize,
    cubeSkipped,
    monSummary: mon.summary,
    leaderboard: leaderboard.entry,
  }, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
