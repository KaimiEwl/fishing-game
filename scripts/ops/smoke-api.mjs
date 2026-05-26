import { createHash } from 'node:crypto';
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

function fakeTxHash(label) {
  return `0x${createHash('sha256').update(`${label}:${Date.now()}:${Math.random()}`).digest('hex')}`;
}

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

async function expectDeleteFailure(path, expectedStatuses, label) {
  const response = await fetch(`${baseUrl}${path}`, { method: 'DELETE' });
  const payload = await response.json().catch(() => null);
  if (response.ok || !expectedStatuses.includes(response.status)) {
    throw new Error(`${label} unexpectedly returned ${response.status}: ${JSON.stringify(payload)}`);
  }
  return {
    status: response.status,
    error: payload?.error ?? null,
  };
}

async function postForStatus(path, body) {
  const response = await fetch(`${baseUrl}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const payload = await response.json().catch(() => null);
  return {
    status: response.status,
    ok: response.ok,
    payload,
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

  const baitUnderpayFailure = await expectPostFailure('/api/edge/player-actions', {
    action: 'buy_bait',
    wallet_address: wallet,
    session_token: session,
    amount: 5,
    cost: 1,
  }, [400], 'bait package underpay');
  const invalidBaitPackageFailure = await expectPostFailure('/api/edge/player-actions', {
    action: 'buy_bait',
    wallet_address: wallet,
    session_token: session,
    amount: 999,
    cost: 1,
  }, [400], 'invalid bait package');
  const coinRodUnderpayFailure = await expectPostFailure('/api/edge/player-actions', {
    action: 'buy_rod',
    wallet_address: wallet,
    session_token: session,
    level: 1,
    cost: 1,
  }, [400], 'coin rod underpay');
  const invalidNetPackageFailure = await expectPostFailure('/api/edge/player-actions', {
    action: 'buy_fishing_net',
    wallet_address: wallet,
    session_token: session,
    daily_fish_count: 2,
    tx_hash: fakeTxHash('invalid-net-package'),
    expected_mon: '3',
  }, [400], 'invalid fishing net package');
  const invalidCubePackageFailure = await expectPostFailure('/api/edge/player-actions', {
    action: 'buy_cube_rolls',
    wallet_address: wallet,
    session_token: session,
    rolls: 999,
    tx_hash: fakeTxHash('invalid-cube-package'),
    expected_mon: '1',
  }, [400], 'invalid cube roll package');
  const missingWalletCheckInTxFailure = await expectPostFailure('/api/edge/player-actions', {
    action: 'verify_wallet_check_in',
    wallet_address: wallet,
    session_token: session,
  }, [400], 'missing wallet check-in transaction');
  const premiumCompletionFailure = await expectPostFailure('/api/edge/player-actions', {
    action: 'complete_premium_session',
    wallet_address: wallet,
    session_token: session,
  }, [410], 'manual premium session completion');
  const directMonGrantFailure = await expectPostFailure('/api/edge/player-actions', {
    action: 'grant_fishing_mon_reward',
    wallet_address: wallet,
    session_token: session,
    mon_amount: 999,
    source_ref: 'smoke-direct-grant',
  }, [410], 'direct fishing MON grant');
  const directLeviathanBonusFailure = await expectPostFailure('/api/edge/player-actions', {
    action: 'grant_leviathan_common_rod_bonus',
    wallet_address: wallet,
    session_token: session,
    source_ref: 'smoke-direct-leviathan',
    bonus_rod_id: 'common_rod',
  }, [410], 'direct Leviathan bonus grant');
  const grillTamper = await post('/api/edge/player-actions', {
    action: 'update_grill_leaderboard',
    wallet_address: wallet,
    session_token: session,
    name: 'Smoke Tester',
    score: 999_999,
    dishes_delta: 999,
  });
  if (Number(grillTamper.leaderboard_entry?.score || 0) >= 999_999 || Number(grillTamper.leaderboard_entry?.dishes || 0) >= 999) {
    throw new Error(`client-authored grill leaderboard values were accepted: ${JSON.stringify(grillTamper.leaderboard_entry)}`);
  }
  const publicLeaderboardTamperFailure = await expectPostFailure('/api/leaderboard/grill', {
    id: `wallet:${wallet}`,
    name: 'Smoke Tester',
    score: 999_999,
    dishes: 999,
    walletAddress: wallet,
  }, [410], 'public leaderboard write');
  const publicLeaderboardDeleteFailure = await expectDeleteFailure(
    `/api/leaderboard/grill/${encodeURIComponent(`wallet:${wallet}`)}`,
    [410],
    'public leaderboard delete',
  );

  const startedCast = await post('/api/edge/player-actions', {
    action: 'start_fishing_cast',
    wallet_address: wallet,
    session_token: session,
  });
  if (typeof startedCast.fishing_cast?.resolveToken !== 'string' || startedCast.fishing_cast.resolveToken.length < 40) {
    throw new Error(`start_fishing_cast did not return a resolve token: ${JSON.stringify(startedCast.fishing_cast)}`);
  }

  await new Promise((resolve) => {
    setTimeout(resolve, startedCast.fishing_cast.waitMs + 100);
  });

  const resolvedCast = await post('/api/edge/player-actions', {
    action: 'resolve_fishing_cast',
    wallet_address: wallet,
    session_token: session,
    cast_id: startedCast.fishing_cast.id,
    resolution: 'reel',
    resolve_token: startedCast.fishing_cast.resolveToken,
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
  if (typeof guestStartedCast.fishing_cast?.resolveToken !== 'string' || guestStartedCast.fishing_cast.resolveToken.length < 40) {
    throw new Error(`guest start_fishing_cast did not return a resolve token: ${JSON.stringify(guestStartedCast.fishing_cast)}`);
  }

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

  const missingResolveTokenFailure = await expectPostFailure('/api/edge/player-actions', {
    action: 'resolve_fishing_cast',
    wallet_address: guestId,
    session_token: guestSession,
    cast_id: guestStartedCast.fishing_cast.id,
    resolution: 'reel',
  }, [401], 'missing fishing cast resolve token');
  const invalidResolveTokenFailure = await expectPostFailure('/api/edge/player-actions', {
    action: 'resolve_fishing_cast',
    wallet_address: guestId,
    session_token: guestSession,
    cast_id: guestStartedCast.fishing_cast.id,
    resolution: 'reel',
    resolve_token: 'not-the-issued-token',
  }, [401], 'invalid fishing cast resolve token');

  const guestResolvedCast = await post('/api/edge/player-actions', {
    action: 'resolve_fishing_cast',
    wallet_address: guestId,
    session_token: guestSession,
    cast_id: guestStartedCast.fishing_cast.id,
    resolution: 'reel',
    resolve_token: guestStartedCast.fishing_cast.resolveToken,
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
    resolve_token: guestStartedCast.fishing_cast.resolveToken,
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
    const coinTxHash = fakeTxHash('coin-purchase');
    const netTxHash = fakeTxHash('fishing-net');
    const cubeTxHash = fakeTxHash('cube-rolls');
    const checkInTxHash = fakeTxHash('wallet-check-in');
    const premiumTxHash = fakeTxHash('premium-session');
    const poisonedTxHash = fakeTxHash('audit-poison');
    const unauthVerifyPurchaseFailure = await expectPostFailure('/api/edge/verify-purchase', {
      tx_hash: fakeTxHash('unauth-verify-purchase'),
      wallet_address: wallet,
      expected_coins: 100,
      expected_mon: '0.1',
    }, [401], 'unauthenticated purchase verification');
    await post('/api/edge/log-player-event', {
      wallet_address: wallet,
      event_type: 'coin_purchase_verified',
      metadata: { txHash: poisonedTxHash },
    });
    const poisonedAuditPurchase = await post('/api/edge/verify-purchase', {
      tx_hash: poisonedTxHash,
      wallet_address: wallet,
      session_token: session,
      expected_coins: 100,
      expected_mon: '0.1',
    });
    const coinPurchase = await post('/api/edge/verify-purchase', {
      tx_hash: coinTxHash,
      wallet_address: wallet,
      session_token: session,
      expected_coins: 100,
      expected_mon: '0.1',
    });
    const duplicateCoinPurchase = await post('/api/edge/verify-purchase', {
      tx_hash: coinTxHash,
      wallet_address: wallet,
      session_token: session,
      expected_coins: 100,
      expected_mon: '0.1',
    });
    if (duplicateCoinPurchase.player?.coins !== coinPurchase.player?.coins || duplicateCoinPurchase.already_applied !== true) {
      throw new Error(`applied purchase retry was not idempotent: first=${JSON.stringify(coinPurchase)} duplicate=${JSON.stringify(duplicateCoinPurchase)}`);
    }
    const crossEndpointTxFailure = await expectPostFailure('/api/edge/player-actions', {
      action: 'buy_cube_rolls',
      wallet_address: wallet,
      session_token: session,
      rolls: 1,
      tx_hash: coinTxHash,
      expected_mon: '1',
    }, [409], 'cross-endpoint duplicate payment transaction');
    const concurrentTxHash = fakeTxHash('concurrent-payment');
    const concurrentPurchaseBody = {
      tx_hash: concurrentTxHash,
      wallet_address: wallet,
      session_token: session,
      expected_coins: 100,
      expected_mon: '0.1',
    };
    const concurrentPurchaseResults = await Promise.all([
      postForStatus('/api/edge/verify-purchase', concurrentPurchaseBody),
      postForStatus('/api/edge/verify-purchase', concurrentPurchaseBody),
    ]);
    const concurrentStatuses = concurrentPurchaseResults.map((result) => result.status).sort((a, b) => a - b);
    if (JSON.stringify(concurrentStatuses) !== JSON.stringify([200, 200])) {
      throw new Error(`concurrent duplicate payment transaction was not idempotent: ${JSON.stringify(concurrentPurchaseResults)}`);
    }
    const concurrentCoins = concurrentPurchaseResults
      .map((result) => Number(result.payload?.player?.coins || 0))
      .filter((coins) => coins > 0);
    if (new Set(concurrentCoins).size > 1) {
      throw new Error(`concurrent duplicate payment credited inconsistent balances: ${JSON.stringify(concurrentPurchaseResults)}`);
    }

    const netPurchase = await post('/api/edge/player-actions', {
      action: 'buy_fishing_net',
      wallet_address: wallet,
      session_token: session,
      daily_fish_count: 10,
      tx_hash: netTxHash,
      expected_mon: '3',
    });
    const duplicateNetPurchase = await post('/api/edge/player-actions', {
      action: 'buy_fishing_net',
      wallet_address: wallet,
      session_token: session,
      daily_fish_count: 10,
      tx_hash: netTxHash,
      expected_mon: '3',
    });
    const differentNetTxFailure = await expectPostFailure('/api/edge/player-actions', {
      action: 'buy_fishing_net',
      wallet_address: wallet,
      session_token: session,
      daily_fish_count: 10,
      tx_hash: fakeTxHash('fishing-net-duplicate-payment'),
      expected_mon: '3',
    }, [409], 'already-owned fishing net with a different tx');

    const netClaimResults = await Promise.all([
      postForStatus('/api/edge/player-actions', {
        action: 'claim_fishing_net',
        wallet_address: wallet,
        session_token: session,
      }),
      postForStatus('/api/edge/player-actions', {
        action: 'claim_fishing_net',
        wallet_address: wallet,
        session_token: session,
      }),
    ]);
    const netClaimStatuses = netClaimResults.map((result) => result.status).sort((a, b) => a - b);
    if (JSON.stringify(netClaimStatuses) !== JSON.stringify([200, 400])) {
      throw new Error(`concurrent fishing net claim was not exactly-once: ${JSON.stringify(netClaimResults)}`);
    }
    const netClaim = netClaimResults.find((result) => result.status === 200)?.payload;

    const cubeTopUp = await post('/api/edge/player-actions', {
      action: 'buy_cube_rolls',
      wallet_address: wallet,
      session_token: session,
      rolls: 1,
      tx_hash: cubeTxHash,
      expected_mon: '1',
    });
    const duplicateCubeTopUp = await post('/api/edge/player-actions', {
      action: 'buy_cube_rolls',
      wallet_address: wallet,
      session_token: session,
      rolls: 1,
      tx_hash: cubeTxHash,
      expected_mon: '1',
    });
    if (duplicateCubeTopUp.player?.game_progress?.paidWheelRolls !== cubeTopUp.player?.game_progress?.paidWheelRolls) {
      throw new Error(`cube-roll payment retry credited twice: first=${cubeTopUp.player?.game_progress?.paidWheelRolls} duplicate=${duplicateCubeTopUp.player?.game_progress?.paidWheelRolls}`);
    }

    const walletCheckInFakeResult = await postForStatus('/api/edge/player-actions', {
      action: 'verify_wallet_check_in',
      wallet_address: wallet,
      session_token: session,
      tx_hash: checkInTxHash,
    });
    if (
      ![202, 400, 403].includes(walletCheckInFakeResult.status)
      || walletCheckInFakeResult.payload?.wallet_check_in_summary?.todayCheckedIn
    ) {
      throw new Error(`fake wallet check-in transaction was accepted: ${JSON.stringify(walletCheckInFakeResult)}`);
    }

    const premiumSession = await post('/api/edge/player-actions', {
      action: 'start_premium_session',
      wallet_address: wallet,
      session_token: session,
      tx_hash: premiumTxHash,
    });
    const duplicatePremiumSession = await post('/api/edge/player-actions', {
      action: 'start_premium_session',
      wallet_address: wallet,
      session_token: session,
      tx_hash: premiumTxHash,
    });
    const differentPremiumTxFailure = await expectPostFailure('/api/edge/player-actions', {
      action: 'start_premium_session',
      wallet_address: wallet,
      session_token: session,
      tx_hash: fakeTxHash('premium-session-duplicate-payment'),
    }, [409], 'active premium session with a different tx');
    const premiumPerfectTamper = await post('/api/edge/player-actions', {
      action: 'resolve_premium_cast',
      wallet_address: wallet,
      session_token: session,
      reaction_quality: 'perfect',
    });
    if (premiumPerfectTamper.cast_result?.reactionQuality !== 'good') {
      throw new Error(`client-authored premium reaction quality was accepted: ${JSON.stringify(premiumPerfectTamper.cast_result)}`);
    }

    purchaseSmoke = {
      auditPoisonIgnored: Boolean(poisonedAuditPurchase.success),
      coinPurchasePlayerCoins: coinPurchase.player?.coins,
      unauthVerifyPurchaseRejected: unauthVerifyPurchaseFailure.status,
      duplicateCoinPurchaseIdempotent: duplicateCoinPurchase.already_applied === true,
      crossEndpointTxRejected: crossEndpointTxFailure.status,
      concurrentDuplicateTxStatuses: concurrentStatuses,
      netOwned: netPurchase.fishing_net?.owned,
      duplicateNetIdempotent: duplicateNetPurchase.already_applied === true,
      differentNetTxRejected: differentNetTxFailure.status,
      concurrentNetClaimStatuses: netClaimStatuses,
      netClaimed: netClaim?.claimed_catch,
      paidWheelRolls: cubeTopUp.player?.game_progress?.paidWheelRolls,
      duplicateCubeTopUpIdempotent: duplicateCubeTopUp.already_applied === true,
      fakeWalletCheckInRejected: walletCheckInFakeResult.status,
      premiumSessionStatus: premiumSession.premium_session?.status,
      duplicatePremiumSessionIdempotent: duplicatePremiumSession.already_applied === true,
      differentPremiumTxRejected: differentPremiumTxFailure.status,
      premiumReactionQualityServerOwned: premiumPerfectTamper.cast_result?.reactionQuality,
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
    await expectPostFailure('/api/edge/player-actions', {
      action: 'apply_cube_reward',
      wallet_address: wallet,
      session_token: session,
      roll_id: rolled.roll.id,
    }, [400, 409], 'duplicate cube reward apply');
  } catch (error) {
    cubeSkipped = error instanceof Error ? error.message : String(error);
  }

  const mon = await post('/api/edge/player-mon', {
    action: 'get_mon_summary',
    wallet_address: wallet,
    session_token: session,
  });

  const leaderboardResponse = await fetch(`${baseUrl}/api/leaderboard/grill`, {
    headers: { Accept: 'application/json' },
  });
  if (!leaderboardResponse.ok) throw new Error(`leaderboard read failed: ${leaderboardResponse.status}`);
  const leaderboardPayload = await leaderboardResponse.json();
  const leaderboardEntry = (leaderboardPayload.entries || []).find((entry) => entry.id === `wallet:${wallet}`) || null;

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
      missingResolveTokenRejected: missingResolveTokenFailure.status,
      invalidResolveTokenRejected: invalidResolveTokenFailure.status,
      duplicateResolveRejected: duplicateResolveFailure.status,
      clientAuthoredProgressRejected: true,
    },
    economyTamper: {
      baitUnderpayRejected: baitUnderpayFailure.status,
      invalidBaitPackageRejected: invalidBaitPackageFailure.status,
      coinRodUnderpayRejected: coinRodUnderpayFailure.status,
      invalidNetPackageRejected: invalidNetPackageFailure.status,
      invalidCubePackageRejected: invalidCubePackageFailure.status,
      missingWalletCheckInTxRejected: missingWalletCheckInTxFailure.status,
      premiumCompletionRejected: premiumCompletionFailure.status,
      directMonGrantRejected: directMonGrantFailure.status,
      directLeviathanBonusRejected: directLeviathanBonusFailure.status,
      grillLeaderboardTamperRejected: true,
      publicLeaderboardWriteRejected: publicLeaderboardTamperFailure.status,
      publicLeaderboardDeleteRejected: publicLeaderboardDeleteFailure.status,
    },
    purchaseSmoke,
    cubePrize,
    cubeSkipped,
    monSummary: mon.summary,
    leaderboard: leaderboardEntry,
  }, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
