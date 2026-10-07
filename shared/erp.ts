/** Canonical collection names. No sales_orders/payments/stock_movements aliases. */
export const ENTITIES = [
  'products', 'customers', 'suppliers', 'quotations', 'orders', 'deliveryorders', 'invoices',
  'rfqs', 'purchaseorders', 'grns', 'purchasebills', 'inventoryadjustments', 'stocktransfers',
  'inventory', 'inventorytransactions', 'transactions', 'manufacturing_jobs', 'printing_jobs',
  'repair_jobs', 'expenses', 'notifications', 'users', 'auditlogs', 'roles', 'settings',
  'teams', 'analytics', 'manufacturing_workflows',
] as const;
export type Entity = typeof ENTITIES[number];
export const ROLES = ['OWNER', 'ADMIN', 'MANAGER', 'SALES', 'INVENTORY', 'PURCHASING',
  'PRODUCTION', 'PRINTING', 'SERVICE', 'ACCOUNTING', 'VIEWER'] as const;
export type Role = typeof ROLES[number];
export interface Actor { uid: string; role: Role; companyId: string; branchId: string; name?: string }
export interface ERPRecord {
  id: string; number: string; companyId: string; branchId: string; status: string; notes: string;
  createdAt: unknown; updatedAt: unknown; createdBy: string; updatedBy: string;
  [field: string]: any;
}
export interface ERPCommand {
  entity: Entity; action: string; id?: string; data: Record<string, unknown>; idempotencyKey: string;
}
export interface ERPResult { record: ERPRecord; related?: Record<string, string>; replayed?: boolean }
export type Command = ERPCommand;
export type CommandResult = ERPResult;
export const PAYMENT_METHODS = ['cash', 'card', 'bank_transfer', 'upi'] as const;
export const JOB_TYPES = ['manufacturing', 'printing', 'sublimation', 'repair'] as const;
export const ADJUSTMENT_TYPES = ['OPENING_STOCK', 'ADJUSTMENT_IN', 'ADJUSTMENT_OUT', 'DAMAGE'] as const;
const masters = ['create', 'update', 'archive', 'comment'];
export const ACTIONS: Record<Entity, readonly string[]> = {
  products: masters, customers: masters, suppliers: masters,
  quotations: ['create', 'update', 'send', 'confirm', 'convert', 'comment'],
  orders: ['create', 'update', 'confirm', 'deliver', 'invoice', 'complete', 'comment'],
  rfqs: ['create', 'update', 'send', 'confirm', 'convert', 'comment'],
  purchaseorders: ['create', 'update', 'confirm', 'receive', 'bill', 'comment'],
  invoices: ['pay', 'comment'], purchasebills: ['pay', 'comment'],
  inventoryadjustments: ['create', 'update', 'post', 'comment'],
  stocktransfers: ['create', 'update', 'post', 'comment'], expenses: ['create', 'update', 'post', 'comment'],
  manufacturing_jobs: ['start', 'complete', 'comment'], printing_jobs: ['start', 'complete', 'comment'],
  repair_jobs: ['start', 'complete', 'comment'], notifications: ['markRead'], users: ['update'],
  deliveryorders: ['comment'], grns: ['comment'], inventory: [], inventorytransactions: [], transactions: [],
  auditlogs: [], roles: [], settings: [], teams: [], analytics: [], manufacturing_workflows: [],
};
export const STATUSES: Partial<Record<Entity, readonly string[]>> = {
  products: ['active', 'archived'], customers: ['active', 'archived'], suppliers: ['active', 'archived'],
  quotations: ['draft', 'sent', 'accepted', 'converted'], rfqs: ['draft', 'sent', 'accepted', 'converted'],
  orders: ['draft', 'confirmed', 'partially_delivered', 'delivered', 'invoiced', 'complete'],
  purchaseorders: ['draft', 'confirmed', 'partially_received', 'received'],
  invoices: ['issued', 'partially_paid', 'paid'], purchasebills: ['issued', 'partially_paid', 'paid'],
  inventoryadjustments: ['draft', 'posted'], stocktransfers: ['draft', 'posted'], expenses: ['draft', 'posted'],
  manufacturing_jobs: ['queued', 'in_progress', 'complete'], printing_jobs: ['queued', 'in_progress', 'complete'],
  repair_jobs: ['received', 'in_repair', 'ready'], users: ['active', 'suspended', 'invited'],
};
export const STATUS_METADATA = STATUSES;
/** Domain-specific write roles; management is granted separately, except user administration. */
export const WRITE_ROLES: Partial<Record<Entity, readonly Role[]>> = {
  products: ['INVENTORY', 'PURCHASING'], customers: ['SALES'], suppliers: ['PURCHASING'],
  quotations: ['SALES'], orders: ['SALES'], deliveryorders: ['SALES', 'INVENTORY'], invoices: ['ACCOUNTING', 'SALES'],
  rfqs: ['PURCHASING'], purchaseorders: ['PURCHASING'], grns: ['PURCHASING', 'INVENTORY'],
  purchasebills: ['ACCOUNTING'], inventoryadjustments: ['INVENTORY'], stocktransfers: ['INVENTORY'],
  manufacturing_jobs: ['PRODUCTION'], printing_jobs: ['PRINTING'], repair_jobs: ['SERVICE'], expenses: ['ACCOUNTING'],
};
export const MANAGEMENT_ROLES: readonly Role[] = ['OWNER', 'ADMIN', 'MANAGER'];
export function canExecute(role: Role, entity: Entity, action: string): boolean {
  if (!ROLES.includes(role) || !ENTITIES.includes(entity) || !ACTIONS[entity].includes(action)) return false;
  if (entity === 'users') return role === 'OWNER' || role === 'ADMIN';
  if (entity === 'notifications') return true;
  if (MANAGEMENT_ROLES.includes(role)) return true;
  if (role === 'VIEWER') return false;
  if (entity === 'orders' && action === 'deliver') return role === 'SALES' || role === 'INVENTORY';
  if (entity === 'orders' && action === 'invoice') return role === 'SALES' || role === 'ACCOUNTING';
  if (entity === 'purchaseorders' && action === 'receive') return role === 'PURCHASING' || role === 'INVENTORY';
  if (entity === 'purchaseorders' && action === 'bill') return role === 'PURCHASING' || role === 'ACCOUNTING';
  return !!WRITE_ROLES[entity]?.includes(role);
}
export function canRead(role: Role, entity: Entity): boolean {
  if (!ROLES.includes(role) || !ENTITIES.includes(entity)) return false;
  if (MANAGEMENT_ROLES.includes(role)) return true;
  if (['users', 'roles', 'settings', 'auditlogs'].includes(entity)) return false;
  if (entity === 'invoices') return role === 'SALES' || role === 'ACCOUNTING';
  if (entity === 'purchasebills') return role === 'PURCHASING' || role === 'ACCOUNTING';
  if (['transactions', 'expenses', 'analytics'].includes(entity)) return role === 'ACCOUNTING';
  return true;
}
