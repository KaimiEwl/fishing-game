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
import { publicAsset } from '@/lib/assets';
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
      <DialogContent
        className="h-[min(90svh,46rem)] w-[min(72rem,calc(100vw-0.75rem))] max-w-none overflow-hidden border-0 bg-transparent p-0 text-[#f0d09b] shadow-[0_32px_80px_rgba(0,0,0,0.72)]"
        style={{
          backgroundImage: `url(${publicAsset('assets/boost_board_reference.webp')})`,
          backgroundPosition: 'center',
          backgroundSize: 'cover',
        }}
      >
        <DialogHeader className="sr-only">
          <DialogTitle>
            <Zap className="h-5 w-5 text-amber-300" />
            {canOfferPremiumSession ? 'Boosts & Sessions' : 'Boost'}
          </DialogTitle>
          <DialogDescription>
            {canOfferPremiumSession
              ? 'Buy instant boosts or launch a premium MON fishing session.'
              : 'Buy boost with MON from the main screen.'}
          </DialogDescription>
        </DialogHeader>

        <div className="relative z-10 flex h-full min-h-0 flex-col px-[7.5%] pb-[8.8%] pt-[18.5%] sm:px-[20.4%] sm:pb-[16%] sm:pt-[19.4%]">
        <div className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden pr-1 [touch-action:pan-y]">
          <div className="grid gap-3">
          {canOfferPremiumSession && hasActivePremiumSession && (
            <div className="rounded-[1rem] border border-emerald-300/25 bg-[rgba(16,38,26,0.78)] p-3 text-sm text-emerald-100 shadow-[0_12px_24px_rgba(0,0,0,0.34)]">
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

          <div className="grid gap-3">
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
                  className="rounded-[1.05rem] border border-[#725130] bg-[linear-gradient(180deg,rgba(38,25,16,0.95)_0%,rgba(31,21,14,0.92)_100%)] p-3 text-[#f0d09b] shadow-[inset_0_0_0_1px_rgba(255,215,150,0.06),0_12px_24px_rgba(0,0,0,0.34)] transition-colors duration-200 hover:border-[#9d7141]"
                >
                  <div className="mb-3 flex items-start justify-between gap-3">
                    <div>
                      <p className="flex items-center gap-2 font-black text-[#f8e8bf]">
                        {isPremiumSession ? <Sparkles className="h-4 w-4 text-emerald-300" /> : null}
                        {pkg.title}
                      </p>
                      <p className="text-sm text-[#f8e8bf]/72">{pkg.description}</p>
                      {isPremiumSession ? (
                        <div className="mt-2 flex flex-wrap gap-2 text-[11px] font-semibold text-[#f8e8bf]/80">
                          <span className="rounded-lg border border-[#6f4928] bg-[rgba(15,10,7,0.72)] px-2 py-1">
                            <Fish className="mr-1 inline h-3.5 w-3.5 text-cyan-300" />
                            Fish always
                          </span>
                          <span className="rounded-lg border border-[#6f4928] bg-[rgba(15,10,7,0.72)] px-2 py-1">
                            +12 coins / +18 XP
                          </span>
                          <span className="rounded-lg border border-[#6f4928] bg-[rgba(15,10,7,0.72)] px-2 py-1">
                            Luck Meter active
                          </span>
                        </div>
                      ) : null}
                    </div>
                    <span className="inline-flex items-center gap-1 rounded-lg border border-[#8f6a38]/70 bg-[rgba(16,11,8,0.84)] px-2.5 py-1 text-sm font-black text-[#f3c777]">
                      <Coins className="h-4 w-4" />
                      {pkg.monAmount} MON
                    </span>
                  </div>
                  <Button
                    onClick={() => handlePurchase(pkg.id, pkg.monAmount, { isPremiumSession })}
                    disabled={isDisabled}
                    className="w-full rounded-[1rem] border border-[#7f5227] bg-[linear-gradient(180deg,#8c531f_0%,#6e4117_42%,#4f2f14_100%)] font-black uppercase tracking-[0.04em] text-[#f8db9a] hover:brightness-110 disabled:border-[#3a2817] disabled:bg-[linear-gradient(180deg,#2f241c_0%,#231b15_100%)] disabled:text-[#8c7b63]"
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
            <p className="text-center text-xs font-semibold text-[#f8e8bf]/58">
              Connect wallet to pay with MON.
            </p>
          )}
        </div>
        </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default BoostDialog;
