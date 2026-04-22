import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { useSendTransaction } from 'wagmi';
import { waitForTransactionReceipt } from '@wagmi/core';
import { parseEther } from 'viem';
import { Coins, Crown, Fish, Rocket, Sparkles, Zap } from 'lucide-react';
import { toast } from 'sonner';
import { BOOST_ICON_SRC } from '@/lib/rodAssets';
import { isUserRejectedError } from '@/lib/errorUtils';
import { wagmiConfig } from '@/lib/wagmi';
import {
  PREMIUM_SESSION_CASTS,
  PREMIUM_SESSION_COST_MON,
} from '@/lib/baitEconomy';
import type { PremiumSessionState } from '@/types/game';

const RECEIVER_ADDRESS = '0x0266Bd01196B04a7A57372Fc9fB2F34374E6327D' as const;

const BOOST_PACKAGES = [
  {
    id: 'boost',
    title: 'Boost',
    description: 'Premium boost purchase with MON.',
    monAmount: '0.1',
  },
];

interface BoostDialogProps {
  walletAddress?: string;
  premiumSession?: PremiumSessionState | null;
  onStartPremiumSession?: (txHash: string) => Promise<void>;
  premiumSessionLoading?: boolean;
  premiumSessionsEnabled?: boolean;
}

const BoostDialog: React.FC<BoostDialogProps> = ({
  walletAddress,
  premiumSession,
  onStartPremiumSession,
  premiumSessionLoading = false,
  premiumSessionsEnabled = false,
}) => {
  const [selectedBoostId, setSelectedBoostId] = useState<string | null>(null);
  const { sendTransactionAsync } = useSendTransaction();
  const hasActivePremiumSession = premiumSession?.status === 'active';
  const canOfferPremiumSession = premiumSessionsEnabled && typeof onStartPremiumSession === 'function';

  const boostPackages = [
    ...BOOST_PACKAGES,
    ...(canOfferPremiumSession ? [{
      id: 'premium_session',
      title: 'MON Expedition',
      description: `20 premium casts. Fish always, bonus coins + XP always, chance to recover MON.`,
      monAmount: PREMIUM_SESSION_COST_MON,
      isPremiumSession: true,
    }] : []),
  ] as const;

  const handlePurchase = async (
    boostId: string,
    monAmount: string,
    options?: { isPremiumSession?: boolean },
  ) => {
    if (!walletAddress) {
      toast.error('Connect wallet first');
      return;
    }

    if (options?.isPremiumSession && hasActivePremiumSession) {
      toast.error('Premium session already active');
      return;
    }

    setSelectedBoostId(boostId);
    try {
      const txHash = await sendTransactionAsync({
        to: RECEIVER_ADDRESS,
        value: parseEther(monAmount),
      });

      if (options?.isPremiumSession) {
        toast.info('Transaction sent. Waiting for Monad confirmation...');
        const receipt = await waitForTransactionReceipt(wagmiConfig, {
          hash: txHash,
          confirmations: 1,
        });

        if (receipt.status !== 'success') {
          throw new Error('Premium session payment failed on-chain.');
        }

        if (!onStartPremiumSession) {
          throw new Error('Premium session is not available right now.');
        }

        await onStartPremiumSession(txHash);
        toast.success(`MON Expedition ready: ${PREMIUM_SESSION_CASTS} casts loaded`);
      } else {
        toast.success('Boost purchase sent');
      }
    } catch (err: unknown) {
      console.error('Boost purchase failed:', err);
      if (isUserRejectedError(err)) {
        toast.error('Transaction cancelled');
      } else {
        toast.error(err instanceof Error ? err.message : 'Boost purchase error');
      }
    } finally {
      setSelectedBoostId(null);
    }
  };

  return (
    <Dialog>
      <DialogTrigger asChild>
        <button
          type="button"
          className="group relative isolate overflow-visible bg-transparent outline-none transition-all duration-200 hover:scale-105 focus-visible:scale-105 active:scale-95"
          aria-label="Open boost shop"
        >
          <span
            aria-hidden="true"
            className="absolute inset-[12%] rounded-[1.5rem] bg-[radial-gradient(circle,rgba(42,116,255,0.32),rgba(15,23,42,0)_72%)] blur-md"
          />
          <img
            src={BOOST_ICON_SRC}
            alt=""
            aria-hidden="true"
            className="relative z-[1] block w-20 object-contain drop-shadow-[0_18px_30px_rgba(0,0,0,0.36)] transition-transform duration-300 group-hover:scale-[1.02] sm:w-24"
            draggable={false}
          />
        </button>
      </DialogTrigger>
      <DialogContent className="max-w-[calc(100vw-1rem)] border border-cyan-300/15 bg-black/95 text-zinc-100 shadow-2xl backdrop-blur-md sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl text-zinc-100">
            <Zap className="h-5 w-5 text-amber-300" />
            {canOfferPremiumSession ? 'Boosts & Sessions' : 'Boost'}
          </DialogTitle>
          <DialogDescription className="text-sm text-zinc-400">
            {canOfferPremiumSession
              ? 'Buy instant boosts or launch a premium MON fishing session.'
              : 'Buy boost with MON from the main screen.'}
          </DialogDescription>
        </DialogHeader>

        <div className="rounded-2xl border border-cyan-300/15 bg-zinc-950/80 p-3">
          <div className="mb-3 flex items-center gap-3">
            <img
              src={BOOST_ICON_SRC}
              alt=""
              aria-hidden="true"
              className="h-16 w-16 object-contain drop-shadow-[0_12px_24px_rgba(0,0,0,0.3)]"
              draggable={false}
            />
            <div>
              <p className="text-base font-black text-amber-300">
                {canOfferPremiumSession ? 'Premium boosts and sessions' : 'Premium Boost'}
              </p>
              <p className="text-sm text-zinc-400">
                {canOfferPremiumSession
                  ? 'Quick MON purchases without leaving the lake.'
                  : 'Fast purchase flow directly from the fishing screen.'}
              </p>
            </div>
          </div>

          {canOfferPremiumSession && hasActivePremiumSession && (
            <div className="mb-3 rounded-xl border border-emerald-300/25 bg-emerald-950/30 p-3 text-sm text-emerald-100">
              <div className="flex items-center gap-2 font-black uppercase tracking-[0.12em] text-emerald-200">
                <Crown className="h-4 w-4" />
                MON Expedition Active
              </div>
              <div className="mt-2 flex flex-wrap gap-2 text-xs text-emerald-100/90">
                <span className="rounded-lg border border-emerald-300/20 bg-black/30 px-2 py-1">
                  {premiumSession.castsRemaining}/{premiumSession.castsTotal} casts left
                </span>
                <span className="rounded-lg border border-emerald-300/20 bg-black/30 px-2 py-1">
                  Recovered {premiumSession.recoveredMon.toFixed(2)} / {PREMIUM_SESSION_COST_MON} MON
                </span>
                <span className="rounded-lg border border-emerald-300/20 bg-black/30 px-2 py-1">
                  Luck Meter {premiumSession.luckMeterStacks}
                </span>
              </div>
            </div>
          )}

          <div className="space-y-3">
            {boostPackages.map((pkg) => {
              const isBusy = selectedBoostId === pkg.id;
              const isPremiumSession = pkg.id === 'premium_session';
              const isDisabled = !walletAddress
                || isBusy
                || premiumSessionLoading
                || (isPremiumSession && hasActivePremiumSession);
              return (
                <div
                  key={pkg.id}
                  className="rounded-xl border border-zinc-800 bg-black/70 p-3 shadow-lg shadow-black/20"
                >
                  <div className="mb-3 flex items-start justify-between gap-3">
                    <div>
                      <p className="flex items-center gap-2 font-bold text-zinc-100">
                        {isPremiumSession ? <Sparkles className="h-4 w-4 text-emerald-300" /> : null}
                        {pkg.title}
                      </p>
                      <p className="text-sm text-zinc-400">{pkg.description}</p>
                      {isPremiumSession ? (
                        <div className="mt-2 flex flex-wrap gap-2 text-[11px] font-semibold text-zinc-300">
                          <span className="rounded-lg border border-zinc-800 bg-zinc-950/80 px-2 py-1">
                            <Fish className="mr-1 inline h-3.5 w-3.5 text-cyan-300" />
                            Fish always
                          </span>
                          <span className="rounded-lg border border-zinc-800 bg-zinc-950/80 px-2 py-1">
                            +12 coins / +18 XP
                          </span>
                          <span className="rounded-lg border border-zinc-800 bg-zinc-950/80 px-2 py-1">
                            Luck Meter active
                          </span>
                        </div>
                      ) : null}
                    </div>
                    <span className="inline-flex items-center gap-1 rounded-lg border border-cyan-300/15 bg-zinc-950 px-2.5 py-1 text-sm font-bold text-cyan-100">
                      <Coins className="h-4 w-4" />
                      {pkg.monAmount} MON
                    </span>
                  </div>
                  <Button
                    onClick={() => handlePurchase(pkg.id, pkg.monAmount, { isPremiumSession })}
                    disabled={isDisabled}
                    className="w-full rounded-xl border border-cyan-300/25 bg-zinc-950 font-bold text-cyan-100 hover:bg-black disabled:border-zinc-700 disabled:bg-zinc-900 disabled:text-zinc-400"
                  >
                    <Rocket className="mr-2 h-4 w-4" />
                    {isBusy
                      ? (isPremiumSession ? 'Preparing session...' : 'Processing...')
                      : isPremiumSession
                        ? hasActivePremiumSession
                          ? 'Session active'
                          : 'Start Expedition'
                        : 'Buy Boost'}
                  </Button>
                </div>
              );
            })}
          </div>

          {!walletAddress && (
            <p className="mt-3 text-center text-xs text-zinc-500">
              Connect wallet to pay with MON.
            </p>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default BoostDialog;
