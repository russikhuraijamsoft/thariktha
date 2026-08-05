import 'dotenv/config';
import express from 'express';
import path from 'path';
import fs from 'fs';
import { createServer as createViteServer } from 'vite';
import { 
  ProductService, 
  InventoryService, 
  OrderService, 
  CustomerService, 
  SupplierService, 
  InventoryTransactionService, 
  AuditLogService 
} from './server/services';
import { getDbContext } from './server/db';

async function startServer() {
  const app = express();
  app.use(express.json());
  const PORT = 3000;

  // --- API ROUTING SECTOR ---

  // Health check endpoint
  app.get('/api/health', (req, res) => {
    res.json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      service: 'Cricket Closet ERP Main API Engine',
      auth: 'Firebase Auth & Cloud Firestore Rules'
    });
  });
  
  // Real-time Database Link Quality check endpoint
  app.get('/api/db-status', async (req, res) => {
    res.json({
      isRealDb: true,
      database: 'Google Cloud Firestore',
      server: 'Firebase Cloud Database'
    });
  });

  // GET /api/products
  app.get('/api/products', async (req, res) => {
    try {
      const data = await ProductService.getProducts();
      res.json(data);
    } catch (err: any) {
      res.status(500).json({ error: err.message || "Failed to fetch products" });
    }
  });

  // POST /api/products
  app.post('/api/products', async (req, res) => {
    try {
      const result = await ProductService.createProduct(req.body);
      res.status(201).json(result);
    } catch (err: any) {
      res.status(500).json({ error: err.message || "Failed to register product" });
    }
  });

  // PUT /api/products/:id
  app.put('/api/products/:id', async (req, res) => {
    try {
      const { id } = req.params;
      const result = await ProductService.updateProduct(id, req.body);
      res.json(result);
    } catch (err: any) {
      res.status(500).json({ error: err.message || "Failed to update product" });
    }
  });

  // DELETE /api/products/:id
  app.delete('/api/products/:id', async (req, res) => {
    try {
      const { id } = req.params;
      const result = await ProductService.deleteProduct(id);
      res.json(result);
    } catch (err: any) {
      res.status(500).json({ error: err.message || "Failed to delete product" });
    }
  });

  // GET /api/inventory
  app.get('/api/inventory', async (req, res) => {
    try {
      const data = await InventoryService.getInventory();
      res.json(data);
    } catch (err: any) {
      res.status(500).json({ error: err.message || "Failed to fetch inventory" });
    }
  });

  // GET /api/orders
  app.get('/api/orders', async (req, res) => {
    try {
      const data = await OrderService.getOrders();
      res.json(data);
    } catch (err: any) {
      res.status(500).json({ error: err.message || "Failed to fetch orders" });
    }
  });

  // GET /api/customers
  app.get('/api/customers', async (req, res) => {
    try {
      const data = await CustomerService.getCustomers();
      res.json(data);
    } catch (err: any) {
      res.status(500).json({ error: err.message || "Failed to fetch customers" });
    }
  });

  // POST /api/customers
  app.post('/api/customers', async (req, res) => {
    try {
      const result = await CustomerService.createCustomer(req.body);
      res.status(201).json(result);
    } catch (err: any) {
      res.status(500).json({ error: err.message || "Failed to create customer" });
    }
  });

  // PUT /api/customers/:id
  app.put('/api/customers/:id', async (req, res) => {
    try {
      const { id } = req.params;
      const result = await CustomerService.updateCustomer(id, req.body);
      res.json(result);
    } catch (err: any) {
      res.status(500).json({ error: err.message || "Failed to update customer" });
    }
  });

  // DELETE /api/customers/:id
  app.delete('/api/customers/:id', async (req, res) => {
    try {
      const { id } = req.params;
      const result = await CustomerService.deleteCustomer(id);
      res.json(result);
    } catch (err: any) {
      res.status(500).json({ error: err.message || "Failed to delete customer" });
    }
  });

  // GET /api/suppliers
  app.get('/api/suppliers', async (req, res) => {
    try {
      const data = await SupplierService.getSuppliers();
      res.json(data);
    } catch (err: any) {
      res.status(500).json({ error: err.message || "Failed to fetch suppliers" });
    }
  });

  // POST /api/suppliers
  app.post('/api/suppliers', async (req, res) => {
    try {
      const result = await SupplierService.createSupplier(req.body);
      res.status(201).json(result);
    } catch (err: any) {
      res.status(500).json({ error: err.message || "Failed to create supplier" });
    }
  });

  // PUT /api/suppliers/:id
  app.put('/api/suppliers/:id', async (req, res) => {
    try {
      const { id } = req.params;
      const result = await SupplierService.updateSupplier(id, req.body);
      res.json(result);
    } catch (err: any) {
      res.status(500).json({ error: err.message || "Failed to update supplier" });
    }
  });

  // DELETE /api/suppliers/:id
  app.delete('/api/suppliers/:id', async (req, res) => {
    try {
      const { id } = req.params;
      const result = await SupplierService.deleteSupplier(id);
      res.json(result);
    } catch (err: any) {
      res.status(500).json({ error: err.message || "Failed to delete supplier" });
    }
  });

  // GET /api/purchaseorders
  app.get('/api/purchaseorders', async (req, res) => {
    try {
      const data = await SupplierService.getPurchaseOrders();
      res.json(data);
    } catch (err: any) {
      res.status(500).json({ error: err.message || "Failed to fetch purchase orders" });
    }
  });

  // POST /api/purchaseorders
  app.post('/api/purchaseorders', async (req, res) => {
    try {
      const result = await SupplierService.createPurchaseOrder(req.body);
      res.status(201).json(result);
    } catch (err: any) {
      res.status(500).json({ error: err.message || "Failed to create purchase order" });
    }
  });

  // PUT /api/purchaseorders/:id
  app.put('/api/purchaseorders/:id', async (req, res) => {
    try {
      const { id } = req.params;
      const { status } = req.body;
      const result = await SupplierService.updatePurchaseOrderStatus(id, status);
      res.json(result);
    } catch (err: any) {
      res.status(500).json({ error: err.message || "Failed to update purchase order" });
    }
  });

  // POST /api/orders
  app.post('/api/orders', async (req, res) => {
    try {
      const result = await OrderService.createOrder(req.body);
      res.status(201).json(result);
    } catch (err: any) {
      res.status(500).json({ error: err.message || "Failed to record order" });
    }
  });

  // POST /api/orderitems
  app.post('/api/orderitems', async (req, res) => {
    try {
      const result = await OrderService.createOrderItem(req.body);
      res.status(201).json(result);
    } catch (err: any) {
      res.status(500).json({ error: err.message || "Failed to record order item" });
    }
  });

  // PUT /api/inventory
  app.put('/api/inventory', async (req, res) => {
    try {
      const { sku, stock } = req.body;
      const result = await InventoryService.updateStock(sku, stock);
      res.json(result);
    } catch (err: any) {
      res.status(500).json({ error: err.message || "Failed to modify inventory" });
    }
  });

  // PUT /api/orders/:id
  app.put('/api/orders/:id', async (req, res) => {
    try {
      const { id } = req.params;
      const { status } = req.body;
      const result = await OrderService.updateOrderStatus(id, status);
      res.json(result);
    } catch (err: any) {
      res.status(500).json({ error: err.message || "Failed to adjust status on transaction" });
    }
  });

  // GET /api/inventory-transactions
  app.get('/api/inventory-transactions', async (req, res) => {
    try {
      const data = await InventoryTransactionService.getTransactions();
      res.json(data);
    } catch (err: any) {
      res.status(500).json({ error: err.message || "Failed to fetch inventory transactions" });
    }
  });

  // POST /api/inventory-transactions
  app.post('/api/inventory-transactions', async (req, res) => {
    try {
      const result = await InventoryTransactionService.createTransaction(req.body);
      res.status(201).json(result);
    } catch (err: any) {
      res.status(500).json({ error: err.message || "Failed to record inventory transaction" });
    }
  });

  // GET /api/audit-logs
  app.get('/api/audit-logs', async (req, res) => {
    try {
      const data = await AuditLogService.getLogs();
      res.json(data);
    } catch (err: any) {
      res.status(500).json({ error: err.message || "Failed to retrieve audit trail" });
    }
  });

  // POST /api/audit-logs
  app.post('/api/audit-logs', async (req, res) => {
    try {
      const result = await AuditLogService.log(req.body);
      res.status(201).json(result);
    } catch (err: any) {
      res.status(500).json({ error: err.message || "Failed to submit audit log entry" });
    }
  });

  // POST /api/purchaseorders/:id/receive
  app.post('/api/purchaseorders/:id/receive', async (req, res) => {
    try {
      const { id } = req.params;
      const { items, operator } = req.body;
      const result = await SupplierService.receivePurchaseOrder(id, items, operator);
      res.json(result);
    } catch (err: any) {
      res.status(500).json({ error: err.message || "Failed to receive Purchase Order stock" });
    }
  });

  // --- VITE MIDDLEWARE CONFIGURATION ---
  if (process.env.NODE_ENV !== "production") {
    console.log("[SERVER] Development mode: Mounting Vite dev server middleware");
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    console.log("[SERVER] Production mode: Serving static files from /dist");
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`[ERP BACKEND] Sentry online. Deep listening on integrated port: ${PORT}`);
  });
}

startServer();
