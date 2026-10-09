import { createHash } from 'node:crypto';
import { FieldValue, type Firestore, type Transaction, type DocumentReference } from 'firebase-admin/firestore';
import { ACTIONS, ENTITIES, ROLES, PAYMENT_METHODS, JOB_TYPES, ADJUSTMENT_TYPES, canExecute, canRead,
  type Actor, type Entity, type ERPCommand, type ERPRecord, type ERPResult } from '../../shared/erp';
import { ErpError, assert, fail, object, fields, text, id, integer, money, multiply, sum, choice, array, canonical, serialize } from './validation';
export { ErpError } from './validation';
export const IDEMPOTENCY_COLLECTION = '_erp_commands';
const MASTER = ['products', 'customers', 'suppliers'];
const LINE_DOCS = ['quotations', 'orders', 'rfqs', 'purchaseorders'];
const hash = (value: string) => createHash('sha256').update(value).digest('hex');
const stableId = (...parts: string[]) => hash(JSON.stringify(parts));
const stamp = () => FieldValue.serverTimestamp();
type Doc = Record<string, any>;

function validateActor(actor: Actor) {
  object(actor, 'actor'); id(actor.uid, 'actor.uid'); id(actor.companyId, 'actor.companyId'); id(actor.branchId, 'actor.branchId');
  choice(actor.role, ROLES, 'actor.role');
}
function scope(actor: Actor, doc: Doc) {
  assert(doc.companyId === actor.companyId && doc.branchId === actor.branchId, 403, 'SCOPE_DENIED', 'Record is outside the active company/branch or has no explicit scope');
}
function profile(actor: Actor, doc: Doc | undefined) {
  assert(doc && doc.status === 'active', 403, 'INACTIVE_PROFILE', 'An active, preprovisioned user profile is required');
  scope(actor, doc);
  assert((doc.roleId ?? doc.role) === actor.role && (!doc.role || doc.role === actor.role), 403, 'ROLE_CHANGED', 'Actor role does not match the provisioned profile');
}
function state(doc: Doc, ...allowed: string[]) {
  assert(allowed.includes(doc.status), 409, 'INVALID_TRANSITION', `Cannot perform this action while status is ${doc.status}`);
}
function relevantNotification(actor: Actor, doc: Doc) {
  return doc.recipientId === actor.uid || (doc.recipientId === 'all_branch_managers' && ['OWNER', 'ADMIN', 'MANAGER'].includes(actor.role));
}
function nonempty(data: Doc) { assert(Object.keys(data).length > 0, 400, 'VALIDATION', 'Update cannot be empty'); }

/** A transaction-local unit of work. save() only stages; flush() is the FIRST write. */
class Unit {
  private originals = new Map<string, Doc | null>();
  private staged = new Map<string, { ref: DocumentReference; data: Doc }>();
  related: Record<string, string> = {};
  private sequence = 0;
  constructor(readonly db: Firestore, readonly tx: Transaction, readonly actor: Actor, readonly command: ERPCommand, readonly operationId: string) {}
  async get(entity: string, key: string, required = true): Promise<Doc | null> {
    id(key); const ref = this.db.collection(entity).doc(key);
    let doc = this.staged.get(ref.path)?.data;
    if (!doc) {
      if (!this.originals.has(ref.path)) {
        const snap = await this.tx.get(ref); this.originals.set(ref.path, snap.exists ? snap.data()! : null);
      }
      doc = this.originals.get(ref.path) ?? undefined;
    }
    if (!doc) { if (required) fail(404, 'NOT_FOUND', `${entity}/${key} does not exist`); return null; }
    scope(this.actor, doc);
    assert(!doc.id || doc.id === key, 409, 'SCHEMA_REVIEW_REQUIRED', 'Stored record id does not match its document path');
    return { ...doc, id: key };
  }
  async active(entity: string, key: unknown): Promise<Doc> {
    const doc = (await this.get(entity, id(key, `${entity}Id`)))!;
    state(doc, 'active'); return doc;
  }
  async create(entity: string, key: string, values: Doc): Promise<Doc> {
    assert(!(await this.get(entity, key, false)), 409, 'ALREADY_EXISTS', `${entity}/${key} already exists`);
    const data = { ...values, id: key, number: `${entity.toUpperCase()}-${key}`, companyId: this.actor.companyId,
      branchId: this.actor.branchId, notes: values.notes ?? '', schemaVersion: 1,
      createdAt: stamp(), updatedAt: stamp(), createdBy: this.actor.uid, updatedBy: this.actor.uid };
    this.staged.set(`${entity}/${key}`, { ref: this.db.collection(entity).doc(key), data });
    return data;
  }
  async update(entity: string, key: string, values: Doc): Promise<Doc> {
    const before = (await this.get(entity, key))!;
    const data = { ...before, ...values, updatedAt: stamp(), updatedBy: this.actor.uid };
    this.staged.set(`${entity}/${key}`, { ref: this.db.collection(entity).doc(key), data }); return data;
  }
  nextId(kind: string) { return stableId(this.operationId, kind, String(this.sequence++)); }
  async movement(productId: string, warehouseId: string, delta: number, type: string, sourceEntity: string, sourceId: string, reason: string) {
    id(warehouseId, 'warehouseId');
    const product = (await this.get('products', productId))!;
    assert(product.stockTracked === true, 409, 'NOT_STOCK_TRACKED', 'Inventory postings require an explicitly stock-tracked product');
    // Warehouses are branch-local location identifiers, not unscoped global references.
    const balanceId = stableId(this.actor.companyId, this.actor.branchId, warehouseId, productId);
    const before = await this.get('inventory', balanceId, false);
    if (before) assert(before.productId === productId && before.warehouseId === warehouseId && before.schemaVersion === 1,
      409, 'SCHEMA_REVIEW_REQUIRED', 'Inventory balance requires schema review');
    const quantityBefore = before ? integer(before.quantityInStock, 'stored stock', true) : 0;
    const quantityAfter = quantityBefore + delta;
    assert(Number.isSafeInteger(quantityAfter) && quantityAfter >= 0 && quantityAfter <= 1_000_000_000,
      409, 'INSUFFICIENT_STOCK', 'Posting would result in negative stock or exceed supported stock capacity');
    const balance = { productId, warehouseId, quantityInStock: quantityAfter, status: 'active' };
    if (before) await this.update('inventory', balanceId, balance); else await this.create('inventory', balanceId, balance);
    await this.create('inventorytransactions', this.nextId('movement'), {
      status: 'posted', productId, warehouseId, quantity: Math.abs(delta), delta, quantityBefore, quantityAfter,
      before: quantityBefore, after: quantityAfter, sourceEntity, sourceId, source: `${sourceEntity}/${sourceId}`,
      type, reason, userId: this.actor.uid, timestamp: stamp(),
    });
  }
  flush() {
    // No transactional reads are permitted below this point.
    assert(this.staged.size * 2 + 1 <= 490, 400, 'COMMAND_TOO_LARGE', 'Command exceeds the atomic write budget');
    for (const [path, entry] of this.staged) {
      const before = this.originals.get(path) ?? null;
      if (before) this.tx.set(entry.ref, entry.data); else this.tx.create(entry.ref, entry.data);
      if (entry.ref.parent.id === 'auditlogs') continue; // Chatter already IS its audit entry.
      const auditId = stableId(this.operationId, 'audit', path);
      this.tx.create(this.db.collection('auditlogs').doc(auditId), {
        id: auditId, number: `AUDIT-${auditId}`, companyId: this.actor.companyId, branchId: this.actor.branchId,
        status: 'recorded', notes: '', createdAt: stamp(), updatedAt: stamp(), createdBy: this.actor.uid, updatedBy: this.actor.uid,
        entity: entry.ref.parent.id, recordId: entry.ref.id, action: this.command.action,
        commandEntity: this.command.entity, operationId: this.operationId, actorId: this.actor.uid,
        before, after: entry.data, timestamp: stamp(),
      });
    }
  }
  async comment(entity: Entity, key: string, message: string) {
    const record = (await this.get(entity, key))!;
    const auditId = this.nextId('comment');
    // Chatter is append-only; posting a comment NEVER changes immutable GRN/delivery documents.
    await this.create('auditlogs', auditId, { status: 'recorded', entity, recordId: key, action: 'comment',
      message, notes: message, actorId: this.actor.uid, operationId: this.operationId, timestamp: stamp() });
    return record;
  }
}

async function validateMaster(u: Unit, entity: string, data: Doc, existing?: Doc): Promise<Doc> {
  const allowed = entity === 'products'
    ? ['name', 'sku', 'unitPrice', 'costPrice', 'stockTracked', 'category', 'minimumStock', 'notes']
    : ['name', 'email', 'phone', 'company', 'contactName', 'address', 'notes'];
  fields(data, allowed);
  if (existing) nonempty(data);
  const result: Doc = {};
  for (const field of ['name', 'sku', 'category', 'email', 'phone', 'company', 'contactName', 'notes']) {
    if (field in data) result[field] = text(data[field], field, field === 'notes' ? 4000 : 200, !['name', 'sku'].includes(field));
  }
  if ('address' in data) {
    if (typeof data.address === 'string') result.address = text(data.address, 'address', 1000, true);
    else {
      const address = object(data.address, 'address'); fields(address, ['line1', 'line2', 'street', 'city', 'state', 'postalCode', 'country']);
      result.address = Object.fromEntries(Object.entries(address).map(([k, v]) => [k, text(v, k, 300, true)]));
    }
  }
  if (!existing) result.name = text(data.name, 'name');
  if (entity !== 'products') return result;
  if (!existing) {
    result.sku = text(data.sku, 'sku'); result.stockTracked = data.stockTracked ?? true;
    result.minimumStock = integer(data.minimumStock ?? 0, 'minimumStock', true); result.category = result.category ?? '';
  }
  for (const field of ['unitPrice', 'costPrice']) {
    if (field in data || !existing) { const paise = money(data[field] ?? 0, field); result[`${field}Paise`] = paise; result[field] = paise / 100; }
  }
  if ('minimumStock' in data) result.minimumStock = integer(data.minimumStock, 'minimumStock', true);
  if ('stockTracked' in data || !existing) {
    assert(typeof (data.stockTracked ?? result.stockTracked) === 'boolean', 400, 'VALIDATION', 'stockTracked must be boolean');
    result.stockTracked = data.stockTracked ?? result.stockTracked;
  }
  if (existing && 'stockTracked' in result) assert(result.stockTracked === existing.stockTracked, 409, 'IMMUTABLE_FIELD', 'stockTracked cannot change after product creation; create a separate product after migration review');
  if ('sku' in result) {
    const matches = await u.tx.get(u.db.collection('products').where('companyId', '==', u.actor.companyId).where('branchId', '==', u.actor.branchId).where('sku', '==', result.sku));
    assert(matches.docs.every(d => d.id === existing?.id), 409, 'DUPLICATE_SKU', 'SKU already exists in this company and branch');
  }
  return result;
}

async function buildLines(u: Unit, raw: unknown, sales: boolean): Promise<Doc[]> {
  const input = array(raw, 'lines'); const result: Doc[] = [];
  for (const [index, line] of input.entries()) {
    fields(line, sales ? ['productId', 'quantity', 'unitPrice', 'jobType'] : ['productId', 'quantity', 'unitPrice']);
    const product = await u.active('products', line.productId);
    assert(typeof product.stockTracked === 'boolean', 409, 'SCHEMA_REVIEW_REQUIRED', 'Product must declare stockTracked after schema review');
    const quantity = integer(line.quantity, 'quantity'); const unitPricePaise = money(line.unitPrice, 'unitPrice');
    const jobType = line.jobType === undefined ? undefined : choice(line.jobType, JOB_TYPES, 'jobType');
    if (jobType === 'manufacturing') assert(product.stockTracked, 400, 'VALIDATION', 'Manufacturing output product must be stock-tracked');
    const totalPaise = multiply(unitPricePaise, quantity);
    result.push({ lineId: `L${index + 1}`, productId: product.id, productName: product.name, quantity, unitPricePaise,
      unitPrice: unitPricePaise / 100, totalPaise, totalAmount: totalPaise / 100, stockTracked: product.stockTracked,
      deliveredQuantity: 0, acceptedQuantity: 0, receivedQuantity: 0, rejectedQuantity: 0, damagedQuantity: 0,
      remainingQuantity: quantity, billedQuantity: 0, ...(jobType ? { jobType } : {}) });
  }
  return result;
}
async function draftData(u: Unit, entity: string, data: Doc, existing?: Doc): Promise<Doc> {
  if (existing) nonempty(data);
  if (LINE_DOCS.includes(entity)) {
    const sales = entity === 'quotations' || entity === 'orders'; const party = sales ? 'customerId' : 'supplierId';
    fields(data, [party, 'lines', 'notes']); const result: Doc = {};
    if (party in data || !existing) { const contact = await u.active(sales ? 'customers' : 'suppliers', data[party]); result[party] = contact.id; result[sales ? 'customerName' : 'supplierName'] = contact.name; }
    if ('lines' in data || !existing) { result.lines = await buildLines(u, data.lines, sales); result.totalPaise = sum(result.lines.map((l: Doc) => l.totalPaise)); result.totalAmount = result.totalPaise / 100; }
    if ('notes' in data) result.notes = text(data.notes, 'notes', 4000, true);
    return result;
  }
  const result: Doc = {};
  if (entity === 'inventoryadjustments' || entity === 'stocktransfers') {
    const transfer = entity === 'stocktransfers';
    fields(data, transfer ? ['productId', 'quantity', 'fromWarehouseId', 'toWarehouseId', 'reason'] : ['productId', 'warehouseId', 'quantity', 'type', 'reason']);
    const merged = { ...existing, ...data };
    const product = await u.active('products', merged.productId);
    assert(product.stockTracked === true, 400, 'VALIDATION', 'Product is not stock tracked');
    result.productId = product.id; result.quantity = integer(merged.quantity, 'quantity'); result.reason = text(merged.reason, 'reason', 1000);
    if (transfer) {
      result.fromWarehouseId = id(merged.fromWarehouseId, 'fromWarehouseId'); result.toWarehouseId = id(merged.toWarehouseId, 'toWarehouseId');
      assert(result.fromWarehouseId !== result.toWarehouseId, 400, 'VALIDATION', 'Transfer locations must differ');
    } else { result.warehouseId = id(merged.warehouseId, 'warehouseId'); result.type = choice(merged.type, ADJUSTMENT_TYPES, 'type'); }
  } else if (entity === 'expenses') {
    fields(data, ['description', 'amount', 'method', 'notes']); const merged = { ...existing, ...data };
    result.description = text(merged.description, 'description', 1000); result.amountPaise = money(merged.amount);
    assert(result.amountPaise > 0, 400, 'VALIDATION', 'Expense must be positive'); result.amount = result.amountPaise / 100;
    result.method = choice(merged.method, PAYMENT_METHODS, 'method'); result.notes = text(merged.notes ?? '', 'notes', 4000, true);
  } else fail(400, 'UNSUPPORTED_ACTION', `Draft creation is not supported for ${entity}`);
  return result;
}
function sourceJobEntity(jobType: string): Entity { return jobType === 'manufacturing' ? 'manufacturing_jobs' : jobType === 'repair' ? 'repair_jobs' : 'printing_jobs'; }
async function validateSourceReferences(u: Unit, entity: string, record: Doc) {
  if (record.customerId) await u.active('customers', record.customerId);
  if (record.supplierId) await u.active('suppliers', record.supplierId);
  for (const line of record.lines ?? []) {
    const product = await u.active('products', line.productId);
    assert(product.stockTracked === line.stockTracked, 409, 'SCHEMA_REVIEW_REQUIRED', 'Product tracking configuration changed');
  }
}

async function run(u: Unit): Promise<Doc> {
  const { entity, action, data } = u.command; const key = u.command.id;
  if (action === 'create') {
    assert(!key, 400, 'VALIDATION', 'Create IDs are generated by the server');
    const values = MASTER.includes(entity) ? await validateMaster(u, entity, data) : await draftData(u, entity, data);
    return u.create(entity, stableId(u.operationId, entity), { ...values, status: MASTER.includes(entity) ? 'active' : 'draft', ...(entity === 'orders' ? { paymentStatus: 'unpaid' } : {}) });
  }
  const record = (await u.get(entity, id(key)))!;
  if (entity === 'notifications') {
    fields(data, []); assert(relevantNotification(u.actor, record), 403, 'RECIPIENT_DENIED', 'Notification is not addressed to this actor');
    return u.update(entity, record.id, { read: true, readAt: stamp() });
  }
  if (entity === 'users') {
    fields(data, ['role', 'roleId', 'status']); nonempty(data);
    const values: Doc = {};
    const oldRole = choice(record.roleId ?? record.role, ROLES, 'stored role');
    if ('role' in data || 'roleId' in data) {
      const role = choice(data.roleId ?? data.role, ROLES, 'role');
      assert(!('role' in data && 'roleId' in data) || data.role === data.roleId, 400, 'VALIDATION', 'role and roleId must agree');
      assert(record.id !== u.actor.uid || role === oldRole, 403, 'SELF_ROLE_CHANGE', 'Self role changes are forbidden');
      assert(u.actor.role === 'OWNER' || (oldRole !== 'OWNER' && role !== 'OWNER'), 403, 'OWNER_PROTECTED', 'Only OWNER may change OWNER roles');
      values.roleId = role; values.role = role;
    }
    assert(u.actor.role === 'OWNER' || oldRole !== 'OWNER', 403, 'OWNER_PROTECTED', 'ADMIN cannot modify OWNER');
    if ('status' in data) {
      values.status = choice(data.status, ['active', 'suspended', 'invited'], 'status');
      assert(record.id !== u.actor.uid || values.status === 'active', 403, 'SELF_DISABLE', 'Self suspension is forbidden');
    }
    // Protect the last active OWNER in the company, across branches.
    if (oldRole === 'OWNER' && record.status === 'active' && ((values.roleId && values.roleId !== 'OWNER') || (values.status && values.status !== 'active'))) {
      const owners = await u.tx.get(u.db.collection('users').where('companyId', '==', u.actor.companyId).where('status', '==', 'active'));
      assert(owners.docs.some(d => d.id !== record.id && (d.data().roleId ?? d.data().role) === 'OWNER'), 409, 'LAST_OWNER', 'Cannot remove the last active company OWNER');
    }
    return u.update(entity, record.id, values);
  }
  assert(record.schemaVersion === 1, 409, 'SCHEMA_REVIEW_REQUIRED', 'Legacy records require reviewed migration; their scope/schema will not be inferred');
  if (action === 'comment') { fields(data, ['message', 'notes']); assert(!(data.message && data.notes), 400, 'VALIDATION', 'Supply message or notes, not both'); return u.comment(entity, record.id, text(data.message ?? data.notes, 'message', 4000)); }
  if (action === 'update') {
    state(record, MASTER.includes(entity) ? 'active' : 'draft');
    return u.update(entity, record.id, MASTER.includes(entity) ? await validateMaster(u, entity, data, record) : await draftData(u, entity, data, record));
  }
  if (action === 'archive') { fields(data, []); state(record, 'active'); return u.update(entity, record.id, { status: 'archived', archivedAt: stamp() }); }
  if (['send', 'confirm', 'convert', 'invoice', 'bill', 'post'].includes(action)) fields(data, []);
  if (LINE_DOCS.includes(entity) && ['send', 'confirm', 'convert'].includes(action)) await validateSourceReferences(u, entity, record);
  if (action === 'send') { state(record, 'draft'); return u.update(entity, record.id, { status: 'sent', sentAt: stamp() }); }
  if (action === 'convert') {
    const target: Entity = entity === 'quotations' ? 'orders' : 'purchaseorders';
    const link = target === 'orders' ? 'orderId' : 'purchaseOrderId';
    const targetId = stableId(entity, record.id, target);
    if (record.status === 'converted') {
      assert(record[link] === targetId, 409, 'INVALID_SOURCE_LINK', 'Conversion link is inconsistent');
      await u.get(target, targetId); u.related[link] = targetId; return record;
    }
    state(record, 'accepted');
    await u.create(target, targetId, { customerId: record.customerId ?? null, supplierId: record.supplierId ?? null,
      ...(record.customerName ? { customerName: record.customerName } : {}), ...(record.supplierName ? { supplierName: record.supplierName } : {}),
      lines: record.lines, totalAmount: record.totalAmount, totalPaise: record.totalPaise, notes: record.notes,
      status: 'draft', [entity === 'quotations' ? 'quotationId' : 'rfqId']: record.id,
      ...(target === 'orders' ? { paymentStatus: 'unpaid' } : {}) });
    u.related[link] = targetId; return u.update(entity, record.id, { status: 'converted', [link]: targetId });
  }
  if (action === 'confirm') {
    if (entity === 'quotations' || entity === 'rfqs') { state(record, 'sent'); return u.update(entity, record.id, { status: 'accepted' }); }
    state(record, 'draft');
    const jobIds: Doc = {};
    if (entity === 'orders') for (const line of record.lines) {
      if (!line.jobType) continue;
      const jobs = sourceJobEntity(line.jobType); const jobId = stableId('orders', record.id, line.lineId, jobs);
      await u.create(jobs, jobId, { status: jobs === 'repair_jobs' ? 'received' : 'queued', orderId: record.id,
        customerId: record.customerId, productId: line.productId, quantity: line.quantity, lineId: line.lineId,
        jobType: line.jobType, productName: line.productName, notes: record.notes });
      jobIds[line.lineId] = jobId; u.related[`${jobs}:${line.lineId}`] = jobId;
    }
    return u.update(entity, record.id, { status: 'confirmed', confirmedAt: stamp(), ...(entity === 'orders' ? { jobIds } : {}) });
  }
  if (entity === 'orders' && action === 'deliver') return deliver(u, record, data);
  if (entity === 'orders' && action === 'invoice') {
    if (record.invoiceId) { await u.get('invoices', record.invoiceId); u.related.invoiceId = record.invoiceId; return record; }
    state(record, 'delivered'); assert(record.lines.every((l: Doc) => l.deliveredQuantity === l.quantity), 409, 'NOT_DELIVERED', 'All order quantities must be delivered before invoicing');
    const invoiceId = stableId('orders', record.id, 'invoices'); const paid = record.totalPaise === 0;
    await u.create('invoices', invoiceId, { status: paid ? 'paid' : 'issued', orderId: record.id, customerId: record.customerId,
      lines: record.lines, totalPaise: record.totalPaise, totalAmount: record.totalAmount, amountDuePaise: record.totalPaise,
      amountDue: record.totalAmount, amountPaidPaise: 0, amountPaid: 0, issuedAt: stamp() });
    u.related.invoiceId = invoiceId;
    return u.update(entity, record.id, { status: paid ? 'complete' : 'invoiced', invoiceId, paymentStatus: paid ? 'paid' : 'unpaid' });
  }
  if (entity === 'orders' && action === 'complete') {
    fields(data, []); state(record, 'invoiced', 'complete');
    assert(record.lines.every((l: Doc) => l.deliveredQuantity === l.quantity) && record.invoiceId, 409, 'NOT_DELIVERED', 'Order must be delivered and invoiced');
    const invoice = (await u.get('invoices', record.invoiceId))!;
    assert(invoice.status === 'paid' && invoice.amountPaidPaise === invoice.totalPaise, 409, 'NOT_PAID', 'Order must be fully paid');
    return record.status === 'complete' ? record : u.update(entity, record.id, { status: 'complete', paymentStatus: 'paid' });
  }
  if ((entity === 'invoices' || entity === 'purchasebills') && action === 'pay') return pay(u, record, data);
  if (entity === 'purchaseorders' && action === 'receive') return receive(u, record, data);
  if (entity === 'purchaseorders' && action === 'bill') return bill(u, record);
  if (action === 'post') {
    state(record, 'draft');
    if (entity === 'inventoryadjustments') await u.movement(record.productId, record.warehouseId,
      ['ADJUSTMENT_OUT', 'DAMAGE'].includes(record.type) ? -record.quantity : record.quantity, record.type, entity, record.id, record.reason);
    else if (entity === 'stocktransfers') {
      await u.movement(record.productId, record.fromWarehouseId, -record.quantity, 'TRANSFER_OUT', entity, record.id, record.reason);
      await u.movement(record.productId, record.toWarehouseId, record.quantity, 'TRANSFER_IN', entity, record.id, record.reason);
    } else if (entity === 'expenses') {
      const transactionId = stableId('expenses', record.id, 'transactions');
      await u.create('transactions', transactionId, { status: 'cleared', type: 'debit', direction: 'outgoing', expenseId: record.id,
        amount: record.amount, amountPaise: record.amountPaise, method: record.method, paymentMethod: record.method,
        reference: '', description: record.description, date: stamp() }); u.related.transactionId = transactionId;
    }
    return u.update(entity, record.id, { status: 'posted', postedAt: stamp() });
  }
  if (['manufacturing_jobs', 'printing_jobs', 'repair_jobs'].includes(entity)) return job(u, record, data);
  return fail(400, 'UNSUPPORTED_ACTION', `Unsupported action ${action} on ${entity}`);
}

async function deliver(u: Unit, order: Doc, data: Doc): Promise<Doc> {
  fields(data, ['warehouseId', 'lines']); state(order, 'confirmed', 'partially_delivered');
  const warehouseId = id(data.warehouseId, 'warehouseId'); const input = array(data.lines, 'lines');
  const lines = order.lines.map((l: Doc) => ({ ...l })); const seen = new Set<string>(); const delivered: Doc[] = [];
  const deliveryId = u.nextId('delivery');
  for (const item of input) {
    fields(item, ['lineId', 'quantity']); const lineId = id(item.lineId, 'lineId');
    assert(!seen.has(lineId), 400, 'VALIDATION', 'Duplicate delivery line'); seen.add(lineId);
    const line = lines.find((l: Doc) => l.lineId === lineId); assert(line, 400, 'VALIDATION', 'Unknown order line');
    const quantity = integer(item.quantity, 'quantity');
    assert(quantity <= line.quantity - line.deliveredQuantity, 409, 'OVERDELIVERY', 'Quantity exceeds undelivered order demand');
    if (line.jobType) {
      const linked = (await u.get(sourceJobEntity(line.jobType), order.jobIds[lineId]))!;
      state(linked, line.jobType === 'repair' ? 'ready' : 'complete');
    }
    if (line.stockTracked) await u.movement(line.productId, warehouseId, -quantity, 'SALE', 'deliveryorders', deliveryId, `Delivery for ${order.number}`);
    line.deliveredQuantity += quantity; line.remainingQuantity = line.quantity - line.deliveredQuantity;
    delivered.push({ lineId, productId: line.productId, quantity, unitPricePaise: line.unitPricePaise, unitPrice: line.unitPrice });
  }
  await u.create('deliveryorders', deliveryId, { status: 'posted', orderId: order.id, customerId: order.customerId, warehouseId, lines: delivered });
  u.related.deliveryOrderId = deliveryId;
  return u.update('orders', order.id, { lines, status: lines.every((l: Doc) => l.deliveredQuantity === l.quantity) ? 'delivered' : 'partially_delivered', deliveryIds: [...(order.deliveryIds ?? []), deliveryId] });
}
async function receive(u: Unit, order: Doc, data: Doc): Promise<Doc> {
  fields(data, ['warehouseId', 'lines', 'reason']); state(order, 'confirmed', 'partially_received');
  const warehouseId = id(data.warehouseId, 'warehouseId'); const reason = text(data.reason ?? '', 'reason', 1000, true);
  const lines = order.lines.map((l: Doc) => ({ ...l })); const seen = new Set<string>(); const received: Doc[] = [];
  const grnId = u.nextId('grn');
  for (const item of array(data.lines, 'lines')) {
    fields(item, ['lineId', 'accepted', 'rejected', 'damaged']); const lineId = id(item.lineId, 'lineId');
    assert(!seen.has(lineId), 400, 'VALIDATION', 'Duplicate receipt line'); seen.add(lineId);
    const line = lines.find((l: Doc) => l.lineId === lineId); assert(line, 400, 'VALIDATION', 'Unknown purchase order line');
    const accepted = integer(item.accepted, 'accepted', true); const rejected = integer(item.rejected, 'rejected', true); const damaged = integer(item.damaged, 'damaged', true);
    const accounted = sum([accepted, rejected, damaged]);
    assert(accounted > 0, 400, 'VALIDATION', 'Each receipt line must account for positive quantities');
    assert(accounted <= line.quantity - line.acceptedQuantity, 409, 'OVERRECEIPT', 'Receipt exceeds outstanding replacement demand');
    if (accepted && line.stockTracked) await u.movement(line.productId, warehouseId, accepted, 'PURCHASE', 'grns', grnId, reason || `Receipt for ${order.number}`);
    line.acceptedQuantity += accepted; line.receivedQuantity += accepted; line.rejectedQuantity = sum([line.rejectedQuantity, rejected]); line.damagedQuantity = sum([line.damagedQuantity, damaged]);
    line.remainingQuantity = line.quantity - line.acceptedQuantity;
    received.push({ lineId, productId: line.productId, accepted, rejected, damaged, unitPrice: line.unitPrice, unitPricePaise: line.unitPricePaise });
  }
  await u.create('grns', grnId, { status: 'posted', purchaseOrderId: order.id, supplierId: order.supplierId, warehouseId, reason, lines: received });
  u.related.grnId = grnId;
  return u.update('purchaseorders', order.id, { lines, status: lines.every((l: Doc) => l.acceptedQuantity === l.quantity) ? 'received' : 'partially_received', grnIds: [...(order.grnIds ?? []), grnId] });
}
async function bill(u: Unit, order: Doc): Promise<Doc> {
  state(order, 'received', 'partially_received');
  const lines = order.lines.map((l: Doc) => ({ ...l })); const billed: Doc[] = [];
  for (const line of lines) {
    const quantity = line.acceptedQuantity - line.billedQuantity;
    if (quantity > 0) { const totalPaise = multiply(quantity, line.unitPricePaise); billed.push({ lineId: line.lineId, productId: line.productId, quantity, unitPricePaise: line.unitPricePaise, unitPrice: line.unitPrice, totalPaise, totalAmount: totalPaise / 100 }); line.billedQuantity += quantity; }
  }
  assert(billed.length > 0, 409, 'NOTHING_TO_BILL', 'No accepted, unbilled quantities remain');
  const billId = stableId('purchaseorders', order.id, 'bill', canonical(lines.map((l: Doc) => [l.lineId, l.billedQuantity])));
  const totalPaise = sum(billed.map(l => l.totalPaise));
  await u.create('purchasebills', billId, { status: totalPaise === 0 ? 'paid' : 'issued', purchaseOrderId: order.id, supplierId: order.supplierId,
    lines: billed, totalPaise, totalAmount: totalPaise / 100, amountDuePaise: totalPaise, amountDue: totalPaise / 100, amountPaidPaise: 0, amountPaid: 0 });
  u.related.purchaseBillId = billId;
  return u.update('purchaseorders', order.id, { lines, billIds: [...(order.billIds ?? []), billId] });
}
async function pay(u: Unit, invoice: Doc, data: Doc): Promise<Doc> {
  fields(data, ['amount', 'method', 'reference']); state(invoice, 'issued', 'partially_paid');
  const amountPaise = money(data.amount); assert(amountPaise > 0, 400, 'VALIDATION', 'Payment must be positive');
  const method = choice(data.method, PAYMENT_METHODS, 'method'); const reference = text(data.reference ?? '', 'reference', 200, true);
  const amountPaidPaise = sum([invoice.amountPaidPaise, amountPaise]);
  assert(amountPaidPaise <= invoice.totalPaise, 409, 'OVERPAYMENT', 'Payment exceeds outstanding amount');
  const paid = amountPaidPaise === invoice.totalPaise; const incoming = u.command.entity === 'invoices';
  const transactionId = u.nextId('payment');
  await u.create('transactions', transactionId, { status: 'cleared', type: incoming ? 'credit' : 'debit', direction: incoming ? 'incoming' : 'outgoing',
    [incoming ? 'invoiceId' : 'purchaseBillId']: invoice.id, [incoming ? 'orderId' : 'purchaseOrderId']: incoming ? invoice.orderId : invoice.purchaseOrderId,
    amountPaise, amount: amountPaise / 100, method, paymentMethod: method, reference, referenceNumber: reference, date: stamp() });
  if (incoming) {
    const order = (await u.get('orders', invoice.orderId))!;
    assert(order.invoiceId === invoice.id, 409, 'INVALID_SOURCE_LINK', 'Invoice does not match order');
    const delivered = order.lines.every((l: Doc) => l.deliveredQuantity === l.quantity);
    assert(delivered, 409, 'NOT_DELIVERED', 'Linked order is not fully delivered');
    await u.update('orders', order.id, { paymentStatus: paid ? 'paid' : 'partially_paid', ...(paid ? { status: 'complete', completedAt: stamp() } : {}) });
  } else {
    const order = (await u.get('purchaseorders', invoice.purchaseOrderId))!;
    assert(order.billIds.includes(invoice.id), 409, 'INVALID_SOURCE_LINK', 'Bill does not match purchase order');
  }
  u.related.transactionId = transactionId;
  return u.update(u.command.entity, invoice.id, { status: paid ? 'paid' : 'partially_paid', amountPaidPaise, amountPaid: amountPaidPaise / 100,
    amountDuePaise: invoice.totalPaise - amountPaidPaise, amountDue: (invoice.totalPaise - amountPaidPaise) / 100 });
}
async function job(u: Unit, record: Doc, data: Doc): Promise<Doc> {
  const { entity, action } = u.command;
  const order = (await u.get('orders', record.orderId))!;
  assert(order.jobIds?.[record.lineId] === record.id, 409, 'INVALID_SOURCE_LINK', 'Job is not linked to its order line');
  if (action === 'start') {
    state(record, entity === 'repair_jobs' ? 'received' : 'queued');
    let materials: Doc[] = [];
    if (entity === 'manufacturing_jobs') {
      fields(data, ['warehouseId', 'materials']); const warehouseId = id(data.warehouseId, 'warehouseId'); const seen = new Set<string>();
      materials = array(data.materials, 'materials').map(m => { fields(m, ['productId', 'quantity']); return { productId: id(m.productId, 'productId'), quantity: integer(m.quantity, 'quantity') }; });
      for (const material of materials) {
        assert(!seen.has(material.productId), 400, 'VALIDATION', 'Duplicate material product'); seen.add(material.productId);
        await u.movement(material.productId, warehouseId, -material.quantity, 'MANUFACTURING_CONSUMPTION', entity, record.id, `Inputs for ${record.number}`);
      }
    } else fields(data, []);
    return u.update(entity, record.id, { status: entity === 'repair_jobs' ? 'in_repair' : 'in_progress', startedAt: stamp(),
      ...(entity === 'manufacturing_jobs' ? { materials, inputWarehouseId: data.warehouseId } : {}) });
  }
  state(record, entity === 'repair_jobs' ? 'in_repair' : 'in_progress');
  const values: Doc = { status: entity === 'repair_jobs' ? 'ready' : 'complete', completedAt: stamp() };
  if (entity === 'manufacturing_jobs') {
    fields(data, ['warehouseId', 'productId', 'quantity']); const warehouseId = id(data.warehouseId, 'warehouseId');
    const productId = id(data.productId, 'productId'); const quantity = integer(data.quantity, 'quantity');
    assert(productId === record.productId && quantity <= record.quantity, 409, 'INVALID_OUTPUT', 'Output must match job product and not exceed job quantity');
    await u.movement(productId, warehouseId, quantity, 'MANUFACTURING_OUTPUT', entity, record.id, `Output for ${record.number}`);
    Object.assign(values, { outputProductId: productId, outputQuantity: quantity, outputWarehouseId: warehouseId });
  } else fields(data, []);
  return u.update(entity, record.id, values);
}

export function createErpService(db: Firestore) {
  return {
    async list(actor: Actor, entity: Entity | string): Promise<ERPRecord[]> {
      validateActor(actor); assert(ENTITIES.includes(entity as Entity), 400, 'UNKNOWN_ENTITY', 'Unknown ERP entity');
      assert(canRead(actor.role, entity as Entity), 403, 'FORBIDDEN', 'Role cannot read this entity');
      profile(actor, (await db.collection('users').doc(actor.uid).get()).data());
      // Intentionally no hidden .limit(): failures propagate rather than return incomplete/empty results.
      const snapshot = await db.collection(entity).where('companyId', '==', actor.companyId).where('branchId', '==', actor.branchId).get();
      return snapshot.docs.map(d => ({ ...d.data(), id: d.id })).filter(d => entity !== 'notifications' || relevantNotification(actor, d)).map(serialize) as ERPRecord[];
    },
    async execute(actor: Actor, input: ERPCommand): Promise<ERPResult> {
      validateActor(actor); const raw = object(input, 'command'); fields(raw, ['entity', 'action', 'id', 'data', 'idempotencyKey']);
      const entity = choice(raw.entity, ENTITIES, 'entity'); const action = text(raw.action, 'action', 40);
      assert(ACTIONS[entity].includes(action), 400, 'UNSUPPORTED_ACTION', 'This entity does not support this action');
      assert(canExecute(actor.role, entity, action), 403, 'FORBIDDEN', 'Role cannot perform this action');
      const data = object(raw.data); const idempotencyKey = text(raw.idempotencyKey, 'idempotencyKey', 200);
      if (raw.id !== undefined) id(raw.id);
      const command: ERPCommand = { entity, action, ...(raw.id !== undefined ? { id: raw.id } : {}), data, idempotencyKey };
      const payload = canonical({ actor: { uid: actor.uid, role: actor.role, companyId: actor.companyId, branchId: actor.branchId }, command });
      assert(Buffer.byteLength(payload, 'utf8') <= 120_000, 400, 'COMMAND_TOO_LARGE', 'Command is too large');
      assert(process.env.FIRESTORE_EMULATOR_HOST || process.env.ERP_SCHEMA_APPROVED === 'true', 503, 'SCHEMA_NOT_APPROVED', 'Production writes require explicit ERP_SCHEMA_APPROVED=true after authenticated schema review');
      const operationId = hash(idempotencyKey); const fingerprint = hash(payload); const receipt = db.collection(IDEMPOTENCY_COLLECTION).doc(operationId);
      const replayed = await db.runTransaction(async tx => {
        const user = await tx.get(db.collection('users').doc(actor.uid)); profile(actor, user.data());
        const prior = await tx.get(receipt);
        if (prior.exists) {
          assert(prior.data()!.fingerprint === fingerprint, 409, 'IDEMPOTENCY_CONFLICT', 'Idempotency key was already used with a different payload or actor'); return true;
        }
        const u = new Unit(db, tx, actor, command, operationId);
        const record = await run(u); const result = { record, ...(Object.keys(u.related).length ? { related: u.related } : {}) };
        u.flush();
        tx.create(receipt, { fingerprint, actorId: actor.uid, companyId: actor.companyId, branchId: actor.branchId, result, createdAt: stamp() });
        return false;
      });
      // Read the immutable receipt AFTER commit to return materialized server timestamps and the exact original result.
      const saved = await receipt.get(); assert(saved.exists, 503, 'RESULT_UNAVAILABLE', 'Committed outcome unavailable; retry the same idempotency key');
      return { ...serialize(saved.data()!.result), replayed } as ERPResult;
    },
  };
}
