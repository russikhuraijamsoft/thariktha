export type UserRole = 'super_admin' | 'manager' | 'manufacturing_staff' | 'printing_staff' | 'cashier' | 'inventory_manager';

export interface UserProfile {
  uid: string;
  name: string;
  email: string;
  roleId: UserRole;
  branchId: string;
  status: 'active' | 'suspended' | 'invited';
  createdAt: string;
  updatedAt: string;
  lastLoginAt?: string;
  phone?: string;
}

export interface AccessRoleDefinition {
  id: UserRole;
  name: string;
  description: string;
  permissions: string[];
}

export const ROLE_DEFINITIONS: Record<UserRole, AccessRoleDefinition> = {
  super_admin: {
    id: 'super_admin',
    name: 'Super Admin',
    description: 'Deploys cloud configurations, handles global sports ERP master records, alters roles, manages staff registers.',
    permissions: [
      'read:all', 'write:all',
      'manage:staff', 'update:role',
      'view:analytics', 'manage:billing',
      'write:orders', 'write:jobs', 'write:inventory'
    ]
  },
  manager: {
    id: 'manager',
    name: 'Branch Manager',
    description: 'Monitors physical branch closets, validates customized cricket assemblies, executes billing ledgers, analyzes localized metrics.',
    permissions: [
      'read:branch', 'write:orders',
      'manage:billing', 'view:analytics',
      'write:jobs', 'write:inventory'
    ]
  },
  manufacturing_staff: {
    id: 'manufacturing_staff',
    name: 'Manufacturing Staff',
    description: 'Professional wood craftsmen editing handles splicing, bat blade shaping, sweetspot pressing, and QA audits.',
    permissions: [
      'read:jobs', 'update:job_status',
      'read:inventory'
    ]
  },
  printing_staff: {
    id: 'printing_staff',
    name: 'Printing Staff',
    description: 'Sublimation printer technicians setting PMS ink pantones, matching apparel vectors, and curing screen-prints.',
    permissions: [
      'read:jobs', 'update:job_status',
      'read:inventory'
    ]
  },
  cashier: {
    id: 'cashier',
    name: 'Cashier Desk',
    description: 'Maintains petty cash drawer, receives bank transfer settlements, logs ledger invoices credits, issues receipts.',
    permissions: [
      'read:branch', 'write:payments',
      'read:billing', 'update:invoice_status'
    ]
  },
  inventory_manager: {
    id: 'inventory_manager',
    name: 'Inventory Manager',
    description: 'Coordinates stockroom warehouse, tracks safety stock alerts, conducts material audits, logs reorder placements.',
    permissions: [
      'read:inventory', 'write:inventory',
      'read:branch', 'trigger:reorders'
    ]
  }
};
