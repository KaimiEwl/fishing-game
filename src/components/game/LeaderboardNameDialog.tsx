import React, { useEffect, useState } from 'react';
import { Trophy } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { sanitizeLeaderboardName } from '@/lib/leaderboard';

interface LeaderboardNameDialogProps {
  open: boolean;
  defaultName?: string | null;
  score: number;
  onSave: (name: string) => void;
}

const LeaderboardNameDialog: React.FC<LeaderboardNameDialogProps> = ({
  open,
  defaultName,
  score,
  onSave,
}) => {
  const [name, setName] = useState(defaultName || '');

  useEffect(() => {
    if (open) setName(defaultName || '');
  }, [defaultName, open]);

  const cleanName = sanitizeLeaderboardName(name);

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    if (!cleanName) return;
    onSave(cleanName);
  };

  return (
    <Dialog open={open} onOpenChange={() => undefined}>
      <DialogContent className="max-w-[calc(100vw-1rem)] border border-cyan-300/20 bg-black/95 text-zinc-100 shadow-2xl shadow-black/60 backdrop-blur-md sm:max-w-sm">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-2xl font-black text-white">
            <Trophy className="h-6 w-6 text-cyan-100" />
            Enter leaderboard name
          </DialogTitle>
          <DialogDescription className="text-sm font-medium text-cyan-50/75">
            Your first grilled dish is ready. Add a name so your grill score can appear on the board.
          </DialogDescription>
        </DialogHeader>

        <form className="mt-2 grid gap-4" onSubmit={handleSubmit}>
          <div className="rounded-lg border border-cyan-300/15 bg-zinc-950 p-3">
            <div className="text-xs font-bold uppercase tracking-normal text-zinc-500">Current score</div>
            <div className="mt-1 text-2xl font-black text-cyan-100">{score.toLocaleString()}</div>
          </div>

          <Input
            value={name}
            onChange={(event) => setName(event.target.value)}
            maxLength={24}
            autoFocus
            placeholder="Your grill name"
            className="h-12 rounded-lg border-cyan-300/20 bg-zinc-950 text-base font-bold text-white placeholder:text-zinc-600 focus-visible:ring-cyan-300/30"
          />

          <Button
            type="submit"
            disabled={!cleanName}
            className="h-12 rounded-lg border border-cyan-300/25 bg-zinc-950 text-base font-black text-cyan-100 shadow-lg shadow-black/30 hover:bg-black disabled:border-zinc-800 disabled:text-zinc-600"
          >
            Save to leaderboard
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default LeaderboardNameDialog;
