import type { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2';

export interface WeeklyPayoutPreviewEntry {
  rank: number;
  wallet_address: string;
  name: string;
  score: number;
  dishes: number;
  amount_mon: number;
}

export const WEEKLY_GRILL_PAYOUTS = [
  2.5,
  1.75,
  1.25,
  1,
  0.75,
  0.5,
  0.5,
  0.5,
  0.5,
  0.5,
] as const;

export const getCurrentWeeklyPayoutKey = (date = new Date()) => {
  const current = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
  const day = current.getUTCDay();
  const diffToMonday = (day + 6) % 7;
  current.setUTCDate(current.getUTCDate() - diffToMonday);

  const year = current.getUTCFullYear();
  const month = String(current.getUTCMonth() + 1).padStart(2, '0');
  const dayOfMonth = String(current.getUTCDate()).padStart(2, '0');
  return `${year}-${month}-${dayOfMonth}`;
};

export const previewWeeklyGrillPayouts = async (supabase: SupabaseClient) => {
  const { data, error } = await supabase
    .from('grill_leaderboard')
    .select('wallet_address, name, score, dishes')
    .not('wallet_address', 'is', null)
    .order('score', { ascending: false })
    .order('updated_at', { ascending: false })
    .limit(WEEKLY_GRILL_PAYOUTS.length);

  if (error) throw error;

  const rows = data ?? [];
  return rows.map((row, index): WeeklyPayoutPreviewEntry => ({
    rank: index + 1,
    wallet_address: String(row.wallet_address),
    name: String(row.name ?? 'Hook & Loot player'),
    score: Number(row.score ?? 0),
    dishes: Number(row.dishes ?? 0),
    amount_mon: WEEKLY_GRILL_PAYOUTS[index] ?? 0,
  })).filter((entry) => entry.amount_mon > 0 && entry.wallet_address);
};
