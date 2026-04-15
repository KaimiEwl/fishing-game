import React, { useEffect, useRef } from 'react';
import MonadFishCanvas from './MonadFishCanvas';
import PlayerPanel from './PlayerPanel';
import GameControls from './GameControls';
import InventoryDialog from './InventoryDialog';
import ShopDialog from './ShopDialog';
import BuyCoinsDialog from './BuyCoinsDialog';
import WalletButton from './WalletButton';
import LevelUpCelebration from './LevelUpCelebration';
import { useGameState } from '@/hooks/useGameState';
import { useWalletAuth } from '@/hooks/useWalletAuth';
import { useSoundEffects } from '@/hooks/useSoundEffects';
import { Link } from 'react-router-dom';

const FishingGame: React.FC = () => {
  const { isConnected, isVerified, isVerifying, savedPlayer, saveProgress, address } = useWalletAuth();

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
    <div className="bg-black w-full h-screen flex justify-center items-stretch">
    <div 
      className="relative h-screen overflow-hidden bg-black"
      style={{ width: 'min(100vw, calc(100vh * 4 / 5))' }}
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

      <div className="absolute bottom-2 left-2 sm:bottom-4 sm:left-4 z-20 flex flex-col gap-1.5 sm:gap-2">
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


      <div className="absolute bottom-2 right-2 sm:bottom-4 sm:right-4 z-20 flex items-center gap-3 text-[10px] sm:text-xs text-muted-foreground/50">
        <a href="mailto:support@monadfish.xyz" className="hover:text-muted-foreground transition-colors">Contact</a>
      </div>

      {levelUpInfo && (
        <LevelUpCelebration
          newLevel={levelUpInfo.newLevel}
          coinsReward={levelUpInfo.coinsReward}
          onDismiss={dismissLevelUp}
        />
      )}
    </div>
    </div>
  );
};

export default FishingGame;
