import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { verifySessionToken } from "../_shared/session.ts";
import {
  buildServerCubeRoll,
  type CubePrize,
} from "../_shared/cubeConfig.ts";
import { enforceRateLimit } from "../_shared/rateLimit.ts";
import {
  DAILY_TASKS,
  SPECIAL_TASKS,
  getTaskDefinition,
  type DailyTaskId,
  type SpecialTaskId,
} from "../_shared/taskRegistry.ts";
import {
  createDefaultGameProgress,
  sanitizeGameProgress,
} from "../_shared/gameProgress.ts";
import { getGrillRecipe } from "../_shared/grillConfig.ts";
import { grantPlayerReward } from "../_shared/rewards.ts";
import {
  fetchPlayerAuditSnapshot,
  insertPlayerAuditLog,
  sanitizeAuditSnapshot,
} from "../_shared/playerAudit.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const jsonHeaders = { ...corsHeaders, "Content-Type": "application/json" };

const DAILY_TASK_CLAIMS_REQUIRED = 3;
const DAILY_CUBE_ROLL_REWARD = 3;

interface InventoryEntry {
  fishId: string;
  caughtAt: string;
  quantity: number;
}

interface CookedDishEntry {
  recipeId: string;
  createdAt: string;
  quantity: number;
}

interface PlayerRow {
  id: string;
  wallet_address: string;
  coins: number;
  bait: number;
  daily_free_bait: number;
  daily_free_bait_reset_at: string | null;
  bonus_bait_granted_total: number;
  level: number;
  xp: number;
  xp_to_next: number;
  rod_level: number;
  equipped_rod: number;
  inventory: unknown;
  cooked_dishes: unknown;
  game_progress: unknown;
  total_catches: number;
  login_streak: number;
  nft_rods: unknown;
  nickname: string | null;
  avatar_url: string | null;
  referrer_wallet_address: string | null;
  rewarded_referral_count: number;
  updated_at: string;
}

const FULL_PLAYER_SELECT = "id, wallet_address, coins, bait, daily_free_bait, daily_free_bait_reset_at, bonus_bait_granted_total, level, xp, xp_to_next, rod_level, equipped_rod, inventory, cooked_dishes, game_progress, total_catches, login_streak, nft_rods, nickname, avatar_url, referrer_wallet_address, rewarded_referral_count, updated_at";

const jsonResponse = (payload: unknown, status = 200) =>
  new Response(JSON.stringify(payload), { status, headers: jsonHeaders });

const badRequest = (message: string) => jsonResponse({ error: message }, 400);

const normalizeText = (value: unknown) => typeof value === "string" ? value.trim() : "";

const normalizeWalletAddress = (value: unknown) => {
  const text = normalizeText(value);
  if (!/^0x[a-fA-F0-9]{40}$/.test(text)) return null;
  return text.toLowerCase();
};

const clampInt = (value: unknown, fallback: number, min = 0, max = Number.MAX_SAFE_INTEGER) => {
  const parsed = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.max(min, Math.min(max, Math.floor(parsed)));
};

const normalizeIso = (value: unknown, fallback: string) => {
  if (typeof value !== "string" || value.trim() === "") return fallback;
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return fallback;
  return parsed.toISOString();
};

const sanitizeInventory = (value: unknown): InventoryEntry[] => {
  if (!Array.isArray(value)) return [];

  return value.flatMap((item) => {
    if (!item || typeof item !== "object") return [];
    const fishId = typeof (item as Record<string, unknown>).fishId === "string"
      ? (item as Record<string, unknown>).fishId.trim()
      : "";
    if (!fishId) return [];

    return [{
      fishId,
      caughtAt: normalizeIso((item as Record<string, unknown>).caughtAt, new Date().toISOString()),
      quantity: clampInt((item as Record<string, unknown>).quantity, 0, 0, 99999),
    }];
  }).filter((item) => item.quantity > 0);
};

const sanitizeCookedDishes = (value: unknown): CookedDishEntry[] => {
  if (!Array.isArray(value)) return [];

  return value.flatMap((item) => {
    if (!item || typeof item !== "object") return [];
    const recipeId = typeof (item as Record<string, unknown>).recipeId === "string"
      ? (item as Record<string, unknown>).recipeId.trim()
      : "";
    if (!recipeId) return [];

    return [{
      recipeId,
      createdAt: normalizeIso((item as Record<string, unknown>).createdAt, new Date().toISOString()),
      quantity: clampInt((item as Record<string, unknown>).quantity, 0, 0, 99999),
    }];
  }).filter((item) => item.quantity > 0);
};

const addInventoryFish = (
  inventory: InventoryEntry[],
  fishId: string,
  quantity: number,
) => {
  const existing = inventory.find((item) => item.fishId === fishId);
  if (existing) {
    return inventory.map((item) => (
      item.fishId === fishId
        ? { ...item, quantity: item.quantity + quantity, caughtAt: new Date().toISOString() }
        : item
    ));
  }

  return [...inventory, {
    fishId,
    quantity,
    caughtAt: new Date().toISOString(),
  }];
};

const consumeInventoryFish = (
  inventory: InventoryEntry[],
  ingredients: Record<string, number>,
) => {
  for (const [fishId, amount] of Object.entries(ingredients)) {
    const owned = inventory.find((item) => item.fishId === fishId)?.quantity ?? 0;
    if (owned < amount) {
      return null;
    }
  }

  return inventory
    .map((item) => ({
      ...item,
      quantity: item.quantity - (ingredients[item.fishId] ?? 0),
    }))
    .filter((item) => item.quantity > 0);
};

const addCookedDish = (
  cookedDishes: CookedDishEntry[],
  recipeId: string,
  quantity: number,
) => {
  const existing = cookedDishes.find((item) => item.recipeId === recipeId);
  if (existing) {
    return cookedDishes.map((item) => (
      item.recipeId === recipeId
        ? { ...item, quantity: item.quantity + quantity, createdAt: new Date().toISOString() }
        : item
    ));
  }

  return [...cookedDishes, {
    recipeId,
    quantity,
    createdAt: new Date().toISOString(),
  }];
};

const consumeCookedDish = (
  cookedDishes: CookedDishEntry[],
  recipeId: string,
) => {
  const owned = cookedDishes.find((item) => item.recipeId === recipeId);
  if (!owned || owned.quantity <= 0) return null;

  return cookedDishes
    .map((item) => (
      item.recipeId === recipeId
        ? { ...item, quantity: item.quantity - 1 }
        : item
    ))
    .filter((item) => item.quantity > 0);
};

const getTodayKey = () => {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const normalizeGameProgressForToday = (value: unknown) => {
  const progress = sanitizeGameProgress(value);
  if (progress.date === getTodayKey()) {
    return progress;
  }

  return {
    ...createDefaultGameProgress(),
    specialTasks: progress.specialTasks,
    grillScore: progress.grillScore,
    paidWheelRolls: progress.paidWheelRolls,
  };
};

const getClaimedDailyCount = (tasks: ReturnType<typeof normalizeGameProgressForToday>["tasks"]) => (
  DAILY_TASKS.filter((task) => tasks[task.id as DailyTaskId]?.claimed).length
);

const sanitizeLeaderboardName = (value: string | null | undefined) => {
  const normalized = (value ?? "").trim().replace(/\s+/g, " ").slice(0, 24);
  return normalized || "Hook & Loot player";
};

const loadPlayer = async (supabase: ReturnType<typeof createClient>, walletAddress: string) => {
  const { data, error } = await supabase
    .from("players")
    .select(FULL_PLAYER_SELECT)
    .eq("wallet_address", walletAddress)
    .single();

  if (error) throw error;
  return data as PlayerRow;
};

const loadPendingCubeRoll = async (
  supabase: ReturnType<typeof createClient>,
  playerId: string,
) => {
  const { data, error } = await supabase
    .from("player_cube_rolls")
    .select("id, cube_faces, target_face_index, target_tile_index, prize, status")
    .eq("player_id", playerId)
    .eq("status", "pending")
    .maybeSingle();
  if (error) throw error;
  return data;
};

const updatePlayer = async (
  supabase: ReturnType<typeof createClient>,
  playerId: string,
  updates: Record<string, unknown>,
) => {
  const { data, error } = await supabase
    .from("players")
    .update(updates)
    .eq("id", playerId)
    .select(FULL_PLAYER_SELECT)
    .single();
  if (error) throw error;
  return data as PlayerRow;
};

const upsertGrillLeaderboard = async (
  supabase: ReturnType<typeof createClient>,
  walletAddress: string,
  fallbackName: string,
  score: number,
  dishesDelta: number,
) => {
  const leaderboardId = `wallet:${walletAddress}`;
  const { data: existing, error: existingError } = await supabase
    .from("grill_leaderboard")
    .select("id, name, score, dishes")
    .eq("id", leaderboardId)
    .maybeSingle();
  if (existingError) throw existingError;

  const payload = {
    id: leaderboardId,
    name: sanitizeLeaderboardName(existing?.name ?? fallbackName),
    score: Math.max(existing?.score ?? 0, score),
    dishes: Math.max(0, (existing?.dishes ?? 0) + dishesDelta),
    wallet_address: walletAddress,
  };

  const { data, error } = await supabase
    .from("grill_leaderboard")
    .upsert(payload, { onConflict: "id" })
    .select("id, name, score, dishes, wallet_address, updated_at")
    .single();
  if (error) throw error;

  return data;
};

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
    const walletAddress = normalizeWalletAddress(body.wallet_address);
    const sessionToken = normalizeText(body.session_token);

    if (!walletAddress) return badRequest("Missing wallet");
    if (!sessionToken || !(await verifySessionToken(sessionToken, walletAddress))) {
      return jsonResponse({ error: "Invalid session" }, 401);
    }

    switch (action) {
      case "roll_cube": {
        await enforceRateLimit(supabase, {
          actionKey: "player_actions.roll_cube",
          subjectKey: walletAddress,
          windowSeconds: 60,
          maxHits: 12,
        });

        const player = await loadPlayer(supabase, walletAddress);
        const existingPendingRoll = await loadPendingCubeRoll(supabase, player.id);
        if (existingPendingRoll) {
          return jsonResponse({
            roll: {
              id: existingPendingRoll.id,
              cube_faces: existingPendingRoll.cube_faces,
              target_face_index: existingPendingRoll.target_face_index,
              target_tile_index: existingPendingRoll.target_tile_index,
              prize: existingPendingRoll.prize,
            },
            player,
          });
        }

        const progress = normalizeGameProgressForToday(player.game_progress);
        if (progress.dailyWheelRolls <= 0 && progress.paidWheelRolls <= 0) {
          return badRequest("No cube rolls available");
        }

        const cubeRoll = buildServerCubeRoll();
        const nextProgress = {
          ...progress,
          wheelSpun: progress.wheelSpun || progress.dailyWheelRolls > 0,
          wheelPrize: cubeRoll.prize,
          dailyWheelRolls: progress.dailyWheelRolls > 0 ? progress.dailyWheelRolls - 1 : progress.dailyWheelRolls,
          paidWheelRolls: progress.dailyWheelRolls > 0 ? progress.paidWheelRolls : Math.max(0, progress.paidWheelRolls - 1),
        };

        const updatedPlayer = await updatePlayer(supabase, player.id, {
          game_progress: nextProgress,
        });

        const { data: insertedRoll, error: insertError } = await supabase
          .from("player_cube_rolls")
          .insert({
            player_id: player.id,
            wallet_address: walletAddress,
            cube_faces: cubeRoll.cubeFaces,
            target_face_index: cubeRoll.targetFaceIndex,
            target_tile_index: cubeRoll.targetTileIndex,
            prize: cubeRoll.prize,
          })
          .select("id, cube_faces, target_face_index, target_tile_index, prize")
          .single();
        if (insertError) throw insertError;

        return jsonResponse({
          roll: insertedRoll,
          player: updatedPlayer,
        });
      }

      case "apply_cube_reward": {
        await enforceRateLimit(supabase, {
          actionKey: "player_actions.apply_cube_reward",
          subjectKey: walletAddress,
          windowSeconds: 60,
          maxHits: 18,
        });

        const rollId = normalizeText(body.roll_id);
        if (!rollId) return badRequest("Missing cube roll");

        const { data: roll, error: rollError } = await supabase
          .from("player_cube_rolls")
          .select("id, player_id, prize, status")
          .eq("id", rollId)
          .eq("wallet_address", walletAddress)
          .single();
        if (rollError) throw rollError;
        if (roll.status !== "pending") {
          return badRequest("Cube roll is not pending");
        }

        const prize = roll.prize as CubePrize;
        let updatedPlayer = await loadPlayer(supabase, walletAddress);

        if (prize.type === "coins") {
          await grantPlayerReward(supabase, {
            walletAddress,
            reward: { coins: prize.coins ?? 0 },
            sourceType: "cube_reward",
            sourceRef: roll.id,
            eventType: "cube_coin_reward",
            metadata: {
              prizeId: prize.id,
              coins: prize.coins ?? 0,
            },
          });
          updatedPlayer = await loadPlayer(supabase, walletAddress);
        } else if (prize.type === "mon") {
          await grantPlayerReward(supabase, {
            walletAddress,
            reward: { mon: prize.mon ?? 0 },
            sourceType: "cube_mon_reward",
            sourceRef: roll.id,
            eventType: "cube_mon_reward",
            metadata: {
              prizeId: prize.id,
              mon: prize.mon ?? 0,
            },
          });
          updatedPlayer = await loadPlayer(supabase, walletAddress);
        } else if (prize.type === "fish" && prize.fishId) {
          const beforeState = await fetchPlayerAuditSnapshot(supabase, walletAddress);
          const inventory = sanitizeInventory(updatedPlayer.inventory);
          updatedPlayer = await updatePlayer(supabase, updatedPlayer.id, {
            inventory: addInventoryFish(inventory, prize.fishId, prize.quantity ?? 1),
          });
          await insertPlayerAuditLog(supabase, {
            walletAddress,
            eventType: "cube_fish_reward",
            eventSource: "server",
            beforeState,
            afterState: sanitizeAuditSnapshot(updatedPlayer),
            metadata: {
              prizeId: prize.id,
              fishId: prize.fishId,
              quantity: prize.quantity ?? 1,
            },
          });
        } else {
          return badRequest("Unsupported cube prize");
        }

        const { error: applyError } = await supabase
          .from("player_cube_rolls")
          .update({
            status: "applied",
            applied_at: new Date().toISOString(),
          })
          .eq("id", roll.id);
        if (applyError) throw applyError;

        return jsonResponse({
          prize,
          player: updatedPlayer,
        });
      }

      case "claim_task_reward": {
        await enforceRateLimit(supabase, {
          actionKey: "player_actions.claim_task_reward",
          subjectKey: walletAddress,
          windowSeconds: 60,
          maxHits: 20,
        });

        const taskId = normalizeText(body.task_id);
        const task = getTaskDefinition(taskId);
        if (!task || !(DAILY_TASKS.some((item) => item.id === taskId) || SPECIAL_TASKS.some((item) => item.id === taskId))) {
          return badRequest("Unknown task");
        }

        const player = await loadPlayer(supabase, walletAddress);
        const progress = normalizeGameProgressForToday(player.game_progress);
        const beforeState = await fetchPlayerAuditSnapshot(supabase, walletAddress);

        if (DAILY_TASKS.some((item) => item.id === taskId)) {
          const currentTask = progress.tasks[taskId as DailyTaskId];
          if (!currentTask || currentTask.claimed || currentTask.progress < task.target) {
            return badRequest("Task is not ready to claim");
          }

          const nextTasks = {
            ...progress.tasks,
            [taskId]: {
              ...currentTask,
              claimed: true,
            },
          };
          const nextClaimedCount = getClaimedDailyCount(nextTasks);
          const shouldGrantRolls = !progress.dailyRollRewardGranted && nextClaimedCount >= DAILY_TASK_CLAIMS_REQUIRED;
          const nextProgress = {
            ...progress,
            tasks: nextTasks,
            dailyWheelRolls: shouldGrantRolls ? progress.dailyWheelRolls + DAILY_CUBE_ROLL_REWARD : progress.dailyWheelRolls,
            dailyRollRewardGranted: progress.dailyRollRewardGranted || shouldGrantRolls,
          };

          const updatedPlayer = await updatePlayer(supabase, player.id, {
            game_progress: nextProgress,
            coins: player.coins + (task.rewardCoins ?? 0),
            bait: player.bait + (task.rewardBait ?? 0),
            bonus_bait_granted_total: player.bonus_bait_granted_total + (task.rewardBait ?? 0),
          });

          await insertPlayerAuditLog(supabase, {
            walletAddress,
            eventType: "daily_task_claimed",
            eventSource: "server",
            beforeState,
            afterState: sanitizeAuditSnapshot(updatedPlayer),
            metadata: {
              taskId,
              rewardCoins: task.rewardCoins ?? 0,
              rewardBait: task.rewardBait ?? 0,
              grantedDailyRolls: shouldGrantRolls ? DAILY_CUBE_ROLL_REWARD : 0,
            },
          });

          return jsonResponse({ player: updatedPlayer });
        }

        const currentTask = progress.specialTasks[taskId as SpecialTaskId];
        if (!currentTask || currentTask.claimed || currentTask.progress < task.target) {
          return badRequest("Task is not ready to claim");
        }

        const nextProgress = {
          ...progress,
          specialTasks: {
            ...progress.specialTasks,
            [taskId]: {
              ...currentTask,
              claimed: true,
            },
          },
        };

        const updatedPlayer = await updatePlayer(supabase, player.id, {
          game_progress: nextProgress,
          coins: player.coins + (task.rewardCoins ?? 0),
          bait: player.bait + (task.rewardBait ?? 0),
          bonus_bait_granted_total: player.bonus_bait_granted_total + (task.rewardBait ?? 0),
        });

        await insertPlayerAuditLog(supabase, {
          walletAddress,
          eventType: "special_task_claimed",
          eventSource: "server",
          beforeState,
          afterState: sanitizeAuditSnapshot(updatedPlayer),
          metadata: {
            taskId,
            rewardCoins: task.rewardCoins ?? 0,
            rewardBait: task.rewardBait ?? 0,
          },
        });

        return jsonResponse({ player: updatedPlayer });
      }

      case "cook_recipe": {
        await enforceRateLimit(supabase, {
          actionKey: "player_actions.cook_recipe",
          subjectKey: walletAddress,
          windowSeconds: 60,
          maxHits: 20,
        });

        const recipeId = normalizeText(body.recipe_id);
        const recipe = getGrillRecipe(recipeId);
        if (!recipe) return badRequest("Unknown recipe");

        const player = await loadPlayer(supabase, walletAddress);
        const beforeState = await fetchPlayerAuditSnapshot(supabase, walletAddress);
        const inventory = sanitizeInventory(player.inventory);
        const cookedDishes = sanitizeCookedDishes(player.cooked_dishes);
        const nextInventory = consumeInventoryFish(inventory, recipe.ingredients);
        if (!nextInventory) return badRequest("Not enough fish to cook this dish");

        const progress = normalizeGameProgressForToday(player.game_progress);
        const currentTask = progress.tasks.grill_1;
        const nextProgress = {
          ...progress,
          tasks: {
            ...progress.tasks,
            grill_1: currentTask.claimed
              ? currentTask
              : {
                ...currentTask,
                progress: Math.min(1, currentTask.progress + 1),
              },
          },
          grillScore: progress.grillScore + recipe.score,
          dishesToday: progress.dishesToday + 1,
        };

        const updatedPlayer = await updatePlayer(supabase, player.id, {
          inventory: nextInventory,
          cooked_dishes: addCookedDish(cookedDishes, recipe.id, 1),
          game_progress: nextProgress,
        });

        const leaderboardEntry = await upsertGrillLeaderboard(
          supabase,
          walletAddress,
          player.nickname ?? "Hook & Loot player",
          nextProgress.grillScore,
          1,
        );

        await insertPlayerAuditLog(supabase, {
          walletAddress,
          eventType: "grill_recipe_cooked",
          eventSource: "server",
          beforeState,
          afterState: sanitizeAuditSnapshot(updatedPlayer),
          metadata: {
            recipeId: recipe.id,
            recipeScore: recipe.score,
            ingredients: recipe.ingredients,
            leaderboardScore: leaderboardEntry.score,
          },
        });

        return jsonResponse({
          player: updatedPlayer,
          leaderboard_entry: leaderboardEntry,
        });
      }

      case "sell_cooked_dish": {
        await enforceRateLimit(supabase, {
          actionKey: "player_actions.sell_cooked_dish",
          subjectKey: walletAddress,
          windowSeconds: 60,
          maxHits: 24,
        });

        const recipeId = normalizeText(body.recipe_id);
        const recipe = getGrillRecipe(recipeId);
        if (!recipe) return badRequest("Unknown recipe");

        const player = await loadPlayer(supabase, walletAddress);
        const beforeState = await fetchPlayerAuditSnapshot(supabase, walletAddress);
        const cookedDishes = sanitizeCookedDishes(player.cooked_dishes);
        const nextCookedDishes = consumeCookedDish(cookedDishes, recipe.id);
        if (!nextCookedDishes) return badRequest("Dish is not available");

        const updatedPlayer = await updatePlayer(supabase, player.id, {
          coins: player.coins + recipe.score,
          cooked_dishes: nextCookedDishes,
        });

        await insertPlayerAuditLog(supabase, {
          walletAddress,
          eventType: "cooked_dish_sold",
          eventSource: "server",
          beforeState,
          afterState: sanitizeAuditSnapshot(updatedPlayer),
          metadata: {
            recipeId: recipe.id,
            coinReward: recipe.score,
          },
        });

        return jsonResponse({ player: updatedPlayer });
      }

      case "update_grill_leaderboard": {
        await enforceRateLimit(supabase, {
          actionKey: "player_actions.update_grill_leaderboard",
          subjectKey: walletAddress,
          windowSeconds: 60,
          maxHits: 20,
        });

        const name = sanitizeLeaderboardName(body.name);
        const score = clampInt(body.score, 0, 0, 1_000_000_000);
        const dishesDelta = clampInt(body.dishes_delta, 0, 0, 1000);
        const player = await loadPlayer(supabase, walletAddress);
        const leaderboardEntry = await upsertGrillLeaderboard(
          supabase,
          walletAddress,
          name || player.nickname || "Hook & Loot player",
          score,
          dishesDelta,
        );

        return jsonResponse({ leaderboard_entry: leaderboardEntry });
      }

      default:
        return badRequest("Unknown action");
    }
  } catch (error) {
    console.error("Player actions error:", error);
    return jsonResponse({ error: error instanceof Error ? error.message : "Internal error" }, 500);
  }
});
