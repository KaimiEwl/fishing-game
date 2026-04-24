const DEFAULT_ALLOWED_ORIGINS = [
  'https://hookloot.xyz',
  'https://www.hookloot.xyz',
  'https://kaimiewl.github.io',
  'http://localhost:3000',
  'http://localhost:4173',
  'http://localhost:5173',
  'http://127.0.0.1:3000',
  'http://127.0.0.1:4173',
  'http://127.0.0.1:5173',
];

const DEFAULT_ALLOWED_HEADERS = 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version';

export const getCorsHeaders = (req: Request) => {
  const configuredOrigin = Deno.env.get('ALLOWED_ORIGIN')?.trim() || '*';
  const requestOrigin = req.headers.get('origin')?.trim() || '';
  const allowedOrigins = new Set(DEFAULT_ALLOWED_ORIGINS);

  if (configuredOrigin && configuredOrigin !== '*') {
    allowedOrigins.add(configuredOrigin);
  }

  const allowOrigin = configuredOrigin === '*'
    ? (requestOrigin && allowedOrigins.has(requestOrigin) ? requestOrigin : '*')
    : (requestOrigin && allowedOrigins.has(requestOrigin) ? requestOrigin : configuredOrigin);

  return {
    'Access-Control-Allow-Origin': allowOrigin,
    'Access-Control-Allow-Headers': DEFAULT_ALLOWED_HEADERS,
    'Vary': 'Origin',
  };
};

