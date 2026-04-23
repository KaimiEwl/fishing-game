import React, { useEffect, useRef, useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Camera, Settings, Volume2, VolumeX } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import {
  isMusicMuted,
  isSoundMuted,
  MUSIC_MUTED_EVENT,
  SOUND_MUTED_EVENT,
  setMusicMuted,
  setSoundMuted,
} from '@/hooks/useSoundEffects';
import { supabase } from '@/integrations/supabase/client';
import type { TablesUpdate } from '@/integrations/supabase/types';

interface SettingsDialogProps {
  isConnected: boolean;
  nickname: string;
  walletAddress?: string;
  avatarUrl?: string | null;
  onAvatarUploaded?: (url: string) => void;
  showAdminPanelEntry?: boolean;
  adminPendingWithdrawCount?: number;
}

const SettingsDialog: React.FC<SettingsDialogProps> = ({
  isConnected,
  nickname,
  walletAddress,
  avatarUrl,
  onAvatarUploaded,
  showAdminPanelEntry = false,
  adminPendingWithdrawCount = 0,
}) => {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [soundMuted, setSoundMutedState] = useState(isSoundMuted());
  const [musicMuted, setMusicMutedState] = useState(isMusicMuted());
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const adminNavigateTimerRef = useRef<number | null>(null);

  useEffect(() => {
    const syncAudioState = () => {
      setSoundMutedState(isSoundMuted());
      setMusicMutedState(isMusicMuted());
    };

    window.addEventListener(SOUND_MUTED_EVENT, syncAudioState as EventListener);
    window.addEventListener(MUSIC_MUTED_EVENT, syncAudioState as EventListener);

    return () => {
      window.removeEventListener(SOUND_MUTED_EVENT, syncAudioState as EventListener);
      window.removeEventListener(MUSIC_MUTED_EVENT, syncAudioState as EventListener);
    };
  }, []);

  const avatarFallback = nickname
    ? nickname
        .trim()
        .split(/\s+/)
        .filter(Boolean)
        .slice(0, 2)
        .map((part) => part[0]?.toUpperCase() ?? '')
        .join('')
    : 'HL';

  const handleToggleSoundEffects = (checked: boolean) => {
    const newMuted = !checked;
    setSoundMutedState(newMuted);
    setSoundMuted(newMuted);
  };

  const handleToggleMusic = (checked: boolean) => {
    const newMuted = !checked;
    setMusicMutedState(newMuted);
    setMusicMuted(newMuted);
  };

  const handleAvatarUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !walletAddress) return;

    setUploading(true);
    try {
      const ext = file.name.split('.').pop();
      const filePath = `${walletAddress.toLowerCase()}.${ext}`;

      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, file, { upsert: true });

      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage
        .from('avatars')
        .getPublicUrl(filePath);

      const publicUrl = `${urlData.publicUrl}?t=${Date.now()}`;

      const avatarUpdate: TablesUpdate<'players'> = { avatar_url: publicUrl };

      await supabase
        .from('players')
        .update(avatarUpdate)
        .eq('wallet_address', walletAddress.toLowerCase());

      onAvatarUploaded?.(publicUrl);
    } catch (error) {
      console.error('Avatar upload failed:', error);
    } finally {
      setUploading(false);
    }
  };

  const handleOpenAdminPanel = () => {
    setOpen(false);
    if (adminNavigateTimerRef.current !== null) {
      window.clearTimeout(adminNavigateTimerRef.current);
    }
    adminNavigateTimerRef.current = window.setTimeout(() => {
      navigate('/admin');
      adminNavigateTimerRef.current = null;
    }, 180);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          variant="outline"
          size="icon"
          className="relative h-11 w-11 rounded-full border border-cyan-300/20 bg-black/85 text-cyan-100 shadow-md outline-none backdrop-blur-md transition-all hover:scale-105 hover:border-cyan-300/40 hover:bg-zinc-950 active:scale-95 sm:h-8 sm:w-8"
          aria-label="Settings"
        >
          <Settings className="h-5 w-5 sm:h-4 sm:w-4" />
          {showAdminPanelEntry && adminPendingWithdrawCount > 0 && (
            <span className="absolute -right-1 -top-1 inline-flex min-h-5 min-w-5 items-center justify-center rounded-full border border-red-300/40 bg-red-500 px-1 text-[10px] font-black text-white shadow-[0_0_12px_rgba(239,68,68,0.45)]">
              {adminPendingWithdrawCount > 99 ? '99+' : adminPendingWithdrawCount}
            </span>
          )}
        </Button>
      </DialogTrigger>

      <DialogContent className="max-w-[calc(100vw-1rem)] border border-cyan-300/15 bg-black/95 text-zinc-100 shadow-2xl backdrop-blur-md sm:max-w-sm">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl text-zinc-100">
            <Settings className="h-5 w-5" />
            Settings
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-5 text-base sm:text-sm">
          {isConnected && (
            <div className="space-y-2">
              <p className="text-base font-bold text-zinc-100 sm:text-sm sm:font-medium">Avatar</p>
              <div className="flex items-center gap-3 rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-3">
                <Avatar className="h-12 w-12">
                  {avatarUrl ? <AvatarImage src={avatarUrl} alt="Avatar" /> : null}
                  <AvatarFallback className="bg-zinc-900 text-lg text-cyan-100">{avatarFallback}</AvatarFallback>
                </Avatar>
                <div className="flex-1">
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handleAvatarUpload}
                  />
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={uploading}
                    className="h-11 gap-1 border-zinc-800 bg-black px-4 text-zinc-100 hover:bg-zinc-950"
                  >
                    <Camera className="h-3 w-3" />
                    {uploading ? 'Uploading...' : avatarUrl ? 'Change photo' : 'Upload photo'}
                  </Button>
                </div>
              </div>
            </div>
          )}

          <div className="space-y-2">
            <p className="text-base font-bold text-zinc-100 sm:text-sm sm:font-medium">Audio</p>
            <div className="space-y-2">
              <div className="flex min-h-12 items-center justify-between rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-2.5">
                <div className="flex items-center gap-2 text-base text-zinc-100 sm:text-sm">
                  {soundMuted ? <VolumeX className="h-4 w-4 text-zinc-300" /> : <Volume2 className="h-4 w-4 text-cyan-100" />}
                  {soundMuted ? 'Sounds off' : 'Sounds on'}
                </div>
                <Switch checked={!soundMuted} onCheckedChange={handleToggleSoundEffects} />
              </div>
              <div className="flex min-h-12 items-center justify-between rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-2.5">
                <div className="flex items-center gap-2 text-base text-zinc-100 sm:text-sm">
                  {musicMuted ? <VolumeX className="h-4 w-4 text-zinc-300" /> : <Volume2 className="h-4 w-4 text-cyan-100" />}
                  {musicMuted ? 'Music off' : 'Music on'}
                </div>
                <Switch checked={!musicMuted} onCheckedChange={handleToggleMusic} />
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <p className="text-base font-bold text-zinc-100 sm:text-sm sm:font-medium">Game guide</p>
            <Link to="/guide" onClick={() => setOpen(false)} className="block">
              <Button
                variant="outline"
                className="h-11 w-full justify-between border-zinc-800 bg-zinc-950 px-4 text-zinc-100 hover:bg-black"
              >
                <span>Open rules and description</span>
                <span className="text-cyan-100">Guide</span>
              </Button>
            </Link>
          </div>

          {showAdminPanelEntry && (
            <div className="space-y-2">
              <p className="text-base font-bold text-zinc-100 sm:text-sm sm:font-medium">Admin</p>
              <Button
                type="button"
                variant="outline"
                onClick={handleOpenAdminPanel}
                className="h-11 w-full justify-between border border-red-400/30 bg-red-950/40 px-4 text-red-100 hover:bg-red-950/70"
              >
                <span>Open admin tools</span>
                <span className="font-black uppercase tracking-[0.12em] text-red-200">Admin Panel</span>
              </Button>
              {adminPendingWithdrawCount > 0 && (
                <p className="text-xs font-medium text-red-200">
                  {adminPendingWithdrawCount} pending MON withdraw {adminPendingWithdrawCount === 1 ? 'request' : 'requests'} in queue.
                </p>
              )}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default SettingsDialog;
