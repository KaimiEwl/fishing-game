import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useSendTransaction } from 'wagmi';
import { parseEther } from 'viem';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { NFT_ROD_DATA } from '@/types/game';
import CoinIcon from './CoinIcon';
import { Check, Gem } from 'lucide-react';
import { ROD_DISPLAY_INFO } from '@/lib/rodAssets';
import { getErrorMessage, isUserRejectedError } from '@/lib/errorUtils';

const RECEIVER_ADDRESS = '0x0266Bd01196B04a7A57372Fc9fB2F34374E6327D' as const;

const COIN_PACKAGES = [
  { monAmount: '0.01', coins: 10, premium: false },
  { monAmount: '0.05', coins: 50, premium: false },
  { monAmount: '0.1', coins: 100, premium: false },
  { monAmount: '0.5', coins: 500, premium: false },
  { monAmount: '1', coins: 1000, premium: true },
];

const ROD_IMAGES = ROD_DISPLAY_INFO.map((rod) => rod.image);

const ROD_NAMES = ['Starter', 'Bamboo', 'Carbon', 'Pro', 'Legendary'];

interface BuyCoinsDialogProps {
  walletAddress?: string;
  onCoinsAdded: (amount: number) => void;
  rodLevel: number;
  nftRods: number[];
  onNftMinted: (rodLevel: number) => void;
}

const BuyCoinsDialog: React.FC<BuyCoinsDialogProps> = ({ walletAddress, onCoinsAdded, rodLevel, nftRods, onNftMinted }) => {
  const [selectedPackage, setSelectedPackage] = useState<typeof COIN_PACKAGES[0] | null>(null);
  const [isPurchasing, setIsPurchasing] = useState(false);
  const [mintingLevel, setMintingLevel] = useState<number | null>(null);

  const { sendTransactionAsync } = useSendTransaction();

  const handlePurchase = async (pkg: typeof COIN_PACKAGES[0]) => {
    if (!walletAddress || isPurchasing) return;
    
    setSelectedPackage(pkg);
    setIsPurchasing(true);

    try {
      const txHash = await sendTransactionAsync({
        to: RECEIVER_ADDRESS,
        value: parseEther(pkg.monAmount),
      });

      toast.info('Transaction sent, awaiting confirmation...');

      const { data, error } = await supabase.functions.invoke('verify-purchase', {
        body: {
          tx_hash: txHash,
          wallet_address: walletAddress,
          expected_coins: pkg.coins,
          expected_mon: pkg.monAmount,
        },
      });

      if (error) throw error;
      if (!data?.success) throw new Error(data?.error || 'Verification failed');

      onCoinsAdded(pkg.coins);
      toast.success(`+${pkg.coins} coins! 🎉`);
    } catch (err: unknown) {
      console.error('Purchase failed:', err);
      if (isUserRejectedError(err)) {
        toast.error('Transaction cancelled');
      } else {
        toast.error(`Purchase error: ${getErrorMessage(err)}`);
      }
    } finally {
      setIsPurchasing(false);
      setSelectedPackage(null);
    }
  };

  const handleMint = async (nftRod: typeof NFT_ROD_DATA[0]) => {
    if (!walletAddress) {
      toast.error('Wallet not connected');
      return;
    }

    setMintingLevel(nftRod.rodLevel);
    try {
      const txHash = await sendTransactionAsync({
        to: RECEIVER_ADDRESS as `0x${string}`,
        value: parseEther(nftRod.mintCost),
      });

      toast.info('Transaction sent, verifying...');

      const { data, error } = await supabase.functions.invoke('verify-purchase', {
        body: {
          tx_hash: txHash,
          wallet_address: walletAddress,
          rod_level: nftRod.rodLevel,
          expected_mon: nftRod.mintCost,
        },
      });

      if (error || !data?.success) {
        throw new Error(data?.error || 'Verification failed');
      }

      onNftMinted(nftRod.rodLevel);
      toast.success(`🎉 NFT ${ROD_NAMES[nftRod.rodLevel]} minted!`);
    } catch (err: unknown) {
      console.error('NFT mint failed:', err);
      if (isUserRejectedError(err)) {
        toast.error('Transaction cancelled');
      } else {
        toast.error('NFT mint error');
      }
    } finally {
      setMintingLevel(null);
    }
  };

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button
          variant="outline"
          className="h-12 min-w-12 gap-2 rounded-lg border border-cyan-300/20 bg-black/85 px-3 text-cyan-100 shadow-lg backdrop-blur-md hover:border-cyan-300/40 hover:bg-zinc-950 sm:h-14 sm:min-w-[8.25rem]"
          aria-label="Buy with MON"
        >
          <Gem className="h-5 w-5 sm:h-6 sm:w-6" />
          <span className="hidden text-sm font-bold sm:inline">Buy MON</span>
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[calc(100svh-1rem)] max-w-[calc(100vw-1rem)] border border-cyan-300/15 bg-black/95 text-zinc-100 shadow-2xl backdrop-blur-md sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl text-zinc-100">
            <Gem className="h-5 w-5 text-cyan-100" />
            Buy with MON
          </DialogTitle>
        </DialogHeader>

        <Tabs defaultValue="coins" className="w-full">
          <TabsList className="grid w-full grid-cols-2 bg-zinc-950">
            <TabsTrigger value="coins" className="flex items-center gap-1 data-[state=active]:bg-black data-[state=active]:text-cyan-100"><CoinIcon size="sm" /> Coins</TabsTrigger>
            <TabsTrigger value="nft" className="gap-1.5 data-[state=active]:bg-black data-[state=active]:text-cyan-100"><Gem className="h-4 w-4" /> NFT Rods</TabsTrigger>
          </TabsList>

          <TabsContent value="coins" className="mt-4">
            <p className="mb-4 text-sm text-zinc-500">
              Send MON and receive game coins. Rate: 0.1 MON = 100 coins.
            </p>
            <div className="grid gap-3">
              {COIN_PACKAGES.map((pkg) => {
                const isLoading = isPurchasing && selectedPackage?.monAmount === pkg.monAmount;
                return (
                  <Button
                    key={pkg.monAmount}
                    variant="outline"
                    className="h-auto flex-row justify-between border-zinc-800 bg-zinc-950 px-5 py-4 text-zinc-100 hover:border-cyan-300/30 hover:bg-black"
                    disabled={isPurchasing}
                    onClick={() => handlePurchase(pkg)}
                  >
                    <div className="flex items-center gap-3">
                    {pkg.premium ? <Gem className="h-7 w-7 text-cyan-100" /> : <CoinIcon size="xl" />}
                      <span className="font-bold text-lg">{pkg.coins} coins</span>
                    </div>
                    <span className="font-mono font-bold text-cyan-100">
                      {isLoading ? '⏳...' : `${pkg.monAmount} MON`}
                    </span>
                  </Button>
                );
              })}
            </div>
            <p className="mt-3 text-center text-xs text-zinc-500">
              Transaction confirmed automatically
            </p>
          </TabsContent>

          <TabsContent value="nft" className="mt-4">
            <p className="mb-3 text-sm text-zinc-500">
              Mint NFT versions of rods for MON and get bonuses!
            </p>
            <ScrollArea className="h-[min(220px,35vh)] pr-2">
              <div className="space-y-3">
                {NFT_ROD_DATA.map((nft) => {
                  const isOwned = nftRods.includes(nft.rodLevel);
                  const hasRod = rodLevel >= nft.rodLevel;
                  const isMinting = mintingLevel === nft.rodLevel;

                  return (
                    <div
                      key={nft.rodLevel}
                      className={`flex items-center gap-3 p-3 rounded-lg border transition-colors ${
                        isOwned
                          ? 'border-cyan-300/35 bg-zinc-950'
                          : hasRod
                            ? 'border-zinc-800 bg-zinc-950 hover:border-cyan-300/25'
                            : 'border-zinc-800 bg-black opacity-50'
                      }`}
                    >
                      <div className={`relative flex h-12 w-12 items-center justify-center overflow-hidden rounded-lg bg-black/70 ${isOwned ? 'ring-2 ring-cyan-300/40' : ''}`}>
                        <img src={ROD_IMAGES[nft.rodLevel]} alt={nft.name} className="h-10 object-contain" />
                        {isOwned && (
                          <div className="absolute -right-1 -top-1 rounded bg-cyan-300 px-1 text-[8px] font-bold text-black">
                            NFT
                          </div>
                        )}
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="font-semibold text-sm flex items-center gap-2">
                          {nft.name}
                          {isOwned && <span className="inline-flex items-center gap-1 text-xs text-cyan-100"><Check className="h-3 w-3" /> NFT</span>}
                        </div>
                        <div className="space-y-0.5 text-xs text-zinc-500">
                          <div>+{nft.rarityBonus}% rare fish chance</div>
                          <div>+{nft.xpBonus}% XP</div>
                          {nft.sellBonus > 0 && <div>+{nft.sellBonus}% sell price</div>}
                        </div>
                      </div>

                      {isOwned ? (
                        <span className="inline-flex whitespace-nowrap text-sm font-bold text-cyan-100">
                          <Check className="h-4 w-4" /> Minted
                        </span>
                      ) : (
                        <Button
                          size="sm"
                          disabled={!hasRod || isMinting}
                          onClick={() => handleMint(nft)}
                          className="whitespace-nowrap border border-cyan-300/25 bg-zinc-950 text-cyan-100 hover:bg-black"
                        >
                          {isMinting ? '...' : `${nft.mintCost} MON`}
                        </Button>
                      )}
                    </div>
                  );
                })}
              </div>
            </ScrollArea>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
};

export default BuyCoinsDialog;
