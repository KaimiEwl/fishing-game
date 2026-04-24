import React, { useEffect, useState } from 'react';
import { Check, Coins, Package, ShipWheel, Sparkles, Worm } from 'lucide-react';
import { useSendTransaction } from 'wagmi';
import { parseEther } from 'viem';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { FISH_DATA, NFT_ROD_DATA, type FishingNetState, ROD_BONUSES } from '@/types/game';
import {
  BAIT_PACKAGES,
  FISHING_NET_DAILY_FISH_COUNT,
  FISHING_NET_PAYBACK_DAYS_ESTIMATE,
  MON_CUBE_SPIN_PACKAGES,
  MON_FISHING_NET_PACKAGES,
  MON_MARKET_RECEIVER_ADDRESS,
  MON_ROD_PURCHASES,
} from '@/lib/baitEconomy';
import { publicAsset } from '@/lib/assets';
import { getErrorMessage, isUserRejectedError } from '@/lib/errorUtils';
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
  fishingNet: FishingNetState;
  nftRods?: number[];
  onBuyBait: (amount: number, cost: number) => void;
  onBuyRod: (level: number, cost: number) => void;
  onBuyFishingNetWithMon: (dailyFishCount: number, monAmount: string) => boolean;
  onClaimFishingNet: () => void;
  onBuyRodWithMon: (level: number, monAmount: string) => void;
  onBuyCubeRollsWithMon: (amount: number, monAmount: string) => boolean;
  onCoinsAdded: (amount: number) => void;
  onNftMinted: (rodLevel: number) => void;
}

const ROD_UPGRADES = [
  { level: 1, cost: 2500, name: 'Bamboo Rod', bonus: 5, image: ROD_DISPLAY_INFO[1].image, bobber: 'Green bobber', bobberColor: '#22aa44' },
  { level: 2, cost: 15000, name: 'Carbon Rod', bonus: 10, image: ROD_DISPLAY_INFO[2].image, bobber: 'Blue bobber', bobberColor: '#2255cc' },
  { level: 3, cost: 60000, name: 'Pro Rod', bonus: 15, image: ROD_DISPLAY_INFO[3].image, bobber: 'Purple bobber', bobberColor: '#9944ff' },
  { level: 4, cost: 250000, name: 'Legendary Rod', bonus: 25, image: ROD_DISPLAY_INFO[4].image, bobber: 'Golden glowing bobber', bobberColor: '#ffcc00' },
] as const;

const FISHING_NET_SHOP_ICON_SRC = publicAsset('assets/fishing_net_shop_icon.png');
const SHOP_TOAST_DURATION_MS = 5600;
const SHOP_BUTTON_CLASS_NAME = 'min-h-11 rounded-[1rem] border border-[#7f5227] bg-[linear-gradient(180deg,#8c531f_0%,#6e4117_42%,#4f2f14_100%)] text-[#f8db9a] hover:brightness-110 disabled:border-[#3a2817] disabled:bg-[linear-gradient(180deg,#2f241c_0%,#231b15_100%)] disabled:text-[#8c7b63]';

const ShopScreen: React.FC<ShopScreenProps> = ({
  coins,
  bait,
  dailyFreeBait = 0,
  walletAddress,
  rodLevel,
  fishingNet,
  nftRods = [],
  onBuyBait,
  onBuyRod,
  onBuyFishingNetWithMon,
  onClaimFishingNet,
  onBuyRodWithMon,
  onBuyCubeRollsWithMon,
  onCoinsAdded,
  onNftMinted,
}) => {
  const [isMobileLayout, setIsMobileLayout] = useState(() => (
    typeof window !== 'undefined' ? window.innerWidth < 768 : false
  ));
  const [activeMonadPurchase, setActiveMonadPurchase] = useState<string | null>(null);
  const { sendTransactionAsync } = useSendTransaction();

  useEffect(() => {
    const mediaQuery = window.matchMedia('(max-width: 767px)');
    const handleChange = (event: MediaQueryListEvent) => setIsMobileLayout(event.matches);

    setIsMobileLayout(mediaQuery.matches);
    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, []);

  const fishingNetPendingCount = fishingNet.pendingCatch.reduce((sum, entry) => sum + entry.quantity, 0);
  const currentNetDailyFishCount = Math.max(fishingNet.dailyFishCount || 0, FISHING_NET_DAILY_FISH_COUNT);
  const fishingNetPreview = fishingNet.pendingCatch
    .map((entry) => {
      const fish = FISH_DATA.find((item) => item.id === entry.fishId);
      return fish ? `${fish.name} x${entry.quantity}` : null;
    })
    .filter(Boolean)
    .slice(0, 4)
    .join(', ');
  const walletConnected = Boolean(walletAddress);
  const currentNetOffer = MON_FISHING_NET_PACKAGES.find((offer) => offer.fishCount === currentNetDailyFishCount) ?? null;

  const boardViewportInsets = isMobileLayout
    ? {
        mobile: {
          left: '8.4%',
          right: '8.4%',
          top: '20.2%',
          bottom: '18.6%',
        },
      }
    : {
        desktop: {
          left: '20.8%',
          right: '26.0%',
          top: '20.1%',
          bottom: '17.4%',
        },
      };

  const runMonadPurchase = async ({
    purchaseKey,
    monAmount,
    pendingMessage,
    successMessage,
    verifyBody,
    applyLocalUnlock,
  }: {
    purchaseKey: string;
    monAmount: string;
    pendingMessage: string;
    successMessage: string;
    verifyBody?: Record<string, unknown>;
    applyLocalUnlock?: () => boolean | void;
  }) => {
    if (!walletAddress) {
      toast.error('Connect wallet first to use Monad Shop.', { duration: SHOP_TOAST_DURATION_MS });
      return;
    }

    if (activeMonadPurchase) return;

    const toastId = `monad-shop-${purchaseKey}`;
    setActiveMonadPurchase(purchaseKey);

    try {
      const txHash = await sendTransactionAsync({
        to: MON_MARKET_RECEIVER_ADDRESS,
        value: parseEther(monAmount),
      });

      toast.loading(pendingMessage, {
        id: toastId,
        duration: SHOP_TOAST_DURATION_MS,
      });

      if (verifyBody) {
        const { data, error } = await supabase.functions.invoke('verify-purchase', {
          body: {
            tx_hash: txHash,
            wallet_address: walletAddress,
            expected_mon: monAmount,
            ...verifyBody,
          },
        });

        if (error) throw error;
        if (!data?.success) {
          throw new Error(data?.error || 'Verification failed');
        }
      }

      const applied = applyLocalUnlock?.();
      if (applied === false) {
        throw new Error('Could not apply this purchase to the current player state.');
      }

      toast.success(successMessage, {
        id: toastId,
        duration: SHOP_TOAST_DURATION_MS,
      });
    } catch (error) {
      console.error(`Monad shop purchase failed (${purchaseKey}):`, error);
      if (isUserRejectedError(error)) {
        toast.error('Transaction cancelled', {
          id: toastId,
          duration: SHOP_TOAST_DURATION_MS,
        });
      } else {
        toast.error(getErrorMessage(error), {
          id: toastId,
          duration: SHOP_TOAST_DURATION_MS,
        });
      }
    } finally {
      setActiveMonadPurchase(null);
    }
  };

  const boardHeader = (
    <div className="flex flex-col gap-2 sm:gap-2.5">
      <div className="flex items-center justify-between gap-3 rounded-[1.05rem] border border-[#8f6a38]/75 bg-[rgba(16,11,8,0.9)] px-3 py-2.5 text-[#f8dfab] shadow-[0_14px_28px_rgba(0,0,0,0.34)] backdrop-blur-md sm:rounded-[1.2rem] sm:px-4 sm:py-3">
        <div className="min-w-0">
          <div className="text-[0.58rem] font-black uppercase tracking-[0.18em] text-[#f3c777]/88 sm:text-[0.66rem]">
            Gold balance
          </div>
          <div className="mt-1 text-[0.72rem] font-semibold leading-4 text-[#f8e8bf]/74 sm:text-[0.86rem]">
            Use gold for bait, rods, and everyday upgrades.
          </div>
        </div>
        <div className="inline-flex shrink-0 items-center gap-2 rounded-[0.95rem] border border-[#b6884b]/80 bg-[rgba(38,24,10,0.92)] px-3 py-2 shadow-[inset_0_0_0_1px_rgba(255,215,150,0.07)]">
          <CoinIcon size="md" />
          <span className="text-base font-black tracking-[0.01em] text-[#ffe6ac] sm:text-[1.08rem]">
            {coins.toLocaleString()}
          </span>
        </div>
      </div>

      <TabsList className="grid h-auto w-full grid-cols-3 gap-1 rounded-[1.1rem] border border-[#8f6a38]/70 bg-[rgba(16,11,8,0.84)] p-1 shadow-[0_18px_40px_rgba(0,0,0,0.35)] backdrop-blur-md sm:gap-1.5 sm:rounded-[1.35rem] sm:p-1.5">
        <TabsTrigger value="bait" className="h-9 gap-1 rounded-[0.8rem] px-1.5 text-[0.58rem] font-black uppercase tracking-[0.02em] text-[#ead4aa] data-[state=active]:border data-[state=active]:border-[#b6884b] data-[state=active]:bg-[rgba(48,31,14,0.92)] data-[state=active]:text-[#f8dfab] sm:h-10 sm:rounded-[0.95rem] sm:px-2 sm:text-[0.82rem] sm:tracking-[0.05em]">
          <Worm className="h-4 w-4" />
          Bait
        </TabsTrigger>
        <TabsTrigger value="rods" className="h-9 gap-1 rounded-[0.8rem] px-1.5 text-[0.58rem] font-black uppercase tracking-[0.02em] text-[#ead4aa] data-[state=active]:border data-[state=active]:border-[#b6884b] data-[state=active]:bg-[rgba(48,31,14,0.92)] data-[state=active]:text-[#f8dfab] sm:h-10 sm:rounded-[0.95rem] sm:px-2 sm:text-[0.82rem] sm:tracking-[0.05em]">
          <ShipWheel className="h-4 w-4" />
          Rods
        </TabsTrigger>
        <TabsTrigger value="monad" className="h-9 gap-1 rounded-[0.8rem] border border-[#a67935]/80 bg-[rgba(74,45,18,0.32)] px-1.5 text-[0.58rem] font-black uppercase tracking-[0.02em] text-[#f3d47e] shadow-[inset_0_0_0_1px_rgba(255,215,140,0.08)] data-[state=active]:border data-[state=active]:border-[#f3c777] data-[state=active]:bg-[rgba(66,40,16,0.95)] data-[state=active]:text-[#fff0c5] sm:h-10 sm:rounded-[0.95rem] sm:px-2 sm:text-[0.82rem] sm:tracking-[0.05em]">
          <Sparkles className="h-4 w-4" />
          Manat Shop
        </TabsTrigger>
      </TabsList>
    </div>
  );

  return (
    <GameScreenShell
      title="Shop"
      subtitle="Coins stay in Bait and Rods. All MON items now live in Manat Shop."
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
          headerPlacement="inline"
          viewportInsets={boardViewportInsets}
        >
          <TabsContent value="bait" className="mt-0">
            <div className="grid gap-2.5 sm:gap-3">
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
              <QuestBoardPlaque
                eyebrow="Manat items moved"
                description="Auto Fishing Net tiers, MON cube rolls, instant unlock rods, and NFT bonus rods now sit in Manat Shop."
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
              <QuestBoardPlaque
                eyebrow="Manat gear"
                description="Coin rods stay here. The premium MON utility and the stronger bonus NFT rods moved into Manat Shop."
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
                            className={`w-full shrink-0 sm:w-auto ${SHOP_BUTTON_CLASS_NAME}`}
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

          <TabsContent value="monad" className="mt-0">
            <div className="grid gap-2.5 sm:gap-3">
              {walletConnected ? (
                <QuestBoardPlaque
                  eyebrow="Quick gold"
                  description="If you just want raw coins instead of gear, the old MON gold packs stay available here."
                  action={(
                    <BuyCoinsDialog
                      walletAddress={walletAddress}
                      onCoinsAdded={onCoinsAdded}
                      rodLevel={rodLevel}
                      nftRods={nftRods}
                      onNftMinted={onNftMinted}
                      onRodPurchased={onBuyRodWithMon}
                      initialTab="coins"
                      triggerLabel="Gold packs"
                    />
                  )}
                />
              ) : (
                <QuestBoardPlaque
                  eyebrow="Connect wallet"
                  description="Manat Shop is wallet-only. Connect from the HUD wallet button, then come back here for MON purchases."
                />
              )}

              <QuestBoardCard className="md:min-h-0">
                <div className="flex h-full flex-col gap-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="text-[0.64rem] font-black uppercase tracking-[0.18em] text-[#f3c777]/85">
                        Passive utility
                      </div>
                      <div className="mt-1 text-lg font-black text-[#f8e8bf] sm:text-xl">Auto Fishing Net</div>
                      <p className="mt-1 text-sm leading-5 text-[#f8e8bf]/78">
                        Pick a Manat net tier. Bigger nets refill with more random fish every 24 hours and keep the passive loop out of the bait tab.
                      </p>
                    </div>
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-[#6f4928] bg-[rgba(15,10,7,0.72)] shadow-inner">
                      <img
                        src={FISHING_NET_SHOP_ICON_SRC}
                        alt=""
                        className="h-12 w-12 scale-[1.08] object-contain mix-blend-screen drop-shadow-[0_0_12px_rgba(255,190,92,0.3)]"
                      />
                    </div>
                  </div>

                  <div className="rounded-[0.9rem] border border-[#6f4928] bg-[rgba(15,10,7,0.72)] px-3 py-2.5 text-sm text-[#f8e8bf]/82">
                    {fishingNet.owned ? (
                      fishingNetPendingCount > 0 ? (
                        <>
                          <span className="font-black text-[#f3c777]">{currentNetOffer?.label ?? 'Your net'} is full.</span>{' '}
                          {fishingNetPendingCount} fish are waiting.
                          {fishingNetPreview ? (
                            <span className="mt-1 block text-xs text-[#f8e8bf]/70">{fishingNetPreview}</span>
                          ) : null}
                        </>
                      ) : (
                        <>
                          <span className="font-black text-[#f3c777]">{currentNetOffer?.label ?? 'Net'} deployed.</span>{' '}
                          {currentNetDailyFishCount} fish per day are configured. It will refill after the next daily reset.
                        </>
                      )
                    ) : (
                      <>
                        Choose the tier you want first. The original coin price was tuned around a {FISHING_NET_PAYBACK_DAYS_ESTIMATE}-day payback, so these stay premium convenience upgrades instead of mandatory progression.
                      </>
                    )}
                  </div>

                  {fishingNet.owned ? (
                    <Button
                      type="button"
                      onClick={onClaimFishingNet}
                      disabled={fishingNetPendingCount <= 0}
                      className={SHOP_BUTTON_CLASS_NAME}
                    >
                      Collect {fishingNetPendingCount > 0 ? fishingNetPendingCount : currentNetDailyFishCount} fish
                    </Button>
                  ) : (
                    <div className="rounded-[0.9rem] border border-dashed border-[#8d6436] bg-[rgba(15,10,7,0.46)] px-3 py-3 text-sm text-[#f8e8bf]/76">
                      Buy any net tier below. Your first purchase fills the net immediately for today.
                    </div>
                  )}
                </div>
              </QuestBoardCard>

              <QuestBoardPlaque
                eyebrow="Net tiers"
                description={fishingNet.owned
                  ? `Current deployed tier: ${currentNetDailyFishCount} fish per day. You can still upgrade to a larger net.`
                  : 'All net tiers are bought with MON only. Higher tiers increase the daily passive fish haul.'}
              />
              <div className="grid gap-2.5 sm:gap-3 lg:grid-cols-3">
                {MON_FISHING_NET_PACKAGES.map((offer) => {
                  const purchaseKey = `fishing-net-${offer.fishCount}`;
                  const isOwnedTier = fishingNet.owned && currentNetDailyFishCount === offer.fishCount;
                  const hasBetterTier = fishingNet.owned && currentNetDailyFishCount > offer.fishCount;
                  const canUpgrade = !hasBetterTier && !isOwnedTier;
                  const actionLabel = !fishingNet.owned
                    ? `Deploy ${offer.fishCount} fish/day`
                    : currentNetDailyFishCount < offer.fishCount
                      ? `Upgrade to ${offer.fishCount}`
                      : `Owned`;
                  const successMessage = !fishingNet.owned
                    ? `${offer.label} deployed.`
                    : `${offer.label} upgraded.`;

                  return (
                    <QuestBoardCard key={offer.fishCount}>
                      <div className="flex h-full flex-col gap-3">
                        <div className="flex items-start justify-between gap-3">
                          <div className="inline-flex h-12 w-12 items-center justify-center rounded-[1rem] border border-[#8f6a38] bg-[rgba(15,10,7,0.72)] text-[#f3c777] shadow-[0_8px_16px_rgba(0,0,0,0.28)]">
                            <img
                              src={FISHING_NET_SHOP_ICON_SRC}
                              alt=""
                              className="h-10 w-10 object-contain mix-blend-screen drop-shadow-[0_0_12px_rgba(255,190,92,0.3)]"
                            />
                          </div>
                          <span className="rounded-full border border-[#9a7a33] bg-[rgba(92,70,21,0.42)] px-2.5 py-1 text-[11px] font-bold uppercase tracking-[0.12em] text-[#f3d47e]">
                            {offer.fishCount} fish/day
                          </span>
                        </div>
                        <div>
                          <div className="text-base font-black text-[#f8e8bf]">{offer.label}</div>
                          <p className="mt-1 text-sm leading-5 text-[#f8e8bf]/78">{offer.positioning}</p>
                        </div>
                        <div className="rounded-[0.9rem] border border-[#6f4928] bg-[rgba(15,10,7,0.72)] px-3 py-2 text-xs text-[#f8e8bf]/74">
                          {hasBetterTier
                            ? 'A bigger net is already active on this account.'
                            : isOwnedTier
                              ? 'This is your current active net tier.'
                              : fishingNet.owned
                                ? 'Upgrade now, then the larger daily refill size applies from the active net state onward.'
                                : 'First purchase deploys the net immediately and starts the passive loop today.'}
                        </div>
                        <Button
                          type="button"
                          disabled={!walletConnected || activeMonadPurchase !== null || !canUpgrade}
                          onClick={() => void runMonadPurchase({
                            purchaseKey,
                            monAmount: offer.monAmount,
                            pendingMessage: fishingNet.owned
                              ? `Transaction sent. Upgrading net to ${offer.fishCount} fish/day...`
                              : `Transaction sent. Deploying ${offer.label}...`,
                            successMessage,
                            applyLocalUnlock: () => onBuyFishingNetWithMon(offer.fishCount, offer.monAmount),
                          })}
                          className={`mt-auto ${SHOP_BUTTON_CLASS_NAME}`}
                        >
                          {isOwnedTier || hasBetterTier ? (
                            <>
                              <Check className="mr-2 h-4 w-4" />
                              {hasBetterTier ? 'Better tier owned' : 'Current tier'}
                            </>
                          ) : (
                            <>
                              <Coins className="mr-2 h-4 w-4" />
                              {activeMonadPurchase === purchaseKey ? 'Processing...' : `${offer.monAmount} MON`}
                            </>
                          )}
                        </Button>
                        {canUpgrade ? (
                          <div className="text-center text-xs font-bold uppercase tracking-[0.08em] text-[#f3c777]/78">
                            {actionLabel}
                          </div>
                        ) : null}
                      </div>
                    </QuestBoardCard>
                  );
                })}
              </div>

              <QuestBoardPlaque
                eyebrow="Cube rolls"
                description="Buy extra cube rolls straight from the shop instead of bouncing into the cube screen first."
              />
              <div className="grid gap-2.5 sm:gap-3 lg:grid-cols-3">
                {MON_CUBE_SPIN_PACKAGES.map((pkg) => {
                  const purchaseKey = `cube-rolls-${pkg.rolls}`;
                  return (
                    <QuestBoardCard key={pkg.rolls}>
                      <div className="flex h-full flex-col gap-3">
                        <div className="inline-flex h-12 w-12 items-center justify-center rounded-[1rem] border border-[#8f6a38] bg-[rgba(15,10,7,0.72)] text-[#f3c777] shadow-[0_8px_16px_rgba(0,0,0,0.28)]">
                          <Sparkles className="h-5 w-5" />
                        </div>
                        <div>
                          <div className="text-base font-black text-[#f8e8bf]">{pkg.label}</div>
                          <p className="mt-1 text-sm leading-5 text-[#f8e8bf]/78">{pkg.positioning}</p>
                        </div>
                        <Button
                          type="button"
                          disabled={!walletConnected || activeMonadPurchase !== null}
                          onClick={() => void runMonadPurchase({
                            purchaseKey,
                            monAmount: pkg.monAmount,
                            pendingMessage: `Transaction sent. Adding ${pkg.rolls} cube roll${pkg.rolls === 1 ? '' : 's'}...`,
                            successMessage: `${pkg.rolls} cube roll${pkg.rolls === 1 ? '' : 's'} added.`,
                            applyLocalUnlock: () => onBuyCubeRollsWithMon(pkg.rolls, pkg.monAmount),
                          })}
                          className={`mt-auto ${SHOP_BUTTON_CLASS_NAME}`}
                        >
                          <Coins className="mr-2 h-4 w-4" />
                          {activeMonadPurchase === purchaseKey ? 'Processing...' : `${pkg.monAmount} MON`}
                        </Button>
                      </div>
                    </QuestBoardCard>
                  );
                })}
              </div>

              <QuestBoardPlaque
                eyebrow="Instant unlock rods"
                description="These MON unlocks skip coin grind and immediately move your active rod up. NFT bonus rods are listed just below."
              />
              <div className="grid gap-2.5 sm:gap-3 lg:grid-cols-2">
                {MON_ROD_PURCHASES.map((rodOffer) => {
                  const purchaseKey = `mon-rod-${rodOffer.level}`;
                  const rod = ROD_UPGRADES.find((entry) => entry.level === rodOffer.level);
                  const isOwned = rodLevel >= rodOffer.level;

                  return (
                    <QuestBoardCard key={rodOffer.level}>
                      <div className="flex h-full flex-col gap-3 sm:flex-row sm:items-center">
                        <div className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-[#6f4928] bg-[rgba(15,10,7,0.72)] shadow-inner">
                          <img src={rod?.image} alt={rod?.name ?? `Rod ${rodOffer.level}`} className="h-14 w-14 object-contain" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="font-black text-[#f8e8bf]">{rod?.name ?? `Rod ${rodOffer.level}`}</div>
                          <div className="text-xs font-medium text-[#f8e8bf]/72">+{rod?.bonus ?? 0}% base rare chance</div>
                          <div className="mt-1 text-xs text-[#f8e8bf]/72">{rodOffer.positioning}</div>
                        </div>
                        {isOwned ? (
                          <span className="shrink-0 text-sm font-black text-[#f3c777]">
                            <Check className="mr-1 inline h-4 w-4" />
                            Owned
                          </span>
                        ) : (
                          <Button
                            type="button"
                            disabled={!walletConnected || activeMonadPurchase !== null}
                            onClick={() => void runMonadPurchase({
                              purchaseKey,
                              monAmount: rodOffer.monAmount,
                              pendingMessage: `Transaction sent. Unlocking ${rod?.name ?? 'rod'}...`,
                              successMessage: `${rod?.name ?? 'Rod'} unlocked.`,
                              verifyBody: { rod_purchase_level: rodOffer.level },
                              applyLocalUnlock: () => {
                                onBuyRodWithMon(rodOffer.level, rodOffer.monAmount);
                                return true;
                              },
                            })}
                            className={`w-full shrink-0 sm:w-auto ${SHOP_BUTTON_CLASS_NAME}`}
                          >
                            <Coins className="mr-2 h-4 w-4" />
                            {activeMonadPurchase === purchaseKey ? 'Processing...' : `${rodOffer.monAmount} MON`}
                          </Button>
                        )}
                      </div>
                    </QuestBoardCard>
                  );
                })}
              </div>

              <QuestBoardPlaque
                eyebrow="Bonus NFT rods"
                description="These are the stronger MON rods with real extra bonuses: more rare fish chance, more XP, and better sell prices."
              />
              <div className="grid gap-2.5 sm:gap-3 lg:grid-cols-2">
                {NFT_ROD_DATA.map((nft) => {
                  const purchaseKey = `nft-rod-${nft.rodLevel}`;
                  const hasBaseRod = rodLevel >= nft.rodLevel;
                  const isOwned = nftRods.includes(nft.rodLevel);
                  const rodImage = ROD_DISPLAY_INFO[nft.rodLevel].image;

                  return (
                    <QuestBoardCard key={nft.rodLevel}>
                      <div className="flex h-full flex-col gap-3">
                        <div className="flex items-start gap-3">
                          <div className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-[#6f4928] bg-[rgba(15,10,7,0.72)] shadow-inner">
                            <img src={rodImage} alt={nft.name} className="h-14 w-14 object-contain" />
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="font-black text-[#f8e8bf]">{nft.name}</div>
                            <div className="mt-1 space-y-1 text-xs text-[#f8e8bf]/78">
                              <div>+{nft.rarityBonus}% rare fish chance</div>
                              <div>+{nft.xpBonus}% XP</div>
                              {nft.sellBonus > 0 ? <div>+{nft.sellBonus}% fish sell price</div> : null}
                            </div>
                          </div>
                        </div>
                        <div className="rounded-[0.9rem] border border-[#6f4928] bg-[rgba(15,10,7,0.72)] px-3 py-2 text-xs text-[#f8e8bf]/74">
                          {isOwned
                            ? 'Already minted on this wallet.'
                            : hasBaseRod
                              ? 'Base rod owned. This mint adds the stronger MON bonuses on top.'
                              : `Buy the ${nft.rodLevel === 0 ? 'Starter' : ROD_UPGRADES[nft.rodLevel - 1]?.name} first, then mint its NFT bonus version here.`}
                        </div>
                        {isOwned ? (
                          <div className="mt-auto text-sm font-black text-[#f3c777]">
                            <Check className="mr-1 inline h-4 w-4" />
                            Minted
                          </div>
                        ) : (
                          <Button
                            type="button"
                            disabled={!walletConnected || !hasBaseRod || activeMonadPurchase !== null}
                            onClick={() => void runMonadPurchase({
                              purchaseKey,
                              monAmount: nft.mintCost,
                              pendingMessage: `Transaction sent. Minting ${nft.name}...`,
                              successMessage: `${nft.name} minted.`,
                              verifyBody: { rod_level: nft.rodLevel },
                              applyLocalUnlock: () => {
                                onNftMinted(nft.rodLevel);
                                return true;
                              },
                            })}
                            className={`mt-auto ${SHOP_BUTTON_CLASS_NAME}`}
                          >
                            <Coins className="mr-2 h-4 w-4" />
                            {activeMonadPurchase === purchaseKey ? 'Processing...' : `${nft.mintCost} MON`}
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
