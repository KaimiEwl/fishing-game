export const PLAYER_PROGRESS_PROFILE_VERSION = 1;

const asArray = (value) => (Array.isArray(value) ? value : []);

const asObject = (value) => (value && typeof value === 'object' && !Array.isArray(value) ? value : {});

const asNumber = (value, fallback = 0) => {
  const next = Number(value);
  return Number.isFinite(next) ? next : fallback;
};

const asInteger = (value, fallback = 0) => Math.max(0, Math.floor(asNumber(value, fallback)));

const summarizeStack = (items, keyField) => {
  const normalizedItems = asArray(items)
    .map((item) => ({
      id: typeof item?.[keyField] === 'string' ? item[keyField] : null,
      quantity: asInteger(item?.quantity, 0),
      firstSeenAt: typeof item?.caughtAt === 'string'
        ? item.caughtAt
        : typeof item?.createdAt === 'string'
          ? item.createdAt
          : null,
    }))
    .filter((item) => item.id && item.quantity > 0);

  return {
    totalStacks: normalizedItems.length,
    totalQuantity: normalizedItems.reduce((sum, item) => sum + item.quantity, 0),
    items: normalizedItems,
  };
};

const summarizeTaskBucket = (entries, targets) => {
  const normalizedEntries = Object.entries(targets).map(([id, target]) => {
    const entry = asObject(entries)[id] || {};
    const progress = asInteger(entry.progress, 0);
    const claimed = Boolean(entry.claimed);
    return {
      id,
      progress,
      target: asInteger(target, 0),
      claimed,
      ready: !claimed && progress >= asInteger(target, 0),
    };
  });

  return {
    total: normalizedEntries.length,
    ready: normalizedEntries.filter((entry) => entry.ready).length,
    claimed: normalizedEntries.filter((entry) => entry.claimed).length,
    entries: normalizedEntries,
  };
};

const summarizeCollectionBook = (book) => {
  const collection = asObject(book);
  const species = Object.values(asObject(collection.species));
  const pages = asArray(collection.pages);

  return {
    totalSpeciesCaught: asInteger(collection.totalSpeciesCaught, species.filter((entry) => entry?.discovered).length),
    totalFirstCatchBonusesClaimed: asInteger(collection.totalFirstCatchBonusesClaimed, species.filter((entry) => entry?.firstCatchBonusClaimed).length),
    completedPages: pages.filter((page) => page?.completed).length,
    claimedPages: pages.filter((page) => page?.claimed).length,
    pages: pages.map((page) => ({
      pageId: typeof page?.pageId === 'string' ? page.pageId : null,
      completed: Boolean(page?.completed),
      claimed: Boolean(page?.claimed),
    })).filter((page) => page.pageId),
  };
};

const summarizeRodMastery = (rodMastery) => {
  const mastery = asObject(rodMastery);
  const tracks = Object.values(asObject(mastery.tracks));

  return {
    totalMasteryPoints: asInteger(mastery.totalMasteryPoints, 0),
    tracks: tracks.map((track) => ({
      rodLevel: asInteger(track?.rodLevel, 0),
      masteryLevel: asInteger(track?.masteryLevel, 0),
      masteryPoints: asInteger(track?.masteryPoints, 0),
      lastUpdatedAt: typeof track?.lastUpdatedAt === 'string' ? track.lastUpdatedAt : null,
    })),
  };
};

export function buildPlayerProgressProfile(player, options = {}) {
  const progress = asObject(options.progress);
  const dailyTaskTargets = asObject(options.dailyTaskTargets);
  const specialTaskTargets = asObject(options.specialTaskTargets);
  const weeklyMissionTargets = asObject(options.weeklyMissionTargets);
  const walletAddress = String(player?.wallet_address || '');

  return {
    version: PLAYER_PROGRESS_PROFILE_VERSION,
    storage: {
      primaryTable: 'players',
      primaryColumns: [
        'coins',
        'bait',
        'daily_free_bait',
        'level',
        'xp',
        'rod_level',
        'equipped_rod',
        'inventory',
        'cooked_dishes',
        'game_progress',
        'total_catches',
      ],
      sideTables: [
        'player_fishing_casts',
        'player_cube_rolls',
        'player_mon_rewards',
        'mon_withdraw_requests',
        'premium_fishing_sessions',
        'premium_fishing_casts',
        'social_task_verifications',
        'player_audit_logs',
        'guest_wallet_links',
      ],
    },
    identity: {
      playerId: player?.id ?? null,
      playerKey: walletAddress || null,
      kind: walletAddress.startsWith('guest:') ? 'guest' : 'wallet',
      nickname: player?.nickname ?? null,
    },
    economy: {
      coins: asInteger(player?.coins, 0),
      reserveBait: asInteger(player?.bait, 0),
      dailyFreeBait: asInteger(player?.daily_free_bait, 0),
      totalBait: asInteger(player?.bait, 0) + asInteger(player?.daily_free_bait, 0),
      dailyFreeBaitResetAt: player?.daily_free_bait_reset_at ?? null,
      bonusBaitGrantedTotal: asInteger(player?.bonus_bait_granted_total, 0),
    },
    progression: {
      level: asInteger(player?.level, 1),
      xp: asInteger(player?.xp, 0),
      xpToNext: asInteger(player?.xp_to_next, 100),
      totalCatches: asInteger(player?.total_catches, 0),
      loginStreak: asInteger(player?.login_streak, 1),
    },
    rods: {
      maxRodLevel: asInteger(player?.rod_level, 0),
      equippedRodLevel: asInteger(player?.equipped_rod, 0),
      nftRods: asArray(player?.nft_rods).map((rodLevel) => asInteger(rodLevel, 0)),
      rodMastery: summarizeRodMastery(progress.rodMastery),
    },
    inventory: summarizeStack(player?.inventory, 'fishId'),
    cooking: {
      ...summarizeStack(player?.cooked_dishes, 'recipeId'),
      grillScore: asInteger(progress.grillScore, 0),
      dishesToday: asInteger(progress.dishesToday, 0),
    },
    tasks: {
      date: typeof progress.date === 'string' ? progress.date : null,
      weekKey: typeof progress.weekKey === 'string' ? progress.weekKey : null,
      daily: summarizeTaskBucket(progress.tasks, dailyTaskTargets),
      special: summarizeTaskBucket(progress.specialTasks, specialTaskTargets),
      weekly: summarizeTaskBucket(progress.weeklyMissions, weeklyMissionTargets),
    },
    cube: {
      dailyWheelRolls: asInteger(progress.dailyWheelRolls, 0),
      paidWheelRolls: asInteger(progress.paidWheelRolls, 0),
      availableWheelRolls: asInteger(progress.dailyWheelRolls, 0) + asInteger(progress.paidWheelRolls, 0),
      wheelSpun: Boolean(progress.wheelSpun),
      wheelPrize: progress.wheelPrize ?? null,
      dailyRollRewardGranted: Boolean(progress.dailyRollRewardGranted),
      lastWeeklyCubeUnlockDate: progress.lastWeeklyCubeUnlockDate ?? null,
    },
    collectionBook: summarizeCollectionBook(progress.collectionBook),
    fishingNet: progress.fishingNet ?? null,
    premiumSession: progress.premiumSession ?? null,
    mon: options.monSummary ?? null,
    timestamps: {
      createdAt: player?.created_at ?? null,
      updatedAt: player?.updated_at ?? null,
      lastLogin: player?.last_login ?? null,
    },
    raw: {
      inventory: player?.inventory ?? [],
      cookedDishes: player?.cooked_dishes ?? [],
      gameProgress: progress,
    },
  };
}
