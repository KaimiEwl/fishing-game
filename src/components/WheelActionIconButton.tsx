import React from 'react';

interface WheelActionIconButtonProps {
  src: string;
  alt: string;
  label: string;
  onClick: () => void;
  disabled?: boolean;
  badge?: string | null;
}

const WheelActionIconButton: React.FC<WheelActionIconButtonProps> = ({
  src,
  alt,
  label,
  onClick,
  disabled = false,
  badge,
}) => (
  <button
    type="button"
    onClick={onClick}
    disabled={disabled}
    className={`group relative isolate overflow-visible bg-transparent outline-none transition-all duration-200 ${
      disabled
        ? 'cursor-not-allowed opacity-55 saturate-50'
        : 'hover:scale-105 focus-visible:scale-105 active:scale-95'
    }`}
    aria-label={label}
  >
    <span
      aria-hidden="true"
      className="absolute inset-[12%] rounded-[1.5rem] bg-[radial-gradient(circle,rgba(250,204,21,0.28),rgba(15,23,42,0)_72%)] blur-md"
    />
    <img
      src={src}
      alt={alt}
      className="relative z-[1] block w-24 object-contain drop-shadow-[0_18px_30px_rgba(0,0,0,0.36)] transition-transform duration-300 group-hover:scale-[1.02] sm:w-28"
      draggable={false}
    />
    {badge ? (
      <span className="absolute -right-1 -top-1 z-[2] rounded-full border border-yellow-200/80 bg-yellow-300 px-2 py-1 text-[10px] font-black leading-none text-black shadow-lg">
        {badge}
      </span>
    ) : null}
  </button>
);

export default WheelActionIconButton;
