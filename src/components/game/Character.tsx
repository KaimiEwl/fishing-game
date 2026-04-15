import React from 'react';
import { GameState } from '@/types/game';
import characterImage from '@/assets/character-new.png';

interface CharacterProps {
  gameState: GameState;
  isHappy?: boolean;
}

const Character: React.FC<CharacterProps> = ({ gameState, isHappy = false }) => {
  const getBodyAnimation = () => {
    if (isHappy) return 'animate-happy-bounce';
    return '';
  };

  return (
    <div className={`relative ${getBodyAnimation()}`}>
      {/* Character image - larger and positioned better */}
      <img 
        src={characterImage} 
        alt="Monad Pepe" 
        className="w-48 h-48 object-contain"
        style={{
          filter: 'drop-shadow(2px 4px 6px rgba(0,0,0,0.3))'
        }}
      />
    </div>
  );
};

export default Character;
