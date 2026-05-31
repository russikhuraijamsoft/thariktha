/**
 * Procurement Module Type Definitions
 * Supplier Management, Purchase Orders, and Goods Receipts
 */

// ============================================================
// SUPPLIER TYPES
// ============================================================

export interface Supplier {
  id: string;
  supplierCode: string;
  name: string;
  contactPerson: string;
  phone: string;
  email: string;
  gstNumber: string;
  address: string;
  paymentTerms: string; // e.g., "Net 30", "Net 45", "COD"
  leadTimeDays: number;
  rating: number; // 0-5 stars
  status: 'Active' | 'Inactive';
  createdAt: string;
  updatedAt: string;
  branchId: string;
}

// ============================================================
// PURCHASE ORDER TYPES
// ============================================================

export interface PurchaseOrderItem {
  id: string;
  itemId: string;
  productSku: string;
  productName: string;
  quantity: number;
  unitCost: number;
  gstRate: number; // percentage (e.g., 18)
  totalCost: number;
  quantityReceived?: number;
  quantityAccepted?: number;
}

export interface PurchaseOrder {
  id: string;
  poNumber: string;
  supplierCode: string;
  supplierId: string;
  supplierName: string;
  orderDate: string;
  expectedDeliveryDate: string;
  actualDeliveryDate?: string;
  status: 'draft' | 'submitted' | 'confirmed' | 'partial_received' | 'received' | 'cancelled';
  items: PurchaseOrderItem[];
  subtotal: number;
  gstAmount: number;
  totalAmount: number;
  notes: string;
  createdBy: string;
  branchId: string;
  createdAt: string;
  updatedAt: string;
}

// ============================================================
// GOODS RECEIPT TYPES
// ============================================================

export interface GoodsReceiptItem {
  id: string;
  poItemId: string;
  productSku: string;
  productName: string;
  quantityOrdered: number;
  quantityReceived: number;
  quantityAccepted: number;
  quantityRejected: number;
  qualityNotes: string;
}

export interface GoodsReceipt {
  id: string;
  grNumber: string;
  purchaseOrderId: string;
  poNumber: string;
  supplierId: string;
  supplierName: string;
  receiptDate: string;
  expectedDate: string;
  status: 'draft' | 'received' | 'inspected' | 'accepted' | 'rejected';
  items: GoodsReceiptItem[];
  receivedBy: string;
  inspectedBy?: string;
  notes: string;
  branchId: string;
  createdAt: string;
  updatedAt: string;
}

// ============================================================
// INVENTORY MOVEMENT TYPES
// ============================================================

export interface InventoryMovement {
  id: string;
  productId: string;
  productSku: string;
  productName: string;
  movementType: 'PURCHASE_RECEIPT' | 'ADJUSTMENT' | 'DAMAGE_WRITE_OFF' | 'REORDER';
  quantity: number;
  previousQuantity: number;
  newQuantity: number;
  referenceDocumentId: string; // GR ID or PO ID
  referenceDocumentType: string; // 'GOODS_RECEIPT' or 'ADJUSTMENT'
  operator: string;
  branchId: string;
  notes: string;
  timestamp: string;
}
