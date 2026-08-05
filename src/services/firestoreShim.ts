class BehaviorSubject<T> {
  private value: T;
  private listeners: Array<(val: T) => void> = [];
  
  constructor(initialValue: T) {
    this.value = initialValue;
  }
  
  subscribe(callback: (val: T) => void) {
    this.listeners.push(callback);
    callback(this.value);
    return {
      unsubscribe: () => {
        this.listeners = this.listeners.filter(cb => cb !== callback);
      }
    };
  }
  
  next(newValue: T) {
    this.value = newValue;
    this.listeners.forEach(cb => cb(newValue));
  }
}

// Helper custom Timestamp to replace firebase/firestore Timestamp
export class Timestamp {
  seconds: number;
  nanoseconds: number;
  constructor(seconds: number, nanoseconds: number) {
    this.seconds = seconds;
    this.nanoseconds = nanoseconds;
  }
  static now() {
    return new Timestamp(Math.floor(Date.now() / 1000), 0);
  }
  static fromDate(d: Date) {
    return new Timestamp(Math.floor(d.getTime() / 1000), 0);
  }
  toDate() {
    return new Date(this.seconds * 1000);
  }
  toISOString() {
    return this.toDate().toISOString();
  }
}

// Global Event Subjects to trigger real-time onSnapshot updates whenever writers execute!
const dbChangeSubject = new BehaviorSubject<{ collectionName: string; timestamp: number }>({ collectionName: '', timestamp: 0 });

export const collection = (db: any, path: string) => {
  return { db, path, type: 'collection' };
};

export const doc = (dbOrCollection: any, pathOrCreateId?: string, maybeDocId?: string) => {
  let finalPath = '';
  let finalId = '';
  if (dbOrCollection && dbOrCollection.type === 'collection') {
    finalPath = dbOrCollection.path;
    finalId = pathOrCreateId || '';
  } else {
    finalPath = dbOrCollection || '';
    finalId = maybeDocId || pathOrCreateId || '';
  }
  return { path: finalPath, docId: finalId, type: 'doc' };
};

export const query = (colRef: any, ...constraints: any[]) => {
  return { colRef, constraints, type: 'query' };
};

export const where = (field: string, op: string, val: any) => {
  return { type: 'where', field, op, val };
};

export const orderBy = (field: string, dir: 'asc' | 'desc' = 'asc') => {
  return { type: 'orderBy', field, dir };
};

export const limit = (num: number) => {
  return { type: 'limit', num };
};

// SQL-to-Firestore schema mapper
function mapSqlRowToFirestoreDoc(collectionName: string, row: any) {
  if (collectionName === 'products' || collectionName === 'inventory') {
    // InventoryView expecting ProductItem
    const skuCode = row.sku || row.SKU || 'SKU-001';
    return {
      sku: skuCode,
      barcode: row.barcode || `89012345000${Math.floor(10 + Math.random() * 80)}`,
      name: row.name || row.SKU_Label || `SG Product Class (${skuCode})`,
      brand: row.brand || 'SG',
      category: row.category || 'protective',
      purchasePrice: row.rawCost || row.purchasePrice || 2100,
      sellingPrice: row.price || row.sellingPrice || 5000,
      currentStock: row.stock ?? row.StockLevel ?? 16,
      minimumStock: row.safetyLevel ?? row.SafetyStock ?? 8,
      supplier: row.supplier || 'Sareen Sports Industries',
      productImage: row.productImage || 'https://images.unsplash.com/photo-1544033527-b192daee1f5b?w=600&auto=format&fit=crop&q=60',
      description: row.description || 'Premium hand-burnished English Willow billet.',
      status: 'active',
      branchId: row.branchId || 'Melbourne Closets',
      createdAt: row.createdAt || '25-May-2026',
      updatedAt: row.updatedAt || '25-May-2026'
    };
  }

  if (collectionName === 'orders') {
    return {
      id: row.id || row.OrderID,
      customerId: row.customerId || 'CUST-001',
      customerName: row.customerName || 'Standard Club Athlete',
      phone: row.phone || '+61-491-570-156',
      teamName: row.teamName || 'VCA Giants Club',
      branchId: row.branchId || 'Melbourne Closets',
      orderType: row.itemType === 'bat' ? 'Custom Bats Milling' : 'Sublimation Jerseys',
      status: row.status || 'pending',
      workflowStatus: row.status === 'manufacturing' ? 'Crafting Handle' : 'Design Approval',
      paymentStatus: row.paymentStatus || 'unpaid',
      totalAmount: row.totalAmount || 900.00,
      advancePayment: row.paymentStatus === 'paid' ? row.totalAmount : 0,
      remainingPayment: row.paymentStatus === 'paid' ? 0 : row.totalAmount,
      promisedDate: row.promisedDate || '2026-06-15',
      notes: row.notes || 'Custom sports kit allocation',
      createdAt: row.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      orderItems: [
        { id: 'item1', sku: row.sku || 'SG-ST-CLS', name: row.customerName || 'SG Strokewell Classic', quantity: 1, unitPrice: row.totalAmount || 520 }
      ]
    };
  }

  if (collectionName === 'customers') {
    return {
      id: row.id,
      name: row.name,
      email: row.email,
      phone: row.phone,
      affiliation: row.affiliation,
      activeOrders: row.activeOrders,
      branch: row.branch,
      address: row.address
    };
  }

  return row;
}

// REALTIME MULTI-TAB REST ENERGETIC LISTENER SHIM
export const onSnapshot = (
  queryOrCol: any,
  onNext: (snapshot: any) => void,
  onError?: (err: any) => void
) => {
  let isUnsubscribed = false;
  const colRef = queryOrCol.type === 'query' ? queryOrCol.colRef : queryOrCol;
  const collectionName = colRef.path;

  // Define loading async routine matching Express REST models
  const refreshSnapshot = async () => {
    if (isUnsubscribed) return;

    try {
      let endpoint = '';
      if (collectionName === 'products' || collectionName === 'inventory') {
        endpoint = '/api/inventory';
      } else if (collectionName === 'orders') {
        endpoint = '/api/orders';
      } else if (collectionName === 'customers') {
        endpoint = '/api/customers';
      } else if (collectionName === 'suppliers') {
        endpoint = '/api/suppliers';
      } else if (collectionName === 'purchase_orders' || collectionName === 'purchaseorders') {
        endpoint = '/api/purchaseorders';
      }

      let dataList: any[] = [];

      if (endpoint) {
        // Fetch from real Live Azure SQL local REST endpoint
        const response = await fetch(endpoint);
        if (response.ok) {
          const sqlData = await response.json();
          dataList = sqlData.map((row: any) => mapSqlRowToFirestoreDoc(collectionName, row));
        }
      }

      // Fallback to localStorage if endpoint not ready or empty list returned (Sandbox safety)
      if (dataList.length === 0) {
        const fallbacks: Record<string, string> = {
          products: 'erp_products',
          orders: 'tott_cricket_closet_orders_Melbourne Closets',
          customers: 'crm_local_customers',
          suppliers: 'erp_suppliers',
          purchase_orders: 'erp_purchase_orders',
          inventory_logs: 'erp_inventory_logs',
          jobs: 'erp_manufacturing_jobs'
        };
        const storageKey = fallbacks[collectionName];
        if (storageKey) {
          const savedStr = localStorage.getItem(storageKey);
          if (savedStr) {
            try {
              dataList = JSON.parse(savedStr);
            } catch (e) {
              console.error(`Failed to parse cached data for ${storageKey}:`, e);
              dataList = [];
            }
          }
        }
      }

      // Build a Mock Firestore QuerySnapshot object
      const snapshot = {
        docs: dataList.map((item: any) => {
          const docId = item.id || item.sku || item.SupplierID || item.CustomerID || `DOC-${Math.floor(Math.random() * 9000)}`;
          return {
            id: docId,
            exists: true,
            ref: { id: docId, path: `${collectionName}/${docId}` },
            data: () => item
          };
        }),
        forEach: function(callback: (doc: any) => void) {
          this.docs.forEach(callback);
        }
      };

      if (!isUnsubscribed) {
        onNext(snapshot);
      }
    } catch (e: any) {
      console.warn(`Shim onSnapshot refresh failure for ${collectionName}:`, e.message);
      if (onError) onError(e);
    }
  };

  // Perform immediate initial fetch
  refreshSnapshot();

  // Listen to DB mutations to trigger instant refresh on other tabs/panels!
  const subscription = dbChangeSubject.subscribe((val) => {
    if (val.collectionName === collectionName || val.collectionName === 'all') {
      refreshSnapshot();
    }
  });

  return () => {
    isUnsubscribed = true;
    subscription.unsubscribe();
  };
};

export const getDocs = async (queryOrCol: any) => {
  return new Promise((resolve, reject) => {
    const unsub = onSnapshot(queryOrCol, (snapshot) => {
      unsub();
      resolve(snapshot);
    }, (error) => {
      unsub();
      reject(error);
    });
  });
};

// --- MUTATION INTERCEPTORS SQUEEZING TO AZURE SQL REST ENDPOINTS ---

export const setDoc = async (docRef: any, data: any) => {
  const collectionName = docRef.path;
  const docId = docRef.docId;

  console.log(`[SHIM WRITER] setDoc intercept on ${collectionName} with id ${docId}`, data);

  try {
    if (collectionName === 'products' || collectionName === 'inventory') {
      // Stock adjustment PUT
      const stock = data.currentStock ?? data.stock ?? 1;
      const sku = data.sku || docId;
      await fetch('/api/inventory', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sku, stock })
      });
    } else if (collectionName === 'orders') {
      // Order intake POST
      await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: data.id || docId,
          customerId: data.customerId || 'CUST-001',
          totalAmount: data.totalAmount || data.price || 500,
          status: data.status || 'pending',
          notes: data.notes || '',
          paymentStatus: data.paymentStatus || 'unpaid',
          promisedDate: data.promisedDate || ''
        })
      });

      // Insert matching order items
      if (data.orderItems && Array.isArray(data.orderItems)) {
        for (const item of data.orderItems) {
          await fetch('/api/orderitems', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              itemId: item.id || `ORI-${Math.floor(1000 + Math.random() * 9000)}`,
              orderId: data.id || docId,
              sku: item.sku || 'SG-ST-CLS',
              quantity: item.quantity || 1,
              unitPrice: item.unitPrice || 500
            })
          }).catch(e => console.error("Error creating item", e));
        }
      }
    }
  } catch (err: any) {
    console.error("Shim setDoc background write error:", err.message);
  }

  // Sync to localStorage for sandbox cache safety
  const fallbacks: Record<string, string> = {
    products: 'erp_products',
    orders: `tott_cricket_closet_orders_Melbourne Closets`,
    customers: 'crm_local_customers',
    suppliers: 'erp_suppliers',
    purchase_orders: 'erp_purchase_orders',
    inventory_logs: 'erp_inventory_logs',
    jobs: 'erp_manufacturing_jobs'
  };

  const key = fallbacks[collectionName];
  if (key) {
    const listStr = localStorage.getItem(key) || '[]';
    let list = [];
    try {
      list = JSON.parse(listStr);
    } catch (e) {
      console.error(`Failed to parse list for key ${key}:`, e);
    }
    
    // Remove if already exists, and prepend
    list = list.filter((x: any) => (x.id !== docId && x.sku !== docId && x.SKU !== docId));
    list.unshift({ id: docId, ...data });
    localStorage.setItem(key, JSON.stringify(list));
    
    // Double save to and branches safety
    if (collectionName === 'orders') {
      localStorage.setItem('tott_cricket_closet_orders_London Closets', JSON.stringify(list));
    }
  }

  // Trigger real-time listener refresh
  dbChangeSubject.next({ collectionName, timestamp: Date.now() });
};

export const updateDoc = async (docRef: any, data: any) => {
  const collectionName = docRef.path;
  const docId = docRef.docId;

  console.log(`[SHIM WRITER] updateDoc intercept on ${collectionName} with id ${docId}`, data);

  try {
    if (collectionName === 'products' || collectionName === 'inventory') {
      const stock = data.currentStock ?? data.stock;
      if (stock !== undefined) {
        await fetch('/api/inventory', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ sku: docId, stock })
        });
      }
    } else if (collectionName === 'orders') {
      if (data.status) {
        await fetch(`/api/orders/${docId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ status: data.status })
        });
      }
    }
  } catch (err: any) {
    console.error("Shim updateDoc background write error:", err.message);
  }

  // Sync to localStorage for sandbox cache safety
  const fallbacks: Record<string, string> = {
    products: 'erp_products',
    orders: 'tott_cricket_closet_orders_Melbourne Closets',
    customers: 'crm_local_customers',
    suppliers: 'erp_suppliers',
    purchase_orders: 'erp_purchase_orders',
    inventory_logs: 'erp_inventory_logs',
    jobs: 'erp_manufacturing_jobs'
  };

  const key = fallbacks[collectionName];
  if (key) {
    const listStr = localStorage.getItem(key) || '[]';
    let list = [];
    try {
      list = JSON.parse(listStr);
    } catch (e) {
      console.error(`Failed to parse list for key ${key} in updateDoc:`, e);
    }
    list = list.map((item: any) => {
      const itemId = item.id || item.sku || item.SKU;
      if (itemId === docId) {
        return { ...item, ...data };
      }
      return item;
    });
    localStorage.setItem(key, JSON.stringify(list));
    
    if (collectionName === 'orders') {
      localStorage.setItem('tott_cricket_closet_orders_London Closets', JSON.stringify(list));
    }
  }

  // Trigger real-time listener refresh
  dbChangeSubject.next({ collectionName, timestamp: Date.now() });
};

export const addDoc = async (colRef: any, data: any) => {
  const collectionName = colRef.path;
  const generatedId = `ID-${Math.floor(1000 + Math.random() * 9000)}`;
  const docRef = { path: collectionName, docId: generatedId, type: 'doc' };
  await setDoc(docRef, data);
  return { id: generatedId, ref: docRef };
};

export const getDoc = async (docRef: any) => {
  const collectionName = docRef.path;
  const docId = docRef.docId;
  console.log(`[SHIM READER] getDoc intercept on ${collectionName}/${docId}`);
  
  // Try retrieving from local storage if available
  const fallbacks: Record<string, string> = {
    users: 'crm_local_customers',
    products: 'erp_products',
    orders: 'tott_cricket_closet_orders_Melbourne Closets'
  };
  const key = fallbacks[collectionName];
  if (key) {
    const listStr = localStorage.getItem(key);
    if (listStr) {
      let list = [];
      try {
        list = JSON.parse(listStr);
      } catch (e) {
        console.error(`Failed to parse list for key ${key} in getDoc:`, e);
      }
      const matched = list.find((x: any) => (x.id === docId || x.sku === docId || x.uid === docId));
      if (matched) {
        return {
          id: docId,
          ref: docRef,
          exists: () => true,
          data: () => matched
        };
      }
    }
  }

  // Fallback default mock user profile if loading auth credentials
  const defaultMap: Record<string, any> = {
    users: {
      uid: docId,
      name: 'Aditya Patel',
      email: 'aditya.patel@cricketcloset.com',
      roleId: 'super_admin',
      branchId: 'Melbourne Closets',
      status: 'active',
      createdAt: '2026-05-24'
    }
  };

  const payload = defaultMap[collectionName] || { id: docId };
  return {
    id: docId,
    ref: docRef,
    exists: () => true,
    data: () => payload
  };
};

export const deleteDoc = async (docRef: any) => {
  const collectionName = docRef.path;
  const docId = docRef.docId;

  console.log(`[SHIM WRITER] deleteDoc intercept on ${collectionName} with id ${docId}`);

  const fallbacks: Record<string, string> = {
    products: 'erp_products',
    orders: 'tott_cricket_closet_orders_Melbourne Closets',
    customers: 'crm_local_customers',
    suppliers: 'erp_suppliers',
    purchase_orders: 'erp_purchase_orders',
    inventory_logs: 'erp_inventory_logs',
    jobs: 'erp_manufacturing_jobs'
  };

  const key = fallbacks[collectionName];
  if (key) {
    const listStr = localStorage.getItem(key) || '[]';
    let list = [];
    try {
      list = JSON.parse(listStr);
    } catch (e) {
      console.error(`Failed to parse list for key ${key} in deleteDoc:`, e);
    }
    list = list.filter((item: any) => {
      const itemId = item.id || item.sku || item.SKU;
      return itemId !== docId;
    });
    localStorage.setItem(key, JSON.stringify(list));
    
    if (collectionName === 'orders') {
      localStorage.setItem('tott_cricket_closet_orders_London Closets', JSON.stringify(list));
    }
  }

  // Trigger real-time listener refresh
  dbChangeSubject.next({ collectionName, timestamp: Date.now() });
};

// Mock initialization routines to satisfy firebase.ts
export const initializeFirestore = (app: any, settings: any, databaseId?: string) => {
  return { app, settings, databaseId, type: 'firestore_db' };
};
export const getFirestore = (app?: any, databaseId?: string) => {
  return { app, databaseId: databaseId || '(default)', type: 'firestore_db' };
};
export const persistentLocalCache = (args: any) => ({ ...args });
export const persistentMultipleTabManager = () => ({});


