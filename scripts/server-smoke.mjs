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
  const html = await index.text();
  assert.match(html, /<div id="root"><\/div>/);
  assert.match(html, /<title>Talk of the Town Cricket Closet ERP<\/title>/);
  const styles = html.match(/href="([^"]+\.css)"/);
  assert(styles, 'Built shell must load its stylesheet');
  const cssResponse = await fetch(`http://127.0.0.1:${port}${styles[1]}`);
  assert.equal(cssResponse.status, 200);
  assert.match(await cssResponse.text(), /\.erp-input/);

  const unauthorized = await fetch(`http://127.0.0.1:${port}/api/erp/session`);
  assert.equal(unauthorized.status, 401);
  const error = await unauthorized.json();
  assert.equal(error.error.code, 'UNAUTHENTICATED');
  for (const route of ['/api/ready', '/api/erp/customers']) {
    const denied = await fetch(`http://127.0.0.1:${port}${route}`);
    assert.equal(denied.status, 401);
    assert.equal((await denied.json()).error.code, 'UNAUTHENTICATED');
  }
  const deniedWrite = await fetch(`http://127.0.0.1:${port}/api/erp/commands`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ entity: 'customers', action: 'create', data: { name: 'Must not commit' }, idempotencyKey: 'smoke-no-auth' }),
  });
  assert.equal(deniedWrite.status, 401);
  const legacy = await fetch(`http://127.0.0.1:${port}/api/query`);
  assert.equal(legacy.status, 404);
  assert.equal((await legacy.json()).error.code, 'NOT_FOUND');
  console.log('PASS: built server serves the correct ERP shell and styles; health is alive; customer reads/writes and readiness require authentication; legacy query route is inactive.');
} finally {
  await stop();
}
