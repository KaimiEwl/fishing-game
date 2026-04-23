import React from 'react';
import CoinIcon from './CoinIcon';

interface GameScreenShellProps {
  title: string;
  subtitle: string;
  coins?: number;
  backgroundImage?: string;
  backgroundFit?: 'cover' | 'contain';
  overlayClassName?: string;
  contentScrollable?: boolean;
  headerHidden?: boolean;
  shellPaddingClassName?: string;
  contentWrapperClassName?: string;
  children: React.ReactNode;
}

const DEFAULT_OVERLAY = 'bg-[radial-gradient(circle_at_50%_0%,rgba(124,92,255,0.26),transparent_34%),linear-gradient(180deg,rgba(16,16,44,0.45)_0%,rgba(8,9,20,0.50)_48%,rgba(5,7,13,0.65)_100%)]';
const DEFAULT_SHELL_PADDING = 'px-3 pb-[calc(var(--bottom-nav-clearance,6rem)+1rem)] pt-3 sm:px-6 sm:pt-5';

const GameScreenShell: React.FC<GameScreenShellProps> = ({
  title,
  subtitle,
  coins,
  backgroundImage,
  backgroundFit = 'cover',
  overlayClassName = DEFAULT_OVERLAY,
  contentScrollable = false,
  headerHidden = false,
  shellPaddingClassName = DEFAULT_SHELL_PADDING,
  contentWrapperClassName,
  children,
}) => {
  const resolvedContentWrapperClassName = contentWrapperClassName ?? `mx-auto ${headerHidden ? 'mt-0 max-w-none' : 'mt-4 max-w-5xl sm:mt-6'} min-h-0 w-full flex-1 ${contentScrollable ? 'overflow-y-auto overscroll-contain pr-1' : 'overflow-hidden'}`;

  return (
    <section className="absolute inset-0 overflow-hidden bg-[#080914] text-white">
      {backgroundImage && (
        <img
          src={backgroundImage}
          alt=""
          aria-hidden="true"
          decoding="async"
          fetchPriority="high"
          className={`absolute inset-0 h-full w-full ${backgroundFit === 'contain' ? 'object-contain' : 'object-cover'}`}
        />
      )}
      <div className={`pointer-events-none absolute inset-0 ${overlayClassName}`} />
      <div className={`relative z-10 flex h-full flex-col ${shellPaddingClassName}`}>
        {!headerHidden && (
          <header className="mx-auto flex w-full max-w-5xl items-start justify-between gap-3 rounded-xl border border-cyan-300/15 bg-black/65 px-3 py-2.5 shadow-xl shadow-black/30 backdrop-blur-md sm:px-4 sm:py-3">
            <div className="min-w-0">
              <h1 className="truncate text-2xl font-black tracking-normal text-white drop-shadow-[0_2px_12px_rgba(0,0,0,0.95)] sm:text-4xl">{title}</h1>
              <p className="mt-1 max-w-2xl text-sm font-semibold text-cyan-50/85 drop-shadow-[0_1px_8px_rgba(0,0,0,0.9)] sm:text-base">{subtitle}</p>
            </div>
            {typeof coins === 'number' && (
              <div className="inline-flex h-10 shrink-0 items-center gap-2 rounded-lg border border-cyan-300/20 bg-black/70 px-3 text-sm font-bold text-cyan-100 backdrop-blur-md">
                <CoinIcon size="md" />
                {coins.toLocaleString()}
              </div>
            )}
          </header>
        )}

        <div className={resolvedContentWrapperClassName}>
          {children}
        </div>
      </div>
    </section>
  );
};

export default GameScreenShell;
