import React, { useEffect, useRef, useState } from 'react';
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
import LevelUpCelebration from './LevelUpCelebration';
import { useGameState } from '@/hooks/useGameState';
import { useGameProgress } from '@/hooks/useGameProgress';
import { useWalletAuth } from '@/hooks/useWalletAuth';
import { useSoundEffects } from '@/hooks/useSoundEffects';
import { useIsMobile } from '@/hooks/use-mobile';
import { cn } from '@/lib/utils';
import type { DailyTaskId, GameTab, GrillRecipe, WheelPrize } from '@/types/game';
import { Mail } from 'lucide-react';

const FishingGame: React.FC = () => {
  const { isConnected, isVerified, savedPlayer, saveProgress, address } = useWalletAuth();
  const isMobile = useIsMobile();
  const [activeTab, setActiveTab] = useState<GameTab>('fish');
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
    gameProgress.recordGrillDish(recipe.score);
    sounds.playSellSound();
  };

  const isFishingScreen = activeTab === 'fish';

  return (
    <main className="fixed inset-0 overflow-hidden bg-black">
      <div
        data-device={isMobile ? 'mobile' : 'desktop'}
        className="relative mx-auto overflow-hidden bg-black"
        style={{
          width: '100vw',
          maxWidth: isMobile ? '100vw' : '1920px',
          height: '100vh',
          minHeight: '100vh',
        }}
      >
        {isFishingScreen ? (
          <MonadFishCanvas onCast={castRod} gameState={gameState} lastResult={lastResult} rodLevel={player.equippedRod} />
        ) : activeTab === 'tasks' ? (
          <TasksScreen
            coins={player.coins}
            tasks={gameProgress.dailyTasks}
            allTasksComplete={gameProgress.allTasksComplete}
            wheelReady={gameProgress.wheelReady}
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
            spun={gameProgress.wheelSpun}
            prize={gameProgress.wheelPrize}
            onSpin={handleSpinWheel}
          />
        ) : (
          <LeaderboardScreen
            coins={player.coins}
            grillScore={gameProgress.grillScore}
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
          <div className="fixed bottom-40 left-3 z-20 flex flex-col items-start gap-2 sm:bottom-28 sm:left-5 sm:flex-row">
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
          className="fixed right-3 top-3 z-20 inline-flex h-10 items-center gap-2 rounded-lg border border-white/15 bg-black/45 px-3 text-xs font-semibold text-white/75 shadow-lg backdrop-blur-md transition-colors hover:bg-black/60 hover:text-white sm:right-5 sm:top-5"
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
      </div>
    </main>
  );
};

export default FishingGame;
