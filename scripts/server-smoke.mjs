import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../', import.meta.url));
const port = 39119;
const env = {
  ...process.env,
  NODE_ENV: 'production',
  HOST: '127.0.0.1',
  PORT: String(port),
  GOOGLE_CLOUD_PROJECT: 'demo-thariktha',
  FIRESTORE_DATABASE_ID: '(default)',
  ERP_SCHEMA_APPROVED: 'false',
};
const child = spawn(process.execPath, ['server-dist/server.cjs'], {
  cwd: root,
  env,
  stdio: ['ignore', 'pipe', 'pipe'],
});
let output = '';
child.stdout.on('data', chunk => { output += chunk; });
child.stderr.on('data', chunk => { output += chunk; });

async function stop() {
  if (child.exitCode === null) {
    child.kill('SIGTERM');
    await new Promise(resolve => child.once('exit', resolve));
  }
}

try {
  let response;
  for (let attempt = 0; attempt < 40; attempt += 1) {
    if (child.exitCode !== null) throw new Error(`server exited before readiness: ${output}`);
    try {
      response = await fetch(`http://127.0.0.1:${port}/api/health`, { signal: AbortSignal.timeout(500) });
      break;
    } catch {
      await new Promise(resolve => setTimeout(resolve, 250));
    }
  }
  assert(response, `server did not become ready: ${output}`);
  assert.equal(response.status, 200);
  const health = await response.json();
  assert.equal(health.persistence, 'Firestore');
  assert.equal(response.headers.get('x-content-type-options'), 'nosniff');
  assert.equal(response.headers.get('x-frame-options'), 'DENY');

  const index = await fetch(`http://127.0.0.1:${port}/`);
  assert.equal(index.status, 200);
  assert.match(await index.text(), /<div id="root"><\/div>/);

  const unauthorized = await fetch(`http://127.0.0.1:${port}/api/erp/session`);
  assert.equal(unauthorized.status, 401);
  const error = await unauthorized.json();
  assert.equal(error.error.code, 'UNAUTHENTICATED');
  console.log('PASS: built server starts, serves the ERP shell, exposes health, and protects authenticated API routes.');
} finally {
  await stop();
}
