import React from 'react';
import { GameState } from '@/types/game';
import characterImage from '@/assets/character-new.png';

interface CharacterProps {
  gameState: GameState;
  isHappy?: boolean;
}

const Character: React.FC<CharacterProps> = ({ gameState, isHappy = false }) => {
  void gameState;
  const getBodyAnimation = () => {
    if (isHappy) return 'animate-happy-bounce';
    return '';
  };

  return (
    <div className={`relative ${getBodyAnimation()}`}>
      <img
        src={characterImage}
      alt="Fishing character"
        className="h-48 w-48 object-contain drop-shadow-[2px_4px_6px_rgba(0,0,0,0.3)]"
      />
    </div>
  );
};

export default Character;
