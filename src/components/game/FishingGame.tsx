import React, { useEffect, useRef } from 'react';
import MonadFishCanvas from './MonadFishCanvas';
import PlayerPanel from './PlayerPanel';
import GameControls from './GameControls';
import InventoryDialog from './InventoryDialog';
import ShopDialog from './ShopDialog';
import BuyCoinsDialog from './BuyCoinsDialog';
import LevelUpCelebration from './LevelUpCelebration';
import { useGameState } from '@/hooks/useGameState';
import { useWalletAuth } from '@/hooks/useWalletAuth';
import { useSoundEffects } from '@/hooks/useSoundEffects';
import { useIsMobile } from '@/hooks/use-mobile';
import { cn } from '@/lib/utils';
import { Mail } from 'lucide-react';

const FishingGame: React.FC = () => {
  const { isConnected, isVerified, savedPlayer, saveProgress, address } = useWalletAuth();
  const isMobile = useIsMobile();

  const { player, gameState, lastResult, levelUpInfo, biteTimeLeft, biteTimeTotal, castRod, reelIn, sellFish, buyBait, buyRod, equipRod, addCoins, dismissLevelUp, mintNftRod, setNickname, setAvatarUrl } = useGameState({
    savedPlayer: isConnected ? savedPlayer : undefined,
    onSave: isVerified ? saveProgress : undefined,
  });

  const sounds = useSoundEffects();
  const prevGameState = useRef(gameState);
  const prevLevel = useRef(player.level);

  // Play sounds based on game state changes
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
      } else if (gameState === 'catching') {
        // reeling sound (reuse cast)
      } else if (gameState === 'result') {
        if (lastResult?.success) {
          sounds.playSuccessSound();
        } else {
          sounds.playFailSound();
        }
      }
    }
  }, [gameState, lastResult, sounds]);

  // Play level up sound
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

  return (
    <main className="fixed inset-0 bg-black overflow-hidden">
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
      <MonadFishCanvas onCast={castRod} gameState={gameState} lastResult={lastResult} rodLevel={player.equippedRod} />

      <PlayerPanel player={player} onSetNickname={isConnected ? setNickname : undefined} isConnected={isConnected} walletAddress={address} onAvatarUploaded={setAvatarUrl} />

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

      <div className="fixed bottom-3 left-3 sm:bottom-5 sm:left-5 z-20 flex flex-col items-start gap-2">
        <InventoryDialog
          inventory={player.inventory}
          rodLevel={player.rodLevel}
          equippedRod={player.equippedRod}
          nftRods={player.nftRods}
          onEquipRod={equipRod}
          onSellFish={handleSellFish}
        />
        <ShopDialog
          coins={player.coins}
          bait={player.bait}
          rodLevel={player.rodLevel}
          nftRods={player.nftRods}
          onBuyBait={handleBuyBait}
          onBuyRod={handleBuyRod}
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


      <a
        href="mailto:support@monadfish.xyz"
        className="fixed top-3 right-3 sm:top-5 sm:right-5 z-20 inline-flex h-10 items-center gap-2 rounded-lg border border-white/15 bg-black/45 px-3 text-xs font-semibold text-white/75 shadow-lg backdrop-blur-md transition-colors hover:bg-black/60 hover:text-white"
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
