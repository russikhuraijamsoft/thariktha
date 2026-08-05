import { getDbContext, persistFallbackData } from './db';

// --- PRODUCT SERVICE ---
export class ProductService {
  static async getProducts() {
    const ctx = await getDbContext();
    return ctx.fallbackData.products.map((row: any) => ({
      id: row.ProductID || row.id,
      sku: row.SKU,
      name: row.Name,
      category: row.Category,
      price: row.Price,
      rawCost: row.RawCost,
      barcode: row.Barcode || '8901234500018',
      brand: row.Brand || 'SS',
      purchasePrice: row.RawCost || 100,
      sellingPrice: row.Price || 200,
      currentStock: row.CurrentStock ?? 10,
      minimumStock: row.MinimumStock ?? 5,
      supplier: row.Supplier || 'Sareen Sports Industries',
      productImage: row.ProductImage || '',
      description: row.Description || 'Hand-selected premium cricket gear',
      status: row.Status || 'active',
      branchId: row.BranchID || 'Melbourne Closets',
      createdAt: row.CreatedAt || new Date().toISOString(),
      updatedAt: row.UpdatedAt || new Date().toISOString()
    }));
  }

  static async createProduct(p: any) {
    const ctx = await getDbContext();
    const id = p.id || `PROD-${Math.floor(1000 + Math.random() * 9000)}`;
    const newProd = {
      ProductID: id,
      SKU: p.sku,
      Name: p.name,
      Category: p.category || 'bats',
      Price: Number(p.sellingPrice || p.price || 0),
      RawCost: Number(p.purchasePrice || p.rawCost || 0),
      Barcode: p.barcode,
      Brand: p.brand,
      Supplier: p.supplier,
      ProductImage: p.productImage,
      Description: p.description,
      Status: 'active',
      BranchID: p.branchId || 'Melbourne Closets',
      CreatedAt: new Date().toISOString(),
      UpdatedAt: new Date().toISOString()
    };
    ctx.fallbackData.products.push(newProd);

    // Also add to inventory
    ctx.fallbackData.inventory.push({
      InventoryID: `INV-${Math.floor(1000 + Math.random() * 9000)}`,
      ProductID: id,
      SKU: p.sku,
      SKU_Label: p.name,
      StockLevel: Number(p.currentStock || 10),
      SafetyStock: Number(p.minimumStock || 5),
      ReorderPoint: Number(p.minimumStock || 5) + 3,
      ShelfLocation: 'Shelf A-1'
    });

    persistFallbackData();
    return { success: true, id };
  }

  static async updateProduct(id: string, p: any) {
    const ctx = await getDbContext();
    const idx = ctx.fallbackData.products.findIndex((prod: any) => prod.ProductID === id || prod.id === id);
    if (idx !== -1) {
      ctx.fallbackData.products[idx] = {
        ...ctx.fallbackData.products[idx],
        Name: p.name ?? ctx.fallbackData.products[idx].Name,
        SKU: p.sku ?? ctx.fallbackData.products[idx].SKU,
        Category: p.category ?? ctx.fallbackData.products[idx].Category,
        Price: p.sellingPrice ?? p.price ?? ctx.fallbackData.products[idx].Price,
        RawCost: p.purchasePrice ?? p.rawCost ?? ctx.fallbackData.products[idx].RawCost,
        UpdatedAt: new Date().toISOString()
      };
      persistFallbackData();
    }
    return { success: true, id };
  }

  static async deleteProduct(id: string) {
    const ctx = await getDbContext();
    ctx.fallbackData.products = ctx.fallbackData.products.filter((p: any) => p.ProductID !== id && p.id !== id);
    ctx.fallbackData.inventory = ctx.fallbackData.inventory.filter((i: any) => i.ProductID !== id);
    persistFallbackData();
    return { success: true, id };
  }
}

// --- INVENTORY SERVICE ---
export class InventoryService {
  static async getInventory() {
    const ctx = await getDbContext();
    return ctx.fallbackData.inventory.map((row: any) => {
      const prod = ctx.fallbackData.products.find((p: any) => p.ProductID === row.ProductID || p.SKU === row.SKU) || {};
      return {
        id: row.InventoryID || row.id,
        productId: row.ProductID,
        sku: row.SKU,
        skuLabel: row.SKU_Label || prod.Name || row.SKU,
        category: prod.Category || 'bats',
        stockLevel: row.StockLevel ?? 10,
        safetyStock: row.SafetyStock ?? 5,
        reorderPoint: row.ReorderPoint ?? 8,
        shelfLocation: row.ShelfLocation || 'Shelf A-1',
        unitPrice: prod.Price || 100,
        rawCost: prod.RawCost || 50,
        status: (row.StockLevel ?? 10) <= (row.SafetyStock ?? 5) ? 'Low Stock' : 'Optimal'
      };
    });
  }

  static async updateStock(sku: string, newStock: number) {
    const ctx = await getDbContext();
    const item = ctx.fallbackData.inventory.find((i: any) => i.SKU === sku);
    if (item) {
      item.StockLevel = newStock;
      persistFallbackData();
    }
    return { success: true, sku, newStock };
  }

  static async reorder(sku: string, qty: number) {
    const ctx = await getDbContext();
    const item = ctx.fallbackData.inventory.find((i: any) => i.SKU === sku);
    if (item) {
      item.StockLevel = (item.StockLevel || 0) + qty;
      persistFallbackData();
    }
    return { success: true, sku, qty };
  }
}

// --- ORDER SERVICE ---
export class OrderService {
  static async getOrders() {
    const ctx = await getDbContext();
    return ctx.fallbackData.orders.map((row: any) => ({
      id: row.OrderID || row.id,
      customerId: row.CustomerID,
      customerName: row.ContactName || row.customerName || 'Cricket Club',
      orderDate: row.OrderDate,
      promisedDate: row.PromisedDate || row.OrderDate,
      totalAmount: row.TotalAmount,
      status: row.Status || 'pending',
      paymentStatus: row.PaymentStatus || 'unpaid',
      notes: row.Notes || ''
    }));
  }

  static async createOrder(order: any) {
    const ctx = await getDbContext();
    const id = order.id || `ORD-${Math.floor(1000 + Math.random() * 9000)}`;
    const newOrder = {
      OrderID: id,
      CustomerID: order.customerId || 'CUST-001',
      ContactName: order.customerName || 'Cricket Club',
      OrderDate: new Date().toISOString().split('T')[0],
      PromisedDate: order.promisedDate || new Date().toISOString().split('T')[0],
      TotalAmount: Number(order.totalAmount || 0),
      Status: order.status || 'pending',
      PaymentStatus: order.paymentStatus || 'unpaid',
      Notes: order.notes || ''
    };
    ctx.fallbackData.orders.push(newOrder);
    persistFallbackData();
    return { success: true, id };
  }

  static async createOrderItem(item: any) {
    const ctx = await getDbContext();
    const id = `ORI-${Math.floor(1000 + Math.random() * 9000)}`;
    ctx.fallbackData.orderitems.push({
      OrderItemID: id,
      OrderID: item.orderId,
      SKU: item.sku,
      Quantity: Number(item.quantity || 1),
      UnitPrice: Number(item.unitPrice || 0)
    });
    persistFallbackData();
    return { success: true, id };
  }

  static async updateOrderStatus(id: string, status: string, paymentStatus?: string) {
    const ctx = await getDbContext();
    const order = ctx.fallbackData.orders.find((o: any) => o.OrderID === id || o.id === id);
    if (order) {
      order.Status = status;
      if (paymentStatus) order.PaymentStatus = paymentStatus;
      persistFallbackData();
    }
    return { success: true, id, status };
  }
}

// --- CUSTOMER SERVICE ---
export class CustomerService {
  static async getCustomers() {
    const ctx = await getDbContext();
    return ctx.fallbackData.customers.map((row: any) => ({
      id: row.CustomerID || row.id,
      name: row.Name,
      email: row.Email,
      phone: row.Phone,
      affiliation: row.Affiliation || 'Club Team',
      activeOrders: row.ActiveOrders || 0,
      branch: row.Branch || 'Melbourne Closets',
      address: row.Address || ''
    }));
  }

  static async createCustomer(c: any) {
    const ctx = await getDbContext();
    const id = c.id || `CUST-${Math.floor(1000 + Math.random() * 9000)}`;
    ctx.fallbackData.customers.push({
      CustomerID: id,
      Name: c.name,
      Email: c.email,
      Phone: c.phone,
      Affiliation: c.affiliation || 'Individual Athlete',
      ActiveOrders: 0,
      Branch: c.branch || 'Melbourne Closets',
      Address: c.address || ''
    });
    persistFallbackData();
    return { success: true, id };
  }

  static async updateCustomer(id: string, c: any) {
    const ctx = await getDbContext();
    const cust = ctx.fallbackData.customers.find((item: any) => item.CustomerID === id || item.id === id);
    if (cust) {
      cust.Name = c.name ?? cust.Name;
      cust.Email = c.email ?? cust.Email;
      cust.Phone = c.phone ?? cust.Phone;
      cust.Affiliation = c.affiliation ?? cust.Affiliation;
      cust.Address = c.address ?? cust.Address;
      persistFallbackData();
    }
    return { success: true, id };
  }

  static async deleteCustomer(id: string) {
    const ctx = await getDbContext();
    ctx.fallbackData.customers = ctx.fallbackData.customers.filter((c: any) => c.CustomerID !== id && c.id !== id);
    persistFallbackData();
    return { success: true, id };
  }
}

// --- SUPPLIER SERVICE ---
export class SupplierService {
  static async getSuppliers() {
    const ctx = await getDbContext();
    return ctx.fallbackData.suppliers.map((s: any) => ({
      id: s.SupplierID || s.id,
      name: s.Name,
      contactName: s.ContactName,
      email: s.Email,
      phone: s.Phone,
      address: s.Address
    }));
  }

  static async createSupplier(s: any) {
    const ctx = await getDbContext();
    const id = s.id || `SUPP-${Math.floor(1000 + Math.random() * 9000)}`;
    ctx.fallbackData.suppliers.push({
      SupplierID: id,
      Name: s.name,
      ContactName: s.contactName,
      Email: s.email,
      Phone: s.phone,
      Address: s.address
    });
    persistFallbackData();
    return { success: true, id };
  }

  static async updateSupplier(id: string, s: any) {
    const ctx = await getDbContext();
    const supp = ctx.fallbackData.suppliers.find((item: any) => item.SupplierID === id || item.id === id);
    if (supp) {
      supp.Name = s.name ?? supp.Name;
      supp.ContactName = s.contactName ?? supp.ContactName;
      supp.Email = s.email ?? supp.Email;
      supp.Phone = s.phone ?? supp.Phone;
      supp.Address = s.address ?? supp.Address;
      persistFallbackData();
    }
    return { success: true, id };
  }

  static async deleteSupplier(id: string) {
    const ctx = await getDbContext();
    ctx.fallbackData.suppliers = ctx.fallbackData.suppliers.filter((s: any) => s.SupplierID !== id && s.id !== id);
    persistFallbackData();
    return { success: true, id };
  }

  static async getPurchaseOrders() {
    const ctx = await getDbContext();
    return ctx.fallbackData.purchaseorders.map((po: any) => ({
      id: po.PurchaseOrderID || po.id,
      supplierId: po.SupplierID,
      orderDate: po.OrderDate,
      expectedDeliveryDate: po.ExpectedDeliveryDate,
      status: po.Status,
      totalAmount: po.TotalAmount
    }));
  }

  static async createPurchaseOrder(po: any) {
    const ctx = await getDbContext();
    const id = po.id || `PO-2026-${Math.floor(100 + Math.random() * 900)}`;
    ctx.fallbackData.purchaseorders.push({
      PurchaseOrderID: id,
      SupplierID: po.supplierId,
      OrderDate: new Date().toISOString().split('T')[0],
      ExpectedDeliveryDate: po.expectedDeliveryDate || new Date().toISOString().split('T')[0],
      Status: 'Approved',
      TotalAmount: Number(po.totalAmount || 0)
    });
    persistFallbackData();
    return { success: true, id };
  }

  static async updatePurchaseOrderStatus(id: string, status: string) {
    const ctx = await getDbContext();
    const po = ctx.fallbackData.purchaseorders.find((item: any) => item.PurchaseOrderID === id || item.id === id);
    if (po) {
      po.Status = status;
      persistFallbackData();
    }
    return { success: true, id, status };
  }

  static async receivePurchaseOrder(id: string, items?: any, operator?: any) {
    const ctx = await getDbContext();
    const po = ctx.fallbackData.purchaseorders.find((item: any) => item.PurchaseOrderID === id || item.id === id);
    if (po) {
      po.Status = 'Received';
      persistFallbackData();
    }
    return { success: true, id };
  }
}

// --- INVENTORY TRANSACTION SERVICE ---
export class InventoryTransactionService {
  static async getTransactions() {
    const ctx = await getDbContext();
    return ctx.fallbackData.inventorytransactions.map((t: any) => ({
      id: t.transaction_id || t.id,
      productId: t.product_id,
      sku: t.sku,
      productName: t.product_name || t.sku_label || t.sku,
      type: t.transaction_type,
      quantity: t.quantity,
      referenceType: t.reference_type,
      referenceId: t.reference_id,
      date: t.transaction_date,
      remarks: t.remarks
    }));
  }

  static async recordTransaction(txn: any) {
    const ctx = await getDbContext();
    const id = txn.id || `TXN-INV-${Math.floor(1000 + Math.random() * 9000)}`;
    ctx.fallbackData.inventorytransactions.push({
      transaction_id: id,
      product_id: txn.productId,
      sku: txn.sku,
      product_name: txn.productName,
      transaction_type: txn.type,
      quantity: txn.quantity,
      reference_type: txn.referenceType,
      reference_id: txn.referenceId,
      transaction_date: new Date().toISOString(),
      remarks: txn.remarks
    });
    persistFallbackData();
    return { success: true, id };
  }

  static async createTransaction(txn: any) {
    return this.recordTransaction(txn);
  }
}

// --- AUDIT LOG SERVICE ---
export class AuditLogService {
  static async getLogs() {
    const ctx = await getDbContext();
    return ctx.fallbackData.auditlogs.map((l: any) => ({
      id: l.log_id || l.id,
      actionType: l.action_type,
      targetTable: l.target_table,
      targetId: l.target_id,
      details: l.details,
      operator: l.operator,
      timestamp: l.timestamp
    }));
  }

  static async logAction(log: any) {
    const ctx = await getDbContext();
    const id = log.id || `AUD-${Math.floor(100 + Math.random() * 900)}`;
    ctx.fallbackData.auditlogs.push({
      log_id: id,
      action_type: log.actionType,
      target_table: log.targetTable,
      target_id: log.targetId,
      details: log.details,
      operator: log.operator || 'System',
      timestamp: new Date().toISOString()
    });
    persistFallbackData();
    return { success: true, id };
  }

  static async log(log: any) {
    return this.logAction(log);
  }
}
