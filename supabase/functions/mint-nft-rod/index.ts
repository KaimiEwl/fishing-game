import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { getCorsHeaders } from '../_shared/cors.ts';

const MONAD_RPC = 'https://rpc.monad.xyz';
const RECEIVER_ADDRESS = '0x0266Bd01196B04a7A57372Fc9fB2F34374E6327D';

serve(async (req) => {
  const corsHeaders = getCorsHeaders(req);

  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { tx_hash, wallet_address, rod_level, expected_mon } = await req.json();

    if (!tx_hash || !wallet_address || rod_level === undefined || !expected_mon) {
      return new Response(
        JSON.stringify({ success: false, error: 'Missing required fields' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Fetch transaction receipt
    let receipt = null;
    const receiptRes = await fetch(MONAD_RPC, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'eth_getTransactionReceipt', params: [tx_hash] }),
    });
    const receiptData = await receiptRes.json();
    receipt = receiptData.result;

    if (!receipt) {
      await new Promise(r => setTimeout(r, 3000));
      const retryRes = await fetch(MONAD_RPC, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'eth_getTransactionReceipt', params: [tx_hash] }),
      });
      const retryData = await retryRes.json();
      receipt = retryData.result;
    }

    if (!receipt) {
      return new Response(
        JSON.stringify({ success: false, error: 'Transaction pending, try again later' }),
        { status: 202, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (receipt.status !== '0x1') {
      return new Response(
        JSON.stringify({ success: false, error: 'Transaction failed on-chain' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get original tx
    const txRes = await fetch(MONAD_RPC, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'eth_getTransactionByHash', params: [tx_hash] }),
    });
    const txData = await txRes.json();
    const tx = txData.result;

    if (!tx) {
      return new Response(
        JSON.stringify({ success: false, error: 'Cannot fetch transaction details' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (tx.from.toLowerCase() !== wallet_address.toLowerCase()) {
      return new Response(
        JSON.stringify({ success: false, error: 'Transaction sender mismatch' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (tx.to?.toLowerCase() !== RECEIVER_ADDRESS.toLowerCase()) {
      return new Response(
        JSON.stringify({ success: false, error: 'Wrong recipient address' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const valueBigInt = BigInt(tx.value);
    const expectedWei = BigInt(Math.round(parseFloat(expected_mon) * 1e18));
    const minExpected = expectedWei * 99n / 100n;

    if (valueBigInt < minExpected) {
      return new Response(
        JSON.stringify({ success: false, error: 'Insufficient payment amount' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Update player's nft_rods in DB
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { data: player } = await supabase
      .from('players')
      .select('nft_rods')
      .eq('wallet_address', wallet_address.toLowerCase())
      .single();

    if (!player) {
      return new Response(
        JSON.stringify({ success: false, error: 'Player not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const currentNftRods = (player.nft_rods || []) as number[];
    if (currentNftRods.includes(rod_level)) {
      return new Response(
        JSON.stringify({ success: false, error: 'NFT rod already minted' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const updatedNftRods = [...currentNftRods, rod_level];
    await supabase
      .from('players')
      .update({ nft_rods: updatedNftRods })
      .eq('wallet_address', wallet_address.toLowerCase());

    return new Response(
      JSON.stringify({ success: true, nft_rods: updatedNftRods }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (err) {
    console.error('mint-nft-rod error:', err);
    return new Response(
      JSON.stringify({ success: false, error: 'Internal error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
