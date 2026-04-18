import { Link } from 'react-router-dom';
import { ArrowLeft, Fish, Flame, Gem, Map, Shield, Sparkles, Trophy, Wallet } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

const sections = [
  {
    id: 'overview',
    title: 'Game Overview',
    icon: Fish,
    body: 'MonadFish is a browser fishing game where you cast from the main lake, catch fish by rarity, sell or cook them, upgrade rods, spin the cube, and compete on the grill leaderboard.',
  },
  {
    id: 'loop',
    title: 'Core Loop',
    icon: Sparkles,
    bullets: [
      'Cast the line and react during the bite window.',
      'Catch fish, earn coins and XP, and unlock stronger rods.',
      'Use the inventory to sell fish or save them for grill recipes.',
      'Complete daily tasks to unlock extra rewards and the cube flow.',
    ],
  },
  {
    id: 'rods',
    title: 'Rods and Progress',
    icon: Trophy,
    bullets: [
      'Higher rods improve your fishing options and visual loadout.',
      'Some rod tiers also have NFT versions with bonus stats.',
      'XP raises your level, and every level-up grants extra coins.',
    ],
  },
  {
    id: 'grill',
    title: 'Grill and Leaderboard',
    icon: Flame,
    bullets: [
      'Cook recipes from your caught fish to earn grill score.',
      'The leaderboard is shared between devices after your named profile syncs.',
      'Bigger dishes and better fish matter more than raw catch count.',
    ],
  },
  {
    id: 'cube',
    title: 'Cube and Bonuses',
    icon: Gem,
    bullets: [
      'The prize cube reveals either coin rewards or fish rewards.',
      'Boost and paid cube spins use MON and stay separate from normal fishing progression.',
      'Travel, boost, and shortcut actions are available from the fishing screen.',
    ],
  },
  {
    id: 'wallet',
    title: 'Wallet and Account',
    icon: Wallet,
    bullets: [
      'Wallet connection is optional for browsing, but required for MON purchases and verified save sync.',
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
  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,#102458,#04060d_60%)] text-zinc-100">
      <div className="mx-auto flex max-w-6xl flex-col gap-10 px-5 py-10 sm:px-8 lg:flex-row lg:px-10">
        <aside className="lg:sticky lg:top-8 lg:h-fit lg:w-72">
          <Button variant="ghost" asChild className="mb-5 justify-start text-cyan-100 hover:bg-cyan-300/10 hover:text-cyan-50">
            <Link to="/">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Game
            </Link>
          </Button>

          <div className="rounded-3xl border border-cyan-300/15 bg-black/40 p-5 shadow-2xl backdrop-blur-xl">
            <p className="text-xs font-black uppercase tracking-[0.18em] text-cyan-200/80">MonadFish Guide</p>
            <h1 className="mt-3 text-3xl font-black leading-tight text-white">Rules, progression, and wallet basics</h1>
            <p className="mt-3 text-sm leading-6 text-zinc-300">
              This is the in-project guide for players, inspired by whitepaper-style layouts but focused on the current MonadFish flow.
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
                    MonadFish combines arcade fishing, rod progression, grill recipes, a shared leaderboard, wallet-linked purchases, and a daily cube reward loop. Everything below reflects the current project implementation.
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
            <Card key={section.id} id={section.id} className="scroll-mt-8 border border-cyan-300/10 bg-black/40 backdrop-blur-xl">
              <CardHeader>
                <div className="flex items-center gap-3">
                  <div className="rounded-2xl border border-cyan-300/15 bg-cyan-300/10 p-3">
                    <section.icon className="h-5 w-5 text-cyan-100" />
                  </div>
                  <CardTitle className="text-xl font-black text-white">{section.title}</CardTitle>
                </div>
              </CardHeader>
              <CardContent className="text-sm leading-6 text-zinc-300">
                {section.body && <p>{section.body}</p>}
                {section.bullets && (
                  <ul className="space-y-2">
                    {section.bullets.map((bullet) => (
                      <li key={bullet} className="rounded-2xl border border-zinc-800 bg-zinc-950/65 px-4 py-3">
                        {bullet}
                      </li>
                    ))}
                  </ul>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
};

export default Guide;
