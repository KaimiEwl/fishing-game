import { useState, useCallback, useEffect, useRef } from 'react';
import { 
  PlayerState, 
  GameState, 
  GameResult, 
  Fish,
  FISH_DATA, 
  CATCH_CHANCE,
  GRILL_RECIPES,
  ROD_BONUSES,
  XP_PER_LEVEL,
  NFT_ROD_DATA,
  type GrillRecipe,
} from '@/types/game';
import {
  BAIT_BUCKETS_V2_ENABLED,
  ALBUM_FIRST_CATCH_BONUSES,
  COLLECTION_BOOK_ENABLED,
  DAILY_FREE_BAIT,
  LEGACY_DAILY_BONUS_DISABLED,
} from '@/lib/baitEconomy';
import { recordCollectionCatch } from '@/lib/collectionBook';
import {
  applyServerBonusBaitSync,
  loadStoredPlayer,
  mergeSyncedPlayerState,
  normalizePlayerDailyFreeBait,
  storePlayerLocally,
} from '@/lib/playerStorage';
import {
  type PlayerAuditEventPayload,
  toPlayerAuditSnapshot,
} from '@/lib/playerAudit';

const INITIAL_PLAYER_STATE: PlayerState = {
  coins: 100,
  bait: 0,
  dailyFreeBait: BAIT_BUCKETS_V2_ENABLED ? DAILY_FREE_BAIT : 0,
  dailyFreeBaitResetAt: BAIT_BUCKETS_V2_ENABLED ? new Date(Date.UTC(new Date().getUTCFullYear(), new Date().getUTCMonth(), new Date().getUTCDate())).toISOString() : null,
  bonusBaitGrantedTotal: 0,
  level: 1,
  xp: 0,
  xpToNextLevel: XP_PER_LEVEL,
  rodLevel: 0,
  equippedRod: 0,
  inventory: [],
  cookedDishes: [],
  totalCatches: 0,
  dailyBonusClaimed: false,
  loginStreak: 1,
  nftRods: [],
  nickname: null,
  avatarUrl: null,
  collectionBook: null,
  rodMastery: null,
};

const MIN_CAST_INTERVAL = 4000; // minimum 4s between casts
const BITE_WINDOW_MIN = 1500; // ms
const BITE_WINDOW_MAX = 2500; // ms

const mergePlayerState = (base: PlayerState, local: PlayerState): PlayerState =>
  mergeSyncedPlayerState(base, local);

const resolveInitialPlayer = (savedPlayer?: PlayerState | null) => {
  const normalizedSavedPlayer = savedPlayer
    ? normalizePlayerDailyFreeBait(savedPlayer, BAIT_BUCKETS_V2_ENABLED, DAILY_FREE_BAIT)
    : null;
  const localPlayer = loadStoredPlayer(INITIAL_PLAYER_STATE);
  const normalizedLocalPlayer = localPlayer
    ? applyServerBonusBaitSync(
        normalizePlayerDailyFreeBait(localPlayer, BAIT_BUCKETS_V2_ENABLED, DAILY_FREE_BAIT),
        normalizedSavedPlayer?.bonusBaitGrantedTotal ?? localPlayer.bonusBaitGrantedTotal,
      )
    : null;

  if (normalizedSavedPlayer && normalizedLocalPlayer) {
    return mergePlayerState(normalizedSavedPlayer, normalizedLocalPlayer);
  }

  return normalizedSavedPlayer || normalizedLocalPlayer || normalizePlayerDailyFreeBait(INITIAL_PLAYER_STATE, BAIT_BUCKETS_V2_ENABLED, DAILY_FREE_BAIT);
};

interface UseGameStateOptions {
  savedPlayer?: PlayerState | null;
  onSave?: (player: PlayerState) => void;
  onFishCaught?: (fish: Fish) => void;
  onAuditEvent?: (event: PlayerAuditEventPayload) => void;
  onPremiumBiteTimeout?: () => void;
  collectionBookEnabled?: boolean;
}

interface AlbumRewardInfo {
  fishId: string;
  fishName: string;
  bonusCoins: number;
  totalSpeciesCaught: number;
  pageCompletedIds: string[];
}

export function useGameState(options?: UseGameStateOptions) {
  const savedPlayer = options?.savedPlayer;
  const onSave = options?.onSave;
  const onFishCaught = options?.onFishCaught;
  const onAuditEvent = options?.onAuditEvent;
  const onPremiumBiteTimeout = options?.onPremiumBiteTimeout;
  const collectionBookEnabled = options?.collectionBookEnabled ?? COLLECTION_BOOK_ENABLED;
  const [player, setPlayer] = useState<PlayerState>(
    resolveInitialPlayer(savedPlayer)
  );
  const [gameState, setGameState] = useState<GameState>('idle');
  const [lastResult, setLastResult] = useState<GameResult | null>(null);
  const [levelUpInfo, setLevelUpInfo] = useState<{ newLevel: number; coinsReward: number } | null>(null);
  const [albumRewardInfo, setAlbumRewardInfo] = useState<AlbumRewardInfo | null>(null);
  const [biteTimeLeft, setBiteTimeLeft] = useState<number>(0);
  const [biteTimeTotal, setBiteTimeTotal] = useState<number>(0);
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const initializedRef = useRef(false);
  const lastCastTimeRef = useRef<number>(0);
  const pendingFishRef = useRef<Fish | null>(null);
  const biteTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const biteCountdownRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const gameStateRef = useRef<GameState>('idle');
  const pendingAuditEventsRef = useRef<PlayerAuditEventPayload[]>([]);
  const premiumCastActiveRef = useRef(false);

  // Keep ref in sync
  useEffect(() => {
    gameStateRef.current = gameState;
  }, [gameState]);

  useEffect(() => {
    if (!onAuditEvent || pendingAuditEventsRef.current.length === 0) return;

    const events = pendingAuditEventsRef.current.splice(0, pendingAuditEventsRef.current.length);
    events.forEach((event) => onAuditEvent(event));
  }, [player, onAuditEvent]);

  // Load saved player when it becomes available
  useEffect(() => {
    if (savedPlayer) {
      const normalizedSavedPlayer = normalizePlayerDailyFreeBait(savedPlayer, BAIT_BUCKETS_V2_ENABLED, DAILY_FREE_BAIT);
      setPlayer((prev) => mergePlayerState(
        normalizedSavedPlayer,
        applyServerBonusBaitSync(
          normalizePlayerDailyFreeBait(prev, BAIT_BUCKETS_V2_ENABLED, DAILY_FREE_BAIT),
          normalizedSavedPlayer.bonusBaitGrantedTotal,
        ),
      ));
    }
  }, [savedPlayer]);

  const syncDailyFreeBait = useCallback(() => {
    if (!BAIT_BUCKETS_V2_ENABLED) return;

    setPlayer((prev) => {
      const next = normalizePlayerDailyFreeBait(prev, true, DAILY_FREE_BAIT);
      if (
        next.dailyFreeBait === prev.dailyFreeBait
        && next.dailyFreeBaitResetAt === prev.dailyFreeBaitResetAt
      ) {
        return prev;
      }
      return next;
    });
  }, []);

  useEffect(() => {
    if (initializedRef.current) return;
    initializedRef.current = true;
  }, []);

  useEffect(() => {
    syncDailyFreeBait();

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        syncDailyFreeBait();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [syncDailyFreeBait]);

  // Debounced save
  useEffect(() => {
    if (!initializedRef.current) return;

    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(() => {
      storePlayerLocally(player);
      if (onSave) {
        onSave(player);
      }
    }, 3000);

    return () => {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    };
  }, [onSave, player]);

  const getNftBonus = useCallback((rodLevel: number, nftRods: number[]) => {
    if (!nftRods.includes(rodLevel)) return { rarityBonus: 0, xpBonus: 0, sellBonus: 0 };
    const nft = NFT_ROD_DATA.find(n => n.rodLevel === rodLevel);
    return nft ? { rarityBonus: nft.rarityBonus, xpBonus: nft.xpBonus, sellBonus: nft.sellBonus } : { rarityBonus: 0, xpBonus: 0, sellBonus: 0 };
  }, []);

  const calculateFishCatch = useCallback((): Fish | null => {
    const levelBonus = Math.min(player.level - 1, 20) * 0.5;
    const catchRoll = Math.random() * 100;
    if (catchRoll > CATCH_CHANCE + levelBonus) {
      return null;
    }

    const rodBonus = ROD_BONUSES[player.equippedRod] || 0;
    const nftBonus = getNftBonus(player.equippedRod, player.nftRods);
    const totalRodBonus = rodBonus + nftBonus.rarityBonus;
    const roll = Math.random() * 100;
    
    let cumulative = 0;
    
    const adjustedFish = FISH_DATA.map(fish => {
      let adjustedChance = fish.chance;
      if (fish.rarity !== 'common' && fish.rarity !== 'uncommon') {
        adjustedChance += (adjustedChance * totalRodBonus) / 100;
      }
      return { ...fish, adjustedChance };
    });

    const totalChance = adjustedFish.reduce((sum, f) => sum + f.adjustedChance, 0);
    
    for (const fish of adjustedFish) {
      cumulative += (fish.adjustedChance / totalChance) * 100;
      if (roll <= cumulative) {
        return fish;
      }
    }

    return FISH_DATA[0];
  }, [player.equippedRod, player.nftRods, player.level, getNftBonus]);

  const clearBiteTimers = useCallback(() => {
    if (biteTimerRef.current) { clearTimeout(biteTimerRef.current); biteTimerRef.current = null; }
    if (biteCountdownRef.current) { clearInterval(biteCountdownRef.current); biteCountdownRef.current = null; }
  }, []);

  const queueAuditEvent = useCallback((event: PlayerAuditEventPayload) => {
    pendingAuditEventsRef.current.push(event);
  }, []);

  const applyFishReward = useCallback((caughtFish: Fish) => {
    let nextAlbumReward: AlbumRewardInfo | null = null;

    setPlayer(prev => {
      const beforeSnapshot = toPlayerAuditSnapshot(prev);
      const nftB = getNftBonus(prev.equippedRod, prev.nftRods);
      const xpGain = Math.floor((caughtFish.xp + 5) * (1 + nftB.xpBonus / 100));
      const newXp = prev.xp + xpGain;
      let newLevel = prev.level;
      let remainingXp = newXp;
      let xpToNext = prev.xpToNextLevel;
      let bonusCoins = 0;

      while (remainingXp >= xpToNext) {
        remainingXp -= xpToNext;
        newLevel++;
        xpToNext = newLevel * XP_PER_LEVEL;
        bonusCoins += 100 * newLevel;
      }

      if (newLevel > prev.level) {
        setLevelUpInfo({ newLevel, coinsReward: bonusCoins });
      }

      const existingFish = prev.inventory.find(f => f.fishId === caughtFish.id);
      const caughtAt = new Date();
      const newInventory = existingFish
        ? prev.inventory.map(f => 
            f.fishId === caughtFish.id 
              ? { ...f, quantity: f.quantity + 1 }
              : f
          )
        : [...prev.inventory, { fishId: caughtFish.id, caughtAt, quantity: 1 }];

      const collectionUpdate = collectionBookEnabled
        ? recordCollectionCatch(prev.collectionBook, caughtFish.id, caughtAt)
        : null;
      const firstCatchBonus = collectionUpdate?.isFirstCatch
        ? (ALBUM_FIRST_CATCH_BONUSES[caughtFish.id as keyof typeof ALBUM_FIRST_CATCH_BONUSES] ?? 0)
        : 0;

      if (collectionUpdate?.isFirstCatch) {
        nextAlbumReward = {
          fishId: caughtFish.id,
          fishName: caughtFish.name,
          bonusCoins: firstCatchBonus,
          totalSpeciesCaught: collectionUpdate.nextBook.totalSpeciesCaught,
          pageCompletedIds: collectionUpdate.pageCompletedIds,
        };
      }

      const nextPlayer = {
        ...prev,
        xp: remainingXp,
        xpToNextLevel: xpToNext,
        level: newLevel,
        coins: prev.coins + bonusCoins + firstCatchBonus,
        inventory: newInventory,
        totalCatches: prev.totalCatches + 1,
        collectionBook: collectionUpdate?.nextBook ?? prev.collectionBook,
      };

      queueAuditEvent({
        eventType: 'fish_caught',
        beforeState: beforeSnapshot,
        afterState: toPlayerAuditSnapshot(nextPlayer),
        metadata: {
          fishId: caughtFish.id,
          rarity: caughtFish.rarity,
          sellPrice: caughtFish.price,
          xpGain,
          quantity: 1,
          firstCatchBonus,
          pageCompletedIds: collectionUpdate?.pageCompletedIds ?? [],
        },
      });

      return nextPlayer;
    });
    if (nextAlbumReward) {
      setAlbumRewardInfo(nextAlbumReward);
    }
    onFishCaught?.(caughtFish);
  }, [collectionBookEnabled, getNftBonus, onFishCaught, queueAuditEvent]);

  const grantFishReward = useCallback((fishId: string, quantity = 1) => {
    const rewardedFish = FISH_DATA.find((fish) => fish.id === fishId);
    if (!rewardedFish || quantity <= 0) return null;

    setPlayer((prev) => {
      const existingFish = prev.inventory.find((item) => item.fishId === rewardedFish.id);
      const newInventory = existingFish
        ? prev.inventory.map((item) => (
            item.fishId === rewardedFish.id
              ? { ...item, quantity: item.quantity + quantity }
              : item
          ))
        : [...prev.inventory, { fishId: rewardedFish.id, caughtAt: new Date(), quantity }];

      return {
        ...prev,
        inventory: newInventory,
      };
    });

    return rewardedFish;
  }, []);

  const applyMissXp = useCallback(() => {
    setPlayer(prev => {
      const beforeSnapshot = toPlayerAuditSnapshot(prev);
      const nftB = getNftBonus(prev.equippedRod, prev.nftRods);
      const xpGain = Math.floor(5 * (1 + nftB.xpBonus / 100));
      const newXp = prev.xp + xpGain;
      let newLevel = prev.level;
      let remainingXp = newXp;
      let xpToNext = prev.xpToNextLevel;
      let bonusCoins = 0;

      while (remainingXp >= xpToNext) {
        remainingXp -= xpToNext;
        newLevel++;
        xpToNext = newLevel * XP_PER_LEVEL;
        bonusCoins += 100 * newLevel;
      }

      if (newLevel > prev.level) {
        setLevelUpInfo({ newLevel, coinsReward: bonusCoins });
      }

      const nextPlayer = {
        ...prev,
        xp: remainingXp,
        xpToNextLevel: xpToNext,
        level: newLevel,
        coins: prev.coins + bonusCoins
      };

      queueAuditEvent({
        eventType: 'fish_escaped',
        beforeState: beforeSnapshot,
        afterState: toPlayerAuditSnapshot(nextPlayer),
        metadata: {
          xpGain,
        },
      });

      return nextPlayer;
    });
  }, [getNftBonus, queueAuditEvent]);

  // reelIn — player reaction during biting state
  const reelIn = useCallback(async () => {
    if (gameStateRef.current !== 'biting') return;
    clearBiteTimers();

    const fish = pendingFishRef.current;
    pendingFishRef.current = null;

    setGameState('catching');
    await new Promise(resolve => setTimeout(resolve, 1000));

    if (fish) {
      applyFishReward(fish);
      setLastResult({ success: true, fish });
    } else {
      applyMissXp();
      setLastResult({ success: false });
    }

    setGameState('result');
    await new Promise(resolve => setTimeout(resolve, 2500));
    setGameState('idle');
    setLastResult(null);
  }, [clearBiteTimers, applyFishReward, applyMissXp]);

  // Bite timeout — fish escapes
  const onBiteTimeout = useCallback(async () => {
    clearBiteTimers();
    premiumCastActiveRef.current = false;
    pendingFishRef.current = null;
    applyMissXp();
    setLastResult({ success: false });
    setGameState('result');
    await new Promise(resolve => setTimeout(resolve, 2500));
    setGameState('idle');
    setLastResult(null);
  }, [clearBiteTimers, applyMissXp]);

  const resetPremiumCastState = useCallback(() => {
    clearBiteTimers();
    premiumCastActiveRef.current = false;
    pendingFishRef.current = null;
    setBiteTimeLeft(0);
    setBiteTimeTotal(0);
    setLastResult(null);
    setGameState('idle');
  }, [clearBiteTimers]);

  const presentPremiumCastResult = useCallback(async (fish: Fish | null) => {
    clearBiteTimers();
    premiumCastActiveRef.current = false;
    pendingFishRef.current = null;
    setBiteTimeLeft(0);
    setBiteTimeTotal(0);
    setGameState('catching');
    await new Promise(resolve => setTimeout(resolve, 1000));
    setLastResult(fish ? { success: true, fish } : { success: false });
    setGameState('result');
    await new Promise(resolve => setTimeout(resolve, 2500));
    setGameState('idle');
    setLastResult(null);
  }, [clearBiteTimers]);

  const startCastSequence = useCallback(async (options: { consumeBait: boolean; premium: boolean }) => {
    const normalizedPlayer = normalizePlayerDailyFreeBait(player, BAIT_BUCKETS_V2_ENABLED, DAILY_FREE_BAIT);
    const totalBait = normalizedPlayer.bait + normalizedPlayer.dailyFreeBait;
    if ((!options.premium && totalBait <= 0) || gameState !== 'idle') return;

    const now = Date.now();
    if (now - lastCastTimeRef.current < MIN_CAST_INTERVAL) return;
    lastCastTimeRef.current = now;
    premiumCastActiveRef.current = options.premium;

    if (options.consumeBait) {
      setPlayer(prev => {
        const next = normalizePlayerDailyFreeBait(prev, BAIT_BUCKETS_V2_ENABLED, DAILY_FREE_BAIT);
        const beforeSnapshot = toPlayerAuditSnapshot(next);
        if (next.dailyFreeBait > 0) {
          const afterState = { ...next, dailyFreeBait: next.dailyFreeBait - 1 };
          queueAuditEvent({
            eventType: 'cast_started',
            beforeState: beforeSnapshot,
            afterState: toPlayerAuditSnapshot(afterState),
            metadata: { spentBucket: 'daily_free_bait' },
          });
          return afterState;
        }
        if (next.bait > 0) {
          const afterState = { ...next, bait: next.bait - 1 };
          queueAuditEvent({
            eventType: 'cast_started',
            beforeState: beforeSnapshot,
            afterState: toPlayerAuditSnapshot(afterState),
            metadata: { spentBucket: 'bait' },
          });
          return afterState;
        }
        return next;
      });
    }

    setGameState('casting');

    await new Promise(resolve => setTimeout(resolve, 800));
    setGameState('waiting');

    const waitTime = 1000 + Math.random() * 2000;
    await new Promise(resolve => setTimeout(resolve, waitTime));

    pendingFishRef.current = options.premium ? null : calculateFishCatch();

    const biteWindow = BITE_WINDOW_MIN + Math.random() * (BITE_WINDOW_MAX - BITE_WINDOW_MIN);
    setBiteTimeTotal(biteWindow);
    setBiteTimeLeft(biteWindow);
    setGameState('biting');

    const startTime = Date.now();
    biteCountdownRef.current = setInterval(() => {
      const elapsed = Date.now() - startTime;
      const remaining = Math.max(0, biteWindow - elapsed);
      setBiteTimeLeft(remaining);
      if (remaining <= 0 && biteCountdownRef.current) {
        clearInterval(biteCountdownRef.current);
        biteCountdownRef.current = null;
      }
    }, 50);

    biteTimerRef.current = setTimeout(() => {
      if (options.premium) {
        void onPremiumBiteTimeout?.();
        return;
      }
      void onBiteTimeout();
    }, biteWindow);
  }, [calculateFishCatch, gameState, onBiteTimeout, onPremiumBiteTimeout, player, queueAuditEvent]);

  const castRod = useCallback(async () => {
    await startCastSequence({ consumeBait: true, premium: false });
  }, [startCastSequence]);

  const castPremiumRod = useCallback(async () => {
    await startCastSequence({ consumeBait: false, premium: true });
  }, [startCastSequence]);

  const sellFish = useCallback((fishId: string) => {
    const fish = FISH_DATA.find(f => f.id === fishId);
    const inventoryItem = player.inventory.find(f => f.fishId === fishId);
    
    if (!fish || !inventoryItem || inventoryItem.quantity <= 0) return 0;

    const nftB = getNftBonus(player.equippedRod, player.nftRods);
    const sellPrice = Math.floor(fish.price * (1 + nftB.sellBonus / 100));

    setPlayer(prev => {
      const nextPlayer = {
        ...prev,
        coins: prev.coins + sellPrice,
        inventory: prev.inventory.map(f =>
          f.fishId === fishId
            ? { ...f, quantity: f.quantity - 1 }
            : f
        ).filter(f => f.quantity > 0)
      };

      queueAuditEvent({
        eventType: 'fish_sold',
        beforeState: toPlayerAuditSnapshot(prev),
        afterState: toPlayerAuditSnapshot(nextPlayer),
        metadata: {
          fishId,
          sellPrice,
          quantity: 1,
        },
      });

      return nextPlayer;
    });
    return sellPrice;
  }, [player.inventory, player.equippedRod, player.nftRods, getNftBonus, queueAuditEvent]);

  const consumeFish = useCallback((ingredients: Record<string, number>) => {
    const canCook = Object.entries(ingredients).every(([fishId, quantity]) => {
      const inventoryItem = player.inventory.find(f => f.fishId === fishId);
      return inventoryItem && inventoryItem.quantity >= quantity;
    });

    if (!canCook) return false;

    setPlayer(prev => ({
      ...prev,
      inventory: prev.inventory.map(item => ({
        ...item,
        quantity: item.quantity - (ingredients[item.fishId] || 0),
      })).filter(item => item.quantity > 0),
    }));

    return true;
  }, [player.inventory]);

  const cookRecipe = useCallback((recipe: GrillRecipe) => {
    const canCook = Object.entries(recipe.ingredients).every(([fishId, quantity]) => {
      const inventoryItem = player.inventory.find(f => f.fishId === fishId);
      return inventoryItem && inventoryItem.quantity >= quantity;
    });

    if (!canCook) return false;

    setPlayer(prev => ({
      ...prev,
      inventory: prev.inventory.map(item => ({
        ...item,
        quantity: item.quantity - (recipe.ingredients[item.fishId] || 0),
      })).filter(item => item.quantity > 0),
      cookedDishes: (() => {
        const existingDish = prev.cookedDishes.find((item) => item.recipeId === recipe.id);
        if (existingDish) {
          return prev.cookedDishes.map((item) => (
            item.recipeId === recipe.id
              ? { ...item, quantity: item.quantity + 1, createdAt: new Date() }
              : item
          ));
        }

        return [...prev.cookedDishes, { recipeId: recipe.id, quantity: 1, createdAt: new Date() }];
      })(),
    }));

    return true;
  }, [player.inventory]);

  const sellCookedDish = useCallback((recipeId: string) => {
    const recipe = GRILL_RECIPES.find((item) => item.id === recipeId);
    const ownedDish = player.cookedDishes.find((item) => item.recipeId === recipeId);

    if (!recipe || !ownedDish || ownedDish.quantity <= 0) return 0;

    setPlayer((prev) => ({
      ...prev,
      coins: prev.coins + recipe.score,
      cookedDishes: prev.cookedDishes.map((item) => (
        item.recipeId === recipeId
          ? { ...item, quantity: item.quantity - 1 }
          : item
      )).filter((item) => item.quantity > 0),
    }));

    return recipe.score;
  }, [player.cookedDishes]);

  const buyBait = useCallback((amount: number, cost: number) => {
    if (player.coins < cost) return false;
    
    setPlayer(prev => {
      const nextPlayer = {
        ...prev,
        coins: prev.coins - cost,
        bait: prev.bait + amount
      };

      queueAuditEvent({
        eventType: 'bait_bought_with_coins',
        beforeState: toPlayerAuditSnapshot(prev),
        afterState: toPlayerAuditSnapshot(nextPlayer),
        metadata: {
          baitAmount: amount,
          coinCost: cost,
        },
      });

      return nextPlayer;
    });
    return true;
  }, [player.coins, queueAuditEvent]);

  const buyRod = useCallback((level: number, cost: number) => {
    if (player.coins < cost) return false;
    if (player.rodLevel >= level) return false;
    
    setPlayer(prev => {
      if (prev.rodLevel >= level) return prev;
      const nextPlayer = {
        ...prev,
        coins: prev.coins - cost,
        rodLevel: level,
        equippedRod: level
      };

      queueAuditEvent({
        eventType: 'rod_bought_with_coins',
        beforeState: toPlayerAuditSnapshot(prev),
        afterState: toPlayerAuditSnapshot(nextPlayer),
        metadata: {
          rodLevel: level,
          coinCost: cost,
        },
      });

      return nextPlayer;
    });
    return true;
  }, [player.coins, player.rodLevel, queueAuditEvent]);

  const buyFishingNet = useCallback((cost: number) => {
    if (player.coins < cost) return false;

    setPlayer(prev => {
      const nextPlayer = {
        ...prev,
        coins: prev.coins - cost,
      };

      queueAuditEvent({
        eventType: 'fishing_net_bought_with_coins',
        beforeState: toPlayerAuditSnapshot(prev),
        afterState: toPlayerAuditSnapshot(nextPlayer),
        metadata: {
          coinCost: cost,
        },
      });

      return nextPlayer;
    });

    return true;
  }, [player.coins, queueAuditEvent]);

  const unlockRodWithMon = useCallback((level: number, monAmount: string) => {
    if (player.rodLevel >= level) return false;

    setPlayer(prev => {
      if (prev.rodLevel >= level) return prev;
      const nextPlayer = {
        ...prev,
        rodLevel: level,
        equippedRod: level,
      };

      queueAuditEvent({
        eventType: 'rod_bought_with_mon',
        beforeState: toPlayerAuditSnapshot(prev),
        afterState: toPlayerAuditSnapshot(nextPlayer),
        metadata: {
          rodLevel: level,
          monAmount,
        },
      });

      return nextPlayer;
    });

    return true;
  }, [player.rodLevel, queueAuditEvent]);

  const equipRod = useCallback((level: number) => {
    setPlayer(prev => {
      if (level > prev.rodLevel || level < 0) return prev;
      return { ...prev, equippedRod: level };
    });
  }, []);

  const claimDailyBonus = useCallback(() => {
    if (LEGACY_DAILY_BONUS_DISABLED) return;
    if (player.dailyBonusClaimed) return;

    const bonusBait = 5 + Math.min(player.loginStreak, 7) * 2;
    const bonusCoins = player.loginStreak >= 7 ? 50 : 0;

    setPlayer(prev => ({
      ...prev,
      bait: prev.bait + bonusBait,
      coins: prev.coins + bonusCoins,
      dailyBonusClaimed: true
    }));
  }, [player.dailyBonusClaimed, player.loginStreak]);

  const addCoins = useCallback((amount: number) => {
    setPlayer(prev => ({
      ...prev,
      coins: prev.coins + amount,
    }));
  }, []);

  const addBait = useCallback((amount: number) => {
    if (amount <= 0) return;

    setPlayer(prev => ({
      ...prev,
      bait: prev.bait + amount,
    }));
  }, []);

  const dismissLevelUp = useCallback(() => {
    setLevelUpInfo(null);
  }, []);

  const dismissAlbumReward = useCallback(() => {
    setAlbumRewardInfo(null);
  }, []);

  const mintNftRod = useCallback((rodLevel: number) => {
    setPlayer(prev => {
      if (prev.nftRods.includes(rodLevel)) return prev;
      return { ...prev, nftRods: [...prev.nftRods, rodLevel] };
    });
  }, []);

  const persistIdentitySnapshot = useCallback((nextPlayer: PlayerState) => {
    storePlayerLocally(nextPlayer);
    onSave?.(nextPlayer);
  }, [onSave]);

  const setNickname = useCallback((nickname: string | null) => {
    let nextSnapshot: PlayerState | null = null;
    setPlayer(prev => {
      nextSnapshot = { ...prev, nickname };
      return nextSnapshot;
    });

    if (nextSnapshot) {
      persistIdentitySnapshot(nextSnapshot);
    }
  }, [persistIdentitySnapshot]);

  const setAvatarUrl = useCallback((avatarUrl: string | null) => {
    let nextSnapshot: PlayerState | null = null;
    setPlayer(prev => {
      nextSnapshot = { ...prev, avatarUrl };
      return nextSnapshot;
    });

    if (nextSnapshot) {
      persistIdentitySnapshot(nextSnapshot);
    }
  }, [persistIdentitySnapshot]);

  // Cleanup on unmount
  useEffect(() => {
    return () => { clearBiteTimers(); };
  }, [clearBiteTimers]);

  return {
    player,
    gameState,
    lastResult,
    levelUpInfo,
    albumRewardInfo,
    biteTimeLeft,
    biteTimeTotal,
    castRod,
    castPremiumRod,
    reelIn,
    presentPremiumCastResult,
    resetPremiumCastState,
    sellFish,
    consumeFish,
    cookRecipe,
    sellCookedDish,
    buyBait,
    buyRod,
    buyFishingNet,
    unlockRodWithMon,
    equipRod,
    addCoins,
    addBait,
    grantFishReward,
    claimDailyBonus,
    dismissLevelUp,
    dismissAlbumReward,
    mintNftRod,
    setNickname,
    setAvatarUrl
  };
}
