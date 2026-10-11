import test from 'node:test';
import assert from 'node:assert/strict';
import { createApp } from '../server/app.ts';

// Exercise the real Express middleware, not a copied policy string. No Firebase
// calls are needed for /api/health or a missing-token session request.
test('production policy permits Firebase GAPI scripts without broad script trust', async () => {
  const db = { collection() { throw new Error('Unexpected database access'); } };
  const auth = { verifyIdToken() { throw new Error('Unexpected identity lookup'); } };
  const server = createApp(db, auth, { production: true }).listen(0, '127.0.0.1');
  try {
    await new Promise((resolve, reject) => { server.once('listening', resolve); server.once('error', reject); });
    const origin = `http://127.0.0.1:${server.address().port}`;
    const response = await fetch(`${origin}/api/health`);
    assert.equal(response.status, 200);
    const policy = response.headers.get('content-security-policy');
    assert(policy, 'Production middleware must send CSP');
    const directives = new Map(policy.split(';').filter(s => s.trim()).map(s => {
      const [name, ...values] = s.trim().split(/\s+/);
      return [name, values];
    }));
    const scripts = directives.get('script-src');
    // Exact allowlist rejects unsafe-inline/eval, scheme-wide allowances and wildcards.
    assert.deepEqual(scripts, ["'self'", 'https://apis.google.com']);
    for (const url of [
      'https://apis.google.com/js/api.js?onload=iframefcb123',
      'https://apis.google.com/_/scs/abc-static/_/js/k=gapi.test/m=gapi.iframes',
    ]) assert(scripts.includes(new URL(url).origin), `Blocked required GAPI script: ${url}`);
    for (const url of ['https://evil.example/script.js', 'https://apis.google.com.evil.example/api.js', 'http://apis.google.com/js/api.js', 'https://other.googleapis.com/api.js']) {
      assert(!scripts.includes(new URL(url).origin), `Unexpected script trust: ${url}`);
    }
    assert.deepEqual(directives.get('object-src'), ["'none'"]);
    assert.deepEqual(directives.get('base-uri'), ["'self'"]);
    assert.deepEqual(directives.get('frame-ancestors'), ["'none'"]);
    assert.equal(response.headers.get('x-frame-options'), 'DENY');
    assert.equal(response.headers.get('x-content-type-options'), 'nosniff');
    const denied = await fetch(`${origin}/api/erp/session`);
    assert.equal(denied.status, 401);
    assert.equal((await denied.json()).error.code, 'UNAUTHENTICATED');
    assert.equal(denied.headers.get('content-security-policy'), policy);
  } finally {
    await new Promise((resolve, reject) => server.close(error => error ? reject(error) : resolve()));
  }
});
