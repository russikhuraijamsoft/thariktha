import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { emulatorEnvironment } from './test-environment.mjs';

test('emulator runner uses only the isolated demo project and strips credentials', () => {
  const env = emulatorEnvironment({ GOOGLE_APPLICATION_CREDENTIALS: '/private/account.json', FIREBASE_TOKEN: 'not-a-real-token' });
  assert.equal(env.FIRESTORE_EMULATOR_HOST, '127.0.0.1:8089');
  assert.equal(env.GCLOUD_PROJECT, 'demo-thariktha');
  assert.equal(env.FIRESTORE_DATABASE_ID, '(default)');
  assert.equal(env.ERP_SCHEMA_APPROVED, 'false');
  assert.equal(env.GOOGLE_APPLICATION_CREDENTIALS, undefined);
  assert.equal(env.FIREBASE_TOKEN, undefined);
});

test('emulator runner rejects production project and remote endpoints', () => {
  assert.throws(() => emulatorEnvironment({ FIRESTORE_EMULATOR_HOST: 'example.com:8089' }), /refusing another endpoint/);
  assert.throws(() => emulatorEnvironment({ GCLOUD_PROJECT: 'production' }), /Refusing non-test/);
});

test('build outputs are separated, and lint intentionally runs the TypeScript gate', async () => {
  const manifest = JSON.parse(await readFile(new URL('../package.json', import.meta.url), 'utf8'));
  assert.match(manifest.scripts['build:server'], /--outfile=server-dist\/server\.cjs/);
  assert.equal(manifest.scripts.lint, 'npm run typecheck');
  assert.equal(manifest.scripts.typecheck, 'tsc --noEmit');
  assert.equal(manifest.scripts.start, 'node scripts/start-server.mjs');
  assert.equal(manifest.scripts.preview, manifest.scripts.start, 'Preview must serve the ERP API, not just static Vite assets');
  assert.equal(manifest.scripts.dev, 'tsx server.ts');
});

test('all configured emulator services bind to loopback and use the rules file', async () => {
  const config = JSON.parse(await readFile(new URL('../firebase.json', import.meta.url), 'utf8'));
  assert.equal(config.emulators.firestore.host, '127.0.0.1');
  assert.equal(config.emulators.firestore.port, 8089);
  assert.equal(config.emulators.ui.enabled, false);
  assert.equal(config.firestore.rules, 'firestore.rules');
});

test('legacy designs are not active compilation or Tailwind sources; shared ERP controls are styled', async () => {
  const config = JSON.parse(await readFile(new URL('../tsconfig.json', import.meta.url), 'utf8'));
  assert(config.include.includes('src') && config.include.includes('server') && config.include.includes('tests'));
  assert(!config.include.some(path => path.includes('legacy-ui') || path === '**/*'));
  const css = await readFile(new URL('../src/index.css', import.meta.url), 'utf8');
  assert.match(css, /@import "tailwindcss" source\(none\);/);
  assert.match(css, /@source "\.\/";/);
  assert.match(css, /@source "\.\.\/index\.html";/);
  assert.doesNotMatch(css, /@source[^;]*legacy-ui/);
  for (const name of ['erp-button', 'erp-primary', 'erp-input', 'erp-panel', 'erp-error', 'erp-table']) {
    assert(css.includes(`.${name}`), `Missing shared control style: ${name}`);
  }
});
