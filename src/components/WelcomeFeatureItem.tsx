import type { ReactNode } from 'react';

interface WelcomeFeatureItemProps {
  icon: ReactNode;
  label: string;
}

const WelcomeFeatureItem = ({ icon, label }: WelcomeFeatureItemProps) => (
  <div className="flex flex-col items-center gap-1">
    {icon}
    <span className="text-xs text-muted-foreground">{label}</span>
  </div>
);

export default WelcomeFeatureItem;
