import { Backpack, Bell, Box, Fish, Flame, Map, Shield, ShoppingCart, Sparkles, Trophy, Wallet } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { usePageScroll } from '@/hooks/usePageScroll';
import ContentPageShell, { ContentPageBackLink } from '@/components/ContentPageShell';
import GuideSectionCard from '@/components/GuideSectionCard';
import GameTitleBanner from '@/components/GameTitleBanner';
import { LEVIATHAN_COMMON_ROD_BONUS_CONFIG, ROD_CUBE_DROP_CONFIG, ROD_DATA } from '@/types/game';
import { FISHING_NET_DAILY_FISH_COUNT, MON_FISHING_NET_PACKAGES } from '@/lib/baitEconomy';
import { MONAD_SHOP_TEST_MODE_ENABLED } from '@/lib/monadTestMode';

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

const sections = [
  {
    id: 'overview',
    title: 'Game Overview',
    icon: Fish,
    body: 'Hook & Loot lets you cast from the main lake, catch fish by rarity, choose active rods, pull occasional MON bonuses, spin the cube, deploy passive fishing nets, and cook catches for the grill leaderboard.',
  },
  {
    id: 'loop',
    title: 'Core Loop',
    icon: Sparkles,
    bullets: [
      'Choose an active unlocked rod before fishing, either from the fishing HUD rod badge or the Rods tab in inventory.',
      'Cast the line and react during the bite window.',
      'Catch fish, earn coins and XP, and keep the fish as the main result of the catch.',
      'Paid rods can add a small MON pull only when the cast misses and no fish is caught.',
      'Open Tasks to claim daily, weekly, social, wallet, and special bounty rewards when they become ready.',
      'Use the inventory to sell fish or save them for grill recipes and cooked dishes.',
      'Claim any 3 daily task rewards to unlock the cube flow each day.',
    ],
  },
  {
    id: 'shop',
    title: 'Shop and MON Payments',
    icon: ShoppingCart,
    bullets: [
      'The shop header shows Gold Balance plus the current in-game Monad Balance earned from cube, rod, bounty, and compensation rewards.',
      'Bait stays in the Bait tab, gold rod upgrades and bonus rod mints stay in Rods, and Monad Shop is for gold packs, Auto Fishing Net tiers, extra cube rolls, and top-tier MON rods.',
      `${goldRodNames || 'Gold rods'} are bought with coins in the Rods tab, giving mid-game players a gold sink while balance testing is active.`,
      `${paidRodNames || 'Top-tier MON rods'} can be unlocked from the Rods tab with MON and then equipped from inventory or the fishing HUD.`,
      'Monad Shop purchase buttons use the active wallet balance and require the normal wallet payment flow in live mode.',
      ...(MONAD_SHOP_TEST_MODE_ENABLED
        ? ['Temporary MON test mode is currently active, so fake MON payments can be used to buy and test MON shop items without a real transfer.']
        : []),
    ],
  },
  {
    id: 'rods',
    title: 'Rods and Progress',
    icon: Trophy,
    bullets: [
      `Every player starts with the free ${commonRod.name}; it is available by default and stays selectable even after you unlock better rods.`,
      `${goldRodNames || 'Gold rods'} are purchased with coins in the Rods tab and show their rarity, price, owned state, and not-enough-gold state there.`,
      `${paidRodNames || 'Top-tier MON rods'} are purchased with MON and keep the normal wallet payment flow.`,
      'Unlocked rods become available for selection. Locked or unowned rods cannot be equipped.',
      'Higher rarity rods improve rare+ fish odds, change the visual loadout, and have stronger no-fish MON parameters.',
      'During wallet-linked no-fish casts, a paid rod can pull extra MON as an additional reward; the chance and reward range come from that rod tier.',
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
    bullets: [
      'The prize cube reveals coin, bait, fish, MON, or rod rewards.',
      `${cubeRodNames || 'Paid rods'} can appear in the cube, but the rod tile is intentionally extremely rare.`,
      `A paid rod tile can show on a cube face as a visible jackpot preview; actually landing on it is tuned to about 1 in ${Math.round(1 / ROD_CUBE_DROP_CONFIG.targetWinChance).toLocaleString()} rolls.`,
      'Cube rod rewards only target upgrades above your current unlocked rod tier.',
      'If a duplicate cube rod is resolved for a verified wallet, the game uses the configured MON compensation instead of granting the same non-stackable rod again.',
      'Boost and paid cube spins use MON and stay separate from normal fishing progression.',
      'Cube spins play a celebratory fanfare while sound effects are enabled.',
      'Travel, boost, and shortcut actions are available from the fishing screen.',
    ],
  },
  {
    id: 'notifications',
    title: 'Notifications',
    icon: Bell,
    bullets: [
      'Important purchases, cube rewards, MON pulls, special rod rewards, and fishing-net state changes are surfaced as toasts.',
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
            />
          ))}
        </div>
      </div>
    </ContentPageShell>
  );
};

export default Guide;
