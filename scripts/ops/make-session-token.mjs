import { createHmac } from 'node:crypto';

const args = process.argv.slice(2);

const readArg = (name) => {
  const prefix = `--${name}=`;
  const direct = args.find((arg) => arg.startsWith(prefix));
  if (direct) return direct.slice(prefix.length);

  const index = args.findIndex((arg) => arg === `--${name}`);
  if (index >= 0 && index + 1 < args.length) {
    return args[index + 1];
  }

  return undefined;
};

const walletAddress = (readArg('wallet') || process.env.WALLET_ADDRESS || '').trim().toLowerCase();
const sessionSecret = (readArg('secret') || process.env.SESSION_TOKEN_SECRET || process.env.SUPABASE_SERVICE_ROLE_KEY || '').trim();
const expiresHours = Number(readArg('expires-hours') || process.env.SESSION_EXPIRES_HOURS || '720');

if (!walletAddress) {
  console.error('Missing wallet address. Use --wallet=0x...');
  process.exit(1);
}

if (!sessionSecret) {
  console.error('Missing session secret. Use --secret or export SESSION_TOKEN_SECRET.');
  process.exit(1);
}

if (!Number.isFinite(expiresHours) || expiresHours <= 0) {
  console.error('expires-hours must be a positive number.');
  process.exit(1);
}

const toBase64Url = (value) => Buffer
  .from(value)
  .toString('base64')
  .replace(/\+/g, '-')
  .replace(/\//g, '_')
  .replace(/=+$/g, '');

const payload = {
  sub: walletAddress,
  exp: Date.now() + expiresHours * 60 * 60 * 1000,
};

const encodedPayload = toBase64Url(JSON.stringify(payload));
const signature = createHmac('sha256', sessionSecret)
  .update(encodedPayload)
  .digest();

process.stdout.write(`${encodedPayload}.${toBase64Url(signature)}\n`);
