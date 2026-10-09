import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';

dotenv.config();

// Standard interface for all services supporting fallback execution
export interface DbContext {
  isRealDb: boolean;
  pool: null;
  fallbackData: any;
}

// Initial Seed data for reliable local storage fallback
export const initialFallbackData = {
  products: [
    { ProductID: 'PROD-001', SKU: 'SG-ST-CLS', Name: 'SG Strokewell Classic', Category: 'bats', Price: 520, RawCost: 260 },
    { ProductID: 'PROD-002', SKU: 'SG-BD-CLS', Name: 'SG Boundary Classic', Category: 'bats', Price: 420, RawCost: 210 },
    { ProductID: 'PROD-003', SKU: 'SG-TT-20', Name: 'SG Titan 2.0', Category: 'bats', Price: 950, RawCost: 475 },
    { ProductID: 'PROD-004', SKU: 'SG-SM-HLM', Name: 'SG Smartech Helmet', Category: 'protective', Price: 185, RawCost: 90 },
    { ProductID: 'PROD-005', SKU: 'SG-TN-BAL', Name: 'SG Tennis Ball', Category: 'balls', Price: 45, RawCost: 20 }
  ],
  inventory: [
    { InventoryID: 'INV-001', ProductID: 'PROD-001', SKU: 'SG-ST-CLS', SKU_Label: 'SG Strokewell Classic', StockLevel: 28, SafetyStock: 10, ReorderPoint: 15, ShelfLocation: 'Shelf A-4' },
    { InventoryID: 'INV-002', ProductID: 'PROD-002', SKU: 'SG-BD-CLS', SKU_Label: 'SG Boundary Classic', StockLevel: 14, SafetyStock: 8, ReorderPoint: 10, ShelfLocation: 'Shelf A-5' },
    { InventoryID: 'INV-003', ProductID: 'PROD-003', SKU: 'SG-TT-20', SKU_Label: 'SG Titan 2.0', StockLevel: 6, SafetyStock: 5, ReorderPoint: 8, ShelfLocation: 'Shelf B-1' },
    { InventoryID: 'INV-004', ProductID: 'PROD-004', SKU: 'SG-SM-HLM', SKU_Label: 'SG Smartech Helmet', StockLevel: 42, SafetyStock: 15, ReorderPoint: 20, ShelfLocation: 'Shelf C-2' },
    { InventoryID: 'INV-005', ProductID: 'PROD-005', SKU: 'SG-TN-BAL', SKU_Label: 'SG Tennis Ball', StockLevel: 150, SafetyStock: 30, ReorderPoint: 50, ShelfLocation: 'Bin 5' }
  ],
  customers: [
    { CustomerID: 'CUST-001', Name: 'Richmond Cricket Academy', Email: 'richmond.ca@cricket.au', Phone: '+61 3 9428 1122', Affiliation: 'Academy', ActiveOrders: 2, Branch: 'Melbourne Closets', Address: 'Richmond VIC 3121, Australia' },
    { CustomerID: 'CUST-002', Name: 'Clifton Hill CC Owners', Email: 'management@cliftonhillcc.org', Phone: '+61 3 9481 0505', Affiliation: 'Club Team', ActiveOrders: 1, Branch: 'Melbourne Closets', Address: 'Clifton Hill VIC 3068, Australia' },
    { CustomerID: 'CUST-003', Name: 'Sarah Jenkins', Email: 'sarah.j@athlete.net', Phone: '+61 411 998 844', Affiliation: 'Individual Athlete', ActiveOrders: 0, Branch: 'Sydney Site', Address: 'Randwick NSW 2031, Australia' }
  ],
  suppliers: [
    { SupplierID: 'SUPP-001', Name: 'Sunsports Manufacturing Guild', ContactName: 'Karan Sharma', Email: 'karan@sunsports.in', Phone: '+91 121 244 5566', Address: 'Meerut Outer Ring, UP, India' },
    { SupplierID: 'SUPP-002', Name: 'Sunridge Willow Mills Co.', ContactName: 'Deepak Shastri', Email: 'deepak@sunridgewillow.com', Phone: '+91 121 288 1111', Address: 'Industrial Area Partapur, UP, India' }
  ],
  purchaseorders: [
    { PurchaseOrderID: 'PO-2026-001', SupplierID: 'SUPP-001', OrderDate: '2026-05-15', ExpectedDeliveryDate: '2026-06-15', Status: 'Shipped', TotalAmount: 18500 },
    { PurchaseOrderID: 'PO-2026-002', SupplierID: 'SUPP-002', OrderDate: '2026-05-28', ExpectedDeliveryDate: '2026-06-25', Status: 'Approved', TotalAmount: 32000 }
  ],
  orders: [
    { OrderID: 'ORD-1001', CustomerID: 'CUST-001', OrderDate: '2026-06-01', TotalAmount: 1040, Status: 'manufacturing', Notes: 'Standard academy kit bat preform milling', PaymentStatus: 'unpaid', ContactName: 'Richmond Cricket Academy', PromisedDate: '2026-06-16' },
    { OrderID: 'ORD-1002', CustomerID: 'CUST-002', OrderDate: '2026-06-02', TotalAmount: 420, Status: 'ready', Notes: 'Grade-2 club match specs adjustment', PaymentStatus: 'paid', ContactName: 'Clifton Hill CC Owners', PromisedDate: '2026-06-10' }
  ],
  orderitems: [
    { OrderItemID: 'ORI-1001-A', OrderID: 'ORD-1001', SKU: 'SG-ST-CLS', Quantity: 2, UnitPrice: 520 },
    { OrderItemID: 'ORI-1002-A', OrderID: 'ORD-1002', SKU: 'SG-BD-CLS', Quantity: 1, UnitPrice: 420 }
  ],
  inventorytransactions: [
    { transaction_id: 'TXN-INV-001', product_id: 'PROD-001', sku: 'SG-ST-CLS', product_name: 'SG Strokewell Classic', transaction_type: 'SALE', quantity: 2, reference_type: 'ORDER', reference_id: 'ORD-1001', transaction_date: '2026-06-01T10:00:00Z', remarks: 'Deducted from Order item ORI-1001-A' },
    { transaction_id: 'TXN-INV-002', product_id: 'PROD-004', sku: 'SG-SM-HLM', product_name: 'SG Smartech Helmet', transaction_type: 'PURCHASE', quantity: 15, reference_type: 'PURCHASE_ORDER', reference_id: 'PO-2026-001', transaction_date: '2026-05-20T14:30:00Z', remarks: 'Stock Received from SMG' },
    { transaction_id: 'TXN-INV-003', product_id: 'PROD-002', sku: 'SG-BD-CLS', sku_label: 'SG Boundary Classic', transaction_type: 'ADJUSTMENT', quantity: -1, reference_type: 'AUDIT', reference_id: 'AUD-901', transaction_date: '2026-05-29T09:15:00Z', remarks: 'Damaged item written off during counts' }
  ],
  auditlogs: [
    { log_id: 'AUD-001', action_type: 'CREATE', target_table: 'Products', target_id: 'PROD-005', details: 'Registered new item SG Tennis Ball in system', operator: 'Lanes cashier', timestamp: '2026-06-01T08:00:00Z' },
    { log_id: 'AUD-002', action_type: 'UPDATE', target_table: 'Customers', target_id: 'CUST-002', details: 'Adjusted billing address for Clifton Hill Owners', operator: 'Workshop Admin', timestamp: '2026-06-02T11:40:00Z' }
  ]
};

const SANDBOX_DB_PATH = path.join(process.cwd(), 'server', 'sandbox_db.json');
let cachedFallbackData: any = null;

export function getFallbackDataReady(): any {
  if (cachedFallbackData) {
    return cachedFallbackData;
  }

  try {
    if (fs.existsSync(SANDBOX_DB_PATH)) {
      const content = fs.readFileSync(SANDBOX_DB_PATH, 'utf8');
      cachedFallbackData = JSON.parse(content);
      return cachedFallbackData;
    }
  } catch (err: any) {
    console.error("[SANDBOX DB] Error loading database file:", err.message);
  }

  cachedFallbackData = JSON.parse(JSON.stringify(initialFallbackData));
  
  try {
    fs.writeFileSync(SANDBOX_DB_PATH, JSON.stringify(cachedFallbackData, null, 2), 'utf8');
  } catch (err: any) {
    console.error("[SANDBOX DB] Failed to create database file:", err.message);
  }

  return cachedFallbackData;
}

export function persistFallbackData(): void {
  if (!cachedFallbackData) return;
  try {
    fs.writeFileSync(SANDBOX_DB_PATH, JSON.stringify(cachedFallbackData, null, 2), 'utf8');
  } catch (err: any) {
    console.error("[SANDBOX DB] Failed to write database update:", err.message);
  }
}

export async function getDbContext(): Promise<DbContext> {
  return {
    isRealDb: false,
    pool: null,
    fallbackData: getFallbackDataReady()
  };
}

