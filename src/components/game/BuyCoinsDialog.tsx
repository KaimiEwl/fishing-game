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
import { publicAsset } from '@/lib/assets';

const RECEIVER_ADDRESS = '0x0266Bd01196B04a7A57372Fc9fB2F34374E6327D' as const;

const COIN_PACKAGES = [
  { monAmount: '0.01', coins: 10, emoji: '🪙' },
  { monAmount: '0.05', coins: 50, emoji: '🪙🪙' },
  { monAmount: '0.1', coins: 100, emoji: 'coin' },
  { monAmount: '0.5', coins: 500, emoji: 'coin2' },
  { monAmount: '1', coins: 1000, emoji: '💎' },
];

const ROD_IMAGES = [
  publicAsset('assets/rod_basic.png'),
  publicAsset('assets/rod_bamboo.png'),
  publicAsset('assets/rod_carbon.png'),
  publicAsset('assets/rod_pro.png'),
  publicAsset('assets/rod_legendary.png'),
];

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
    } catch (err: any) {
      console.error('Purchase failed:', err);
      if (err?.message?.includes('User rejected')) {
        toast.error('Transaction cancelled');
      } else {
        toast.error('Purchase error: ' + (err?.shortMessage || err?.message || 'Unknown'));
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

      const { data, error } = await supabase.functions.invoke('mint-nft-rod', {
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
    } catch (err: any) {
      console.error('NFT mint failed:', err);
      if (err?.message?.includes('User rejected')) {
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
          className="gap-1.5 sm:gap-2 bg-card/90 backdrop-blur-sm border-2 border-primary/30 hover:border-primary/50 hover:bg-card text-xs sm:text-sm h-9 sm:h-10 px-2.5 sm:px-4"
        >
          <span className="text-base sm:text-lg">💎</span>
          <span className="hidden sm:inline">Buy with MON</span>
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-[95vw] sm:max-w-md bg-card/95 backdrop-blur-md border-2 border-primary/30">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl">
            <span>💎</span>
            Buy with MON
          </DialogTitle>
        </DialogHeader>

        <Tabs defaultValue="coins" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="coins" className="flex items-center gap-1"><CoinIcon size={14} /> Coins</TabsTrigger>
            <TabsTrigger value="nft">✨ NFT Rods</TabsTrigger>
          </TabsList>

          <TabsContent value="coins" className="mt-4">
            <p className="text-sm text-muted-foreground mb-4">
              Send MON and receive game coins. Rate: 0.1 MON = 100 coins.
            </p>
            <div className="grid gap-3">
              {COIN_PACKAGES.map((pkg) => {
                const isLoading = isPurchasing && selectedPackage?.monAmount === pkg.monAmount;
                return (
                  <Button
                    key={pkg.monAmount}
                    variant="outline"
                    className="h-auto flex-row justify-between py-4 px-5 hover:border-primary/50"
                    disabled={isPurchasing}
                    onClick={() => handlePurchase(pkg)}
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-2xl">
                        {pkg.emoji === 'coin' ? <CoinIcon size={28} /> : pkg.emoji === 'coin2' ? <><CoinIcon size={28} /><CoinIcon size={28} /></> : pkg.emoji}
                      </span>
                      <span className="font-bold text-lg">{pkg.coins} coins</span>
                    </div>
                    <span className="text-primary font-mono font-bold">
                      {isLoading ? '⏳...' : `${pkg.monAmount} MON`}
                    </span>
                  </Button>
                );
              })}
            </div>
            <p className="text-xs text-muted-foreground mt-3 text-center">
              Monad Mainnet • Transaction confirmed automatically
            </p>
          </TabsContent>

          <TabsContent value="nft" className="mt-4">
            <p className="text-sm text-muted-foreground mb-3">
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
                          ? 'bg-yellow-500/10 border-yellow-500/40'
                          : hasRod
                            ? 'bg-muted/50 border-yellow-500/20 hover:border-yellow-500/40'
                            : 'bg-muted/30 border-border opacity-50'
                      }`}
                    >
                      <div className={`w-12 h-12 rounded-lg flex items-center justify-center overflow-hidden relative ${isOwned ? 'ring-2 ring-yellow-500' : ''}`}>
                        <img src={ROD_IMAGES[nft.rodLevel]} alt={nft.name} className="h-10 object-contain" />
                        {isOwned && (
                          <div className="absolute -top-1 -right-1 bg-yellow-500 text-black text-[8px] font-bold px-1 rounded">
                            NFT
                          </div>
                        )}
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="font-semibold text-sm flex items-center gap-2">
                          {nft.name}
                          {isOwned && <span className="text-yellow-500 text-xs">✓ NFT</span>}
                        </div>
                        <div className="text-xs text-muted-foreground space-y-0.5">
                          <div>+{nft.rarityBonus}% rare fish chance</div>
                          <div>+{nft.xpBonus}% XP</div>
                          {nft.sellBonus > 0 && <div>+{nft.sellBonus}% sell price</div>}
                        </div>
                      </div>

                      {isOwned ? (
                        <span className="text-yellow-500 font-bold text-sm whitespace-nowrap">✓ Minted</span>
                      ) : (
                        <Button
                          size="sm"
                          disabled={!hasRod || isMinting}
                          onClick={() => handleMint(nft)}
                          className="bg-yellow-500 hover:bg-yellow-600 text-black whitespace-nowrap"
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
