import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { spawnSync } from 'node:child_process';
import { readFile } from 'node:fs/promises';
import { setTimeout as sleep } from 'node:timers/promises';
import {
  TARGET, parseAccount, checkIdentity, trustedOrigin, tokenDeadline, failureMessage,
  spawnOwned, runGcloud, assertPortFree, getResponse, checkHealth, checkPage, checkSession, runPreview,
} from './start-private-preview.mjs';

const account = 'operator@example.com';
const now = 1_800_000_000_000;
const claims = { iss: 'https://accounts.google.com', email: account, email_verified: true, sub: '123456789', iat: now / 1000, exp: now / 1000 + 3600 };
const jwt = (overrides = {}) => ['synthetic', Buffer.from(JSON.stringify({ ...claims, ...overrides })).toString('base64url'), 'signature'].join('.');
const accounts = () => [{ account, status: 'ACTIVE' }];
const config = () => ({ core: { account }, auth: {} });
const healthBody = { status: 'alive', persistence: 'Firestore', service: 'Talk of the Town Cricket Closet ERP' };
const html = '<title>Talk of the Town Cricket Closet ERP</title>';
const csp = "default-src 'self'; script-src 'self' https://apis.google.com; object-src 'none'";
const service = () => ({
  metadata: { name: TARGET.service, labels: { 'managed-by': 'hermes-private-preview' } },
  spec: { template: { metadata: { annotations: { 'autoscaling.knative.dev/maxScale': '1', 'autoscaling.knative.dev/minScale': '0' } }, spec: {
    serviceAccountName: `thariktha-preview-runtime@${TARGET.project}.iam.gserviceaccount.com`,
    containers: [{ env: [
      { name: 'ERP_SCHEMA_APPROVED', value: 'false' },
      { name: 'GOOGLE_CLOUD_PROJECT', value: 'cricket-closet-imphal' },
      { name: 'FIRESTORE_DATABASE_ID', value: 'ai-studio-cricketcloseterp-2be2e18e-4031-4d60-99a3-500634b8d6be' },
    ] }],
  } } },
  status: { url: TARGET.origins[0], latestCreatedRevisionName: 'r1', latestReadyRevisionName: 'r1', conditions: [{ type: 'Ready', status: 'True' }] },
});

function fixture() {
  const state = { accounts: accounts(), config: config(), service: service(), policy: { bindings: [] }, token: jwt(), calls: [], requests: [], logs: [], starts: [], stopped: 0, ports: 0, time: now };
  const owned = { ended: false, done: new Promise(() => {}), stop: async () => { state.stopped++; } };
  const deps = {
    env: {}, now: () => state.time, log: message => state.logs.push(message),
    pause: async ms => { state.time += ms; },
    portFree: async () => { state.ports++; },
    start: args => { state.starts.push(args); return owned; },
    hold: async (_child, deadline) => { state.deadline = deadline; },
    cli: async args => {
      state.calls.push(args);
      if (args[0] === 'config') return JSON.stringify(state.config);
      if (args[0] === 'auth' && args[1] === 'list') return JSON.stringify(state.accounts);
      if (args[0] === 'auth' && args[1] === 'print-identity-token') return state.token;
      if (args[2] === 'describe') return JSON.stringify(state.service);
      if (args[2] === 'get-iam-policy') return JSON.stringify(state.policy);
      throw Error('Unexpected CLI command');
    },
    request: async (url, options) => {
      state.requests.push({ url, options });
      const { origin, pathname } = new URL(url);
      if (origin !== 'http://127.0.0.1:8080' && !options.headers['X-Serverless-Authorization']) return new Response('private', { status: 403 });
      if (pathname === '/api/health') return Response.json(healthBody);
      if (pathname === '/') return new Response(html, { headers: { 'content-security-policy': csp } });
      return Response.json({ error: { code: options.headers.Authorization ? 'INVALID_TOKEN' : 'UNAUTHENTICATED' } }, { status: 401 });
    },
  };
  return { state, owned, deps };
}
const issued = state => state.calls.some(args => args.includes('print-identity-token'));

// Acceptance: exact targets, private/write-disabled state, human identity, separate
// ingress/Firebase headers, safe failures, bounded lifetime and owned-tree cleanup.
test('CLI accepts only one explicit human account; no destination or token options', () => {
  assert.equal(parseAccount([`--account=${account}`]), account);
  for (const args of [[], ['--account=x'], ['--account=a@p.iam.gserviceaccount.com'], [`--account=${account}`, '--port=80'], ['--token=secret'], ['--account=person@example.com\nother@example.com']]) assert.throws(() => parseAccount(args));
});
test('identity requires matching active human and rejects alternate credential sources', () => {
  checkIdentity(account, accounts(), config(), {});
  for (const active of [[], [{ account: 'other@example.com', status: 'ACTIVE' }], [...accounts(), ...accounts()]]) assert.throws(() => checkIdentity(account, active, config(), {}));
  const wrong = config(); wrong.core.account = 'other@example.com';
  assert.throws(() => checkIdentity(account, accounts(), wrong, {}));
  for (const key of ['impersonate_service_account', 'access_token', 'access_token_file', 'credential_file_override', 'login_config_file', 'disable_credentials']) {
    const overridden = config(); overridden.auth[key] = 'present';
    assert.throws(() => checkIdentity(account, accounts(), overridden, {}));
  }
  assert.throws(() => checkIdentity(account, accounts(), { ...config(), api_endpoint_overrides: { run: 'https://evil.invalid' } }, {}));
  for (const key of ['CLOUDSDK_AUTH_ACCESS_TOKEN', 'CLOUDSDK_AUTH_IMPERSONATE_SERVICE_ACCOUNT', 'CLOUDSDK_API_ENDPOINT_OVERRIDES_RUN', 'CLOUDSDK_CORE_ACCOUNT']) assert.throws(() => checkIdentity(account, accounts(), config(), { [key]: 'present' }));
});
test('exact host allowlist rejects URL tricks before requests', () => {
  for (const origin of TARGET.origins) assert.equal(trustedOrigin(origin), origin);
  for (const origin of [undefined, 'https://evil.run.app', `${TARGET.origins[0]}/`, `${TARGET.origins[0]}:443`, `${TARGET.origins[0]}?x=1`, `${TARGET.origins[0]}#x`, `${TARGET.origins[0]}/path`, TARGET.origins[0].replace('https:', 'http:'), TARGET.origins[0].replace('https://', 'https://user@'), `${TARGET.origins[0]}.evil.invalid`]) assert.throws(() => trustedOrigin(origin));
});
test('human token claims bound lifetime to 25 minutes or expiry minus 60 seconds', () => {
  assert.equal(tokenDeadline(jwt(), account, now), now + 25 * 60_000);
  assert.equal(tokenDeadline(jwt({ exp: now / 1000 + 180 }), account, now), now + 120_000);
  for (const patch of [{ email: 'other@example.com' }, { email_verified: false }, { iss: 'https://evil.invalid' }, { sub: 'workforce/subject' }, { exp: now / 1000 + 120 }, { exp: '99999999999' }, { iat: now / 1000 + 61 }]) assert.throws(() => tokenDeadline(jwt(patch), account, now));
  for (const token of ['', 'bad', 'a.e30.c', 'a.b.c', 'x'.repeat(17_000)]) assert.throws(() => tokenDeadline(token, account, now));
});
test('full mocked run passes only intended GET/CLI checks and cleans own proxy', async () => {
  const { state, deps } = fixture();
  await runPreview(account, deps);
  assert.equal(state.starts.length, 1);
  assert.equal(state.stopped, 1);
  assert.equal(state.ports, 2);
  assert.equal(state.deadline, now + 25 * 60_000);
  assert.deepEqual(state.starts[0], ['run', 'services', 'proxy', TARGET.service, `--project=${TARGET.project}`, `--region=${TARGET.region}`, `--account=${account}`, '--port=8080', `--token=${state.token}`, '--quiet']);
  assert.equal(state.requests.length, 6);
  assert.equal(state.requests[0].options.headers['X-Serverless-Authorization'], undefined);
  assert.equal(state.requests[1].options.headers['X-Serverless-Authorization'], `Bearer ${state.token}`);
  assert.equal(state.requests[1].options.headers.Authorization, undefined);
  for (const { url, options } of state.requests) {
    assert.equal(options.method, 'GET'); assert.equal(options.redirect, 'error'); assert(options.signal instanceof AbortSignal);
    if (url.startsWith('http:')) assert.equal(options.headers['X-Serverless-Authorization'], undefined);
  }
  assert.equal(state.requests.at(-1).options.headers.Authorization, 'Bearer private-preview-invalid-token');
  assert(state.logs.some(line => line.startsWith('TRANSPORT PASS:')));
  assert(state.logs.some(line => line.includes('NOT verified')));
  assert(!state.logs.join('\n').includes(state.token));
  assert.deepEqual(state.calls.map(args => args.slice(0, 3).join(' ')), ['config list --all', 'auth list --format=json', 'run services describe', 'run services get-iam-policy', `auth print-identity-token --account=${account}`]);
});
test('numeric approved service origin also passes', async () => {
  const { state, deps } = fixture(); state.service.status.url = TARGET.origins[1];
  await runPreview(account, deps); assert.equal(state.stopped, 1);
});
test('busy port prevents every cloud command and never kills another proxy', async () => {
  const { state, deps } = fixture();
  deps.portFree = async () => { throw Error('occupied'); };
  await assert.rejects(runPreview(account, deps), /preflight/);
  assert.equal(state.calls.length, 0); assert.equal(state.stopped, 0);
});
test('environment override is refused before invoking gcloud', async () => {
  const { state, deps } = fixture(); deps.env = { CLOUDSDK_AUTH_ACCESS_TOKEN: 'synthetic-secret' };
  await assert.rejects(runPreview(account, deps), /environment overrides/);
  assert.equal(state.calls.length, 0);
});
test('wrong active account never reads service or generates a token', async () => {
  const { state, deps } = fixture(); state.accounts[0].account = 'wrong@example.com';
  await assert.rejects(runPreview(account, deps), /requested human account/);
  assert.equal(state.calls.length, 2); assert.equal(state.requests.length, 0); assert(!issued(state));
});
test('unsafe metadata and IAM stop before token generation or HTTP', async t => {
  const cases = {
    public: state => { state.policy.bindings = [{ members: ['allUsers'] }]; },
    authenticatedPublic: state => { state.policy.bindings = [{ members: ['allAuthenticatedUsers'] }]; },
    incompleteIAM: state => { state.policy = {}; },
    writes: state => { state.service.spec.template.spec.containers[0].env[0].value = 'true'; },
    wrongFirebase: state => { state.service.spec.template.spec.containers[0].env[1].value = TARGET.project; },
    invokerDisabled: state => { state.service.metadata.annotations = { 'run.googleapis.com/invoker-iam-disabled': 'true' }; },
    notReady: state => { state.service.status.conditions = []; },
    untrustedHost: state => { state.service.status.url = 'https://evil.run.app'; },
  };
  for (const [name, mutate] of Object.entries(cases)) await t.test(name, async () => {
    const { state, deps } = fixture(); mutate(state);
    await assert.rejects(runPreview(account, deps));
    assert(!issued(state)); assert.equal(state.requests.length, 0); assert.equal(state.starts.length, 0);
  });
});
test('unsigned success and redirect are refused before a token exists', async () => {
  for (const status of [200, 302, 307, 500]) {
    const { state, deps } = fixture(); deps.request = async () => new Response('', { status, headers: { location: 'https://evil.invalid' } });
    await assert.rejects(runPreview(account, deps), /unsigned ingress rejection/);
    assert(!issued(state)); assert.equal(state.starts.length, 0);
  }
});
test('wrong token identity or direct health stops before proxy launch', async () => {
  for (const badToken of [true, false]) {
    const { state, deps } = fixture();
    if (badToken) state.token = jwt({ email: 'wrong@example.com' });
    else { const request = deps.request; deps.request = (url, options) => options.headers['X-Serverless-Authorization'] ? new Response('ingress invalid_token', { status: 401 }) : request(url, options); }
    await assert.rejects(runPreview(account, deps)); assert.equal(state.starts.length, 0);
  }
});
test('second port check does not replace a listener that appeared during preflight', async () => {
  const { state, deps } = fixture(); let checks = 0;
  deps.portFree = async () => { if (++checks === 2) throw Error('busy'); };
  await assert.rejects(runPreview(account, deps)); assert.equal(state.starts.length, 0); assert.equal(state.stopped, 0);
});
test('readiness retries connection failures but only passes after real health', async () => {
  const { state, deps } = fixture(); const request = deps.request; let failures = 0;
  deps.request = (url, options) => { if (url.startsWith('http:') && failures++ < 2) throw Error('not listening'); return request(url, options); };
  await runPreview(account, deps); assert.equal(state.time, now + 500); assert.equal(state.stopped, 1);
});
test('readiness timeout and early exit clean up owned proxy', async () => {
  for (const exited of [false, true]) {
    const { state, deps, owned } = fixture(); const request = deps.request;
    owned.ended = exited;
    deps.request = (url, options) => { if (url.startsWith('http:')) throw Error('not ready'); return request(url, options); };
    await assert.rejects(runPreview(account, deps), exited ? /exited before readiness/ : /45 seconds/);
    assert.equal(state.stopped, 1); assert(!state.logs.some(line => line.startsWith('TRANSPORT PASS')));
  }
});
test('proxy wrong health, CSP and either session boundary all fail and clean up', async t => {
  const cases = [
    ['healthHTML', '/api/health', () => new Response('ingress', { status: 401 })],
    ['healthJSON', '/api/health', () => Response.json({ status: 'alive' })],
    ['CSP', '/', () => new Response(html, { headers: { 'content-security-policy': "script-src 'self' 'unsafe-inline'" } })],
    ['missingBearer', '/api/erp/session', () => Response.json({ error: { code: 'INVALID_TOKEN' } }, { status: 401 })],
    ['fakeBearer', '/api/erp/session', options => options.headers.Authorization ? new Response('Google Frontend', { status: 401 }) : Response.json({ error: { code: 'UNAUTHENTICATED' } }, { status: 401 })],
    ['dependencyUnavailable', '/api/erp/session', () => Response.json({ error: { code: 'AUTH_UNAVAILABLE' } }, { status: 503 })],
    ['unexpectedSuccess', '/api/erp/session', () => Response.json({ role: 'OWNER' })],
  ];
  for (const [name, path, response] of cases) await t.test(name, async () => {
    const { state, deps } = fixture(); const request = deps.request;
    deps.request = (url, options) => url === `http://127.0.0.1:8080${path}` ? response(options) : request(url, options);
    await assert.rejects(runPreview(account, deps)); assert.equal(state.stopped, 1);
    assert(!state.logs.some(line => line.startsWith('TRANSPORT PASS')));
  });
});
test('foreground child failure after PASS is still a failure, with cleanup', async () => {
  const { state, deps } = fixture(); deps.hold = async () => { throw Error(state.token); };
  await assert.rejects(runPreview(account, deps), error => !error.message.includes(state.token) && error.message.includes('foreground proxy lifetime'));
  assert.equal(state.stopped, 1);
});
test('operator interruption during verification or foreground holding cleans own proxy', async () => {
  for (const duringHold of [true, false]) {
    const { state, deps } = fixture(); const controller = new AbortController(); deps.signal = controller.signal;
    if (duringHold) deps.hold = async () => { controller.abort(); controller.signal.throwIfAborted(); };
    else { const request = deps.request; deps.request = (url, options) => { if (url.startsWith('http:')) { controller.abort(); throw Error('aborted'); } return request(url, options); }; }
    await runPreview(account, deps); assert.equal(state.stopped, 1);
    assert(state.logs.at(-1).startsWith('TRANSPORT STOP: interrupted'));
  }
});
test('unexpected errors and CLI failures never echo raw token/output', async () => {
  const { deps, state } = fixture(); deps.cli = async () => { throw Error(`raw output ${state.token}`); };
  await assert.rejects(runPreview(account, deps), error => !error.message.includes(state.token) && error.message.includes('suppressed'));
  assert(!failureMessage(Error(state.token)).includes(state.token));
});
test('request adapter refuses unapproved paths and local ingress tokens before fetch', async () => {
  let calls = 0; const options = { request: async () => { calls++; } };
  await assert.rejects(getResponse('https://evil.invalid', '/api/health', {}, options));
  await assert.rejects(getResponse(TARGET.origins[0], '/api/erp/commands', {}, options));
  await assert.rejects(getResponse('http://127.0.0.1:8080', '/api/health', { 'X-Serverless-Authorization': 'synthetic' }, options));
  assert.equal(calls, 0);
});
test('JSON type, size and response shape fail closed', async () => {
  const reply = await getResponse(TARGET.origins[0], '/api/health', {}, { request: async () => new Response(JSON.stringify(healthBody)) });
  assert.throws(() => checkHealth(reply));
  const malformed = await getResponse(TARGET.origins[0], '/api/health', {}, { request: async () => new Response('{', { headers: { 'content-type': 'application/json' } }) });
  assert.throws(() => checkHealth(malformed));
  await assert.rejects(getResponse(TARGET.origins[0], '/', {}, { request: async () => new Response('x'.repeat(262_145)) }), /size limit/);
  assert.throws(() => checkSession({ status: 401, json: { code: 'UNAUTHENTICATED' } }, 'UNAUTHENTICATED'));
  assert.throws(() => checkPage({ status: 200, text: html, headers: new Headers({ 'content-security-policy': `${csp}; script-src 'none'` }) }));
});

async function listen(server) {
  await new Promise((resolve, reject) => { server.once('error', reject); server.listen(0, '127.0.0.1', resolve); });
  return `http://127.0.0.1:${server.address().port}`;
}
async function close(server) { server.closeAllConnections(); await new Promise(resolve => server.close(resolve)); }

test('real local redirect cannot forward a synthetic credential to another server', async () => {
  let leaked = 0;
  const target = createServer((_req, res) => { leaked++; res.end('unexpected'); });
  const destination = await listen(target);
  const redirect = createServer((_req, res) => { res.writeHead(302, { location: destination }); res.end(); });
  const source = await listen(redirect);
  try {
    await assert.rejects(getResponse(TARGET.origins[0], '/api/health', { 'X-Serverless-Authorization': 'Bearer synthetic-only' }, { request: (_url, options) => fetch(source, options) }), /redirect/);
    assert.equal(leaked, 0);
  } finally { await close(redirect); await close(target); }
});
test('real local occupied port is reported without terminating its listener', async () => {
  const server = createServer((_req, res) => res.end('still here'));
  const origin = await listen(server);
  try {
    await assert.rejects(assertPortFree(server.address().port), /Ctrl\+C.*OLD proxy/);
    assert.equal(await (await fetch(origin)).text(), 'still here');
  } finally { await close(server); }
});
test('real owned process-group cleanup kills a TERM-resistant descendant after leader exit', { timeout: 10_000 }, async () => {
  const unrelated = createServer((_req, res) => res.end('unrelated'));
  const unrelatedOrigin = await listen(unrelated);
  const descendant = `const http = require('node:http'); process.on('SIGTERM', () => {}); const s = http.createServer((q,r) => r.end('owned')); s.listen(0, '127.0.0.1', () => console.log(JSON.stringify({pid: process.pid, port: s.address().port})));`;
  const leader = `const {spawn} = require('node:child_process'); spawn(process.execPath, ['-e', ${JSON.stringify(descendant)}], {stdio: ['ignore', 'inherit', 'ignore']}); process.on('SIGTERM', () => process.exit(0)); setInterval(() => {}, 1000);`;
  const owned = spawnOwned(process.execPath, ['-e', leader], { capture: true });
  try {
    let info;
    for (let i = 0; i < 200; i++) {
      const line = owned.result().output.trim();
      if (line) { info = JSON.parse(line); break; }
      await sleep(20);
    }
    assert(info, 'owned descendant must actually start');
    assert.equal(await (await fetch(`http://127.0.0.1:${info.port}`)).text(), 'owned');
    await owned.stop(); await owned.stop(); // idempotent; no second group signal
    assert(owned.ended);
    await assert.rejects(fetch(`http://127.0.0.1:${info.port}`, { signal: AbortSignal.timeout(1000) }));
    // A zombie can remain until the host reaps it, but must not be running.
    try { assert.match(await readFile(`/proc/${info.pid}/stat`, 'utf8'), /^\d+ \(.+\) [ZX] /); }
    catch (error) { if (error.code !== 'ENOENT') throw error; }
    assert.equal(await (await fetch(unrelatedOrigin)).text(), 'unrelated');
  } finally { await owned.stop(); await close(unrelated); }
});
test('missing executable is contained and cleanup is safe', async () => {
  const owned = spawnOwned('/nonexistent-private-preview-test-command', []);
  try { assert.equal((await owned.done).code, null); assert(owned.ended); }
  finally { await owned.stop(); }
});
test('gcloud adapter disables credential-bearing logs and cleans up successful commands', async () => {
  let stopped = 0;
  const result = await runGcloud(['auth', 'print-identity-token'], { launch: (command, args, options) => {
    assert.equal(command, 'gcloud'); assert.equal(args.at(-1), '--quiet'); assert(options.capture);
    assert.equal(options.env.CLOUDSDK_CORE_DISABLE_FILE_LOGGING, '1');
    assert.equal(options.env.CLOUDSDK_CORE_LOG_HTTP, '0');
    assert.equal(options.env.CLOUDSDK_CORE_VERBOSITY, 'error');
    assert.equal(options.env.CLOUDSDK_CORE_DISABLE_PROMPTS, '1');
    return { done: Promise.resolve({ code: 0 }), result: () => ({ output: ' synthetic-only\n', overflow: false }), stop: async () => { stopped++; } };
  } });
  assert.equal(result, 'synthetic-only'); assert.equal(stopped, 1);
});
test('gcloud adapter rejects error/oversized output without exposing it', async () => {
  for (const overflow of [false, true]) {
    let stopped = 0;
    await assert.rejects(runGcloud([], { launch: () => ({
      done: Promise.resolve({ code: overflow ? 0 : 1 }), result: () => ({ output: 'synthetic-secret-output', overflow }), stop: async () => { stopped++; },
    }) }), error => /raw output suppressed/.test(error.message) && !error.message.includes('synthetic-secret'));
    assert.equal(stopped, 1);
  }
});
test('real local CLI timeout and cancellation terminate their own child', { timeout: 10_000 }, async () => {
  for (const cancel of [false, true]) {
    let owned;
    const controller = new AbortController();
    const result = runGcloud([], { timeout: cancel ? 5000 : 100, signal: controller.signal, launch: () => {
      owned = spawnOwned(process.execPath, ['-e', 'setInterval(() => {}, 1000)']);
      return owned;
    } });
    if (cancel) controller.abort();
    await assert.rejects(result, cancel ? /abort/i : /timed out/);
    assert(owned.ended);
  }
});
test('CLI missing arguments fails without credentials or raw stack', () => {
  const result = spawnSync(process.execPath, [new URL('./start-private-preview.mjs', import.meta.url).pathname], { encoding: 'utf8', timeout: 5000 });
  assert.equal(result.status, 1); assert.match(result.stderr, /TRANSPORT FAIL: Usage:/); assert.doesNotMatch(result.stderr, /at main|Error:/);
});
test('suite naming is included by the existing unit runner', async () => {
  const runner = await readFile(new URL('./run-tests.mjs', import.meta.url), 'utf8');
  assert(runner.includes("'scripts'"));
  const pattern = runner.match(/const integration = (\/[^\n]+\/i);/);
  assert(pattern);
  const filter = new RegExp(pattern[1].slice(1, -2), 'i');
  assert(!filter.test('scripts/private-preview-helper.test.mjs'));
  assert(/\.(test|spec)\.(ts|tsx|js|mjs|cjs)$/.test('private-preview-helper.test.mjs'));
});
