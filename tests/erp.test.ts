import test, { before, after } from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { initializeApp, deleteApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { createErpService } from '../server/erp/engine';
import { canRead, type Actor, type Entity } from '../shared/erp';

// Hard fail rather than ever contact a real project. This suite owns only erp-test.
assert(!process.env.FIRESTORE_EMULATOR_HOST || process.env.FIRESTORE_EMULATOR_HOST === '127.0.0.1:8089');
process.env.FIRESTORE_EMULATOR_HOST = '127.0.0.1:8089';
const app = initializeApp({ projectId: 'demo-thariktha' }, `erp-${randomUUID()}`);
const db = getFirestore(app);
const service = createErpService(db);
const runId = randomUUID();
const owner: Actor = { uid: `owner-${runId}`, companyId: `company-${runId}`, branchId: 'main', role: 'OWNER' };
const exec = (entity: Entity, action: string, data: Record<string, unknown> = {}, id?: string, actor = owner, key = randomUUID()) => service.execute(actor, { entity, action, data, ...(id ? { id } : {}), idempotencyKey: key });
const create = async (entity: Entity, data: Record<string, unknown>) => (await exec(entity, 'create', data)).record;
const get = async (entity: string, id: string) => (await db.collection(entity).doc(id).get()).data()!;
const rejects = (promise: Promise<unknown>, code: string) => assert.rejects(promise, (e: any) => e.code === code);
const provision = async (actor: Actor) => db.collection('users').doc(actor.uid).set({ ...actor, roleId: actor.role, status: 'active' });
const product = () => create('products', { name: 'Test stock', sku: randomUUID(), unitPrice: 12.5, costPrice: 4, stockTracked: true });
const opening = async (productId: string, quantity: number, warehouseId = 'main') => {
  const draft = await create('inventoryadjustments', { productId, quantity, warehouseId, type: 'OPENING_STOCK', reason: 'Isolated emulator fixture' });
  return exec('inventoryadjustments', 'post', {}, draft.id);
};
const quantity = async (productId: string, warehouseId = 'main') => (await service.list(owner, 'inventory')).find(x => x.productId === productId && x.warehouseId === warehouseId)?.quantityInStock ?? 0;
before(async () => {
  await fetch('http://127.0.0.1:8089/', { signal: AbortSignal.timeout(3000) });
  await provision(owner);
});
after(async () => { await db.terminate(); await deleteApp(app); });

test('empty, unknown, missing profile, missing record and invalid command are distinct', async () => {
  assert.deepEqual(await service.list(owner, 'expenses'), []);
  await rejects(service.list(owner, 'not-an-entity'), 'UNKNOWN_ENTITY');
  await rejects(service.list({ ...owner, uid: 'missing-profile' }, 'products'), 'INACTIVE_PROFILE');
  await rejects(exec('products', 'archive', {}, 'missing-product'), 'NOT_FOUND');
  await rejects(exec('products', 'delete'), 'UNSUPPORTED_ACTION');
  await rejects(create('products', { name: '', sku: 'x' }), 'VALIDATION');
});

test('master CRUD archives, validates fields and records immutable audits', async () => {
  const p = await product();
  const updated = await exec('products', 'update', { name: 'Revised', unitPrice: 19.25 }, p.id);
  assert.equal(updated.record.unitPricePaise, 1925);
  await rejects(exec('products', 'update', { currentStock: 999 }, p.id), 'VALIDATION');
  await rejects(create('products', { name: 'Duplicate', sku: p.sku }), 'DUPLICATE_SKU');
  const archived = await exec('products', 'archive', {}, p.id);
  assert.equal(archived.record.status, 'archived');
  await rejects(exec('products', 'update', { name: 'No' }, p.id), 'INVALID_TRANSITION');
  const logs = (await service.list(owner, 'auditlogs')).filter(x => x.recordId === p.id);
  assert.equal(logs.length, 3);
  assert(logs.some(x => x.before?.name === 'Test stock' && x.after?.name === 'Revised'));
});

test('RBAC enforces domain writes, private finance reads, profile and branch scope', async () => {
  const viewer: Actor = { ...owner, uid: `viewer-${runId}`, role: 'VIEWER' };
  const stock: Actor = { ...owner, uid: `stock-${runId}`, role: 'INVENTORY' };
  const remote: Actor = { ...owner, uid: `remote-${runId}`, branchId: 'remote' };
  await Promise.all([provision(viewer), provision(stock), provision(remote)]);
  await rejects(exec('customers', 'create', { name: 'Denied' }, undefined, viewer), 'FORBIDDEN');
  await rejects(service.list(stock, 'transactions'), 'FORBIDDEN');
  assert.equal(canRead('PRODUCTION', 'purchasebills'), false);
  const p = await product();
  await rejects(exec('products', 'archive', {}, p.id, remote), 'SCOPE_DENIED');
  assert.deepEqual(await service.list(remote, 'products'), []);
  await rejects(service.list({ ...viewer, role: 'OWNER' }, 'products'), 'ROLE_CHANGED');
});

test('concurrent identical keys commit once, replay original result, conflicting payload fails', async () => {
  const key = randomUUID();
  const command = { entity: 'customers' as const, action: 'create', data: { name: 'Concurrent' }, idempotencyKey: key };
  const results = await Promise.all([service.execute(owner, command), service.execute(owner, command)]);
  assert.equal(results[0].record.id, results[1].record.id);
  assert.equal(results.filter(x => x.replayed).length, 1);
  await rejects(service.execute(owner, { ...command, data: { name: 'Changed' } }), 'IDEMPOTENCY_CONFLICT');
  assert.equal((await service.list(owner, 'auditlogs')).filter(x => x.recordId === results[0].record.id).length, 1);
});

test('sales quotation conversion, partial delivery, invoice and partial/final settlement', async () => {
  const p = await product(); await opening(p.id, 10);
  const c = await create('customers', { name: 'Test customer' });
  const q = await create('quotations', { customerId: c.id, lines: [{ productId: p.id, quantity: 4, unitPrice: 12.5 }] });
  await rejects(exec('quotations', 'convert', {}, q.id), 'INVALID_TRANSITION');
  await exec('quotations', 'send', {}, q.id); await exec('quotations', 'confirm', {}, q.id);
  const converted = await Promise.all([exec('quotations', 'convert', {}, q.id), exec('quotations', 'convert', {}, q.id)]);
  const orderId = converted[0].related!.orderId; assert.equal(orderId, converted[1].related!.orderId);
  await exec('orders', 'confirm', {}, orderId);
  await rejects(exec('orders', 'invoice', {}, orderId), 'INVALID_TRANSITION');
  await exec('orders', 'deliver', { warehouseId: 'main', lines: [{ lineId: 'L1', quantity: 1 }] }, orderId);
  assert.equal((await get('orders', orderId)).status, 'partially_delivered');
  await rejects(exec('orders', 'deliver', { warehouseId: 'main', lines: [{ lineId: 'L1', quantity: 4 }] }, orderId), 'OVERDELIVERY');
  await exec('orders', 'deliver', { warehouseId: 'main', lines: [{ lineId: 'L1', quantity: 3 }] }, orderId);
  const invoices = await Promise.all([exec('orders', 'invoice', {}, orderId), exec('orders', 'invoice', {}, orderId)]);
  const invoiceId = invoices[0].related!.invoiceId; assert.equal(invoices[1].related!.invoiceId, invoiceId);
  await rejects(exec('invoices', 'pay', { amount: 51, method: 'cash' }, invoiceId), 'OVERPAYMENT');
  await rejects(exec('invoices', 'pay', { amount: 0, method: 'cash' }, invoiceId), 'VALIDATION');
  assert.equal((await exec('invoices', 'pay', { amount: 20, method: 'upi' }, invoiceId)).record.amountDue, 30);
  await exec('invoices', 'pay', { amount: 30, method: 'bank_transfer', reference: 'TEST' }, invoiceId);
  assert.equal((await get('orders', orderId)).status, 'complete');
  assert.equal(await quantity(p.id), 6);
  assert.equal((await service.list(owner, 'transactions')).filter(x => x.invoiceId === invoiceId).length, 2);
});

test('RFQ, partial GRN accepted/rejected/damaged, remaining demand and incremental bills', async () => {
  const p = await product(); const s = await create('suppliers', { name: 'Test supplier' });
  const rfq = await create('rfqs', { supplierId: s.id, lines: [{ productId: p.id, quantity: 10, unitPrice: 4 }] });
  await exec('rfqs', 'send', {}, rfq.id); await exec('rfqs', 'confirm', {}, rfq.id);
  const po = (await exec('rfqs', 'convert', {}, rfq.id)).related!.purchaseOrderId;
  await exec('purchaseorders', 'confirm', {}, po);
  const first = await exec('purchaseorders', 'receive', { warehouseId: 'main', lines: [{ lineId: 'L1', accepted: 4, rejected: 1, damaged: 1 }] }, po);
  assert.equal(first.record.lines[0].remainingQuantity, 6); assert.equal(await quantity(p.id), 4);
  const grnId = first.related!.grnId; const grnBefore = await get('grns', grnId);
  await exec('grns', 'comment', { message: 'Immutable receipt comment' }, grnId);
  assert.deepEqual(await get('grns', grnId), grnBefore);
  const bill1 = (await exec('purchaseorders', 'bill', {}, po)).related!.purchaseBillId;
  assert.equal((await get('purchasebills', bill1)).totalAmount, 16);
  await rejects(exec('purchaseorders', 'bill', {}, po), 'NOTHING_TO_BILL');
  await rejects(exec('purchaseorders', 'receive', { warehouseId: 'main', lines: [{ lineId: 'L1', accepted: 7, rejected: 0, damaged: 0 }] }, po), 'OVERRECEIPT');
  await exec('purchaseorders', 'receive', { warehouseId: 'main', lines: [{ lineId: 'L1', accepted: 6, rejected: 0, damaged: 0 }] }, po);
  const bill2 = (await exec('purchaseorders', 'bill', {}, po)).related!.purchaseBillId;
  assert.equal((await get('purchasebills', bill2)).totalAmount, 24); assert.notEqual(bill1, bill2);
  await exec('purchasebills', 'pay', { amount: 16, method: 'cash' }, bill1);
  assert.equal((await get('purchasebills', bill1)).status, 'paid');
  assert.equal((await get('purchaseorders', po)).lines[0].billedQuantity, 10);
  assert.equal(await quantity(p.id), 10);
});

test('failed multi-line posting rolls back balance, movement, source and idempotency receipt', async () => {
  const a = await product(); const b = await product(); await opening(a.id, 5);
  const c = await create('customers', { name: 'Rollback customer' });
  const o = await create('orders', { customerId: c.id, lines: [a, b].map(p => ({ productId: p.id, quantity: 2, unitPrice: 1 })) });
  await exec('orders', 'confirm', {}, o.id);
  const key = randomUUID(); const data = { warehouseId: 'main', lines: [{ lineId: 'L1', quantity: 2 }, { lineId: 'L2', quantity: 2 }] };
  const countBefore = (await service.list(owner, 'inventorytransactions')).length;
  await rejects(exec('orders', 'deliver', data, o.id, owner, key), 'INSUFFICIENT_STOCK');
  assert.equal(await quantity(a.id), 5); assert.equal((await get('orders', o.id)).status, 'confirmed');
  assert.equal((await service.list(owner, 'inventorytransactions')).length, countBefore);
  await opening(b.id, 2);
  assert.equal((await exec('orders', 'deliver', data, o.id, owner, key)).replayed, false);
  assert.equal(await quantity(a.id), 3); assert.equal(await quantity(b.id), 0);
});

test('adjustment and transfer ledger stays balanced; competing source posts cannot duplicate', async () => {
  const p = await product(); await opening(p.id, 5);
  const transfer = await create('stocktransfers', { productId: p.id, quantity: 3, fromWarehouseId: 'main', toWarehouseId: 'other', reason: 'Test transfer' });
  const results = await Promise.allSettled([exec('stocktransfers', 'post', {}, transfer.id), exec('stocktransfers', 'post', {}, transfer.id)]);
  assert.equal(results.filter(x => x.status === 'fulfilled').length, 1);
  assert.equal(await quantity(p.id), 2); assert.equal(await quantity(p.id, 'other'), 3);
  const damage = await create('inventoryadjustments', { productId: p.id, quantity: 3, warehouseId: 'main', type: 'DAMAGE', reason: 'Too much' });
  await rejects(exec('inventoryadjustments', 'post', {}, damage.id), 'INSUFFICIENT_STOCK');
  const movements = (await service.list(owner, 'inventorytransactions')).filter(x => x.productId === p.id);
  assert.equal(movements.reduce((sum, x) => sum + x.delta, 0), 5);
  for (const movement of movements) {
    assert.equal(movement.quantityBefore + movement.delta, movement.quantityAfter);
    assert(movement.source && movement.userId && movement.timestamp && movement.reason);
  }
});

test('manufacturing consumes/outputs once and printing/repair follow real job states', async () => {
  const material = await product(); const output = await product(); await opening(material.id, 5);
  const c = await create('customers', { name: 'Job customer' });
  const o = await create('orders', { customerId: c.id, lines: ['manufacturing', 'printing', 'repair'].map(jobType => ({ productId: output.id, quantity: 1, unitPrice: 5, jobType })) });
  const confirmed = await exec('orders', 'confirm', {}, o.id);
  await rejects(exec('orders', 'confirm', {}, o.id), 'INVALID_TRANSITION');
  const manufacturing = confirmed.record.jobIds.L1;
  await rejects(exec('orders', 'deliver', { warehouseId: 'main', lines: [{ lineId: 'L1', quantity: 1 }] }, o.id), 'INVALID_TRANSITION');
  await exec('manufacturing_jobs', 'start', { warehouseId: 'main', materials: [{ productId: material.id, quantity: 2 }] }, manufacturing);
  await rejects(exec('manufacturing_jobs', 'complete', { warehouseId: 'main', productId: output.id, quantity: 2 }, manufacturing), 'INVALID_OUTPUT');
  await exec('manufacturing_jobs', 'complete', { warehouseId: 'main', productId: output.id, quantity: 1 }, manufacturing);
  await rejects(exec('manufacturing_jobs', 'complete', { warehouseId: 'main', productId: output.id, quantity: 1 }, manufacturing), 'INVALID_TRANSITION');
  for (const [entity, line, final] of [['printing_jobs', 'L2', 'complete'], ['repair_jobs', 'L3', 'ready']] as const) {
    await exec(entity, 'start', {}, confirmed.record.jobIds[line]);
    assert.equal((await exec(entity, 'complete', {}, confirmed.record.jobIds[line])).record.status, final);
  }
  assert.equal(await quantity(material.id), 3); assert.equal(await quantity(output.id), 1);
  const movements = (await service.list(owner, 'inventorytransactions')).filter(x => x.sourceId === manufacturing);
  assert.deepEqual(movements.map(x => x.type).sort(), ['MANUFACTURING_CONSUMPTION', 'MANUFACTURING_OUTPUT']);
});

test('expense posts actual outgoing transaction and cannot be posted twice', async () => {
  const expense = await create('expenses', { description: 'Test expense', amount: 1.25, method: 'cash' });
  const result = await exec('expenses', 'post', {}, expense.id);
  const transaction = await get('transactions', result.related!.transactionId);
  assert.equal(transaction.amountPaise, 125); assert.equal(transaction.direction, 'outgoing');
  await rejects(exec('expenses', 'post', {}, expense.id), 'INVALID_TRANSITION');
});
