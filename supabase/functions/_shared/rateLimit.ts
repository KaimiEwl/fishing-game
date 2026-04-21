import type { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2';

interface ConsumeRateLimitRow {
  allowed: boolean;
  hit_count: number;
  window_started_at: string;
}

export const enforceRateLimit = async (
  supabase: SupabaseClient,
  {
    actionKey,
    subjectKey,
    windowSeconds,
    maxHits,
  }: {
    actionKey: string;
    subjectKey: string;
    windowSeconds: number;
    maxHits: number;
  },
) => {
  const { data, error } = await supabase.rpc('consume_rate_limit', {
    _action_key: actionKey,
    _subject_key: subjectKey,
    _window_seconds: windowSeconds,
    _max_hits: maxHits,
  });

  if (error) throw error;

  const row = Array.isArray(data) ? (data[0] as ConsumeRateLimitRow | undefined) : undefined;
  if (!row?.allowed) {
    throw new Error('Too many requests. Please wait a moment and try again.');
  }

  return row;
};
