import express from 'express';
import dotenv from 'dotenv';
import sql from 'mssql';
import { getDbContext } from './db.js';

dotenv.config();

const app = express();
app.use(express.json());
const PORT = process.env.PORT || 3000;

// API Routes

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    service: 'Cricket Closet ERP API Microserver',
    auth: 'Microsoft Entra ID (Azure Active Directory Access Token)'
  });
});

// Real-time Database Link Quality check endpoint
app.get('/api/db-status', async (req, res) => {
  try {
    const ctx = await getDbContext();
    res.json({
      isRealDb: ctx.isRealDb,
      database: process.env.DB_DATABASE || 'CricketClosetERP',
      server: process.env.DB_SERVER || 'cricketclosetdb.database.windows.net'
    });
  } catch (e) {
    res.json({
      isRealDb: false,
      database: 'Offline Cache Failover',
      server: 'ERR_TIMEOUT'
    });
  }
});

// GET /api/products
app.get('/api/products', async (req, res) => {
  try {
    const ctx = await getDbContext();
    if (ctx.isRealDb && ctx.pool) {
      const result = await ctx.pool.request().query('SELECT * FROM Products');
      res.json(result.recordset);
    } else {
      res.json(ctx.fallbackData.products);
    }
  } catch (err) {
    res.status(500).json({ error: err.message || "Failed to fetch products" });
  }
});

// GET /api/inventory
app.get('/api/inventory', async (req, res) => {
  try {
    const ctx = await getDbContext();
    if (ctx.isRealDb && ctx.pool) {
      const result = await ctx.pool.request().query(`
        SELECT 
          I.SKU as sku,
          P.Name as name,
          P.Category as category,
          I.StockLevel as stock,
          I.SafetyStock as safetyLevel,
          I.ReorderPoint as reorderPoint,
          I.ShelfLocation as shelf,
          P.Price as price,
          P.RawCost as rawCost
        FROM Inventory I
        LEFT JOIN Products P ON I.ProductID = P.ProductID OR I.SKU = P.SKU
      `);
      const mapped = result.recordset.map((row) => ({
        sku: row.sku,
        name: row.name || `Product ${row.sku}`,
        category: row.category || 'bats',
        stock: row.stock ?? 0,
        safetyLevel: row.safetyLevel ?? 10,
        reorderPoint: row.reorderPoint ?? 15,
        shelf: row.shelf || 'Stockroom',
        price: row.price ?? 100,
        rawCost: row.rawCost ?? 50
      }));
      res.json(mapped);
    } else {
      const mapped = ctx.fallbackData.inventory.map((row) => ({
        sku: row.SKU,
        name: row.SKU_Label,
        category: row.Category || 'bats',
        stock: row.StockLevel,
        safetyLevel: row.SafetyStock,
        reorderPoint: row.ReorderPoint,
        shelf: row.ShelfLocation,
        price: row.Price || 100,
        rawCost: row.RawCost || 50
      }));
      res.json(mapped);
    }
  } catch (err) {
    res.status(500).json({ error: err.message || "Failed to fetch inventory" });
  }
});

// GET /api/orders
app.get('/api/orders', async (req, res) => {
  try {
    const ctx = await getDbContext();
    if (ctx.isRealDb && ctx.pool) {
      const result = await ctx.pool.request().query('SELECT * FROM Orders');
      res.json(result.recordset);
    } else {
      res.json(ctx.fallbackData.orders);
    }
  } catch (err) {
    res.status(500).json({ error: err.message || "Failed to fetch orders" });
  }
});

// GET /api/customers
app.get('/api/customers', async (req, res) => {
  try {
    const ctx = await getDbContext();
    if (ctx.isRealDb && ctx.pool) {
      const result = await ctx.pool.request().query('SELECT * FROM Customers');
      res.json(result.recordset);
    } else {
      res.json(ctx.fallbackData.customers);
    }
  } catch (err) {
    res.status(500).json({ error: err.message || "Failed to fetch customers" });
  }
});

// GET /api/suppliers
app.get('/api/suppliers', async (req, res) => {
  try {
    const ctx = await getDbContext();
    if (ctx.isRealDb && ctx.pool) {
      const result = await ctx.pool.request().query('SELECT * FROM Suppliers');
      res.json(result.recordset);
    } else {
      res.json(ctx.fallbackData.suppliers);
    }
  } catch (err) {
    res.status(500).json({ error: err.message || "Failed to fetch suppliers" });
  }
});

// GET /api/purchaseorders
app.get('/api/purchaseorders', async (req, res) => {
  try {
    const ctx = await getDbContext();
    if (ctx.isRealDb && ctx.pool) {
      const result = await ctx.pool.request().query('SELECT * FROM PurchaseOrders');
      res.json(result.recordset);
    } else {
      res.json(ctx.fallbackData.purchaseorders);
    }
  } catch (err) {
    res.status(500).json({ error: err.message || "Failed to fetch purchase orders" });
  }
});

// POST /api/orders
app.post('/api/orders', async (req, res) => {
  try {
    const { id, customerId, totalAmount, status, notes, paymentStatus, promisedDate } = req.body;
    const ctx = await getDbContext();
    if (ctx.isRealDb && ctx.pool) {
      const reqSql = ctx.pool.request();
      reqSql.input('id', sql.VarChar, id);
      reqSql.input('customerId', sql.VarChar, customerId);
      reqSql.input('totalAmount', sql.Decimal(10, 2), totalAmount);
      reqSql.input('status', sql.VarChar, status);
      reqSql.input('notes', sql.VarChar, notes);
      reqSql.input('paymentStatus', sql.VarChar, paymentStatus);
      reqSql.input('promisedDate', sql.VarChar, promisedDate);
      await reqSql.query(`
        INSERT INTO Orders (OrderID, CustomerID, OrderDate, TotalAmount, Status, Notes, PaymentStatus, PromisedDate)
        VALUES (@id, @customerId, GETDATE(), @totalAmount, @status, @notes, @paymentStatus, @promisedDate)
      `);
      res.status(201).json({ success: true, id });
    } else {
      ctx.fallbackData.orders.unshift({
        OrderID: id,
        CustomerID: customerId,
        OrderDate: new Date().toISOString().split('T')[0],
        TotalAmount: totalAmount,
        Status: status,
        Notes: notes,
        PaymentStatus: paymentStatus,
        PromisedDate: promisedDate
      });
      res.status(201).json({ success: true, id });
    }
  } catch (err) {
    res.status(500).json({ error: err.message || "Failed to record order" });
  }
});

// PUT /api/inventory
app.put('/api/inventory', async (req, res) => {
  try {
    const { sku, stock } = req.body;
    const ctx = await getDbContext();
    if (ctx.isRealDb && ctx.pool) {
      const reqSql = ctx.pool.request();
      reqSql.input('stock', sql.Int, stock);
      reqSql.input('sku', sql.VarChar, sku);
      await reqSql.query('UPDATE Inventory SET StockLevel = @stock WHERE SKU = @sku');
      res.json({ success: true, sku, stock });
    } else {
      const item = ctx.fallbackData.inventory.find((i) => i.SKU === sku);
      if (item) {
        item.StockLevel = stock;
      }
      res.json({ success: true, sku, stock });
    }
  } catch (err) {
    res.status(500).json({ error: err.message || "Failed to modify inventory" });
  }
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Express microserver handles routing via Entra ID at: http://localhost:${PORT}`);
});
