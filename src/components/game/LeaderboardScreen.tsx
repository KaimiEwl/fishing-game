import React from 'react';
import { Lock, Trophy, Wallet } from 'lucide-react';
import { Button } from '@/components/ui/button';
import GameScreenShell from './GameScreenShell';
import { publicAsset } from '@/lib/assets';

interface LeaderboardScreenProps {
  coins: number;
  grillScore: number;
  isConnected: boolean;
  walletAddress?: string;
  nickname?: string | null;
}

const LeaderboardScreen: React.FC<LeaderboardScreenProps> = ({
  coins,
  grillScore,
  isConnected,
  walletAddress,
  nickname,
}) => {
  const shortWallet = walletAddress ? `${walletAddress.slice(0, 6)}...${walletAddress.slice(-4)}` : '';

  return (
    <GameScreenShell
      title="Leaderboard"
      subtitle="Grill score board. Wallet connection is required for public ranking."
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
            {isConnected ? (
              <>
                <Wallet className="mr-2 inline h-4 w-4" />
                {nickname || shortWallet}
              </>
            ) : (
              <>
                <Lock className="mr-2 inline h-4 w-4" />
                Connect wallet to publish score.
              </>
            )}
          </div>
        </aside>

        <section className="rounded-lg border border-cyan-300/15 bg-black/60 p-4 backdrop-blur-md">
          <div className="flex h-full min-h-[280px] flex-col items-center justify-center text-center">
            <Trophy className="h-12 w-12 text-cyan-100" />
            <h2 className="mt-4 text-xl font-black">Supabase board next</h2>
            <p className="mt-2 max-w-md text-sm text-white/60">
              The UI is ready. The stable backend path is a Supabase table for wallet, nickname,
              all-time grill score, daily score, weekly score, and last sync time.
            </p>
            <Button
              type="button"
              disabled
              className="mt-5 h-10 rounded-lg border border-zinc-800 bg-zinc-950 text-zinc-600"
            >
              Public board pending schema
            </Button>
          </div>
        </section>
      </div>
    </GameScreenShell>
  );
};

export default LeaderboardScreen;
