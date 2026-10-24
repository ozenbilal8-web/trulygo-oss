import { readLocalEnv } from './local-env.mjs';

// Promote a user who already signed up in the disposable local stack.
const env = readLocalEnv();
const email = process.argv[2]?.trim();
if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new Error('Usage: node scripts/local-admin.mjs <local-account-email>');
const normalizedEmail = email.toLowerCase();
async function request(path, { method = 'GET', body } = {}) {
  const response = await fetch(`${env.NEXT_PUBLIC_SUPABASE_URL}${path}`, {
    method, redirect: 'error', signal: AbortSignal.timeout(10000),
    headers: { apikey: env.NEXT_PUBLIC_SUPABASE_ANON_KEY, Authorization: `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}`, 'Content-Type': 'application/json', Prefer: 'return=representation' },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
  if (!response.ok) throw new Error('Local account lookup or update failed.');
  return response.json();
}

// profiles.email may be stale or nonunique. Resolve the current Auth identity
// first, and never issue a bulk role update using a profile email filter.
const matches = new Map();
let fullyEnumerated = false;
for (let page = 1; page <= 10; page++) {
  const data = await request(`/auth/v1/admin/users?page=${page}&per_page=100`);
  if (!Array.isArray(data.users)) throw new Error('Unexpected local Auth users response; no role was changed.');
  for (const user of data.users) {
    if (typeof user.email === 'string' && user.email.toLowerCase() === normalizedEmail) matches.set(user.id, user);
  }
  if (data.users.length < 100) { fullyEnumerated = true; break; }
}
if (!fullyEnumerated || matches.size !== 1) throw new Error('Could not identify exactly one current local Auth account within the bounded lookup; no role was changed.');
const [id] = matches.keys();
if (!/^[0-9a-f]{8}-[0-9a-f-]{27}$/i.test(id)) throw new Error('Invalid local Auth identity; no role was changed.');
const currentUser = await request(`/auth/v1/admin/users/${id}`);
if (currentUser.id !== id || currentUser.email?.toLowerCase() !== normalizedEmail) throw new Error('Local Auth identity changed during lookup; no role was changed.');
const profile = await request(`/rest/v1/profiles?id=eq.${id}&select=id,role`);
if (!Array.isArray(profile) || profile.length !== 1 || profile[0].id !== id) throw new Error('Expected exactly one profile for the resolved Auth identity; no role was changed.');
const updated = await request(`/rest/v1/profiles?id=eq.${id}`, { method: 'PATCH', body: { role: 'admin' } });
if (!Array.isArray(updated) || updated.length !== 1 || updated[0].id !== id || updated[0].role !== 'admin') throw new Error('Could not verify local role promotion.');
console.log('One existing local account can now review pending requests at /admin.');
