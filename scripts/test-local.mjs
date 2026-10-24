import assert from 'node:assert/strict';
import { randomBytes } from 'node:crypto';
import { setTimeout as delay } from 'node:timers/promises';
import { readLocalEnv } from './local-env.mjs';

// Runs against the dedicated loopback stack only. Never follows external URLs.
// Test identities and sessions are temporary and are removed in finally.
// This parent-PID marker prevents accidental direct use; it is not an
// authentication/security boundary against a malicious local process.
if (process.env.TRULYGO_LOCAL_TEST_RUNNER !== String(process.ppid)) {
  throw new Error('Use npm run test:local. The owned server runner is required.');
}
const env = readLocalEnv();
const api = env.NEXT_PUBLIC_SUPABASE_URL;
const app = env.NEXT_PUBLIC_APP_URL;
const anon = env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const service = env.SUPABASE_SERVICE_ROLE_KEY;
const runId = randomBytes(8).toString('hex');
const ownerEmail = `owner-${runId}@example.test`;
const password = `${randomBytes(24).toString('base64url')}aA1!`;
const slug = `local-${runId}`;
const destination = 'https://example.com/docs?source=oss';
const createdUsers = [];
const sessions = new Map();
let completed = 0;
function passed(label) { completed++; console.log(`PASS ${label}`); }
function check(value, label) { assert.ok(value, label); }

function fetchOwnedApp(url, options = {}) {
  const target = new URL(url, app);
  check(target.origin === app, 'HTTP flow must stay on the local application origin');
  // Connect explicitly to the owned IPv4 listener, while keeping the configured
  // Host/Origin for cookie and Server Action behavior. Never resolve localhost
  // to another IPv6 listener.
  const host = target.host;
  target.hostname = '127.0.0.1';
  return fetch(target, { ...options, redirect: 'manual', headers: {
    ...options.headers, Host: host, 'X-Forwarded-Host': host, 'X-Forwarded-Proto': 'http',
  } });
}

async function request(path, { token = anon, method = 'GET', body, prefer } = {}) {
  const response = await fetch(`${api}${path}`, {
    method, redirect: 'manual', signal: AbortSignal.timeout(15000),
    headers: { apikey: anon, Authorization: `Bearer ${token}`, 'Content-Type': 'application/json', ...(prefer ? { Prefer: prefer } : {}) },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  });
  const text = await response.text();
  let data;
  try { data = text ? JSON.parse(text) : null; } catch { data = null; }
  return { status: response.status, ok: response.ok, data };
}

function client() {
  const jar = new Map();
  return async (path, options = {}) => {
    const url = new URL(path, app);
    check(url.origin === app, 'HTTP flow must stay on the local application origin');
    const response = await fetchOwnedApp(url, {
      ...options, redirect: 'manual', signal: AbortSignal.timeout(30000),
      headers: { Origin: app, Cookie: [...jar].map(([key, value]) => `${key}=${value}`).join('; '), ...options.headers },
    });
    for (const value of response.headers.getSetCookie()) {
      const pair = value.split(';', 1)[0];
      const equals = pair.indexOf('=');
      jar.set(pair.slice(0, equals), pair.slice(equals + 1));
    }
    return response;
  };
}

function decodeHtml(value) {
  return value.replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&#x27;|&#39;/g, "'").replace(/&lt;/g, '<').replace(/&gt;/g, '>');
}

async function submitForm(session, path, marker, fields) {
  const page = await session(path);
  check(page.ok, `Form page ${path.split('?')[0]} must load`);
  const html = await page.text();
  const form = [...html.matchAll(/<form\b[^>]*>[\s\S]*?<\/form>/g)].map(match => match[0]).find(value => value.includes(marker));
  check(form, `Expected application form containing ${marker}`);
  const body = new FormData();
  for (const match of form.matchAll(/<input\b[^>]*>/g)) {
    const attributes = Object.fromEntries([...match[0].matchAll(/([\w$:-]+)="([^"]*)"/g)].map(item => [item[1], decodeHtml(item[2])]));
    if (attributes.name?.startsWith('$ACTION_')) body.append(attributes.name, attributes.value || '');
  }
  check([...body.keys()].some(key => key.startsWith('$ACTION_')), 'Server Action identity is present');
  for (const [key, value] of Object.entries(fields)) body.set(key, value);
  return session(path, { method: 'POST', body });
}

function assertRedirect(response, path, label) {
  check([303, 307].includes(response.status), `${label}: redirect status`);
  const location = response.headers.get('location');
  check(location && new URL(location, app).pathname === path && !new URL(location, app).searchParams.has('error'), `${label}: expected successful redirect`);
}

async function localConfirmationLink(email) {
  for (let attempt = 0; attempt < 30; attempt++) {
    const response = await fetch(`http://127.0.0.1:58424/view/latest.html?query=${encodeURIComponent(`to:${email}`)}`, { redirect: 'manual', signal: AbortSignal.timeout(3000) });
    if (response.ok) {
      const html = await response.text();
      const link = [...html.matchAll(/href="([^"]+)"/g)].map(match => decodeHtml(match[1])).find(value => value.includes('/auth/confirm?'));
      if (link) { check(new URL(link).origin === app, 'Confirmation email stays local'); return link; }
    }
    await delay(500);
  }
  throw new Error('Local confirmation email did not arrive in Mailpit.');
}

async function createTestUser(prefix) {
  const result = await request('/auth/v1/admin/users', { token: service, method: 'POST', body: { email: `${prefix}-${runId}@example.test`, password, email_confirm: true } });
  check(result.ok && result.data?.id, 'Local fixture account creation');
  createdUsers.push(result.data.id);
  return { id: result.data.id, email: `${prefix}-${runId}@example.test` };
}

async function tokenFor(email) {
  const result = await request('/auth/v1/token?grant_type=password', { method: 'POST', body: { email, password } });
  check(result.ok && result.data?.access_token, 'Local password sign-in');
  sessions.set(result.data.user.id, result.data.access_token);
  return result.data.access_token;
}

try {
  const unauthenticated = client();
  const signup = await submitForm(unauthenticated, '/register', 'name="password_confirm"', { email: ownerEmail, password, password_confirm: password, terms_consent: 'accepted' });
  assertRedirect(signup, '/register', 'Signup');
  check(new URL(signup.headers.get('location'), app).searchParams.get('message') === 'check_email', 'Signup requests local confirmation');
  const profiles = await request(`/rest/v1/profiles?email=eq.${encodeURIComponent(ownerEmail)}&select=id,role`, { token: service });
  check(profiles.ok && profiles.data?.length === 1 && profiles.data[0].role === 'user', 'Signup trigger creates an unprivileged profile');
  const ownerId = profiles.data[0].id;
  createdUsers.push(ownerId);
  const confirmation = await unauthenticated(await localConfirmationLink(ownerEmail));
  assertRedirect(confirmation, '/dashboard', 'Email confirmation');
  passed('real signup Server Action, local email confirmation and session cookie');

  const owner = client();
  assertRedirect(await submitForm(owner, '/login', 'name="password"', { email: ownerEmail, password }), '/dashboard', 'Login');
  passed('real password-login Server Action');

  // This existing query state opens the creation modal during server rendering.
  const created = await submitForm(owner, '/dashboard?error=missing_slug', 'name="target_url"', { target_url: destination, requested_slug: slug, campaign_name: 'Disposable local integration', immutable_acknowledgement: 'accepted' });
  assertRedirect(created, '/dashboard', 'Link creation');
  check(new URL(created.headers.get('location'), app).searchParams.get('message') === 'link_request_security_review', 'Missing Web Risk routes to manual review');
  const records = await request(`/rest/v1/link_requests?requested_slug=eq.${slug}&select=id,user_id,status,submission_source,safety_status,auto_approval_blocked`, { token: service });
  check(records.ok && records.data?.length === 1, 'Link creation persists one row');
  const record = records.data[0];
  check(record.user_id === ownerId && record.status === 'pending' && record.submission_source === 'trusted_server_v2' && record.safety_status === 'unverified' && record.auto_approval_blocked === true, 'Server-created link has expected ownership and safe pending state');
  passed('authenticated link creation through the trusted V2 Server Action');

  const pending = await request('/rest/v1/rpc/resolve_public_link_redirect', { method: 'POST', body: { p_slug: slug } });
  check(pending.ok && pending.data?.length === 0, 'Pending links are absent from the public resolver');
  const pendingPage = await fetchOwnedApp(`${app}/${slug}`);
  check(pendingPage.status === 200 && !pendingPage.headers.has('location'), 'Pending link does not redirect');
  passed('pending link is not publicly redirected');

  const stranger = await createTestUser('stranger');
  const strangerToken = await tokenFor(stranger.email);
  const ownerToken = await tokenFor(ownerEmail);
  const limiterInput = { p_action: 'local:integration', p_key: runId, p_limit: 2, p_window_seconds: 60 };
  for (const token of [anon, ownerToken]) {
    const deniedLimiter = await request('/rest/v1/rpc/check_rate_limit', { token, method: 'POST', body: limiterInput });
    check(!deniedLimiter.ok && [401, 403, 404].includes(deniedLimiter.status), 'Browser-facing roles cannot invoke the rate limiter RPC');
  }
  const allowedLimiter = await request('/rest/v1/rpc/check_rate_limit', { token: service, method: 'POST', body: limiterInput });
  check(allowedLimiter.ok && allowedLimiter.data === true, 'Trusted server can invoke the rate limiter RPC');
  passed('rate limiting requires the service role; anonymous and user RPC calls are denied');
  const otherRows = await request(`/rest/v1/link_requests?id=eq.${record.id}&select=id`, { token: strangerToken });
  check(otherRows.ok && otherRows.data?.length === 0, 'RLS hides another account\'s link');
  const otherProfiles = await request(`/rest/v1/profiles?id=eq.${ownerId}&select=id`, { token: strangerToken });
  check(otherProfiles.ok && otherProfiles.data?.length === 0, 'RLS hides another account\'s profile');
  const anonymousRows = await request('/rest/v1/link_requests?select=id');
  check(!anonymousRows.ok && [401, 403].includes(anonymousRows.status), 'Anonymous direct table access is denied');
  for (const path of ['/rest/v1/link_requests?select=requested_slug,target_url', '/rest/v1/channel_links?select=slug,user_id']) {
    const anonymousColumns = await request(path);
    check(!anonymousColumns.ok && [401, 403].includes(anonymousColumns.status), 'Anonymous direct column-select is denied on both link tables');
  }
  const escalation = await request(`/rest/v1/profiles?id=eq.${ownerId}`, { token: ownerToken, method: 'PATCH', body: { role: 'admin' } });
  check(!escalation.ok, 'A user cannot promote their profile role');
  const directInsert = await request('/rest/v1/link_requests', { token: ownerToken, method: 'POST', body: { user_id: ownerId, target_url: destination, requested_slug: `${slug}-forged` } });
  check(!directInsert.ok, 'The legacy browser INSERT boundary is closed');
  const selfApproval = await request(`/rest/v1/link_requests?id=eq.${record.id}`, { token: ownerToken, method: 'PATCH', prefer: 'return=representation', body: { status: 'approved' } });
  check(!selfApproval.ok || selfApproval.data?.length === 0, 'An ordinary user cannot approve their own request');
  const trustedRpc = await request('/rest/v1/rpc/create_link_request_v2', { token: ownerToken, method: 'POST', body: { p_user_id: ownerId, p_target_url: destination, p_requested_slug: `${slug}-forged`, p_campaign_name: null, p_note: null, p_safety_status: 'clean', p_safety_verified_at: new Date().toISOString(), p_safety_policy_version: 'forged', p_web_risk_status: 'clean', p_web_risk_threats: [], p_web_risk_checked_at: new Date().toISOString() } });
  check(!trustedRpc.ok, 'Authenticated callers cannot invoke the service-only creation RPC');
  passed('RLS ownership, profile role, direct insert, self-approval and service-only RPC boundaries');

  const adminFixture = await createTestUser('reviewer');
  await tokenFor(adminFixture.email);
  const promoted = await request(`/rest/v1/profiles?id=eq.${adminFixture.id}`, { token: service, method: 'PATCH', body: { role: 'admin' }, prefer: 'return=representation' });
  check(promoted.ok && promoted.data?.length === 1, 'Local reviewer fixture is configured');
  const reviewer = client();
  assertRedirect(await submitForm(reviewer, '/login', 'name="password"', { email: adminFixture.email, password }), '/dashboard', 'Reviewer login');
  const review = await submitForm(reviewer, '/admin', `value="${record.id}"`, { request_id: record.id, status: 'approved', admin_note: 'Reviewed disposable fixture; example.com target is never fetched.' });
  assertRedirect(review, '/admin', 'Manual approval');
  check(new URL(review.headers.get('location'), app).searchParams.get('message') === 'request_approved', 'Review action confirms approval');
  passed('administrator manual approval through the real Server Action');

  const privateDestination = `https://example.net/private-${runId}`;
  const createOtherMain = requestedSlug => request('/rest/v1/rpc/create_link_request_v2', {
    token: service, method: 'POST',
    body: {
      p_user_id: stranger.id, p_target_url: privateDestination, p_requested_slug: requestedSlug,
      p_campaign_name: null, p_note: null, p_safety_status: 'unverified', p_safety_verified_at: null,
      p_safety_policy_version: 'local-integration', p_web_risk_status: 'skipped', p_web_risk_threats: [],
      p_web_risk_checked_at: new Date().toISOString(),
    },
  });
  const createOwnerChannel = (channelSlug, key) => request('/rest/v1/channel_links', {
    token: ownerToken, method: 'POST', prefer: 'return=representation',
    body: { link_request_id: record.id, user_id: ownerId, slug: channelSlug, channel_key: key, channel_label: 'Local integration', utm_source: 'local', utm_medium: 'test', utm_campaign: 'integration' },
  });
  const pendingOther = await createOtherMain(`${slug}-other-pending`);
  check(pendingOther.ok && pendingOther.data?.length === 1, 'Cross-owner pending namespace fixture exists');
  const hiddenPending = await request(`/rest/v1/link_requests?id=eq.${pendingOther.data[0].id}&select=id`, { token: ownerToken });
  check(hiddenPending.ok && hiddenPending.data?.length === 0, 'Namespace collision fixture is hidden by RLS');
  const blockedChannel = await createOwnerChannel(`${slug}-other-pending`, 'cross-owner-blocked');
  check(!blockedChannel.ok && blockedChannel.data?.code === '23505', 'A hidden pending main slug blocks channel creation by another owner');
  const errorText = JSON.stringify(blockedChannel.data);
  check(!errorText.includes(stranger.id) && !errorText.includes(privateDestination), 'Namespace conflict does not disclose another owner or destination');

  const existingChannel = await createOwnerChannel(`${slug}-channel`, 'existing-channel');
  check(existingChannel.ok && existingChannel.data?.length === 1, 'Channel creation with an unclaimed slug succeeds');
  const blockedMain = await createOtherMain(`${slug}-channel`);
  check(!blockedMain.ok && blockedMain.data?.code === '23505', 'An existing channel blocks another owner\'s new main request');
  const rejectedOther = await request(`/rest/v1/link_requests?id=eq.${pendingOther.data[0].id}`, { token: service, method: 'PATCH', prefer: 'return=representation', body: { status: 'rejected' } });
  check(rejectedOther.ok && rejectedOther.data?.length === 1, 'Pending namespace fixture becomes inactive');
  const reclaimedInactive = await createOwnerChannel(`${slug}-other-pending`, 'inactive-main-reuse');
  check(reclaimedInactive.ok && reclaimedInactive.data?.length === 1, 'An inactive main request does not reserve a channel slug');

  const simultaneous = await Promise.all([
    createOwnerChannel(`${slug}-race`, 'namespace-race'),
    createOtherMain(`${slug}-race`),
  ]);
  check(simultaneous.filter(result => result.ok).length === 1 && simultaneous.filter(result => !result.ok && result.data?.code === '23505').length === 1, 'Concurrent cross-table claims admit exactly one namespace owner');
  passed('main/channel namespace collisions are enforced across owners and concurrent requests without exposing private rows');

  const resolved = await request('/rest/v1/rpc/resolve_public_link_redirect', { method: 'POST', body: { p_slug: slug } });
  check(resolved.ok && resolved.data?.length === 1 && resolved.data[0].target_url === destination && !('user_id' in resolved.data[0]) && !('note' in resolved.data[0]), 'Public resolver exposes only redirect data');
  const redirected = await fetchOwnedApp(`${app}/${slug}?utm_source=local&utm_medium=test`, { signal: AbortSignal.timeout(10000) });
  check(redirected.status === 307, 'Approved short link returns HTTP 307');
  const location = new URL(redirected.headers.get('location'));
  check(location.origin === 'https://example.com' && location.pathname === '/docs' && location.searchParams.get('source') === 'oss' && location.searchParams.get('utm_source') === 'local', 'Redirect retains destination and UTM parameters');
  passed('approved link resolves and redirects correctly, without fetching the external destination');

  const immutable = await request(`/rest/v1/link_requests?id=eq.${record.id}`, { token: service, method: 'PATCH', body: { target_url: 'https://example.org/changed' } });
  check(!immutable.ok, 'Database rejects destination changes after review');
  passed('reviewed destination remains immutable even to a privileged update');
  console.log(`Completed ${completed} local integration groups. External Web Risk, Resend delivery and hosted deployments were not tested.`);
} catch (error) {
  // Avoid printing response bodies, credentials, auth links, or cookies.
  console.error(`LOCAL INTEGRATION FAILED: ${error instanceof assert.AssertionError ? error.message : error?.message?.startsWith('Local confirmation') ? error.message : error?.name || 'unknown error'}`);
  process.exitCode = 1;
} finally {
  let cleanupFailed = false;
  for (const id of createdUsers) {
    const token = sessions.get(id);
    if (token) await request('/auth/v1/logout?scope=global', { token, method: 'POST' }).catch(() => null);
    // Deleting fixture users also cascades owned data; no session is retained.
    const deleted = await request(`/auth/v1/admin/users/${id}`, { token: service, method: 'DELETE' }).catch(() => null);
    if (!deleted?.ok) cleanupFailed = true;
  }
  if (cleanupFailed) { console.error('Local fixture cleanup failed; reset only the isolated development stack.'); process.exitCode = 1; }
  else console.log('Temporary fixture accounts removed.');
}
