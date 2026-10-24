import { execFileSync } from 'node:child_process';
import { randomBytes } from 'node:crypto';
import { existsSync, writeFileSync } from 'node:fs';
import { assertLocalUrl } from './local-env.mjs';

// An explicit binary path is useful for a separately installed, verified CLI.
// Otherwise use the pinned project dependency. This never downloads software.
const cli = process.env.SUPABASE_CLI_PATH || (process.platform === 'win32' ? 'node_modules/supabase/bin/supabase.exe' : 'node_modules/supabase/bin/supabase');
const destination = new URL('../.env.local', import.meta.url);
if (existsSync(destination)) throw new Error('.env.local already exists; refusing to replace it.');
let status;
try {
  status = JSON.parse(execFileSync(cli, ['status', '-o', 'json'], { cwd: new URL('..', import.meta.url), encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }));
} catch {
  throw new Error('Could not read local Supabase status. Start the pinned local stack first; no environment file was written.');
}
const url = status.API_URL;
assertLocalUrl(url, '58421');
if (!status.ANON_KEY || !status.SERVICE_ROLE_KEY) throw new Error('Local Supabase did not return the required local keys.');
const values = {
  NEXT_PUBLIC_APP_URL: 'http://localhost:3000',
  NEXT_PUBLIC_SUPABASE_URL: url,
  NEXT_PUBLIC_SUPABASE_ANON_KEY: status.ANON_KEY,
  SUPABASE_SERVICE_ROLE_KEY: status.SERVICE_ROLE_KEY,
  TRULYGO_TRUSTED_LINK_CREATE_V2: 'true',
  CLICK_VISITOR_HASH_SECRET: randomBytes(32).toString('hex'),
  GOOGLE_WEB_RISK_API_KEY: '',
  RESEND_API_KEY: '',
  RESEND_FROM: '',
  NEXT_PUBLIC_ENABLE_ANALYTICS: 'false',
};
writeFileSync(destination, '# Disposable local stack only. Never commit this file.\n' + Object.entries(values).map(([key, value]) => `${key}=${value}`).join('\n') + '\n', { flag: 'wx', mode: 0o600 });
console.log('Created ignored .env.local using only the isolated loopback stack. No secret values printed.');
