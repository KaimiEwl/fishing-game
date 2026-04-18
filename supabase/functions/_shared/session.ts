const TOKEN_TTL_MS = 1000 * 60 * 60 * 24 * 30;
const encoder = new TextEncoder();
const decoder = new TextDecoder();

const getSessionSecret = () => {
  const secret = Deno.env.get('SESSION_TOKEN_SECRET') || Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  if (!secret) {
    throw new Error('Missing session secret');
  }
  return secret;
};

const toBase64Url = (bytes: Uint8Array) =>
  btoa(String.fromCharCode(...bytes))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/g, '');

const fromBase64Url = (value: string) => {
  const normalized = value.replace(/-/g, '+').replace(/_/g, '/');
  const padded = normalized + '='.repeat((4 - (normalized.length % 4 || 4)) % 4);
  return Uint8Array.from(atob(padded), (char) => char.charCodeAt(0));
};

const getSigningKey = async () => (
  crypto.subtle.importKey(
    'raw',
    encoder.encode(getSessionSecret()),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign', 'verify'],
  )
);

export const createSessionToken = async (
  walletAddress: string,
  expiresAt = Date.now() + TOKEN_TTL_MS,
) => {
  const payload = {
    sub: walletAddress.toLowerCase(),
    exp: expiresAt,
  };
  const encodedPayload = toBase64Url(encoder.encode(JSON.stringify(payload)));
  const signature = new Uint8Array(
    await crypto.subtle.sign('HMAC', await getSigningKey(), encoder.encode(encodedPayload)),
  );

  return `${encodedPayload}.${toBase64Url(signature)}`;
};

export const verifySessionToken = async (token: string, walletAddress: string) => {
  const [encodedPayload, encodedSignature] = token.split('.');
  if (!encodedPayload || !encodedSignature) return false;

  const isValidSignature = await crypto.subtle.verify(
    'HMAC',
    await getSigningKey(),
    fromBase64Url(encodedSignature),
    encoder.encode(encodedPayload),
  );

  if (!isValidSignature) return false;

  try {
    const payload = JSON.parse(decoder.decode(fromBase64Url(encodedPayload))) as {
      sub?: string;
      exp?: number;
    };

    return (
      payload.sub === walletAddress.toLowerCase()
      && typeof payload.exp === 'number'
      && payload.exp > Date.now()
    );
  } catch {
    return false;
  }
};
