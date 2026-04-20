import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { verifySessionToken } from '../_shared/session.ts';
import {
  insertPlayerAuditLog,
  sanitizeAuditSnapshot,
} from '../_shared/playerAudit.ts';

const ALLOWED_ORIGIN = Deno.env.get('ALLOWED_ORIGIN') || '*';
const corsHeaders = {
  'Access-Control-Allow-Origin': ALLOWED_ORIGIN,
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

const normalizeWalletAddress = (value: string | null | undefined) => {
  const trimmed = value?.trim();
  if (!trimmed) return null;
  return /^0x[a-fA-F0-9]{40}$/.test(trimmed) ? trimmed.toLowerCase() : null;
};

const readFlag = (value: string | undefined, fallback: boolean) => {
  if (!value) return fallback;

  const normalized = value.trim().toLowerCase();
  if (['1', 'true', 'yes', 'on'].includes(normalized)) return true;
  if (['0', 'false', 'no', 'off'].includes(normalized)) return false;
  return fallback;
};

const PLAYER_AUDIT_LOGS_ENABLED = readFlag(Deno.env.get('PLAYER_AUDIT_LOGS_ENABLED'), true);

const sanitizeEventType = (value: string | null | undefined) => {
  const trimmed = value?.trim().toLowerCase();
  if (!trimmed) return null;
  return /^[a-z0-9_:-]{3,64}$/.test(trimmed) ? trimmed : null;
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    if (!PLAYER_AUDIT_LOGS_ENABLED) {
      return new Response(
        JSON.stringify({ success: true, disabled: true }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    const {
      wallet_address,
      session_token,
      event_type,
      before_state,
      after_state,
      metadata,
    } = await req.json();

    const normalizedWallet = normalizeWalletAddress(wallet_address);
    const normalizedEventType = sanitizeEventType(event_type);

    if (!normalizedWallet || !session_token || !normalizedEventType) {
      return new Response(
        JSON.stringify({ error: 'Invalid audit payload' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    if (!(await verifySessionToken(session_token, normalizedWallet))) {
      return new Response(
        JSON.stringify({ error: 'Invalid session' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );

    await insertPlayerAuditLog(supabase, {
      walletAddress: normalizedWallet,
      eventType: normalizedEventType,
      eventSource: 'client',
      beforeState: sanitizeAuditSnapshot(before_state),
      afterState: sanitizeAuditSnapshot(after_state),
      metadata: metadata && typeof metadata === 'object' ? metadata : {},
    });

    return new Response(
      JSON.stringify({ success: true }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  } catch (error) {
    console.error('log-player-event error:', error);

    return new Response(
      JSON.stringify({ error: 'Failed to record audit event' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  }
});
