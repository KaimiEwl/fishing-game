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
import {
  getLeaderboardPlayerId,
  loadLeaderboardEntries,
  upsertLeaderboardEntry,
} from '@/lib/leaderboard';
import type { DailyTaskId, GameTab, GrillLeaderboardEntry, GrillRecipe, WheelPrize } from '@/types/game';
import { Mail } from 'lucide-react';

const PRELOAD_ASSETS = [
  publicAsset('assets/pepe_final.png'),
  publicAsset('assets/rod_basic.png'),
  publicAsset('assets/rod_bamboo.png'),
  publicAsset('assets/rod_carbon.png'),
  publicAsset('assets/rod_pro.png'),
  publicAsset('assets/rod_legendary.png'),
  publicAsset('assets/bg_tasks.jpg'),
  publicAsset('assets/bg_wheel.jpg'),
  ...Object.values(FISH_IMAGE_SRC),
];

const preloadImage = (src: string) => new Promise<void>((resolve) => {
  const img = new Image();
  img.onload = () => resolve();
  img.onerror = () => resolve();
  img.src = src;
  if (img.complete) resolve();
});

const FishingGame: React.FC = () => {
  const { isConnected, isVerified, savedPlayer, saveProgress, address } = useWalletAuth();
  const isMobile = useIsMobile();
  const [activeTab, setActiveTab] = useState<GameTab>('fish');
  const [assetsReady, setAssetsReady] = useState(false);
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
  const currentLeaderboardEntry = useMemo(() => (
    leaderboardEntries.find((entry) => entry.id === leaderboardPlayerId)
  ), [leaderboardEntries, leaderboardPlayerId]);

  const saveCurrentLeaderboardEntry = useCallback((name: string, score: number, dishesDelta = 0) => {
    setLeaderboardEntries((entries) => upsertLeaderboardEntry({
      entries,
      id: leaderboardPlayerId,
      name,
      score,
      dishesDelta,
      walletAddress: address,
    }));
  }, [address, leaderboardPlayerId]);

  useEffect(() => {
    let cancelled = false;
    const uniqueAssets = Array.from(new Set(PRELOAD_ASSETS));
    const loadAll = Promise.all(uniqueAssets.map(preloadImage));
    const maxWait = new Promise<void>((resolve) => window.setTimeout(resolve, 2400));

    Promise.race([loadAll.then(() => undefined), maxWait]).then(() => {
      if (!cancelled) setAssetsReady(true);
    });

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    setLeaderboardPlayerId(getLeaderboardPlayerId(address));
  }, [address]);

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

  const handleSpinWheel = (): WheelPrize | null => {
    const prize = gameProgress.spinWheel(addCoins);
    if (prize) sounds.playLevelUpSound();
    return prize;
  };

  const handleCookRecipe = (recipe: GrillRecipe) => {
    if (!consumeFish(recipe.ingredients)) return;
    const nextGrillScore = gameProgress.grillScore + recipe.score;
    gameProgress.recordGrillDish(recipe.score);
    if (currentLeaderboardEntry?.name) {
      saveCurrentLeaderboardEntry(currentLeaderboardEntry.name, nextGrillScore, 1);
    } else {
      setPendingLeaderboardScore(nextGrillScore);
      setPendingLeaderboardDishes(1);
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
  const bottomNavClearance = isMobile ? 164 : 128;

  return (
    <main className="fixed inset-0 overflow-hidden bg-black">
      <div
        data-device={isMobile ? 'mobile' : 'desktop'}
        className="relative mx-auto overflow-hidden bg-black"
        style={{
          '--bottom-nav-clearance': `${bottomNavClearance}px`,
          width: '100vw',
          maxWidth: isMobile ? '100vw' : '1920px',
          height: '100vh',
          minHeight: '100vh',
        } as React.CSSProperties}
      >
        <div className={cn('absolute inset-0 transition-opacity duration-300', assetsReady ? 'opacity-100' : 'opacity-0')}>
          {isFishingScreen ? (
            <MonadFishCanvas
              onCast={castRod}
              gameState={gameState}
              lastResult={lastResult}
              rodLevel={player.equippedRod}
              bottomClearance={bottomNavClearance}
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
            <div className="fixed bottom-[calc(var(--bottom-nav-clearance,0px)+0.75rem)] left-3 z-20 flex flex-col items-start gap-2 sm:bottom-28 sm:left-5 sm:flex-row">
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

          <BottomNav
            activeTab={activeTab}
            onTabChange={setActiveTab}
            wheelReady={gameProgress.wheelReady}
          />

          <a
            href="mailto:support@monadfish.xyz"
            className="fixed right-3 top-3 z-20 inline-flex h-10 items-center gap-2 rounded-lg border border-cyan-300/15 bg-black/75 px-3 text-xs font-semibold text-zinc-300 shadow-lg backdrop-blur-md transition-colors hover:bg-zinc-950 hover:text-cyan-100 sm:right-5 sm:top-5"
            aria-label="Contact support"
          >
            <Mail className="h-4 w-4" />
            <span className={cn(isMobile && 'sr-only')}>Contact</span>
          </a>

          {levelUpInfo && (
            <LevelUpCelebration
              newLevel={levelUpInfo.newLevel}
              coinsReward={levelUpInfo.coinsReward}
              onDismiss={dismissLevelUp}
            />
          )}

          <LeaderboardNameDialog
            open={leaderboardNameOpen}
            defaultName={player.nickname}
            score={Math.max(pendingLeaderboardScore, gameProgress.grillScore)}
            onSave={handleSaveLeaderboardName}
          />
        </div>

        <GameLoadingScreen visible={!assetsReady} />
      </div>
    </main>
  );
};

export default FishingGame;
