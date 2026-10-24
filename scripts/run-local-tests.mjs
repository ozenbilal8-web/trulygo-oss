import { spawn } from 'node:child_process';
import { createServer } from 'node:net';
import { fileURLToPath } from 'node:url';
import { setTimeout as delay } from 'node:timers/promises';
import { readLocalEnv } from './local-env.mjs';

const root = fileURLToPath(new URL('..', import.meta.url));
const next = fileURLToPath(new URL('../node_modules/next/dist/bin/next', import.meta.url));
const local = readLocalEnv();
const forcedEnv = {
  ...process.env,
  NODE_ENV: 'production',
  NEXT_TELEMETRY_DISABLED: '1',
  NEXT_PUBLIC_APP_URL: local.NEXT_PUBLIC_APP_URL,
  NEXT_PUBLIC_SITE_URL: local.NEXT_PUBLIC_APP_URL,
  APP_URL: local.NEXT_PUBLIC_APP_URL,
  NEXT_PUBLIC_SUPABASE_URL: local.NEXT_PUBLIC_SUPABASE_URL,
  NEXT_PUBLIC_SUPABASE_ANON_KEY: local.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  SUPABASE_SERVICE_ROLE_KEY: local.SUPABASE_SERVICE_ROLE_KEY,
  CLICK_VISITOR_HASH_SECRET: local.CLICK_VISITOR_HASH_SECRET,
  TRULYGO_TRUSTED_LINK_CREATE_V2: 'true',
  NEXT_PUBLIC_ENABLE_ANALYTICS: 'false',
  GOOGLE_WEB_RISK_API_KEY: '',
  RESEND_API_KEY: '',
  RESEND_FROM: '',
};
let appProcess;
let activeProcess;
let appOutput = '';
const reservations = [];

async function reservePort(host) {
  const server = createServer();
  await new Promise((resolve, reject) => {
    server.once('error', reject);
    server.listen({ host, port: 3000, exclusive: true, ipv6Only: host === '::1' }, resolve);
  });
  reservations.push(server);
}

function child(args, { capture = false, env = forcedEnv } = {}) {
  const process = spawn(globalThis.process.execPath, args, { cwd: root, env, windowsHide: true, stdio: capture ? ['ignore', 'pipe', 'pipe'] : ['ignore', 'inherit', 'inherit'] });
  // Attach handlers immediately: errors must not become unhandled events.
  process.completion = new Promise((resolve, reject) => {
    process.once('error', reject);
    process.once('exit', (code, signal) => resolve({ code, signal }));
  });
  if (capture) {
    const record = value => { appOutput = (appOutput + value.toString()).slice(-16000); };
    process.stdout.on('data', record);
    process.stderr.on('data', record);
  }
  return process;
}

async function stop(process) {
  if (!process || process.exitCode !== null || process.signalCode !== null) return;
  process.kill('SIGTERM');
  const stopped = await Promise.race([process.completion.then(() => true), delay(5000).then(() => false)]);
  if (!stopped) { process.kill('SIGKILL'); await process.completion; }
}

function safeDiagnostics() {
  for (const line of appOutput.split(/\r?\n/).slice(-30)) {
    if (/key|secret|password|token|authorization|cookie|postgres:\/\//i.test(line)) continue;
    const secrets = [local.NEXT_PUBLIC_SUPABASE_ANON_KEY, local.SUPABASE_SERVICE_ROLE_KEY, local.CLICK_VISITOR_HASH_SECRET].filter(Boolean);
    let redacted = line;
    for (const secret of secrets) redacted = redacted.replaceAll(secret, '[redacted]');
    console.error(redacted);
  }
}

const onSignal = () => { activeProcess?.kill('SIGTERM'); appProcess?.kill('SIGTERM'); };
process.once('SIGINT', onSignal);
process.once('SIGTERM', onSignal);

try {
  // Hold the port during build; never reuse a developer's existing server.
  await reservePort('127.0.0.1');
  try { await reservePort('::1'); } catch (error) {
    if (!['EAFNOSUPPORT', 'EADDRNOTAVAIL'].includes(error.code)) throw error;
  }
  console.log('Reserved local application port; rebuilding with forced isolated backend configuration.');
  activeProcess = child([next, 'build']);
  if ((await activeProcess.completion).code !== 0) throw new Error('Local production build failed.');
  activeProcess = undefined;
  for (const server of reservations) await new Promise(resolve => server.close(resolve));
  reservations.length = 0;
  appProcess = child([next, 'start', '--hostname', '127.0.0.1', '--port', '3000'], { capture: true });
  // Wait for this child's ready banner before probing, so an intervening port
  // collision cannot make an unrelated listening server look like ours.
  for (let attempt = 0; attempt < 80; attempt++) {
    if (appProcess.exitCode !== null || appProcess.signalCode !== null) throw new Error('Owned application server exited during startup.');
    if (/Ready in/i.test(appOutput)) break;
    if (attempt === 79) throw new Error('Owned application server did not become ready.');
    await delay(250);
  }
  const ready = await fetch('http://127.0.0.1:3000/login', { redirect: 'manual', signal: AbortSignal.timeout(15000) });
  if (!ready.ok) throw new Error('Owned application login page failed.');
  activeProcess = child([fileURLToPath(new URL('./test-local.mjs', import.meta.url))], {
    env: { ...forcedEnv, TRULYGO_LOCAL_TEST_RUNNER: String(process.pid) },
  });
  // If our server exits at any time, abort the client before it could contact
  // another process that later takes this port.
  const guard = () => activeProcess?.kill('SIGTERM');
  appProcess.once('exit', guard);
  const result = await activeProcess.completion;
  appProcess.off('exit', guard);
  activeProcess = undefined;
  if (result.code !== 0) throw new Error('Local integration checks failed.');
} catch (error) {
  console.error(error.code === 'EADDRINUSE' ? 'Port 3000 is occupied. Stop that local server before running npm run test:local; no test requests were sent.' : error.message);
  safeDiagnostics();
  process.exitCode = 1;
} finally {
  await stop(activeProcess);
  await stop(appProcess);
  for (const server of reservations) await new Promise(resolve => server.close(resolve));
  process.removeListener('SIGINT', onSignal);
  process.removeListener('SIGTERM', onSignal);
}
