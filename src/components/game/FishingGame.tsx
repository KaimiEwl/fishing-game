import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import MonadFishCanvas from './MonadFishCanvas';
import PlayerPanel from './PlayerPanel';
import GameControls from './GameControls';
import InventoryDialog from './InventoryDialog';
import BuyCoinsDialog from './BuyCoinsDialog';
import BottomNav from './BottomNav';
import TasksScreen from './TasksScreen';
import ShopScreen from './ShopScreen';
import GrillScreen from './GrillScreen';
import WheelScreen from './WheelScreen';
import LeaderboardScreen from './LeaderboardScreen';
import MapScreen from './MapScreen';
import LeaderboardNameDialog from './LeaderboardNameDialog';
import LevelUpCelebration from './LevelUpCelebration';
import GameLoadingScreen from './GameLoadingScreen';
import { FISH_IMAGE_SRC } from './FishIcon';
import { useGameState } from '@/hooks/useGameState';
import { useGameProgress } from '@/hooks/useGameProgress';
import { useWalletAuth } from '@/hooks/useWalletAuth';
import { useSoundEffects } from '@/hooks/useSoundEffects';
import { useIsMobile } from '@/hooks/use-mobile';
import { cn } from '@/lib/utils';
import { publicAsset } from '@/lib/assets';
import travelIconSrc from '@/assets/map_travel_icon_cutout.png';
import mapTreasureVaultSrc from '@/assets/map_treasure_vault_cutout.png';
import mapSkullCoveSrc from '@/assets/map_skull_cove_cutout.png';
import mapCoralCastleSrc from '@/assets/map_coral_castle_cutout.png';
import mapVolcanoGrillSrc from '@/assets/map_volcano_grill_cutout.png';
import mapIslandMarketSrc from '@/assets/map_island_market_cutout.png';
import mapWheelPierSrc from '@/assets/map_wheel_pier_cutout.png';
import {
  deleteGlobalLeaderboardEntry,
  getLeaderboardPlayerId,
  loadLeaderboardEntries,
  loadGlobalLeaderboardEntries,
  mergeLeaderboardEntries,
  mergeLeaderboardSnapshots,
  saveGlobalLeaderboardEntry,
  upsertLeaderboardEntry,
} from '@/lib/leaderboard';
import type { DailyTaskId, GameTab, GrillLeaderboardEntry, GrillRecipe, WheelPrize } from '@/types/game';

const TRAVEL_ICON_SRC = travelIconSrc;

const MAP_LOCATION_ASSETS = [
  mapTreasureVaultSrc,
  mapSkullCoveSrc,
  mapCoralCastleSrc,
  mapVolcanoGrillSrc,
  mapIslandMarketSrc,
  mapWheelPierSrc,
];

const PRELOAD_ASSETS = [
  publicAsset('assets/bg_main.jpg'),
  publicAsset('assets/pepe_boat_v2.png'),
  publicAsset('assets/rod_basic.png'),
  publicAsset('assets/rod_bamboo.png'),
  publicAsset('assets/rod_carbon.png'),
  publicAsset('assets/rod_pro.png'),
  publicAsset('assets/rod_legendary.png'),
  publicAsset('assets/bg_tasks.jpg'),
  publicAsset('assets/bg_wheel.jpg'),
  TRAVEL_ICON_SRC,
  ...MAP_LOCATION_ASSETS,
  ...Object.values(FISH_IMAGE_SRC),
];

const preloadImage = (src: string) => new Promise<void>((resolve) => {
  const img = new Image();
  let settled = false;
  const decodeTimeoutMs = 1200;
  const loadTimeoutMs = 8000;
  const loadTimeout = window.setTimeout(() => {
    void finish();
  }, loadTimeoutMs);

  const waitForDecode = async () => {
    if (!img.decode) return;
    await Promise.race([
      img.decode(),
      new Promise<void>((done) => window.setTimeout(done, decodeTimeoutMs)),
    ]);
  };

  const finish = async () => {
    if (settled) return;
    settled = true;
    window.clearTimeout(loadTimeout);
    try {
      await waitForDecode();
    } catch {
      // onload already confirmed the browser has the image; decode can fail on older engines.
    }
    resolve();
  };
  img.onload = () => { void finish(); };
  img.onerror = () => resolve();
  img.src = src;
  if (img.complete && img.naturalWidth > 0) {
    void finish();
  }
});

const setBootLoaderState = (progress: number, label?: string) => {
  const bootWindow = window as Window & {
    __setBootLoaderState?: (nextProgress: number, nextLabel?: string) => void;
  };

  bootWindow.__setBootLoaderState?.(progress, label);
};

const hideBootLoader = () => {
  const bootWindow = window as Window & {
    __hideBootLoader?: () => void;
  };

  bootWindow.__hideBootLoader?.();
};

const FishingGame: React.FC = () => {
  const { isConnected, isVerified, savedPlayer, saveProgress, address } = useWalletAuth();
  const isMobile = useIsMobile();
  const [activeTab, setActiveTab] = useState<GameTab>('fish');
  const [assetsReady, setAssetsReady] = useState(false);
  const [assetsProgress, setAssetsProgress] = useState(0);
  const [leaderboardEntries, setLeaderboardEntries] = useState<GrillLeaderboardEntry[]>(() => loadLeaderboardEntries());
  const [leaderboardPlayerId, setLeaderboardPlayerId] = useState(() => getLeaderboardPlayerId(address));
  const [leaderboardNameOpen, setLeaderboardNameOpen] = useState(false);
  const [pendingLeaderboardScore, setPendingLeaderboardScore] = useState(0);
  const [pendingLeaderboardDishes, setPendingLeaderboardDishes] = useState(0);
  const gameProgress = useGameProgress();

  const {
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
    dismissLevelUp,
    mintNftRod,
    setNickname,
    setAvatarUrl,
  } = useGameState({
    savedPlayer: isConnected ? savedPlayer : undefined,
    onSave: isVerified ? saveProgress : undefined,
    onFishCaught: gameProgress.recordFishCatch,
  });

  const sounds = useSoundEffects();
  const prevGameState = useRef(gameState);
  const prevLevel = useRef(player.level);
  const prevLeaderboardPlayerId = useRef(leaderboardPlayerId);
  const currentLeaderboardEntry = useMemo(() => (
    leaderboardEntries.find((entry) => entry.id === leaderboardPlayerId)
  ), [leaderboardEntries, leaderboardPlayerId]);

  const saveCurrentLeaderboardEntry = useCallback((name: string, score: number, dishesDelta = 0) => {
    setLeaderboardEntries((entries) => {
      const nextEntries = upsertLeaderboardEntry({
        entries,
        id: leaderboardPlayerId,
        name,
        score,
        dishesDelta,
        walletAddress: address,
      });
      const updatedEntry = nextEntries.find((entry) => entry.id === leaderboardPlayerId);
      if (updatedEntry) {
        void saveGlobalLeaderboardEntry(updatedEntry);
      }
      return nextEntries;
    });
  }, [address, leaderboardPlayerId]);

  useEffect(() => {
    let cancelled = false;
    const uniqueAssets = Array.from(new Set(PRELOAD_ASSETS));
    let loaded = 0;

    setAssetsProgress(0.04);
    setBootLoaderState(0.04, 'Loading the lake...');

    Promise.all(uniqueAssets.map((src) => preloadImage(src).finally(() => {
      loaded += 1;
      const nextProgress = Math.min(0.96, loaded / uniqueAssets.length);
      if (!cancelled) {
        setAssetsProgress(nextProgress);
        setBootLoaderState(nextProgress, 'Loading the lake...');
      }
    }))).then(() => {
      window.requestAnimationFrame(() => {
        window.requestAnimationFrame(() => {
          if (!cancelled) {
            setAssetsProgress(1);
            setBootLoaderState(1, 'Ready to fish...');
            setAssetsReady(true);
          }
        });
      });
    });

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;

    void loadGlobalLeaderboardEntries().then((remoteEntries) => {
      if (cancelled || !remoteEntries) return;
      setLeaderboardEntries((entries) => mergeLeaderboardSnapshots(entries, remoteEntries));
    });

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!assetsReady) return;

    const timer = window.setTimeout(() => {
      hideBootLoader();
    }, 120);

    return () => window.clearTimeout(timer);
  }, [assetsReady]);

  useEffect(() => {
    const nextId = getLeaderboardPlayerId(address);
    const previousId = prevLeaderboardPlayerId.current;

    if (address && previousId !== nextId && previousId.startsWith('guest:')) {
      setLeaderboardEntries((entries) => {
        const nextEntries = mergeLeaderboardEntries({
          entries,
          fromId: previousId,
          toId: nextId,
          fallbackName: player.nickname || 'Guest griller',
          walletAddress: address,
        });
        const mergedEntry = nextEntries.find((entry) => entry.id === nextId);
        if (mergedEntry) {
          void saveGlobalLeaderboardEntry(mergedEntry);
          void deleteGlobalLeaderboardEntry(previousId);
        }
        return nextEntries;
      });
    }

    prevLeaderboardPlayerId.current = nextId;
    setLeaderboardPlayerId(nextId);
  }, [address, player.nickname]);

  useEffect(() => {
    const prev = prevGameState.current;
    prevGameState.current = gameState;

    if (prev !== gameState) {
      if (gameState === 'casting') {
        sounds.playCastSound();
      } else if (gameState === 'waiting' && prev === 'casting') {
        sounds.playSplashSound();
      } else if (gameState === 'biting') {
        sounds.playBiteSound();
      } else if (gameState === 'result') {
        if (lastResult?.success) {
          sounds.playSuccessSound();
        } else {
          sounds.playFailSound();
        }
      }
    }
  }, [gameState, lastResult, sounds]);

  useEffect(() => {
    if (player.level > prevLevel.current) {
      sounds.playLevelUpSound();
    }
    prevLevel.current = player.level;
  }, [player.level, sounds]);

  useEffect(() => {
    if (gameProgress.grillScore > 0 && !currentLeaderboardEntry?.name && !leaderboardNameOpen) {
      setPendingLeaderboardScore(gameProgress.grillScore);
      setPendingLeaderboardDishes(0);
      setLeaderboardNameOpen(true);
    }
  }, [currentLeaderboardEntry?.name, gameProgress.grillScore, leaderboardNameOpen]);

  const handleBuyBait = (amount: number, cost: number) => {
    buyBait(amount, cost);
    sounds.playBuySound();
  };

  const handleBuyRod = (level: number, cost: number) => {
    buyRod(level, cost);
    sounds.playBuySound();
  };

  const handleSellFish = (fishId: string) => {
    sellFish(fishId);
    sounds.playSellSound();
  };

  const handleClaimTask = (taskId: DailyTaskId) => {
    if (gameProgress.claimTask(taskId, addCoins)) {
      sounds.playBuySound();
    }
  };

  const handleSpinWheel = (selectedPrize: WheelPrize): WheelPrize | null => {
    const prize = gameProgress.spinWheel(addCoins, selectedPrize);
    if (prize) {
      sounds.playLevelUpSound();
      return prize;
    }

    // Temporary cube test mode: let the prize flow work before daily gates are re-enabled.
    addCoins(selectedPrize.coins);
    sounds.playLevelUpSound();
    return selectedPrize;
  };

  const handleCookRecipe = (recipe: GrillRecipe) => {
    if (!consumeFish(recipe.ingredients)) return;
    const nextGrillScore = gameProgress.grillScore + recipe.score;
    const fallbackLeaderboardName = player.nickname || 'Guest griller';
    gameProgress.recordGrillDish(recipe.score);
    if (currentLeaderboardEntry?.name) {
      saveCurrentLeaderboardEntry(currentLeaderboardEntry.name, nextGrillScore, 1);
    } else {
      saveCurrentLeaderboardEntry(fallbackLeaderboardName, nextGrillScore, 1);
      setPendingLeaderboardScore(nextGrillScore);
      setPendingLeaderboardDishes(0);
      setLeaderboardNameOpen(true);
    }
    sounds.playSellSound();
  };

  const handleSaveLeaderboardName = (name: string) => {
    const score = Math.max(pendingLeaderboardScore, gameProgress.grillScore);
    saveCurrentLeaderboardEntry(name, score, pendingLeaderboardDishes);
    setLeaderboardNameOpen(false);
    setPendingLeaderboardDishes(0);
    setPendingLeaderboardScore(0);
  };

  const isFishingScreen = activeTab === 'fish';

  return (
    <main className="fixed inset-0 flex flex-col bg-[#05060b]">
      <div
        data-device={isMobile ? 'mobile' : 'desktop'}
        className="relative mx-auto flex h-full w-full flex-col overflow-hidden bg-black shadow-2xl"
        style={{
          maxWidth: isMobile ? '100vw' : '1920px',
          ['--bottom-nav-clearance' as string]: isMobile ? '5.25rem' : '6.25rem',
        }}
      >
        <div className={cn('relative flex-1 overflow-hidden transition-opacity duration-300', assetsReady ? 'opacity-100' : 'opacity-0')}>
          {isFishingScreen ? (
            <MonadFishCanvas
              onCast={castRod}
              gameState={gameState}
              lastResult={lastResult}
              rodLevel={player.equippedRod}
            />
          ) : activeTab === 'tasks' ? (
            <TasksScreen
              coins={player.coins}
              tasks={gameProgress.dailyTasks}
              allTasksComplete={gameProgress.allTasksComplete}
              wheelUnlocked={gameProgress.wheelUnlocked}
              wheelReady={gameProgress.wheelReady}
              wheelSpun={gameProgress.wheelSpun}
              onClaimTask={handleClaimTask}
              onOpenWheel={() => setActiveTab('wheel')}
            />
          ) : activeTab === 'shop' ? (
            <ShopScreen
              coins={player.coins}
              bait={player.bait}
              rodLevel={player.rodLevel}
              nftRods={player.nftRods}
              onBuyBait={handleBuyBait}
              onBuyRod={handleBuyRod}
            />
          ) : activeTab === 'grill' ? (
            <GrillScreen
              inventory={player.inventory}
              coins={player.coins}
              grillScore={gameProgress.grillScore}
              onCook={handleCookRecipe}
            />
          ) : activeTab === 'wheel' ? (
            <WheelScreen
              coins={player.coins}
              ready={gameProgress.wheelReady}
              tasksComplete={gameProgress.allTasksComplete}
              spun={gameProgress.wheelSpun}
              prize={gameProgress.wheelPrize}
              onSpin={handleSpinWheel}
              onOpenTasks={() => setActiveTab('tasks')}
            />
          ) : activeTab === 'map' ? (
            <MapScreen
              coins={player.coins}
              onBack={() => setActiveTab('fish')}
            />
          ) : (
            <LeaderboardScreen
              coins={player.coins}
              grillScore={gameProgress.grillScore}
              entries={leaderboardEntries}
              currentPlayerId={leaderboardPlayerId}
              isConnected={isConnected}
              walletAddress={address}
              nickname={player.nickname}
            />
          )}

          {isFishingScreen && (
            <button
              type="button"
              onClick={() => setActiveTab('map')}
              className="group absolute right-[2.5%] top-[12.5%] z-20 w-24 overflow-visible bg-transparent outline-none transition-all duration-200 hover:scale-105 focus-visible:scale-105 active:scale-95 sm:right-[2.25%] sm:top-[13.5%] sm:w-32 lg:w-36"
              aria-label="Open travel map"
            >
              <img
                src={TRAVEL_ICON_SRC}
                alt=""
                className="block w-full object-contain drop-shadow-[0_16px_30px_rgba(0,0,0,0.42)] transition-transform duration-300 group-hover:scale-[1.03]"
              />
              <span className="absolute bottom-1.5 left-1/2 -translate-x-1/2 rounded-lg border border-yellow-200/75 bg-yellow-300 px-2 py-0.5 text-[9px] font-black uppercase tracking-normal text-black shadow-lg sm:bottom-2 sm:text-[10px]">
                Travel
              </span>
            </button>
          )}

          {isFishingScreen && (
            <PlayerPanel
              player={player}
              onSetNickname={isConnected ? setNickname : undefined}
              isConnected={isConnected}
              walletAddress={address}
              onAvatarUploaded={setAvatarUrl}
            />
          )}

          {isFishingScreen && (
            <GameControls
              gameState={gameState}
              lastResult={lastResult}
              hasBait={player.bait > 0}
              onCast={castRod}
              onReelIn={reelIn}
              rodLevel={player.equippedRod}
              nftRods={player.nftRods}
              biteTimeLeft={biteTimeLeft}
              biteTimeTotal={biteTimeTotal}
            />
          )}

          {isFishingScreen && (
            <div className="absolute bottom-[calc(var(--bottom-nav-clearance,0px)+0.5rem)] left-3 z-20 flex max-w-[calc(100vw-1.5rem)] flex-col items-start gap-2 sm:left-5 sm:flex-row">
              <InventoryDialog
                inventory={player.inventory}
                rodLevel={player.rodLevel}
                equippedRod={player.equippedRod}
                nftRods={player.nftRods}
                onEquipRod={equipRod}
                onSellFish={handleSellFish}
              />
              {isConnected && (
                <BuyCoinsDialog
                  walletAddress={address}
                  onCoinsAdded={addCoins}
                  rodLevel={player.rodLevel}
                  nftRods={player.nftRods}
                  onNftMinted={mintNftRod}
                />
              )}
            </div>
          )}

          <LeaderboardNameDialog
            open={leaderboardNameOpen}
            defaultName={currentLeaderboardEntry?.name || player.nickname}
            score={Math.max(pendingLeaderboardScore, gameProgress.grillScore)}
            onSave={handleSaveLeaderboardName}
          />
          {levelUpInfo && (
            <LevelUpCelebration
              newLevel={levelUpInfo.newLevel}
              coinsReward={levelUpInfo.coinsReward}
              onDismiss={dismissLevelUp}
            />
          )}

        </div>

        <div className="pointer-events-none absolute inset-x-0 bottom-0 z-30">
          <div className="pointer-events-auto">
            <BottomNav
              activeTab={activeTab}
              onTabChange={setActiveTab}
              wheelReady={gameProgress.wheelReady}
            />
          </div>
        </div>

        <GameLoadingScreen visible={!assetsReady} progress={assetsProgress} />
      </div>
    </main>
  );
};

export default FishingGame;
