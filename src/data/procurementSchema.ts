/**
 * Procurement Module - Firestore Collection Schemas
 * Add these collections to your Firebase Firestore
 */

// ============================================================
// SUPPLIERS COLLECTION SCHEMA
// ============================================================
// Collection: /suppliers/{supplierId}
// Purpose: Master supplier registry with contact and payment terms

export const SUPPLIERS_SCHEMA = {
  collectionPath: 'suppliers',
  documentStructure: {
    id: 'string (doc ID)',
    supplierCode: 'string (unique identifier, e.g., SUP-001)',
    name: 'string (company name)',
    contactPerson: 'string (primary contact)',
    phone: 'string',
    email: 'string',
    gstNumber: 'string (GST registration)',
    address: 'string (full address)',
    paymentTerms: 'string (e.g., "Net 30", "Net 45", "COD")',
    leadTimeDays: 'number',
    rating: 'number (0-5 stars)',
    status: 'string (Active | Inactive)',
    branchId: 'string',
    createdAt: 'timestamp',
    updatedAt: 'timestamp',
  },
  indexes: [
    {
      fields: [{ fieldPath: 'branchId', order: 'Ascending' }, { fieldPath: 'status', order: 'Ascending' }],
      queryScope: 'Collection',
    },
    {
      fields: [{ fieldPath: 'supplierCode', order: 'Ascending' }],
      queryScope: 'Collection',
    },
  ],
};

// ============================================================
// PURCHASE ORDERS COLLECTION SCHEMA
// ============================================================
// Collection: /purchase_orders/{poId}
// Purpose: Track procurement orders from suppliers

export const PURCHASE_ORDERS_SCHEMA = {
  collectionPath: 'purchase_orders',
  documentStructure: {
    id: 'string (doc ID)',
    poNumber: 'string (unique PO number, e.g., PO-2026-001)',
    supplierCode: 'string',
    supplierId: 'string (reference to suppliers collection)',
    supplierName: 'string (denormalized)',
    orderDate: 'date (YYYY-MM-DD)',
    expectedDeliveryDate: 'date (YYYY-MM-DD)',
    actualDeliveryDate: 'date (optional, set on receipt)',
    status: 'string (draft | submitted | confirmed | partial_received | received | cancelled)',
    items: 'array of PurchaseOrderItem',
    subtotal: 'number (before GST)',
    gstAmount: 'number (calculated)',
    totalAmount: 'number (final amount)',
    notes: 'string',
    createdBy: 'string (user UID)',
    branchId: 'string',
    createdAt: 'timestamp',
    updatedAt: 'timestamp',
  },
  itemStructure: {
    id: 'string',
    itemId: 'string (product ID)',
    productSku: 'string',
    productName: 'string',
    quantity: 'number',
    unitCost: 'number',
    gstRate: 'number (percentage)',
    totalCost: 'number',
    quantityReceived: 'number (optional)',
    quantityAccepted: 'number (optional)',
  },
  indexes: [
    {
      fields: [{ fieldPath: 'branchId', order: 'Ascending' }, { fieldPath: 'status', order: 'Ascending' }],
      queryScope: 'Collection',
    },
    {
      fields: [{ fieldPath: 'supplierId', order: 'Ascending' }, { fieldPath: 'orderDate', order: 'Descending' }],
      queryScope: 'Collection',
    },
    {
      fields: [{ fieldPath: 'orderDate', order: 'Descending' }],
      queryScope: 'Collection',
    },
  ],
};

// ============================================================
// GOODS RECEIPTS COLLECTION SCHEMA
// ============================================================
// Collection: /goods_receipts/{grId}
// Purpose: Track receipt and inspection of goods from POs

export const GOODS_RECEIPTS_SCHEMA = {
  collectionPath: 'goods_receipts',
  documentStructure: {
    id: 'string (doc ID)',
    grNumber: 'string (unique GR number, e.g., GR-2026-001)',
    purchaseOrderId: 'string (reference to purchase_orders)',
    poNumber: 'string (denormalized)',
    supplierId: 'string',
    supplierName: 'string (denormalized)',
    receiptDate: 'date (YYYY-MM-DD)',
    expectedDate: 'date',
    status: 'string (draft | received | inspected | accepted | rejected)',
    items: 'array of GoodsReceiptItem',
    receivedBy: 'string (user UID)',
    inspectedBy: 'string (optional, QA UID)',
    notes: 'string',
    branchId: 'string',
    createdAt: 'timestamp',
    updatedAt: 'timestamp',
  },
  itemStructure: {
    id: 'string',
    poItemId: 'string (reference to PO item)',
    productSku: 'string',
    productName: 'string',
    quantityOrdered: 'number',
    quantityReceived: 'number',
    quantityAccepted: 'number',
    quantityRejected: 'number',
    qualityNotes: 'string',
  },
  indexes: [
    {
      fields: [{ fieldPath: 'branchId', order: 'Ascending' }, { fieldPath: 'status', order: 'Ascending' }],
      queryScope: 'Collection',
    },
    {
      fields: [{ fieldPath: 'purchaseOrderId', order: 'Ascending' }],
      queryScope: 'Collection',
    },
    {
      fields: [{ fieldPath: 'receiptDate', order: 'Descending' }],
      queryScope: 'Collection',
    },
  ],
};

// ============================================================
// INVENTORY MOVEMENTS COLLECTION SCHEMA
// ============================================================
// Collection: /inventory_movements/{movementId}
// Purpose: Audit trail for inventory changes (append-only)

export const INVENTORY_MOVEMENTS_SCHEMA = {
  collectionPath: 'inventory_movements',
  documentStructure: {
    id: 'string (doc ID)',
    productId: 'string (product ID from products collection)',
    productSku: 'string',
    productName: 'string (denormalized)',
    movementType: 'string (PURCHASE_RECEIPT | ADJUSTMENT | DAMAGE_WRITE_OFF | REORDER)',
    quantity: 'number (change amount)',
    previousQuantity: 'number (stock before)',
    newQuantity: 'number (stock after)',
    referenceDocumentId: 'string (GR ID, PO ID, or Adjustment ID)',
    referenceDocumentType: 'string (GOODS_RECEIPT, PURCHASE_ORDER, ADJUSTMENT)',
    operator: 'string (user UID or name)',
    branchId: 'string',
    notes: 'string',
    timestamp: 'timestamp (creation time, immutable)',
  },
  indexes: [
    {
      fields: [{ fieldPath: 'productSku', order: 'Ascending' }, { fieldPath: 'timestamp', order: 'Descending' }],
      queryScope: 'Collection',
    },
    {
      fields: [{ fieldPath: 'branchId', order: 'Ascending' }, { fieldPath: 'timestamp', order: 'Descending' }],
      queryScope: 'Collection',
    },
    {
      fields: [{ fieldPath: 'movementType', order: 'Ascending' }, { fieldPath: 'timestamp', order: 'Descending' }],
      queryScope: 'Collection',
    },
  ],
};

/**
 * DEPLOYMENT INSTRUCTIONS:
 * 
 * 1. Create Collections in Firestore:
 *    - suppliers
 *    - purchase_orders
 *    - goods_receipts
 *    - inventory_movements
 * 
 * 2. Create Composite Indexes:
 *    - Use the indexes array from each schema
 *    - Deploy via Firebase Console or firebase-cli
 * 
 * 3. Set Security Rules:
 *    - See firestore.rules updates (next file)
 * 
 * 4. Add TypeScript Types:
 *    - See src/types/procurement.ts
 */
