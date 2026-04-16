import React, { useEffect, useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import CoinIcon from './CoinIcon';

interface Particle {
  id: number;
  x: number;
  y: number;
  color: string;
  size: number;
  speedX: number;
  speedY: number;
  rotation: number;
  rotationSpeed: number;
  opacity: number;
}

interface LevelUpCelebrationProps {
  newLevel: number;
  coinsReward: number;
  onDismiss: () => void;
}

const COLORS = ['#FFD700', '#FF6B6B', '#4ECDC4', '#A855F7', '#3B82F6', '#F97316', '#EC4899'];

const LevelUpCelebration: React.FC<LevelUpCelebrationProps> = ({ newLevel, coinsReward, onDismiss }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const particlesRef = useRef<Particle[]>([]);
  const animFrameRef = useRef<number>(0);
  const [visible, setVisible] = useState(true);

  // Create confetti particles
  useEffect(() => {
    const particles: Particle[] = [];
    for (let i = 0; i < 120; i++) {
      particles.push({
        id: i,
        x: Math.random() * window.innerWidth,
        y: -20 - Math.random() * 300,
        color: COLORS[Math.floor(Math.random() * COLORS.length)],
        size: 4 + Math.random() * 6,
        speedX: (Math.random() - 0.5) * 4,
        speedY: 2 + Math.random() * 4,
        rotation: Math.random() * 360,
        rotationSpeed: (Math.random() - 0.5) * 10,
        opacity: 1,
      });
    }
    particlesRef.current = particles;

    const canvas = canvasRef.current;
    if (!canvas) return;
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const animate = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      particlesRef.current.forEach(p => {
        p.x += p.speedX;
        p.y += p.speedY;
        p.speedY += 0.05; // gravity
        p.rotation += p.rotationSpeed;
        p.opacity = Math.max(0, p.opacity - 0.003);

        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate((p.rotation * Math.PI) / 180);
        ctx.globalAlpha = p.opacity;
        ctx.fillStyle = p.color;
        ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size * 0.6);
        ctx.restore();
      });

      animFrameRef.current = requestAnimationFrame(animate);
    };

    animate();

    return () => cancelAnimationFrame(animFrameRef.current);
  }, []);

  const handleDismiss = () => {
    setVisible(false);
    setTimeout(onDismiss, 300);
  };

  const bonusChance = Math.min((newLevel - 1), 20) * 0.5;

  return (
    <div
      className={`fixed inset-0 z-50 flex items-center justify-center transition-opacity duration-300 ${visible ? 'opacity-100' : 'opacity-0'}`}
    >
      <canvas ref={canvasRef} className="absolute inset-0 pointer-events-none" />
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={handleDismiss} />

      <div className="animate-scale-in relative mx-4 w-full max-w-sm rounded-3xl border border-cyan-300/20 bg-black/95 p-8 text-center text-zinc-100 shadow-2xl backdrop-blur-md">
        <div
          className="mx-auto -mt-14 mb-4 flex h-20 w-20 items-center justify-center rounded-full border-4 border-black text-3xl font-bold shadow-lg"
          style={{
            background: 'linear-gradient(135deg, #020617, #083344)',
            color: '#cffafe'
          }}
        >
          {newLevel}
        </div>

        <h2 className="mb-1 text-2xl font-bold text-zinc-100">Level Up!</h2>
        <p className="mb-5 text-zinc-500">You reached level {newLevel}</p>

        <div className="mb-6 space-y-2 rounded-xl border border-zinc-800 bg-zinc-950 p-4 text-left">
          <div className="flex items-center justify-between">
            <span className="text-sm text-zinc-500">Reward</span>
            <span className="flex items-center gap-1 font-bold text-zinc-100"><CoinIcon size={16} /> {coinsReward} coins</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-zinc-500">Catch bonus</span>
            <span className="font-bold text-zinc-100">+{bonusChance.toFixed(1)}%</span>
          </div>
        </div>

        <Button
          onClick={handleDismiss}
          className="w-full rounded-xl border border-cyan-300/25 bg-zinc-950 py-5 text-base font-bold text-cyan-100 hover:bg-black"
          style={{
            background: 'linear-gradient(135deg, #020617, #083344)'
          }}
        >
          Awesome!
        </Button>
      </div>
    </div>
  );
};

export default LevelUpCelebration;
