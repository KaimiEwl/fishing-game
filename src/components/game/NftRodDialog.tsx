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
import { NFT_ROD_DATA, ROD_BONUSES } from '@/types/game';
import { supabase } from '@/integrations/supabase/client';
import { useSendTransaction } from 'wagmi';
import { parseEther } from 'viem';
import { toast } from 'sonner';
import { ROD_DISPLAY_INFO } from '@/lib/rodAssets';
import { isUserRejectedError } from '@/lib/errorUtils';

const ROD_IMAGES = ROD_DISPLAY_INFO.map((rod) => rod.image);

const ROD_NAMES = ['Starter', 'Bamboo', 'Carbon', 'Pro', 'Legendary'];

const RECEIVER_ADDRESS = '0x0266Bd01196B04a7A57372Fc9fB2F34374E6327D' as `0x${string}`;

interface NftRodDialogProps {
  rodLevel: number;
  nftRods: number[];
  walletAddress?: string;
  onMinted: (rodLevel: number) => void;
}

const NftRodDialog: React.FC<NftRodDialogProps> = ({
  rodLevel,
  nftRods,
  walletAddress,
  onMinted,
}) => {
  const [mintingLevel, setMintingLevel] = useState<number | null>(null);
  const { sendTransactionAsync } = useSendTransaction();

  const handleMint = async (nftRod: typeof NFT_ROD_DATA[0]) => {
    if (!walletAddress) {
      toast.error('Wallet not connected');
      return;
    }

    setMintingLevel(nftRod.rodLevel);
    try {
      const txHash = await sendTransactionAsync({
        to: RECEIVER_ADDRESS,
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

      onMinted(nftRod.rodLevel);
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
          className="gap-2 bg-card/90 backdrop-blur-sm border-2 border-yellow-500/30 hover:border-yellow-500/50 hover:bg-card"
        >
          <span className="text-lg">✨</span>
          <span>NFT Rods</span>
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg bg-card/95 backdrop-blur-md border-2 border-yellow-500/30">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl">
            <span>✨</span>
            NFT Rods
          </DialogTitle>
        </DialogHeader>

        <p className="text-sm text-muted-foreground mb-3">
          Mint NFT versions of rods for MON and get extra bonuses!
        </p>

        <ScrollArea className="h-[min(250px,35vh)] pr-2">
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
      </DialogContent>
    </Dialog>
  );
};

export default NftRodDialog;
