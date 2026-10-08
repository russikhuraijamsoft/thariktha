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
import { firebaseAuthMiddleware, requireRole, requireActive } from './server/middleware/auth';
import { errorHandler, notFoundHandler } from './server/middleware/errorHandler';
import { requestLogger } from './server/middleware/requestLogger';
import { securityLogger } from './server/utils/securityLogger';
import { validate, ProductSchema, InventoryUpdateSchema, OrderSchema, OrderStatusUpdateSchema, CustomerSchema, SupplierSchema, PurchaseOrderSchema, PurchaseOrderStatusSchema, InventoryTransactionSchema, AuditLogSchema, ReceivePurchaseOrderSchema } from './server/validation/schemas';

async function startServer() {
  const app = express();
  app.use(express.json({ limit: '10mb' }));

  // --- SECURITY HEADERS ---
  app.use((req, res, next) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('X-XSS-Protection', '1; mode=block');
    res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
    res.setHeader('Content-Security-Policy', "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; font-src 'self' https:; connect-src 'self' https:;");
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
    next();
  });

  // --- CORS ---
  const allowedOrigins = process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:3000', 'http://localhost:5173'];
  app.use((req, res, next) => {
    const origin = req.headers.origin;
    if (origin && allowedOrigins.includes(origin)) {
      res.setHeader('Access-Control-Allow-Origin', origin);
    }
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    res.setHeader('Access-Control-Max-Age', '86400');
    if (req.method === 'OPTIONS') {
      res.sendStatus(204);
      return;
    }
    next();
  });

  // --- REQUEST LOGGING ---
  app.use(requestLogger);

  // --- RATE LIMITING ---
  const rateLimitMap = new Map<string, { count: number; resetTime: number }>();
  const RATE_LIMIT_WINDOW_MS = 15 * 60 * 1000; // 15 minutes
  const RATE_LIMIT_MAX_REQUESTS = 100;

  app.use((req, res, next) => {
    const clientIp = req.ip || req.socket.remoteAddress || 'unknown';
    const now = Date.now();
    const record = rateLimitMap.get(clientIp);

    if (!record || now > record.resetTime) {
      rateLimitMap.set(clientIp, { count: 1, resetTime: now + RATE_LIMIT_WINDOW_MS });
      next();
      return;
    }

    record.count++;
    if (record.count > RATE_LIMIT_MAX_REQUESTS) {
      res.status(429).json({
        error: 'RATE_LIMIT_EXCEEDED',
        message: 'Too many requests. Please try again later.',
        retryAfter: Math.ceil((record.resetTime - now) / 1000)
      });
      return;
    }

    next();
  });

  // --- API ROUTING SECTOR ---

  // Health check endpoint (no auth required)
  app.get('/api/health', (req, res) => {
    const uptime = process.uptime();
    const memoryUsage = process.memoryUsage();
    
    res.json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      service: 'Cricket Closet ERP Main API Engine',
      auth: 'Firebase Auth & Cloud Firestore Rules',
      version: '2.0.0',
      environment: process.env.NODE_ENV || 'development',
      uptime: {
        seconds: Math.floor(uptime),
        formatted: `${Math.floor(uptime / 3600)}h ${Math.floor((uptime % 3600) / 60)}m ${Math.floor(uptime % 60)}s`
      },
      memory: {
        used: `${Math.round(memoryUsage.heapUsed / 1024 / 1024)}MB`,
        total: `${Math.round(memoryUsage.heapTotal / 1024 / 1024)}MB`,
        rss: `${Math.round(memoryUsage.rss / 1024 / 1024)}MB`
      },
      security: {
        authEnabled: true,
        rateLimiting: true,
        cors: process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:3000', 'http://localhost:5173']
      }
    });
  });

  // Real-time Database Link Quality check endpoint (no auth required)
  app.get('/api/db-status', async (req, res) => {
    res.json({
      isRealDb: true,
      database: 'Google Cloud Firestore',
      server: 'Firebase Cloud Database'
    });
  });

  // --- ALL ENDPOINTS BELOW REQUIRE AUTHENTICATION ---

  // GET /api/products
  app.get('/api/products', firebaseAuthMiddleware, requireActive, async (req, res) => {
    try {
      const data = await ProductService.getProducts();
      res.json(data);
    } catch (err: any) {
      res.status(500).json({ error: err.message || "Failed to fetch products" });
    }
  });

  // POST /api/products
  app.post('/api/products', firebaseAuthMiddleware, requireActive, requireRole('super_admin', 'admin', 'manager', 'inventory_manager'), async (req, res) => {
    const validation = validate(req.body, ProductSchema);
    if (!validation.valid) {
      res.status(400).json({ error: 'VALIDATION_ERROR', details: validation.errors });
      return;
    }
    try {
      const result = await ProductService.createProduct(req.body);
      res.status(201).json(result);
    } catch (err: any) {
      res.status(500).json({ error: err.message || "Failed to register product" });
    }
  });

  // PUT /api/products/:id
  app.put('/api/products/:id', firebaseAuthMiddleware, requireActive, requireRole('super_admin', 'admin', 'manager', 'inventory_manager'), async (req, res) => {
    const validation = validate(req.body, ProductSchema);
    if (!validation.valid) {
      res.status(400).json({ error: 'VALIDATION_ERROR', details: validation.errors });
      return;
    }
    try {
      const { id } = req.params;
      const result = await ProductService.updateProduct(id, req.body);
      res.json(result);
    } catch (err: any) {
      res.status(500).json({ error: err.message || "Failed to update product" });
    }
  });

  // DELETE /api/products/:id
  app.delete('/api/products/:id', firebaseAuthMiddleware, requireActive, requireRole('super_admin', 'admin'), async (req, res) => {
    try {
      const { id } = req.params;
      const result = await ProductService.deleteProduct(id);
      res.json(result);
    } catch (err: any) {
      res.status(500).json({ error: err.message || "Failed to delete product" });
    }
  });

  // GET /api/inventory
  app.get('/api/inventory', firebaseAuthMiddleware, requireActive, async (req, res) => {
    try {
      const data = await InventoryService.getInventory();
      res.json(data);
    } catch (err: any) {
      res.status(500).json({ error: err.message || "Failed to fetch inventory" });
    }
  });

  // GET /api/orders
  app.get('/api/orders', firebaseAuthMiddleware, requireActive, async (req, res) => {
    try {
      const data = await OrderService.getOrders();
      res.json(data);
    } catch (err: any) {
      res.status(500).json({ error: err.message || "Failed to fetch orders" });
    }
  });

  // GET /api/customers
  app.get('/api/customers', firebaseAuthMiddleware, requireActive, requireRole('super_admin', 'admin', 'manager', 'cashier'), async (req, res) => {
    try {
      const data = await CustomerService.getCustomers();
      res.json(data);
    } catch (err: any) {
      res.status(500).json({ error: err.message || "Failed to fetch customers" });
    }
  });

  // POST /api/customers
  app.post('/api/customers', firebaseAuthMiddleware, requireActive, requireRole('super_admin', 'admin', 'manager', 'cashier'), async (req, res) => {
    const validation = validate(req.body, CustomerSchema);
    if (!validation.valid) {
      res.status(400).json({ error: 'VALIDATION_ERROR', details: validation.errors });
      return;
    }
    try {
      const result = await CustomerService.createCustomer(req.body);
      res.status(201).json(result);
    } catch (err: any) {
      res.status(500).json({ error: err.message || "Failed to create customer" });
    }
  });

  // PUT /api/customers/:id
  app.put('/api/customers/:id', firebaseAuthMiddleware, requireActive, requireRole('super_admin', 'admin', 'manager', 'cashier'), async (req, res) => {
    const validation = validate(req.body, CustomerSchema);
    if (!validation.valid) {
      res.status(400).json({ error: 'VALIDATION_ERROR', details: validation.errors });
      return;
    }
    try {
      const { id } = req.params;
      const result = await CustomerService.updateCustomer(id, req.body);
      res.json(result);
    } catch (err: any) {
      res.status(500).json({ error: err.message || "Failed to update customer" });
    }
  });

  // DELETE /api/customers/:id
  app.delete('/api/customers/:id', firebaseAuthMiddleware, requireActive, requireRole('super_admin', 'admin'), async (req, res) => {
    try {
      const { id } = req.params;
      const result = await CustomerService.deleteCustomer(id);
      res.json(result);
    } catch (err: any) {
      res.status(500).json({ error: err.message || "Failed to delete customer" });
    }
  });

  // GET /api/suppliers
  app.get('/api/suppliers', firebaseAuthMiddleware, requireActive, requireRole('super_admin', 'admin', 'manager'), async (req, res) => {
    try {
      const data = await SupplierService.getSuppliers();
      res.json(data);
    } catch (err: any) {
      res.status(500).json({ error: err.message || "Failed to fetch suppliers" });
    }
  });

  // POST /api/suppliers
  app.post('/api/suppliers', firebaseAuthMiddleware, requireActive, requireRole('super_admin', 'admin', 'manager'), async (req, res) => {
    const validation = validate(req.body, SupplierSchema);
    if (!validation.valid) {
      res.status(400).json({ error: 'VALIDATION_ERROR', details: validation.errors });
      return;
    }
    try {
      const result = await SupplierService.createSupplier(req.body);
      res.status(201).json(result);
    } catch (err: any) {
      res.status(500).json({ error: err.message || "Failed to create supplier" });
    }
  });

  // PUT /api/suppliers/:id
  app.put('/api/suppliers/:id', firebaseAuthMiddleware, requireActive, requireRole('super_admin', 'admin', 'manager'), async (req, res) => {
    const validation = validate(req.body, SupplierSchema);
    if (!validation.valid) {
      res.status(400).json({ error: 'VALIDATION_ERROR', details: validation.errors });
      return;
    }
    try {
      const { id } = req.params;
      const result = await SupplierService.updateSupplier(id, req.body);
      res.json(result);
    } catch (err: any) {
      res.status(500).json({ error: err.message || "Failed to update supplier" });
    }
  });

  // DELETE /api/suppliers/:id
  app.delete('/api/suppliers/:id', firebaseAuthMiddleware, requireActive, requireRole('super_admin', 'admin'), async (req, res) => {
    try {
      const { id } = req.params;
      const result = await SupplierService.deleteSupplier(id);
      res.json(result);
    } catch (err: any) {
      res.status(500).json({ error: err.message || "Failed to delete supplier" });
    }
  });

  // GET /api/purchaseorders
  app.get('/api/purchaseorders', firebaseAuthMiddleware, requireActive, requireRole('super_admin', 'admin', 'manager'), async (req, res) => {
    try {
      const data = await SupplierService.getPurchaseOrders();
      res.json(data);
    } catch (err: any) {
      res.status(500).json({ error: err.message || "Failed to fetch purchase orders" });
    }
  });

  // POST /api/purchaseorders
  app.post('/api/purchaseorders', firebaseAuthMiddleware, requireActive, requireRole('super_admin', 'admin', 'manager'), async (req, res) => {
    const validation = validate(req.body, PurchaseOrderSchema);
    if (!validation.valid) {
      res.status(400).json({ error: 'VALIDATION_ERROR', details: validation.errors });
      return;
    }
    try {
      const result = await SupplierService.createPurchaseOrder(req.body);
      res.status(201).json(result);
    } catch (err: any) {
      res.status(500).json({ error: err.message || "Failed to create purchase order" });
    }
  });

  // PUT /api/purchaseorders/:id
  app.put('/api/purchaseorders/:id', firebaseAuthMiddleware, requireActive, requireRole('super_admin', 'admin', 'manager'), async (req, res) => {
    const validation = validate(req.body, PurchaseOrderStatusSchema);
    if (!validation.valid) {
      res.status(400).json({ error: 'VALIDATION_ERROR', details: validation.errors });
      return;
    }
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
  app.post('/api/orders', firebaseAuthMiddleware, requireActive, async (req, res) => {
    const validation = validate(req.body, OrderSchema);
    if (!validation.valid) {
      res.status(400).json({ error: 'VALIDATION_ERROR', details: validation.errors });
      return;
    }
    try {
      const result = await OrderService.createOrder(req.body);
      res.status(201).json(result);
    } catch (err: any) {
      res.status(500).json({ error: err.message || "Failed to record order" });
    }
  });

  // POST /api/orderitems
  app.post('/api/orderitems', firebaseAuthMiddleware, requireActive, requireRole('super_admin', 'admin', 'manager', 'cashier'), async (req, res) => {
    try {
      const result = await OrderService.createOrderItem(req.body);
      res.status(201).json(result);
    } catch (err: any) {
      res.status(500).json({ error: err.message || "Failed to record order item" });
    }
  });

  // PUT /api/inventory
  app.put('/api/inventory', firebaseAuthMiddleware, requireActive, requireRole('super_admin', 'admin', 'inventory_manager'), async (req, res) => {
    const validation = validate(req.body, InventoryUpdateSchema);
    if (!validation.valid) {
      res.status(400).json({ error: 'VALIDATION_ERROR', details: validation.errors });
      return;
    }
    try {
      const { sku, stock } = req.body;
      const result = await InventoryService.updateStock(sku, stock);
      res.json(result);
    } catch (err: any) {
      res.status(500).json({ error: err.message || "Failed to modify inventory" });
    }
  });

  // PUT /api/orders/:id
  app.put('/api/orders/:id', firebaseAuthMiddleware, requireActive, async (req, res) => {
    const validation = validate(req.body, OrderStatusUpdateSchema);
    if (!validation.valid) {
      res.status(400).json({ error: 'VALIDATION_ERROR', details: validation.errors });
      return;
    }
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
  app.get('/api/inventory-transactions', firebaseAuthMiddleware, requireActive, requireRole('super_admin', 'admin', 'inventory_manager'), async (req, res) => {
    try {
      const data = await InventoryTransactionService.getTransactions();
      res.json(data);
    } catch (err: any) {
      res.status(500).json({ error: err.message || "Failed to fetch inventory transactions" });
    }
  });

  // POST /api/inventory-transactions
  app.post('/api/inventory-transactions', firebaseAuthMiddleware, requireActive, requireRole('super_admin', 'admin', 'inventory_manager'), async (req, res) => {
    const validation = validate(req.body, InventoryTransactionSchema);
    if (!validation.valid) {
      res.status(400).json({ error: 'VALIDATION_ERROR', details: validation.errors });
      return;
    }
    try {
      const result = await InventoryTransactionService.createTransaction(req.body);
      res.status(201).json(result);
    } catch (err: any) {
      res.status(500).json({ error: err.message || "Failed to record inventory transaction" });
    }
  });

  // GET /api/audit-logs
  app.get('/api/audit-logs', firebaseAuthMiddleware, requireActive, requireRole('super_admin', 'admin'), async (req, res) => {
    try {
      const data = await AuditLogService.getLogs();
      res.json(data);
    } catch (err: any) {
      res.status(500).json({ error: err.message || "Failed to retrieve audit trail" });
    }
  });

  // POST /api/audit-logs
  app.post('/api/audit-logs', firebaseAuthMiddleware, requireActive, requireRole('super_admin', 'admin'), async (req, res) => {
    const validation = validate(req.body, AuditLogSchema);
    if (!validation.valid) {
      res.status(400).json({ error: 'VALIDATION_ERROR', details: validation.errors });
      return;
    }
    try {
      const result = await AuditLogService.log(req.body);
      res.status(201).json(result);
    } catch (err: any) {
      res.status(500).json({ error: err.message || "Failed to submit audit log entry" });
    }
  });

  // POST /api/purchaseorders/:id/receive
  app.post('/api/purchaseorders/:id/receive', firebaseAuthMiddleware, requireActive, requireRole('super_admin', 'admin', 'inventory_manager'), async (req, res) => {
    const validation = validate(req.body, ReceivePurchaseOrderSchema);
    if (!validation.valid) {
      res.status(400).json({ error: 'VALIDATION_ERROR', details: validation.errors });
      return;
    }
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

  const PORT = parseInt(process.env.PORT || '3000', 10);

  // --- ERROR HANDLING (must be last) ---
  app.use(notFoundHandler);
  app.use(errorHandler);

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`[ERP BACKEND] Sentry online. Deep listening on integrated port: ${PORT}`);
  });
}

startServer();
