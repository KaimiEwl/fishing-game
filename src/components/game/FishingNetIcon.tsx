import React from 'react';
import { cn } from '@/lib/utils';

interface FishingNetIconProps {
  className?: string;
}

const FishingNetIcon: React.FC<FishingNetIconProps> = ({ className }) => {
  return (
    <svg
      viewBox="0 0 64 64"
      fill="none"
      aria-hidden="true"
      className={cn('h-6 w-6', className)}
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M14 17.5L32 8l18 9.5v17.5c0 11.5-7.4 20.7-18 26.2-10.6-5.5-18-14.7-18-26.2V17.5Z"
        stroke="currentColor"
        strokeWidth="3"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M22 19.5 42 39.5M42 19.5 22 39.5M32 10.5v41M17 24h30M19.5 31.5h25M23 39h18"
        stroke="currentColor"
        strokeWidth="2.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M18 17.5 32 24l14-6.5"
        stroke="currentColor"
        strokeWidth="2.2"
        strokeLinecap="round"
        strokeLinejoin="round"
        opacity="0.72"
      />
    </svg>
  );
};

export default FishingNetIcon;
