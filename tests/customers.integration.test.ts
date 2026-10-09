import test, { after, before } from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { initializeApp, deleteApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { createErpService, ErpError } from '../server/erp/engine';
import type { Actor, ERPCommand, ERPRecord, Role } from '../shared/erp';

// Refuse an absent/foreign emulator endpoint before constructing any Admin client.
// Explicit settings also pin this client if another suite changes process.env.
const endpoint = '127.0.0.1:8089';
const projectId = 'demo-thariktha';
assert.equal(process.env.FIRESTORE_EMULATOR_HOST, endpoint, 'Customers tests require the isolated loopback emulator');
for (const variable of ['GCLOUD_PROJECT', 'GOOGLE_CLOUD_PROJECT', 'FIREBASE_PROJECT_ID']) {
  assert(!process.env[variable] || process.env[variable] === projectId, `${variable} must be ${projectId}`);
}
const firebaseApp = initializeApp({ projectId }, `customers-${randomUUID()}`);
assert.equal(firebaseApp.options.projectId, projectId);
const db = getFirestore(firebaseApp);
db.settings({ host: endpoint, ssl: false });
const service = createErpService(db);
const runId = randomUUID();
const companyId = `customers-${runId}`;
const branchId = `branch-${randomUUID()}`;
const actor = (role: Role, company = companyId, branch = branchId): Actor => ({
  uid: `customers-${role}-${randomUUID()}`, role, companyId: company, branchId: branch,
});
// One stable, separately provisioned identity per role/scope for this suite.
const sales = actor('SALES');
const viewer = actor('VIEWER');
const management = ['OWNER', 'ADMIN', 'MANAGER'].map(role => actor(role as Role));
const foreignCompany = actor('SALES', `other-${randomUUID()}`);
const foreignBranch = actor('SALES', companyId, `other-${randomUUID()}`);
const actors = [sales, viewer, ...management, foreignCompany, foreignBranch];
const command = (action: string, data: Record<string, unknown> = {}, id?: string, key = randomUUID()): ERPCommand => ({
  entity: 'customers', action, data, ...(id ? { id } : {}), idempotencyKey: key,
});
const execute = (who: Actor, action: string, data: Record<string, unknown> = {}, id?: string) =>
  service.execute(who, command(action, data, id));
const create = async (who = sales, name = `Customer-${randomUUID()}`) =>
  (await execute(who, 'create', { name })).record;
const stored = async (id: string) => (await db.collection('customers').doc(id).get()).data()!;
const audits = async (id: string) => (await db.collection('auditlogs')
  .where('companyId', '==', companyId).where('branchId', '==', branchId)
  .where('recordId', '==', id).get()).docs.map(doc => doc.data());
const rejects = (promise: Promise<unknown>, code: string, status: number) =>
  assert.rejects(promise, error => error instanceof ErpError && error.code === code && error.status === status);

before(async () => {
  const response = await fetch(`http://${endpoint}/`, { signal: AbortSignal.timeout(3000), redirect: 'error' });
  assert(response.ok, `Firestore emulator is unavailable: HTTP ${response.status}`);
  await Promise.all(actors.map(who => db.collection('users').doc(who.uid).set({
    ...who, roleId: who.role, status: 'active',
  })));
});
after(async () => {
  try { await db.terminate(); } finally { await deleteApp(firebaseApp); }
});

function assertScope(record: ERPRecord, creator: Actor, updater = creator) {
  assert.equal(record.companyId, creator.companyId);
  assert.equal(record.branchId, creator.branchId);
  assert.equal(record.createdBy, creator.uid);
  assert.equal(record.updatedBy, updater.uid);
  assert.equal(record.schemaVersion, 1);
  assert.match(record.id, /^[a-f0-9]{64}$/);
  assert.equal(record.number, `CUSTOMERS-${record.id}`);
  assert.equal(typeof record.createdAt, 'string');
  assert.equal(typeof record.updatedAt, 'string');
  assert(Number.isFinite(Date.parse(record.createdAt as string)));
  assert(Number.isFinite(Date.parse(record.updatedAt as string)));
}

for (const who of [sales, ...management]) {
  test(`${who.role} can create, update and archive customers with server-owned metadata`, async () => {
    const created = (await execute(who, 'create', {
      name: '  Customer name  ', email: 'customer@example.test', phone: '+910000000000',
      company: 'Customer company', contactName: 'Contact',
      address: { line1: 'Road', city: 'Test city', postalCode: '000000', country: 'India' }, notes: 'Initial notes',
    })).record;
    assert.equal(created.name, 'Customer name');
    assert.equal(created.status, 'active');
    assertScope(created, who);
    const original = await stored(created.id);
    const updated = (await execute(who, 'update', {
      name: 'Revised customer', phone: '12345', address: 'New address', notes: 'Changed notes',
    }, created.id)).record;
    assertScope(updated, who);
    assert.equal(updated.name, 'Revised customer');
    assert.equal(updated.phone, '12345');
    assert.equal(updated.email, created.email);
    assert.equal(updated.address, 'New address');
    assert.equal(updated.createdAt, created.createdAt);
    assert.equal(updated.status, 'active');
    const archived = (await execute(who, 'archive', {}, created.id)).record;
    assertScope(archived, who);
    assert.equal(archived.createdAt, created.createdAt);
    assert.equal(archived.status, 'archived');
    assert.equal(typeof archived.archivedAt, 'string');
    const final = await stored(created.id);
    assert.deepEqual(final.createdAt, original.createdAt);
    assert.equal(final.createdBy, original.createdBy);
    assert.equal(final.number, original.number);
    assert.equal((await service.list(who, 'customers')).find(record => record.id === created.id)?.status, 'archived');
    const logs = await audits(created.id);
    assert.deepEqual(logs.map(log => log.action).sort(), ['archive', 'create', 'update']);
    assert(logs.every(log => log.actorId === who.uid && log.entity === 'customers'));
    assert(logs.some(log => log.action === 'update' && log.before.name === 'Customer name' && log.after.name === 'Revised customer'));
    await rejects(execute(who, 'update', { name: 'Cannot revive' }, created.id), 'INVALID_TRANSITION', 409);
    assert.deepEqual(await stored(created.id), final);
    assert.equal((await audits(created.id)).length, 3);
  });
}

test('a management update preserves the SALES creator and changes only updater attribution', async () => {
  const created = await create();
  const owner = management[0];
  const updated = (await execute(owner, 'update', { notes: 'Management update' }, created.id)).record;
  assertScope(updated, sales, owner);
  assert.equal(updated.createdAt, created.createdAt);
  assert.equal(updated.number, created.number);
  assert.equal(updated.status, 'active');
});

test('VIEWER may read scoped customers but cannot create, update or archive', async () => {
  const customer = await create();
  const original = await stored(customer.id);
  assert((await service.list(viewer, 'customers')).some(record => record.id === customer.id));
  await rejects(execute(viewer, 'create', { name: 'Denied' }), 'FORBIDDEN', 403);
  await rejects(execute(viewer, 'update', { name: 'Denied' }, customer.id), 'FORBIDDEN', 403);
  await rejects(execute(viewer, 'archive', {}, customer.id), 'FORBIDDEN', 403);
  assert.deepEqual(await stored(customer.id), original);
  assert.equal((await audits(customer.id)).length, 1);
  await rejects(service.list({ ...viewer, role: 'OWNER' }, 'customers'), 'ROLE_CHANGED', 403);
});

test('company and branch boundaries isolate lists and deny mutations in both directions', async () => {
  const local = await create();
  for (const remote of [foreignCompany, foreignBranch]) {
    const theirs = await create(remote);
    const localBefore = await stored(local.id);
    const remoteBefore = await stored(theirs.id);
    const localList = await service.list(sales, 'customers');
    const remoteList = await service.list(remote, 'customers');
    assert(!localList.some(record => record.id === theirs.id));
    assert(!remoteList.some(record => record.id === local.id));
    assert(remoteList.some(record => record.id === theirs.id));
    assert(remoteList.every(record => record.companyId === remote.companyId && record.branchId === remote.branchId));
    for (const [who, target] of [[sales, theirs], [remote, local]] as const) {
      await rejects(execute(who, 'update', { name: 'Cross-scope attempt' }, target.id), 'SCOPE_DENIED', 403);
      await rejects(execute(who, 'archive', {}, target.id), 'SCOPE_DENIED', 403);
    }
    assert.deepEqual(await stored(local.id), localBefore);
    assert.deepEqual(await stored(theirs.id), remoteBefore);
    await rejects(service.list({ ...sales, companyId: remote.companyId, branchId: remote.branchId }, 'customers'), 'SCOPE_DENIED', 403);
  }
  assert.equal((await audits(local.id)).length, 1);
});

test('customer payloads reject privilege, scope, status and immutable metadata injection', async () => {
  const customer = await create();
  const original = await stored(customer.id);
  const beforeIds = (await service.list(sales, 'customers')).map(record => record.id).sort();
  const forbidden: Record<string, unknown> = {
    role: 'OWNER', roleId: 'OWNER', permissions: ['*'], companyId: foreignCompany.companyId,
    branchId: foreignBranch.branchId, status: 'archived', id: 'client-chosen', number: 'CLIENT-1',
    createdAt: '2000-01-01', createdBy: 'forged', updatedAt: '2000-01-01', updatedBy: 'forged', schemaVersion: 99,
  };
  for (const [field, value] of Object.entries(forbidden)) {
    await rejects(execute(sales, 'create', { name: 'Injected', [field]: value }), 'VALIDATION', 400);
    await rejects(execute(sales, 'update', { [field]: value }, customer.id), 'VALIDATION', 400);
  }
  await rejects(execute(sales, 'create', { name: ' ' }), 'VALIDATION', 400);
  await rejects(execute(sales, 'update', {}, customer.id), 'VALIDATION', 400);
  await rejects(execute(sales, 'update', { address: { city: 'City', companyId: 'injected' } }, customer.id), 'VALIDATION', 400);
  await rejects(execute(sales, 'archive', { status: 'active' }, customer.id), 'VALIDATION', 400);
  await rejects(execute(sales, 'create', { name: 'Chosen ID' }, 'client-chosen'), 'VALIDATION', 400);
  const raw = { ...command('create', { name: 'Injected actor' }), actor: management[0] };
  await rejects(service.execute(sales, raw), 'VALIDATION', 400);
  assert.deepEqual(await stored(customer.id), original);
  assert.deepEqual((await service.list(sales, 'customers')).map(record => record.id).sort(), beforeIds);
  assert.equal((await audits(customer.id)).length, 1);
});

for (const action of ['create', 'update', 'archive']) {
  test(`customer ${action} idempotency replays the original result once and conflicts on changed payload`, async () => {
    const fixture = action === 'create' ? undefined : await create();
    const data = action === 'archive' ? {} : { name: 'Idempotent customer' };
    const input = command(action, data, fixture?.id);
    const results = await Promise.all([service.execute(sales, input), service.execute(sales, input)]);
    const first = results.find(result => result.replayed === false)!;
    const replay = results.find(result => result.replayed === true)!;
    assert(first && replay, 'One transaction must commit and one must replay');
    assert.deepEqual(replay.record, first.record);
    assert.equal((await audits(first.record.id)).filter(log => log.action === action).length, 1);
    const beforeConflict = await stored(first.record.id);
    await rejects(service.execute(sales, { ...input, data: { name: 'Different payload' } }), 'IDEMPOTENCY_CONFLICT', 409);
    assert.deepEqual(await stored(first.record.id), beforeConflict);
    // Replaying a create/update must return its receipt, not the now-modified record.
    if (action !== 'archive') await execute(sales, 'archive', {}, first.record.id);
    const again = await service.execute(sales, input);
    assert.equal(again.replayed, true);
    assert.deepEqual(again.record, first.record);
    assert.equal((await audits(first.record.id)).filter(log => log.action === action).length, 1);
    assert.equal((await service.list(sales, 'customers')).filter(record => record.id === first.record.id).length, 1);
  });
}
