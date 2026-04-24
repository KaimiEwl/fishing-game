import React from 'react';
import { ChefHat, Lock, Trophy, Wallet } from 'lucide-react';
import GameScreenShell from './GameScreenShell';
import { publicAsset } from '@/lib/assets';
import type { GrillLeaderboardEntry } from '@/types/game';
import GrillScoreInfoButton from './GrillScoreInfoButton';

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
      subtitle="Grill score board. Cook a dish, enter a name, and climb the shared table."
      coins={coins}
      backgroundImage={publicAsset('assets/bg_leaderboard.jpg')}
      contentScrollable
    >
      <div className="rounded-[24px] border border-yellow-300/35 bg-[linear-gradient(180deg,rgba(7,14,35,0.88),rgba(7,22,52,0.84))] p-3 shadow-[0_0_0_1px_rgba(250,204,21,0.1),0_24px_70px_rgba(3,8,24,0.6)] backdrop-blur-md sm:p-4">
        <div className="rounded-[20px] border border-cyan-300/20 bg-[radial-gradient(circle_at_50%_0%,rgba(250,204,21,0.14),transparent_30%),linear-gradient(180deg,rgba(11,22,56,0.92),rgba(7,16,39,0.88))] p-3 shadow-[inset_0_0_0_1px_rgba(56,189,248,0.08)] sm:p-4">
          <div className="mb-4 rounded-[18px] border border-yellow-300/35 bg-[linear-gradient(180deg,rgba(81,45,10,0.96),rgba(35,18,6,0.98))] px-4 py-3 shadow-[0_0_24px_rgba(250,204,21,0.16),inset_0_0_0_1px_rgba(253,224,71,0.12)]">
            <div className="flex items-center justify-between gap-3">
              <div className="flex min-w-0 items-center gap-3">
                <div className="inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border border-yellow-200/40 bg-[linear-gradient(180deg,#facc15,#d97706)] text-slate-950 shadow-[0_0_18px_rgba(250,204,21,0.3)]">
                  <Trophy className="h-6 w-6" />
                </div>
                <div className="min-w-0">
                  <h2 className="truncate text-2xl font-black text-yellow-100 drop-shadow-[0_2px_12px_rgba(250,204,21,0.28)] sm:text-3xl">Top grillers</h2>
                  <p className="text-sm font-semibold text-yellow-100/70">Shared leaderboard</p>
                </div>
              </div>
              <div className="inline-flex h-11 shrink-0 items-center gap-2 rounded-xl border border-yellow-200/35 bg-black/45 px-3 text-sm font-black text-yellow-100 shadow-[0_0_18px_rgba(250,204,21,0.12)]">
                <ChefHat className="h-4 w-4" />
                {entries.length}
              </div>
            </div>
          </div>

          <div className="grid gap-3 pb-1 lg:grid-cols-[0.8fr_1.2fr] lg:items-start">
            <aside className="rounded-[18px] border border-yellow-300/20 bg-[linear-gradient(180deg,rgba(12,20,52,0.96),rgba(8,11,26,0.95))] p-4 shadow-[inset_0_0_0_1px_rgba(56,189,248,0.12),0_0_24px_rgba(56,189,248,0.08)]">
              <div className="inline-flex h-12 w-12 items-center justify-center rounded-xl border border-cyan-200/30 bg-[linear-gradient(180deg,rgba(7,24,57,0.95),rgba(5,10,28,0.95))] text-cyan-100 shadow-[0_0_18px_rgba(56,189,248,0.18)]">
                <Trophy className="h-6 w-6" />
              </div>
              <h2 className="mt-4 text-4xl font-black text-yellow-100">{grillScore.toLocaleString()}</h2>
              <div className="mt-1 inline-flex items-center gap-2">
                <p className="text-sm font-medium text-cyan-50/75">your grill score</p>
                <GrillScoreInfoButton />
              </div>

              <div className="mt-4 rounded-[16px] border border-cyan-300/20 bg-[linear-gradient(180deg,rgba(8,12,28,0.95),rgba(7,20,48,0.88))] p-4 text-sm text-zinc-200 shadow-[0_0_18px_rgba(56,189,248,0.1)]">
                {currentEntry ? (
                  <>
                    <div className="flex items-center gap-2 text-base font-black text-white">
                      <Trophy className="h-4 w-4 text-yellow-300" />
                      {displayName}
                    </div>
                    <div className="mt-2 text-sm text-zinc-300">{currentEntry.dishes} dishes cooked</div>
                  </>
                ) : isConnected ? (
                  <>
                    <div className="flex items-center gap-2 font-bold text-cyan-50">
                      <Wallet className="h-4 w-4 text-yellow-300" />
                      Ready to publish as {displayName}
                    </div>
                    <div className="mt-2 text-sm text-zinc-300">Cook one dish and your score goes live on the board. Use the info button by your score to see how score share could be interpreted if the token launches later.</div>
                  </>
                ) : (
                  <>
                    <div className="flex items-center gap-2 font-bold text-cyan-50">
                      <Lock className="h-4 w-4 text-yellow-300" />
                      Board entry unlocks after your first dish
                    </div>
                    <div className="mt-2 text-sm text-zinc-300">Wallet is optional. Guest grillers still appear on the board, and the score info button explains the future token-share idea without making promises.</div>
                  </>
                )}
              </div>
            </aside>

            <section className="rounded-[18px] border border-cyan-300/20 bg-[linear-gradient(180deg,rgba(10,22,58,0.95),rgba(7,12,29,0.96))] p-3 shadow-[inset_0_0_0_1px_rgba(56,189,248,0.12),0_0_32px_rgba(59,130,246,0.08)] sm:p-4">
              {entries.length === 0 ? (
                <div className="flex min-h-[280px] flex-col items-center justify-center rounded-[16px] border border-cyan-300/18 bg-[linear-gradient(180deg,rgba(5,10,24,0.95),rgba(12,28,66,0.9))] p-6 text-center shadow-[0_0_24px_rgba(56,189,248,0.08)]">
                  <Trophy className="h-12 w-12 text-yellow-300" />
                  <h2 className="mt-4 text-2xl font-black text-yellow-100">No grillers yet</h2>
                  <p className="mt-2 max-w-md text-sm text-zinc-300">
                    Cook your first dish, save a name, and your score will appear here.
                  </p>
                </div>
              ) : (
                <div className="grid gap-3">
                  {entries.slice(0, 25).map((entry, index) => {
                    const isCurrent = entry.id === currentPlayerId;
                    const wallet = entry.walletAddress
                      ? `${entry.walletAddress.slice(0, 6)}...${entry.walletAddress.slice(-4)}`
                      : 'local player';

                    return (
                      <article
                        key={entry.id}
                        className={`grid grid-cols-[3rem_1fr_auto] items-center gap-3 rounded-[16px] border p-3 sm:p-4 ${isCurrent
                          ? 'border-cyan-300/35 bg-[linear-gradient(180deg,rgba(11,22,56,0.96),rgba(9,34,77,0.92))] shadow-[0_0_24px_rgba(56,189,248,0.18)]'
                          : 'border-yellow-300/15 bg-[linear-gradient(180deg,rgba(9,14,34,0.95),rgba(10,18,42,0.88))] shadow-[0_0_18px_rgba(250,204,21,0.06)]'
                        }`}
                      >
                        <div className={`flex h-11 w-11 items-center justify-center rounded-xl border text-base font-black ${isCurrent
                          ? 'border-cyan-200/35 bg-black/45 text-cyan-100'
                          : 'border-yellow-200/20 bg-black/40 text-yellow-100'
                        }`}>
                          #{index + 1}
                        </div>
                        <div className="min-w-0">
                          <div className="truncate text-xl font-black text-white">
                            {entry.name}
                            {isCurrent && <span className="ml-2 text-sm font-black text-cyan-100">YOU</span>}
                          </div>
                          <div className="mt-1 truncate text-sm text-zinc-300">
                            {entry.dishes} dishes - {wallet}
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-3xl font-black text-yellow-100">{entry.score.toLocaleString()}</div>
                          <div className="text-sm font-medium text-zinc-300">score</div>
                        </div>
                      </article>
                    );
                  })}
                </div>
              )}
            </section>
          </div>
        </div>
      </div>
    </GameScreenShell>
  );
};

export default LeaderboardScreen;
