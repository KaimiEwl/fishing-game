import React, { useEffect, useRef, useState } from 'react';
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
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Camera, Check, Copy, LogOut, Mail, Settings, Volume2, VolumeX } from 'lucide-react';
import { ConnectButton } from '@rainbow-me/rainbowkit';
import { useBalance } from 'wagmi';
import { Link, useNavigate } from 'react-router-dom';
import { isSoundMuted, setSoundMuted } from '@/hooks/useSoundEffects';
import type { ReferralSummary } from '@/hooks/useWalletAuth';
import type { PlayerInboxMessage } from '@/hooks/usePlayerMessages';
import type { MonBalanceSummary, PlayerWithdrawRequest } from '@/hooks/usePlayerMon';
import { supabase } from '@/integrations/supabase/client';
import type { TablesUpdate } from '@/integrations/supabase/types';
import { REFERRAL_BAIT_ENABLED } from '@/lib/baitEconomy';
import { formatMonAmount } from '@/lib/monRewards';
import { cn } from '@/lib/utils';
import PlayerInboxPanel from '@/components/PlayerInboxPanel';

interface SettingsDialogProps {
  isConnected: boolean;
  isVerified?: boolean;
  isVerifying?: boolean;
  verificationError?: string | null;
  onRetryWalletVerification?: () => Promise<unknown> | void;
  nickname: string;
  onSetNickname?: (nickname: string) => void;
  walletAddress?: string;
  avatarUrl?: string | null;
  onAvatarUploaded?: (url: string) => void;
  referralSummary?: ReferralSummary | null;
  inboxMessages?: PlayerInboxMessage[];
  unreadMessageCount?: number;
  inboxLoading?: boolean;
  onMarkMessageRead?: (messageId: string) => void;
  showAdminPanelEntry?: boolean;
  adminPendingWithdrawCount?: number;
  monSummary?: MonBalanceSummary;
  monRequests?: PlayerWithdrawRequest[];
  monLoading?: boolean;
  monRequesting?: boolean;
  onRequestMonWithdraw?: () => Promise<unknown> | void;
}

const NICKNAME_REGEX = /^[\p{L}0-9_-]{2,20}$/u;

const SettingsDialog: React.FC<SettingsDialogProps> = ({
  isConnected,
  isVerified = false,
  isVerifying = false,
  verificationError = null,
  onRetryWalletVerification,
  nickname,
  onSetNickname,
  walletAddress,
  avatarUrl,
  onAvatarUploaded,
  referralSummary,
  inboxMessages = [],
  unreadMessageCount = 0,
  inboxLoading = false,
  onMarkMessageRead,
  showAdminPanelEntry = false,
  adminPendingWithdrawCount = 0,
  monSummary,
  monRequests = [],
  monLoading = false,
  monRequesting = false,
  onRequestMonWithdraw,
}) => {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [nickInput, setNickInput] = useState(nickname);
  const [error, setError] = useState('');
  const [saved, setSaved] = useState(false);
  const [muted, setMuted] = useState(isSoundMuted());
  const [uploading, setUploading] = useState(false);
  const [copiedReferral, setCopiedReferral] = useState(false);
  const [copyError, setCopyError] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const pendingWalletModalRef = useRef<(() => void) | null>(null);
  const walletModalTimerRef = useRef<number | null>(null);
  const referralCopyTimerRef = useRef<number | null>(null);
  const adminNavigateTimerRef = useRef<number | null>(null);

  const nicknameAlreadySet = !!nickname && nickname.length > 0;
  const avatarFallback = nickname
    ? nickname
        .trim()
        .split(/\s+/)
        .filter(Boolean)
        .slice(0, 2)
        .map((part) => part[0]?.toUpperCase() ?? '')
        .join('')
    : 'HL';

  const { data: balanceData } = useBalance({
    address: walletAddress as `0x${string}` | undefined,
    query: { enabled: !!walletAddress },
  });

  const handleCopyReferralLink = async () => {
    const referralLink = referralSummary?.referralLink;
    if (!referralLink) return;

    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(referralLink);
      } else {
        const textarea = document.createElement('textarea');
        textarea.value = referralLink;
        textarea.setAttribute('readonly', 'true');
        textarea.style.position = 'absolute';
        textarea.style.left = '-9999px';
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand('copy');
        document.body.removeChild(textarea);
      }

      setCopyError('');
      setCopiedReferral(true);
      if (referralCopyTimerRef.current !== null) {
        window.clearTimeout(referralCopyTimerRef.current);
      }
      referralCopyTimerRef.current = window.setTimeout(() => {
        setCopiedReferral(false);
        referralCopyTimerRef.current = null;
      }, 1800);
    } catch (error) {
      console.error('Referral link copy failed:', error);
      setCopyError('Copy failed. Please copy the link manually.');
    }
  };

  const handleSaveNick = () => {
    if (nicknameAlreadySet) return;
    const trimmed = nickInput.trim();
    if (!NICKNAME_REGEX.test(trimmed)) {
      setError('Use 2-20 letters, digits, _ or -.');
      return;
    }
    setError('');
    onSetNickname?.(trimmed);
    setSaved(true);
    window.setTimeout(() => setSaved(false), 2000);
  };

  const handleToggleSound = (checked: boolean) => {
    const newMuted = !checked;
    setMuted(newMuted);
    setSoundMuted(newMuted);
  };

  useEffect(() => {
    if (open || !pendingWalletModalRef.current) {
      return undefined;
    }

    walletModalTimerRef.current = window.setTimeout(() => {
      pendingWalletModalRef.current?.();
      pendingWalletModalRef.current = null;
      walletModalTimerRef.current = null;
    }, 240);

    return () => {
      if (walletModalTimerRef.current !== null) {
        window.clearTimeout(walletModalTimerRef.current);
        walletModalTimerRef.current = null;
      }
    };
  }, [open]);

  useEffect(() => () => {
    if (referralCopyTimerRef.current !== null) {
      window.clearTimeout(referralCopyTimerRef.current);
      referralCopyTimerRef.current = null;
    }
    if (adminNavigateTimerRef.current !== null) {
      window.clearTimeout(adminNavigateTimerRef.current);
      adminNavigateTimerRef.current = null;
    }
  }, []);

  const handleWalletModalOpen = (openModal?: (() => void) | null) => {
    if (!openModal) return;

    pendingWalletModalRef.current = openModal;
    setOpen(false);
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
    } catch (err) {
      console.error('Avatar upload failed:', err);
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

  const canRequestWithdraw = Boolean(
    isConnected
    && monSummary
    && monSummary.withdrawableMon >= monSummary.minWithdrawMon
    && !monRequesting,
  );

  useEffect(() => {
    setNickInput(nickname);
    setSaved(false);
    setError('');
  }, [nickname]);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <div className="flex items-center gap-1.5">
        {unreadMessageCount > 0 && (
          <DialogTrigger asChild>
            <Button
              variant="outline"
              size="icon"
              className="relative h-11 w-11 rounded-full border border-amber-300/30 bg-black/85 text-amber-100 shadow-md outline-none backdrop-blur-md transition-all hover:scale-105 hover:border-amber-300/55 hover:bg-zinc-950 active:scale-95 sm:h-8 sm:w-8"
              aria-label="Unread inbox messages"
            >
              <Mail className="h-5 w-5 sm:h-4 sm:w-4" />
              <span className="absolute -right-1 -top-1 inline-flex min-h-5 min-w-5 items-center justify-center rounded-full border border-amber-200/50 bg-amber-400 px-1 text-[10px] font-black text-black shadow-[0_0_12px_rgba(251,191,36,0.45)]">
                {unreadMessageCount > 99 ? '99+' : unreadMessageCount}
              </span>
            </Button>
          </DialogTrigger>
        )}

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
      </div>

      <DialogContent className="max-w-[calc(100vw-1rem)] border border-cyan-300/15 bg-black/95 text-zinc-100 shadow-2xl backdrop-blur-md sm:max-w-sm">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl text-zinc-100">
            <Settings className="h-5 w-5" />
            Settings
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-5 text-base sm:text-sm">
          <div className="space-y-2">
            <p className="text-base font-bold text-zinc-100 sm:text-sm sm:font-medium">Wallet</p>
            {isConnected ? (
              <ConnectButton.Custom>
                {({ account, openAccountModal }) => (
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <div className="min-h-11 flex-1 truncate rounded-lg border border-cyan-300/15 bg-zinc-950 px-3 py-2.5 text-sm text-zinc-100">
                        {account?.displayName || account?.address}
                      </div>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleWalletModalOpen(openAccountModal)}
                        className="h-11 gap-1 border-zinc-800 bg-black px-3 text-zinc-100 hover:bg-zinc-950"
                      >
                        <LogOut className="h-3 w-3" />
                      </Button>
                  </div>
                    {balanceData && (
                      <div className="flex items-center gap-2 rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm">
                        <span className="text-zinc-300">Balance:</span>
                        <span className="font-bold text-zinc-100">
                          {parseFloat(balanceData.formatted).toFixed(4)} {balanceData.symbol}
                        </span>
                      </div>
                    )}
                    {isVerified ? (
                      <p className="text-xs font-medium text-zinc-400">
                        Connected wallets unlock referrals, future MON rewards, and cross-device progress.
                      </p>
                    ) : (
                      <div className="rounded-lg border border-amber-300/20 bg-amber-950/30 px-3 py-3">
                        <p className="text-sm font-semibold text-amber-100">
                          Wallet connected, but not verified yet.
                        </p>
                        <p className="mt-1 text-xs font-medium text-amber-100/80">
                          Finish one signature to link progress and unlock wallet tasks.
                        </p>
                        {verificationError && (
                          <p className="mt-2 text-xs font-semibold text-red-300">{verificationError}</p>
                        )}
                        <Button
                          type="button"
                          onClick={() => void onRetryWalletVerification?.()}
                          disabled={!onRetryWalletVerification || isVerifying}
                          className="mt-3 h-11 w-full gap-2 border border-cyan-300/25 bg-black text-cyan-100 hover:bg-zinc-950 disabled:border-zinc-800 disabled:bg-zinc-900 disabled:text-zinc-500"
                        >
                          {isVerifying ? 'Verifying wallet...' : 'Verify wallet'}
                        </Button>
                      </div>
                    )}
                  </div>
                )}
              </ConnectButton.Custom>
            ) : (
              <ConnectButton.Custom>
                {({ openConnectModal }) => (
                  <div className="space-y-2">
                    <Button
                      onClick={() => handleWalletModalOpen(openConnectModal)}
                      className="h-11 w-full gap-2 border border-cyan-300/25 bg-zinc-950 text-cyan-100 hover:bg-black"
                      style={{ background: 'linear-gradient(135deg, #020617, #083344)' }}
                    >
                      Connect wallet
                    </Button>
                    <p className="text-xs font-medium text-zinc-400">
                      Connect wallet to unlock referrals, future MON rewards, and synced progress on every device.
                    </p>
                  </div>
                )}
              </ConnectButton.Custom>
            )}

            {isConnected && isVerified && (
              <div className="rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-3">
                {nicknameAlreadySet ? (
                  <div className="space-y-1">
                    <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-zinc-400">Player name</p>
                    <p className="text-base font-bold text-zinc-100">{nickname}</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <div>
                      <p className="text-sm font-semibold text-zinc-100">Enter your name to finish wallet setup.</p>
                      <p className="mt-1 text-xs font-medium text-zinc-400">
                        Save it once and it will stay attached to your wallet progress.
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <Input
                        value={nickInput}
                        onChange={(event) => {
                          setNickInput(event.target.value);
                          setSaved(false);
                        }}
                        placeholder="Enter your name"
                        className="h-11 flex-1 border-zinc-800 bg-black text-zinc-100 placeholder:text-zinc-400"
                        maxLength={20}
                        disabled={!onSetNickname}
                        autoFocus={open}
                        onKeyDown={(event) => {
                          if (event.key === 'Enter') handleSaveNick();
                        }}
                      />
                      <Button
                        onClick={handleSaveNick}
                        disabled={!onSetNickname || saved}
                        size="sm"
                        className="h-11 gap-1 border border-cyan-300/25 bg-black px-4 text-cyan-100 hover:bg-zinc-950 disabled:border-zinc-800 disabled:bg-zinc-900 disabled:text-zinc-500"
                      >
                        {saved ? (
                          <>
                            <Check className="h-3 w-3" />
                            Saved
                          </>
                        ) : (
                          'Save'
                        )}
                      </Button>
                    </div>
                    {error && <p className="text-xs font-semibold text-red-300">{error}</p>}
                    <p className="text-xs font-medium text-zinc-400">Use 2-20 letters, digits, _ or -.</p>
                  </div>
                )}
              </div>
            )}
          </div>

          {REFERRAL_BAIT_ENABLED && (
            <div className="space-y-2">
              <p className="text-base font-bold text-zinc-100 sm:text-sm sm:font-medium">Referral</p>
              <div className="rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-3">
                {isConnected ? (
                  <>
                    <p className="text-sm font-semibold text-zinc-100">
                      Invite friends and earn +10 bait per successful wallet connect.
                    </p>
                    <div className="mt-3 flex items-center justify-between rounded-lg border border-cyan-300/12 bg-black/70 px-3 py-2">
                      <div>
                        <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-cyan-100/75">Rewarded referrals</p>
                        <p className="mt-1 text-lg font-black text-zinc-100">
                          {referralSummary?.rewardedReferralCount ?? 0}
                          <span className="ml-1 text-sm font-bold text-zinc-400">/ {referralSummary?.maxRewardedReferrals ?? 10}</span>
                        </p>
                      </div>
                      <span className="rounded-full border border-cyan-300/20 bg-cyan-300/10 px-2.5 py-1 text-[11px] font-bold uppercase tracking-[0.12em] text-cyan-100">
                        +10 bait
                      </span>
                    </div>
                    <div className="mt-3 flex gap-2">
                      <Input
                        value={referralSummary?.referralLink ?? 'Preparing referral link...'}
                        readOnly
                        className="h-11 flex-1 border-zinc-800 bg-black text-zinc-100 placeholder:text-zinc-500"
                      />
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => void handleCopyReferralLink()}
                        disabled={!referralSummary?.referralLink}
                        className="h-11 gap-2 border-zinc-800 bg-black px-4 text-zinc-100 hover:bg-zinc-900 disabled:text-zinc-500"
                      >
                        {copiedReferral ? (
                          <>
                            <Check className="h-4 w-4" />
                            Copied
                          </>
                        ) : (
                          <>
                            <Copy className="h-4 w-4" />
                            Copy link
                          </>
                        )}
                      </Button>
                    </div>
                    {copyError ? (
                      <p className="mt-2 text-xs font-medium text-red-300">{copyError}</p>
                    ) : (
                      <p className="mt-2 text-xs font-medium text-zinc-400">
                        Each invited wallet is locked to the first valid referrer link. Rewards stop after 10 successful referrals.
                      </p>
                    )}
                  </>
                ) : (
                  <>
                    <p className="text-sm font-semibold text-zinc-100">Connect wallet to unlock referrals.</p>
                    <p className="mt-1 text-xs font-medium text-zinc-400">
                      Each invited wallet gives +10 bait after the invited wallet is connected.
                    </p>
                  </>
                )}
              </div>
            </div>
          )}

          {isConnected && monSummary && (
            <div className="space-y-2">
              <p className="text-base font-bold text-zinc-100 sm:text-sm sm:font-medium">MON Rewards</p>
              <div className="rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-3">
                <div className="grid grid-cols-2 gap-2">
                  <div className="rounded-lg border border-zinc-800 bg-black/70 px-3 py-2">
                    <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-zinc-400">Pending hold</p>
                    <p className="mt-1 text-lg font-black text-zinc-100">
                      {formatMonAmount(monSummary.pendingHoldMon)} MON
                    </p>
                  </div>
                  <div className="rounded-lg border border-zinc-800 bg-black/70 px-3 py-2">
                    <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-zinc-400">Withdrawable</p>
                    <p className="mt-1 text-lg font-black text-emerald-300">
                      {formatMonAmount(monSummary.withdrawableMon)} MON
                    </p>
                  </div>
                </div>

                <div className="mt-3 flex flex-wrap items-center gap-2 text-xs font-medium text-zinc-400">
                  <span>Minimum withdraw: {formatMonAmount(monSummary.minWithdrawMon)} MON</span>
                  <span className="text-zinc-600">|</span>
                  <span>Hold: {monSummary.holdDays} days</span>
                  <span className="text-zinc-600">|</span>
                  <span>Pending requests: {formatMonAmount(monSummary.pendingRequestMon)} MON</span>
                </div>

                <Button
                  type="button"
                  variant="outline"
                  onClick={() => void onRequestMonWithdraw?.()}
                  disabled={!canRequestWithdraw || !onRequestMonWithdraw}
                  className="mt-3 h-11 w-full justify-between border-zinc-800 bg-black px-4 text-zinc-100 hover:bg-zinc-900 disabled:text-zinc-500"
                >
                  <span>{monRequesting ? 'Requesting...' : 'Request withdraw'}</span>
                  <span className="font-black uppercase tracking-[0.12em] text-cyan-100">
                    {formatMonAmount(monSummary.withdrawableMon)} MON
                  </span>
                </Button>

                <div className="mt-3 space-y-2">
                  <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-zinc-400">Recent requests</p>
                  {monLoading && monRequests.length === 0 ? (
                    <p className="text-xs font-medium text-zinc-500">Loading requests...</p>
                  ) : monRequests.length > 0 ? (
                    monRequests.slice(0, 4).map((request) => (
                      <div key={request.id} className="rounded-lg border border-zinc-800 bg-black/60 px-3 py-2">
                        <div className="flex items-center justify-between gap-3">
                          <span className="text-sm font-semibold text-zinc-100">
                            {formatMonAmount(request.amountMon)} MON
                          </span>
                          <span className={cn(
                            'rounded-full px-2 py-0.5 text-[10px] font-black uppercase tracking-[0.12em]',
                            request.status === 'pending' && 'bg-yellow-400/10 text-yellow-200',
                            request.status === 'approved' && 'bg-cyan-300/10 text-cyan-100',
                            request.status === 'rejected' && 'bg-red-400/10 text-red-200',
                            request.status === 'paid' && 'bg-emerald-400/10 text-emerald-200',
                          )}>
                            {request.status}
                          </span>
                        </div>
                        <p className="mt-1 text-xs text-zinc-400">
                          {new Date(request.requestedAt).toLocaleString()}
                        </p>
                        {request.payoutTxHash && (
                          <p className="mt-1 truncate text-[11px] font-medium text-zinc-500">
                            Tx: {request.payoutTxHash}
                          </p>
                        )}
                        {request.adminNote && (
                          <p className="mt-1 text-xs text-zinc-400">{request.adminNote}</p>
                        )}
                      </div>
                    ))
                  ) : (
                    <p className="text-xs font-medium text-zinc-500">No withdraw requests yet.</p>
                  )}
                </div>
              </div>
            </div>
          )}

          {isConnected && onMarkMessageRead && (
            <div className="space-y-2">
              <p className="text-base font-bold text-zinc-100 sm:text-sm sm:font-medium">Inbox</p>
              <PlayerInboxPanel
                messages={inboxMessages}
                unreadCount={unreadMessageCount}
                loading={inboxLoading}
                onMarkRead={onMarkMessageRead}
              />
            </div>
          )}

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
            <p className="text-base font-bold text-zinc-100 sm:text-sm sm:font-medium">Sound</p>
            <div className="flex min-h-12 items-center justify-between rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-2.5">
              <div className="flex items-center gap-2 text-base text-zinc-100 sm:text-sm">
                {muted ? <VolumeX className="h-4 w-4 text-zinc-300" /> : <Volume2 className="h-4 w-4 text-cyan-100" />}
                {muted ? 'Sound off' : 'Sound on'}
              </div>
              <Switch checked={!muted} onCheckedChange={handleToggleSound} />
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

        </div>
      </DialogContent>
    </Dialog>
  );
};

export default SettingsDialog;
