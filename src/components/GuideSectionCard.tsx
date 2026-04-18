import type { LucideIcon } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface GuideSectionCardProps {
  id: string;
  title: string;
  icon: LucideIcon;
  body?: string;
  bullets?: string[];
}

const GuideSectionCard = ({ id, title, icon: Icon, body, bullets }: GuideSectionCardProps) => (
  <Card id={id} className="scroll-mt-8 border border-cyan-300/10 bg-black/40 backdrop-blur-xl">
    <CardHeader>
      <div className="flex items-center gap-3">
        <div className="rounded-2xl border border-cyan-300/15 bg-cyan-300/10 p-3">
          <Icon className="h-5 w-5 text-cyan-100" />
        </div>
        <CardTitle className="text-xl font-black text-white">{title}</CardTitle>
      </div>
    </CardHeader>
    <CardContent className="text-sm leading-6 text-zinc-300">
      {body && <p>{body}</p>}
      {bullets && (
        <ul className="space-y-2">
          {bullets.map((bullet) => (
            <li key={bullet} className="rounded-2xl border border-zinc-800 bg-zinc-950/65 px-4 py-3">
              {bullet}
            </li>
          ))}
        </ul>
      )}
    </CardContent>
  </Card>
);

export default GuideSectionCard;
