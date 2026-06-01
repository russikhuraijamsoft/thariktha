/**
 * Procurement Module Service Layer
 * CRUD operations for Suppliers, Purchase Orders, and Goods Receipts
 */

import {
  collection,
  doc,
  addDoc,
  updateDoc,
  deleteDoc,
  getDocs,
  getDoc,
  query,
  where,
  orderBy,
  limit,
  Timestamp,
  WriteBatch,
  writeBatch,
  onSnapshot,
} from 'firebase/firestore';
import { db } from '../firebase';
import {
  Supplier,
  PurchaseOrder,
  PurchaseOrderItem,
  GoodsReceipt,
  GoodsReceiptItem,
  InventoryMovement,
} from '../types/procurement';

// ============================================================
// SUPPLIER SERVICE OPERATIONS
// ============================================================

export const supplierService = {
  /**
   * Create a new supplier
   */
  async createSupplier(supplier: Omit<Supplier, 'id'>): Promise<string> {
    try {
      const docRef = await addDoc(collection(db, 'suppliers'), {
        ...supplier,
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
      });
      return docRef.id;
    } catch (error) {
      console.error('Error creating supplier:', error);
      throw error;
    }
  },

  /**
   * Update supplier details
   */
  async updateSupplier(supplierId: string, updates: Partial<Supplier>): Promise<void> {
    try {
      const docRef = doc(db, 'suppliers', supplierId);
      await updateDoc(docRef, {
        ...updates,
        updatedAt: Timestamp.now(),
      });
    } catch (error) {
      console.error('Error updating supplier:', error);
      throw error;
    }
  },

  /**
   * Delete supplier
   */
  async deleteSupplier(supplierId: string): Promise<void> {
    try {
      await deleteDoc(doc(db, 'suppliers', supplierId));
    } catch (error) {
      console.error('Error deleting supplier:', error);
      throw error;
    }
  },

  /**
   * Get supplier by ID
   */
  async getSupplier(supplierId: string): Promise<Supplier | null> {
    try {
      const docRef = doc(db, 'suppliers', supplierId);
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        return { id: docSnap.id, ...docSnap.data() } as Supplier;
      }
      return null;
    } catch (error) {
      console.error('Error fetching supplier:', error);
      throw error;
    }
  },

  /**
   * Get suppliers by branch with optional filtering
   */
  async getSuppliersByBranch(
    branchId: string,
    statusFilter?: 'Active' | 'Inactive'
  ): Promise<Supplier[]> {
    try {
      let q = query(
        collection(db, 'suppliers'),
        where('branchId', '==', branchId)
      );

      if (statusFilter) {
        q = query(
          collection(db, 'suppliers'),
          where('branchId', '==', branchId),
          where('status', '==', statusFilter),
          orderBy('name')
        );
      } else {
        q = query(
          collection(db, 'suppliers'),
          where('branchId', '==', branchId),
          orderBy('name')
        );
      }

      const querySnapshot = await getDocs(q);
      const suppliers: Supplier[] = [];
      querySnapshot.forEach((doc) => {
        suppliers.push({ id: doc.id, ...doc.data() } as Supplier);
      });
      return suppliers;
    } catch (error) {
      console.error('Error fetching suppliers:', error);
      throw error;
    }
  },

  /**
   * Real-time listener for suppliers
   */
  listenToSuppliers(
    branchId: string,
    callback: (suppliers: Supplier[]) => void
  ): () => void {
    const q = query(
      collection(db, 'suppliers'),
      where('branchId', '==', branchId),
      orderBy('name')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const suppliers: Supplier[] = [];
      snapshot.forEach((doc) => {
        suppliers.push({ id: doc.id, ...doc.data() } as Supplier);
      });
      callback(suppliers);
    });

    return unsubscribe;
  },
};

// ============================================================
// PURCHASE ORDER SERVICE OPERATIONS
// ============================================================

export const purchaseOrderService = {
  /**
   * Create a new purchase order
   */
  async createPurchaseOrder(po: Omit<PurchaseOrder, 'id'>): Promise<string> {
    try {
      const docRef = await addDoc(collection(db, 'purchase_orders'), {
        ...po,
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
      });
      return docRef.id;
    } catch (error) {
      console.error('Error creating PO:', error);
      throw error;
    }
  },

  /**
   * Update purchase order
   */
  async updatePurchaseOrder(poId: string, updates: Partial<PurchaseOrder>): Promise<void> {
    try {
      const docRef = doc(db, 'purchase_orders', poId);
      await updateDoc(docRef, {
        ...updates,
        updatedAt: Timestamp.now(),
      });
    } catch (error) {
      console.error('Error updating PO:', error);
      throw error;
    }
  },

  /**
   * Update PO status
   */
  async updatePOStatus(
    poId: string,
    status: PurchaseOrder['status'],
    actualDeliveryDate?: string
  ): Promise<void> {
    try {
      const docRef = doc(db, 'purchase_orders', poId);
      const updateData: any = {
        status,
        updatedAt: Timestamp.now(),
      };
      if (actualDeliveryDate) {
        updateData.actualDeliveryDate = actualDeliveryDate;
      }
      await updateDoc(docRef, updateData);
    } catch (error) {
      console.error('Error updating PO status:', error);
      throw error;
    }
  },

  /**
   * Get PO by ID
   */
  async getPurchaseOrder(poId: string): Promise<PurchaseOrder | null> {
    try {
      const docRef = doc(db, 'purchase_orders', poId);
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        return { id: docSnap.id, ...docSnap.data() } as PurchaseOrder;
      }
      return null;
    } catch (error) {
      console.error('Error fetching PO:', error);
      throw error;
    }
  },

  /**
   * Get POs by branch with optional filters
   */
  async getPurchaseOrdersByBranch(
    branchId: string,
    statusFilter?: PurchaseOrder['status']
  ): Promise<PurchaseOrder[]> {
    try {
      let q = query(
        collection(db, 'purchase_orders'),
        where('branchId', '==', branchId),
        orderBy('orderDate', 'desc')
      );

      if (statusFilter) {
        q = query(
          collection(db, 'purchase_orders'),
          where('branchId', '==', branchId),
          where('status', '==', statusFilter),
          orderBy('orderDate', 'desc')
        );
      }

      const querySnapshot = await getDocs(q);
      const orders: PurchaseOrder[] = [];
      querySnapshot.forEach((doc) => {
        orders.push({ id: doc.id, ...doc.data() } as PurchaseOrder);
      });
      return orders;
    } catch (error) {
      console.error('Error fetching POs:', error);
      throw error;
    }
  },

  /**
   * Get POs by supplier
   */
  async getPurchaseOrdersBySupplier(supplierId: string): Promise<PurchaseOrder[]> {
    try {
      const q = query(
        collection(db, 'purchase_orders'),
        where('supplierId', '==', supplierId),
        orderBy('orderDate', 'desc')
      );

      const querySnapshot = await getDocs(q);
      const orders: PurchaseOrder[] = [];
      querySnapshot.forEach((doc) => {
        orders.push({ id: doc.id, ...doc.data() } as PurchaseOrder);
      });
      return orders;
    } catch (error) {
      console.error('Error fetching supplier POs:', error);
      throw error;
    }
  },

  /**
   * Real-time listener for POs
   */
  listenToPurchaseOrders(
    branchId: string,
    callback: (orders: PurchaseOrder[]) => void
  ): () => void {
    const q = query(
      collection(db, 'purchase_orders'),
      where('branchId', '==', branchId),
      orderBy('orderDate', 'desc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const orders: PurchaseOrder[] = [];
      snapshot.forEach((doc) => {
        orders.push({ id: doc.id, ...doc.data() } as PurchaseOrder);
      });
      callback(orders);
    });

    return unsubscribe;
  },
};

// ============================================================
// GOODS RECEIPT SERVICE OPERATIONS
// ============================================================

export const goodsReceiptService = {
  /**
   * Create goods receipt and update inventory atomically
   */
  async createGoodsReceiptWithInventoryUpdate(
    gr: Omit<GoodsReceipt, 'id'>,
    inventoryMovements: Omit<InventoryMovement, 'id'>[]
  ): Promise<string> {
    try {
      const batch = writeBatch(db);

      // 1. Add Goods Receipt
      const grRef = doc(collection(db, 'goods_receipts'));
      batch.set(grRef, {
        ...gr,
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
      });

      // 2. Create inventory movements
      inventoryMovements.forEach((movement) => {
        const movRef = doc(collection(db, 'inventory_movements'));
        batch.set(movRef, {
          ...movement,
          timestamp: Timestamp.now(),
        });
      });

      await batch.commit();
      return grRef.id;
    } catch (error) {
      console.error('Error creating GR with inventory update:', error);
      throw error;
    }
  },

  /**
   * Update goods receipt
   */
  async updateGoodsReceipt(grId: string, updates: Partial<GoodsReceipt>): Promise<void> {
    try {
      const docRef = doc(db, 'goods_receipts', grId);
      await updateDoc(docRef, {
        ...updates,
        updatedAt: Timestamp.now(),
      });
    } catch (error) {
      console.error('Error updating GR:', error);
      throw error;
    }
  },

  /**
   * Update GR status and optionally trigger inventory update
   */
  async updateGRStatus(
    grId: string,
    status: GoodsReceipt['status'],
    inventoryMovements?: Omit<InventoryMovement, 'id'>[]
  ): Promise<void> {
    try {
      const batch = writeBatch(db);

      // Update GR status
      const grRef = doc(db, 'goods_receipts', grId);
      batch.update(grRef, {
        status,
        updatedAt: Timestamp.now(),
      });

      // Add inventory movements if provided
      if (inventoryMovements && inventoryMovements.length > 0) {
        inventoryMovements.forEach((movement) => {
          const movRef = doc(collection(db, 'inventory_movements'));
          batch.set(movRef, {
            ...movement,
            timestamp: Timestamp.now(),
          });
        });
      }

      await batch.commit();
    } catch (error) {
      console.error('Error updating GR status:', error);
      throw error;
    }
  },

  /**
   * Get goods receipt by ID
   */
  async getGoodsReceipt(grId: string): Promise<GoodsReceipt | null> {
    try {
      const docRef = doc(db, 'goods_receipts', grId);
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        return { id: docSnap.id, ...docSnap.data() } as GoodsReceipt;
      }
      return null;
    } catch (error) {
      console.error('Error fetching GR:', error);
      throw error;
    }
  },

  /**
   * Get GRs by branch with optional filters
   */
  async getGoodsReceiptsByBranch(
    branchId: string,
    statusFilter?: GoodsReceipt['status']
  ): Promise<GoodsReceipt[]> {
    try {
      let q = query(
        collection(db, 'goods_receipts'),
        where('branchId', '==', branchId),
        orderBy('receiptDate', 'desc')
      );

      if (statusFilter) {
        q = query(
          collection(db, 'goods_receipts'),
          where('branchId', '==', branchId),
          where('status', '==', statusFilter),
          orderBy('receiptDate', 'desc')
        );
      }

      const querySnapshot = await getDocs(q);
      const receipts: GoodsReceipt[] = [];
      querySnapshot.forEach((doc) => {
        receipts.push({ id: doc.id, ...doc.data() } as GoodsReceipt);
      });
      return receipts;
    } catch (error) {
      console.error('Error fetching GRs:', error);
      throw error;
    }
  },

  /**
   * Get GRs by purchase order
   */
  async getGoodsReceiptsByPO(purchaseOrderId: string): Promise<GoodsReceipt[]> {
    try {
      const q = query(
        collection(db, 'goods_receipts'),
        where('purchaseOrderId', '==', purchaseOrderId)
      );

      const querySnapshot = await getDocs(q);
      const receipts: GoodsReceipt[] = [];
      querySnapshot.forEach((doc) => {
        receipts.push({ id: doc.id, ...doc.data() } as GoodsReceipt);
      });
      return receipts;
    } catch (error) {
      console.error('Error fetching GRs by PO:', error);
      throw error;
    }
  },

  /**
   * Real-time listener for GRs
   */
  listenToGoodsReceipts(
    branchId: string,
    callback: (receipts: GoodsReceipt[]) => void
  ): () => void {
    const q = query(
      collection(db, 'goods_receipts'),
      where('branchId', '==', branchId),
      orderBy('receiptDate', 'desc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const receipts: GoodsReceipt[] = [];
      snapshot.forEach((doc) => {
        receipts.push({ id: doc.id, ...doc.data() } as GoodsReceipt);
      });
      callback(receipts);
    });

    return unsubscribe;
  },
};

// ============================================================
// INVENTORY MOVEMENT SERVICE
// ============================================================

export const inventoryMovementService = {
  /**
   * Create inventory movement (append-only audit trail)
   */
  async createMovement(movement: Omit<InventoryMovement, 'id'>): Promise<string> {
    try {
      const docRef = await addDoc(collection(db, 'inventory_movements'), {
        ...movement,
        timestamp: Timestamp.now(),
      });
      return docRef.id;
    } catch (error) {
      console.error('Error creating inventory movement:', error);
      throw error;
    }
  },

  /**
   * Get movements for a product
   */
  async getMovementsByProduct(productSku: string): Promise<InventoryMovement[]> {
    try {
      const q = query(
        collection(db, 'inventory_movements'),
        where('productSku', '==', productSku),
        orderBy('timestamp', 'desc')
      );

      const querySnapshot = await getDocs(q);
      const movements: InventoryMovement[] = [];
      querySnapshot.forEach((doc) => {
        movements.push({ id: doc.id, ...doc.data() } as InventoryMovement);
      });
      return movements;
    } catch (error) {
      console.error('Error fetching movements:', error);
      throw error;
    }
  },

  /**
   * Get movements by branch
   */
  async getMovementsByBranch(branchId: string, limitVal?: number): Promise<InventoryMovement[]> {
    try {
      let q = query(
        collection(db, 'inventory_movements'),
        where('branchId', '==', branchId),
        orderBy('timestamp', 'desc')
      );

      if (limitVal) {
        q = query(
          collection(db, 'inventory_movements'),
          where('branchId', '==', branchId),
          orderBy('timestamp', 'desc'),
          limit(limitVal)
        );
      }

      const querySnapshot = await getDocs(q);
      const movements: InventoryMovement[] = [];
      querySnapshot.forEach((doc) => {
        movements.push({ id: doc.id, ...doc.data() } as InventoryMovement);
      });
      return movements;
    } catch (error) {
      console.error('Error fetching branch movements:', error);
      throw error;
    }
  },
};

// ============================================================
// UTILITY FUNCTIONS
// ============================================================

/**
 * Generate unique supplier code
 */
export function generateSupplierCode(): string {
  return `SUP-${Date.now().toString().slice(-6)}`;
}

/**
 * Generate unique PO number
 */
export function generatePONumber(year: number = new Date().getFullYear()): string {
  const randomNum = Math.floor(Math.random() * 10000)
    .toString()
    .padStart(4, '0');
  return `PO-${year}-${randomNum}`;
}

/**
 * Generate unique GR number
 */
export function generateGRNumber(year: number = new Date().getFullYear()): string {
  const randomNum = Math.floor(Math.random() * 10000)
    .toString()
    .padStart(4, '0');
  return `GR-${year}-${randomNum}`;
}

/**
 * Calculate PO totals
 */
export function calculatePOTotals(items: PurchaseOrderItem[]): {
  subtotal: number;
  gstAmount: number;
  totalAmount: number;
} {
  const subtotal = items.reduce((sum, item) => sum + item.totalCost, 0);
  const gstAmount = items.reduce((sum, item) => {
    const itemGST = (item.unitCost * item.quantity * item.gstRate) / 100;
    return sum + itemGST;
  }, 0);
  const totalAmount = subtotal + gstAmount;

  return { subtotal, gstAmount, totalAmount };
}

/**
 * Calculate item line total with GST
 */
export function calculateItemTotal(
  quantity: number,
  unitCost: number,
  gstRate: number
): { lineTotal: number; gstAmount: number; totalWithGST: number } {
  const lineTotal = quantity * unitCost;
  const gstAmount = (lineTotal * gstRate) / 100;
  const totalWithGST = lineTotal + gstAmount;

  return { lineTotal, gstAmount, totalWithGST };
}
