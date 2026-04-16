import React, { useState, useRef } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Settings, Check, LogOut, Volume2, VolumeX, Camera } from 'lucide-react';
import { ConnectButton } from '@rainbow-me/rainbowkit';
import { useBalance } from 'wagmi';
import { isSoundMuted, setSoundMuted } from '@/hooks/useSoundEffects';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { supabase } from '@/integrations/supabase/client';

interface SettingsDialogProps {
  isConnected: boolean;
  nickname: string;
  onSetNickname?: (nickname: string) => void;
  walletAddress?: string;
  avatarUrl?: string | null;
  onAvatarUploaded?: (url: string) => void;
}

const NICKNAME_REGEX = /^[a-zA-Z0-9а-яА-ЯёЁ_-]{2,20}$/;

const SettingsDialog: React.FC<SettingsDialogProps> = ({ isConnected, nickname, onSetNickname, walletAddress, avatarUrl, onAvatarUploaded }) => {
  const [nickInput, setNickInput] = useState(nickname);
  const [error, setError] = useState('');
  const [saved, setSaved] = useState(false);
  const [muted, setMuted] = useState(isSoundMuted());
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const nicknameAlreadySet = !!nickname && nickname.length > 0;

  const { data: balanceData } = useBalance({
    address: walletAddress as `0x${string}` | undefined,
    query: { enabled: !!walletAddress },
  });

  const handleSaveNick = () => {
    if (nicknameAlreadySet) return;
    const trimmed = nickInput.trim();
    if (!NICKNAME_REGEX.test(trimmed)) {
      setError('2-20 chars, letters/digits/_/-');
      return;
    }
    setError('');
    onSetNickname?.(trimmed);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const handleToggleSound = (checked: boolean) => {
    const newMuted = !checked;
    setMuted(newMuted);
    setSoundMuted(newMuted);
  };

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
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
      
      // Save to players table
      await supabase
        .from('players')
        .update({ avatar_url: publicUrl } as any)
        .eq('wallet_address', walletAddress.toLowerCase());

      onAvatarUploaded?.(publicUrl);
    } catch (err) {
      console.error('Avatar upload failed:', err);
    } finally {
      setUploading(false);
    }
  };

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button
          variant="outline"
          size="icon"
          className="h-11 w-11 rounded-full border-primary/25 bg-background/65 shadow-md outline-none backdrop-blur-md transition-all hover:scale-105 hover:bg-background/85 active:scale-95 sm:h-8 sm:w-8"
          aria-label="Settings"
        >
          <Settings className="h-5 w-5 text-foreground/85 sm:h-4 sm:w-4" />
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-[calc(100vw-1rem)] sm:max-w-sm bg-card/95 backdrop-blur-md border-2 border-primary/30">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl">
            <Settings className="w-5 h-5" />
            Settings
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-5 text-base sm:text-sm">
          {/* Wallet Connection */}
          <div className="space-y-2">
            <p className="text-base font-bold text-foreground sm:text-sm sm:font-medium">Wallet</p>
            {isConnected ? (
              <ConnectButton.Custom>
                {({ account, openAccountModal }) => (
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <div className="min-h-11 flex-1 truncate rounded-lg border border-primary/30 bg-primary/10 px-3 py-2.5 text-sm text-foreground">
                        {account?.displayName || account?.address}
                      </div>
                      <Button size="sm" variant="outline" onClick={openAccountModal} className="h-11 gap-1 px-3">
                        <LogOut className="w-3 h-3" />
                      </Button>
                    </div>
                    {balanceData && (
                      <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-muted/50 border border-border text-sm">
                        <span className="text-muted-foreground">Balance:</span>
                        <span className="font-bold text-foreground">
                          {parseFloat(balanceData.formatted).toFixed(4)} {balanceData.symbol}
                        </span>
                      </div>
                    )}
                  </div>
                )}
              </ConnectButton.Custom>
            ) : (
              <ConnectButton.Custom>
                {({ openConnectModal }) => (
                  <div className="flex gap-2">
                    <Button
                      onClick={openConnectModal}
                    className="h-11 flex-1 gap-2"
                      style={{
                        background: 'linear-gradient(135deg, hsl(var(--primary)), hsl(270, 80%, 55%))',
                      }}
                    >
                      🔗 Sign In
                    </Button>
                    <Button
                      onClick={openConnectModal}
                      variant="outline"
                      className="h-11 flex-1 gap-2 border-primary/30"
                    >
                      📝 Sign Up
                    </Button>
                  </div>
                )}
              </ConnectButton.Custom>
            )}
          </div>

          {/* Avatar */}
          {isConnected && (
            <div className="space-y-2">
              <p className="text-base font-bold text-foreground sm:text-sm sm:font-medium">Avatar</p>
              <div className="flex items-center gap-3 rounded-lg border border-border bg-muted/50 px-3 py-3">
                <Avatar className="w-12 h-12">
                  {avatarUrl ? (
                    <AvatarImage src={avatarUrl} alt="Avatar" />
                  ) : null}
                  <AvatarFallback className="bg-primary/20 text-primary text-lg">
                    🎣
                  </AvatarFallback>
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
                    className="h-11 gap-1 px-4"
                  >
                    <Camera className="w-3 h-3" />
                    {uploading ? 'Uploading...' : avatarUrl ? 'Change photo' : 'Upload photo'}
                  </Button>
                </div>
              </div>
            </div>
          )}

          {/* Sound */}
          <div className="space-y-2">
            <p className="text-base font-bold text-foreground sm:text-sm sm:font-medium">Sound</p>
            <div className="flex min-h-12 items-center justify-between rounded-lg border border-border bg-muted/50 px-3 py-2.5">
              <div className="flex items-center gap-2 text-base text-foreground sm:text-sm">
                {muted ? <VolumeX className="w-4 h-4 text-muted-foreground" /> : <Volume2 className="w-4 h-4 text-primary" />}
                {muted ? 'Sound off' : 'Sound on'}
              </div>
              <Switch checked={!muted} onCheckedChange={handleToggleSound} />
            </div>
          </div>

          {/* Nickname */}
          <div className="space-y-2">
            <p className="text-base font-bold text-foreground sm:text-sm sm:font-medium">Nickname</p>
            {nicknameAlreadySet ? (
              <div className="min-h-11 rounded-lg border border-border bg-muted/50 px-3 py-2.5 text-base text-foreground sm:text-sm">
                {nickname}
              </div>
            ) : (
              <>
                <div className="flex gap-2">
                  <Input
                    value={nickInput}
                    onChange={e => { setNickInput(e.target.value); setSaved(false); }}
                    placeholder="Enter nickname (one-time only)"
                    className="h-11 flex-1"
                    maxLength={20}
                    disabled={!onSetNickname}
                    onKeyDown={e => { if (e.key === 'Enter') handleSaveNick(); }}
                  />
                  <Button
                    onClick={handleSaveNick}
                    disabled={!onSetNickname || saved}
                    size="sm"
                    className="h-11 gap-1 px-4"
                  >
                    {saved ? <><Check className="w-3 h-3" /> Saved</> : 'Save'}
                  </Button>
                </div>
                {error && <p className="text-xs text-destructive">{error}</p>}
                {!onSetNickname && (
                  <p className="text-xs text-muted-foreground">Connect wallet to set nickname</p>
                )}
                <p className="text-xs text-muted-foreground">⚠️ Nickname can only be set once</p>
              </>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default SettingsDialog;
