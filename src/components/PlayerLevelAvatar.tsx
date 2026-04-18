import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

interface PlayerLevelAvatarProps {
  level: number;
  avatarUrl?: string;
  size?: 'sm' | 'md';
}

const sizeClasses = {
  sm: 'h-9 w-9',
  md: 'h-12 w-12',
} as const;

const fallbackClasses = {
  sm: 'text-sm font-black',
  md: 'text-lg font-bold',
} as const;

const PlayerLevelAvatar = ({ level, avatarUrl, size = 'sm' }: PlayerLevelAvatarProps) => (
  <Avatar className={sizeClasses[size]}>
    {avatarUrl ? <AvatarImage src={avatarUrl} alt="Avatar" /> : null}
    <AvatarFallback className={`bg-[linear-gradient(135deg,#050505,#164e63)] text-white ${fallbackClasses[size]}`}>
      {level}
    </AvatarFallback>
  </Avatar>
);

export default PlayerLevelAvatar;
