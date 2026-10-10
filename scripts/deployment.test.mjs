import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
const read = name => readFile(new URL(`../${name}`, import.meta.url), 'utf8');

test('deployment recipe builds both artifacts from the lockfile on Node 22', async () => {
  const docker = await read('Dockerfile');
  assert.match(docker, /FROM node:22-bookworm-slim AS build/);
  assert.match(docker, /COPY package\.json package-lock\.json \.\//);
  assert.match(docker, /RUN npm ci --no-audit --no-fund/);
  assert.match(docker, /COPY scripts\/verify-build\.mjs/);
  assert.match(docker, /RUN npm run build/);
  assert.doesNotMatch(docker, /COPY\s+\.\s|ADD\s|npm install/);
});

test('runtime recipe is non-root, same-origin, keyless and write-disabled by default', async () => {
  const docker = await read('Dockerfile');
  const runtime = docker.split('AS runtime')[1];
  assert(runtime);
  assert.match(runtime, /HOST=0\.0\.0\.0 PORT=8080 ERP_SCHEMA_APPROVED=false/);
  assert.match(runtime, /npm ci --omit=dev --ignore-scripts/);
  assert.match(runtime, /USER node/);
  assert.match(runtime, /CMD \["node", "server-dist\/server\.cjs"\]/);
  assert.match(runtime, /\/app\/dist\/ \.\/dist\//);
  assert.match(runtime, /\/app\/server-dist\/server\.cjs \.\/server-dist\/server\.cjs/);
  assert.doesNotMatch(runtime, /GOOGLE_APPLICATION_CREDENTIALS|FIREBASE_TOKEN|ERP_SCHEMA_APPROVED=true|FIRESTORE_EMULATOR_HOST|COPY.*(?:server\.cjs\.map|src\/|legacy-ui|\.env)/);
});

test('container context starts denied and explicitly excludes common credential paths', async () => {
  const ignore = await read('.dockerignore');
  const rules = ignore.split('\n').map(s => s.trim()).filter(s => s && !s.startsWith('#'));
  assert.equal(rules[0], '**');
  for (const rule of ['!package-lock.json', '!server.ts', '!src/**', '!shared/**', '!server/**', '!public/**', '!scripts/verify-build.mjs']) assert(rules.includes(rule), rule);
  for (const rule of ['**/.env', '**/.env.*', '**/.git/**', '**/node_modules/**', '**/*service-account*', '**/*credentials*', '**/*.pem', '**/*.key', '**/application_default_credentials.json']) {
    assert(rules.includes(rule), rule);
    assert(rules.lastIndexOf(rule) > rules.lastIndexOf('!public/**'), `Credential exclusion must follow inclusions: ${rule}`);
  }
  assert(!rules.some(s => /^!(?:\*|\.env|legacy-ui|node_modules|dist|server-dist)/.test(s)));
});

test('Cloud Build upload uses the bounded Docker context, not the entire working tree', async () => {
  const ignore = await read('.gcloudignore');
  assert.match(ignore, /^#!include:\.dockerignore$/m);
  assert.doesNotMatch(ignore, /^!\*\*/m);
});

test('deployment notes preserve approval and native authentication boundaries', async () => {
  const doc = await read('docs/CLOUD-RUN.md');
  for (const text of ['not a deployment', 'ERP_SCHEMA_APPROVED=false', 'possible costs', 'actual upload list', 'Google OAuth', 'rate limiter', 'digest-pinned']) assert(doc.includes(text), text);
  const app = await read('server/app.ts');
  assert.match(app, /createAuthenticate\(auth, db\)/);
  assert.match(app, /app\.post\('\/api\/erp\/commands', authenticate/);
  const admin = await read('server/firebase-admin.ts');
  assert.match(admin, /applicationDefault\(\)/);
});
