import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { getCorsHeaders } from "../_shared/cors.ts";
import { verifySessionToken } from "../_shared/session.ts";
import {
  computeMonBalanceSummary,
  MIN_WITHDRAW_MON,
} from "../_shared/monRewards.ts";
import { enforceRateLimit } from "../_shared/rateLimit.ts";

const normalizeText = (value: unknown) => typeof value === "string" ? value.trim() : "";

const toPositiveInt = (value: unknown, fallback: number, max: number) => {
  if (typeof value !== "number" || !Number.isFinite(value)) return fallback;
  return Math.min(Math.max(Math.floor(value), 1), max);
};

serve(async (req) => {
  const corsHeaders = getCorsHeaders(req);
  const jsonHeaders = { ...corsHeaders, "Content-Type": "application/json" };
  const jsonResponse = (payload: unknown, status = 200) =>
    new Response(JSON.stringify(payload), { status, headers: jsonHeaders });

  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const body = await req.json();
    const action = normalizeText(body.action);
    const walletAddress = normalizeText(body.wallet_address).toLowerCase();
    const sessionToken = normalizeText(body.session_token);

    if (!walletAddress) {
      return jsonResponse({ error: "Missing wallet" }, 400);
    }

    if (!sessionToken || !(await verifySessionToken(sessionToken, walletAddress))) {
      return jsonResponse({ error: "Invalid session" }, 401);
    }

    await enforceRateLimit(supabase, {
      actionKey: `player_mon.${action || "unknown"}`,
      subjectKey: walletAddress,
      windowSeconds: 60,
      maxHits: 90,
    });

    const { data: player, error: playerError } = await supabase
      .from("players")
      .select("id, wallet_address")
      .eq("wallet_address", walletAddress)
      .single();
    if (playerError) throw playerError;

    const loadRewards = async () => {
      const { data, error } = await supabase
        .from("player_mon_rewards")
        .select("amount_mon, hold_until")
        .eq("player_id", player.id);
      if (error) throw error;
      return data ?? [];
    };

    const loadWithdrawRows = async () => {
      const { data, error } = await supabase
        .from("mon_withdraw_requests")
        .select("id, amount_mon, status, requested_at, processed_at, payout_tx_hash, admin_note")
        .eq("player_id", player.id)
        .order("requested_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    };

    switch (action) {
      case "get_mon_summary": {
        const [rewardRows, withdrawRows] = await Promise.all([
          loadRewards(),
          loadWithdrawRows(),
        ]);

        return jsonResponse({
          summary: computeMonBalanceSummary(rewardRows, withdrawRows),
        });
      }

      case "list_my_withdraw_requests": {
        const limit = toPositiveInt(body.limit, 10, 50);
        const { data, error } = await supabase
          .from("mon_withdraw_requests")
          .select("id, amount_mon, status, requested_at, processed_at, payout_tx_hash, admin_note")
          .eq("player_id", player.id)
          .order("requested_at", { ascending: false })
          .limit(limit);
        if (error) throw error;

        return jsonResponse({ requests: data ?? [] });
      }

      case "create_withdraw_request": {
        const [rewardRows, withdrawRows] = await Promise.all([
          loadRewards(),
          loadWithdrawRows(),
        ]);
        const summary = computeMonBalanceSummary(rewardRows, withdrawRows);

        if (summary.pendingRequestMon > 0) {
          return jsonResponse({ error: "You already have an active withdraw request." }, 400);
        }

        if (summary.withdrawableMon < MIN_WITHDRAW_MON) {
          return jsonResponse({ error: `Minimum withdraw is ${MIN_WITHDRAW_MON} MON.` }, 400);
        }

        const { data, error } = await supabase
          .from("mon_withdraw_requests")
          .insert({
            player_id: player.id,
            wallet_address: player.wallet_address,
            amount_mon: summary.withdrawableMon,
            status: "pending",
          })
          .select("id, amount_mon, status, requested_at, processed_at, payout_tx_hash, admin_note")
          .single();

        if (error) {
          const details = typeof error === "object" && error ? JSON.stringify(error) : "";
          if (details.includes("idx_mon_withdraw_requests_active_per_player")) {
            return jsonResponse({ error: "You already have an active withdraw request." }, 400);
          }
          throw error;
        }

        return jsonResponse({
          request: data,
          summary: computeMonBalanceSummary(rewardRows, [...withdrawRows, data]),
        });
      }

      default:
        return jsonResponse({ error: "Unknown action" }, 400);
    }
  } catch (error) {
    console.error("Player MON error:", error);
    return jsonResponse({ error: error instanceof Error ? error.message : "Internal error" }, 500);
  }
});
