import type { ReactNode } from 'react';

interface GameStateNoticeProps {
  children: ReactNode;
  tone?: 'default' | 'success';
}

const toneClasses = {
  default: 'text-zinc-100',
  success: 'text-cyan-100',
} as const;

const GameStateNotice = ({ children, tone = 'default' }: GameStateNoticeProps) => (
  <div className="rounded-xl border border-cyan-300/16 bg-black/78 px-4 py-2.5 text-center shadow-xl backdrop-blur-sm">
    <p className={`animate-pulse text-sm font-semibold sm:text-base ${toneClasses[tone]}`}>{children}</p>
  </div>
);

export default GameStateNotice;
