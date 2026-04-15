import React from 'react';
import WaterLily from './WaterLily';

const LakeScene: React.FC = () => {
  return (
    <div className="absolute inset-0 overflow-hidden">
      {/* Sky gradient */}
      <div 
        className="absolute inset-0"
        style={{
          background: 'linear-gradient(180deg, hsl(200, 70%, 75%) 0%, hsl(200, 60%, 85%) 50%, hsl(200, 50%, 90%) 100%)'
        }}
      />
      
      {/* Sun - moved lower */}
      <div 
        className="absolute top-4 right-12 w-16 h-16 rounded-full animate-pulse"
        style={{
          background: 'radial-gradient(circle, hsl(45, 100%, 70%) 0%, hsl(45, 100%, 60%) 50%, transparent 70%)',
          boxShadow: '0 0 40px hsl(45, 100%, 60%)'
        }}
      />
      
      {/* Single cloud */}
      <Cloud className="absolute top-6 left-[50%]" style={{ animationDelay: '0s' }} />
      
      {/* Forest - detailed trees - much larger */}
      <div className="absolute bottom-[38%] left-0 right-0 h-[50%] flex items-end">
        {/* Far back row of trees */}
        <div className="absolute bottom-0 left-0 right-0 flex items-end justify-around">
          {[...Array(20)].map((_, i) => (
            <DetailedTree 
              key={`far-${i}`} 
              height={100 + (i % 3) * 25} 
              variant={i % 3}
              className="opacity-50"
            />
          ))}
        </div>
        {/* Back row of trees */}
        <div className="absolute bottom-0 left-0 right-0 flex items-end justify-around">
          {[...Array(16)].map((_, i) => (
            <DetailedTree 
              key={`back-${i}`} 
              height={150 + (i % 4) * 40} 
              variant={i % 3}
              className="opacity-75"
            />
          ))}
        </div>
        {/* Front row of trees */}
        <div className="absolute bottom-0 left-[2%] right-[2%] flex items-end justify-around">
          {[...Array(12)].map((_, i) => (
            <DetailedTree 
              key={`front-${i}`} 
              height={200 + (i % 3) * 50} 
              variant={(i + 1) % 3}
            />
          ))}
        </div>
      </div>
      
      {/* Ground/Shore */}
      <div 
        className="absolute bottom-[35%] left-0 right-0 h-[10%]"
        style={{
          background: 'linear-gradient(180deg, hsl(120, 50%, 45%) 0%, hsl(120, 40%, 35%) 100%)',
          borderRadius: '50% 50% 0 0 / 50% 50% 0 0'
        }}
      />
      
      {/* Shore grass/reeds */}
      <div className="absolute bottom-[38%] left-0 right-0 h-[8%] flex items-end justify-around pointer-events-none z-10">
        {[...Array(30)].map((_, i) => (
          <ReedCluster 
            key={`reed-${i}`} 
            height={25 + (i % 4) * 10} 
            variant={i % 3}
            style={{ 
              marginLeft: `${(i % 5) * 2}px`,
              transform: `translateX(${Math.sin(i) * 10}px)`
            }}
          />
        ))}
      </div>
      
      {/* Lake with animated waves - much larger */}
      <div 
        className="absolute bottom-0 left-0 right-0 h-[40%] overflow-hidden"
        style={{
          background: 'linear-gradient(180deg, hsl(195, 70%, 50%) 0%, hsl(200, 80%, 35%) 100%)'
        }}
      >
        {/* Animated wave layers */}
        <div className="absolute inset-0">
          <WaveLayer delay={0} opacity={0.3} yOffset={10} />
          <WaveLayer delay={1} opacity={0.2} yOffset={30} />
          <WaveLayer delay={2} opacity={0.25} yOffset={50} />
        </div>
        
        {/* Shimmer effect on water */}
        <div className="absolute inset-0">
          {[...Array(8)].map((_, i) => (
            <div
              key={i}
              className="absolute w-2 h-1 bg-white/40 rounded-full animate-shimmer"
              style={{
                left: `${10 + i * 12}%`,
                top: `${20 + (i % 3) * 25}%`,
                animationDelay: `${i * 0.3}s`
              }}
            />
          ))}
        </div>
        
        {/* Water lilies - closer to shore (top of water area) */}
        <WaterLily 
          size={50} 
          hasFlower 
          className="absolute right-[15%] top-[2%]" 
        />
        <WaterLily 
          size={40} 
          className="absolute right-[30%] top-[5%]" 
        />
        <WaterLily 
          size={45} 
          hasFlower 
          className="absolute right-[8%] top-[8%]" 
        />
        <WaterLily 
          size={35} 
          className="absolute right-[50%] top-[3%]" 
        />
        <WaterLily 
          size={55} 
          hasFlower 
          className="absolute right-[70%] top-[6%]" 
        />
        <WaterLily 
          size={38} 
          className="absolute right-[85%] top-[4%]" 
        />
      </div>
    </div>
  );
};

const Cloud: React.FC<{ className?: string; style?: React.CSSProperties }> = ({ className, style }) => (
  <div 
    className={`animate-cloud-drift ${className}`}
    style={style}
  >
    <svg width="80" height="40" viewBox="0 0 80 40">
      <ellipse cx="25" cy="25" rx="20" ry="12" fill="white" opacity="0.9" />
      <ellipse cx="45" cy="20" rx="22" ry="15" fill="white" opacity="0.9" />
      <ellipse cx="60" cy="25" rx="18" ry="10" fill="white" opacity="0.9" />
    </svg>
  </div>
);

interface DetailedTreeProps {
  height: number;
  variant?: number;
  className?: string;
}

const DetailedTree: React.FC<DetailedTreeProps> = ({ height, variant = 0, className = '' }) => {
  const trunkHeight = height * 0.2;
  const treeWidth = height * 0.6;
  
  // Different tree color variations - richer colors
  const colors = [
    { 
      dark: 'hsl(140, 60%, 22%)', 
      medium: 'hsl(140, 55%, 30%)', 
      light: 'hsl(140, 50%, 38%)',
      highlight: 'hsl(140, 45%, 45%)',
      trunk: 'hsl(25, 45%, 25%)',
      trunkDark: 'hsl(25, 50%, 18%)'
    },
    { 
      dark: 'hsl(150, 55%, 20%)', 
      medium: 'hsl(150, 50%, 28%)', 
      light: 'hsl(150, 45%, 36%)',
      highlight: 'hsl(150, 40%, 42%)',
      trunk: 'hsl(20, 40%, 28%)',
      trunkDark: 'hsl(20, 45%, 20%)'
    },
    { 
      dark: 'hsl(130, 65%, 20%)', 
      medium: 'hsl(130, 60%, 28%)', 
      light: 'hsl(130, 55%, 35%)',
      highlight: 'hsl(130, 50%, 42%)',
      trunk: 'hsl(28, 42%, 26%)',
      trunkDark: 'hsl(28, 48%, 18%)'
    },
  ];
  
  const color = colors[variant % colors.length];
  const centerX = treeWidth / 2;
  
  return (
    <svg 
      width={treeWidth} 
      height={height} 
      viewBox={`0 0 ${treeWidth} ${height}`}
      className={className}
    >
      {/* Trunk with bark texture */}
      <rect
        x={centerX - height * 0.04}
        y={height - trunkHeight}
        width={height * 0.08}
        height={trunkHeight}
        fill={color.trunk}
      />
      {/* Trunk bark details */}
      <line
        x1={centerX - height * 0.02}
        y1={height - trunkHeight}
        x2={centerX - height * 0.02}
        y2={height}
        stroke={color.trunkDark}
        strokeWidth="2"
        opacity="0.6"
      />
      <line
        x1={centerX + height * 0.02}
        y1={height - trunkHeight + 5}
        x2={centerX + height * 0.02}
        y2={height - 5}
        stroke={color.trunkDark}
        strokeWidth="1.5"
        opacity="0.4"
      />
      
      {/* Tree crown - 5 layers for more detail */}
      {/* Layer 1 - Bottom widest */}
      <polygon
        points={`${centerX},${height * 0.12} ${treeWidth * 0.95},${height * 0.82} ${treeWidth * 0.05},${height * 0.82}`}
        fill={color.dark}
      />
      {/* Layer 2 */}
      <polygon
        points={`${centerX},${height * 0.08} ${treeWidth * 0.85},${height * 0.60} ${treeWidth * 0.15},${height * 0.60}`}
        fill={color.medium}
      />
      {/* Layer 3 */}
      <polygon
        points={`${centerX},${height * 0.04} ${treeWidth * 0.75},${height * 0.42} ${treeWidth * 0.25},${height * 0.42}`}
        fill={color.light}
      />
      {/* Layer 4 - Top */}
      <polygon
        points={`${centerX},0 ${treeWidth * 0.65},${height * 0.28} ${treeWidth * 0.35},${height * 0.28}`}
        fill={color.highlight}
      />
      
      {/* Branch shadows for depth */}
      <polygon
        points={`${treeWidth * 0.3},${height * 0.55} ${treeWidth * 0.45},${height * 0.55} ${treeWidth * 0.15},${height * 0.82}`}
        fill={color.dark}
        opacity="0.5"
      />
      <polygon
        points={`${treeWidth * 0.55},${height * 0.55} ${treeWidth * 0.70},${height * 0.55} ${treeWidth * 0.85},${height * 0.82}`}
        fill={color.dark}
        opacity="0.5"
      />
      
      {/* Light highlight on left side */}
      <polygon
        points={`${centerX},${height * 0.04} ${treeWidth * 0.25},${height * 0.42} ${treeWidth * 0.35},${height * 0.35}`}
        fill="hsla(120, 40%, 60%, 0.2)"
      />
      
      {/* Snow/frost on top tip */}
      <polygon
        points={`${centerX},0 ${centerX + height * 0.03},${height * 0.06} ${centerX - height * 0.03},${height * 0.06}`}
        fill="hsla(140, 30%, 60%, 0.5)"
      />
    </svg>
  );
};

const WaveLayer: React.FC<{ delay: number; opacity: number; yOffset: number }> = ({ delay, opacity, yOffset }) => (
  <svg 
    className="absolute w-[200%] animate-wave-move"
    style={{ 
      top: `${yOffset}%`,
      animationDelay: `${delay}s`,
      opacity
    }}
    viewBox="0 0 1200 60" 
    preserveAspectRatio="none"
  >
    <path
      d="M0 30 Q 75 10 150 30 T 300 30 T 450 30 T 600 30 T 750 30 T 900 30 T 1050 30 T 1200 30 V 60 H 0 Z"
      fill="hsla(195, 80%, 70%, 0.5)"
    />
  </svg>
);

interface ReedClusterProps {
  height: number;
  variant?: number;
  style?: React.CSSProperties;
}

const ReedCluster: React.FC<ReedClusterProps> = ({ height, variant = 0, style }) => {
  const colors = [
    { stem: 'hsl(100, 45%, 35%)', stemDark: 'hsl(100, 50%, 28%)', tip: 'hsl(35, 50%, 40%)', leaf: 'hsl(100, 40%, 42%)' },
    { stem: 'hsl(95, 50%, 32%)', stemDark: 'hsl(95, 55%, 25%)', tip: 'hsl(30, 45%, 35%)', leaf: 'hsl(95, 45%, 40%)' },
    { stem: 'hsl(105, 40%, 38%)', stemDark: 'hsl(105, 45%, 30%)', tip: 'hsl(32, 48%, 38%)', leaf: 'hsl(105, 35%, 45%)' },
  ];
  
  const color = colors[variant % colors.length];
  const stemCount = 5 + (variant % 3);
  
  return (
    <svg 
      width={height * 1.2} 
      height={height * 1.3} 
      viewBox={`0 0 ${height * 1.2} ${height * 1.3}`}
      style={style}
      className="flex-shrink-0"
    >
      {[...Array(stemCount)].map((_, i) => {
        const xOffset = (i / stemCount) * height * 0.9 + height * 0.15;
        const stemHeight = height * (0.75 + (i % 4) * 0.08);
        const curve = (i % 2 === 0 ? 1 : -1) * (4 + i * 0.8);
        const baseY = height * 1.3;
        const hasCattail = i % 3 === 0;
        
        return (
          <g key={i}>
            {/* Main stem with gradient effect */}
            <path
              d={`M${xOffset} ${baseY} Q${xOffset + curve * 0.5} ${baseY - stemHeight * 0.5} ${xOffset + curve} ${baseY - stemHeight}`}
              stroke={color.stem}
              strokeWidth="3"
              fill="none"
              strokeLinecap="round"
            />
            {/* Stem highlight */}
            <path
              d={`M${xOffset + 1} ${baseY} Q${xOffset + curve * 0.5 + 1} ${baseY - stemHeight * 0.5} ${xOffset + curve + 1} ${baseY - stemHeight}`}
              stroke={color.leaf}
              strokeWidth="1"
              fill="none"
              strokeLinecap="round"
              opacity="0.5"
            />
            
            {/* Leaves on stems */}
            {i % 2 === 0 && (
              <>
                <path
                  d={`M${xOffset + curve * 0.3} ${baseY - stemHeight * 0.4} Q${xOffset + curve * 0.3 + 12} ${baseY - stemHeight * 0.5} ${xOffset + curve * 0.3 + 18} ${baseY - stemHeight * 0.35}`}
                  stroke={color.leaf}
                  strokeWidth="2"
                  fill="none"
                  strokeLinecap="round"
                />
                <path
                  d={`M${xOffset + curve * 0.5} ${baseY - stemHeight * 0.6} Q${xOffset + curve * 0.5 - 10} ${baseY - stemHeight * 0.7} ${xOffset + curve * 0.5 - 15} ${baseY - stemHeight * 0.55}`}
                  stroke={color.stem}
                  strokeWidth="2"
                  fill="none"
                  strokeLinecap="round"
                />
              </>
            )}
            
            {/* Cattail (bulrush) on some stems */}
            {hasCattail && (
              <>
                <ellipse
                  cx={xOffset + curve}
                  cy={baseY - stemHeight - 8}
                  rx="3.5"
                  ry="10"
                  fill={color.tip}
                />
                {/* Cattail texture lines */}
                <line
                  x1={xOffset + curve - 2}
                  y1={baseY - stemHeight - 12}
                  x2={xOffset + curve - 2}
                  y2={baseY - stemHeight - 4}
                  stroke={color.stemDark}
                  strokeWidth="0.5"
                  opacity="0.4"
                />
                <line
                  x1={xOffset + curve + 2}
                  y1={baseY - stemHeight - 14}
                  x2={xOffset + curve + 2}
                  y2={baseY - stemHeight - 2}
                  stroke={color.stemDark}
                  strokeWidth="0.5"
                  opacity="0.4"
                />
              </>
            )}
            
            {/* Pointed grass tip for non-cattail stems */}
            {!hasCattail && (
              <path
                d={`M${xOffset + curve} ${baseY - stemHeight} L${xOffset + curve + 1} ${baseY - stemHeight - 6} L${xOffset + curve - 1} ${baseY - stemHeight - 5} Z`}
                fill={color.leaf}
              />
            )}
          </g>
        );
      })}
      
      {/* Additional short grass at base */}
      {[...Array(4)].map((_, i) => {
        const xPos = height * 0.2 + i * height * 0.25;
        const grassHeight = height * 0.25;
        const lean = (i % 2 === 0 ? 3 : -3);
        return (
          <path
            key={`grass-${i}`}
            d={`M${xPos} ${height * 1.3} Q${xPos + lean} ${height * 1.3 - grassHeight * 0.6} ${xPos + lean * 1.5} ${height * 1.3 - grassHeight}`}
            stroke={color.stem}
            strokeWidth="2"
            fill="none"
            strokeLinecap="round"
            opacity="0.7"
          />
        );
      })}
    </svg>
  );
};

export default LakeScene;
