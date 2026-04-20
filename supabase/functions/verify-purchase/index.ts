import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import {
  fetchPlayerAuditSnapshot,
  insertPlayerAuditLog,
  sanitizeAuditSnapshot,
} from '../_shared/playerAudit.ts';

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
const NFT_ROD_MINT_COSTS: Record<number, string> = {
  0: '0.05',
  1: '0.1',
  2: '0.2',
  3: '0.5',
  4: '1.0',
};

const readFlag = (value: string | undefined, fallback: boolean) => {
  if (!value) return fallback;

  const normalized = value.trim().toLowerCase();
  if (['1', 'true', 'yes', 'on'].includes(normalized)) return true;
  if (['0', 'false', 'no', 'off'].includes(normalized)) return false;
  return fallback;
};

const PLAYER_AUDIT_LOGS_ENABLED = readFlag(Deno.env.get('PLAYER_AUDIT_LOGS_ENABLED'), true);

interface RpcTransactionReceipt {
  status?: string;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { tx_hash, wallet_address, expected_coins, expected_mon, rod_level } = await req.json();
    const isNftRodMint = Number.isInteger(rod_level);

    if (!tx_hash || !wallet_address || !expected_mon || (!isNftRodMint && !expected_coins)) {
      return new Response(
        JSON.stringify({ success: false, error: 'Missing required fields' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (isNftRodMint && !(rod_level in NFT_ROD_MINT_COSTS)) {
      return new Response(
        JSON.stringify({ success: false, error: 'Invalid rod level' }),
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
      return await processReceipt(retryData.result, wallet_address, expected_coins, expected_mon, tx_hash, rod_level);
    }

    return await processReceipt(receipt, wallet_address, expected_coins, expected_mon, tx_hash, rod_level);
  } catch (err) {
    console.error('verify-purchase error:', err);
    return new Response(
      JSON.stringify({ success: false, error: 'Internal error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

async function processReceipt(
  receipt: RpcTransactionReceipt,
  wallet_address: string,
  expected_coins: number,
  expected_mon: string,
  tx_hash: string,
  rod_level?: number,
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
  const expectedMonAmount = Number.isInteger(rod_level)
    ? NFT_ROD_MINT_COSTS[rod_level!]
    : expected_mon;
  const expectedWei = BigInt(Math.round(parseFloat(expectedMonAmount) * 1e18));
  
  // Allow 1% tolerance for gas adjustments
  const minExpected = expectedWei * 99n / 100n;
  if (valueBigInt < minExpected) {
    return new Response(
      JSON.stringify({ success: false, error: 'Insufficient payment amount' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const supabase = createClient(supabaseUrl, supabaseKey);
  const normalizedWallet = wallet_address.toLowerCase();
  const playerAuditBefore = await fetchPlayerAuditSnapshot(supabase, normalizedWallet);

  if (Number.isInteger(rod_level)) {
    const { data: player } = await supabase
      .from('players')
      .select('nft_rods')
      .eq('wallet_address', normalizedWallet)
      .single();

    if (!player) {
      return new Response(
        JSON.stringify({ success: false, error: 'Player not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const currentNftRods = Array.isArray(player.nft_rods) ? (player.nft_rods as number[]) : [];
    if (currentNftRods.includes(rod_level!)) {
      return new Response(
        JSON.stringify({ success: false, error: 'NFT rod already minted' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const updatedNftRods = [...currentNftRods, rod_level!].sort((a, b) => a - b);
    await supabase
      .from('players')
      .update({ nft_rods: updatedNftRods })
      .eq('wallet_address', normalizedWallet);

    if (PLAYER_AUDIT_LOGS_ENABLED) {
      await insertPlayerAuditLog(supabase, {
        walletAddress: normalizedWallet,
        eventType: 'nft_rod_minted',
        eventSource: 'server',
        beforeState: playerAuditBefore,
        afterState: playerAuditBefore,
        metadata: {
          txHash: tx_hash,
          rodLevel: rod_level,
          previousNftRods: currentNftRods,
          updatedNftRods,
        },
      });
    }

    return new Response(
      JSON.stringify({ success: true, nft_rods: updatedNftRods, rod_level }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  const actualMon = Number(valueBigInt) / 1e18;
  const coinsToCredit = Math.floor(actualMon * COINS_PER_MON);

  // Increment coins instead of overwriting
  const { data: player } = await supabase
    .from('players')
    .select('coins')
    .eq('wallet_address', normalizedWallet)
    .single();

  if (player) {
    const newCoins = (player.coins || 0) + coinsToCredit;
    await supabase
      .from('players')
      .update({ coins: newCoins })
      .eq('wallet_address', normalizedWallet);

    if (PLAYER_AUDIT_LOGS_ENABLED) {
      await insertPlayerAuditLog(supabase, {
        walletAddress: normalizedWallet,
        eventType: 'coin_purchase_verified',
        eventSource: 'server',
        beforeState: playerAuditBefore,
        afterState: sanitizeAuditSnapshot({
          ...playerAuditBefore,
          coins: newCoins,
        }),
        metadata: {
          txHash: tx_hash,
          expectedCoins: expected_coins,
          expectedMon: expected_mon,
          actualMon,
          coinsCredited: coinsToCredit,
        },
      });
    }
  }

  return new Response(
    JSON.stringify({ success: true, coins_credited: coinsToCredit }),
    { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
}
