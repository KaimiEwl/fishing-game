export const GAME_ECONOMY_VERSION = '2026-05-26-tightened-rewards-v1';

export const STARTING_COINS = 100;
export const DAILY_FREE_BAIT = 15;
export const WALLET_CONNECT_BAIT_BONUS = 0;
export const REFERRAL_BAIT_BONUS = 5;
export const MAX_REWARDED_REFERRALS = 10;
export const MAX_EXTRA_BAIT_FROM_DAILIES_PER_DAY = 0;
export const TARGET_PAID_BAIT_RTP = 0.32;

export const XP_PER_LEVEL = 100;
export const LEVEL_UP_COIN_REWARD_PER_LEVEL = 50;
export const CATCH_CHANCE = 60;
export const MISS_XP_REWARD = 3;
export const CATCH_XP_FLAT_BONUS = 3;
export const BAIT_COST = 80;

export const BAIT_PACKAGES = [
  { amount: 5, cost: 400, label: 'Small bait pack' },
  { amount: 10, cost: 800, label: 'Double bait pack' },
  { amount: 25, cost: 2000, label: 'Big bait pack' },
  { amount: 50, cost: 4000, label: 'Bulk bait box' },
];

export const MON_MARKET_RECEIVER_ADDRESS = '0x0266Bd01196B04a7A57372Fc9fB2F34374E6327D';
export const WALLET_CHECK_IN_COST_MON = '0.0001';
export const MON_HOLD_DAYS = 7;
export const MIN_WITHDRAW_MON = 1;

export const MON_COIN_PACKAGES = [
  { id: 'coins-10', coins: 10, monAmount: '0.01', premium: false },
  { id: 'coins-50', coins: 50, monAmount: '0.05', premium: false },
  { id: 'coins-100', coins: 100, monAmount: '0.1', premium: false },
  { id: 'coins-500', coins: 500, monAmount: '0.5', premium: false },
  { id: 'coins-1000', coins: 1000, monAmount: '1', premium: true },
];

export const MON_FISHING_NET_PACKAGES = [
  {
    fishCount: 10,
    monAmount: '3',
    label: 'Scout Net',
    positioning: 'Starter passive net for a light daily catch drip.',
  },
  {
    fishCount: 25,
    monAmount: '30',
    label: 'Harbor Net',
    positioning: 'Mid-tier upgrade for players who want a real passive stack each day.',
  },
  {
    fishCount: 50,
    monAmount: '60',
    label: 'Fleet Net',
    positioning: 'Heavy passive collector tuned for large daily inventory pulls.',
  },
];

export const FISHING_NET_PRICE_COINS = 6000;
export const FISHING_NET_DAILY_FISH_COUNT = MON_FISHING_NET_PACKAGES[0].fishCount;
export const FISHING_NET_PAYBACK_DAYS_ESTIMATE = 14;

export const MON_CUBE_SPIN_PACKAGES = [
  {
    rolls: 1,
    monAmount: '1',
    label: '1 cube roll',
    positioning: 'Single premium roll when you only want one extra shot.',
  },
  {
    rolls: 3,
    monAmount: '3',
    label: '3 cube rolls',
    positioning: 'Short premium bundle for a focused cube session.',
  },
  {
    rolls: 5,
    monAmount: '5',
    label: '5 cube rolls',
    positioning: 'Heavy top-up when you want a bigger cube push right now.',
  },
];

export const FISH_ECONOMY = {
  carp: { chance: 45.14, price: 4, xp: 5 },
  perch: { chance: 28, price: 8, xp: 10 },
  bream: { chance: 15, price: 18, xp: 18 },
  catfish: { chance: 8, price: 38, xp: 25 },
  goldfish: { chance: 3, price: 100, xp: 50 },
  mutant: { chance: 0.8, price: 400, xp: 100 },
  pike: { chance: 0.05, price: 5000, xp: 500 },
  leviathan: { chance: 0.01, price: 25000, xp: 5000 },
};

export const FISH_DATA = [
  { id: 'carp', name: 'Carp', rarity: 'common', ...FISH_ECONOMY.carp },
  { id: 'perch', name: 'Perch', rarity: 'uncommon', ...FISH_ECONOMY.perch },
  { id: 'bream', name: 'Bream', rarity: 'rare', ...FISH_ECONOMY.bream },
  { id: 'catfish', name: 'Catfish', rarity: 'epic', ...FISH_ECONOMY.catfish },
  { id: 'goldfish', name: 'Goldfish', rarity: 'legendary', ...FISH_ECONOMY.goldfish },
  { id: 'mutant', name: 'Mutant Fish', rarity: 'mythical', ...FISH_ECONOMY.mutant },
  { id: 'pike', name: 'Purple Fish', rarity: 'secret', ...FISH_ECONOMY.pike },
  { id: 'leviathan', name: 'Cosmic Leviathan', rarity: 'mythical', ...FISH_ECONOMY.leviathan },
];

export const ROD_ECONOMY = {
  common_rod: {
    id: 'common_rod',
    level: 0,
    name: 'Common Rod',
    rarity: 'common',
    bonus: 0,
    monadDropChance: 0,
    monadMinReward: 0,
    monadMaxReward: 0,
    cubeDropWeight: 0,
  },
  rare_rod: {
    id: 'rare_rod',
    level: 1,
    name: 'Rare Rod',
    rarity: 'rare',
    bonus: 8,
    coinCost: 1500,
    monadDropChance: 25,
    monadMinReward: 0.0015,
    monadMaxReward: 0.004,
    cubeDropWeight: 82,
  },
  epic_rod: {
    id: 'epic_rod',
    level: 2,
    name: 'Epic Rod',
    rarity: 'epic',
    bonus: 16,
    coinCost: 6000,
    monadDropChance: 30,
    monadMinReward: 0.0025,
    monadMaxReward: 0.006,
    cubeDropWeight: 16,
  },
  legendary_rod: {
    id: 'legendary_rod',
    level: 3,
    name: 'Legendary Rod',
    rarity: 'legendary',
    bonus: 28,
    monUnlockCost: '25',
    monadDropChance: 35,
    monadMinReward: 0.004,
    monadMaxReward: 0.009,
    cubeDropWeight: 2,
  },
  legacy_gold_rod: {
    id: 'legacy_gold_rod',
    level: 4,
    name: 'Legacy Gold Rod',
    rarity: 'legendary',
    bonus: 25,
    monadDropChance: 0,
    monadMinReward: 0,
    monadMaxReward: 0,
    cubeDropWeight: 0,
  },
};

export const ROD_DATA = Object.values(ROD_ECONOMY).sort((a, b) => a.level - b.level);

export const ROD_CUBE_DROP_CONFIG = {
  cubeRodDropEnabled: true,
  tileCount: 1,
  tileInjectionChance: 0.2,
  targetWinChance: 0.0001,
  minLevel: 1,
  maxLevel: 3,
  cubeRodRewards: [
    { rodId: 'rare_rod', dropWeight: 82, duplicateCompensationMonads: 0.25 },
    { rodId: 'epic_rod', dropWeight: 16, duplicateCompensationMonads: 1 },
    { rodId: 'legendary_rod', dropWeight: 2, duplicateCompensationMonads: 2.5 },
  ],
};

export const LEVIATHAN_COMMON_ROD_BONUS_CONFIG = {
  fishId: 'leviathan',
  requiredRodId: 'common_rod',
  bonusRodId: 'rare_rod',
  duplicateCompensationMon: 0.25,
};

export const NFT_ROD_DATA = [
  { rodLevel: 0, name: 'Driftline MON Rod', rarityBonus: 6, xpBonus: 15, sellBonus: 5, mintCost: '1' },
  { rodLevel: 1, name: 'Tidebloom MON Rod', rarityBonus: 12, xpBonus: 30, sellBonus: 15, mintCost: '3' },
  { rodLevel: 2, name: 'Deepcurrent MON Rod', rarityBonus: 18, xpBonus: 45, sellBonus: 25, mintCost: '5' },
  { rodLevel: 3, name: 'Stormforge MON Rod', rarityBonus: 24, xpBonus: 60, sellBonus: 35, mintCost: '10' },
  { rodLevel: 4, name: 'Leviathan Crown MON Rod', rarityBonus: 32, xpBonus: 80, sellBonus: 50, mintCost: '25' },
];

export const NFT_ROD_BONUSES = Object.fromEntries(
  NFT_ROD_DATA.map((rod) => [
    rod.rodLevel,
    { rarityBonus: rod.rarityBonus, xpBonus: rod.xpBonus, sellBonus: rod.sellBonus },
  ]),
);

export const ALBUM_FIRST_CATCH_BONUSES = {
  carp: 13,
  perch: 25,
  bream: 50,
  catfish: 100,
  goldfish: 250,
  mutant: 750,
  pike: 2500,
  leviathan: 5000,
};

export const COLLECTION_BOOK_PAGES = [
  { id: 'lake_basics', fishIds: ['carp', 'perch', 'bream'] },
  { id: 'deepwater_odds', fishIds: ['catfish', 'goldfish', 'mutant'] },
  { id: 'trophy_legends', fishIds: ['pike', 'leviathan'] },
];

export const WHEEL_PRIZES = [
  { id: 'coin_30', type: 'coins', label: '30 coins', coins: 30 },
  { id: 'coin_60', type: 'coins', label: '60 coins', coins: 60 },
  { id: 'coin_100', type: 'coins', label: '100 coins', coins: 100 },
  { id: 'coin_175', type: 'coins', label: '175 coins', coins: 175 },
  { id: 'coin_275', type: 'coins', label: '275 coins', coins: 275 },
  { id: 'coin_450', type: 'coins', label: '450 coins', coins: 450 },
  { id: 'coin_750', type: 'coins', label: '750 coins', coins: 750 },
  { id: 'coin_1100', type: 'coins', label: '1,100 coins', coins: 1100 },
  { id: 'bait_2', type: 'bait', label: '2 bait', bait: 2 },
  { id: 'bait_3', type: 'bait', label: '3 bait', bait: 3 },
  { id: 'bait_4', type: 'bait', label: '4 bait', bait: 4 },
  { id: 'bait_6', type: 'bait', label: '6 bait', bait: 6 },
  { id: 'bait_9', type: 'bait', label: '9 bait', bait: 9 },
  { id: 'secret_mon_0_5', type: 'mon', label: '0.5 MON', mon: 0.5, secret: true },
];

export const DAILY_TASK_TARGETS = {
  check_in: 1,
  catch_10: 10,
  rare_1: 1,
  grill_1: 1,
  spend_1000: 1000,
};

export const SPECIAL_TASK_TARGETS = {
  wallet_check_in: 1,
  invite_friend: 1,
};

export const DAILY_TASK_REWARDS = {
  check_in: { coins: 50 },
  catch_10: { coins: 50 },
  rare_1: { coins: 50 },
  grill_1: { coins: 50 },
  spend_1000: { bait: 5 },
};

export const SPECIAL_TASK_REWARDS = {
  wallet_check_in: { bait: 5 },
  invite_friend: { bait: 5 },
};

export const WEEKLY_MISSION_CONFIG = [
  { id: 'catch_60_fish', title: 'Catch 60 fish', description: 'Keep returning through the week and land 60 fish total.', target: 60, rewardCoins: 150 },
  { id: 'catch_6_rare', title: 'Catch 6 rare+ fish', description: 'Catch 6 rare, epic, legendary, mythical, or secret fish this week.', target: 6, rewardCoins: 125 },
  { id: 'cook_5_dishes', title: 'Cook 5 dishes', description: 'Turn your catches into 5 grill dishes this week.', target: 5, rewardBait: 5 },
  { id: 'sell_3_dishes', title: 'Sell 3 dishes', description: 'Sell 3 cooked dishes from your inventory this week.', target: 3, rewardBait: 5 },
  { id: 'cube_3_days', title: 'Unlock cube on 3 days', description: 'Unlock the daily cube on 3 different days this week.', target: 3, rewardCubeCharge: 1 },
  { id: 'complete_1_premium_session', title: 'Complete 1 premium session', description: 'Finish one MON Expedition from start to finish.', target: 1, rewardCoins: 125 },
];

export const WEEKLY_MISSION_TARGETS = Object.fromEntries(
  WEEKLY_MISSION_CONFIG.map((mission) => [mission.id, mission.target]),
);

export const WEEKLY_MISSION_REWARDS = Object.fromEntries(
  WEEKLY_MISSION_CONFIG.map((mission) => [
    mission.id,
    {
      ...(mission.rewardCoins ? { coins: mission.rewardCoins } : {}),
      ...(mission.rewardBait ? { bait: mission.rewardBait } : {}),
      ...(mission.rewardCubeCharge ? { cubeCharge: mission.rewardCubeCharge } : {}),
    },
  ]),
);

export const TASK_REWARDS = {
  ...DAILY_TASK_REWARDS,
  ...SPECIAL_TASK_REWARDS,
  ...WEEKLY_MISSION_REWARDS,
};

export const DAILY_CLAIMS_FOR_CUBE = 3;
export const DAILY_CUBE_ROLL_REWARD = 2;

export const SOCIAL_TASKS = ['twitter_follow', 'twitter_repost', 'twitter_like', 'discord_join', 'telegram_join'];

export const GRILL_RECIPES = {
  lake_skewer: { ingredients: { carp: 2 }, score: 13 },
  crispy_perch_plate: { ingredients: { perch: 2, carp: 1 }, score: 33 },
  rare_bream_steak: { ingredients: { bream: 1, perch: 1 }, score: 75 },
  deepwater_platter: { ingredients: { catfish: 2, bream: 1 }, score: 210 },
  cosmic_grill: { ingredients: { goldfish: 1, mutant: 1 }, score: 600 },
};

export const PREMIUM_SESSION_COST_MON = '3';
export const PREMIUM_SESSION_CASTS = 20;
export const PREMIUM_SESSION_CONSUMES_BAIT = false;
export const PREMIUM_SESSION_BONUS_COINS_PER_CAST = 15;
export const PREMIUM_SESSION_BONUS_XP_PER_CAST = 5;
export const PREMIUM_SESSION_ALBUM_POINTS_PER_CAST = 1;
export const PREMIUM_SESSION_ROD_MASTERY_POINTS_PER_CAST = 1;
export const PREMIUM_FISH_IDS = ['carp', 'perch', 'bream', 'catfish', 'goldfish', 'mutant'];

export const PREMIUM_MON_DROP_TABLE = [
  { id: 'zero', chance: 0.758, monAmount: 0 },
  { id: 'small', chance: 0.15, monAmount: 0.035 },
  { id: 'medium', chance: 0.065, monAmount: 0.1 },
  { id: 'big', chance: 0.02, monAmount: 0.325 },
  { id: 'spike', chance: 0.006, monAmount: 1.125 },
  { id: 'jackpot', chance: 0.001, monAmount: 3 },
];

export const PREMIUM_LUCK_METER_CONFIG = {
  maxStacks: 12,
  perZeroStackBonus: {
    small: 0.002,
    medium: 0.0012,
    big: 0.0005,
    spike: 0.00015,
    jackpot: 0.00002,
  },
};

export const PREMIUM_PITY_CONFIG = {
  guaranteedMediumAtZeroStreak: 34,
  guaranteedBigAtZeroStreak: 48,
};

export const PREMIUM_RESCUE_CONFIG = {
  enabled: true,
  triggerAfterLowRecoverySessions: 2,
  lowRecoveryThresholdMon: 0.4,
  maxExpectedWeeklyMon: 0.6,
  maxRescueTriggersPerWeek: 2,
  eligibleRewards: [0.09, 0.175, 0.325],
};

export const PREMIUM_FISH_WEIGHT_MODIFIERS = {
  common: 0.78,
  uncommon: 1.05,
  rare: 1.18,
  epic: 1.28,
  legendary: 1.42,
  mythical: 1.58,
  secret: 1.9,
};

export const WEEKLY_GRILL_PAYOUT_CONFIG = {
  totalMonBudget: 5,
  payouts: [
    { rank: 1, monAmount: 1.25 },
    { rank: 2, monAmount: 0.875 },
    { rank: 3, monAmount: 0.625 },
    { rank: 4, monAmount: 0.5 },
    { rank: 5, monAmount: 0.375 },
    { rank: 6, monAmount: 0.25 },
    { rank: 7, monAmount: 0.25 },
    { rank: 8, monAmount: 0.25 },
    { rank: 9, monAmount: 0.25 },
    { rank: 10, monAmount: 0.25 },
  ],
};

export const CUBE_REBALANCE_CONFIG = {
  targetCoinEvPerRoll: 130,
  fishTileRatio: 0.46,
  monTileCount: 1,
  monPrizeAmount: 0.5,
  preferredRewardMix: ['fish', 'coins', 'bait', 'rod', 'mon', 'album'],
};
