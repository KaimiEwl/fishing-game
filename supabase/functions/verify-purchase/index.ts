import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const ALLOWED_ORIGIN = Deno.env.get('ALLOWED_ORIGIN') || '*';
const corsHeaders = {
  'Access-Control-Allow-Origin': ALLOWED_ORIGIN,
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

// Monad Mainnet RPC
const MONAD_RPC = 'https://rpc.monad.xyz';
// Address that should receive MON
const RECEIVER_ADDRESS = '0x0266Bd01196B04a7A57372Fc9fB2F34374E6327D';
// Exchange rate: 0.1 MON = 100 coins → 1 MON = 1000 coins
const COINS_PER_MON = 1000;

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { tx_hash, wallet_address, expected_coins, expected_mon } = await req.json();

    if (!tx_hash || !wallet_address || !expected_coins || !expected_mon) {
      return new Response(
        JSON.stringify({ success: false, error: 'Missing required fields' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Fetch transaction receipt from Monad RPC
    const receiptRes = await fetch(MONAD_RPC, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: 1,
        method: 'eth_getTransactionReceipt',
        params: [tx_hash],
      }),
    });

    const receiptData = await receiptRes.json();
    const receipt = receiptData.result;

    if (!receipt) {
      // Transaction not yet mined, try getting the transaction itself
      const txRes = await fetch(MONAD_RPC, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jsonrpc: '2.0',
          id: 1,
          method: 'eth_getTransactionByHash',
          params: [tx_hash],
        }),
      });

      const txData = await txRes.json();
      const tx = txData.result;

      if (!tx) {
        return new Response(
          JSON.stringify({ success: false, error: 'Transaction not found' }),
          { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Transaction exists but not mined yet — wait a bit and retry
      await new Promise(r => setTimeout(r, 3000));

      const retryRes = await fetch(MONAD_RPC, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jsonrpc: '2.0',
          id: 1,
          method: 'eth_getTransactionReceipt',
          params: [tx_hash],
        }),
      });

      const retryData = await retryRes.json();
      if (!retryData.result) {
        return new Response(
          JSON.stringify({ success: false, error: 'Transaction pending, try again later' }),
          { status: 202, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Use the retried receipt
      return await processReceipt(retryData.result, wallet_address, expected_coins, expected_mon, tx_hash);
    }

    return await processReceipt(receipt, wallet_address, expected_coins, expected_mon, tx_hash);
  } catch (err) {
    console.error('verify-purchase error:', err);
    return new Response(
      JSON.stringify({ success: false, error: 'Internal error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

async function processReceipt(
  receipt: any,
  wallet_address: string,
  expected_coins: number,
  expected_mon: string,
  tx_hash: string
) {
  // Check transaction was successful
  if (receipt.status !== '0x1') {
    return new Response(
      JSON.stringify({ success: false, error: 'Transaction failed on-chain' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  // Get the original transaction to verify value and recipient
  const txRes = await fetch(MONAD_RPC, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      jsonrpc: '2.0',
      id: 1,
      method: 'eth_getTransactionByHash',
      params: [tx_hash],
    }),
  });

  const txData = await txRes.json();
  const tx = txData.result;

  if (!tx) {
    return new Response(
      JSON.stringify({ success: false, error: 'Cannot fetch transaction details' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  // Verify sender matches wallet
  if (tx.from.toLowerCase() !== wallet_address.toLowerCase()) {
    return new Response(
      JSON.stringify({ success: false, error: 'Transaction sender mismatch' }),
      { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  // Verify recipient
  if (tx.to?.toLowerCase() !== RECEIVER_ADDRESS.toLowerCase()) {
    return new Response(
      JSON.stringify({ success: false, error: 'Wrong recipient address' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  // Verify value (convert hex wei to ether and compare)
  const valueBigInt = BigInt(tx.value);
  const expectedWei = BigInt(Math.round(parseFloat(expected_mon) * 1e18));
  
  // Allow 1% tolerance for gas adjustments
  const minExpected = expectedWei * 99n / 100n;
  if (valueBigInt < minExpected) {
    return new Response(
      JSON.stringify({ success: false, error: 'Insufficient payment amount' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  // Credit coins to player
  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const supabase = createClient(supabaseUrl, supabaseKey);

  // Calculate actual coins based on value sent
  const actualMon = Number(valueBigInt) / 1e18;
  const coinsToCredit = Math.floor(actualMon * COINS_PER_MON);

  // Increment coins instead of overwriting
  const { data: player } = await supabase
    .from('players')
    .select('coins')
    .eq('wallet_address', wallet_address.toLowerCase())
    .single();

  if (player) {
    const newCoins = (player.coins || 0) + coinsToCredit;
    await supabase
      .from('players')
      .update({ coins: newCoins })
      .eq('wallet_address', wallet_address.toLowerCase());
  }

  return new Response(
    JSON.stringify({ success: true, coins_credited: coinsToCredit }),
    { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
}
