import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { getCorsHeaders } from "../_shared/cors.ts";
import { verifySessionToken } from "../_shared/session.ts";

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

    const { data: player, error: playerError } = await supabase
      .from("players")
      .select("id, wallet_address")
      .eq("wallet_address", walletAddress)
      .single();
    if (playerError) throw playerError;

    switch (action) {
      case "list_my_messages": {
        const limit = toPositiveInt(body.limit, 10, 50);
        const { data, error } = await supabase
          .from("player_messages")
          .select("*")
          .eq("player_id", player.id)
          .order("created_at", { ascending: false })
          .limit(limit);
        if (error) throw error;

        return jsonResponse({ messages: data ?? [] });
      }

      case "get_unread_count": {
        const { count, error } = await supabase
          .from("player_messages")
          .select("id", { count: "exact", head: true })
          .eq("player_id", player.id)
          .is("read_at", null);
        if (error) throw error;

        return jsonResponse({ unread_count: count ?? 0 });
      }

      case "mark_message_read": {
        const messageId = normalizeText(body.message_id);
        if (!messageId) {
          return jsonResponse({ error: "Missing message" }, 400);
        }

        const { data: message, error: messageError } = await supabase
          .from("player_messages")
          .select("*")
          .eq("id", messageId)
          .eq("player_id", player.id)
          .single();
        if (messageError) throw messageError;

        if (message.read_at) {
          return jsonResponse({ message });
        }

        const { data, error } = await supabase
          .from("player_messages")
          .update({ read_at: new Date().toISOString() })
          .eq("id", messageId)
          .eq("player_id", player.id)
          .select("*")
          .single();
        if (error) throw error;

        return jsonResponse({ message: data });
      }

      default:
        return jsonResponse({ error: "Unknown action" }, 400);
    }
  } catch (error) {
    console.error("Player messages error:", error);
    return jsonResponse({ error: error instanceof Error ? error.message : "Internal error" }, 500);
  }
});
