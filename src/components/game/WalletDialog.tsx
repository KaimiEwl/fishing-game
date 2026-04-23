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
import { ConnectButton } from '@rainbow-me/rainbowkit';
import { useBalance } from 'wagmi';
import { Check, ExternalLink, ShieldAlert, ShieldCheck, Wallet } from 'lucide-react';
import type { MonBalanceSummary, PlayerWithdrawRequest } from '@/hooks/usePlayerMon';
import { formatMonAmount } from '@/lib/monRewards';
import { cn } from '@/lib/utils';

interface WalletDialogProps {
  isConnected: boolean;
  isVerified?: boolean;
  isVerifying?: boolean;
  verificationError?: string | null;
  onRetryWalletVerification?: () => Promise<unknown> | void;
  nickname: string;
  onSetNickname?: (nickname: string) => void;
  walletAddress?: string;
  monSummary?: MonBalanceSummary;
  monRequests?: PlayerWithdrawRequest[];
  monLoading?: boolean;
  monRequesting?: boolean;
  onRequestMonWithdraw?: () => Promise<unknown> | void;
}

const NICKNAME_REGEX = /^[\p{L}0-9_-]{2,20}$/u;

const WalletDialog: React.FC<WalletDialogProps> = ({
  isConnected,
  isVerified = false,
  isVerifying = false,
  verificationError = null,
  onRetryWalletVerification,
  nickname,
  onSetNickname,
  walletAddress,
  monSummary,
  monRequests = [],
  monLoading = false,
  monRequesting = false,
  onRequestMonWithdraw,
}) => {
  const [open, setOpen] = useState(false);
  const [nickInput, setNickInput] = useState(nickname);
  const [error, setError] = useState('');
  const [saved, setSaved] = useState(false);
  const pendingWalletModalRef = useRef<(() => void) | null>(null);
  const walletModalTimerRef = useRef<number | null>(null);

  const nicknameAlreadySet = !!nickname && nickname.length > 0;
  const canRequestWithdraw = Boolean(
    isConnected
    && monSummary
    && monSummary.withdrawableMon >= monSummary.minWithdrawMon
    && !monRequesting,
  );

  const { data: balanceData } = useBalance({
    address: walletAddress as `0x${string}` | undefined,
    query: { enabled: !!walletAddress },
  });

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

  useEffect(() => {
    setNickInput(nickname);
    setSaved(false);
    setError('');
  }, [nickname]);

  useEffect(() => () => {
    if (walletModalTimerRef.current !== null) {
      window.clearTimeout(walletModalTimerRef.current);
      walletModalTimerRef.current = null;
    }
  }, []);

  const handleWalletModalOpen = (openModal?: (() => void) | null) => {
    if (!openModal) return;

    pendingWalletModalRef.current = openModal;
    setOpen(false);
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

  const statusTone = !isConnected
    ? 'border-cyan-300/20 bg-black/85 text-cyan-100 hover:border-cyan-300/40'
    : isVerified
      ? 'border-emerald-300/25 bg-emerald-950/45 text-emerald-100 hover:border-emerald-300/45'
      : 'border-amber-300/25 bg-amber-950/45 text-amber-100 hover:border-amber-300/45';

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          variant="outline"
          size="icon"
          className={`relative h-11 w-11 rounded-full shadow-md outline-none backdrop-blur-md transition-all hover:scale-105 hover:bg-zinc-950 active:scale-95 sm:h-8 sm:w-8 ${statusTone}`}
          aria-label={isConnected ? (isVerified ? 'Wallet linked' : 'Wallet needs verification') : 'Open wallet'}
        >
          <Wallet className="h-5 w-5 sm:h-4 sm:w-4" />
          <span
            className={`absolute -right-0.5 -top-0.5 h-3.5 w-3.5 rounded-full border border-black/50 ${
              !isConnected ? 'bg-cyan-300/70' : isVerified ? 'bg-emerald-300' : 'bg-amber-300'
            }`}
          />
        </Button>
      </DialogTrigger>

      <DialogContent className="max-w-[calc(100vw-1rem)] border border-cyan-300/15 bg-black/95 text-zinc-100 shadow-2xl backdrop-blur-md sm:max-w-sm">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl text-zinc-100">
            <Wallet className="h-5 w-5 text-cyan-100" />
            Wallet
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 text-base sm:text-sm">
          {isConnected ? (
            <ConnectButton.Custom>
              {({ account, openAccountModal }) => (
                <div className="space-y-3">
                  <div className="rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-3">
                    <div className="flex items-center justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-zinc-400">Connected wallet</p>
                        <p className="mt-1 truncate text-sm font-semibold text-zinc-100">
                          {account?.displayName || account?.address}
                        </p>
                      </div>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleWalletModalOpen(openAccountModal)}
                        className="h-10 gap-1 border-zinc-800 bg-black px-3 text-zinc-100 hover:bg-zinc-950"
                      >
                        <ExternalLink className="h-3.5 w-3.5" />
                        Manage
                      </Button>
                    </div>
                    {balanceData && (
                      <div className="mt-3 rounded-lg border border-zinc-800 bg-black/70 px-3 py-2 text-sm">
                        <span className="text-zinc-300">Balance: </span>
                        <span className="font-bold text-zinc-100">
                          {parseFloat(balanceData.formatted).toFixed(4)} {balanceData.symbol}
                        </span>
                      </div>
                    )}
                  </div>

                  {isVerified ? (
                    <div className="rounded-lg border border-emerald-300/20 bg-emerald-950/30 px-3 py-3">
                      <div className="flex items-center gap-2 text-emerald-100">
                        <ShieldCheck className="h-4 w-4" />
                        <p className="text-sm font-semibold">Wallet linked to your progress.</p>
                      </div>
                      <p className="mt-1 text-xs font-medium text-emerald-100/80">
                        Referrals, save sync, and MON features are ready on this wallet.
                      </p>
                    </div>
                  ) : (
                    <div className="rounded-lg border border-amber-300/20 bg-amber-950/30 px-3 py-3">
                      <div className="flex items-center gap-2 text-amber-100">
                        <ShieldAlert className="h-4 w-4" />
                        <p className="text-sm font-semibold">Wallet connected, but not verified yet.</p>
                      </div>
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

                  {isVerified && (
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

                  {isVerified && monSummary && (
                    <div className="rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-3">
                      <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-zinc-400">MON Rewards</p>
                      <div className="mt-3 grid grid-cols-2 gap-2">
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
                  )}
                </div>
              )}
            </ConnectButton.Custom>
          ) : (
            <ConnectButton.Custom>
              {({ openConnectModal }) => (
                <div className="space-y-3">
                  <Button
                    onClick={() => handleWalletModalOpen(openConnectModal)}
                    className="h-11 w-full gap-2 border border-cyan-300/25 bg-zinc-950 text-cyan-100 hover:bg-black"
                    style={{ background: 'linear-gradient(135deg, #020617, #083344)' }}
                  >
                    Connect wallet
                  </Button>
                  <p className="text-xs font-medium text-zinc-400">
                    Link your wallet here for referrals, synced progress, and MON actions without opening Settings.
                  </p>
                </div>
              )}
            </ConnectButton.Custom>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default WalletDialog;
