import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { checkUpload, checkRoles, checkService, checkLive } from './verify-cloud-preview.mjs';
const host = 'gen-lang-client-0501182238';
const runtime = `thariktha-preview-runtime@${host}.iam.gserviceaccount.com`;
const builder = `thariktha-preview-build@${host}.iam.gserviceaccount.com`;
const upload = 'Dockerfile\npackage-lock.json\nserver.ts\nscripts/verify-build.mjs\nsrc/main.tsx\n';
const cleanText = () => '// public source';
const hostPolicy = { bindings: [{ role: 'roles/run.builder', members: [`serviceAccount:${builder}`] }] };
const firebasePolicy = { bindings: ['roles/datastore.viewer', 'roles/firebaseauth.viewer'].map(role => ({ role, members: [`serviceAccount:${runtime}`] })) };
const service = () => ({
  metadata: { name: 'thariktha-preview', labels: { 'managed-by': 'hermes-private-preview' } },
  spec: { template: { metadata: { annotations: { 'autoscaling.knative.dev/maxScale': '1', 'autoscaling.knative.dev/minScale': '0' } }, spec: { serviceAccountName: runtime, containers: [{ env: [
    { name: 'ERP_SCHEMA_APPROVED', value: 'false' },
    { name: 'GOOGLE_CLOUD_PROJECT', value: 'cricket-closet-imphal' },
    { name: 'FIRESTORE_DATABASE_ID', value: 'ai-studio-cricketcloseterp-2be2e18e-4031-4d60-99a3-500634b8d6be' },
  ] }] } } },
  status: { url: 'https://thariktha-preview.example.run.app', latestCreatedRevisionName: 'r1', latestReadyRevisionName: 'r1', conditions: [{ type: 'Ready', status: 'True' }] },
});
const request = async (url, options = {}) => {
  const path = new URL(url).pathname;
  if (!options.headers?.['X-Serverless-Authorization']) return new Response('Private', { status: 403 });
  if (path === '/api/health') return Response.json({ status: 'alive', persistence: 'Firestore', service: 'Talk of the Town Cricket Closet ERP' });
  if (path === '/') return new Response('<title>Talk of the Town Cricket Closet ERP</title><script src="/assets/index.js"></script><link href="/assets/index.css">');
  if (path.startsWith('/assets/')) return new Response('asset');
  if (path.startsWith('/api/erp/') || path === '/api/ready') return new Response('Denied', { status: 401 });
  return new Response('Missing', { status: 404 });
};

test('private deployment shell parses and has explicit cost/identity approval', () => {
  const file = new URL('./deploy-cloud-shell.sh', import.meta.url);
  assert.equal(spawnSync('bash', ['-n', file.pathname]).status, 0);
  const text = readFileSync(file, 'utf8');
  assert.match(text, /set -euo pipefail/);
  assert.match(text, /DEPLOY PRIVATE/);
  assert.match(text, /--no-allow-unauthenticated/);
  assert.match(text, /--max-instances=1/);
  assert.match(text, /--build-service-account=/);
  assert.match(text, /GOOGLE_CLOUD_PROJECT=\$FIREBASE_PROJECT/);
  assert.doesNotMatch(text, /roles\/(?:owner|editor)|--allow-unauthenticated|ERP_SCHEMA_APPROVED=true|service-accounts keys create/);
});
test('upload boundary permits only required public build source', () => assert.equal(checkUpload(upload, cleanText), 5));
test('upload boundary denies traversal, unknown files and private filenames', () => {
  for (const extra of ['../key', '.env', 'src/.env.local', 'src/service-account.json', 'public/credentials.json', 'scripts/deploy-cloud-shell.sh', 'dist/index.html']) assert.throws(() => checkUpload(upload + extra + '\n', cleanText));
});
test('upload boundary rejects privileged key content in allowlisted source', () => assert.throws(() => checkUpload(upload, () => '"private_key": "fixture"')));
test('upload boundary rejects empty or incomplete context', () => { assert.throws(() => checkUpload('', cleanText)); assert.throws(() => checkUpload('Dockerfile\n', cleanText)); });
test('dedicated account roles separate build from Firebase runtime reads', () => checkRoles(hostPolicy, firebasePolicy));
test('dedicated account roles reject Editor and missing read roles', () => {
  const extra = structuredClone(hostPolicy); extra.bindings.push({ role: 'roles/editor', members: [`serviceAccount:${runtime}`] });
  assert.throws(() => checkRoles(extra, firebasePolicy));
  assert.throws(() => checkRoles(hostPolicy, { bindings: [] }));
});
test('service verification accepts correct private ready cross-project configuration', () => checkService(service(), { bindings: [] }));
test('service verification rejects public IAM, Firebase mismatch, emulator and enabled writes', () => {
  assert.throws(() => checkService(service(), { bindings: [{ members: ['allUsers'] }] }));
  for (const [name, value] of [['ERP_SCHEMA_APPROVED', 'true'], ['GOOGLE_CLOUD_PROJECT', host], ['FIRESTORE_EMULATOR_HOST', '127.0.0.1:8080']]) {
    const s = service(); const env = s.spec.template.spec.containers[0].env; const found = env.find(x => x.name === name); if(found) found.value=value; else env.push({name,value});
    assert.throws(() => checkService(s, { bindings: [] }));
  }
  const s = service(); s.metadata.annotations = { 'run.googleapis.com/invoker-iam-disabled': 'true' }; assert.throws(() => checkService(s, { bindings: [] }));
});
test('live checks verify shell/assets/private IAM without passing Run token as Firebase bearer', async () => {
  await checkLive('https://thariktha-preview.example.run.app', 'synthetic-identity', async (url, options) => {
    assert(!options?.headers?.Authorization); assert.equal(options?.redirect, 'error'); return request(url, options);
  });
});
test('live checks reject publicly reachable service and application API leakage', async () => {
  await assert.rejects(checkLive('https://thariktha-preview.example.run.app', 'synthetic', async (url, options) => !options?.headers ? new Response('Public') : request(url, options)));
  await assert.rejects(checkLive('https://thariktha-preview.example.run.app', 'synthetic', async (url, options) => new URL(url).pathname === '/api/erp/session' ? Response.json({ role: 'OWNER' }) : request(url, options)));
});
test('live checks reject arbitrary credential destinations before any request', async () => {
  for (const url of ['http://example.run.app', 'https://example.com', 'https://user@example.run.app', 'https://example.run.app?x=1']) {
    await assert.rejects(checkLive(url, 'synthetic', () => { throw Error('Must not request'); }));
  }
});
