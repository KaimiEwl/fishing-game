import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { verifySessionToken } from "../_shared/session.ts";
import { toMonAmount } from "../_shared/monRewards.ts";
import { grantPlayerReward } from "../_shared/rewards.ts";
import { previewWeeklyGrillPayouts, getCurrentWeeklyPayoutKey } from "../_shared/weeklyPayouts.ts";
import { enforceRateLimit } from "../_shared/rateLimit.ts";
import { SOCIAL_TASK_IDS, type SocialTaskId, type SocialTaskStatus } from "../_shared/taskRegistry.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const jsonHeaders = { ...corsHeaders, "Content-Type": "application/json" };

const PLAYER_UPDATE_FIELDS = [
  "coins",
  "bait",
  "daily_free_bait",
  "level",
  "xp",
  "xp_to_next",
  "rod_level",
  "equipped_rod",
  "inventory",
  "total_catches",
  "nft_rods",
  "login_streak",
  "nickname",
] as const;

type InventorySummaryEntry = {
  fish_id: string;
  quantity: number;
};

type AuditLogRow = {
  id: string;
  event_type: string;
  event_source: string;
  before_state: Record<string, unknown>;
  after_state: Record<string, unknown>;
  delta_state: Record<string, unknown>;
  metadata: Record<string, unknown>;
  created_at: string;
};

type WithdrawRequestStatus = "pending" | "approved" | "rejected" | "paid";

type WeeklyPayoutBatchRow = {
  id: string;
  week_key: string;
  payouts: unknown;
  total_amount_mon: string | number | null;
  created_by_wallet: string;
  created_at: string;
  applied_at: string;
};

type SocialTaskVerificationRow = {
  id: string;
  player_id: string;
  wallet_address: string;
  task_id: string;
  status: SocialTaskStatus;
  proof_url: string | null;
  verified_by_wallet: string | null;
  created_at: string;
  updated_at: string;
  player_nickname?: string | null;
};

type WithdrawRequestRow = {
  id: string;
  player_id: string;
  wallet_address: string;
  amount_mon: string | number | null;
  status: WithdrawRequestStatus;
  requested_at: string;
  processed_at: string | null;
  payout_tx_hash: string | null;
  processed_by_wallet: string | null;
  admin_note: string | null;
};

const jsonResponse = (payload: unknown, status = 200) =>
  new Response(JSON.stringify(payload), { status, headers: jsonHeaders });

const badRequest = (message: string) => jsonResponse({ error: message }, 400);

const normalizeText = (value: unknown) => typeof value === "string" ? value.trim() : "";

const toPositiveInt = (value: unknown, fallback: number, max: number) => {
  if (typeof value !== "number" || !Number.isFinite(value)) return fallback;
  return Math.min(Math.max(Math.floor(value), 1), max);
};

const buildInventorySummary = (inventory: unknown): InventorySummaryEntry[] => {
  if (!Array.isArray(inventory)) return [];

  const summary = new Map<string, number>();
  for (const item of inventory) {
    if (!item || typeof item !== "object") continue;
    const fishId = "fishId" in item && typeof item.fishId === "string" ? item.fishId : null;
    const quantity = "quantity" in item && typeof item.quantity === "number" ? item.quantity : 0;
    if (!fishId || quantity <= 0) continue;
    summary.set(fishId, (summary.get(fishId) ?? 0) + quantity);
  }

  return Array.from(summary.entries())
    .map(([fish_id, quantity]) => ({ fish_id, quantity }))
    .sort((left, right) => right.quantity - left.quantity);
};

const buildSuspiciousFlags = (activityRows: AuditLogRow[]) => {
  let coinGain = 0;
  let cubeRewardCount = 0;
  let purchaseVerifyCount = 0;

  for (const row of activityRows) {
    const deltaCoins = row.delta_state?.coins;
    if (typeof deltaCoins === "number" && deltaCoins > 0) {
      coinGain += deltaCoins;
    }

    if (row.event_type === "cube_coin_reward" || row.event_type === "cube_fish_reward") {
      cubeRewardCount += 1;
    }

    if (row.event_type === "coin_purchase_verified") {
      purchaseVerifyCount += 1;
    }
  }

  const flags: string[] = [];
  if (coinGain >= 20000) flags.push("Unusually high coin gain");
  if (cubeRewardCount >= 4) flags.push("Frequent cube rewards");
  if (purchaseVerifyCount >= 3) flags.push("Repeated purchase verifications");
  return flags;
};

const normalizeNullableText = (value: unknown, maxLength: number) => {
  const normalized = normalizeText(value);
  return normalized ? normalized.slice(0, maxLength) : null;
};

const isWithdrawRequestStatus = (value: string): value is WithdrawRequestStatus =>
  ["pending", "approved", "rejected", "paid"].includes(value);

const isSocialTaskStatus = (value: string): value is SocialTaskStatus =>
  ["available", "pending_verification", "verified", "claimed"].includes(value);

const mapWithdrawRequestRow = (
  request: WithdrawRequestRow,
  playerNameById: Map<string, string | null>,
) => ({
  ...request,
  amount_mon: toMonAmount(request.amount_mon),
  player_nickname: playerNameById.get(request.player_id) ?? null,
});

serve(async (req) => {
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
      return badRequest("Missing wallet");
    }

    if (!sessionToken || !(await verifySessionToken(sessionToken, walletAddress))) {
      return jsonResponse({ error: "Invalid session" }, 401);
    }

    const { data: isAdmin, error: adminError } = await supabase.rpc("is_admin", { _wallet: walletAddress });
    if (adminError) throw adminError;
    if (!isAdmin) {
      return jsonResponse({ error: "Unauthorized" }, 403);
    }

    await enforceRateLimit(supabase, {
      actionKey: `admin.${action || "unknown"}`,
      subjectKey: walletAddress,
      windowSeconds: 60,
      maxHits: 180,
    });

    switch (action) {
      case "check_admin":
        return jsonResponse({ is_admin: true });

      case "list_players": {
        const search = normalizeText(body.search);
        const sortBy = normalizeText(body.sort_by) || "created_at";
        const sortDir = normalizeText(body.sort_dir) === "asc";
        const limit = toPositiveInt(body.per_page, 20, 100);
        const page = toPositiveInt(body.page, 1, 10000);
        const offset = (page - 1) * limit;

        let query = supabase.from("players").select("*", { count: "exact" });

        if (search) {
          query = query.or(`wallet_address.ilike.%${search}%,nickname.ilike.%${search}%`);
        }

        const { data, count, error } = await query
          .order(sortBy, { ascending: sortDir })
          .range(offset, offset + limit - 1);

        if (error) throw error;
        return jsonResponse({ players: data ?? [], total: count ?? 0 });
      }

      case "get_player": {
        const playerId = normalizeText(body.player_id);
        if (!playerId) return badRequest("Missing player");

        const { data, error } = await supabase.from("players").select("*").eq("id", playerId).single();
        if (error) throw error;
        return jsonResponse({ player: data });
      }

      case "get_player_details": {
        const playerId = normalizeText(body.player_id);
        if (!playerId) return badRequest("Missing player");

        const { data: player, error: playerError } = await supabase
          .from("players")
          .select("*")
          .eq("id", playerId)
          .single();
        if (playerError) throw playerError;

        const { data: grillEntry } = await supabase
          .from("grill_leaderboard")
          .select("score, dishes, updated_at")
          .eq("wallet_address", player.wallet_address)
          .maybeSingle();

        const { data: activityRows, error: activityError } = await supabase
          .from("player_audit_logs")
          .select("id, event_type, event_source, before_state, after_state, delta_state, metadata, created_at")
          .eq("wallet_address", player.wallet_address)
          .order("created_at", { ascending: false })
          .limit(50);
        if (activityError) throw activityError;

        return jsonResponse({
          player,
          grill_summary: grillEntry
            ? {
              score: grillEntry.score,
              dishes: grillEntry.dishes,
              updated_at: grillEntry.updated_at,
            }
            : null,
          inventory_summary: buildInventorySummary(player.inventory),
          referral_summary: {
            referrer_wallet_address: player.referrer_wallet_address,
            rewarded_referral_count: player.rewarded_referral_count,
            wallet_bait_bonus_claimed: player.wallet_bait_bonus_claimed,
          },
          suspicious_flags: buildSuspiciousFlags((activityRows ?? []) as AuditLogRow[]),
        });
      }

      case "list_player_activity": {
        const playerId = normalizeText(body.player_id);
        if (!playerId) return badRequest("Missing player");

        const limit = toPositiveInt(body.limit, 25, 100);
        const { data: player, error: playerError } = await supabase
          .from("players")
          .select("wallet_address")
          .eq("id", playerId)
          .single();
        if (playerError) throw playerError;

        const { data, error } = await supabase
          .from("player_audit_logs")
          .select("id, event_type, event_source, before_state, after_state, delta_state, metadata, created_at")
          .eq("wallet_address", player.wallet_address)
          .order("created_at", { ascending: false })
          .limit(limit);
        if (error) throw error;

        return jsonResponse({ activity: data ?? [] });
      }

      case "list_player_messages": {
        const playerId = normalizeText(body.player_id);
        if (!playerId) return badRequest("Missing player");

        const limit = toPositiveInt(body.limit, 25, 100);
        const { data, error } = await supabase
          .from("player_messages")
          .select("*")
          .eq("player_id", playerId)
          .order("created_at", { ascending: false })
          .limit(limit);
        if (error) throw error;

        return jsonResponse({ messages: data ?? [] });
      }

      case "list_withdraw_requests": {
        const limit = toPositiveInt(body.limit, 50, 200);
        const status = normalizeText(body.status).toLowerCase();

        let query = supabase
          .from("mon_withdraw_requests")
          .select("id, player_id, wallet_address, amount_mon, status, requested_at, processed_at, payout_tx_hash, processed_by_wallet, admin_note")
          .order("requested_at", { ascending: false })
          .limit(limit);

        if (isWithdrawRequestStatus(status)) {
          query = query.eq("status", status);
        }

        const { data, error } = await query;
        if (error) throw error;

        const requests = (data ?? []) as WithdrawRequestRow[];
        const playerIds = Array.from(new Set(requests.map((request) => request.player_id)));
        const playerNameById = new Map<string, string | null>();

        if (playerIds.length > 0) {
          const { data: players, error: playersError } = await supabase
            .from("players")
            .select("id, nickname")
            .in("id", playerIds);
          if (playersError) throw playersError;

          for (const player of players ?? []) {
            playerNameById.set(player.id, player.nickname ?? null);
          }
        }

        return jsonResponse({
          requests: requests.map((request) => mapWithdrawRequestRow(request, playerNameById)),
        });
      }

      case "get_admin_withdraw_summary": {
        const { data, error } = await supabase
          .from("mon_withdraw_requests")
          .select("amount_mon, status");
        if (error) throw error;

        const rows = (data ?? []) as Array<{ amount_mon: string | number | null; status: WithdrawRequestStatus }>;
        const summary = rows.reduce((acc, row) => {
          const amount = toMonAmount(row.amount_mon);
          if (row.status === "pending") {
            acc.pending_count += 1;
            acc.pending_amount_mon += amount;
          } else if (row.status === "approved") {
            acc.approved_count += 1;
          } else if (row.status === "rejected") {
            acc.rejected_count += 1;
          } else if (row.status === "paid") {
            acc.paid_count += 1;
          }
          return acc;
        }, {
          pending_count: 0,
          approved_count: 0,
          rejected_count: 0,
          paid_count: 0,
          pending_amount_mon: 0,
        });

        return jsonResponse({
          summary: {
            ...summary,
            pending_amount_mon: toMonAmount(summary.pending_amount_mon),
          },
        });
      }

      case "approve_withdraw_request": {
        const requestId = normalizeText(body.request_id);
        const adminNote = normalizeNullableText(body.admin_note, 1000);
        if (!requestId) return badRequest("Missing withdraw request");

        const { data: request, error: requestError } = await supabase
          .from("mon_withdraw_requests")
          .select("id, status")
          .eq("id", requestId)
          .single();
        if (requestError) throw requestError;
        if (request.status !== "pending") {
          return badRequest("Only pending requests can be approved");
        }

        const { data, error } = await supabase
          .from("mon_withdraw_requests")
          .update({
            status: "approved",
            processed_at: new Date().toISOString(),
            processed_by_wallet: walletAddress,
            admin_note: adminNote,
          })
          .eq("id", requestId)
          .select("id, player_id, wallet_address, amount_mon, status, requested_at, processed_at, payout_tx_hash, processed_by_wallet, admin_note")
          .single();
        if (error) throw error;

        return jsonResponse({ request: { ...data, amount_mon: toMonAmount(data.amount_mon) } });
      }

      case "reject_withdraw_request": {
        const requestId = normalizeText(body.request_id);
        const adminNote = normalizeNullableText(body.admin_note, 1000);
        if (!requestId) return badRequest("Missing withdraw request");

        const { data: request, error: requestError } = await supabase
          .from("mon_withdraw_requests")
          .select("id, status")
          .eq("id", requestId)
          .single();
        if (requestError) throw requestError;
        if (!["pending", "approved"].includes(request.status)) {
          return badRequest("Only pending or approved requests can be rejected");
        }

        const { data, error } = await supabase
          .from("mon_withdraw_requests")
          .update({
            status: "rejected",
            processed_at: new Date().toISOString(),
            processed_by_wallet: walletAddress,
            admin_note: adminNote,
          })
          .eq("id", requestId)
          .select("id, player_id, wallet_address, amount_mon, status, requested_at, processed_at, payout_tx_hash, processed_by_wallet, admin_note")
          .single();
        if (error) throw error;

        return jsonResponse({ request: { ...data, amount_mon: toMonAmount(data.amount_mon) } });
      }

      case "mark_withdraw_paid": {
        const requestId = normalizeText(body.request_id);
        const payoutTxHash = normalizeText(body.payout_tx_hash);
        const adminNote = normalizeNullableText(body.admin_note, 1000);
        if (!requestId) return badRequest("Missing withdraw request");
        if (!payoutTxHash) return badRequest("Missing payout tx hash");

        const { data: request, error: requestError } = await supabase
          .from("mon_withdraw_requests")
          .select("id, status")
          .eq("id", requestId)
          .single();
        if (requestError) throw requestError;
        if (request.status !== "approved") {
          return badRequest("Only approved requests can be marked as paid");
        }

        const { data, error } = await supabase
          .from("mon_withdraw_requests")
          .update({
            status: "paid",
            processed_at: new Date().toISOString(),
            processed_by_wallet: walletAddress,
            payout_tx_hash: payoutTxHash,
            admin_note: adminNote,
          })
          .eq("id", requestId)
          .select("id, player_id, wallet_address, amount_mon, status, requested_at, processed_at, payout_tx_hash, processed_by_wallet, admin_note")
          .single();
        if (error) throw error;

        return jsonResponse({ request: { ...data, amount_mon: toMonAmount(data.amount_mon) } });
      }

      case "grant_mon_reward": {
        const playerId = normalizeText(body.player_id);
        const amountMon = toMonAmount(body.amount_mon);
        const sourceRef = normalizeNullableText(body.source_ref, 255);
        const adminNote = normalizeNullableText(body.admin_note, 1000);

        if (!playerId) return badRequest("Missing player");
        if (amountMon <= 0) return badRequest("MON amount must be positive");

        const { data: player, error: playerError } = await supabase
          .from("players")
          .select("wallet_address")
          .eq("id", playerId)
          .single();
        if (playerError) throw playerError;

        await grantPlayerReward(supabase, {
          walletAddress: player.wallet_address,
          reward: { mon: amountMon },
          sourceType: "admin_manual_grant",
          sourceRef,
          eventType: "admin_mon_grant",
          metadata: {
            playerId,
            grantedByWallet: walletAddress,
          },
          createdByWallet: walletAddress,
          adminNote,
        });

        return jsonResponse({ success: true });
      }

      case "preview_weekly_payouts": {
        const weekKey = getCurrentWeeklyPayoutKey();
        const payouts = await previewWeeklyGrillPayouts(supabase);
        const { data: existingBatch, error: batchError } = await supabase
          .from("weekly_grill_payout_batches")
          .select("id, week_key, total_amount_mon, created_at, applied_at")
          .eq("week_key", weekKey)
          .maybeSingle();
        if (batchError) throw batchError;

        return jsonResponse({
          week_key: weekKey,
          already_applied: Boolean(existingBatch),
          preview: payouts,
          existing_batch: existingBatch
            ? {
              ...existingBatch,
              total_amount_mon: toMonAmount(existingBatch.total_amount_mon),
            }
            : null,
        });
      }

      case "apply_weekly_payouts": {
        const weekKey = getCurrentWeeklyPayoutKey();
        const { data: existingBatch, error: existingBatchError } = await supabase
          .from("weekly_grill_payout_batches")
          .select("id")
          .eq("week_key", weekKey)
          .maybeSingle();
        if (existingBatchError) throw existingBatchError;
        if (existingBatch) {
          return badRequest("Weekly payout for this week was already applied");
        }

        const payouts = await previewWeeklyGrillPayouts(supabase);
        if (payouts.length === 0) {
          return badRequest("No eligible leaderboard entries for weekly payout");
        }

        for (const payout of payouts) {
          await grantPlayerReward(supabase, {
            walletAddress: payout.wallet_address,
            reward: { mon: payout.amount_mon },
            sourceType: "weekly_grill_top",
            sourceRef: `${weekKey}:${payout.rank}`,
            eventType: "weekly_grill_top_reward",
            metadata: {
              weekKey,
              rank: payout.rank,
              leaderboardScore: payout.score,
              dishes: payout.dishes,
            },
            createdByWallet: walletAddress,
            adminNote: `Weekly grill payout ${weekKey}`,
          });
        }

        const totalAmountMon = payouts.reduce((sum, payout) => sum + payout.amount_mon, 0);
        const { data: batch, error: batchError } = await supabase
          .from("weekly_grill_payout_batches")
          .insert({
            week_key: weekKey,
            payouts,
            total_amount_mon: totalAmountMon,
            created_by_wallet: walletAddress,
          })
          .select("id, week_key, payouts, total_amount_mon, created_by_wallet, created_at, applied_at")
          .single();
        if (batchError) throw batchError;

        return jsonResponse({
          batch: {
            ...batch,
            total_amount_mon: toMonAmount(batch.total_amount_mon),
          },
        });
      }

      case "list_weekly_payout_batches": {
        const limit = toPositiveInt(body.limit, 20, 100);
        const { data, error } = await supabase
          .from("weekly_grill_payout_batches")
          .select("id, week_key, payouts, total_amount_mon, created_by_wallet, created_at, applied_at")
          .order("applied_at", { ascending: false })
          .limit(limit);
        if (error) throw error;

        return jsonResponse({
          batches: ((data ?? []) as WeeklyPayoutBatchRow[]).map((batch) => ({
            ...batch,
            total_amount_mon: toMonAmount(batch.total_amount_mon),
          })),
        });
      }

      case "list_social_task_verifications": {
        const limit = toPositiveInt(body.limit, 50, 200);
        const status = normalizeText(body.status);
        let query = supabase
          .from("social_task_verifications")
          .select("id, player_id, wallet_address, task_id, status, proof_url, verified_by_wallet, created_at, updated_at")
          .order("updated_at", { ascending: false })
          .limit(limit);

        if (isSocialTaskStatus(status)) {
          query = query.eq("status", status);
        }

        const { data, error } = await query;
        if (error) throw error;

        const verifications = (data ?? []) as SocialTaskVerificationRow[];
        const playerIds = Array.from(new Set(verifications.map((entry) => entry.player_id)));
        const playerNameById = new Map<string, string | null>();

        if (playerIds.length > 0) {
          const { data: players, error: playersError } = await supabase
            .from("players")
            .select("id, nickname")
            .in("id", playerIds);
          if (playersError) throw playersError;

          for (const player of players ?? []) {
            playerNameById.set(player.id, player.nickname ?? null);
          }
        }

        return jsonResponse({
          verifications: verifications.map((verification) => ({
            ...verification,
            player_nickname: playerNameById.get(verification.player_id) ?? null,
          })),
        });
      }

      case "set_social_task_verification": {
        const playerId = normalizeText(body.player_id);
        const taskId = normalizeText(body.task_id);
        const status = normalizeText(body.status);
        const proofUrl = normalizeNullableText(body.proof_url, 2048);

        if (!playerId) return badRequest("Missing player");
        if (!SOCIAL_TASK_IDS.includes(taskId as SocialTaskId)) return badRequest("Unknown social task");
        if (!isSocialTaskStatus(status)) return badRequest("Unknown social task status");

        const { data: player, error: playerError } = await supabase
          .from("players")
          .select("wallet_address")
          .eq("id", playerId)
          .single();
        if (playerError) throw playerError;

        const { data, error } = await supabase
          .from("social_task_verifications")
          .upsert({
            player_id: playerId,
            wallet_address: player.wallet_address,
            task_id: taskId,
            status,
            proof_url: proofUrl,
            verified_by_wallet: status === "verified" || status === "claimed" ? walletAddress : null,
          }, {
            onConflict: "player_id,task_id",
          })
          .select("id, player_id, wallet_address, task_id, status, proof_url, verified_by_wallet, created_at, updated_at")
          .single();
        if (error) throw error;

        return jsonResponse({
          verification: data as SocialTaskVerificationRow,
        });
      }

      case "send_player_message": {
        const playerId = normalizeText(body.player_id);
        const title = normalizeText(body.title);
        const messageBody = normalizeText(body.body);

        if (!playerId) return badRequest("Missing player");
        if (!title) return badRequest("Missing title");
        if (!messageBody) return badRequest("Missing body");
        if (title.length > 120) return badRequest("Title is too long");
        if (messageBody.length > 2000) return badRequest("Body is too long");

        const { data, error } = await supabase
          .from("player_messages")
          .insert({
            player_id: playerId,
            title,
            body: messageBody,
            created_by_wallet: walletAddress,
          })
          .select("*")
          .single();
        if (error) throw error;

        return jsonResponse({ message: data });
      }

      case "update_player": {
        const playerId = normalizeText(body.player_id);
        const updates = body.updates;
        if (!playerId || !updates || typeof updates !== "object") {
          return badRequest("Missing update payload");
        }

        const safeUpdates: Record<string, unknown> = {};
        for (const field of PLAYER_UPDATE_FIELDS) {
          if (field === "nickname") {
            continue;
          }
          if (field in updates) {
            safeUpdates[field] = (updates as Record<string, unknown>)[field];
          }
        }

        const { data, error } = await supabase
          .from("players")
          .update(safeUpdates)
          .eq("id", playerId)
          .select("*")
          .single();
        if (error) throw error;

        return jsonResponse({ player: data });
      }

      case "delete_player": {
        const playerId = normalizeText(body.player_id);
        if (!playerId) return badRequest("Missing player");

        const { error } = await supabase.from("players").delete().eq("id", playerId);
        if (error) throw error;

        return jsonResponse({ success: true });
      }

      case "get_stats": {
        const { data: players, error } = await supabase.from("players").select("*");
        if (error) throw error;

        const total = players.length;
        const totalCoins = players.reduce((sum, player) => sum + player.coins, 0);
        const totalCatches = players.reduce((sum, player) => sum + player.total_catches, 0);
        const avgLevel = total > 0 ? players.reduce((sum, player) => sum + player.level, 0) / total : 0;
        const maxLevel = total > 0 ? Math.max(...players.map((player) => player.level)) : 0;
        const activeThreshold = new Date(Date.now() - 86400000).toISOString();
        const activeToday = players.filter((player) => player.last_login && player.last_login > activeThreshold).length;

        const levelDistribution: Record<string, number> = {};
        const rodDistribution: Record<number, number> = {};
        for (const player of players) {
          const bracket =
            player.level <= 5 ? "1-5"
              : player.level <= 10 ? "6-10"
                : player.level <= 20 ? "11-20"
                  : "21+";
          levelDistribution[bracket] = (levelDistribution[bracket] ?? 0) + 1;
          rodDistribution[player.rod_level] = (rodDistribution[player.rod_level] ?? 0) + 1;
        }

        return jsonResponse({
          stats: {
            totalPlayers: total,
            totalCoins,
            totalCatches,
            avgLevel: Math.round(avgLevel * 10) / 10,
            maxLevel,
            activeToday,
            levelDistribution,
            rodDistribution,
            topByLevel: [...players].sort((a, b) => b.level - a.level).slice(0, 10),
            topByCoins: [...players].sort((a, b) => b.coins - a.coins).slice(0, 10),
            topByCatches: [...players].sort((a, b) => b.total_catches - a.total_catches).slice(0, 10),
          },
        });
      }

      default:
        return badRequest("Unknown action");
    }
  } catch (error) {
    console.error("Admin error:", error);
    return jsonResponse({ error: error instanceof Error ? error.message : "Internal error" }, 500);
  }
});
