import { spawn } from 'node:child_process';
import { createServer } from 'node:net';
import { setTimeout as sleep } from 'node:timers/promises';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { checkService } from './verify-cloud-preview.mjs';

export const TARGET = Object.freeze({
  project: 'gen-lang-client-0501182238', region: 'asia-southeast1', service: 'thariktha-preview',
  origins: Object.freeze([
    'https://thariktha-preview-32m2quxjhq-as.a.run.app',
    'https://thariktha-preview-959415023796.asia-southeast1.run.app',
  ]),
});
const LOCAL = 'http://127.0.0.1:8080';
const CLI_TIMEOUT = 30_000;
const REQUEST_TIMEOUT = 10_000;
const MAX_LIFETIME = 25 * 60_000;
const FAKE_BEARER = 'private-preview-invalid-token';
// gcloud otherwise may log command arguments (including --token) to disk.
const gcloudEnv = () => ({ ...process.env, CLOUDSDK_CORE_DISABLE_PROMPTS: '1', CLOUDSDK_CORE_DISABLE_FILE_LOGGING: '1', CLOUDSDK_CORE_LOG_HTTP: '0', CLOUDSDK_CORE_VERBOSITY: 'error' });
class PreviewFailure extends Error {}
const requireCheck = (ok, reason) => { if (!ok) throw new PreviewFailure(reason); };
export const failureMessage = error => error instanceof PreviewFailure ? error.message : 'Unexpected failure (details suppressed to protect credentials).';

export function parseAccount(args) {
  requireCheck(args.length === 1 && args[0].startsWith('--account='), 'Usage: node scripts/start-private-preview.mjs --account=YOUR_HUMAN_EMAIL');
  const account = args[0].slice('--account='.length);
  requireCheck(/^[A-Za-z0-9._+%-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/.test(account) && !/gserviceaccount\.com$/i.test(account), 'Specify one human Google account email, not a service account.');
  return account;
}

export function checkIdentity(account, accounts, config, env) {
  parseAccount([`--account=${account}`]);
  const active = accounts.filter(entry => entry.status === 'ACTIVE');
  requireCheck(active.length === 1 && active[0].account === account && config.core?.account === account, 'Active gcloud account does not match the requested human account.');
  // gcloud config list --all represents unset properties as JSON null.
  const set = value => value !== null && value !== undefined && value !== '' && value !== '(unset)' && value !== false && value !== 'false';
  const forbidden = ['impersonate_service_account', 'access_token', 'access_token_file', 'credential_file_override', 'login_config_file', 'disable_credentials'];
  requireCheck(!forbidden.some(key => set(config.auth?.[key])) && !Object.values(config.api_endpoint_overrides || {}).some(set), 'gcloud credential/impersonation/endpoint overrides are not allowed.');
  requireCheck(!Object.entries(env).some(([key, value]) => value && /^(?:CLOUDSDK_AUTH_|CLOUDSDK_API_ENDPOINT_OVERRIDES_|CLOUDSDK_CORE_ACCOUNT$)/.test(key)), 'Remove gcloud auth/account/endpoint environment overrides before using this helper.');
}

export function trustedOrigin(value) {
  requireCheck(TARGET.origins.includes(value), 'Service URL is not an exact approved HTTPS Cloud Run origin.');
  return value;
}

export function tokenDeadline(token, account, now = Date.now()) {
  // Sanity checks only, not local signature verification. Cloud Run validates the token.
  let claims;
  try {
    requireCheck(token.length < 16_384 && /^[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/.test(token), 'Invalid operator identity token.');
    claims = JSON.parse(Buffer.from(token.split('.')[1], 'base64url').toString('utf8'));
  } catch { throw new PreviewFailure('Invalid operator identity token.'); }
  requireCheck(['https://accounts.google.com', 'accounts.google.com'].includes(claims.iss)
    && claims.email === account && claims.email_verified === true && /^\d+$/.test(claims.sub)
    && Number.isFinite(claims.exp) && Number.isFinite(claims.iat) && claims.iat * 1000 <= now + 60_000
    && claims.exp * 1000 > now + 120_000, 'Token identity/issuer/expiry does not match a usable human account.');
  return Math.min(now + MAX_LIFETIME, claims.exp * 1000 - 60_000);
}

// Each command gets its own POSIX process group. Never signal another listener or use pkill.
export function spawnOwned(command, args, { capture = false, env = process.env } = {}) {
  const child = spawn(command, args, { detached: true, stdio: ['ignore', capture ? 'pipe' : 'ignore', 'ignore'], env });
  let output = '', overflow = false, ended = false, stopping;
  const signalGroup = signal => {
    if (!child.pid) return;
    try { process.kill(-child.pid, signal); } catch (error) { if (error.code !== 'ESRCH') throw new PreviewFailure('Could not clean up the owned process group.'); }
  };
  if (capture) child.stdout.on('data', bytes => {
    if (output.length + bytes.length > 1024 * 1024) { overflow = true; signalGroup('SIGTERM'); }
    else output += bytes.toString('utf8');
  });
  const done = new Promise(resolveDone => {
    child.once('error', () => { ended = true; resolveDone({ code: null }); });
    child.once('exit', () => { ended = true; });
    child.once('close', code => resolveDone({ code }));
  });
  return {
    child, done, get ended() { return ended; },
    result: () => ({ output, overflow }),
    stop() {
      return stopping ??= (async () => {
        signalGroup('SIGTERM');
        // Kill the entire group even if its leader exits before its descendants.
        await sleep(300);
        signalGroup('SIGKILL');
        await Promise.race([done, sleep(1000)]);
      })();
    },
  };
}

export async function runGcloud(args, { signal, launch = spawnOwned, timeout = CLI_TIMEOUT } = {}) {
  const owned = launch('gcloud', [...args, '--quiet'], { capture: true, env: gcloudEnv() });
  const timer = new AbortController();
  try {
    const result = await Promise.race([
      owned.done,
      sleep(timeout, null, { signal: AbortSignal.any([timer.signal, ...(signal ? [signal] : [])]) }).then(() => { throw new PreviewFailure('gcloud command timed out.'); }),
    ]);
    const { output, overflow } = owned.result();
    requireCheck(result.code === 0 && !overflow, 'gcloud command failed or exceeded its output limit; raw output suppressed.');
    return output.trim();
  } finally { timer.abort(); await owned.stop(); }
}

export async function assertPortFree(port = 8080) {
  // Reserve both loopback families briefly: gcloud uses its documented localhost default.
  for (const host of ['127.0.0.1', '::1']) {
    await new Promise((resolveFree, reject) => {
      const server = createServer();
      server.once('error', error => {
        if (host === '::1' && ['EAFNOSUPPORT', 'EADDRNOTAVAIL'].includes(error.code)) resolveFree();
        else reject(new PreviewFailure('Port 8080 is busy/unavailable. Press Ctrl+C in the OLD proxy terminal, then run this helper there. Nothing was killed.'));
      });
      server.listen({ port, host, exclusive: true }, () => server.close(resolveFree));
    });
  }
}

export async function getResponse(origin, path, headers = {}, { request = fetch, signal } = {}) {
  requireCheck((TARGET.origins.includes(origin) || origin === LOCAL) && ['/', '/api/health', '/api/erp/session'].includes(path), 'Refused an unapproved request destination/path.');
  requireCheck(origin !== LOCAL || !headers['X-Serverless-Authorization'], 'Refused to send the ingress token to a local probe.');
  try {
    const response = await request(`${origin}${path}`, {
      method: 'GET', redirect: 'error', headers,
      signal: AbortSignal.any([AbortSignal.timeout(REQUEST_TIMEOUT), ...(signal ? [signal] : [])]),
    });
    requireCheck(response.status < 300 || response.status >= 400, 'Redirect refused; no redirected request was sent.');
    let text = '', size = 0;
    for await (const chunk of response.body || []) {
      size += chunk.length;
      requireCheck(size <= 262_144, 'Response exceeded its size limit.');
      text += Buffer.from(chunk).toString('utf8');
    }
    let json;
    if (/^application\/json(?:;|$)/i.test(response.headers.get('content-type') || '')) {
      try { json = JSON.parse(text); } catch { /* schema checks below reject it */ }
    }
    return { status: response.status, headers: response.headers, text, json };
  } catch (error) {
    if (error instanceof PreviewFailure) throw error;
    throw new PreviewFailure('Request failed (network, timeout or redirect); no response/token details printed.');
  }
}

export function checkHealth(response) {
  requireCheck(response.status === 200 && response.json?.status === 'alive'
    && response.json?.persistence === 'Firestore' && response.json?.service === 'Talk of the Town Cricket Closet ERP', 'Expected HTTP 200 application health JSON; ingress/transport is not verified.');
}
export function checkPage(response) {
  const directives = (response.headers.get('content-security-policy') || '').split(';').map(x => x.trim().split(/\s+/));
  const scripts = directives.filter(x => x[0] === 'script-src');
  requireCheck(response.status === 200 && response.text.includes('<title>Talk of the Town Cricket Closet ERP</title>')
    && scripts.length === 1 && scripts[0].length === 3 && scripts[0].includes("'self'") && scripts[0].includes('https://apis.google.com'), 'Application shell/CSP did not match the reviewed private preview.');
}
export function checkSession(response, code) {
  if (response.json?.error?.code === 'AUTH_UNAVAILABLE') throw new PreviewFailure('Application reported AUTH_UNAVAILABLE; transport acceptance is incomplete (not a role diagnosis).');
  requireCheck(response.status === 401 && response.json?.error?.code === code, `Expected application JSON 401 ${code}; ingress HTML, other JSON or success is not accepted.`);
}

export async function runPreview(account, {
  cli = runGcloud, request = fetch, portFree = assertPortFree,
  start = args => spawnOwned('gcloud', args, { env: gcloudEnv() }), env = process.env,
  now = Date.now, pause = sleep, signal, log = console.log,
  hold = async (owned, deadline) => {
    const timer = new AbortController();
    try {
      await Promise.race([
        owned.done.then(() => { throw new PreviewFailure('Owned proxy exited unexpectedly.'); }),
        sleep(Math.max(0, deadline - Date.now()), null, { signal: AbortSignal.any([timer.signal, ...(signal ? [signal] : [])]) }),
      ]);
    } finally { timer.abort(); }
  },
} = {}) {
  let phase = 'preflight', owned;
  const checkStopped = () => signal?.throwIfAborted();
  const command = async args => { checkStopped(); return cli(args, { signal }); };
  const jsonCommand = async args => JSON.parse(await command([...args, '--format=json']));
  const get = (origin, path, headers) => getResponse(origin, path, headers, { request, signal });
  try {
    parseAccount([`--account=${account}`]);
    requireCheck(!Object.entries(env).some(([key, value]) => value && /^(?:CLOUDSDK_AUTH_|CLOUDSDK_API_ENDPOINT_OVERRIDES_|CLOUDSDK_CORE_ACCOUNT$)/.test(key)), 'Remove gcloud auth/account/endpoint environment overrides before using this helper.');
    await portFree();
    phase = 'operator identity';
    const config = await jsonCommand(['config', 'list', '--all']);
    const accounts = await jsonCommand(['auth', 'list']);
    checkIdentity(account, accounts, config, env);
    const flags = [`--project=${TARGET.project}`, `--region=${TARGET.region}`, `--account=${account}`];
    phase = 'private/write-disabled service metadata';
    const service = await jsonCommand(['run', 'services', 'describe', TARGET.service, ...flags]);
    const policy = await jsonCommand(['run', 'services', 'get-iam-policy', TARGET.service, ...flags]);
    trustedOrigin(service.status?.url);
    requireCheck(Array.isArray(policy.bindings), 'Service IAM response is incomplete.');
    try { checkService(service, policy); } catch { throw new PreviewFailure('Service metadata/IAM failed the existing private, ready, Firebase-target and write-disabled checks.'); }
    const origin = service.status.url;
    phase = 'unsigned ingress rejection';
    const unsigned = await get(origin, '/api/health');
    requireCheck([401, 403].includes(unsigned.status), 'Unsigned health did not return HTTP 401/403; refusing token generation.');
    phase = 'operator token';
    let token = await command(['auth', 'print-identity-token', `--account=${account}`]);
    const deadline = tokenDeadline(token, account, now());
    phase = 'direct authenticated health';
    checkHealth(await get(origin, '/api/health', { 'X-Serverless-Authorization': `Bearer ${token}` }));
    checkStopped();
    // Recheck immediately before launch; never replace a process that won the port race.
    await portFree();
    phase = 'explicit-token proxy readiness';
    owned = start(['run', 'services', 'proxy', TARGET.service, ...flags, '--port=8080', `--token=${token}`, '--quiet']);
    token = undefined;
    const readyDeadline = Math.min(now() + 45_000, deadline);
    let health;
    while (now() < readyDeadline) {
      checkStopped();
      requireCheck(!owned.ended, 'Owned proxy exited before readiness; raw child output suppressed.');
      try { health = await get(LOCAL, '/api/health'); break; }
      catch (error) {
        if (!(error instanceof PreviewFailure) || !error.message.startsWith('Request failed')) throw error;
        await pause(250, null, { signal });
      }
    }
    requireCheck(health, 'Owned proxy did not become ready within 45 seconds.');
    checkHealth(health);
    phase = 'proxy shell/CSP';
    checkPage(await get(LOCAL, '/'));
    phase = 'proxy missing Firebase bearer';
    checkSession(await get(LOCAL, '/api/erp/session'), 'UNAUTHENTICATED');
    phase = 'proxy invalid Firebase bearer';
    checkSession(await get(LOCAL, '/api/erp/session', { Authorization: `Bearer ${FAKE_BEARER}` }), 'INVALID_TOKEN');
    requireCheck(!owned.ended && now() < deadline, 'Owned proxy stopped or token lifetime elapsed during verification.');
    log('TRANSPORT PASS: private ingress, write-disabled metadata, health/CSP and both application JSON 401 boundaries verified.');
    log('Real Firebase login, ERP roles and database reads are NOT verified. Open Cloud Shell Web Preview on port 8080.');
    log('Foreground temporary preview: stops within 25 minutes or 60 seconds before token expiry, whichever is sooner. No automatic refresh. Ctrl+C stops only this helper\'s process group.');
    phase = 'foreground proxy lifetime';
    await hold(owned, deadline);
    log('TRANSPORT STOP: bounded token lifetime reached. Rerun the same command for a fresh token.');
  } catch (error) {
    if (signal?.aborted) { log('TRANSPORT STOP: interrupted; cleaning up owned processes.'); return; }
    throw new PreviewFailure(`${phase}: ${failureMessage(error)}`);
  } finally { if (owned) await owned.stop(); }
}

async function main() {
  const controller = new AbortController();
  const stop = () => controller.abort();
  for (const event of ['SIGINT', 'SIGTERM', 'SIGHUP']) process.on(event, stop);
  try {
    requireCheck(Number(process.versions.node.split('.')[0]) >= 22 && process.platform !== 'win32', 'Use Node >=22 in POSIX Cloud Shell.');
    await runPreview(parseAccount(process.argv.slice(2)), { signal: controller.signal });
  } catch (error) {
    console.error(`TRANSPORT FAIL: ${failureMessage(error)}`);
    process.exitCode = 1;
  } finally {
    for (const event of ['SIGINT', 'SIGTERM', 'SIGHUP']) process.off(event, stop);
    if (controller.signal.aborted) process.exitCode = 130;
  }
}
if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) await main();
