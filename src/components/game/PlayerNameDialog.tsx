import React, { useEffect, useState } from 'react';
import { UserRound } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

interface PlayerNameDialogProps {
  open: boolean;
  walletLinked?: boolean;
  onSave: (name: string) => Promise<unknown> | void;
}

const NICKNAME_REGEX = /^[\p{L}0-9_-]{2,20}$/u;

const PlayerNameDialog: React.FC<PlayerNameDialogProps> = ({
  open,
  walletLinked = false,
  onSave,
}) => {
  const [name, setName] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setName('');
    setError('');
    setSaving(false);
  }, [open]);

  const handleSave = async (event?: React.FormEvent) => {
    event?.preventDefault();
    const trimmed = name.trim();

    if (!NICKNAME_REGEX.test(trimmed)) {
      setError('Use 2-20 letters, digits, _ or -.');
      return;
    }

    setError('');
    setSaving(true);
    try {
      await onSave(trimmed);
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : 'Could not save name.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={() => undefined}>
      <DialogContent
        className="max-w-[calc(100vw-1rem)] border border-cyan-300/20 bg-black/95 text-zinc-100 shadow-2xl shadow-black/60 backdrop-blur-md [&>button:last-child]:hidden sm:max-w-sm"
        onEscapeKeyDown={(event) => event.preventDefault()}
        onInteractOutside={(event) => event.preventDefault()}
        onPointerDownOutside={(event) => event.preventDefault()}
      >
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-2xl font-black text-white">
            <UserRound className="h-6 w-6 text-cyan-100" />
            Choose your name
          </DialogTitle>
          <DialogDescription className="text-sm font-medium text-cyan-50/75">
            {walletLinked
              ? 'Wallet verified. Enter one player name to lock it to this wallet before you continue.'
              : 'Link and verify your wallet first. After that, a player name becomes required for this account.'}
          </DialogDescription>
        </DialogHeader>

        <form className="mt-2 grid gap-4" onSubmit={handleSave}>
          <Input
            value={name}
            onChange={(event) => {
              setName(event.target.value);
              setError('');
            }}
            maxLength={20}
            autoFocus
            placeholder="Your player name"
            className="h-12 rounded-lg border-cyan-300/20 bg-zinc-950 text-base font-bold text-white placeholder:text-zinc-600 focus-visible:ring-cyan-300/30"
            disabled={saving}
          />

          {error && (
            <p className="text-sm font-semibold text-red-300">{error}</p>
          )}

          <p className="text-xs font-medium text-zinc-400">
            Use 2-20 letters, digits, <span className="font-black">_</span> or <span className="font-black">-</span>.
          </p>

          <Button
            type="submit"
            disabled={!name.trim() || saving}
            className="h-12 rounded-lg border border-cyan-300/25 bg-zinc-950 text-base font-black text-cyan-100 shadow-lg shadow-black/30 hover:bg-black disabled:border-zinc-800 disabled:text-zinc-600"
          >
            {saving ? 'Saving...' : 'OK'}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default PlayerNameDialog;
