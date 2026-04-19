import { useState, useCallback, useEffect, useRef } from 'react';
import { 
  PlayerState, 
  GameState, 
  GameResult, 
  Fish,
  FISH_DATA, 
  CATCH_CHANCE,
  ROD_BONUSES,
  XP_PER_LEVEL,
  NFT_ROD_DATA
} from '@/types/game';

const PLAYER_STORAGE_KEY = 'hook_loot_player_v1';

const INITIAL_PLAYER_STATE: PlayerState = {
  coins: 100,
  bait: 10,
  level: 1,
  xp: 0,
  xpToNextLevel: XP_PER_LEVEL,
  rodLevel: 0,
  equippedRod: 0,
  inventory: [],
  totalCatches: 0,
  dailyBonusClaimed: false,
  loginStreak: 1,
  nftRods: [],
  nickname: null,
  avatarUrl: null
};

const MIN_CAST_INTERVAL = 4000; // minimum 4s between casts
const BITE_WINDOW_MIN = 1500; // ms
const BITE_WINDOW_MAX = 2500; // ms

interface StoredCaughtFish {
  fishId: string;
  caughtAt: string;
  quantity: number;
}

interface StoredPlayerState extends Omit<PlayerState, 'inventory'> {
  inventory: StoredCaughtFish[];
}

const loadStoredPlayer = (): PlayerState | null => {
  try {
    const raw = localStorage.getItem(PLAYER_STORAGE_KEY);
    if (!raw) return null;

    const parsed = JSON.parse(raw) as Partial<StoredPlayerState>;
    if (!parsed || typeof parsed !== 'object') return null;

    return {
      ...INITIAL_PLAYER_STATE,
      ...parsed,
      inventory: Array.isArray(parsed.inventory)
        ? parsed.inventory.map((item) => ({
            fishId: item.fishId,
            caughtAt: new Date(item.caughtAt),
            quantity: item.quantity,
          }))
        : [],
      nickname: parsed.nickname ?? null,
      avatarUrl: parsed.avatarUrl ?? null,
      nftRods: Array.isArray(parsed.nftRods) ? parsed.nftRods : [],
    };
  } catch {
    return null;
  }
};

const storePlayerLocally = (player: PlayerState) => {
  const serialized: StoredPlayerState = {
    ...player,
    inventory: player.inventory.map((item) => ({
      fishId: item.fishId,
      caughtAt: item.caughtAt instanceof Date ? item.caughtAt.toISOString() : new Date(item.caughtAt).toISOString(),
      quantity: item.quantity,
    })),
  };

  localStorage.setItem(PLAYER_STORAGE_KEY, JSON.stringify(serialized));
};

const mergePlayerState = (base: PlayerState, local: PlayerState): PlayerState => ({
  ...base,
  coins: local.coins,
  bait: local.bait,
  level: local.level,
  xp: local.xp,
  xpToNextLevel: local.xpToNextLevel,
  rodLevel: local.rodLevel,
  equippedRod: local.equippedRod,
  inventory: local.inventory,
  totalCatches: local.totalCatches,
  dailyBonusClaimed: local.dailyBonusClaimed,
  loginStreak: local.loginStreak,
  nftRods: Array.from(new Set([...base.nftRods, ...local.nftRods])).sort((a, b) => a - b),
  nickname: local.nickname ?? base.nickname,
  avatarUrl: local.avatarUrl ?? base.avatarUrl,
});

const resolveInitialPlayer = (savedPlayer?: PlayerState | null) => {
  const localPlayer = loadStoredPlayer();

  if (savedPlayer && localPlayer) {
    return mergePlayerState(savedPlayer, localPlayer);
  }

  return savedPlayer || localPlayer || INITIAL_PLAYER_STATE;
};

interface UseGameStateOptions {
  savedPlayer?: PlayerState | null;
  onSave?: (player: PlayerState) => void;
  onFishCaught?: (fish: Fish) => void;
}

export function useGameState(options?: UseGameStateOptions) {
  const savedPlayer = options?.savedPlayer;
  const onSave = options?.onSave;
  const onFishCaught = options?.onFishCaught;
  const [player, setPlayer] = useState<PlayerState>(
    resolveInitialPlayer(savedPlayer)
  );
  const [gameState, setGameState] = useState<GameState>('idle');
  const [lastResult, setLastResult] = useState<GameResult | null>(null);
  const [levelUpInfo, setLevelUpInfo] = useState<{ newLevel: number; coinsReward: number } | null>(null);
  const [biteTimeLeft, setBiteTimeLeft] = useState<number>(0);
  const [biteTimeTotal, setBiteTimeTotal] = useState<number>(0);
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const initializedRef = useRef(false);
  const lastCastTimeRef = useRef<number>(0);
  const pendingFishRef = useRef<Fish | null>(null);
  const biteTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const biteCountdownRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const gameStateRef = useRef<GameState>('idle');

  // Keep ref in sync
  useEffect(() => {
    gameStateRef.current = gameState;
  }, [gameState]);

  // Load saved player when it becomes available
  useEffect(() => {
    if (savedPlayer) {
      setPlayer((prev) => mergePlayerState(savedPlayer, prev));
    }
  }, [savedPlayer]);

  useEffect(() => {
    if (initializedRef.current) return;
    initializedRef.current = true;
  }, []);

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

  const applyFishReward = useCallback((caughtFish: Fish) => {
    setPlayer(prev => {
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
      const newInventory = existingFish
        ? prev.inventory.map(f => 
            f.fishId === caughtFish.id 
              ? { ...f, quantity: f.quantity + 1 }
              : f
          )
        : [...prev.inventory, { fishId: caughtFish.id, caughtAt: new Date(), quantity: 1 }];

      return {
        ...prev,
        xp: remainingXp,
        xpToNextLevel: xpToNext,
        level: newLevel,
        coins: prev.coins + bonusCoins,
        inventory: newInventory,
        totalCatches: prev.totalCatches + 1
      };
    });
    onFishCaught?.(caughtFish);
  }, [getNftBonus, onFishCaught]);

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

      return {
        ...prev,
        xp: remainingXp,
        xpToNextLevel: xpToNext,
        level: newLevel,
        coins: prev.coins + bonusCoins
      };
    });
  }, [getNftBonus]);

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
    pendingFishRef.current = null;
    applyMissXp();
    setLastResult({ success: false });
    setGameState('result');
    await new Promise(resolve => setTimeout(resolve, 2500));
    setGameState('idle');
    setLastResult(null);
  }, [clearBiteTimers, applyMissXp]);

  const castRod = useCallback(async () => {
    if (player.bait <= 0 || gameState !== 'idle') return;

    // Rate limiting
    const now = Date.now();
    if (now - lastCastTimeRef.current < MIN_CAST_INTERVAL) return;
    lastCastTimeRef.current = now;

    setPlayer(prev => ({ ...prev, bait: prev.bait - 1 }));
    setGameState('casting');

    await new Promise(resolve => setTimeout(resolve, 800));
    setGameState('waiting');

    const waitTime = 1000 + Math.random() * 2000;
    await new Promise(resolve => setTimeout(resolve, waitTime));

    const caughtFish = calculateFishCatch();
    pendingFishRef.current = caughtFish;

    // Enter biting state — player must react
    const biteWindow = BITE_WINDOW_MIN + Math.random() * (BITE_WINDOW_MAX - BITE_WINDOW_MIN);
    setBiteTimeTotal(biteWindow);
    setBiteTimeLeft(biteWindow);
    setGameState('biting');

    // Countdown timer for UI
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

    // Timeout — fish escapes
    biteTimerRef.current = setTimeout(() => {
      onBiteTimeout();
    }, biteWindow);
  }, [player.bait, gameState, calculateFishCatch, onBiteTimeout]);

  const sellFish = useCallback((fishId: string) => {
    const fish = FISH_DATA.find(f => f.id === fishId);
    const inventoryItem = player.inventory.find(f => f.fishId === fishId);
    
    if (!fish || !inventoryItem || inventoryItem.quantity <= 0) return;

    const nftB = getNftBonus(player.equippedRod, player.nftRods);
    const sellPrice = Math.floor(fish.price * (1 + nftB.sellBonus / 100));

    setPlayer(prev => ({
      ...prev,
      coins: prev.coins + sellPrice,
      inventory: prev.inventory.map(f =>
        f.fishId === fishId
          ? { ...f, quantity: f.quantity - 1 }
          : f
      ).filter(f => f.quantity > 0)
    }));
  }, [player.inventory, player.equippedRod, player.nftRods, getNftBonus]);

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

  const buyBait = useCallback((amount: number, cost: number) => {
    if (player.coins < cost) return;
    
    setPlayer(prev => ({
      ...prev,
      coins: prev.coins - cost,
      bait: prev.bait + amount
    }));
  }, [player.coins]);

  const buyRod = useCallback((level: number, cost: number) => {
    if (player.coins < cost) return;
    
    setPlayer(prev => {
      if (prev.rodLevel >= level) return prev;
      return {
        ...prev,
        coins: prev.coins - cost,
        rodLevel: level,
        equippedRod: level
      };
    });
  }, [player.coins]);

  const equipRod = useCallback((level: number) => {
    setPlayer(prev => {
      if (level > prev.rodLevel || level < 0) return prev;
      return { ...prev, equippedRod: level };
    });
  }, []);

  const claimDailyBonus = useCallback(() => {
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

  const dismissLevelUp = useCallback(() => {
    setLevelUpInfo(null);
  }, []);

  const mintNftRod = useCallback((rodLevel: number) => {
    setPlayer(prev => {
      if (prev.nftRods.includes(rodLevel)) return prev;
      return { ...prev, nftRods: [...prev.nftRods, rodLevel] };
    });
  }, []);

  const setNickname = useCallback((nickname: string | null) => {
    setPlayer(prev => ({ ...prev, nickname }));
  }, []);

  const setAvatarUrl = useCallback((avatarUrl: string | null) => {
    setPlayer(prev => ({ ...prev, avatarUrl }));
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => { clearBiteTimers(); };
  }, [clearBiteTimers]);

  return {
    player,
    gameState,
    lastResult,
    levelUpInfo,
    biteTimeLeft,
    biteTimeTotal,
    castRod,
    reelIn,
    sellFish,
    consumeFish,
    buyBait,
    buyRod,
    equipRod,
    addCoins,
    grantFishReward,
    claimDailyBonus,
    dismissLevelUp,
    mintNftRod,
    setNickname,
    setAvatarUrl
  };
}
