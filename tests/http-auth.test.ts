import test, { after, before } from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { createServer, type Server } from 'node:http';
import { initializeApp, deleteApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import type { Auth } from 'firebase-admin/auth';
import { createApp } from '../server/app';

assert.equal(process.env.FIRESTORE_EMULATOR_HOST, '127.0.0.1:8089');
const firebaseApp = initializeApp({ projectId: 'demo-thariktha' }, `http-${randomUUID()}`);
const db = getFirestore(firebaseApp);
const uid = `http-owner-${randomUUID()}`;
const fakeAuth: Pick<Auth, 'verifyIdToken'> = {
  verifyIdToken: async (token: string) => {
    if (token === 'bad-token') {
      const error = Object.assign(new Error('invalid token'), { code: 'auth/invalid-id-token' });
      throw error;
    }
    return { uid: token } as any;
  },
};
const app = createApp(db, fakeAuth, { production: true });
let server: Server;
let baseUrl = '';

before(async () => {
  await db.collection('users').doc(uid).set({
    uid,
    name: 'HTTP test owner',
    roleId: 'OWNER',
    companyId: `http-company-${uid}`,
    branchId: 'main',
    status: 'active',
  });
  server = await new Promise<Server>((resolve, reject) => {
    const instance = createServer(app);
    instance.once('error', reject);
    instance.listen(0, '127.0.0.1', () => resolve(instance));
  });
  const address = server.address();
  assert(address && typeof address !== 'string');
  baseUrl = `http://127.0.0.1:${address.port}`;
});

after(async () => {
  await new Promise<void>(resolve => server.close(() => resolve()));
  await db.terminate();
  await deleteApp(firebaseApp);
});

async function request(path: string, init: RequestInit = {}) {
  const response = await fetch(`${baseUrl}${path}`, init);
  const text = await response.text();
  return { response, body: text ? JSON.parse(text) : null };
}

function bearer(token: string): RequestInit {
  return { headers: { authorization: `Bearer ${token}` } };
}

test('health is public and authenticated API responses carry security headers', async () => {
  const { response, body } = await request('/api/health');
  assert.equal(response.status, 200);
  assert.equal(body.status, 'alive');
  assert.equal(response.headers.get('x-content-type-options'), 'nosniff');
  assert.equal(response.headers.get('x-frame-options'), 'DENY');
  assert.match(response.headers.get('content-security-policy') || '', /default-src 'self'/);
});

test('API rejects missing and invalid authentication without exposing internals', async () => {
  const missing = await request('/api/erp/session');
  assert.equal(missing.response.status, 401);
  assert.equal(missing.body.error.code, 'UNAUTHENTICATED');

  const invalid = await request('/api/erp/session', bearer('bad-token'));
  assert.equal(invalid.response.status, 401);
  assert.equal(invalid.body.error.code, 'INVALID_TOKEN');
  assert(!JSON.stringify(invalid.body).includes('stack'));
});

test('API requires an active scoped profile and derives the actor server-side', async () => {
  const missingProfile = await request('/api/erp/session', bearer(`unprovisioned-${uid}`));
  assert.equal(missingProfile.response.status, 403);
  assert.equal(missingProfile.body.error.code, 'PROFILE_REQUIRED');

  const session = await request('/api/erp/session', bearer(uid));
  assert.equal(session.response.status, 200);
  assert.deepEqual(session.body, {
    uid,
    role: 'OWNER',
    companyId: `http-company-${uid}`,
    branchId: 'main',
    name: 'HTTP test owner',
  });
});

test('authenticated readiness and API miss behavior are explicit', async () => {
  const ready = await request('/api/ready', bearer(uid));
  assert.equal(ready.response.status, 200);
  assert.equal(ready.body.writesEnabled, true);
  assert.equal(ready.body.database, '(default)');

  const missing = await request('/api/does-not-exist', bearer(uid));
  assert.equal(missing.response.status, 404);
  assert.equal(missing.body.error.code, 'NOT_FOUND');
});
