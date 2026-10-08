/**
 * Input validation schemas for all API endpoints.
 * Each schema defines required fields, types, and constraints.
 */

export interface ValidationResult {
  valid: boolean;
  errors: string[];
}

type FieldType = 'string' | 'number' | 'boolean' | 'array' | 'object';

interface FieldDef {
  type: FieldType;
  required: boolean;
  minLength?: number;
  maxLength?: number;
  min?: number;
  max?: number;
  pattern?: RegExp;
  enum?: string[];
  itemType?: FieldType;
}

function validateField(name: string, value: any, def: FieldDef): string[] {
  const errors: string[] = [];

  if (value === undefined || value === null) {
    if (def.required) {
      errors.push(`Field '${name}' is required`);
    }
    return errors;
  }

  switch (def.type) {
    case 'string':
      if (typeof value !== 'string') {
        errors.push(`Field '${name}' must be a string`);
        break;
      }
      if (def.minLength !== undefined && value.length < def.minLength) {
        errors.push(`Field '${name}' must be at least ${def.minLength} characters`);
      }
      if (def.maxLength !== undefined && value.length > def.maxLength) {
        errors.push(`Field '${name}' must be at most ${def.maxLength} characters`);
      }
      if (def.pattern && !def.pattern.test(value)) {
        errors.push(`Field '${name}' has invalid format`);
      }
      if (def.enum && !def.enum.includes(value)) {
        errors.push(`Field '${name}' must be one of: ${def.enum.join(', ')}`);
      }
      break;

    case 'number':
      if (typeof value !== 'number' || isNaN(value)) {
        errors.push(`Field '${name}' must be a valid number`);
        break;
      }
      if (def.min !== undefined && value < def.min) {
        errors.push(`Field '${name}' must be >= ${def.min}`);
      }
      if (def.max !== undefined && value > def.max) {
        errors.push(`Field '${name}' must be <= ${def.max}`);
      }
      break;

    case 'boolean':
      if (typeof value !== 'boolean') {
        errors.push(`Field '${name}' must be a boolean`);
      }
      break;

    case 'array':
      if (!Array.isArray(value)) {
        errors.push(`Field '${name}' must be an array`);
        break;
      }
      if (def.minLength !== undefined && value.length < def.minLength) {
        errors.push(`Field '${name}' must have at least ${def.minLength} items`);
      }
      if (def.maxLength !== undefined && value.length > def.maxLength) {
        errors.push(`Field '${name}' must have at most ${def.maxLength} items`);
      }
      break;

    case 'object':
      if (typeof value !== 'object' || value === null || Array.isArray(value)) {
        errors.push(`Field '${name}' must be an object`);
      }
      break;
  }

  return errors;
}

export function validate(data: any, schema: Record<string, FieldDef>): ValidationResult {
  const errors: string[] = [];

  if (typeof data !== 'object' || data === null || Array.isArray(data)) {
    return { valid: false, errors: ['Request body must be a JSON object'] };
  }

  for (const [field, def] of Object.entries(schema)) {
    const fieldErrors = validateField(field, data[field], def);
    errors.push(...fieldErrors);
  }

  // Check for unexpected fields (strict mode)
  const allowedFields = new Set(Object.keys(schema));
  for (const key of Object.keys(data)) {
    if (!allowedFields.has(key)) {
      errors.push(`Unexpected field '${key}'`);
    }
  }

  return { valid: errors.length === 0, errors };
}

// ============ SCHEMA DEFINITIONS ============

export const ProductSchema: Record<string, FieldDef> = {
  id: { type: 'string', required: false, maxLength: 50 },
  sku: { type: 'string', required: true, minLength: 1, maxLength: 32, pattern: /^[A-Z0-9\-_]+$/ },
  name: { type: 'string', required: true, minLength: 1, maxLength: 150 },
  category: { type: 'string', required: true, enum: ['bats', 'balls', 'protective', 'teamwear', 'accessories'] },
  price: { type: 'number', required: true, min: 0, max: 1000000 },
  rawCost: { type: 'number', required: false, min: 0, max: 1000000 },
  barcode: { type: 'string', required: false, maxLength: 50 },
  brand: { type: 'string', required: false, maxLength: 50 },
  supplier: { type: 'string', required: false, maxLength: 100 },
  status: { type: 'string', required: false, enum: ['active', 'discontinued', 'draft'] },
  branchId: { type: 'string', required: false, maxLength: 50 },
  description: { type: 'string', required: false, maxLength: 500 },
  currentStock: { type: 'number', required: false, min: 0 },
  minimumStock: { type: 'number', required: false, min: 0 },
};

export const InventoryUpdateSchema: Record<string, FieldDef> = {
  sku: { type: 'string', required: true, minLength: 1, maxLength: 32 },
  stock: { type: 'number', required: true, min: 0, max: 1000000 },
};

export const OrderSchema: Record<string, FieldDef> = {
  id: { type: 'string', required: false, maxLength: 50 },
  customerId: { type: 'string', required: true, minLength: 1, maxLength: 50 },
  customerName: { type: 'string', required: false, maxLength: 100 },
  totalAmount: { type: 'number', required: true, min: 0, max: 10000000 },
  status: { type: 'string', required: false, enum: ['draft', 'pending', 'manufacturing', 'printing', 'ready', 'delivered', 'canceled'] },
  paymentStatus: { type: 'string', required: false, enum: ['unpaid', 'partially_paid', 'paid'] },
  promisedDate: { type: 'string', required: false, maxLength: 20 },
  notes: { type: 'string', required: false, maxLength: 1000 },
  orderItems: { type: 'array', required: false, maxLength: 100 },
};

export const OrderStatusUpdateSchema: Record<string, FieldDef> = {
  status: { type: 'string', required: true, enum: ['draft', 'pending', 'manufacturing', 'printing', 'ready', 'delivered', 'canceled'] },
  paymentStatus: { type: 'string', required: false, enum: ['unpaid', 'partially_paid', 'paid'] },
};

export const CustomerSchema: Record<string, FieldDef> = {
  id: { type: 'string', required: false, maxLength: 50 },
  name: { type: 'string', required: true, minLength: 1, maxLength: 100 },
  email: { type: 'string', required: true, minLength: 3, maxLength: 128, pattern: /^[^\s@]+@[^\s@]+\.[^\s@]+$/ },
  phone: { type: 'string', required: false, maxLength: 20 },
  affiliation: { type: 'string', required: false, enum: ['Academy', 'Club Team', 'Individual Athlete'] },
  branch: { type: 'string', required: false, maxLength: 50 },
  address: { type: 'string', required: false, maxLength: 300 },
};

export const SupplierSchema: Record<string, FieldDef> = {
  id: { type: 'string', required: false, maxLength: 50 },
  name: { type: 'string', required: true, minLength: 1, maxLength: 100 },
  contactName: { type: 'string', required: false, maxLength: 100 },
  email: { type: 'string', required: false, maxLength: 128, pattern: /^[^\s@]+@[^\s@]+\.[^\s@]+$/ },
  phone: { type: 'string', required: false, maxLength: 20 },
  address: { type: 'string', required: false, maxLength: 300 },
};

export const PurchaseOrderSchema: Record<string, FieldDef> = {
  id: { type: 'string', required: false, maxLength: 50 },
  supplierId: { type: 'string', required: true, minLength: 1, maxLength: 50 },
  expectedDeliveryDate: { type: 'string', required: false, maxLength: 20 },
  totalAmount: { type: 'number', required: true, min: 0, max: 10000000 },
  status: { type: 'string', required: false, enum: ['Draft', 'Approved', 'Shipped', 'Received', 'Canceled'] },
};

export const PurchaseOrderStatusSchema: Record<string, FieldDef> = {
  status: { type: 'string', required: true, enum: ['Draft', 'Approved', 'Shipped', 'Received', 'Canceled'] },
};

export const InventoryTransactionSchema: Record<string, FieldDef> = {
  id: { type: 'string', required: false, maxLength: 50 },
  productId: { type: 'string', required: true, minLength: 1, maxLength: 50 },
  sku: { type: 'string', required: true, minLength: 1, maxLength: 32 },
  productName: { type: 'string', required: false, maxLength: 100 },
  type: { type: 'string', required: true, enum: ['SALE', 'PURCHASE', 'ADJUSTMENT', 'RETURN'] },
  quantity: { type: 'number', required: true, min: -100000, max: 100000 },
  referenceType: { type: 'string', required: false, enum: ['ORDER', 'PURCHASE_ORDER', 'AUDIT', 'MANUAL'] },
  referenceId: { type: 'string', required: false, maxLength: 50 },
  remarks: { type: 'string', required: false, maxLength: 500 },
};

export const AuditLogSchema: Record<string, FieldDef> = {
  id: { type: 'string', required: false, maxLength: 50 },
  actionType: { type: 'string', required: true, enum: ['CREATE', 'UPDATE', 'DELETE', 'LOGIN', 'LOGOUT', 'ROLE_CHANGE', 'STATUS_CHANGE'] },
  targetTable: { type: 'string', required: true, maxLength: 50 },
  targetId: { type: 'string', required: true, maxLength: 50 },
  details: { type: 'string', required: false, maxLength: 1000 },
  operator: { type: 'string', required: false, maxLength: 100 },
};

export const ReceivePurchaseOrderSchema: Record<string, FieldDef> = {
  items: { type: 'array', required: false, maxLength: 100 },
  operator: { type: 'string', required: false, maxLength: 100 },
};
