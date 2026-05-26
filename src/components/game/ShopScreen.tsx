import React, { useEffect, useState } from 'react';
import { Check, Coins, Package, ShipWheel, Sparkles, Worm } from 'lucide-react';
import { useBalance, useSendTransaction } from 'wagmi';
import { parseEther } from 'viem';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  FISH_DATA,
  NFT_ROD_DATA,
  ROD_DATA,
  ROD_RARITY_COLORS,
  ROD_RARITY_NAMES,
  type FishingNetState,
} from '@/types/game';
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
import { formatMonAmount, formatMonRewardRange } from '@/lib/monRewards';
import { ROD_DISPLAY_INFO } from '@/lib/rodAssets';
import type { MonBalanceSummary } from '@/hooks/usePlayerMon';
import CoinIcon from './CoinIcon';
import MonadIcon from './MonadIcon';
import BuyCoinsDialog from './BuyCoinsDialog';
import GameScreenShell from './GameScreenShell';
import QuestBoard, { QuestBoardCard, QuestBoardPlaque } from './QuestBoard';
import { invokeHooklootEdge } from '@/lib/serverApi';
import {
  canUseMonadPaymentIdentity,
  monadPriceLabel,
  MONAD_SHOP_TEST_MODE_ENABLED,
  sendMonadPayment,
} from '@/lib/monadTestMode';

interface ShopScreenProps {
  coins: number;
  bait: number;
  dailyFreeBait?: number;
  walletAddress?: string;
  monSummary?: MonBalanceSummary;
  rodLevel: number;
  fishingNet: FishingNetState;
  nftRods?: number[];
  onBuyBait: (amount: number, cost: number) => void;
  onBuyRod: (level: number, cost: number) => void;
  onBuyFishingNetWithMon: (dailyFishCount: number, monAmount: string, txHash?: string) => boolean | Promise<boolean>;
  onBuyRodWithMon: (level: number, monAmount: string) => void;
  onBuyCubeRollsWithMon: (amount: number, monAmount: string, txHash?: string) => boolean | Promise<boolean>;
  onCoinsAdded: (amount: number) => void;
  onNftMinted: (rodLevel: number) => void;
  onServerPlayerUpdated?: (playerRecord: unknown) => void;
}

const ROD_UPGRADES = ROD_DATA
  .filter((rod) => rod.level > 0 && rod.coinCost)
  .map((rod) => ({
    ...rod,
    cost: rod.coinCost!,
    image: ROD_DISPLAY_INFO[rod.level].image,
  }));

const FISHING_NET_SHOP_ICON_SRC = publicAsset('assets/fishing_net_shop_icon.png');
const SHOP_TOAST_DURATION_MS = 5600;
const SHOP_BUTTON_CLASS_NAME = 'min-h-11 rounded-[1rem] border border-[#7f5227] bg-[linear-gradient(180deg,#8c531f_0%,#6e4117_42%,#4f2f14_100%)] text-[#f8db9a] hover:brightness-110 disabled:border-[#3a2817] disabled:bg-[linear-gradient(180deg,#2f241c_0%,#231b15_100%)] disabled:text-[#8c7b63]';
const MONAD_ROD_ART_VERSION = 'monad-rods-20260424a';
const versionedMonadRodArt = (file: string) => `${publicAsset(`assets/${file}`)}?v=${MONAD_ROD_ART_VERSION}`;
const MONAD_ROD_IMAGES = {
  0: versionedMonadRodArt('rod_basic.png'),
  1: versionedMonadRodArt('rod_bamboo.png'),
  2: versionedMonadRodArt('rod_carbon.png'),
  3: versionedMonadRodArt('rod_pro.png'),
  4: versionedMonadRodArt('rod_legendary.png'),
} as const;

const ShopScreen: React.FC<ShopScreenProps> = ({
  coins,
  bait,
  dailyFreeBait = 0,
  walletAddress,
  monSummary,
  rodLevel,
  fishingNet,
  nftRods = [],
  onBuyBait,
  onBuyRod,
  onBuyFishingNetWithMon,
  onBuyRodWithMon,
  onBuyCubeRollsWithMon,
  onCoinsAdded,
  onNftMinted,
  onServerPlayerUpdated,
}) => {
  const [isMobileLayout, setIsMobileLayout] = useState(() => (
    typeof window !== 'undefined' ? window.innerWidth < 768 : false
  ));
  const [activeMonadPurchase, setActiveMonadPurchase] = useState<string | null>(null);
  const { sendTransactionAsync } = useSendTransaction();
  const walletBalanceAddress = walletAddress?.startsWith('0x') ? walletAddress as `0x${string}` : undefined;
  const { data: monWalletBalance } = useBalance({ address: walletBalanceAddress });
  const parsedMonWalletBalance = monWalletBalance ? Number(monWalletBalance.formatted) : null;
  const earnedMonBalance = monSummary ? Math.max(0, monSummary.totalEarnedMon) : null;
  const monadBalanceLabel = earnedMonBalance !== null
    ? `${formatMonAmount(earnedMonBalance)} MON`
    : parsedMonWalletBalance !== null && Number.isFinite(parsedMonWalletBalance)
      ? `${formatMonAmount(parsedMonWalletBalance)} ${monWalletBalance?.symbol ?? 'MON'}`
      : MONAD_SHOP_TEST_MODE_ENABLED
        ? '0 MON'
        : '-- MON';
  const monadBalanceNote = earnedMonBalance !== null
    ? (earnedMonBalance > 0 ? 'Won in game' : 'No rewards yet')
    : monWalletBalance
      ? (MONAD_SHOP_TEST_MODE_ENABLED ? 'Test buys unlocked' : 'Wallet funds')
      : MONAD_SHOP_TEST_MODE_ENABLED
        ? 'Game rewards'
        : 'Connect wallet';

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
  const walletConnected = canUseMonadPaymentIdentity(walletAddress);
  const currentNetOffer = MON_FISHING_NET_PACKAGES.find((offer) => offer.fishCount === currentNetDailyFishCount) ?? null;
  const currentRod = ROD_DATA[rodLevel] ?? ROD_DATA[0];
  const hasEnoughMon = (monAmount: string) => {
    if (MONAD_SHOP_TEST_MODE_ENABLED) return true;
    if (!monWalletBalance) return true;

    try {
      return monWalletBalance.value >= parseEther(monAmount);
    } catch {
      return true;
    }
  };

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
    applyLocalUnlock?: (context: { txHash: string; data?: unknown }) => boolean | void | Promise<boolean | void>;
  }) => {
    if (!walletAddress || !walletConnected) {
      toast.error('Connect wallet first to use Monad Shop.', { duration: SHOP_TOAST_DURATION_MS });
      return;
    }

    if (!hasEnoughMon(monAmount)) {
      toast.error(`Not enough MON. This purchase requires ${monAmount} MON.`, { duration: SHOP_TOAST_DURATION_MS });
      return;
    }

    if (activeMonadPurchase) return;

    const toastId = `monad-shop-${purchaseKey}`;
    setActiveMonadPurchase(purchaseKey);

    try {
      const txHash = await sendMonadPayment({
        sendTransactionAsync,
        receiverAddress: MON_MARKET_RECEIVER_ADDRESS,
        monAmount,
        purpose: purchaseKey,
      });

      toast.loading(
        MONAD_SHOP_TEST_MODE_ENABLED
          ? pendingMessage.replace('Transaction sent.', 'Test payment created.')
          : pendingMessage,
        {
        id: toastId,
        duration: SHOP_TOAST_DURATION_MS,
        },
      );

      let verifiedData: unknown;
      if (verifyBody) {
        const { data, error } = await invokeHooklootEdge('verify-purchase', {
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
        verifiedData = data;
        if (data?.player) {
          onServerPlayerUpdated?.(data.player);
        }
      }

      const applied = await applyLocalUnlock?.({ txHash, data: verifiedData });
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
      <div className="grid grid-cols-2 gap-2 sm:gap-2.5">
        <div className="min-w-0 rounded-[1.05rem] border border-[#8f6a38]/75 bg-[rgba(16,11,8,0.9)] px-3 py-2.5 text-[#f8dfab] shadow-[0_14px_28px_rgba(0,0,0,0.34)] backdrop-blur-md sm:rounded-[1.2rem] sm:px-4 sm:py-3">
          <div className="text-[0.56rem] font-black uppercase tracking-[0.14em] text-[#f3c777]/88 sm:text-[0.66rem]">
            Gold Balance
          </div>
          <div className="mt-1.5 flex min-w-0 items-center gap-2">
            <CoinIcon size="lg" />
            <span className="min-w-0 truncate text-base font-black tracking-[0.01em] text-[#ffe6ac] sm:text-[1.08rem]">
              {coins.toLocaleString()}
            </span>
          </div>
          <div className="mt-1 text-[0.62rem] font-semibold leading-3 text-[#f8e8bf]/62 sm:text-[0.72rem]">
            Bait and gear
          </div>
        </div>
        <div className="min-w-0 rounded-[1.05rem] border border-[#836EF9]/70 bg-[linear-gradient(135deg,rgba(32,0,82,0.92),rgba(14,16,15,0.9))] px-3 py-2.5 text-[#fbfaf9] shadow-[0_14px_28px_rgba(32,0,82,0.28)] backdrop-blur-md sm:rounded-[1.2rem] sm:px-4 sm:py-3">
          <div className="text-[0.56rem] font-black uppercase tracking-[0.14em] text-[#cfc7ff] sm:text-[0.66rem]">
            Monad Balance
          </div>
          <div className="mt-1.5 flex min-w-0 items-center gap-2">
            <MonadIcon size="lg" className="drop-shadow-[0_0_10px_rgba(131,110,249,0.55)]" />
            <span className="min-w-0 truncate text-base font-black tracking-[0.01em] text-[#fbfaf9] sm:text-[1.08rem]">
              {monadBalanceLabel}
            </span>
          </div>
          <div className="mt-1 truncate text-[0.62rem] font-semibold leading-3 text-[#fbfaf9]/64 sm:text-[0.72rem]">
            {monadBalanceNote}
          </div>
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
          Monad Shop
        </TabsTrigger>
      </TabsList>
    </div>
  );

  return (
    <GameScreenShell
      title="Shop"
      subtitle="Bait, rods, and MON utilities are separated so gear is always in one place."
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
                eyebrow="Clean split"
                description="Bait stays here. All rods are in Rods. Gold packs, Auto Fishing Net tiers, and MON cube rolls stay in Monad Shop."
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
                      {currentRod.name}
                    </span>
                    <span className="ml-2 text-[0.74rem] text-[#f8e8bf]/72 sm:text-xs">
                      {ROD_RARITY_NAMES[currentRod.rarity]} / +{currentRod.bonus}% rare chance
                    </span>
                  </>
                )}
              />
              <QuestBoardPlaque
                eyebrow="All rods"
                description="Common, gold upgrades, and bonus MON rods are grouped here. Rare and Epic are gold sinks again for progression testing."
              />
              {ROD_UPGRADES.length === 0 ? (
                <QuestBoardCard>
                  <div className="flex h-full flex-col gap-3 sm:flex-row sm:items-center">
                    <div className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-[#6f4928] bg-[rgba(15,10,7,0.72)] shadow-inner">
                      <img src={ROD_DISPLAY_INFO[0].image} alt={ROD_DATA[0].name} className="h-14 w-14 object-contain" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="font-black text-[#f8e8bf]">{ROD_DATA[0].name}</div>
                      <div className="text-xs font-medium text-[#f8e8bf]/72">{ROD_DATA[0].description}</div>
                      <div className="mt-1 text-[0.65rem] font-black uppercase tracking-[0.14em]" style={{ color: ROD_RARITY_COLORS[ROD_DATA[0].rarity] }}>
                        {ROD_RARITY_NAMES[ROD_DATA[0].rarity]}
                      </div>
                    </div>
                    <span className="shrink-0 text-sm font-black text-[#f3c777]">
                      <Check className="mr-1 inline h-4 w-4" />
                      Default
                    </span>
                  </div>
                </QuestBoardCard>
              ) : (
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
                            <div className="mt-1 text-[0.65rem] font-black uppercase tracking-[0.14em]" style={{ color: ROD_RARITY_COLORS[rod.rarity] }}>
                              {ROD_RARITY_NAMES[rod.rarity]}
                            </div>
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
              )}

              <QuestBoardPlaque
                eyebrow="Monad rods"
                description="Top-tier Monad rods stay in the wallet flow. Gold-upgrade rods appear above and are bought with coins."
              />
              <div className="grid gap-2.5 sm:gap-3 lg:grid-cols-2">
                {MON_ROD_PURCHASES.map((rodOffer) => {
                  const purchaseKey = `mon-rod-${rodOffer.level}`;
                  const isOwned = rodLevel >= rodOffer.level;
                  const notEnoughMon = walletConnected && !hasEnoughMon(rodOffer.monAmount);
                  const isProcessing = activeMonadPurchase === purchaseKey;
                  const monadRodImage = MONAD_ROD_IMAGES[rodOffer.level as keyof typeof MONAD_ROD_IMAGES] ?? ROD_DISPLAY_INFO[rodOffer.level]?.image;

                  return (
                    <QuestBoardCard key={rodOffer.level}>
                      <div className="flex h-full flex-col gap-3 sm:flex-row sm:items-center">
                        <div className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-[#6f4928] bg-[rgba(15,10,7,0.72)] shadow-inner">
                          <img src={monadRodImage} alt={rodOffer.label} className="h-14 w-14 object-contain" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="font-black text-[#f8e8bf]">{rodOffer.label}</div>
                          <div className="text-xs font-medium text-[#f8e8bf]/72">{rodOffer.description}</div>
                          <div className="mt-2 grid gap-1 text-[0.68rem] font-semibold text-[#f8e8bf]/72 sm:grid-cols-2">
                            <span>No-fish MON: {rodOffer.monadDropChance}%</span>
                            <span>{formatMonRewardRange(rodOffer.monadMinReward, rodOffer.monadMaxReward)}</span>
                            <span>Rare+ bonus: +{rodOffer.rareCatchBonus}%</span>
                            <span>{rodOffer.monAmount} MON</span>
                          </div>
                          <div className="mt-1 text-[0.65rem] font-black uppercase tracking-[0.14em]" style={{ color: ROD_RARITY_COLORS[rodOffer.rarity] }}>
                            {ROD_RARITY_NAMES[rodOffer.rarity]}
                          </div>
                          {notEnoughMon ? (
                            <div className="mt-1 text-xs font-bold text-[#ff9f7a]">Not enough MON in connected wallet.</div>
                          ) : null}
                        </div>
                        {isOwned ? (
                          <span className="shrink-0 text-sm font-black text-[#f3c777]">
                            <Check className="mr-1 inline h-4 w-4" />
                            Owned
                          </span>
                        ) : (
                          <Button
                            type="button"
                            disabled={!walletConnected || activeMonadPurchase !== null || notEnoughMon}
                            onClick={() => void runMonadPurchase({
                              purchaseKey,
                              monAmount: rodOffer.monAmount,
                              pendingMessage: `Transaction sent. Unlocking ${rodOffer.label}...`,
                              successMessage: `${rodOffer.label} unlocked.`,
                              verifyBody: { rod_purchase_level: rodOffer.level },
                              applyLocalUnlock: () => {
                                onBuyRodWithMon(rodOffer.level, rodOffer.monAmount);
                                return true;
                              },
                            })}
                            className={`w-full shrink-0 sm:w-auto ${SHOP_BUTTON_CLASS_NAME}`}
                          >
                            <Coins className="mr-2 h-4 w-4" />
                            {isProcessing ? 'Processing...' : notEnoughMon ? 'Not enough MON' : monadPriceLabel(rodOffer.monAmount)}
                          </Button>
                        )}
                      </div>
                    </QuestBoardCard>
                  );
                })}
              </div>

              <QuestBoardPlaque
                eyebrow="Bonus MON rods"
                description={MONAD_SHOP_TEST_MODE_ENABLED
                  ? 'Test mode unlocks these bonus rods directly, so every MON rod can be bought and tested now.'
                  : 'Bonus rods add stronger rare+, XP, and sell-price buffs. In live mode they require the matching base rod first.'}
              />
              <div className="grid gap-2.5 sm:gap-3 lg:grid-cols-2">
                {NFT_ROD_DATA.map((nft) => {
                  const purchaseKey = `nft-rod-${nft.rodLevel}`;
                  const hasBaseRod = rodLevel >= nft.rodLevel;
                  const baseRequirementMet = hasBaseRod || MONAD_SHOP_TEST_MODE_ENABLED;
                  const isOwned = nftRods.includes(nft.rodLevel);
                  const rodImage = MONAD_ROD_IMAGES[nft.rodLevel as keyof typeof MONAD_ROD_IMAGES] ?? ROD_DISPLAY_INFO[nft.rodLevel].image;

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
                              <div>+{nft.rarityBonus}% rare+ fish chance</div>
                              <div>+{nft.xpBonus}% XP</div>
                              {nft.sellBonus > 0 ? <div>+{nft.sellBonus}% fish sell price</div> : null}
                            </div>
                          </div>
                        </div>
                        <div className="rounded-[0.9rem] border border-[#6f4928] bg-[rgba(15,10,7,0.72)] px-3 py-2 text-xs text-[#f8e8bf]/74">
                          {isOwned
                            ? 'Already minted on this account.'
                            : hasBaseRod
                              ? 'Base rod owned. This mint upgrades it into the heavier MON bonus version.'
                              : MONAD_SHOP_TEST_MODE_ENABLED
                                ? 'Test mode: base-rod gating is bypassed so this bonus rod can be purchased now.'
                                : `Buy the ${ROD_DATA[nft.rodLevel]?.name ?? `Rod ${nft.rodLevel}`} first, then mint its bonus version here.`}
                        </div>
                        {isOwned ? (
                          <div className="mt-auto text-sm font-black text-[#f3c777]">
                            <Check className="mr-1 inline h-4 w-4" />
                            Minted
                          </div>
                        ) : (
                          <Button
                            type="button"
                            disabled={!walletConnected || !baseRequirementMet || activeMonadPurchase !== null}
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
                            {activeMonadPurchase === purchaseKey ? 'Processing...' : monadPriceLabel(nft.mintCost)}
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
              {MONAD_SHOP_TEST_MODE_ENABLED ? (
                <QuestBoardPlaque
                  eyebrow="Temporary MON test"
                  description="Fake MON payments are active for this test build. Purchases still apply through the server flow and can be disabled with VITE_MONAD_SHOP_TEST_MODE_ENABLED=0."
                />
              ) : null}

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
                      onServerPlayerUpdated={onServerPlayerUpdated}
                      initialTab="coins"
                      triggerLabel="Gold packs"
                      coinsOnly
                    />
                  )}
                />
              ) : (
                <QuestBoardPlaque
                  eyebrow="Connect wallet"
                  description="Monad Shop is wallet-only. Connect from the HUD wallet button, then come back here for MON purchases."
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
                        Pick a Monad net tier. Bigger nets refill with more random fish every 24 hours, then you manage the catch from Inventory -&gt; Gear.
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
                          Open Inventory -&gt; Gear to review the catch and press Забрать.
                          {fishingNetPreview ? (
                            <span className="mt-1 block text-xs text-[#f8e8bf]/70">{fishingNetPreview}</span>
                          ) : null}
                        </>
                      ) : (
                        <>
                          <span className="font-black text-[#f3c777]">{currentNetOffer?.label ?? 'Net'} deployed.</span>{' '}
                          {currentNetDailyFishCount} fish per day are configured. It stays in Inventory -&gt; Gear and refills after the next daily reset.
                        </>
                      )
                    ) : (
                      <>
                        Choose the tier you want first. The original coin price was tuned around a {FISHING_NET_PAYBACK_DAYS_ESTIMATE}-day payback, so these stay premium convenience upgrades instead of mandatory progression.
                      </>
                    )}
                  </div>

                  <div className="rounded-[0.9rem] border border-dashed border-[#8d6436] bg-[rgba(15,10,7,0.46)] px-3 py-3 text-sm text-[#f8e8bf]/76">
                    {fishingNet.owned
                      ? 'Manage and collect this net from Inventory -> Gear.'
                      : 'Buy any net tier below. Your first purchase fills the net immediately for today, then the net appears in Inventory -> Gear.'}
                  </div>
                </div>
              </QuestBoardCard>

              <QuestBoardPlaque
                eyebrow="Net tiers"
                description={fishingNet.owned
                  ? `Current deployed tier: ${currentNetDailyFishCount} fish per day. Collect from Inventory -> Gear, or upgrade here to a larger net.`
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
                    ? `${offer.label} deployed. Open Inventory -> Gear to collect today's fish.`
                    : `${offer.label} upgraded. Collect it from Inventory -> Gear.`;

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
                                : 'First purchase deploys the net immediately, fills it for today, and puts it in Inventory -> Gear.'}
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
                            applyLocalUnlock: ({ txHash }) => onBuyFishingNetWithMon(offer.fishCount, offer.monAmount, txHash),
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
                              {activeMonadPurchase === purchaseKey ? 'Processing...' : monadPriceLabel(offer.monAmount)}
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
                description="Buy extra cube rolls straight from the shop instead of bouncing into the cube screen first. These are now premium-priced top-ups, not cheap spam rolls."
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
                            applyLocalUnlock: ({ txHash }) => onBuyCubeRollsWithMon(pkg.rolls, pkg.monAmount, txHash),
                          })}
                          className={`mt-auto ${SHOP_BUTTON_CLASS_NAME}`}
                        >
                          <Coins className="mr-2 h-4 w-4" />
                          {activeMonadPurchase === purchaseKey ? 'Processing...' : monadPriceLabel(pkg.monAmount)}
                        </Button>
                      </div>
                    </QuestBoardCard>
                  );
                })}
              </div>

              <QuestBoardPlaque
                eyebrow="Rods moved"
                description="All rod unlocks and bonus rod mints now live in the Rods tab, so Monad Shop is only for gold packs, nets, and cube rolls."
              />
            </div>
          </TabsContent>
        </QuestBoard>
      </Tabs>
    </GameScreenShell>
  );
};

export default ShopScreen;
