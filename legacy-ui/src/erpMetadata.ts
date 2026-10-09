import type { ERPRecord } from './services/erpApi';
import type { UserRole } from './types/auth';
export interface EntityMeta { label: string; stages: string[]; create?: boolean; master?: boolean; roles: UserRole[] }
const sales: UserRole[] = ['SALES'];
const inventory: UserRole[] = ['INVENTORY'];
const purchasing: UserRole[] = ['PURCHASING'];
const accounting: UserRole[] = ['ACCOUNTING'];
export const ENTITIES: Record<string, EntityMeta> = {
  products: { label: 'Products', stages: ['active', 'archived'], create: true, master: true, roles: inventory },
  customers: { label: 'Customers', stages: ['active', 'archived'], create: true, master: true, roles: sales },
  suppliers: { label: 'Suppliers', stages: ['active', 'archived'], create: true, master: true, roles: purchasing },
  quotations: { label: 'Quotations', stages: ['draft', 'sent', 'accepted', 'converted'], create: true, roles: sales },
  orders: { label: 'Sales Orders', stages: ['draft', 'confirmed', 'partially_delivered', 'delivered', 'invoiced', 'complete'], create: true, roles: sales },
  deliveryorders: { label: 'Deliveries', stages: ['done'], roles: [] },
  invoices: { label: 'Customer Invoices', stages: ['issued', 'partially_paid', 'paid'], roles: accounting },
  rfqs: { label: 'Requests for Quotation', stages: ['draft', 'sent', 'accepted', 'converted'], create: true, roles: purchasing },
  purchaseorders: { label: 'Purchase Orders', stages: ['draft', 'confirmed', 'partially_received', 'received'], create: true, roles: purchasing },
  grns: { label: 'Goods Receipt Notes', stages: ['posted'], roles: [] },
  purchasebills: { label: 'Vendor Bills', stages: ['issued', 'partially_paid', 'paid'], roles: accounting },
  inventory: { label: 'Stock Balances', stages: [], roles: [] },
  inventorytransactions: { label: 'Stock Ledger', stages: [], roles: [] },
  inventoryadjustments: { label: 'Stock Adjustments', stages: ['draft', 'posted'], create: true, roles: inventory },
  stocktransfers: { label: 'Stock Transfers', stages: ['draft', 'posted'], create: true, roles: inventory },
  manufacturing_jobs: { label: 'Manufacturing Jobs', stages: ['queued', 'in_progress', 'complete'], roles: ['PRODUCTION'] },
  printing_jobs: { label: 'Printing & Sublimation Jobs', stages: ['queued', 'in_progress', 'complete'], roles: ['PRINTING'] },
  repair_jobs: { label: 'Repair Jobs', stages: ['received', 'in_repair', 'ready'], roles: ['SERVICE'] },
  expenses: { label: 'Expenses', stages: ['draft', 'posted'], create: true, roles: accounting },
  transactions: { label: 'Payments Ledger', stages: [], roles: [] },
  notifications: { label: 'Notifications', stages: ['unread', 'read'], roles: ['SALES', 'INVENTORY', 'PURCHASING', 'PRODUCTION', 'PRINTING', 'SERVICE', 'ACCOUNTING', 'VIEWER'] },
  auditlogs: { label: 'Audit Trail', stages: [], roles: [] },
  users: { label: 'Staff Access', stages: ['active', 'suspended'], roles: [] },
};
export const MODULES: Record<string, { title: string; entities: string[]; unavailable?: string }> = {
  dashboard: { title: 'Cockpit', entities: [] },
  orders: { title: 'Sales', entities: ['quotations', 'orders', 'deliveryorders', 'invoices', 'customers'] },
  purchasing: { title: 'Purchasing', entities: ['rfqs', 'purchaseorders', 'grns', 'purchasebills', 'suppliers'] },
  inventory: { title: 'Inventory', entities: ['inventory', 'products', 'inventorytransactions', 'inventoryadjustments', 'stocktransfers'] },
  manufacturing: { title: 'Manufacturing', entities: ['manufacturing_jobs'] },
  printing: { title: 'Printing & Sublimation', entities: ['printing_jobs'] },
  servicing: { title: 'Repairs & Servicing', entities: ['repair_jobs'] },
  billing: { title: 'Accounting', entities: ['invoices', 'purchasebills', 'transactions', 'expenses'], unavailable: 'Counter POS checkout and tax filing are unavailable. Use the sales order / invoice workflow.' },
  customers: { title: 'Contacts', entities: ['customers', 'suppliers'] },
  reports: { title: 'Reports', entities: [] },
  staff: { title: 'Staff Access', entities: ['users'], unavailable: 'New staff provisioning and invitations require the trusted operator workflow. Attendance and payroll are unavailable.' },
  notifications: { title: 'Notifications & Audit', entities: ['notifications', 'auditlogs'] },
  drive: { title: 'Document Vault', entities: [], unavailable: 'Unavailable: cloud document storage is not connected to the ERP API.' },
  settings: { title: 'Company & Branch Settings', entities: [], unavailable: 'Unavailable: company, branch and warehouse provisioning require a trusted operator. The active scope is taken only from your authenticated profile.' },
};
export function canWrite(role: UserRole, entity: string) {
  if (entity === 'users') return role === 'OWNER' || role === 'ADMIN';
  if (['inventory', 'inventorytransactions', 'transactions', 'auditlogs', 'grns', 'deliveryorders'].includes(entity)) return false;
  return ['OWNER', 'ADMIN', 'MANAGER'].includes(role) || !!ENTITIES[entity]?.roles.includes(role);
}
export function actionsFor(entity: string, record: ERPRecord): string[] {
  const status = record.status;
  if (ENTITIES[entity]?.master) return status === 'archived' ? [] : ['update', 'archive'];
  if (entity === 'users') return ['update'];
  if (entity === 'quotations' || entity === 'rfqs') return status === 'draft' ? ['update', 'send'] : status === 'sent' ? ['confirm'] : status === 'accepted' ? ['convert'] : [];
  if (entity === 'orders') return status === 'draft' ? ['update', 'confirm'] : ['confirmed', 'partially_delivered'].includes(status) ? ['deliver'] : status === 'delivered' ? ['invoice'] : status === 'invoiced' ? ['complete'] : [];
  if (entity === 'purchaseorders') return status === 'draft' ? ['update', 'confirm'] : status === 'confirmed' ? ['receive'] : status === 'partially_received' ? ['receive', 'bill'] : status === 'received' ? ['bill'] : [];
  if (entity === 'invoices' || entity === 'purchasebills') return status === 'paid' ? [] : ['pay'];
  if (['inventoryadjustments', 'stocktransfers', 'expenses'].includes(entity)) return status === 'draft' ? ['post'] : [];
  if (entity === 'manufacturing_jobs' || entity === 'printing_jobs') return status === 'queued' ? ['start'] : status === 'in_progress' ? ['complete'] : [];
  if (entity === 'repair_jobs') return status === 'received' ? ['start'] : status === 'in_repair' ? ['complete'] : [];
  if (entity === 'notifications') return record.read === true || status === 'read' ? [] : ['markRead'];
  return [];
}
export const ACTION_LABELS: Record<string, string> = { create: 'Create', update: 'Save changes', archive: 'Archive', send: 'Mark sent', confirm: 'Confirm', convert: 'Convert to order', deliver: 'Deliver quantities', invoice: 'Issue invoice', pay: 'Register payment', receive: 'Receive goods', bill: 'Bill received quantities', post: 'Post', start: 'Start job', complete: 'Complete', markRead: 'Mark read', comment: 'Log note' };
export function display(value: any): string {
  if (value === undefined || value === null || value === '') return '—';
  if (typeof value === 'object') {
    const seconds = value._seconds ?? value.seconds;
    if (typeof seconds === 'number') return new Date(seconds * 1000).toLocaleString('en-IN');
    return JSON.stringify(value);
  }
  return String(value);
}
export function titleOf(record: ERPRecord) { return String(record.number || record.name || record.description || record.id); }
export function money(value: unknown) { return typeof value === 'number' && Number.isFinite(value) ? new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(value) : '—'; }
export function amountOf(record: ERPRecord): number | undefined { return typeof record.totalAmount === 'number' ? record.totalAmount : typeof record.amount === 'number' ? record.amount : undefined; }
export function groupRecords(records: ERPRecord[], key: string) {
  return records.reduce<Record<string, ERPRecord[]>>((groups, record) => { const value = key === 'none' ? 'All records' : display(record[key]); (groups[value] ||= []).push(record); return groups; }, {});
}
export function sumMoney(records: ERPRecord[], key: string) { return records.reduce((sum, record) => sum + (typeof record[key] === 'number' && Number.isFinite(record[key]) ? Math.round(record[key] * 100) : 0), 0) / 100; }
export function aggregateReport(records: ERPRecord[]) {
  const statuses: Record<string, number> = Object.create(null);
  let amountCount = 0, totalPaise = 0, balanceCount = 0, balancePaise = 0;
  for (const record of records) {
    const status = display(record.status); statuses[status] = (statuses[status] || 0) + 1;
    const amount = amountOf(record);
    if (amount !== undefined) { amountCount++; totalPaise += Math.round(amount * 100); }
    if (typeof record.totalAmount === 'number' && Number.isFinite(record.totalAmount) && typeof record.amountPaid === 'number' && Number.isFinite(record.amountPaid)) {
      balanceCount++; balancePaise += Math.max(0, Math.round(record.totalAmount * 100) - Math.round(record.amountPaid * 100));
    }
  }
  return { count: records.length, statuses, amountCount, totalAmount: totalPaise / 100, balanceCount, outstanding: balancePaise / 100 };
}
