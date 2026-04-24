interface BiteMeterProps {
  progress: number;
  showSweetSpot?: boolean;
  sweetSpotStart?: number;
  sweetSpotEnd?: number;
}

const getBiteToneClass = (progress: number) => {
  if (progress > 40) return 'bg-[linear-gradient(90deg,#22cc44,#66ff88)]';
  if (progress > 20) return 'bg-[linear-gradient(90deg,#ffaa00,#ffcc44)]';
  return 'bg-[linear-gradient(90deg,#ff3333,#ff6644)]';
};

const clampPercent = (value: number) => Math.max(0, Math.min(100, value));

const BiteMeter = ({
  progress,
  showSweetSpot = false,
  sweetSpotStart = 42,
  sweetSpotEnd = 58,
}: BiteMeterProps) => {
  const clampedProgress = clampPercent(progress);
  const clampedSweetSpotStart = clampPercent(sweetSpotStart);
  const clampedSweetSpotEnd = clampPercent(sweetSpotEnd);
  const sweetSpotWidth = Math.max(0, clampedSweetSpotEnd - clampedSweetSpotStart);

  return (
    <div className="w-[11.75rem] rounded-xl border border-cyan-300/18 bg-black/82 px-3 py-2 shadow-xl backdrop-blur-md sm:w-[13.5rem]">
      <div className="relative h-2 overflow-hidden rounded-full border border-zinc-800 bg-zinc-950">
        <div
          className={`h-full rounded-full transition-all duration-75 ${getBiteToneClass(clampedProgress)}`}
          style={{ width: `${clampedProgress}%` }}
        />
        {showSweetSpot && sweetSpotWidth > 0 ? (
          <div
            className="pointer-events-none absolute inset-y-0 rounded-full border border-cyan-200/65 bg-cyan-200/16 shadow-[0_0_10px_rgba(165,243,252,0.22)]"
            style={{ left: `${clampedSweetSpotStart}%`, width: `${sweetSpotWidth}%` }}
          />
        ) : null}
      </div>
      <p className="mt-1.5 text-center text-[10px] font-bold uppercase tracking-[0.14em] text-cyan-100/80 sm:text-[11px]">
        {showSweetSpot ? 'Hit the bright zone for perfect' : 'Fish on the line'}
      </p>
    </div>
  );
};

export default BiteMeter;
