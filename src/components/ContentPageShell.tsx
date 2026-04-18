import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface ContentPageShellProps {
  children: ReactNode;
  maxWidth?: 'narrow' | 'wide';
  tone?: 'default' | 'guide';
}

const widthClasses = {
  narrow: 'max-w-3xl',
  wide: 'max-w-6xl',
} as const;

const toneClasses = {
  default: 'bg-background text-foreground',
  guide: 'bg-[radial-gradient(circle_at_top,#102458,#04060d_60%)] text-zinc-100',
} as const;

const ContentPageShell = ({
  children,
  maxWidth = 'narrow',
  tone = 'default',
}: ContentPageShellProps) => (
  <div className={`min-h-screen overflow-y-auto ${toneClasses[tone]}`}>
    <div className={`mx-auto px-6 py-12 ${widthClasses[maxWidth]}`}>{children}</div>
  </div>
);

interface ContentPageBackLinkProps {
  label?: string;
  tone?: 'default' | 'guide';
}

const backLinkToneClasses = {
  default: '',
  guide: 'justify-start text-cyan-100 hover:bg-cyan-300/10 hover:text-cyan-50',
} as const;

export const ContentPageBackLink = ({
  label = 'Back to Game',
  tone = 'default',
}: ContentPageBackLinkProps) => (
  <Button variant="ghost" asChild className={`mb-8 ${backLinkToneClasses[tone]}`}>
    <Link to="/">
      <ArrowLeft className="mr-2 h-4 w-4" />
      {label}
    </Link>
  </Button>
);

export default ContentPageShell;
