import React from 'react';

const LILY_SIZES = {
  sm: { width: 35, height: 21 },
  md: { width: 42, height: 25 },
  lg: { width: 50, height: 30 },
  xl: { width: 56, height: 34 },
} as const;

interface WaterLilyProps {
  size?: keyof typeof LILY_SIZES;
  hasFlower?: boolean;
}

const WaterLily: React.FC<WaterLilyProps> = ({ size = 'md', hasFlower = false }) => {
  const dimensions = LILY_SIZES[size];

  return (
    <svg
      width={dimensions.width}
      height={dimensions.height}
      viewBox="0 0 60 36"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className="animate-float"
    >
      {/* Lily pad (leaf) */}
      <ellipse
        cx="30"
        cy="20"
        rx="28"
        ry="14"
        fill="hsl(130, 50%, 35%)"
      />
      
      {/* Leaf darker center */}
      <ellipse
        cx="30"
        cy="20"
        rx="20"
        ry="10"
        fill="hsl(130, 45%, 30%)"
        opacity="0.5"
      />
      
      {/* Leaf cut (notch) */}
      <path
        d="M 30 20 L 30 6 L 38 12 Z"
        fill="hsl(195, 70%, 50%)"
      />
      
      {/* Leaf veins */}
      <path
        d="M 30 20 L 10 18"
        stroke="hsl(130, 40%, 25%)"
        strokeWidth="0.5"
        opacity="0.6"
      />
      <path
        d="M 30 20 L 50 18"
        stroke="hsl(130, 40%, 25%)"
        strokeWidth="0.5"
        opacity="0.6"
      />
      <path
        d="M 30 20 L 20 28"
        stroke="hsl(130, 40%, 25%)"
        strokeWidth="0.5"
        opacity="0.6"
      />
      <path
        d="M 30 20 L 40 28"
        stroke="hsl(130, 40%, 25%)"
        strokeWidth="0.5"
        opacity="0.6"
      />
      
      {/* Flower */}
      {hasFlower && (
        <g transform="translate(25, 5)">
          {/* Petals */}
          <ellipse cx="5" cy="8" rx="4" ry="7" fill="hsl(330, 70%, 85%)" transform="rotate(-30 5 8)" />
          <ellipse cx="10" cy="6" rx="4" ry="7" fill="hsl(330, 75%, 90%)" transform="rotate(0 10 6)" />
          <ellipse cx="15" cy="8" rx="4" ry="7" fill="hsl(330, 70%, 85%)" transform="rotate(30 15 8)" />
          <ellipse cx="7" cy="10" rx="3" ry="5" fill="hsl(330, 65%, 80%)" transform="rotate(-15 7 10)" />
          <ellipse cx="13" cy="10" rx="3" ry="5" fill="hsl(330, 65%, 80%)" transform="rotate(15 13 10)" />
          
          {/* Flower center */}
          <circle cx="10" cy="10" r="3" fill="hsl(45, 90%, 60%)" />
        </g>
      )}
    </svg>
  );
};

export default WaterLily;
