import React, { useState, useEffect } from 'react';
import { GameState } from '@/types/game';
import characterAnimation from '@/assets/character-animation.webm';

interface CharacterBoatProps {
  gameState: GameState;
  isHappy?: boolean;
}

const CharacterBoat: React.FC<CharacterBoatProps> = ({ gameState, isHappy = false }) => {
  const [showSplash, setShowSplash] = useState(false);

  // Show splash when bobber enters water
  useEffect(() => {
    if (gameState === 'waiting') {
      setShowSplash(true);
      const timer = setTimeout(() => setShowSplash(false), 600);
      return () => clearTimeout(timer);
    }
  }, [gameState]);

  // Only bounce animation on successful catch - video handles character animation
  const getAnimation = () => {
    if (isHappy) return 'animate-happy-bounce';
    return '';
  };

  // Calculate bobber position based on game state
  const getBobberState = () => {
    if (gameState === 'idle') return { visible: false, y: 0, underwater: false };
    if (gameState === 'casting') return { visible: true, y: -80, underwater: false }; // Flying through air
    if (gameState === 'waiting') return { visible: true, y: 60, underwater: false }; // Floating on water
    if (gameState === 'catching') return { visible: true, y: 90, underwater: true }; // Pulled underwater
    if (gameState === 'result') return { visible: true, y: 60, underwater: false };
    return { visible: false, y: 0, underwater: false };
  };

  const bobberState = getBobberState();
  
  // Rod tip position relative to character video (approximate position of fishing rod tip)
  const rodTipX = 290;
  const rodTipY = 95;

  // Bobber landing position (in water, to the right of the boat)
  const bobberEndX = 420;
  const bobberEndY = rodTipY + bobberState.y;

  return (
    <div className={`relative ${getAnimation()}`}>
      {/* Character animation video with transparent background */}
      <video 
        src={characterAnimation} 
        autoPlay
        loop
        muted
        playsInline
        className="w-96 h-auto object-contain"
        style={{
          filter: 'drop-shadow(2px 4px 8px rgba(0,0,0,0.3))'
        }}
      />
      
      {/* Fishing line and bobber - positioned relative to rod tip */}
      {bobberState.visible && (
        <svg 
          className="absolute top-0 left-0 overflow-visible pointer-events-none"
          width="500" 
          height="300"
          style={{ zIndex: 5 }}
        >
          {/* Fishing line - curved path from rod tip to bobber */}
          <path
            d={`M ${rodTipX} ${rodTipY} 
                Q ${rodTipX + 40} ${rodTipY + 20}, 
                  ${(rodTipX + bobberEndX) / 2} ${(rodTipY + bobberEndY) / 2 + 30}
                Q ${bobberEndX - 30} ${bobberEndY - 20}, 
                  ${bobberEndX} ${bobberEndY - 15}`}
            stroke="hsla(0, 0%, 15%, 0.7)"
            strokeWidth="1.5"
            fill="none"
            className={gameState === 'casting' ? 'animate-line-swing' : 'transition-all duration-500'}
          />
          
          {/* Bobber group */}
          <g 
            transform={`translate(${bobberEndX}, ${bobberEndY})`}
            className={`
              ${gameState === 'waiting' ? 'animate-bobber-float' : ''}
              ${gameState === 'catching' ? 'animate-bobber-sink' : ''}
              ${gameState === 'casting' ? 'animate-bobber-fly' : ''}
            `}
            style={{
              transition: gameState === 'casting' ? 'none' : 'transform 0.5s ease-out'
            }}
          >
            {/* Bobber body */}
            <ellipse 
              cx="0" 
              cy="5" 
              rx="8" 
              ry="10" 
              fill={bobberState.underwater ? "hsl(0, 50%, 40%)" : "hsl(0, 70%, 50%)"}
              style={{
                transition: 'fill 0.3s ease'
              }}
            />
            {/* Bobber top - white part */}
            <ellipse 
              cx="0" 
              cy="-3" 
              rx="6" 
              ry="5" 
              fill={bobberState.underwater ? "hsla(0, 0%, 100%, 0.5)" : "white"}
              style={{
                transition: 'fill 0.3s ease'
              }}
            />
            {/* Bobber antenna */}
            {!bobberState.underwater && (
              <>
                <line 
                  x1="0" y1="-8" x2="0" y2="-20" 
                  stroke="hsl(30, 40%, 30%)" 
                  strokeWidth="2" 
                  strokeLinecap="round" 
                />
                {/* Antenna tip */}
                <circle cx="0" cy="-21" r="3" fill="hsl(45, 90%, 50%)" />
              </>
            )}
          </g>

          {/* Water splash when bobber enters water */}
          {showSplash && (
            <g transform={`translate(${bobberEndX}, ${bobberEndY + 10})`}>
              <ellipse 
                cx="0" cy="0" rx="8" ry="3" 
                fill="none" 
                stroke="hsla(200, 80%, 90%, 0.9)" 
                strokeWidth="3"
                className="animate-ripple-expand"
              />
              <ellipse 
                cx="0" cy="0" rx="8" ry="3" 
                fill="none" 
                stroke="hsla(200, 80%, 90%, 0.7)" 
                strokeWidth="2"
                className="animate-ripple-expand"
                style={{ animationDelay: '0.1s' }}
              />
              <ellipse 
                cx="0" cy="0" rx="8" ry="3" 
                fill="none" 
                stroke="hsla(200, 80%, 90%, 0.5)" 
                strokeWidth="1.5"
                className="animate-ripple-expand"
                style={{ animationDelay: '0.2s' }}
              />
            </g>
          )}

          {/* Continuous ripples while waiting */}
          {gameState === 'waiting' && !showSplash && (
            <g transform={`translate(${bobberEndX}, ${bobberEndY + 15})`}>
              <ellipse 
                cx="0" cy="0" rx="12" ry="5" 
                fill="none" 
                stroke="hsla(200, 70%, 85%, 0.5)" 
                strokeWidth="1"
                className="animate-ripple-slow"
              />
              <ellipse 
                cx="0" cy="0" rx="12" ry="5" 
                fill="none" 
                stroke="hsla(200, 70%, 85%, 0.3)" 
                strokeWidth="1"
                className="animate-ripple-slow"
                style={{ animationDelay: '1s' }}
              />
            </g>
          )}

          {/* Catching - bobber underwater with intense ripples */}
          {gameState === 'catching' && (
            <g transform={`translate(${bobberEndX}, ${bobberEndY - 10})`}>
              {/* Multiple concentric circles */}
              <ellipse 
                cx="0" cy="0" rx="10" ry="4" 
                fill="none" 
                stroke="hsla(200, 90%, 95%, 0.9)" 
                strokeWidth="3"
                className="animate-ripple-intense"
              />
              <ellipse 
                cx="0" cy="0" rx="10" ry="4" 
                fill="none" 
                stroke="hsla(200, 80%, 90%, 0.7)" 
                strokeWidth="2"
                className="animate-ripple-intense"
                style={{ animationDelay: '0.15s' }}
              />
              <ellipse 
                cx="0" cy="0" rx="10" ry="4" 
                fill="none" 
                stroke="hsla(200, 70%, 85%, 0.5)" 
                strokeWidth="2"
                className="animate-ripple-intense"
                style={{ animationDelay: '0.3s' }}
              />
              <ellipse 
                cx="0" cy="0" rx="10" ry="4" 
                fill="none" 
                stroke="hsla(200, 60%, 80%, 0.3)" 
                strokeWidth="1.5"
                className="animate-ripple-intense"
                style={{ animationDelay: '0.45s' }}
              />
              
              {/* Splash droplets */}
              <circle cx="-15" cy="-8" r="3" fill="hsla(200, 80%, 90%, 0.6)" className="animate-droplet" />
              <circle cx="12" cy="-12" r="2" fill="hsla(200, 80%, 90%, 0.6)" className="animate-droplet" style={{ animationDelay: '0.1s' }} />
              <circle cx="18" cy="-5" r="2.5" fill="hsla(200, 80%, 90%, 0.6)" className="animate-droplet" style={{ animationDelay: '0.2s' }} />
              <circle cx="-10" cy="-15" r="2" fill="hsla(200, 80%, 90%, 0.6)" className="animate-droplet" style={{ animationDelay: '0.15s' }} />
            </g>
          )}
        </svg>
      )}
      
      {/* Boat shadow on water */}
      <div 
        className="absolute -bottom-4 left-1/2 -translate-x-1/2 w-[420px] h-14 rounded-[50%]"
        style={{
          background: 'radial-gradient(ellipse, rgba(0,20,40,0.6) 0%, rgba(0,40,60,0.4) 30%, rgba(0,60,80,0.2) 50%, transparent 70%)',
          filter: 'blur(5px)'
        }}
      />
    </div>
  );
};

export default CharacterBoat;
