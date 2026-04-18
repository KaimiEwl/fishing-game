import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { hashMessage, recoverAddress } from "npm:viem@2.21.0";
import { createSessionToken, verifySessionToken } from "../_shared/session.ts";

const ALLOWED_ORIGIN = Deno.env.get('ALLOWED_ORIGIN') || '*';
const corsHeaders = {
  'Access-Control-Allow-Origin': ALLOWED_ORIGIN,
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

const VALID_FISH_IDS = ['carp', 'perch', 'bream', 'pike', 'catfish', 'goldfish', 'mutant'];
const MAX_LEVEL = 200;
const MAX_COINS = 10_000_000;
const MAX_ROD_LEVEL = 4;
const XP_PER_LEVEL = 100;

// Session tokens are verified by checking the player exists in DB
// No in-memory state needed — edge functions are stateless

function validatePlayerData(data: Record<string, unknown>, existing: Record<string, unknown> | null) {
  const coins = Number(data.coins);
  const bait = Number(data.bait);
  const level = Number(data.level);
  const xp = Number(data.xp);
  const xpToNextLevel = Number(data.xpToNextLevel);
  const rodLevel = Number(data.rodLevel);
  const equippedRod = Number(data.equippedRod ?? rodLevel);
  const totalCatches = Number(data.totalCatches);
  const nickname = data.nickname !== undefined ? data.nickname : undefined;
  const inventory = data.inventory;
  const nftRods = Array.isArray(data.nftRods) ? data.nftRods as number[] : [];

  if (!Number.isInteger(coins) || coins < 0 || coins > MAX_COINS) throw new Error('Invalid coins');
  if (!Number.isInteger(bait) || bait < 0 || bait > 10000) throw new Error('Invalid bait');
  if (!Number.isInteger(level) || level < 1 || level > MAX_LEVEL) throw new Error('Invalid level');
  if (!Number.isInteger(xp) || xp < 0) throw new Error('Invalid XP');
  if (!Number.isInteger(rodLevel) || rodLevel < 0 || rodLevel > MAX_ROD_LEVEL) throw new Error('Invalid rod level');
  if (!Number.isInteger(equippedRod) || equippedRod < 0 || equippedRod > rodLevel) throw new Error('Invalid equipped rod');
  if (!Number.isInteger(totalCatches) || totalCatches < 0) throw new Error('Invalid total catches');

  for (const r of nftRods) {
    if (!Number.isInteger(r) || r < 0 || r > MAX_ROD_LEVEL) throw new Error('Invalid nft rod');
  }

  const expectedXpToNext = level * XP_PER_LEVEL;
  if (Math.abs(xpToNextLevel - expectedXpToNext) > 10) {
    throw new Error('XP/level mismatch');
  }

  if (!Array.isArray(inventory)) throw new Error('Invalid inventory');
  for (const item of inventory as Array<{ fishId: string; quantity: number }>) {
    if (!item.fishId || !VALID_FISH_IDS.includes(item.fishId)) throw new Error('Invalid fish ID: ' + item.fishId);
    if (!Number.isInteger(item.quantity) || item.quantity < 0 || item.quantity > 10000) throw new Error('Invalid quantity');
  }

  if (existing) {
    const levelGain = level - Number(existing.level);
    if (levelGain > 10) throw new Error('Suspicious level gain');
    const catchGain = totalCatches - Number(existing.total_catches);
    if (catchGain > 100) throw new Error('Suspicious catch gain');
  }

  return { coins, bait, level, xp, xpToNextLevel, rodLevel, equippedRod, totalCatches, inventory, nftRods, nickname };
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { wallet_address, signature, message, player_data, session_token } = await req.json();

    if (!wallet_address) {
      return new Response(
        JSON.stringify({ error: 'Missing wallet address' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const normalizedAddress = wallet_address.toLowerCase();

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    // Restore session (no signature, no player_data — just fetch existing player)
    if (session_token && !player_data && !signature) {
      if (!(await verifySessionToken(session_token, normalizedAddress))) {
        return new Response(
          JSON.stringify({ error: 'Invalid session' }),
          { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const { data: player } = await supabase
        .from('players')
        .select('*')
        .eq('wallet_address', normalizedAddress)
        .single();

      if (!player) {
        return new Response(
          JSON.stringify({ error: 'Player not found' }),
          { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const refreshedToken = await createSessionToken(normalizedAddress);

      return new Response(
        JSON.stringify({ player, isNew: false, session_token: refreshedToken }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // If saving with session token, verify session
    if (player_data && session_token) {
      if (!(await verifySessionToken(session_token, normalizedAddress))) {
        return new Response(
          JSON.stringify({ error: 'Invalid session' }),
          { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Fetch existing for validation
      const { data: existing } = await supabase
        .from('players')
        .select('*')
        .eq('wallet_address', normalizedAddress)
        .single();

      if (!existing) {
        return new Response(
          JSON.stringify({ error: 'Player not found' }),
          { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Validate player data
      const validated = validatePlayerData(player_data, existing);

      const updatePayload: Record<string, unknown> = {
        coins: validated.coins,
        bait: validated.bait,
        level: validated.level,
        xp: validated.xp,
        xp_to_next: validated.xpToNextLevel,
        rod_level: validated.rodLevel,
        equipped_rod: validated.equippedRod,
        inventory: validated.inventory,
        total_catches: validated.totalCatches,
        nft_rods: validated.nftRods,
      };

      if (validated.nickname !== undefined) {
        updatePayload.nickname = validated.nickname;
      }

      const { data: updated, error } = await supabase
        .from('players')
        .update(updatePayload)
        .eq('wallet_address', normalizedAddress)
        .select()
        .single();

      if (error) throw error;

      const refreshedToken = await createSessionToken(normalizedAddress);

      return new Response(
        JSON.stringify({ player: updated, session_token: refreshedToken }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Initial verification flow - requires proper signature
    if (!signature || !message) {
      return new Response(
        JSON.stringify({ error: 'Missing signature or message' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Cryptographic signature verification using viem
    let recoveredAddress: string;
    try {
      recoveredAddress = await recoverAddress({
        hash: hashMessage(message),
        signature: signature as `0x${string}`,
      });
    } catch (e) {
      console.error('Signature recovery failed:', e);
      return new Response(
        JSON.stringify({ error: 'Invalid signature' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (recoveredAddress.toLowerCase() !== normalizedAddress) {
      return new Response(
        JSON.stringify({ error: 'Signature does not match wallet address' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Session verified — proceed to load/create player

    // Check if player exists
    const { data: existing } = await supabase
      .from('players')
      .select('*')
      .eq('wallet_address', normalizedAddress)
      .single();

    if (existing) {
      const { data: updated, error } = await supabase
        .from('players')
        .update({ last_login: new Date().toISOString() })
        .eq('wallet_address', normalizedAddress)
        .select()
        .single();

      if (error) throw error;
      const sessionToken = await createSessionToken(normalizedAddress);

      return new Response(
        JSON.stringify({ player: updated, isNew: false, session_token: sessionToken }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    } else {
      const { data: newPlayer, error } = await supabase
        .from('players')
        .insert({ wallet_address: normalizedAddress })
        .select()
        .single();

      if (error) throw error;
      const sessionToken = await createSessionToken(normalizedAddress);

      return new Response(
        JSON.stringify({ player: newPlayer, isNew: true, session_token: sessionToken }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
  } catch (error) {
    console.error('Verification error:', error);

    let userMessage = 'An error occurred during verification';
    if (error.message?.includes('duplicate')) {
      userMessage = 'This wallet is already registered';
    } else if (error.message?.includes('Invalid') || error.message?.includes('missing')) {
      userMessage = 'Invalid data provided';
    } else if (error.message?.includes('Suspicious')) {
      userMessage = 'Unusual activity detected. Please try again later.';
    }

    return new Response(
      JSON.stringify({ error: userMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
