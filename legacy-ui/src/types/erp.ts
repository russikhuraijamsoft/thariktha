/**
 * Shared ERP types extracted from App.tsx and erpIntegration.ts
 * Single source of truth for all ERP data structures.
 */

export interface ERPOrder {
  id: string;
  customerId: string;
  customerName: string;
  itemSummary: string;
  itemType: 'bat' | 'jersey' | 'balls' | 'repairs';
  specs: {
    willowGrade?: 'Grade-1 English Willow' | 'Grade-2 English Willow';
    weight?: string;
    gripColor?: string;
    handleType?: 'Round' | 'Oval';
    sublimationDesign?: string;
    jerseySize?: string;
    repairCategory?: string;
  };
  totalAmount: number;
  paymentStatus: 'unpaid' | 'partially_paid' | 'paid';
  status: 'draft' | 'pending' | 'manufacturing' | 'printing' | 'ready' | 'delivered';
  promisedDate: string;
  notes: string;
  createdAt: string;
}

export interface ERPInventory {
  sku: string;
  name: string;
  category: 'bats' | 'balls' | 'apparel' | 'protective';
  stock: number;
  safetyLevel: number;
  reorderPoint: number;
  shelf: string;
  price: number;
  rawCost: number;
}

export interface ERPJob {
  id: string;
  orderId: string;
  customerName: string;
  sku: string;
  type: 'mill' | 'print' | 'repair';
  status: 'queued' | 'splitting' | 'shaping' | 'pressing' | 'curing' | 'final-tuning' | 'quality-check' | 'complete';
  priority: 'low' | 'medium' | 'high' | 'rush';
  notes: string;
  craftsman: string;
  qualityScore?: number;
}

export interface ERPCustomer {
  id: string;
  name: string;
  email: string;
  phone: string;
  affiliation: 'Academy' | 'Club Team' | 'Individual Athlete';
  activeOrders: number;
  branch: string;
  address: string;
}

export interface ERPInvoice {
  id: string;
  orderId: string;
  customerName: string;
  dueDate: string;
  amount: number;
  paid: number;
  status: 'unpaid' | 'partially_paid' | 'paid' | 'voided';
}

export interface ERPTransaction {
  id: string;
  invoiceId: string;
  amount: number;
  type: 'incoming_payment' | 'vendor_payout';
  method: 'bank_transfer' | 'cash' | 'card';
  date: string;
  reference: string;
}

export interface ERPNotification {
  id: string;
  title: string;
  message: string;
  type: 'low_stock' | 'new_order' | 'job_milestone' | 'payment_alert';
  time: string;
  read: boolean;
}

export interface TelemetryLog {
  id: string;
  event: string;
  status: 'info' | 'syncing' | 'synced';
  timestamp: string;
}

export type ERPBranch = 'Melbourne Closets' | 'London Closets';
export type ERPThemeMode = 'light' | 'dark';
export type ERPCurrency = 'INR' | 'USD' | 'AUD';
export type ERPRouteStop = 'batala' | 'meerut' | 'bhilwara' | 'imphal' | null;

export type ERPDashboardTab =
  | 'dashboard' | 'orders' | 'inventory' | 'manufacturing'
  | 'printing' | 'servicing' | 'notifications' | 'customers'
  | 'billing' | 'staff' | 'routing' | 'architecture'
  | 'reports' | 'settings' | 'drive' | 'proposal';
