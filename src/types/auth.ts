export const ROLES = ['OWNER', 'ADMIN', 'MANAGER', 'SALES', 'INVENTORY', 'PURCHASING', 'PRODUCTION', 'PRINTING', 'SERVICE', 'ACCOUNTING', 'VIEWER'] as const;
export type UserRole = typeof ROLES[number];
export interface UserProfile {
  uid: string;
  role: UserRole;
  companyId: string;
  branchId: string;
  name?: string;
}
