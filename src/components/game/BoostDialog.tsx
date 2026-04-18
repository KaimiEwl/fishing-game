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
import { parseEther } from 'viem';
import { Gem, Rocket, Zap } from 'lucide-react';
import { toast } from 'sonner';
import { BOOST_ICON_SRC } from '@/lib/rodAssets';
import { isUserRejectedError } from '@/lib/errorUtils';

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
}

const BoostDialog: React.FC<BoostDialogProps> = ({ walletAddress }) => {
  const [selectedBoostId, setSelectedBoostId] = useState<string | null>(null);
  const { sendTransactionAsync } = useSendTransaction();

  const handlePurchase = async (boostId: string, monAmount: string) => {
    if (!walletAddress) {
      toast.error('Connect wallet first');
      return;
    }

    setSelectedBoostId(boostId);
    try {
      await sendTransactionAsync({
        to: RECEIVER_ADDRESS,
        value: parseEther(monAmount),
      });

      toast.success('Boost purchase sent');
    } catch (err: unknown) {
      console.error('Boost purchase failed:', err);
      if (isUserRejectedError(err)) {
        toast.error('Transaction cancelled');
      } else {
        toast.error('Boost purchase error');
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
            Boost
          </DialogTitle>
          <DialogDescription className="text-sm text-zinc-400">
            Buy boost with MON from the main screen.
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
              <p className="text-base font-black text-amber-300">Premium Boost</p>
              <p className="text-sm text-zinc-400">Fast purchase flow directly from the fishing screen.</p>
            </div>
          </div>

          <div className="space-y-3">
            {BOOST_PACKAGES.map((pkg) => {
              const isBusy = selectedBoostId === pkg.id;
              return (
                <div
                  key={pkg.id}
                  className="rounded-xl border border-zinc-800 bg-black/70 p-3 shadow-lg shadow-black/20"
                >
                  <div className="mb-3 flex items-start justify-between gap-3">
                    <div>
                      <p className="font-bold text-zinc-100">{pkg.title}</p>
                      <p className="text-sm text-zinc-400">{pkg.description}</p>
                    </div>
                    <span className="inline-flex items-center gap-1 rounded-lg border border-cyan-300/15 bg-zinc-950 px-2.5 py-1 text-sm font-bold text-cyan-100">
                      <Gem className="h-4 w-4" />
                      {pkg.monAmount} MON
                    </span>
                  </div>
                  <Button
                    onClick={() => handlePurchase(pkg.id, pkg.monAmount)}
                    disabled={!walletAddress || isBusy}
                    className="w-full rounded-xl border border-cyan-300/25 bg-zinc-950 font-bold text-cyan-100 hover:bg-black disabled:border-zinc-700 disabled:bg-zinc-900 disabled:text-zinc-400"
                  >
                    <Rocket className="mr-2 h-4 w-4" />
                    {isBusy ? 'Processing...' : 'Buy Boost'}
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
