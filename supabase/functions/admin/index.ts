import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    const { action, wallet_address, ...params } = await req.json();

    if (!wallet_address) {
      return new Response(JSON.stringify({ error: 'Missing wallet' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Check admin role
    const { data: isAdmin } = await supabase.rpc('is_admin', { _wallet: wallet_address });
    if (!isAdmin) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const headers = { ...corsHeaders, 'Content-Type': 'application/json' };

    switch (action) {
      case 'check_admin': {
        return new Response(JSON.stringify({ is_admin: true }), { headers });
      }

      case 'list_players': {
        const { search, sort_by, sort_dir, page, per_page } = params;
        const limit = Math.min(per_page || 50, 100);
        const offset = ((page || 1) - 1) * limit;

        let query = supabase.from('players').select('*', { count: 'exact' });

        if (search) {
          query = query.ilike('wallet_address', `%${search}%`);
        }

        const sortColumn = sort_by || 'created_at';
        const ascending = sort_dir === 'asc';
        query = query.order(sortColumn, { ascending }).range(offset, offset + limit - 1);

        const { data, count, error } = await query;
        if (error) throw error;

        return new Response(JSON.stringify({ players: data, total: count }), { headers });
      }

      case 'get_player': {
        const { player_id } = params;
        const { data, error } = await supabase.from('players').select('*').eq('id', player_id).single();
        if (error) throw error;
        return new Response(JSON.stringify({ player: data }), { headers });
      }

      case 'update_player': {
        const { player_id, updates } = params;
        // Whitelist allowed fields
        const allowed = ['coins', 'bait', 'level', 'xp', 'xp_to_next', 'rod_level', 'equipped_rod', 'inventory', 'total_catches', 'nft_rods', 'login_streak', 'nickname'];
        const safeUpdates: Record<string, unknown> = {};
        for (const key of allowed) {
          if (updates[key] !== undefined) safeUpdates[key] = updates[key];
        }

        const { data, error } = await supabase.from('players').update(safeUpdates).eq('id', player_id).select().single();
        if (error) throw error;
        return new Response(JSON.stringify({ player: data }), { headers });
      }

      case 'delete_player': {
        const { player_id } = params;
        const { error } = await supabase.from('players').delete().eq('id', player_id);
        if (error) throw error;
        return new Response(JSON.stringify({ success: true }), { headers });
      }

      case 'get_stats': {
        const { data: players, error } = await supabase.from('players').select('*');
        if (error) throw error;

        const total = players.length;
        const totalCoins = players.reduce((s, p) => s + p.coins, 0);
        const totalCatches = players.reduce((s, p) => s + p.total_catches, 0);
        const avgLevel = total > 0 ? players.reduce((s, p) => s + p.level, 0) / total : 0;
        const maxLevel = total > 0 ? Math.max(...players.map(p => p.level)) : 0;

        // Level distribution
        const levelDist: Record<string, number> = {};
        players.forEach(p => {
          const bracket = p.level <= 5 ? '1-5' : p.level <= 10 ? '6-10' : p.level <= 20 ? '11-20' : '21+';
          levelDist[bracket] = (levelDist[bracket] || 0) + 1;
        });

        // Rod distribution
        const rodDist: Record<number, number> = {};
        players.forEach(p => {
          rodDist[p.rod_level] = (rodDist[p.rod_level] || 0) + 1;
        });

        // Top players
        const topByLevel = [...players].sort((a, b) => b.level - a.level).slice(0, 10);
        const topByCoins = [...players].sort((a, b) => b.coins - a.coins).slice(0, 10);
        const topByCatches = [...players].sort((a, b) => b.total_catches - a.total_catches).slice(0, 10);

        // Recent activity (last 24h)
        const dayAgo = new Date(Date.now() - 86400000).toISOString();
        const activeToday = players.filter(p => p.last_login && p.last_login > dayAgo).length;

        return new Response(JSON.stringify({
          stats: {
            totalPlayers: total,
            totalCoins,
            totalCatches,
            avgLevel: Math.round(avgLevel * 10) / 10,
            maxLevel,
            activeToday,
            levelDistribution: levelDist,
            rodDistribution: rodDist,
            topByLevel,
            topByCoins,
            topByCatches,
          }
        }), { headers });
      }

      default:
        return new Response(JSON.stringify({ error: 'Unknown action' }), {
          status: 400, headers
        });
    }
  } catch (error) {
    console.error('Admin error:', error);
    return new Response(JSON.stringify({ error: error.message || 'Internal error' }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});
