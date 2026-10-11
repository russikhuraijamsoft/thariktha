import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { spawnSync } from 'node:child_process';

const host = 'gen-lang-client-0501182238';
const firebase = 'cricket-closet-imphal';
const database = 'ai-studio-cricketcloseterp-2be2e18e-4031-4d60-99a3-500634b8d6be';
const runtime = `thariktha-preview-runtime@${host}.iam.gserviceaccount.com`;
const builder = `thariktha-preview-build@${host}.iam.gserviceaccount.com`;
const readJSON = file => JSON.parse(readFileSync(file, 'utf8'));

export function checkUpload(text, read = file => readFileSync(file, 'utf8')) {
  const files = text.trim().split(/\r?\n/).filter(Boolean);
  assert(files.length > 0, 'Upload list is empty');
  for (const file of files) {
    assert(!file.startsWith('/') && !file.split('/').includes('..'), 'Unexpected upload path');
    assert(!/(?:^|\/)(?:\.env(?:\.|$)|\.git|node_modules|legacy-ui|dist|server-dist)|credentials|service-account|\.pem$|\.key$/i.test(file), `Private/unwanted path: ${file}`);
    assert(/^(?:Dockerfile|\.dockerignore|\.gcloudignore|package(?:-lock)?\.json|index\.html|tsconfig\.json|vite\.config\.ts|firebase-applet-config\.json|server\.ts|scripts\/verify-build\.mjs)$/.test(file) || /^(?:src|shared|server|public)\//.test(file), `Unapproved upload path: ${file}`);
    if (/\.(?:json|[cm]?js|tsx?|html|css|svg|txt|md)$/.test(file)) {
      assert(!/-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----|"private_key"\s*:|"refresh_token"\s*:|\bgh[pousr]_[A-Za-z0-9]{20,}/.test(read(file)), `Privileged credential pattern: ${file}`);
    }
  }
  for (const required of ['Dockerfile', 'package-lock.json', 'server.ts', 'scripts/verify-build.mjs']) assert(files.includes(required), `Required file excluded: ${required}`);
  return files.length;
}

export function checkRoles(hostPolicy, firebasePolicy) {
  const allowed = new Map([
    [`host:${builder}`, new Set(['roles/run.builder'])],
    [`host:${runtime}`, new Set()],
    [`firebase:${builder}`, new Set()],
    [`firebase:${runtime}`, new Set(['roles/datastore.viewer', 'roles/firebaseauth.viewer'])],
  ]);
  for (const [scope, policy] of [['host', hostPolicy], ['firebase', firebasePolicy]]) {
    for (const account of [builder, runtime]) {
      const roles = (policy.bindings || []).filter(b => b.members?.includes(`serviceAccount:${account}`)).map(b => b.role);
      assert(roles.every(role => allowed.get(`${scope}:${account}`).has(role)), `Unexpected ${scope} role for dedicated ${account}`);
      for (const role of allowed.get(`${scope}:${account}`)) assert(roles.includes(role), `Missing ${scope} ${role}`);
    }
  }
}

export function checkService(service, policy) {
  assert.equal(service.metadata?.name, 'thariktha-preview');
  assert.equal(service.metadata?.labels?.['managed-by'], 'hermes-private-preview');
  assert.equal(service.spec?.template?.spec?.serviceAccountName, runtime);
  assert.equal(service.spec?.template?.spec?.containers?.length, 1);
  const scaling = service.spec?.template?.metadata?.annotations || {};
  assert.equal(scaling['autoscaling.knative.dev/maxScale'], '1');
  assert(['0', undefined].includes(scaling['autoscaling.knative.dev/minScale']));
  const env = Object.fromEntries(service.spec.template.spec.containers[0].env.map(x => [x.name, x.value]));
  assert.equal(env.GOOGLE_CLOUD_PROJECT, firebase);
  assert.equal(env.FIRESTORE_DATABASE_ID, database);
  assert.equal(env.ERP_SCHEMA_APPROVED, 'false');
  assert(!('GOOGLE_APPLICATION_CREDENTIALS' in env));
  assert(!Object.keys(env).some(x => /EMULATOR/.test(x)));
  assert(!(policy.bindings || []).some(x => x.members?.some(m => ['allUsers', 'allAuthenticatedUsers'].includes(m))), 'Service is publicly accessible');
  for (const annotations of [service.metadata?.annotations, service.spec?.template?.metadata?.annotations]) assert.notEqual(annotations?.['run.googleapis.com/invoker-iam-disabled'], 'true');
  assert(service.status?.conditions?.some(x => x.type === 'Ready' && x.status === 'True'), 'Service is not ready');
  assert.equal(service.status.latestCreatedRevisionName, service.status.latestReadyRevisionName);
  assert.match(service.status.url, /^https:\/\/[a-z0-9.-]+\.run\.app$/);
}

export async function checkLive(url, token, request = fetch) {
  const parsed = new URL(url);
  assert.equal(parsed.protocol, 'https:');
  assert(parsed.hostname.endsWith('.run.app') && parsed.pathname === '/' && !parsed.search && !parsed.username && !parsed.password);
  const get = (path, options = {}) => request(`${parsed.origin}${path}`, { ...options, redirect: 'error', headers: { 'X-Serverless-Authorization': `Bearer ${token}`, ...options.headers }, signal: AbortSignal.timeout(20000) });
  const health = await get('/api/health');
  assert.equal(health.status, 200);
  const h = await health.json();
  assert.equal(h.status, 'alive');
  assert.equal(h.persistence, 'Firestore');
  assert.equal(h.service, 'Talk of the Town Cricket Closet ERP');
  const page = await get('/');
  assert.equal(page.status, 200);
  const html = await page.text();
  assert(html.includes('<title>Talk of the Town Cricket Closet ERP</title>'));
  const assets = [...html.matchAll(/(?:src|href)="(\/assets\/[^"?#]+\.(?:js|css))"/g)].map(x => x[1]);
  assert(assets.some(x => x.endsWith('.js')) && assets.some(x => x.endsWith('.css')));
  for (const path of assets) { const asset = await get(path); assert.equal(asset.status, 200); assert((await asset.text()).length > 0); }
  for (const path of ['/api/erp/session', '/api/erp/customers', '/api/ready']) assert.equal((await get(path)).status, 401, `Anonymous app access: ${path}`);
  assert.equal((await get('/api/erp/commands', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}' })).status, 401);
  for (const path of ['/api/unknown/path', '/.env', '/package.json', '/server.ts']) assert.equal((await get(path)).status, 404, `Private/missing path: ${path}`);
  // The Run IAM token goes in X-Serverless-Authorization, never in Firebase's bearer header.
  const anonymous = await request(`${parsed.origin}/api/health`, { redirect: 'error', signal: AbortSignal.timeout(20000) });
  assert([401, 403].includes(anonymous.status), 'Private preview is reachable without Cloud Run IAM authentication');
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  const [mode, ...args] = process.argv.slice(2);
  if (mode === '--check-upload') console.log(`Upload boundary verified: ${checkUpload(readFileSync(args[0], 'utf8'))} files`);
  else if (mode === '--check-roles') { checkRoles(readJSON(args[0]), readJSON(args[1])); console.log('Dedicated identity project-role boundary verified (inherited organization permissions are not audited)'); }
  else if (mode === '--check-service') { checkService(readJSON(args[0]), readJSON(args[1])); console.log('Ready revision, private service IAM, Firebase target and write-disabled configuration verified'); }
  else if (mode === '--check-live') {
    const result = spawnSync('gcloud', ['auth', 'print-identity-token'], { encoding: 'utf8' });
    assert.equal(result.status, 0, 'Could not obtain operator identity token');
    const token = result.stdout.trim();
    assert(token, 'Missing operator identity token');
    await checkLive(args[0], token);
    console.log('Live private HTTPS shell/assets, liveness and anonymous app/API denial checks passed; real Firebase login/readiness remain unverified');
  } else throw Error('Expected --check-upload, --check-roles, --check-service or --check-live');
}
