import { readLocalEnv } from './local-env.mjs';

// Promote a user who already signed up in the disposable local stack.
const env = readLocalEnv();
const email = process.argv[2]?.trim();
if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new Error('Usage: node scripts/local-admin.mjs <local-account-email>');
const response = await fetch(`${env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/profiles?email=eq.${encodeURIComponent(email)}`, {
  method: 'PATCH', redirect: 'error', signal: AbortSignal.timeout(10000),
  headers: { apikey: env.NEXT_PUBLIC_SUPABASE_ANON_KEY, Authorization: `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}`, 'Content-Type': 'application/json', Prefer: 'return=representation' },
  body: JSON.stringify({ role: 'admin' }),
});
const data = await response.json();
if (!response.ok || !Array.isArray(data) || data.length !== 1) throw new Error('Could not promote exactly one existing local account.');
console.log('One existing local account can now review pending requests at /admin.');
