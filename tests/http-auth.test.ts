import test, { after, before } from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { createServer, type Server } from 'node:http';
import { initializeApp, deleteApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import type { Auth } from 'firebase-admin/auth';
import { createApp } from '../server/app';
import { ApiError, createErpApi } from '../src/services/erpApi';

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

test('actual customer HTTP API commits, lists, updates, archives and replays only authorized commands', async () => {
  // Exercise the same API client/path/payload used by the customer command dialogs.
  const transport: typeof fetch = (url, init) => fetch(`${baseUrl}${String(url)}`, init);
  const api = createErpApi(async () => uid, transport);
  const create = { entity: 'customers', action: 'create', data: { name: 'HTTP customer fixture', phone: '555-test' }, idempotencyKey: randomUUID() };
  const committed = await api.execute(create);
  assert.equal(committed.record.status, 'active');
  assert.equal(committed.record.companyId, `http-company-${uid}`);
  const replay = await api.execute(create);
  assert.equal(replay.record.id, committed.record.id);
  assert.equal(replay.replayed, true);
  assert.equal((await api.list('customers')).filter(row => row.id === committed.record.id).length, 1);
  const updated = await api.execute({ entity: 'customers', action: 'update', id: committed.record.id, data: { name: 'HTTP revised' }, idempotencyKey: randomUUID() });
  assert.equal(updated.record.name, 'HTTP revised');
  const archived = await api.execute({ entity: 'customers', action: 'archive', id: committed.record.id, data: {}, idempotencyKey: randomUUID() });
  assert.equal(archived.record.status, 'archived');
  const logs = (await api.list('auditlogs')).filter(row => row.recordId === committed.record.id);
  assert.equal(logs.length, 3);
  await assert.rejects(api.execute({ ...create, idempotencyKey: randomUUID(), data: { ...create.data, companyId: 'forged' } }), (error: unknown) => error instanceof ApiError && error.status === 400);

  const viewerUid = `http-viewer-${randomUUID()}`;
  await db.collection('users').doc(viewerUid).set({ roleId: 'VIEWER', companyId: `http-company-${uid}`, branchId: 'main', status: 'active' });
  const viewer = createErpApi(async () => viewerUid, transport);
  assert((await viewer.list('customers')).some(row => row.id === committed.record.id));
  await assert.rejects(viewer.execute({ ...create, idempotencyKey: randomUUID() }), (error: unknown) => error instanceof ApiError && error.status === 403);
  const unauthenticated = await request('/api/erp/commands', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(create) });
  assert.equal(unauthenticated.response.status, 401);
  assert.equal(unauthenticated.body.error.code, 'UNAUTHENTICATED');
});
