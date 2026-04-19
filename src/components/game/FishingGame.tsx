import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import MonadFishCanvas from './MonadFishCanvas';
import PlayerPanel from './PlayerPanel';
import GameControls from './GameControls';
import InventoryDialog from './InventoryDialog';
import BuyCoinsDialog from './BuyCoinsDialog';
import BoostDialog from './BoostDialog';
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
import { useGameState } from '@/hooks/useGameState';
import { useGameProgress } from '@/hooks/useGameProgress';
import { useWalletAuth } from '@/hooks/useWalletAuth';
import { useBackgroundMusic } from '@/hooks/useBackgroundMusic';
import { useSoundEffects } from '@/hooks/useSoundEffects';
import { useIsMobile } from '@/hooks/use-mobile';
import { cn } from '@/lib/utils';
import { publicAsset } from '@/lib/assets';
import {
  loadMainSceneAssets,
  warmPreloadAssets,
  WARM_PRELOAD_ASSET_URLS,
  type MainSceneAssets,
} from '@/lib/mainSceneAssets';
import {
  FISH_GOT_AWAY_PANEL_SRC,
} from '@/lib/rodAssets';
import travelIconSrc from '@/assets/map_travel_icon_cutout.png';
import {
  deleteGlobalLeaderboardEntry,
  getLeaderboardPlayerId,
  hasCustomLeaderboardName,
  loadLeaderboardEntries,
  loadGlobalLeaderboardEntries,
  mergeLeaderboardEntries,
  saveGlobalLeaderboardEntry,
  upsertLeaderboardEntry,
} from '@/lib/leaderboard';
import { NFT_ROD_DATA, type DailyTaskId, type GameTab, type GrillLeaderboardEntry, type GrillRecipe, type WheelPrize } from '@/types/game';

const TRAVEL_ICON_SRC = travelIconSrc;

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
  const { isConnected, isVerified, savedPlayer, address } = useWalletAuth();
  const isMobile = useIsMobile();
  const [activeTab, setActiveTab] = useState<GameTab>('fish');
  const [assetsReady, setAssetsReady] = useState(false);
  const [assetsProgress, setAssetsProgress] = useState(0);
  const [mainSceneAssets, setMainSceneAssets] = useState<MainSceneAssets | null>(null);
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
    grantFishReward,
    dismissLevelUp,
    mintNftRod,
    setNickname,
    setAvatarUrl,
  } = useGameState({
    savedPlayer: isVerified ? savedPlayer : undefined,
    onFishCaught: gameProgress.recordFishCatch,
  });

  const sounds = useSoundEffects();
  useBackgroundMusic();
  const prevGameState = useRef(gameState);
  const prevLevel = useRef(player.level);
  const prevLeaderboardPlayerId = useRef(leaderboardPlayerId);
  const currentLeaderboardEntry = useMemo(() => (
    leaderboardEntries.find((entry) => entry.id === leaderboardPlayerId)
  ), [leaderboardEntries, leaderboardPlayerId]);
  const missXpReward = useMemo(() => {
    const nftBonus = player.nftRods.includes(player.equippedRod)
      ? NFT_ROD_DATA.find((rod) => rod.rodLevel === player.equippedRod)?.xpBonus ?? 0
      : 0;

    return Math.floor(5 * (1 + nftBonus / 100));
  }, [player.equippedRod, player.nftRods]);

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

  const refreshLeaderboard = useCallback(async () => {
    const remoteEntries = await loadGlobalLeaderboardEntries();
    if (!remoteEntries) return;

    setLeaderboardEntries(remoteEntries);
  }, []);

  useEffect(() => {
    let cancelled = false;

    setAssetsProgress(0.04);
    setBootLoaderState(0.04, 'Loading the lake...');

    void loadMainSceneAssets((loaded, total) => {
      if (cancelled) return;
      const nextProgress = Math.min(0.96, loaded / total);
      setAssetsProgress(nextProgress);
      setBootLoaderState(nextProgress, 'Loading the lake...');
    }).then((assets) => {
      if (cancelled) return;
      setMainSceneAssets(assets);
      warmPreloadAssets([
        ...WARM_PRELOAD_ASSET_URLS,
        FISH_GOT_AWAY_PANEL_SRC,
      ]);

      window.requestAnimationFrame(() => {
        window.requestAnimationFrame(() => {
          if (!cancelled) {
            setAssetsProgress(1);
            setBootLoaderState(1, 'Ready to fish...');
            setAssetsReady(true);
          }
        });
      });
    }).catch(() => {
      if (cancelled) return;
      setAssetsProgress(1);
      setBootLoaderState(1, 'Ready to fish...');
      setAssetsReady(true);
    });

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    void refreshLeaderboard().then(() => {
      if (cancelled) return;
    });

    return () => {
      cancelled = true;
    };
  }, [refreshLeaderboard]);

  useEffect(() => {
    if (activeTab !== 'leaderboard') return;
    void refreshLeaderboard();
  }, [activeTab, refreshLeaderboard]);

  useEffect(() => {
    const handleWindowFocus = () => {
      void refreshLeaderboard();
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        void refreshLeaderboard();
      }
    };

    const pollInterval = window.setInterval(() => {
      if (document.visibilityState === 'visible') {
        void refreshLeaderboard();
      }
    }, 15000);

    window.addEventListener('focus', handleWindowFocus);
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      window.clearInterval(pollInterval);
      window.removeEventListener('focus', handleWindowFocus);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [refreshLeaderboard]);

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
          if (hasCustomLeaderboardName(mergedEntry.name)) {
            void saveGlobalLeaderboardEntry(mergedEntry);
          }
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
    if (
      gameProgress.grillScore > 0
      && !hasCustomLeaderboardName(currentLeaderboardEntry?.name)
      && !leaderboardNameOpen
    ) {
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
    const applyCubeReward = (reward: WheelPrize) => {
      if (reward.type === 'fish' && reward.fishId) {
        grantFishReward(reward.fishId, reward.quantity ?? 1);
        return;
      }

      addCoins(reward.coins ?? 0);
    };

    const prize = gameProgress.spinWheel(applyCubeReward, selectedPrize);
    if (prize) {
      sounds.playLevelUpSound();
      return prize;
    }

    return null;
  };

  const handleCookRecipe = (recipe: GrillRecipe) => {
    if (!consumeFish(recipe.ingredients)) return false;
    const nextGrillScore = gameProgress.grillScore + recipe.score;
    gameProgress.recordGrillDish(recipe.score);
    if (hasCustomLeaderboardName(currentLeaderboardEntry?.name)) {
      saveCurrentLeaderboardEntry(currentLeaderboardEntry.name, nextGrillScore, 1);
    } else {
      setPendingLeaderboardScore(nextGrillScore);
      setPendingLeaderboardDishes(1);
      setLeaderboardNameOpen(true);
    }
    sounds.playSellSound();
    return true;
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
              assets={mainSceneAssets}
            />
          ) : activeTab === 'tasks' ? (
            <TasksScreen
              coins={player.coins}
              tasks={gameProgress.dailyTasks}
              allTasksComplete={gameProgress.allTasksComplete}
              availableWheelRolls={gameProgress.availableWheelRolls}
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
              availableRolls={gameProgress.availableWheelRolls}
              dailyWheelRolls={gameProgress.dailyWheelRolls}
              paidWheelRolls={gameProgress.paidWheelRolls}
              allTasksComplete={gameProgress.allTasksComplete}
              walletAddress={address}
              onSpin={handleSpinWheel}
              onBuySpin={gameProgress.addPaidWheelRolls}
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
            <div className="absolute right-[2.5%] top-[12.5%] z-20 flex flex-col items-center gap-3 sm:right-[2.25%] sm:top-[13.5%]">
              <button
                type="button"
                onClick={() => setActiveTab('map')}
                className="group relative w-24 overflow-visible bg-transparent outline-none transition-all duration-200 hover:scale-105 focus-visible:scale-105 active:scale-95 sm:w-32 lg:w-36"
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
              <BoostDialog walletAddress={address} />
              <InventoryDialog
                inventory={player.inventory}
                rodLevel={player.rodLevel}
                equippedRod={player.equippedRod}
                nftRods={player.nftRods}
                onEquipRod={equipRod}
                onSellFish={handleSellFish}
                triggerVariant="shortcut"
              />
            </div>
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
              ownedRodLevel={player.rodLevel}
              nftRods={player.nftRods}
              biteTimeLeft={biteTimeLeft}
              biteTimeTotal={biteTimeTotal}
              missXpReward={missXpReward}
              isMobile={isMobile}
            />
          )}

          {isFishingScreen && isConnected && (
            <div
              className="absolute left-3 z-20 flex max-w-[calc(100vw-1.5rem)] flex-col items-start gap-2 sm:left-5 sm:flex-row"
              style={{
                bottom: isMobile
                  ? 'calc(var(--bottom-nav-clearance,0px) + 4rem)'
                  : 'calc(var(--bottom-nav-clearance,0px) + 1.1rem)',
              }}
            >
              <BuyCoinsDialog
                walletAddress={address}
                onCoinsAdded={addCoins}
                rodLevel={player.rodLevel}
                nftRods={player.nftRods}
                onNftMinted={mintNftRod}
              />
            </div>
          )}

          <LeaderboardNameDialog
            open={leaderboardNameOpen}
            defaultName={hasCustomLeaderboardName(currentLeaderboardEntry?.name)
              ? currentLeaderboardEntry?.name
              : player.nickname}
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
