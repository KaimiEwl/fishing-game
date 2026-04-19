import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { hashMessage, recoverAddress } from "npm:viem@2.21.0";
import { createSessionToken, verifySessionToken } from "../_shared/session.ts";

const ALLOWED_ORIGIN = Deno.env.get('ALLOWED_ORIGIN') || '*';
const corsHeaders = {
  'Access-Control-Allow-Origin': ALLOWED_ORIGIN,
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { wallet_address, signature, message, player_data, session_token } = await req.json();

    if (!wallet_address) {
      return new Response(
        JSON.stringify({ error: 'Missing wallet address' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    const normalizedAddress = wallet_address.toLowerCase();
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );

    // This endpoint is auth/session-only. Economy state must not be accepted from the client.
    if (player_data) {
      return new Response(
        JSON.stringify({ error: 'Player progress updates are not accepted by this endpoint' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    if (session_token && !signature) {
      if (!(await verifySessionToken(session_token, normalizedAddress))) {
        return new Response(
          JSON.stringify({ error: 'Invalid session' }),
          { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
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
          { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
        );
      }

      const refreshedToken = await createSessionToken(normalizedAddress);

      return new Response(
        JSON.stringify({ player, isNew: false, session_token: refreshedToken }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    if (!signature || !message) {
      return new Response(
        JSON.stringify({ error: 'Missing signature or message' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    let recoveredAddress: string;
    try {
      recoveredAddress = await recoverAddress({
        hash: hashMessage(message),
        signature: signature as `0x${string}`,
      });
    } catch (error) {
      console.error('Signature recovery failed:', error);
      return new Response(
        JSON.stringify({ error: 'Invalid signature' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    if (recoveredAddress.toLowerCase() !== normalizedAddress) {
      return new Response(
        JSON.stringify({ error: 'Signature does not match wallet address' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

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
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    const { data: newPlayer, error } = await supabase
      .from('players')
      .insert({ wallet_address: normalizedAddress })
      .select()
      .single();

    if (error) throw error;
    const sessionToken = await createSessionToken(normalizedAddress);

    return new Response(
      JSON.stringify({ player: newPlayer, isNew: true, session_token: sessionToken }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  } catch (error) {
    console.error('Verification error:', error);

    const message = error instanceof Error ? error.message : '';
    let userMessage = 'An error occurred during verification';

    if (message.includes('duplicate')) {
      userMessage = 'This wallet is already registered';
    } else if (message.includes('Invalid') || message.includes('missing')) {
      userMessage = 'Invalid data provided';
    }

    return new Response(
      JSON.stringify({ error: userMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  }
});
