import React from 'react';

const RINGS = [
  { left: '50%', top: '50%', size: 'h-24 w-24', delay: '0ms', className: 'border-[#836EF9]/55' },
  { left: '50%', top: '50%', size: 'h-40 w-40', delay: '150ms', className: 'border-emerald-200/35' },
  { left: '34%', top: '34%', size: 'h-20 w-20', delay: '230ms', className: 'border-cyan-200/30' },
  { left: '67%', top: '36%', size: 'h-20 w-20', delay: '310ms', className: 'border-fuchsia-200/30' },
] as const;

const PARTICLES = [
  { left: '50%', top: '50%', x: '-6.9rem', y: '-5.8rem', delay: '0ms', color: '#9B87F5' },
  { left: '50%', top: '50%', x: '6.8rem', y: '-5.5rem', delay: '55ms', color: '#22d3ee' },
  { left: '50%', top: '50%', x: '-7.6rem', y: '0.6rem', delay: '110ms', color: '#facc15' },
  { left: '50%', top: '50%', x: '7.4rem', y: '0.5rem', delay: '165ms', color: '#14f195' },
  { left: '50%', top: '50%', x: '-4.6rem', y: '6.2rem', delay: '220ms', color: '#67e8f9' },
  { left: '50%', top: '50%', x: '4.8rem', y: '6.4rem', delay: '275ms', color: '#f0abfc' },
  { left: '35%', top: '35%', x: '-3.8rem', y: '-3rem', delay: '180ms', color: '#ffffff' },
  { left: '35%', top: '35%', x: '3.5rem', y: '-2.6rem', delay: '245ms', color: '#22d3ee' },
  { left: '66%', top: '37%', x: '-3.3rem', y: '-2.8rem', delay: '230ms', color: '#c084fc' },
  { left: '66%', top: '37%', x: '3.6rem', y: '-2.3rem', delay: '300ms', color: '#facc15' },
] as const;

const COMETS = [
  { left: '50%', top: '50%', x: '-8.8rem', y: '-1.4rem', angle: '-18deg', delay: '70ms', color: '#22d3ee' },
  { left: '50%', top: '50%', x: '8.4rem', y: '-1.1rem', angle: '16deg', delay: '130ms', color: '#f0abfc' },
  { left: '50%', top: '50%', x: '-6rem', y: '5.5rem', angle: '-42deg', delay: '210ms', color: '#14f195' },
  { left: '50%', top: '50%', x: '6.3rem', y: '5.2rem', angle: '42deg', delay: '260ms', color: '#facc15' },
] as const;

interface MonadCelebrationFireworksProps {
  className?: string;
  clipClassName?: string;
}

const styleVars = (values: {
  left: string;
  top: string;
  x?: string;
  y?: string;
  delay?: string;
  color?: string;
  angle?: string;
}) => ({
  left: values.left,
  top: values.top,
  '--tx': values.x,
  '--ty': values.y,
  '--delay': values.delay ?? '0ms',
  '--color': values.color,
  '--angle': values.angle,
} as React.CSSProperties);

const MonadCelebrationFireworks: React.FC<MonadCelebrationFireworksProps> = ({
  className = '',
  clipClassName = 'rounded-[1.4rem]',
}) => (
  <div
    className={`pointer-events-none absolute inset-0 overflow-hidden ${clipClassName} ${className}`}
    aria-hidden="true"
  >
    {RINGS.map((ring, index) => (
      <span
        key={`ring-${index}`}
        className={`absolute -translate-x-1/2 -translate-y-1/2 rounded-full border animate-monad-firework-ring ${ring.size} ${ring.className}`}
        style={{
          left: ring.left,
          top: ring.top,
          animationDelay: ring.delay,
        }}
      />
    ))}
    {COMETS.map((comet, index) => (
      <span
        key={`comet-${index}`}
        className="monad-firework-comet absolute h-1.5 w-12 rounded-full"
        style={styleVars(comet)}
      />
    ))}
    {PARTICLES.map((particle, index) => (
      <span
        key={`particle-${index}`}
        className="monad-firework-particle absolute h-2.5 w-2.5 rounded-full"
        style={styleVars(particle)}
      />
    ))}
  </div>
);

export default MonadCelebrationFireworks;
