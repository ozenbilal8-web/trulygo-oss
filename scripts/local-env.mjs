import { readFileSync } from 'node:fs';

export function readLocalEnv() {
  const text = readFileSync(new URL('../.env.local', import.meta.url), 'utf8');
  const env = Object.fromEntries(text.split(/\r?\n/).filter(line => /^[A-Z][A-Z_0-9]*=/.test(line)).map(line => {
    const equals = line.indexOf('=');
    return [line.slice(0, equals), line.slice(equals + 1).replace(/^"(.*)"$/, '$1')];
  }));
  assertLocalUrl(env.NEXT_PUBLIC_SUPABASE_URL, '58421');
  assertLocalUrl(env.NEXT_PUBLIC_APP_URL, '3000');
  if (!env.NEXT_PUBLIC_SUPABASE_ANON_KEY || !env.SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error('Missing local keys. Run node scripts/setup-local.mjs first.');
  }
  return env;
}

export function assertLocalUrl(value, port) {
  const url = new URL(value);
  if (url.protocol !== 'http:' || !['127.0.0.1', 'localhost'].includes(url.hostname) || url.port !== port || url.username || url.password || url.pathname !== '/') {
    throw new Error(`Refusing non-local URL: expected a loopback HTTP origin on port ${port}.`);
  }
  return url;
}
