interface BiteMeterProps {
  progress: number;
}

const getBiteToneClass = (progress: number) => {
  if (progress > 40) return 'bg-[linear-gradient(90deg,#22cc44,#66ff88)]';
  if (progress > 20) return 'bg-[linear-gradient(90deg,#ffaa00,#ffcc44)]';
  return 'bg-[linear-gradient(90deg,#ff3333,#ff6644)]';
};

const BiteMeter = ({ progress }: BiteMeterProps) => (
  <div className="w-[11.75rem] rounded-xl border border-cyan-300/18 bg-black/82 px-3 py-2 shadow-xl backdrop-blur-md sm:w-[13.5rem]">
    <div className="h-2 overflow-hidden rounded-full border border-zinc-800 bg-zinc-950">
      <div
        className={`h-full rounded-full transition-all duration-75 ${getBiteToneClass(progress)}`}
        style={{ width: `${progress}%` }}
      />
    </div>
    <p className="mt-1.5 text-center text-[10px] font-bold uppercase tracking-[0.14em] text-cyan-100/80 sm:text-[11px]">
      Fish on the line
    </p>
  </div>
);

export default BiteMeter;
