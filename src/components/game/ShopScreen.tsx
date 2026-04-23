import React, { useEffect, useState } from 'react';
import { Check, Package, ShipWheel, Worm } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ROD_BONUSES } from '@/types/game';
import { BAIT_PACKAGES } from '@/lib/baitEconomy';
import { publicAsset } from '@/lib/assets';
import { ROD_DISPLAY_INFO } from '@/lib/rodAssets';
import CoinIcon from './CoinIcon';
import BuyCoinsDialog from './BuyCoinsDialog';
import GameScreenShell from './GameScreenShell';
import QuestBoard, { QuestBoardCard, QuestBoardPlaque } from './QuestBoard';

interface ShopScreenProps {
  coins: number;
  bait: number;
  dailyFreeBait?: number;
  walletAddress?: string;
  rodLevel: number;
  nftRods?: number[];
  onBuyBait: (amount: number, cost: number) => void;
  onBuyRod: (level: number, cost: number) => void;
  onCoinsAdded: (amount: number) => void;
  onNftMinted: (rodLevel: number) => void;
}

const ROD_UPGRADES = [
  { level: 1, cost: 2500, name: 'Bamboo Rod', bonus: 5, image: ROD_DISPLAY_INFO[1].image, bobber: 'Green bobber', bobberColor: '#22aa44' },
  { level: 2, cost: 15000, name: 'Carbon Rod', bonus: 10, image: ROD_DISPLAY_INFO[2].image, bobber: 'Blue bobber', bobberColor: '#2255cc' },
  { level: 3, cost: 60000, name: 'Pro Rod', bonus: 15, image: ROD_DISPLAY_INFO[3].image, bobber: 'Purple bobber', bobberColor: '#9944ff' },
  { level: 4, cost: 250000, name: 'Legendary Rod', bonus: 25, image: ROD_DISPLAY_INFO[4].image, bobber: 'Golden glowing bobber', bobberColor: '#ffcc00' },
];

const ShopScreen: React.FC<ShopScreenProps> = ({
  coins,
  bait,
  dailyFreeBait = 0,
  walletAddress,
  rodLevel,
  nftRods = [],
  onBuyBait,
  onBuyRod,
  onCoinsAdded,
  onNftMinted,
}) => {
  const [isMobileLayout, setIsMobileLayout] = useState(() => (
    typeof window !== 'undefined' ? window.innerWidth < 768 : false
  ));

  useEffect(() => {
    const mediaQuery = window.matchMedia('(max-width: 767px)');
    const handleChange = (event: MediaQueryListEvent) => setIsMobileLayout(event.matches);

    setIsMobileLayout(mediaQuery.matches);
    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, []);

  const boardViewportInsets = isMobileLayout
    ? {
        mobile: {
          left: '8.4%',
          right: '8.4%',
          top: '16.8%',
          bottom: '18.6%',
        },
      }
    : {
        desktop: {
          left: '20.8%',
          right: '26.0%',
          top: '17.2%',
          bottom: '17.4%',
        },
      };

  const boardHeader = (
    <TabsList className="grid h-auto w-full grid-cols-2 gap-1 rounded-[1.1rem] border border-[#8f6a38]/70 bg-[rgba(16,11,8,0.84)] p-1 shadow-[0_18px_40px_rgba(0,0,0,0.35)] backdrop-blur-md sm:gap-1.5 sm:rounded-[1.35rem] sm:p-1.5">
      <TabsTrigger value="bait" className="h-9 gap-1.5 rounded-[0.8rem] px-2 text-[0.68rem] font-black uppercase tracking-[0.03em] text-[#ead4aa] data-[state=active]:border data-[state=active]:border-[#b6884b] data-[state=active]:bg-[rgba(48,31,14,0.92)] data-[state=active]:text-[#f8dfab] sm:h-10 sm:rounded-[0.95rem] sm:text-[0.82rem] sm:tracking-[0.05em]">
        <Worm className="h-4 w-4" />
        Bait
      </TabsTrigger>
      <TabsTrigger value="rods" className="h-9 gap-1.5 rounded-[0.8rem] px-2 text-[0.68rem] font-black uppercase tracking-[0.03em] text-[#ead4aa] data-[state=active]:border data-[state=active]:border-[#b6884b] data-[state=active]:bg-[rgba(48,31,14,0.92)] data-[state=active]:text-[#f8dfab] sm:h-10 sm:rounded-[0.95rem] sm:text-[0.82rem] sm:tracking-[0.05em]">
        <ShipWheel className="h-4 w-4" />
        Rods
      </TabsTrigger>
    </TabsList>
  );

  return (
    <GameScreenShell
      title="Shop"
      subtitle="Buy bait, rods, and gold with MON without leaving the app menu."
      backgroundImage={isMobileLayout ? publicAsset('assets/shop_board_mobile_reference.webp') : publicAsset('assets/shop_board_reference.webp')}
      backgroundFit="cover"
      overlayClassName="bg-[linear-gradient(180deg,rgba(8,6,3,0.10)_0%,rgba(10,8,5,0.12)_48%,rgba(6,5,3,0.18)_100%)]"
      headerHidden
      shellPaddingClassName="px-0 pb-[calc(var(--bottom-nav-clearance,6rem)+0.35rem)] pt-0"
      contentWrapperClassName="mx-auto mt-0 min-h-0 w-full flex-1 overflow-hidden"
    >
      <Tabs defaultValue="bait" className="flex h-full min-h-0 flex-col">
        <QuestBoard
          layout={isMobileLayout ? 'mobile' : 'desktop'}
          header={boardHeader}
          headerPlacement="fixed"
          viewportInsets={boardViewportInsets}
        >
          <TabsContent value="bait" className="mt-0">
            <div className="grid gap-2.5 sm:gap-3">
              {walletAddress && (
                <QuestBoardPlaque
                  eyebrow="Gold with MON"
                  description="Need guaranteed progress? Buy gold directly, then spend it on bait or rods."
                  action={(
                    <BuyCoinsDialog
                      walletAddress={walletAddress}
                      onCoinsAdded={onCoinsAdded}
                      rodLevel={rodLevel}
                      nftRods={nftRods}
                      onNftMinted={onNftMinted}
                    />
                  )}
                />
              )}
              <QuestBoardPlaque
                eyebrow="Bait supply"
                description={(
                  <>
                    Current bait: <span className="font-black text-[#f3c777]">{bait}</span>
                    {dailyFreeBait > 0 && (
                      <span className="block text-[0.74rem] text-[#f8e8bf]/72 sm:text-xs">
                        {dailyFreeBait} daily free + {Math.max(0, bait - dailyFreeBait)} reserve
                      </span>
                    )}
                  </>
                )}
              />
              <div className="grid grid-cols-2 gap-2.5 sm:gap-3 lg:grid-cols-4">
                {BAIT_PACKAGES.map((pkg) => {
                  return (
                    <Button
                      key={pkg.amount}
                      variant="outline"
                      className="h-32 flex-col gap-2 rounded-[1rem] border border-[#725130] bg-[linear-gradient(180deg,rgba(38,25,16,0.95)_0%,rgba(31,21,14,0.92)_100%)] text-[#f0d09b] shadow-[inset_0_0_0_1px_rgba(255,215,150,0.06),0_12px_24px_rgba(0,0,0,0.34)] transition-colors duration-200 hover:border-[#9d7141] hover:bg-[rgba(48,31,14,0.98)] disabled:border-[#3a2817] disabled:bg-[linear-gradient(180deg,#2f241c_0%,#231b15_100%)] disabled:text-[#8c7b63] sm:h-36"
                      disabled={coins < pkg.cost}
                      onClick={() => onBuyBait(pkg.amount, pkg.cost)}
                      aria-label={pkg.label}
                    >
                      {pkg.amount >= 50 ? (
                        <Package className="h-7 w-7 text-[#f3c777]" />
                      ) : (
                        <Worm className="h-7 w-7 text-[#f3c777]" />
                      )}
                      <span className="font-black">{pkg.amount} bait</span>
                      <span className="flex items-center gap-1 text-[#f3c777]"><CoinIcon size="sm" /> {pkg.cost}</span>
                    </Button>
                  );
                })}
              </div>
            </div>
          </TabsContent>

          <TabsContent value="rods" className="mt-0">
            <div className="grid gap-2.5 sm:gap-3">
              <QuestBoardPlaque
                eyebrow="Current rod"
                description={(
                  <>
                    <span className="font-black text-[#f3c777]">
                      {rodLevel === 0 ? 'Starter' : ROD_UPGRADES[rodLevel - 1]?.name}
                    </span>
                    <span className="ml-2 text-[0.74rem] text-[#f8e8bf]/72 sm:text-xs">
                      +{ROD_BONUSES[rodLevel]}% rare chance
                    </span>
                  </>
                )}
              />
              <div className="grid gap-2.5 sm:gap-3 lg:grid-cols-2">
              {ROD_UPGRADES.map((rod) => {
                const isOwned = rodLevel >= rod.level;
                const canBuy = !isOwned && coins >= rod.cost;

                return (
                  <QuestBoardCard key={rod.level}>
                    <div className="flex h-full flex-col gap-3 sm:flex-row sm:items-center">
                    <div className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-[#6f4928] bg-[rgba(15,10,7,0.72)] shadow-inner">
                      <img src={rod.image} alt={rod.name} className="h-14 w-14 object-contain" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="font-black text-[#f8e8bf]">{rod.name}</div>
                      <div className="text-xs font-medium text-[#f8e8bf]/72">+{rod.bonus}% rare fish chance</div>
                      <div className="mt-1 text-xs font-semibold" style={{ color: rod.bobberColor }}>{rod.bobber}</div>
                    </div>
                    {isOwned ? (
                      <span className="shrink-0 text-sm font-black text-[#f3c777]">
                        <Check className="mr-1 inline h-4 w-4" />
                        Owned
                        {nftRods.includes(rod.level) && <span className="ml-1 text-[#f8e8bf]">NFT</span>}
                      </span>
                    ) : (
                      <Button
                        size="sm"
                        disabled={!canBuy}
                        onClick={() => onBuyRod(rod.level, rod.cost)}
                        className="min-h-10 w-full shrink-0 rounded-[1rem] border border-[#7f5227] bg-[linear-gradient(180deg,#8c531f_0%,#6e4117_42%,#4f2f14_100%)] text-[#f8db9a] hover:brightness-110 disabled:border-[#3a2817] disabled:bg-[linear-gradient(180deg,#2f241c_0%,#231b15_100%)] disabled:text-[#8c7b63] sm:w-auto"
                      >
                    <CoinIcon size="sm" /> {rod.cost}
                      </Button>
                    )}
                    </div>
                  </QuestBoardCard>
                );
              })}
              </div>
            </div>
          </TabsContent>
        </QuestBoard>
      </Tabs>
    </GameScreenShell>
  );
};

export default ShopScreen;
