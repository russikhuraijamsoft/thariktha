import type { ERPRecord } from './services/erpApi';
export type FormValues = Record<string, any>;
export const LINE_DOCUMENTS = ['quotations', 'orders', 'rfqs', 'purchaseorders'];
function text(value: unknown, label: string) { const v = String(value ?? '').trim(); if (!v) throw new Error(`${label} is required.`); return v; }
function quantity(value: unknown, label: string, zero = false) {
  if (value === '' || value === undefined || value === null) throw new Error(`${label} is required.`);
  const v = Number(value);
  if (!Number.isSafeInteger(v) || v < (zero ? 0 : 1)) throw new Error(`${label} must be a ${zero ? 'non-negative' : 'positive'} whole number.`);
  return v;
}
function amount(value: unknown, label: string, positive = false) {
  if (value === '' || value === undefined || value === null) throw new Error(`${label} is required.`);
  const v = Number(value);
  if (!Number.isFinite(v) || v < 0 || (positive && v === 0) || Math.abs(v * 100 - Math.round(v * 100)) > 0.000001) throw new Error(`${label} must be ${positive ? 'positive' : 'non-negative'} INR with at most two decimal places.`);
  return v;
}
export function initialValues(entity: string, action: string, record?: ERPRecord): FormValues {
  if (action === 'update' && record) return { ...record, lines: record.lines?.map((line: any) => ({ ...line })) };
  if (action === 'deliver' || action === 'receive') return { warehouseId: '', reason: '', lines: (record?.lines || []).map((line: any) => ({ lineId: line.id || line.lineId, quantity: 0, accepted: 0, rejected: 0, damaged: 0 })) };
  if (action === 'pay') return { amount: '', method: 'cash', reference: '' };
  if (action === 'start' && entity === 'manufacturing_jobs') return { warehouseId: '', materials: [{ productId: '', quantity: 1 }] };
  if (action === 'complete' && entity === 'manufacturing_jobs') return { warehouseId: '', productId: record?.productId || '', quantity: '' };
  if (LINE_DOCUMENTS.includes(entity) && action === 'create') return { customerId: '', supplierId: '', notes: '', lines: [{ productId: '', quantity: 1, unitPrice: '', jobType: '' }] };
  if (entity === 'products') return { name: '', sku: '', category: '', unitPrice: '', costPrice: '', stockTracked: true, minimumStock: 0, notes: '' };
  if (entity === 'inventoryadjustments') return { productId: '', warehouseId: '', quantity: '', type: 'OPENING_STOCK', reason: '' };
  if (entity === 'expenses') return { description: '', amount: '', method: 'cash', notes: '' };
  return {};
}
export function buildCommandData(entity: string, action: string, values: FormValues): Record<string, unknown> {
  if (action === 'comment') return { body: text(values.body, 'Note') };
  if (action === 'pay') return { amount: amount(values.amount, 'Payment amount', true), method: text(values.method, 'Payment method'), reference: String(values.reference || '').trim() };
  if (action === 'deliver' || action === 'receive') {
    const lines = (values.lines || []).map((line: any) => action === 'deliver'
      ? { lineId: text(line.lineId, 'Line ID'), quantity: quantity(line.quantity, 'Delivery quantity', true) }
      : { lineId: text(line.lineId, 'Line ID'), accepted: quantity(line.accepted, 'Accepted quantity', true), rejected: quantity(line.rejected, 'Rejected quantity', true), damaged: quantity(line.damaged, 'Damaged quantity', true) })
      .filter((line: any) => action === 'deliver' ? line.quantity > 0 : line.accepted + line.rejected + line.damaged > 0);
    if (!lines.length) throw new Error('Enter a positive quantity on at least one line.');
    return { warehouseId: text(values.warehouseId, 'Warehouse ID'), lines, ...(action === 'receive' && values.reason ? { reason: values.reason.trim() } : {}) };
  }
  if (entity === 'manufacturing_jobs' && action === 'start') {
    const materials = (values.materials || []).map((m: any) => ({ productId: text(m.productId, 'Material'), quantity: quantity(m.quantity, 'Material quantity') }));
    if (!materials.length) throw new Error('At least one material is required.');
    return { warehouseId: text(values.warehouseId, 'Warehouse ID'), materials };
  }
  if (entity === 'manufacturing_jobs' && action === 'complete') return { warehouseId: text(values.warehouseId, 'Warehouse ID'), productId: text(values.productId, 'Output product'), quantity: quantity(values.quantity, 'Output quantity') };
  if (!['create', 'update'].includes(action)) return {};
  if (entity === 'products') return {
    name: text(values.name, 'Name'), sku: text(values.sku, 'SKU'), unitPrice: amount(values.unitPrice, 'Unit price'), costPrice: amount(values.costPrice, 'Cost price'), stockTracked: !!values.stockTracked,
    category: String(values.category || '').trim(), minimumStock: quantity(values.minimumStock, 'Minimum stock', true), notes: String(values.notes || ''),
  };
  if (entity === 'customers' || entity === 'suppliers') return { name: text(values.name, 'Name'), email: String(values.email || '').trim(), phone: String(values.phone || '').trim(), address: String(values.address || '').trim(), notes: String(values.notes || '') };
  if (entity === 'users') return { role: text(values.role || values.roleId, 'Role'), status: text(values.status, 'Status') };
  if (LINE_DOCUMENTS.includes(entity)) {
    const party = entity === 'rfqs' || entity === 'purchaseorders' ? 'supplierId' : 'customerId';
    const lines = (values.lines || []).map((line: any) => ({ productId: text(line.productId, 'Product'), quantity: quantity(line.quantity, 'Line quantity'), unitPrice: amount(line.unitPrice, 'Unit price'), ...(party === 'customerId' && line.jobType ? { jobType: line.jobType } : {}) }));
    if (!lines.length) throw new Error('Add at least one line.');
    return { [party]: text(values[party], party === 'supplierId' ? 'Supplier' : 'Customer'), lines, notes: String(values.notes || '') };
  }
  if (entity === 'inventoryadjustments') return { productId: text(values.productId, 'Product'), warehouseId: text(values.warehouseId, 'Warehouse ID'), quantity: quantity(values.quantity, 'Quantity'), type: text(values.type, 'Adjustment type'), reason: text(values.reason, 'Reason') };
  if (entity === 'stocktransfers') {
    const fromWarehouseId = text(values.fromWarehouseId, 'Source warehouse ID'), toWarehouseId = text(values.toWarehouseId, 'Destination warehouse ID');
    if (fromWarehouseId === toWarehouseId) throw new Error('Source and destination warehouses must differ.');
    return { productId: text(values.productId, 'Product'), quantity: quantity(values.quantity, 'Quantity'), fromWarehouseId, toWarehouseId, reason: text(values.reason, 'Reason') };
  }
  if (entity === 'expenses') return { description: text(values.description, 'Description'), amount: amount(values.amount, 'Amount', true), method: text(values.method, 'Payment method'), notes: String(values.notes || '') };
  throw new Error('This form is unavailable; no command was sent.');
}
