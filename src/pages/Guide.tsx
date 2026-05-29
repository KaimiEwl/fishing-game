import {
  Backpack,
  Bell,
  Box,
  Coins,
  Fish,
  Flame,
  Gamepad2,
  Map,
  Shield,
  ShoppingCart,
  Sparkles,
  Trophy,
  Wallet,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { usePageScroll } from '@/hooks/usePageScroll';
import ContentPageShell, { ContentPageBackLink } from '@/components/ContentPageShell';
import GuideSectionCard from '@/components/GuideSectionCard';
import GameTitleBanner from '@/components/GameTitleBanner';
import { LEVIATHAN_COMMON_ROD_BONUS_CONFIG, ROD_CUBE_DROP_CONFIG, ROD_DATA } from '@/types/game';
import {
  FISHING_NET_DAILY_FISH_COUNT,
  MON_COIN_PACKAGES,
  MON_FISHING_NET_PACKAGES,
  MON_MARKET_RECEIVER_ADDRESS,
} from '@/lib/baitEconomy';
import { WALLET_CHECK_IN_COST_MON } from '@/lib/economyConfig';
import { MONAD_SHOP_TEST_MODE_ENABLED } from '@/lib/monadTestMode';
import { publicAsset } from '@/lib/assets';

const getRodById = (id: string) => ROD_DATA.find((rod) => rod.id === id);
const commonRod = getRodById('common_rod') ?? ROD_DATA[0];
const leviathanRequiredRod = getRodById(LEVIATHAN_COMMON_ROD_BONUS_CONFIG.requiredRodId) ?? commonRod;
const leviathanBonusRod = getRodById(LEVIATHAN_COMMON_ROD_BONUS_CONFIG.bonusRodId);
const paidRodNames = ROD_DATA
  .filter((rod) => Boolean(rod.monUnlockCost))
  .map((rod) => rod.name)
  .join(', ');
const goldRodNames = ROD_DATA
  .filter((rod) => Boolean(rod.coinCost))
  .map((rod) => rod.name)
  .join(', ');
const cubeRodNames = ROD_CUBE_DROP_CONFIG.cubeRodRewards
  .map((reward) => getRodById(reward.rodId)?.name)
  .filter((name): name is string => Boolean(name))
  .join(', ');
const baseFishingNet = MON_FISHING_NET_PACKAGES[0];
const monGoldPackSummary = MON_COIN_PACKAGES
  .map((pack) => `${pack.coins} gold for ${pack.monAmount} MON`)
  .join(', ');
const cubeMonPrizeLabels = ['0.5 MON', '1 MON', '25 MON', '50 MON', '100 MON'];

const guideScreenshot = (fileName: string) => publicAsset(`assets/guide/${fileName}`);
const screenshots = {
  rodMonReward: {
    src: guideScreenshot('01_rod_mon_reward.png'),
    alt: 'Monad logo reward celebration after a MON rod pull',
    caption: 'MON-capable rods can land a separate +0.1 MON result. The result panel now uses the Monad logo, fireworks, and a reward sound.',
  },
  paymentReceiver: {
    src: guideScreenshot('02_payment_receiver.png'),
    alt: 'Payment receiver wallet address used by paid game actions',
    caption: `Paid wallet actions send MON to ${MON_MARKET_RECEIVER_ADDRESS}; the server checks that exact receiver before granting the item.`,
  },
  cubePrizes: {
    src: guideScreenshot('03_cube_mon_prizes.png'),
    alt: 'Cube MON prize table with weighted jackpot amounts',
    caption: `Cube MON tiles can resolve as ${cubeMonPrizeLabels.join(', ')}. The double-digit amounts are rare jackpot outcomes.`,
  },
  walletCheckIn: {
    src: guideScreenshot('04_wallet_checkin_0_5_mon.png'),
    alt: 'Wallet streak check-in task showing 0.5 MON',
    caption: `The Blockchain wallet check-in now uses ${WALLET_CHECK_IN_COST_MON} MON, then verifies the tx hash server-side.`,
  },
  shopGoldForMon: {
    src: guideScreenshot('05_shop_gold_for_mon.png'),
    alt: 'Monad Shop gold packs sold directly for MON',
    caption: 'Gold packs are now visible as direct Monad Shop cards, so players can buy gold with MON without opening the old hidden dialog.',
  },
  cubeMusicSalute: {
    src: guideScreenshot('06_cube_music_ducking_salute.png'),
    alt: 'Cube spin with quiet background music, fanfare, and MON fireworks',
    caption: 'During cube spins the main music is ducked very low, the fanfare leads the moment, and MON wins trigger fireworks.',
  },
};

const sections = [
  {
    id: 'overview',
    title: 'Game Overview',
    icon: Fish,
    body: 'Hook & Loot lets you cast from the main lake, catch fish by rarity, choose active rods, pull occasional MON bonuses, spin the cube, deploy passive fishing nets, and cook catches for the grill leaderboard.',
  },
  {
    id: 'getting-started',
    title: 'How to Play',
    icon: Gamepad2,
    bullets: [
      'Start as a guest or connect a wallet. Guest play is enough for normal fishing; wallet verification is needed for live MON purchases, MON rewards, and cross-device saves.',
      'Press Cast on the lake, wait for the bite window, then hook the fish before it gets away.',
      'Sell fish for gold, save fish for grill recipes, or cook dishes to push leaderboard score.',
      'Upgrade rods from the shop and equip the rod you want from the fishing HUD or Inventory -> Rods.',
      'Complete daily, weekly, social, Blockchain, and bounty tasks to unlock extra rewards and cube rolls.',
      'Open Cube after the daily task gate or buy extra cube rolls with MON when you want a jackpot attempt.',
    ],
  },
  {
    id: 'latest-updates',
    title: 'Latest Updates',
    icon: Sparkles,
    bullets: [
      'Rod MON pulls now have their own celebration: Monad logo, stronger fireworks, and a dedicated reward sound.',
      `The cube can now award ${cubeMonPrizeLabels.join(', ')} instead of only one MON amount; 25, 50, and 100 MON are intentionally rare.`,
      'Cube spin audio now stands out: the normal background loop becomes very quiet while the cube fanfare and result animation run.',
      `Wallet streak check-in now requires ${WALLET_CHECK_IN_COST_MON} MON and uses the same shared amount on frontend and server.`,
      `All paid wallet actions verify payment to ${MON_MARKET_RECEIVER_ADDRESS}, so shop purchases, cube top-ups, rods, nets, and check-ins resolve against one receiver address.`,
      `Monad Shop now exposes direct gold packs: ${monGoldPackSummary}.`,
    ],
  },
  {
    id: 'loop',
    title: 'Core Loop',
    icon: Sparkles,
    bullets: [
      'Choose an active unlocked rod before fishing, either from the fishing HUD rod badge or the Rods tab in inventory.',
      'Cast the line and react during the bite window.',
      'Catch fish, earn coins and XP, and keep the fish as the main result of the catch.',
      'MON-capable rods can also resolve a separate +0.1 MON outcome, so a cast can end as fish, empty water, or a Monad reward.',
      'Open Tasks to claim daily, weekly, social, wallet, and special bounty rewards when they become ready.',
      'Use the inventory to sell fish or save them for grill recipes and cooked dishes.',
      'Claim any 3 daily task rewards to unlock the cube flow each day.',
    ],
  },
  {
    id: 'shop',
    title: 'Shop and MON Payments',
    icon: ShoppingCart,
    images: [screenshots.shopGoldForMon, screenshots.paymentReceiver],
    bullets: [
      'The shop header shows Gold Balance plus the current in-game Monad Balance earned from cube, rod, bounty, and compensation rewards.',
      'Bait stays in the Bait tab, gold rod upgrades and bonus rod mints stay in Rods, and Monad Shop is for direct gold packs, Auto Fishing Net tiers, extra cube rolls, and top-tier MON rods.',
      `Gold packs are visible directly in Monad Shop now: ${monGoldPackSummary}.`,
      `${goldRodNames || 'Gold rods'} are bought with coins in the Rods tab, giving mid-game players a gold sink while balance testing is active.`,
      `${paidRodNames || 'Top-tier MON rods'} can be unlocked from the Rods tab with MON and then equipped from inventory or the fishing HUD.`,
      `Monad Shop purchase buttons use the active wallet balance and require the normal wallet payment flow in live mode. The payment receiver is ${MON_MARKET_RECEIVER_ADDRESS}.`,
      'After a transaction is sent, the server verifies the hash, sender, receiver, amount, and success status before it grants gold, rolls, rods, nets, or other paid rewards.',
      ...(MONAD_SHOP_TEST_MODE_ENABLED
        ? ['Temporary MON test mode is currently active, so fake MON payments can be used to buy and test MON shop items without a real transfer.']
        : []),
    ],
  },
  {
    id: 'tasks',
    title: 'Tasks, Check-In, and Social',
    icon: Coins,
    images: [screenshots.walletCheckIn],
    bullets: [
      'Tasks are split into daily, weekly, Social, Blockchain, and special bounty cards so players can see what action unlocks each reward.',
      'Claiming 3 daily task rewards unlocks the daily cube flow.',
      `The Blockchain wallet streak check-in now sends ${WALLET_CHECK_IN_COST_MON} MON, submits the tx hash, and lets the server verify it against the shared receiver address.`,
      'The Social Follow on X quest opens the Hook & Loot X profile, waits for a short visit timer, and then grants +3 persistent cube rolls when claimed.',
      'The Leviathan bounty is also surfaced on the Tasks board so players know which rod to equip before chasing the special reward.',
    ],
  },
  {
    id: 'rods',
    title: 'Rods and Progress',
    icon: Trophy,
    images: [screenshots.rodMonReward],
    bullets: [
      `Every player starts with the free ${commonRod.name}; it is available by default and stays selectable even after you unlock better rods.`,
      `${goldRodNames || 'Gold rods'} are purchased with coins in the Rods tab and show their rarity, price, owned state, and not-enough-gold state there.`,
      `${paidRodNames || 'Top-tier MON rods'} are purchased with MON and keep the normal wallet payment flow.`,
      'Unlocked rods become available for selection. Locked or unowned rods cannot be equipped.',
      'Higher rarity rods improve rare+ fish odds, change the visual loadout, and can unlock the rod MON outcome.',
      'Rare, Epic, and Legendary MON-capable rods can land a separate +0.1 MON result. This is shown as a Monad-logo win instead of a fish-got-away panel.',
      `${leviathanBonusRod?.name ?? 'A paid rod'} is awarded if you catch the Cosmic Leviathan with the ${leviathanRequiredRod.name}. If you already own that rod tier, the game grants the configured MON duplicate compensation instead.`,
      'The Tasks board also shows this Cosmic Leviathan bounty so the required rod and reward are visible before attempting it.',
      'Some rod tiers also have NFT versions with bonus stats.',
      'XP raises your level, and every level-up grants extra coins.',
    ],
  },
  {
    id: 'net',
    title: 'Auto Fishing Net',
    icon: Backpack,
    bullets: [
      `Auto Fishing Net tiers are bought in Monad Shop; the starter ${baseFishingNet?.label ?? 'net'} is configured around ${baseFishingNet?.fishCount ?? FISHING_NET_DAILY_FISH_COUNT} fish per day.`,
      'After purchase, the net appears in Inventory -> Gear and stores its caught fish there instead of silently adding them to the fish list.',
      'Open the Gear tab to preview the pending fish list, then press the collect button to move those fish into inventory.',
      'A first net purchase fills the net for the current day, then the net refills once per daily reset.',
      'The full-net notification is guarded so the same ready catch should not spam repeated toasts after refreshes.',
    ],
  },
  {
    id: 'grill',
    title: 'Grill and Leaderboard',
    icon: Flame,
    bullets: [
      'Cook recipes from your caught fish to earn grill score.',
      'Each cooked dish is also stored in inventory and can be sold later for gold.',
      'The leaderboard is shared between devices after your named profile syncs.',
      'Bigger dishes and better fish matter more than raw catch count.',
    ],
  },
  {
    id: 'cube',
    title: 'Cube and Bonuses',
    icon: Box,
    images: [screenshots.cubePrizes, screenshots.cubeMusicSalute],
    bullets: [
      'The prize cube reveals coin, bait, fish, MON, or rod rewards after the spin lands on the selected tile.',
      `MON cube tiles can pay ${cubeMonPrizeLabels.join(', ')}. The smallest amount is the normal MON hit; 25, 50, and 100 MON are rare jackpots.`,
      `${cubeRodNames || 'Paid rods'} can appear in the cube, but the rod tile is intentionally extremely rare.`,
      `A paid rod tile can show on a cube face as a visible jackpot preview; actually landing on it is tuned to about 1 in ${Math.round(1 / ROD_CUBE_DROP_CONFIG.targetWinChance).toLocaleString()} rolls.`,
      'Cube rod rewards only target upgrades above your current unlocked rod tier.',
      'If a duplicate cube rod is resolved for a verified wallet, the game uses the configured MON compensation instead of granting the same non-stackable rod again.',
      'Boost and paid cube spins use MON and stay separate from normal fishing progression.',
      'Cube spins play a celebratory fanfare while sound effects are enabled, and the background music ducks very low until the spin/result moment is done.',
      'When the cube resolves a MON prize or MON compensation, it shows the Monad logo celebration with the stronger fireworks layer.',
      'Travel, boost, and shortcut actions are available from the fishing screen.',
    ],
  },
  {
    id: 'notifications',
    title: 'Notifications',
    icon: Bell,
    bullets: [
      'Important purchases, cube rewards, MON pulls, special rod rewards, and fishing-net state changes are surfaced as toasts.',
      'MON reward moments are treated as wins: they show the Monad mark, play the reward cue when sound is enabled, and use fireworks when the reward comes from a rod or cube.',
      'Fishing-net full messages are keyed to the current ready catch so a single catch batch should announce once, then stay quiet until the next refill.',
      'Errors from server-backed actions are shown in the UI and also logged for testing so failed saves or purchases are easier to diagnose.',
    ],
  },
  {
    id: 'wallet',
    title: 'Wallet and Account',
    icon: Wallet,
    bullets: [
      'Guest profiles are server-backed in the current build, so normal fishing and cube progress can restore from the same browser session.',
      'Wallet connection is optional for browsing, but required for live MON purchases, wallet rewards, and verified cross-device save sync.',
      `Paid game actions send to ${MON_MARKET_RECEIVER_ADDRESS}. This address is used as the canonical receiver so the backend can reject tx hashes sent to the wrong wallet.`,
      `Wallet streak check-in is a paid Blockchain task and currently uses ${WALLET_CHECK_IN_COST_MON} MON.`,
      'Linking a wallet can carry guest progress into the verified profile, including inventory, rods, cooked dishes, tasks, cube state, and net state.',
      'Nickname and avatar are attached to your saved player profile.',
      'Private keys and seed phrases are never requested by the game.',
    ],
  },
  {
    id: 'fair-play',
    title: 'Fair Play Rules',
    icon: Shield,
    bullets: [
      'Do not exploit bugs, automation, or scripting to gain an unfair advantage.',
      'Do not impersonate other players or misuse connected wallets.',
      'Gameplay balance, rewards, and visuals may change as the game is updated.',
    ],
  },
];

const Guide = () => {
  usePageScroll();

  return (
    <ContentPageShell tone="guide" maxWidth="wide">
      <div className="flex flex-col gap-10 px-0 py-0 sm:px-2 lg:flex-row">
        <aside className="lg:sticky lg:top-8 lg:h-fit lg:w-72">
          <ContentPageBackLink tone="guide" />

          <div className="rounded-3xl border border-cyan-300/15 bg-black/40 p-5 shadow-2xl backdrop-blur-xl">
            <GameTitleBanner className="mb-5 w-full max-w-[15rem]" />
            <p className="text-xs font-black uppercase tracking-[0.18em] text-cyan-200/80">Game Guide</p>
            <h1 className="mt-3 text-3xl font-black leading-tight text-white">Rules, progression, and wallet basics</h1>
            <p className="mt-3 text-sm leading-6 text-zinc-300">
              This is the in-project guide for players, inspired by whitepaper-style layouts but focused on the current game flow.
            </p>

            <nav className="mt-6 space-y-2">
              {sections.map((section) => (
                <a
                  key={section.id}
                  href={`#${section.id}`}
                  className="flex items-center gap-3 rounded-2xl border border-transparent bg-zinc-950/60 px-3 py-2 text-sm font-semibold text-zinc-200 transition-colors hover:border-cyan-300/20 hover:text-cyan-100"
                >
                  <section.icon className="h-4 w-4 text-cyan-200" />
                  {section.title}
                </a>
              ))}
            </nav>
          </div>
        </aside>

        <div className="min-w-0 flex-1 space-y-5">
          <Card className="overflow-hidden border border-cyan-300/15 bg-black/45 shadow-[0_24px_70px_rgba(0,0,0,0.45)] backdrop-blur-xl">
            <CardHeader className="border-b border-cyan-300/10 bg-[linear-gradient(135deg,rgba(8,145,178,0.22),rgba(59,130,246,0.08),rgba(0,0,0,0))]">
              <div className="flex items-start gap-3">
                <div className="rounded-2xl border border-cyan-300/20 bg-cyan-300/10 p-3">
                  <Map className="h-6 w-6 text-cyan-100" />
                </div>
                <div>
                  <p className="text-xs font-black uppercase tracking-[0.18em] text-cyan-200/70">Current Build</p>
                  <CardTitle className="mt-2 text-3xl font-black text-white">How the game works right now</CardTitle>
                  <p className="mt-3 max-w-2xl text-sm leading-6 text-zinc-300">
                    The game combines arcade fishing, rod progression, grill recipes, a shared leaderboard, wallet-linked purchases, and a daily cube reward loop. Everything below reflects the current project implementation.
                  </p>
                </div>
              </div>
            </CardHeader>
            <CardContent className="grid gap-4 p-5 md:grid-cols-3">
              <div className="rounded-2xl border border-zinc-800 bg-zinc-950/70 p-4">
                <p className="text-xs font-black uppercase tracking-[0.16em] text-cyan-200/70">Fishing</p>
                <p className="mt-2 text-sm text-zinc-300">Catch fish, react during bite windows, and build inventory value.</p>
              </div>
              <div className="rounded-2xl border border-zinc-800 bg-zinc-950/70 p-4">
                <p className="text-xs font-black uppercase tracking-[0.16em] text-cyan-200/70">Progress</p>
                <p className="mt-2 text-sm text-zinc-300">Use coins, XP, rods, NFTs, boost, and the cube to improve outcomes.</p>
              </div>
              <div className="rounded-2xl border border-zinc-800 bg-zinc-950/70 p-4">
                <p className="text-xs font-black uppercase tracking-[0.16em] text-cyan-200/70">Competition</p>
                <p className="mt-2 text-sm text-zinc-300">Cook dishes and push score on the shared grill leaderboard.</p>
              </div>
            </CardContent>
          </Card>

          {sections.map((section) => (
            <GuideSectionCard
              key={section.id}
              id={section.id}
              title={section.title}
              icon={section.icon}
              body={section.body}
              bullets={section.bullets}
              images={section.images}
            />
          ))}
        </div>
      </div>
    </ContentPageShell>
  );
};

export default Guide;
