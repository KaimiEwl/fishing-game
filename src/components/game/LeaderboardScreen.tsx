import React from 'react';
import { ChefHat, Lock, Trophy, Wallet } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import GameScreenShell from './GameScreenShell';
import { publicAsset } from '@/lib/assets';
import type { GrillLeaderboardEntry } from '@/types/game';

interface LeaderboardScreenProps {
  coins: number;
  grillScore: number;
  entries: GrillLeaderboardEntry[];
  currentPlayerId: string;
  isConnected: boolean;
  walletAddress?: string;
  nickname?: string | null;
}

const LeaderboardScreen: React.FC<LeaderboardScreenProps> = ({
  coins,
  grillScore,
  entries,
  currentPlayerId,
  isConnected,
  walletAddress,
  nickname,
}) => {
  const shortWallet = walletAddress ? `${walletAddress.slice(0, 6)}...${walletAddress.slice(-4)}` : '';
  const currentEntry = entries.find((entry) => entry.id === currentPlayerId);
  const displayName = currentEntry?.name || nickname || shortWallet || 'Guest griller';

  return (
    <GameScreenShell
      title="Leaderboard"
      subtitle="Grill score board. Cook a dish, enter a name, and climb the local table."
      coins={coins}
      backgroundImage={publicAsset('assets/bg_leaderboard.jpg')}
    >
      <div className="grid h-full min-h-0 gap-3 lg:grid-cols-[0.8fr_1.2fr]">
        <aside className="rounded-lg border border-cyan-300/15 bg-black/60 p-4 backdrop-blur-md">
          <div className="inline-flex h-12 w-12 items-center justify-center rounded-lg border border-cyan-300/20 bg-zinc-950 text-cyan-100">
            <Trophy className="h-6 w-6" />
          </div>
          <h2 className="mt-4 text-2xl font-black">{grillScore.toLocaleString()}</h2>
          <p className="mt-1 text-sm text-white/60">your grill score</p>
          <div className="mt-4 rounded-lg border border-zinc-800 bg-zinc-950 p-3 text-sm text-zinc-400">
            {currentEntry ? (
              <>
                <Trophy className="mr-2 inline h-4 w-4 text-cyan-100" />
                <span className="font-bold text-cyan-100">{displayName}</span>
                <div className="mt-1 text-xs text-zinc-500">{currentEntry.dishes} dishes cooked</div>
              </>
            ) : isConnected ? (
              <>
                <Wallet className="mr-2 inline h-4 w-4" />
                Cook one dish to publish as {displayName}.
              </>
            ) : (
              <>
                <Lock className="mr-2 inline h-4 w-4" />
                Cook one dish to enter the local board. Wallet is optional for now.
              </>
            )}
          </div>
        </aside>

        <section className="min-h-0 rounded-lg border border-cyan-300/15 bg-black/60 p-4 backdrop-blur-md">
          <div className="mb-3 flex items-center justify-between gap-3">
            <div>
              <h2 className="text-xl font-black text-white">Top grillers</h2>
              <p className="text-sm font-medium text-cyan-50/65">Saved on this device.</p>
            </div>
            <div className="inline-flex h-10 items-center gap-2 rounded-lg border border-cyan-300/20 bg-zinc-950 px-3 text-sm font-black text-cyan-100">
              <ChefHat className="h-4 w-4" />
              {entries.length}
            </div>
          </div>

          {entries.length === 0 ? (
            <div className="flex h-[calc(100%-4rem)] min-h-[260px] flex-col items-center justify-center rounded-lg border border-zinc-800 bg-zinc-950/80 p-5 text-center">
              <Trophy className="h-12 w-12 text-cyan-100" />
              <h2 className="mt-4 text-xl font-black text-white">No grillers yet</h2>
              <p className="mt-2 max-w-md text-sm text-white/60">
                Cook your first dish, save a name, and your score will appear here.
              </p>
            </div>
          ) : (
            <ScrollArea className="h-[calc(100%-4rem)] pr-2">
              <div className="grid gap-2">
                {entries.slice(0, 25).map((entry, index) => {
                  const isCurrent = entry.id === currentPlayerId;
                  const wallet = entry.walletAddress
                    ? `${entry.walletAddress.slice(0, 6)}...${entry.walletAddress.slice(-4)}`
                    : 'local player';

                  return (
                    <article
                      key={entry.id}
                      className={`grid grid-cols-[2.5rem_1fr_auto] items-center gap-3 rounded-lg border p-3 ${isCurrent
                        ? 'border-cyan-300/35 bg-zinc-950 shadow-[0_0_20px_rgba(34,211,238,0.12)]'
                        : 'border-zinc-800 bg-black/55'
                      }`}
                    >
                      <div className="flex h-9 w-9 items-center justify-center rounded-lg border border-cyan-300/15 bg-black text-sm font-black text-cyan-100">
                        #{index + 1}
                      </div>
                      <div className="min-w-0">
                        <div className="truncate text-base font-black text-white">
                          {entry.name}
                          {isCurrent && <span className="ml-2 text-xs font-bold text-cyan-100">YOU</span>}
                        </div>
                        <div className="mt-0.5 truncate text-xs text-zinc-500">
                          {entry.dishes} dishes · {wallet}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-lg font-black text-cyan-100">{entry.score.toLocaleString()}</div>
                        <div className="text-xs text-zinc-500">score</div>
                      </div>
                    </article>
                  );
                })}
              </div>
            </ScrollArea>
          )}
        </section>
      </div>
    </GameScreenShell>
  );
};

export default LeaderboardScreen;
