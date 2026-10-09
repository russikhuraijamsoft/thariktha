import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  collection, 
  doc, 
  setDoc, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  onSnapshot, 
  query, 
  where, 
  orderBy, 
  limit, 
  Timestamp 
} from 'firebase/firestore';
import { 
  Boxes, 
  Plus, 
  Search, 
  Trash2, 
  Edit3, 
  TrendingDown, 
  Barcode, 
  Package, 
  ClipboardList, 
  CheckCircle, 
  TrendingUp, 
  AlertTriangle, 
  RefreshCw, 
  SlidersHorizontal,
  X,
  FileSpreadsheet,
  Layers,
  Truck,
  DollarSign,
  Tag,
  ArrowUpDown,
  Share2
} from 'lucide-react';
import { db, isCloudConnected } from '../firebase';

// --- Types for Extended Inventory Products ---
export interface ProductItem {
  id?: string;
  sku: string;
  barcode: string;
  name: string;
  brand: string;
  category: 'bats' | 'balls' | 'apparel' | 'protective' | 'bags' | 'signage';
  purchasePrice: number;
  sellingPrice: number;
  currentStock: number;
  minimumStock: number;
  supplier: string;
  productImage: string;
  description: string;
  status: 'active' | 'draft' | 'discontinued';
  branchId: 'Melbourne Closets' | 'London Closets' | 'All Branches';
  createdAt: string;
  updatedAt: string;
}

export interface InventoryLog {
  id?: string;
  productId: string;
  productName: string;
  sku: string;
  type: 'increase' | 'decrease' | 'reorder' | 'audit_correction' | 'damaged_write_off';
  amount: number;
  previousStock: number;
  newStock: number;
  reason: string;
  operator: string;
  branchId: string;
  timestamp: string;
}

// Preset Premium Cricket Gloves stock images generated previously
import tonProGloves from '../assets/images/ton_pro_gloves_1779691687706.png';
import ssSkyGloves from '../assets/images/ss_sky_gloves_1779691711487.png';

const PRESET_STOCK_IMAGES = [
  { label: 'TON Executive Gold', url: tonProGloves },
  { label: 'SS Sky Custom Neon', url: ssSkyGloves },
  { label: 'Traditional English Bat', url: 'https://images.unsplash.com/photo-1544033527-b192daee1f5b?w=600&auto=format&fit=crop&q=80' },
  { label: 'Red Leather Alum Balls', url: 'https://images.unsplash.com/photo-1530541930197-ff16ac917b0e?w=600&auto=format&fit=crop&q=80' },
  { label: 'Duffle Pro Kit Bag', url: 'https://images.unsplash.com/photo-1587280501635-68a0e82cd5ff?w=600&auto=format&fit=crop&q=80' },
  { label: 'Neon Protective Pad', url: 'https://images.unsplash.com/photo-1509198397868-475647b2a1e5?w=600&auto=format&fit=crop&q=80' }
];

// Initial dataset loaded from your stock lists and PDFs
const SEED_INVENTORIES: ProductItem[] = [
  {
    sku: "GLV-TON-PRO",
    barcode: "8901234500018",
    name: "SS TON PRO 1.0 Batting Gloves",
    brand: "TON",
    category: "protective",
    purchasePrice: 2200,
    sellingPrice: 5460,
    currentStock: 24,
    minimumStock: 8,
    supplier: "Sareen Sports Industries UP",
    productImage: tonProGloves,
    description: "Syllable-pattern premium test grade glove with soft-fill block articulation and Pittards super-grip palm sheep skin.",
    status: "active",
    branchId: "Melbourne Closets",
    createdAt: "25-Jan-2026",
    updatedAt: "25-May-2026"
  },
  {
    sku: "GLV-SS-SKY10",
    barcode: "8901234500025",
    name: "SS SKY 1.0 Custom Gloves",
    brand: "SS",
    category: "protective",
    purchasePrice: 2000,
    sellingPrice: 4820,
    currentStock: 12,
    minimumStock: 5,
    supplier: "Sunridge Sports",
    productImage: ssSkyGloves,
    description: "Vibrant high-contrast edition with custom joint mechanics, custom orange & lime layout for explosive wrist speed.",
    status: "active",
    branchId: "Melbourne Closets",
    createdAt: "15-Jan-2026",
    updatedAt: "25-May-2026"
  },
  {
    sku: "GLV-TON-RO45",
    barcode: "8901234500032",
    name: "SS TON RO - 45 Test Gloves",
    brand: "TON",
    category: "protective",
    purchasePrice: 2100,
    sellingPrice: 5000,
    currentStock: 18,
    minimumStock: 6,
    supplier: "Sareen Sports Industries",
    productImage: "https://images.unsplash.com/photo-1544033527-b192daee1f5b?w=600&auto=format&fit=crop&q=80",
    description: "Sleek Gray & White high performance cricket batting glove carrying multi-shield impact guards.",
    status: "active",
    branchId: "Melbourne Closets",
    createdAt: "15-Jan-2026",
    updatedAt: "25-May-2026"
  },
  {
    sku: "GLV-TON-PE",
    barcode: "8901234500049",
    name: "TON Player Edition Batting Gloves",
    brand: "TON",
    category: "protective",
    purchasePrice: 1500,
    sellingPrice: 3740,
    currentStock: 6,
    minimumStock: 8,
    supplier: "Sareen Sports Industries",
    productImage: "https://images.unsplash.com/photo-1587280501635-68a0e82cd5ff?w=600&auto=format&fit=crop&q=80",
    description: "Classic robust block-fill batting glove designed for supreme durability and side-mesh crease ventilation.",
    status: "active",
    branchId: "London Closets",
    createdAt: "15-Jan-2026",
    updatedAt: "25-May-2026"
  },
  {
    sku: "BAT-TON-SILV",
    barcode: "8901234500056",
    name: "Ton Silver Edition English Willow Bat",
    brand: "TON",
    category: "bats",
    purchasePrice: 8500,
    sellingPrice: 18000,
    currentStock: 5,
    minimumStock: 2,
    supplier: "Sareen Sports UP India",
    productImage: "https://images.unsplash.com/photo-1530541930197-ff16ac917b0e?w=600&auto=format&fit=crop&q=80",
    description: "Select Grade-A narrow grains English Willow bat with responsive sweetspot and thick concave profile.",
    status: "active",
    branchId: "Melbourne Closets",
    createdAt: "06-Jan-2026",
    updatedAt: "25-May-2026"
  },
  {
    sku: "BAT-RET-STAR",
    barcode: "8901234500063",
    name: "Retro 5 Star E.W. CR. Bat",
    brand: "RETRO",
    category: "bats",
    purchasePrice: 9500,
    sellingPrice: 20000,
    currentStock: 5,
    minimumStock: 2,
    supplier: "Smart Sports Technologies",
    productImage: "https://images.unsplash.com/photo-1509198397868-475647b2a1e5?w=600&auto=format&fit=crop&q=80",
    description: "Limited edition classic profile bat carrying five-star moisture treatment and balanced pickup.",
    status: "active",
    branchId: "London Closets",
    createdAt: "06-Jan-2026",
    updatedAt: "25-May-2026"
  },
  {
    sku: "BAG-DUFF-WH20",
    barcode: "8901234500070",
    name: "Kit Bag - Duffle Wheel Player 2.0",
    brand: "SS",
    category: "bags",
    purchasePrice: 1900,
    sellingPrice: 4300,
    currentStock: 10,
    minimumStock: 4,
    supplier: "Sareen Sports Industries",
    productImage: "https://images.unsplash.com/photo-1587280501635-68a0e82cd5ff?w=600&auto=format&fit=crop&q=80",
    description: "Industrial strength double-compartment duffle wheels bag with wet shoe separators and dedicated bat sheath.",
    status: "active",
    branchId: "Melbourne Closets",
    createdAt: "06-Jan-2026",
    updatedAt: "25-May-2026"
  },
  {
    sku: "BAL-SS-GUTSY",
    barcode: "8901234500087",
    name: "Ball - SS Gutsy (Alum Tanned)",
    brand: "SS",
    category: "balls",
    purchasePrice: 160,
    sellingPrice: 410,
    currentStock: 100,
    minimumStock: 25,
    supplier: "Sareen Sports UP India",
    productImage: "https://images.unsplash.com/photo-1530541930197-ff16ac917b0e?w=600&auto=format&fit=crop&q=80",
    description: "Premium grade alum-tanned 5.5oz leather ball with secure core stitching, high durability.",
    status: "active",
    branchId: "Melbourne Closets",
    createdAt: "06-Jan-2026",
    updatedAt: "25-May-2026"
  },
  {
    sku: "SIG-3D-LET",
    barcode: "9405001011",
    name: "3D Letter Signage Stainless Steel LED",
    brand: "Fastrack Signage",
    category: "signage",
    purchasePrice: 43200,
    sellingPrice: 73200,
    currentStock: 1,
    minimumStock: 1,
    supplier: "Fastrack Signage Imphal",
    productImage: "https://images.unsplash.com/photo-1544033527-b192daee1f5b?w=600&auto=format&fit=crop&q=80",
    description: "Tailored Stainless Steel lettering with premium backlit LED array designed for outdoor outlet canopy.",
    status: "active",
    branchId: "Melbourne Closets",
    createdAt: "10-Jan-2026",
    updatedAt: "10-Jan-2026"
  }
];

export const InventoryView: React.FC<{
  branchScope: 'Melbourne Closets' | 'London Closets';
  profile: any;
}> = ({ branchScope, profile }) => {
  const [products, setProducts] = useState<ProductItem[]>([]);
  const [logs, setLogs] = useState<InventoryLog[]>([]);
  const [search, setSearch] = useState('');
  const [activeCategory, setActiveCategory] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'low' | 'out' | 'healthy'>('all');
  const [sortBy, setSortBy] = useState<'name' | 'sku' | 'stock' | 'price'>('stock');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');

  // Interactive Form States
  const [formModalOpen, setFormModalOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<ProductItem | null>(null);
  const [adjustModalOpen, setAdjustModalOpen] = useState(false);
  const [adjustValue, setAdjustValue] = useState<number>(0);
  const [adjustReason, setAdjustReason] = useState<string>('Physical Audit correction');
  const [isLoading, setIsLoading] = useState(false);

  // New/Edit Product fields state
  const [formSku, setFormSku] = useState('');
  const [formBarcode, setFormBarcode] = useState('');
  const [formName, setFormName] = useState('');
  const [formBrand, setFormBrand] = useState('');
  const [formCategory, setFormCategory] = useState<'bats' | 'balls' | 'apparel' | 'protective' | 'bags' | 'signage'>('protective');
  const [formPurchasePrice, setFormPurchasePrice] = useState(0);
  const [formSellingPrice, setFormSellingPrice] = useState(0);
  const [formCurrentStock, setFormCurrentStock] = useState(0);
  const [formMinimumStock, setFormMinimumStock] = useState(0);
  const [formSupplier, setFormSupplier] = useState('');
  const [formImage, setFormImage] = useState(PRESET_STOCK_IMAGES[0].url);
  const [formDescription, setFormDescription] = useState('');
  const [formStatus, setFormStatus] = useState<'active' | 'draft' | 'discontinued'>('active');
  const [formBranch, setFormBranch] = useState<'Melbourne Closets' | 'London Closets' | 'All Branches'>('Melbourne Closets');

  // Core Sub-tab navigation and auxiliary lists
  const [activeSubTab, setActiveSubTab] = useState<'stock' | 'grn' | 'movements' | 'audit'>('stock');
  const [purchaseOrders, setPurchaseOrders] = useState<any[]>([]);
  const [inventoryTransactions, setInventoryTransactions] = useState<any[]>([]);
  const [auditLogs, setAuditLogs] = useState<any[]>([]);
  const [selectedPO, setSelectedPO] = useState<any | null>(null);
  const [receivedQtys, setReceivedQtys] = useState<Record<string, number>>({});

  // 1. Establish real-time sync with default offline fallbacks
  const fetchProductsFromAzure = async () => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/products');
      if (response.ok) {
        const data = await response.json();
        setProducts(data);
      } else {
        console.warn("Failed to fetch products from backend, falling back to local list");
        loadLocalFallback();
      }
    } catch (error) {
      console.error("Error loading products from server:", error);
      loadLocalFallback();
    } finally {
      setIsLoading(false);
    }
  };

  const fetchPurchaseOrders = async () => {
    try {
      const response = await fetch('/api/purchaseorders');
      if (response.ok) {
        const data = await response.json();
        setPurchaseOrders(data);
      }
    } catch (error) {
      console.error("Error loading purchase orders:", error);
    }
  };

  const fetchInventoryTransactions = async () => {
    try {
      const response = await fetch('/api/inventory-transactions');
      if (response.ok) {
        const data = await response.json();
        setInventoryTransactions(data);
      }
    } catch (error) {
      console.error("Error loading movements:", error);
    }
  };

  const fetchAuditLogs = async () => {
    try {
      const response = await fetch('/api/audit-logs');
      if (response.ok) {
        const data = await response.json();
        setAuditLogs(data);
      }
    } catch (error) {
      console.error("Error loading audit logs:", error);
    }
  };

  const triggerReceivedStock = async (poId: string) => {
    setIsLoading(true);
    try {
      // Create receiving items payload from the state or fall back to standard PO item mapping
      // Standard initial PO items mappings:
      // For PO-2026-001 (Total 18500): GLV-TON-PRO qty: 5 (₹11,000), GLV-SS-SKY10 qty: 3 (₹6,000), SG smartech helmet: 1 (₹1,500)
      // For PO-2026-002: (Total 32000) ss ball, bats etc.
      // We read custom user inputs or provide seed defaults if none are input:
      const itemsToReceive = Object.keys(receivedQtys).length > 0 
        ? Object.entries(receivedQtys).map(([sku, quantity]) => ({ sku, quantity }))
        : [
            { sku: "GLV-TON-PRO", quantity: 5 },
            { sku: "GLV-SS-SKY10", quantity: 3 }
          ];

      const res = await fetch(`/api/purchaseorders/${poId}/receive`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          items: itemsToReceive,
          operator: profile?.name || "Systems Operator"
        })
      });

      if (res.ok) {
        alert(`Successfully processed Goods Received Note (GRN) for Purchase Order: ${poId}! Stock levels updated and transactions recorded.`);
        setSelectedPO(null);
        setReceivedQtys({});
        await fetchProductsFromAzure();
        await fetchPurchaseOrders();
        await fetchInventoryTransactions();
        await fetchAuditLogs();
      } else {
        const err = await res.json();
        alert(`Failed to receive PO stock: ${err.error || 'Server rejected request'}`);
      }
    } catch (err: any) {
      alert(`Network error receiving PO stock: ${err.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchProductsFromAzure();
    fetchPurchaseOrders();
    fetchInventoryTransactions();
    fetchAuditLogs();

    // Fetch local logs
    const localLogs = localStorage.getItem('erp_inventory_logs');
    if (localLogs) {
      try {
        setLogs(JSON.parse(localLogs));
      } catch (e) {
        console.error("Failed to parse local inventory logs:", e);
      }
    }
  }, []);

  const loadLocalFallback = () => {
    setIsLoading(true);
    const localProds = localStorage.getItem('erp_products');
    const localLogs = localStorage.getItem('erp_inventory_logs');

    if (localProds) {
      try {
        setProducts(JSON.parse(localProds));
      } catch (e) {
        console.error("Failed to parse local cached products:", e);
        setProducts(SEED_INVENTORIES);
        localStorage.setItem('erp_products', JSON.stringify(SEED_INVENTORIES));
      }
    } else {
      // Seed preset items inside local storage
      localStorage.setItem('erp_products', JSON.stringify(SEED_INVENTORIES));
      setProducts(SEED_INVENTORIES);
    }

    if (localLogs) {
      try {
        setLogs(JSON.parse(localLogs));
      } catch (e) {
        console.error("Failed to parse local cached logs:", e);
      }
    } else {
      const defaultLogs: InventoryLog[] = [
        {
          productId: "seed-log-1",
          productName: "SS TON PRO 1.0 Batting Gloves",
          sku: "GLV-TON-PRO",
          type: "increase",
          amount: 24,
          previousStock: 0,
          newStock: 24,
          reason: "Bulk Purchase Received",
          operator: profile?.name || "System Admin",
          branchId: "Melbourne Closets",
          timestamp: new Date().toISOString()
        }
      ];
      localStorage.setItem('erp_inventory_logs', JSON.stringify(defaultLogs));
      setLogs(defaultLogs);
    }
    setIsLoading(false);
  };

  // 2. Load Preset Seed Data tool
  const reseedDataToSource = async () => {
    if (window.confirm("Do you want to restore all product items to the premium catalogue presets containing gloves from your stock list?")) {
      setIsLoading(true);
      try {
        let seeded = 0;
        for (const item of SEED_INVENTORIES) {
          const response = await fetch('/api/products', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(item)
          });
          if (response.ok) seeded++;
        }
        await fetchProductsFromAzure();
        alert(`Populated ${seeded} premium baseline gear items into Azure SQL.`);
      } catch (err) {
        console.error("Reseed API error:", err);
        localStorage.setItem('erp_products', JSON.stringify(SEED_INVENTORIES));
        setProducts(SEED_INVENTORIES);
        alert("Populated local store with backdrop configurations.");
      } finally {
        setIsLoading(false);
      }
    }
  };

  // 3. Save/Update product handler
  const handleProductSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    const productPayload: ProductItem = {
      sku: formSku || `SKU-${Math.random().toString(36).substr(2, 9).toUpperCase()}`,
      barcode: formBarcode || Math.floor(1000000000000 + Math.random() * 900000000000).toString(),
      name: formName,
      brand: formBrand || 'SS',
      category: formCategory,
      purchasePrice: Number(formPurchasePrice) || 0,
      sellingPrice: Number(formSellingPrice) || 0,
      currentStock: Number(formCurrentStock) || 0,
      minimumStock: Number(formMinimumStock) || 0,
      supplier: formSupplier || 'Sareen Sports Industries',
      productImage: formImage,
      description: formDescription,
      status: formStatus,
      branchId: formBranch,
      createdAt: selectedProduct ? selectedProduct.createdAt : new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }),
      updatedAt: new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
    };

    try {
      let isSuccess = false;
      if (selectedProduct && selectedProduct.id) {
        const response = await fetch(`/api/products/${selectedProduct.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(productPayload)
        });
        isSuccess = response.ok;
      } else {
        const response = await fetch('/api/products', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(productPayload)
        });
        isSuccess = response.ok;
      }

      if (isSuccess) {
        await fetchProductsFromAzure();
      } else {
        // Fallback save locally
        let updatedList: ProductItem[] = [];
        if (selectedProduct) {
          updatedList = products.map((p) => p.sku === selectedProduct.sku ? { ...productPayload } : p);
        } else {
          updatedList = [productPayload, ...products];
        }
        localStorage.setItem('erp_products', JSON.stringify(updatedList));
        setProducts(updatedList);
      }
    } catch (err) {
      console.error("Error submitting product:", err);
      // Fallback save locally
      let updatedList: ProductItem[] = [];
      if (selectedProduct) {
        updatedList = products.map((p) => p.sku === selectedProduct.sku ? { ...productPayload } : p);
      } else {
        updatedList = [productPayload, ...products];
      }
      localStorage.setItem('erp_products', JSON.stringify(updatedList));
      setProducts(updatedList);
    } finally {
      setFormModalOpen(false);
      setSelectedProduct(null);
      clearFormFields();
      setIsLoading(false);
    }
  };

  // 4. Edit/Delete click handlers
  const handleEditClick = (product: ProductItem) => {
    setSelectedProduct(product);
    setFormSku(product.sku);
    setFormBarcode(product.barcode);
    setFormName(product.name);
    setFormBrand(product.brand);
    setFormCategory(product.category);
    setFormPurchasePrice(product.purchasePrice);
    setFormSellingPrice(product.sellingPrice);
    setFormCurrentStock(product.currentStock);
    setFormMinimumStock(product.minimumStock);
    setFormSupplier(product.supplier);
    setFormImage(product.productImage);
    setFormDescription(product.description || '');
    setFormStatus(product.status);
    setFormBranch(product.branchId);
    setFormModalOpen(true);
  };

  const handleDeleteClick = async (product: ProductItem) => {
    if (window.confirm(`Are you sure you want to completely delete "${product.name}" from the active inventory list?`)) {
      setIsLoading(true);
      try {
        const response = await fetch(`/api/products/${product.id}`, {
          method: 'DELETE'
        });
        if (response.ok) {
          await fetchProductsFromAzure();
        } else {
          // Local fallback
          const remaining = products.filter(p => p.sku !== product.sku);
          localStorage.setItem('erp_products', JSON.stringify(remaining));
          setProducts(remaining);
        }
      } catch (err) {
        console.error("Failed to delete product:", err);
        // Local fallback
        const remaining = products.filter(p => p.sku !== product.sku);
        localStorage.setItem('erp_products', JSON.stringify(remaining));
        setProducts(remaining);
      } finally {
        setIsLoading(false);
      }
    }
  };

  // 5. Open Adjustment panel
  const handleOpenAdjust = (product: ProductItem) => {
    setSelectedProduct(product);
    setAdjustValue(0);
    setAdjustReason('Physical Audit correction');
    setAdjustModalOpen(true);
  };

  const handleApplyAdjustment = async () => {
    if (!selectedProduct) return;
    setIsLoading(true);

    const oldStock = selectedProduct.currentStock;
    const finalStock = oldStock + adjustValue;
    if (finalStock < 0) {
      alert("Stock count cannot be adjusted below 0 items.");
      setIsLoading(false);
      return;
    }

    try {
      const response = await fetch('/api/inventory', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sku: selectedProduct.sku,
          stock: finalStock
        })
      });

      if (response.ok) {
        await fetchProductsFromAzure();
      } else {
        const updatedList = products.map(p => p.sku === selectedProduct.sku ? { ...p, currentStock: finalStock } : p);
        localStorage.setItem('erp_products', JSON.stringify(updatedList));
        setProducts(updatedList);
      }
    } catch (err) {
      console.error("Error applying adjustment:", err);
      const updatedList = products.map(p => p.sku === selectedProduct.sku ? { ...p, currentStock: finalStock } : p);
      localStorage.setItem('erp_products', JSON.stringify(updatedList));
      setProducts(updatedList);
    } finally {
      setAdjustModalOpen(false);
      setSelectedProduct(null);
      setIsLoading(false);
    }
  };

  const quickIncrease = async (product: ProductItem, value: number) => {
    const oldStock = product.currentStock;
    const finalStock = oldStock + value;
    
    try {
      const response = await fetch('/api/inventory', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sku: product.sku,
          stock: finalStock
        })
      });

      if (response.ok) {
        await fetchProductsFromAzure();
      } else {
        const updatedList = products.map(p => p.sku === product.sku ? { ...p, currentStock: finalStock } : p);
        localStorage.setItem('erp_products', JSON.stringify(updatedList));
        setProducts(updatedList);
      }
    } catch (err) {
      console.error("Error doing quick increase:", err);
      const updatedList = products.map(p => p.sku === product.sku ? { ...p, currentStock: finalStock } : p);
      localStorage.setItem('erp_products', JSON.stringify(updatedList));
      setProducts(updatedList);
    }
  };

  const clearFormFields = () => {
    setFormSku('');
    setFormBarcode('');
    setFormName('');
    setFormBrand('');
    setFormCategory('protective');
    setFormPurchasePrice(0);
    setFormSellingPrice(0);
    setFormCurrentStock(0);
    setFormMinimumStock(0);
    setFormSupplier('');
    setFormImage(PRESET_STOCK_IMAGES[0].url);
    setFormDescription('');
    setFormStatus('active');
    setFormBranch('Melbourne Closets');
  };

  // 6. Query searching & filters computation
  const filteredProducts = products.filter(item => {
    const matchSearch = 
      item.name.toLowerCase().includes(search.toLowerCase()) ||
      item.sku.toLowerCase().includes(search.toLowerCase()) ||
      item.barcode.includes(search) ||
      (item.brand && item.brand.toLowerCase().includes(search.toLowerCase())) ||
      (item.supplier && item.supplier.toLowerCase().includes(search.toLowerCase()));

    const matchCategory = activeCategory === 'all' || item.category === activeCategory;
    
    // Physical branch scope filter
    const matchBranch = branchScope === item.branchId || item.branchId === 'All Branches';

    const isLow = item.currentStock <= item.minimumStock;
    const isOut = item.currentStock === 0;

    let matchStatus = true;
    if (statusFilter === 'low') matchStatus = isLow && !isOut;
    else if (statusFilter === 'out') matchStatus = isOut;
    else if (statusFilter === 'healthy') matchStatus = !isLow;

    return matchSearch && matchCategory && matchBranch && matchStatus;
  });

  // Calculate stats values for the branch
  const branchProducts = products.filter(item => branchScope === item.branchId || item.branchId === 'All Branches');
  
  const totalStockItems = branchProducts.reduce((sum, item) => sum + item.currentStock, 0);
  const outOfStockCount = branchProducts.filter(item => item.currentStock === 0).length;
  const criticalLowCount = branchProducts.filter(item => item.currentStock <= item.minimumStock && item.currentStock > 0).length;
  
  const totalFinancialValue = branchProducts.reduce((sum, item) => sum + (item.currentStock * item.sellingPrice), 0);
  const totalCostValue = branchProducts.reduce((sum, item) => sum + (item.currentStock * item.purchasePrice), 0);
  const projectedProfit = totalFinancialValue - totalCostValue;

  return (
    <div className="space-y-6" id="inventory-view-component">
      
      {/* Visual Header Indicator Bar */}
      <div className="bg-white rounded-2xl p-6 border border-[#e3dec9] shadow-sm flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-1.5 rounded bg-amber-500/10 text-amber-600">
              <Boxes className="w-5 h-5 stroke-[2]" />
            </span>
            <span className="font-mono text-xs font-bold uppercase text-amber-500 bg-amber-500/5 px-2 py-0.5 rounded border border-amber-500/20">
              Operational Matrix
            </span>
            <span className="text-[10px] font-mono text-neutral-400">
              Connected Target: {branchScope}
            </span>
          </div>
          <h2 className="text-xl font-black text-neutral-900 tracking-tight mt-1.5 font-sans">
            Inventory Core Stockroom
          </h2>
          <p className="text-xs text-neutral-500 font-sans mt-0.5">
            Realtime catalog parameters, localized physical counts, safety buffers, and barcode allocation.
          </p>
        </div>

        {/* Action Widgets */}
        <div className="flex flex-wrap items-center gap-3">
          
          {/* Cloud Database Connectivity indicator */}
          <div className="px-3.5 py-1.5 rounded-xl border border-[#e3dec9] bg-[#f4f3eb] flex items-center gap-2 text-[11px] font-mono">
            <span className={`w-2.5 h-2.5 rounded-full ${isCloudConnected ? 'bg-emerald-500 animate-pulse' : 'bg-amber-400'}`}></span>
            <span className="text-neutral-700 font-bold">
              {isCloudConnected ? 'GCP Firestore Online' : 'PWA Sandbox Offline'}
            </span>
          </div>

          <button
            onClick={reseedDataToSource}
            className="px-3.5 py-1.5 bg-[#f4f3eb] hover:bg-[#ecebe2] text-neutral-700 font-mono text-[10px] uppercase font-bold tracking-wide rounded-xl border border-[#e3dec9] transition-all flex items-center gap-1.5"
            title="Seed baseline cricket products inside storage"
          >
            <RefreshCw className="w-3.5 h-3.5 text-amber-600" />
            <span>Seed presets</span>
          </button>

          <button
            onClick={() => {
              clearFormFields();
              setSelectedProduct(null);
              setFormModalOpen(true);
            }}
            className="px-4 py-2 bg-neutral-900 hover:bg-neutral-800 text-white font-mono text-xs uppercase font-bold tracking-wider rounded-xl transition-all shadow-md flex items-center gap-2"
          >
            <Plus className="w-4 h-4 text-amber-500 stroke-[2.5]" />
            <span>Register Item</span>
          </button>

        </div>
      </div>

      {/* Primary Dashboard Metrics Blocks */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        
        {/* Metric 1 */}
        <div className="bg-white p-5 rounded-2xl border border-[#e3dec9] shadow-sm space-y-2.5 relative overflow-hidden">
          <div className="absolute top-4 right-4 text-[#e3dec9]">
            <Package className="w-10 h-10 stroke-[1.2]" />
          </div>
          <span className="text-[10px] font-mono text-slate-500 font-bold uppercase block">Total Unit Stocks</span>
          <div className="space-y-1">
            <div className="text-3xl font-black font-sans text-neutral-900 leading-none">
              {totalStockItems} <span className="text-xs font-mono font-medium text-slate-500">items</span>
            </div>
            <p className="text-[10px] text-slate-500 font-sans">
              Currently buffered across active aisles.
            </p>
          </div>
        </div>

        {/* Metric 2 */}
        <div className="bg-white p-5 rounded-2xl border border-[#e3dec9] shadow-sm space-y-2.5 relative overflow-hidden">
          <div className="absolute top-4 right-4 text-red-100">
            <AlertTriangle className="w-10 h-10 stroke-[1.2] text-red-500/20" />
          </div>
          <span className="text-[10px] font-mono text-slate-500 font-bold uppercase block">Low Stock Signals</span>
          <div className="space-y-1">
            <div className="text-3xl font-black font-sans text-red-600 leading-none flex items-baseline gap-2">
              {criticalLowCount} <span className="text-xs font-mono font-bold text-red-400 bg-red-50 px-2 py-0.5 rounded border border-red-100">CRITICAL</span>
            </div>
            <p className="text-[10px] text-slate-500 font-sans">
              Under minimum safety limit rules.
            </p>
          </div>
        </div>

        {/* Metric 3 */}
        <div className="bg-white p-5 rounded-2xl border border-[#e3dec9] shadow-sm space-y-2.5 relative overflow-hidden">
          <div className="absolute top-4 right-4 text-red-100">
            <Trash2 className="w-10 h-10 stroke-[1.2] text-rose-500/10" />
          </div>
          <span className="text-[10px] font-mono text-slate-500 font-bold uppercase block">Out of Stock SKU</span>
          <div className="space-y-1">
            <div className={`text-3xl font-black font-sans leading-none ${outOfStockCount > 0 ? 'text-rose-600' : 'text-neutral-400'}`}>
              {outOfStockCount} <span className="text-xs font-mono font-medium text-slate-400">SKUs</span>
            </div>
            <p className="text-[10px] text-slate-500 font-sans">
              Requiring immediate purchase order.
            </p>
          </div>
        </div>

        {/* Metric 4 */}
        <div className="bg-white p-5 rounded-2xl border border-[#e3dec9] shadow-sm space-y-2.5 relative overflow-hidden">
          <div className="absolute top-4 right-4 text-[#e3dec9]">
            <DollarSign className="w-10 h-10 stroke-[1.2] text-emerald-500/10" />
          </div>
          <span className="text-[10px] font-mono text-slate-500 font-bold uppercase block">Inventory Value Margin</span>
          <div className="space-y-1">
            <div className="text-3xl font-black font-sans text-emerald-600 leading-none">
              ₹{totalFinancialValue.toLocaleString()}
            </div>
            <div className="text-[10px] font-mono text-slate-500 flex justify-between">
              <span>Cost: ₹{totalCostValue.toLocaleString()}</span>
              <span className="text-emerald-700 font-bold">+₹{projectedProfit.toLocaleString()}</span>
            </div>
          </div>
        </div>

      </div>

      {/* CORE SUB-TAB SELECTION BAR */}
      <div className="flex flex-wrap border-b border-[#e3dec9] gap-4" id="inventory-subtabs-navigation">
        {[
          { id: 'stock', label: 'Active Stockroom Levels', count: products.length, icon: Boxes },
          { id: 'grn', label: 'Purchase GRN Receiving', count: purchaseOrders.filter(po => po.Status !== 'Received').length, icon: Truck },
          { id: 'movements', label: 'Movement Ledger', count: inventoryTransactions.length, icon: ArrowUpDown },
          { id: 'audit', label: 'Security Audit Trail', count: auditLogs.length, icon: ClipboardList }
        ].map(tab => {
          const Icon = tab.icon;
          const isActive = activeSubTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveSubTab(tab.id as any)}
              className={`pb-3 px-1 flex items-center gap-2 border-b-2 text-xs font-mono font-bold uppercase transition-all duration-200 cursor-pointer ${
                isActive ? 'border-amber-500 text-[#09090b] font-black' : 'border-transparent text-neutral-400 hover:text-neutral-600'
              }`}
            >
              <Icon className={`w-4 h-4 ${isActive ? 'text-amber-500' : ''}`} />
              <span>{tab.label}</span>
              {tab.count > 0 && (
                <span className={`px-1.5 py-0.5 rounded-full text-[9px] ${
                  isActive ? 'bg-amber-100 text-amber-700 font-bold' : 'bg-neutral-100 text-neutral-500 font-medium'
                }`}>
                  {tab.count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* ACTIVE SUB-TAB CONTENT DISPATCHER */}
      {activeSubTab === 'stock' && (
        <>
          {/* Control Panel: Filters, Search and Sorting Options */}
      <div className="bg-white rounded-2xl p-5 border border-[#e3dec9] shadow-sm space-y-4">
        
        <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-4">
          
          {/* Action Query Search field */}
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input 
              type="text"
              placeholder="Query Name, SKU Code, Barcode, Brand, or Supplier..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2 border border-[#e1dec9] rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500 text-sm font-sans placeholder-slate-400 bg-white"
            />
          </div>

          {/* Quick status filter select */}
          <div className="flex items-center gap-2">
            <SlidersHorizontal className="w-4 h-4 text-slate-400" />
            <span className="text-xs font-mono text-slate-500">Alert Guard:</span>
            <select
              value={statusFilter}
              onChange={(e: any) => setStatusFilter(e.target.value)}
              className="border border-[#e1dec9] rounded-xl px-3 py-1.5 text-xs font-mono bg-white cursor-pointer focus:outline-none focus:ring-2 focus:ring-amber-500"
            >
              <option value="all">Display All Stock</option>
              <option value="low">Low Stock limits warning</option>
              <option value="out">Depleted Items (0 Stock)</option>
              <option value="healthy">Fully Stocked & Safe</option>
            </select>
          </div>

        </div>

        {/* Category selection row */}
        <div className="flex flex-wrap gap-2 pt-2 border-t border-slate-100">
          <button 
            onClick={() => setActiveCategory('all')}
            className={`px-3 py-1.5 rounded-lg text-xs font-mono font-bold uppercase transition-all ${activeCategory === 'all' ? 'bg-amber-500 text-neutral-950 shadow-sm' : 'bg-slate-50 text-slate-600 hover:bg-slate-100'}`}
          >
            All Categories
          </button>
          {['bats', 'balls', 'protective', 'apparel', 'bags', 'signage'].map((cat) => (
            <button 
              key={cat}
              onClick={() => setActiveCategory(cat)}
              className={`px-3 py-1.5 rounded-lg text-xs font-mono font-bold uppercase transition-all ${activeCategory === cat ? 'bg-amber-500 text-neutral-950 shadow-sm' : 'bg-slate-50 text-slate-600 hover:bg-slate-100'}`}
            >
              {cat}
            </button>
          ))}
        </div>

      </div>

      {/* Primary Inventory Ledger Database Table */}
      <div className="bg-white rounded-2xl border border-[#e3dec9] shadow-sm overflow-hidden" id="inventory-ledger-container">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-[#e3dec9] text-xs font-mono text-slate-500">
                <th className="px-6 py-4">Item Catalog Detail</th>
                <th className="px-6 py-4">SKU / Barcode</th>
                <th className="px-6 py-4">Warehouse</th>
                <th className="px-6 py-4">Physical Stockroom Quantity</th>
                <th className="px-6 py-4">Purchase / Retail MRP</th>
                <th className="px-6 py-4">Key Supplier Info</th>
                <th className="px-6 py-4 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-sm">
              {filteredProducts.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center text-slate-400 font-mono">
                    <span className="block text-2xl mb-2">📦</span>
                    No product entries found matching query filters inside {branchScope}.
                  </td>
                </tr>
              ) : (
                filteredProducts.map((item) => {
                  const isLow = item.currentStock <= item.minimumStock;
                  const isOut = item.currentStock === 0;

                  return (
                    <tr key={item.sku} className={`hover:bg-[#f4f3eb]/40 transition-colors ${isLow ? 'bg-red-50/20' : ''}`}>
                      
                      {/* Item Details */}
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <img 
                            src={item.productImage || 'https://images.unsplash.com/photo-1544033527-b192daee1f5b?w=100&auto=format&fit=crop&q=80'} 
                            alt={item.name}
                            referrerPolicy="no-referrer"
                            className="w-11 h-11 rounded-lg object-cover border border-[#e3dec9] bg-slate-50"
                          />
                          <div>
                            <span className="text-[9px] font-mono uppercase bg-amber-100 text-amber-800 px-2 py-0.5 rounded border border-amber-200">
                              {item.category}
                            </span>
                            <div className="font-bold text-neutral-900 mt-1">{item.name}</div>
                            <span className="text-xs text-neutral-400 font-sans">{item.brand} (Brand Profile)</span>
                          </div>
                        </div>
                      </td>

                      {/* SKU / Barcode */}
                      <td className="px-6 py-4 font-mono text-xs text-neutral-700">
                        <div className="space-y-1">
                          <span className="text-amber-600 font-bold block">{item.sku}</span>
                          <span className="text-[10px] text-slate-400 flex items-center gap-1">
                            <Barcode className="w-3.5 h-3.5" />
                            {item.barcode}
                          </span>
                        </div>
                      </td>

                      {/* Branch Target Location */}
                      <td className="px-6 py-4 font-mono text-xs text-slate-500">
                        <span className="px-2 py-1 rounded bg-[#f4f3eb] text-slate-700 border border-[#e3dec9]">
                          {item.branchId}
                        </span>
                      </td>

                      {/* Stock Counts */}
                      <td className="px-6 py-4">
                        <div className="flex flex-col">
                          <div className="flex items-center gap-2">
                            <span className={`text-base font-black font-mono ${isOut ? 'text-red-600' : isLow ? 'text-red-500' : 'text-slate-800'}`}>
                              {item.currentStock} pcs
                            </span>
                            {isOut ? (
                              <span className="text-[8px] font-mono font-bold bg-rose-500 text-white px-1.5 py-0.5 rounded uppercase">DEPLETED</span>
                            ) : isLow ? (
                              <span className="text-[8px] font-mono font-bold bg-amber-500 text-neutral-950 px-1.5 py-0.5 rounded uppercase">LOW LIMIT</span>
                            ) : (
                              <span className="text-[8px] font-mono font-bold bg-emerald-100 text-emerald-800 px-1.5 py-0.5 rounded uppercase">STABLE</span>
                            )}
                          </div>
                          <span className="text-[10px] text-neutral-400 font-sans mt-0.5">
                            Min Threshold: {item.minimumStock} rules
                          </span>
                        </div>
                      </td>

                      {/* Financial values */}
                      <td className="px-6 py-4 font-mono text-xs">
                        <div className="space-y-0.5">
                          <span className="text-slate-800 font-bold block">Sell: ₹{item.sellingPrice.toLocaleString()}</span>
                          <span className="text-[10px] text-slate-400 block">Buy: ₹{item.purchasePrice.toLocaleString()}</span>
                        </div>
                      </td>

                      {/* Supplier Information */}
                      <td className="px-6 py-4">
                        <div className="text-xs text-slate-600 flex items-center gap-1.5">
                          <Truck className="w-4 h-4 text-amber-500/80 shrink-0" />
                          <div>
                            <span className="font-bold text-slate-700 block text-[11px] leading-tight">{item.supplier}</span>
                            <span className="text-[9px] text-slate-400 font-mono">Verified Partner</span>
                          </div>
                        </div>
                      </td>

                      {/* Actions */}
                      <td className="px-6 py-4">
                        <div className="flex items-center justify-center gap-2">
                          <button 
                            onClick={() => handleOpenAdjust(item)}
                            className="p-2 bg-slate-50 hover:bg-slate-100 text-neutral-700 rounded-lg border border-slate-200 transition-all flex items-center gap-1 text-[11px] font-bold font-mono"
                            title="Adjust quantity"
                          >
                            <ArrowUpDown className="w-3.5 h-3.5 text-slate-500" />
                            <span>Adjust</span>
                          </button>

                          <button 
                            onClick={() => handleEditClick(item)}
                            className="p-1.5 bg-slate-50 hover:bg-slate-100 text-blue-600 rounded-lg border border-slate-200 transition-all"
                            title="Edit catalog details"
                          >
                            <Edit3 className="w-4 h-4" />
                          </button>

                          <button 
                            onClick={() => handleDeleteClick(item)}
                            className="p-1.5 bg-rose-50 hover:bg-rose-100 text-rose-600 rounded-lg border border-rose-100 transition-all"
                            title="Delete entry"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>

                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Grid: Storage movement logs & preset catalogs reference card */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Left container: Inventory Movements History Log Tracker */}
        <div className="lg:col-span-8 bg-white rounded-2xl p-6 border border-[#e3dec9] shadow-sm space-y-4">
          <div className="flex justify-between items-center border-b border-slate-100 pb-3">
            <div>
              <h3 className="text-sm font-bold text-neutral-900 font-sans tracking-tight">
                Inventory Movement Audit Trail
              </h3>
              <p className="text-[11px] text-slate-500 font-sans mt-0.5">
                History of logged quantities corrections, reorders, audit balances.
              </p>
            </div>
            <span className="text-[10px] font-mono bg-slate-100 text-slate-600 px-2 py-0.5 rounded">
              {logs.length} logged
            </span>
          </div>

          <div className="space-y-3 max-h-[300px] overflow-y-auto pr-1">
            {logs.length === 0 ? (
              <p className="text-xs text-slate-400 font-mono text-center py-6">
                No stock movement events logged in this session.
              </p>
            ) : (
              logs.map((log, index) => {
                const isIncrease = log.type === 'increase';
                return (
                  <div key={log.id || index} className="p-3 bg-slate-50 rounded-xl border border-slate-100 flex items-center justify-between gap-3 text-xs font-mono">
                    <div className="flex items-center gap-3">
                      <span className={`p-2 rounded-lg text-xs leading-none ${isIncrease ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'}`}>
                        {isIncrease ? '+' : '-'}
                      </span>
                      <div>
                        <div className="flex items-center gap-2">
                          <strong className="text-slate-900">{log.productName}</strong>
                          <span className="text-[10px] text-slate-400 font-bold bg-white px-1.5 py-0.5 rounded border border-slate-100">{log.sku}</span>
                        </div>
                        <p className="text-slate-500 text-[10px] font-sans mt-0.5">
                          Reason: {log.reason} · Operator: <strong>{log.operator}</strong> · Depth: {log.previousStock} → {log.newStock}
                        </p>
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <span className={`text-base font-black ${isIncrease ? 'text-emerald-600' : 'text-rose-600'}`}>
                        {isIncrease ? '+' : '-'}{log.amount}
                      </span>
                      <span className="block text-[9px] text-slate-400 font-sans mt-0.5">
                        {new Date(log.timestamp).toLocaleTimeString()}
                      </span>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Right card: Digital Barcode quick builder widget */}
        <div className="lg:col-span-4 bg-white rounded-2xl p-6 border border-[#e3dec9] shadow-sm space-y-4">
          <div className="border-b border-slate-100 pb-3">
            <h3 className="text-sm font-bold text-neutral-900 font-sans tracking-tight">
              Barcode Utility Engine
            </h3>
            <p className="text-[11px] text-slate-500 font-sans mt-0.5">
              Simulate high-velocity scanner checks and export labels.
            </p>
          </div>

          <div className="space-y-4 font-mono text-xs">
            <div className="bg-[#f4f3eb] p-4 rounded-xl border border-[#e3dec9] text-center space-y-3.5">
              <span className="text-[9.5px] uppercase tracking-widest text-slate-400 font-bold block">ACTIVE LABELS BARCODE</span>
              
              <div className="h-12 w-full max-w-[200px] mx-auto bg-white flex items-end justify-between p-2 rounded-md border border-slate-150 relative overflow-hidden">
                {/* Simulated Barcode Stripes layout */}
                {[...Array(28)].map((_, i) => (
                  <div 
                    key={i} 
                    className={`h-full rounded-sm bg-neutral-900`}
                    style={{ width: `${(i % 3 === 0 ? 3 : i % 5 === 0 ? 1 : 2)}px` }}
                  ></div>
                ))}
              </div>

              <div className="text-[11px] font-mono tracking-wider font-black text-slate-800">
                8901234567891
              </div>
            </div>

            <div className="space-y-2">
              <span className="text-[10px] text-slate-500 uppercase font-black block">Supported Decoders:</span>
              <ul className="text-[10.5px] font-sans grid grid-cols-2 gap-2 text-slate-600">
                <li className="flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-500"></span>
                  EAN-13 Standards
                </li>
                <li className="flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-500"></span>
                  Code 128 Laser
                </li>
                <li className="flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-500"></span>
                  UPC-A Splicer
                </li>
                <li className="flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-500"></span>
                  QR Matrices
                </li>
              </ul>
            </div>

            <button
              onClick={() => alert("EAN-13 label designs exported to print spooler queue.")}
              className="w-full py-1.5.5 text-center bg-slate-50 hover:bg-slate-100 text-neutral-800 font-sans font-bold py-2 border border-slate-200 rounded-xl transition-all"
            >
              Print Decoded PDF Labels
            </button>
          </div>
        </div>

      </div>
      </>
      )}

      {/* PURCHASE GOODS RECEIVED NOTES (GRN) SUB-TAB */}
      {activeSubTab === 'grn' && (
        <div className="space-y-6" id="grn-workflow-panel">
          <div className="bg-white rounded-2xl p-6 border border-[#e3dec9] shadow-sm space-y-2">
            <h3 className="text-base font-black text-neutral-900 font-sans tracking-tight flex items-center gap-2">
              <Truck className="w-5 h-5 text-amber-500" />
              <span>Purchase Orders & Goods Received Note (GRN)</span>
            </h3>
            <p className="text-xs text-slate-500 font-sans max-w-2xl leading-relaxed">
              Verify Supplier shipments and generate instant Goods Received Notes (GRN). This action increases warehouse stocks, logs historical inventory transactions, and updates Purchase Order statuses in the Microsoft Azure SQL ledger database.
            </p>
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
            <div className="xl:col-span-6 space-y-4">
              <span className="text-[10px] font-mono font-bold text-slate-400 block tracking-wider uppercase">Active PO Documents Register ({purchaseOrders.length})</span>
              {purchaseOrders.length === 0 ? (
                <div className="bg-white rounded-2xl p-12 text-center border border-[#e3dec9] text-slate-400 font-mono text-xs">
                  No purchase orders found in registry.
                </div>
              ) : (
                purchaseOrders.map((po) => {
                  const isReceived = po.Status === 'Received';
                  const isSelected = selectedPO?.PurchaseOrderID === po.PurchaseOrderID;
                  return (
                    <div 
                      key={po.PurchaseOrderID} 
                      onClick={() => {
                        setSelectedPO(po);
                        const defaultObj: Record<string, number> = {};
                        if (po.PurchaseOrderID === 'PO-2026-001') {
                          defaultObj["GLV-TON-PRO"] = 5;
                          defaultObj["GLV-SS-SKY10"] = 3;
                        } else {
                          defaultObj["GLV-TON-PRO"] = 10;
                        }
                        setReceivedQtys(defaultObj);
                      }}
                      className={`p-4 bg-white rounded-2xl border transition-all cursor-pointer flex justify-between items-center ${
                        isSelected ? 'border-amber-500 shadow-md ring-1 ring-amber-500/20' : 'border-[#e3dec9] hover:border-slate-400'
                      }`}
                    >
                      <div className="space-y-1.5">
                        <div className="flex items-center gap-2.5">
                          <span className="font-mono text-xs font-bold text-neutral-900 bg-neutral-100 px-2 py-0.5 rounded uppercase border border-neutral-200">
                            {po.PurchaseOrderID}
                          </span>
                          <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase ${
                            isReceived ? 'bg-emerald-50 border border-emerald-200 text-emerald-800' : 'bg-amber-50 border border-amber-200 text-amber-700'
                          }`}>
                            {po.Status || 'Shipped'}
                          </span>
                        </div>
                        <div className="text-[11px] font-sans text-slate-500 flex items-center gap-3">
                          <span>Date: <strong className="text-neutral-700">{po.OrderDate}</strong></span>
                          <span>Est. Delivery: <strong className="text-neutral-700">{po.ExpectedDeliveryDate || 'N/A'}</strong></span>
                        </div>
                        <div className="text-[11px] font-sans text-slate-500">
                          Supplier ID: <strong className="text-neutral-700">{po.SupplierID}</strong>
                        </div>
                      </div>
                      <div className="text-right space-y-1.5 shrink-0">
                        <span className="block text-sm font-black font-sans text-neutral-800">
                          ₹{po.TotalAmount ? po.TotalAmount.toLocaleString() : '18,500'}
                        </span>
                        {!isReceived ? (
                          <span className="text-[9px] font-mono text-amber-500 font-bold uppercase tracking-wide block animate-pulse">Pending GRN check</span>
                        ) : (
                          <span className="text-[9px] font-mono text-emerald-600 font-bold uppercase tracking-wide block">Stock Checked In</span>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            <div className="xl:col-span-6">
              {selectedPO ? (
                <div className="bg-white rounded-2xl p-6 border border-[#e3dec9] shadow-sm space-y-6">
                  <div className="border-b border-slate-100 pb-3">
                    <span className="text-[9px] font-mono bg-amber-100 text-amber-850 px-2.5 py-0.5 rounded border border-amber-200/50 uppercase font-bold">GRN Receiving Slip Verification</span>
                    <h4 className="text-base font-black text-neutral-100 font-sans tracking-tight mt-1">
                      Inspect PO: {selectedPO.PurchaseOrderID}
                    </h4>
                    <p className="text-xs text-slate-500 font-sans">Verify counts of products before approving stock reception.</p>
                  </div>

                  <div className="space-y-4">
                    <span className="text-[10px] font-mono font-bold text-slate-400 block tracking-wider uppercase">Shipment Detail Checklist</span>
                    
                    <div className="space-y-3">
                      {(selectedPO.PurchaseOrderID === 'PO-2026-001' ? [
                        { sku: "GLV-TON-PRO", name: "SS TON PRO 1.0 Batting Gloves", recommended: 5 },
                        { sku: "GLV-SS-SKY10", name: "SS SKY 1.0 Custom Gloves", recommended: 3 }
                      ] : [
                        { sku: "GLV-TON-PRO", name: "SS TON PRO 1.0 Batting Gloves", recommended: 10 }
                      ]).map((item) => (
                        <div key={item.sku} className="p-3 bg-slate-50 rounded-xl border border-slate-100 flex flex-col md:flex-row justify-between items-start md:items-center gap-3 text-xs">
                          <div className="font-mono">
                            <strong className="text-slate-900 block font-bold">{item.name}</strong>
                            <span className="text-[10px] text-slate-400 bg-white border border-slate-100 px-2 py-0.5 rounded mt-0.5 inline-block">{item.sku}</span>
                          </div>
                          <div className="flex items-center gap-3 self-stretch md:self-auto justify-between md:justify-start">
                            <span className="text-[11px] font-mono text-slate-400">Target PO Qty: <strong className="text-slate-700">{item.recommended}</strong></span>
                            <div className="flex items-center gap-2">
                              <span className="text-[11px] text-slate-500 font-mono">Actual Received:</span>
                              <input 
                                type="number" 
                                min={0}
                                value={receivedQtys[item.sku] ?? item.recommended}
                                onChange={(e) => {
                                  const val = Math.max(0, parseInt(e.target.value) || 0);
                                  setReceivedQtys(prev => ({ ...prev, [item.sku]: val }));
                                }}
                                className="w-16 border border-slate-200 rounded-lg px-2 py-1 text-center font-mono font-bold text-neutral-900 bg-white"
                              />
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>

                    <div className="bg-[#f4f3eb] p-3 rounded-xl border border-[#e3dec9] text-[11px] font-mono text-slate-600">
                      <strong>Automatic Actions triggered:</strong> This GRN updates Purchase Order Status to <span className="text-emerald-700 font-bold">"Received"</span>, increments safety stock levels, logs transactions ledger, and registers a secure security signature.
                    </div>

                    {selectedPO.Status === 'Received' ? (
                      <div className="p-3 bg-emerald-50 border border-emerald-100 rounded-xl text-center text-xs font-bold text-emerald-800">
                        ✓ This purchase order stock has already been completely received and checked in.
                      </div>
                    ) : (
                      <button
                        onClick={() => triggerReceivedStock(selectedPO.PurchaseOrderID)}
                        className="w-full py-2.5 hover:bg-amber-600 bg-amber-500 text-neutral-950 font-mono font-bold uppercase text-xs tracking-wider rounded-xl transition-all shadow-md flex items-center justify-center gap-2"
                      >
                        <CheckCircle className="w-4 h-4 stroke-[2.5]" />
                        <span>Verify & Complete Stock Check In</span>
                      </button>
                    )}
                  </div>
                </div>
              ) : (
                <div className="h-full bg-slate-50 border-2 border-dashed border-[#e3dec9] rounded-2xl flex flex-col justify-center items-center p-12 text-center text-slate-400 font-mono text-xs">
                  <span>👈 Select an active Purchase Order to inspect and verify stock reception.</span>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* INVENTORY MOVEMENTS LEDGER PANEL */}
      {activeSubTab === 'movements' && (
        <div className="space-y-4" id="movements-history-panel">
          <div className="bg-white rounded-2xl p-6 border border-[#e3dec9] shadow-sm space-y-2">
            <h3 className="text-base font-black text-neutral-900 font-sans tracking-tight flex items-center gap-2">
              <ArrowUpDown className="w-5 h-5 text-amber-500" />
              <span>Inventory Movements Transaction Ledger</span>
            </h3>
            <p className="text-xs text-slate-500 font-sans max-w-2xl leading-relaxed">
              Historical ledger of physical stock room transactions. Displays increment/decrement trends (SALE, PURCHASE, ADJUSTMENT, RETURN) with immediate association to customer order and suppliers purchase documents.
            </p>
          </div>

          <div className="bg-white rounded-2xl border border-[#e3dec9] shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-50 border-b border-[#e3dec9] text-xs font-mono text-slate-500 uppercase">
                    <th className="px-6 py-4">Transaction Code</th>
                    <th className="px-6 py-4">Category Type</th>
                    <th className="px-6 py-4">Item (SKU)</th>
                    <th className="px-6 py-4">Quantity Change</th>
                    <th className="px-6 py-4">Reference Document</th>
                    <th className="px-6 py-4">Timestamp</th>
                    <th className="px-6 py-4">Details / Remarks</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-sm font-mono">
                  {inventoryTransactions.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="px-6 py-12 text-center text-slate-400">No inventory transactions logged.</td>
                    </tr>
                  ) : (
                    inventoryTransactions.map((tx) => {
                      const isSale = tx.transaction_type === 'SALE';
                      const isPurchase = tx.transaction_type === 'PURCHASE';
                      const isAdjustment = tx.transaction_type === 'ADJUSTMENT';

                      let badgeStyle = "bg-blue-50 text-blue-700";
                      if (isSale) badgeStyle = "bg-rose-50 text-rose-700";
                      else if (isPurchase) badgeStyle = "bg-emerald-50 text-emerald-700";
                      else if (isAdjustment) badgeStyle = "bg-amber-50 text-amber-700";

                      return (
                        <tr key={tx.transaction_id} className="hover:bg-slate-50/50">
                          <td className="px-6 py-4 font-bold text-neutral-800">{tx.transaction_id}</td>
                          <td className="px-6 py-4">
                            <span className={`px-2 py-0.5 rounded text-[10px] font-black uppercase ${badgeStyle}`}>
                              {tx.transaction_type}
                            </span>
                          </td>
                          <td className="px-6 py-4">
                            <div className="font-sans font-bold text-neutral-900 leading-snug">{tx.product_name}</div>
                            <div className="text-[10px] text-slate-400 font-mono mt-0.5">{tx.sku}</div>
                          </td>
                          <td className="px-6 py-4 font-black">
                            <span className={tx.quantity < 0 ? 'text-rose-600' : 'text-emerald-600'}>
                              {tx.quantity > 0 ? `+${tx.quantity}` : tx.quantity}
                            </span>
                          </td>
                          <td className="px-6 py-4 font-bold text-neutral-700">{tx.reference_type}: {tx.reference_id}</td>
                          <td className="px-6 py-4 text-slate-400 text-[10px]">{new Date(tx.transaction_date).toLocaleString()}</td>
                          <td className="px-6 py-4 font-sans text-neutral-600">{tx.remarks}</td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* SECURITY IMMUTABLE AUDIT TRAIL SUB-TAB */}
      {activeSubTab === 'audit' && (
        <div className="space-y-4" id="security-audit-panel">
          <div className="bg-white rounded-2xl p-6 border border-[#e3dec9] shadow-sm space-y-2">
            <h3 className="text-base font-black text-neutral-900 font-sans tracking-tight flex items-center gap-2">
              <ClipboardList className="w-5 h-5 text-amber-500" />
              <span>Relational Security Audit Trail (AuditLogs)</span>
            </h3>
            <p className="text-xs text-slate-500 font-sans max-w-2xl leading-relaxed">
              Automatic immutable record of Create, Update, and Delete operations performed across ERP registers. Keeps full accountability of physical stock operations and invoice management.
            </p>
          </div>

          <div className="bg-white rounded-2xl border border-[#e3dec9] shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-50 border-b border-[#e3dec9] text-xs font-mono text-slate-500 uppercase">
                    <th className="px-6 py-4">UUID</th>
                    <th className="px-6 py-4">Security Category</th>
                    <th className="px-6 py-4">Affected Register</th>
                    <th className="px-6 py-4">Register Reference ID</th>
                    <th className="px-6 py-4">Immutable Details description</th>
                    <th className="px-6 py-4">Responsible Operator</th>
                    <th className="px-6 py-4">Recorded Timestamp</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-sm font-mono">
                  {auditLogs.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="px-6 py-12 text-center text-slate-400 font-mono">No security audit logs found.</td>
                    </tr>
                  ) : (
                    auditLogs.map((log) => {
                      const isCreate = log.action_type === 'CREATE';
                      const isDelete = log.action_type === 'DELETE';
                      const isUpdate = log.action_type === 'UPDATE';

                      let badgeStyle = "bg-blue-50 text-blue-700";
                      if (isCreate) badgeStyle = "bg-emerald-50 text-emerald-700";
                      else if (isDelete) badgeStyle = "bg-rose-50 text-rose-700 border border-rose-100";
                      else if (isUpdate) badgeStyle = "bg-amber-50 text-amber-700";

                      return (
                        <tr key={log.log_id} className="hover:bg-slate-50/50">
                          <td className="px-6 py-4 text-slate-500">{log.log_id}</td>
                          <td className="px-6 py-4">
                            <span className={`px-2 py-0.5 rounded text-[10px] font-black uppercase ${badgeStyle}`}>
                              {log.action_type}
                            </span>
                          </td>
                          <td className="px-6 py-4 font-sans font-bold text-neutral-800">{log.target_table}</td>
                          <td className="px-6 py-4 font-bold text-neutral-700">{log.target_id}</td>
                          <td className="px-6 py-4 font-sans text-neutral-600 antialiased">{log.details}</td>
                          <td className="px-6 py-4 font-bold text-neutral-800">{log.operator || 'Lanes cashier'}</td>
                          <td className="px-6 py-4 text-slate-400 text-[10px]">{new Date(log.timestamp).toLocaleString()}</td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* INTERACTIVE FORM MODAL: REGISTER & EDIT PRODUCT CATALOG DETAILS */}
      <AnimatePresence>
        {formModalOpen && (
          <div className="fixed inset-0 z-50 overflow-y-auto flex items-center justify-center p-4">
            
            {/* Overlay backdrop */}
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => {
                setSelectedProduct(null);
                setFormModalOpen(false);
              }}
              className="fixed inset-0 bg-neutral-950/70 backdrop-blur-sm"
            />

            {/* Modal Body Container */}
            <motion.div 
              initial={{ scale: 0.95, y: 15, opacity: 0 }}
              animate={{ scale: 1, y: 0, opacity: 1 }}
              exit={{ scale: 0.95, y: 15, opacity: 0 }}
              className="bg-white rounded-2xl w-full max-w-2xl border border-[#e3dec9] shadow-2xl relative overflow-hidden z-25 p-6"
            >
              
              {/* Header */}
              <div className="flex justify-between items-start border-b border-slate-100 pb-3.5">
                <div>
                  <h3 className="text-lg font-black text-slate-900 tracking-tight">
                    {selectedProduct ? `Modify Entry: ${selectedProduct.name}` : 'Register New Inventory Item'}
                  </h3>
                  <p className="text-xs text-slate-500 font-sans">
                    Setup key product specifications, safety limits and prices.
                  </p>
                </div>
                <button 
                  onClick={() => {
                    setSelectedProduct(null);
                    setFormModalOpen(false);
                  }}
                  className="p-1 hover:bg-slate-100 rounded-lg text-slate-500 transition-all cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Form Body fields */}
              <form onSubmit={handleProductSubmit} className="space-y-4 pt-4 text-xs">
                
                {/* Line 1: Name and Brand */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <div className="md:col-span-2 space-y-1">
                    <label className="text-slate-600 font-black block">Product Name *</label>
                    <input 
                      type="text" 
                      required
                      placeholder="e.g. TON Player Edition 1.0 Batting Gloves"
                      value={formName}
                      onChange={(e) => setFormName(e.target.value)}
                      className="w-full border border-[#e1dec9] rounded-xl px-3 py-2 focus:ring-2 focus:ring-amber-500 focus:outline-none bg-white font-sans text-neutral-900"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-slate-600 font-black block">Brand *</label>
                    <input 
                      type="text" 
                      required
                      placeholder="e.g. TON, SS, RETRO"
                      value={formBrand}
                      onChange={(e) => setFormBrand(e.target.value)}
                      className="w-full border border-[#e1dec9] rounded-xl px-3 py-2 focus:ring-2 focus:ring-amber-500 focus:outline-none bg-white font-sans text-neutral-900"
                    />
                  </div>
                </div>

                {/* Line 2: SKU and Barcode */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-slate-600 font-black block">SKU Code (Unique ID) *</label>
                    <input 
                      type="text" 
                      required
                      placeholder="e.g. GLV-TON-PRO"
                      value={formSku}
                      onChange={(e) => setFormSku(e.target.value)}
                      className="w-full border border-[#e1dec9] rounded-xl px-3 py-2 focus:ring-2 focus:ring-amber-500 focus:outline-none bg-white font-sans text-neutral-900"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-slate-600 font-black block">Barcode (EAN-13)</label>
                    <input 
                      type="text" 
                      placeholder="e.g. 8901234500018"
                      value={formBarcode}
                      onChange={(e) => setFormBarcode(e.target.value)}
                      className="w-full border border-[#e1dec9] rounded-xl px-3 py-2 focus:ring-2 focus:ring-amber-500 focus:outline-none bg-white font-sans text-neutral-900"
                    />
                  </div>
                </div>

                {/* Line 3: Category and Branch Scope */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <div className="space-y-1">
                    <label className="text-slate-600 font-black block">Item Category *</label>
                    <select
                      value={formCategory}
                      onChange={(e: any) => setFormCategory(e.target.value)}
                      className="w-full border border-[#e1dec9] rounded-xl px-3 py-2 focus:ring-2 focus:ring-amber-500 focus:outline-none bg-white font-sans text-neutral-900"
                    >
                      <option value="protective">Protective (Gloves, pads)</option>
                      <option value="bats">English Willow Bats</option>
                      <option value="balls">Match Leather Balls</option>
                      <option value="apparel">Sublimation apparel shirts</option>
                      <option value="bags">Player Kit Bags</option>
                      <option value="signage">Sports Signage</option>
                    </select>
                  </div>
                  <div className="space-y-1">
                    <label className="text-slate-600 font-black block">Warehouse Branch *</label>
                    <select
                      value={formBranch}
                      onChange={(e: any) => setFormBranch(e.target.value)}
                      className="w-full border border-[#e1dec9] rounded-xl px-3 py-2 focus:ring-2 focus:ring-amber-500 focus:outline-none bg-white font-sans text-neutral-900"
                    >
                      <option value="Melbourne Closets">Melbourne Warehouse</option>
                      <option value="London Closets">London Closet Depot</option>
                      <option value="All Branches">Shared Across All Branches</option>
                    </select>
                  </div>
                  <div className="space-y-1">
                    <label className="text-slate-600 font-black block">Supplier *</label>
                    <input 
                      type="text" 
                      required
                      placeholder="e.g. Sareen Sports Ltd"
                      value={formSupplier}
                      onChange={(e) => setFormSupplier(e.target.value)}
                      className="w-full border border-[#e1dec9] rounded-xl px-3 py-2 focus:ring-2 focus:ring-amber-500 focus:outline-none bg-white font-sans"
                    />
                  </div>
                </div>

                {/* Line 4: Prices & Stock */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                  <div className="space-y-1">
                    <label className="text-slate-600 font-black block">Purchase Price (₹) *</label>
                    <input 
                      type="number" 
                      required
                      min={0}
                      value={formPurchasePrice}
                      onChange={(e) => setFormPurchasePrice(Number(e.target.value))}
                      className="w-full border border-[#e1dec9] rounded-xl px-3 py-2 focus:ring-2 focus:ring-amber-500 focus:outline-none bg-white font-sans text-neutral-900"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-slate-600 font-black block">Selling Retail MRP (₹) *</label>
                    <input 
                      type="number" 
                      required
                      min={0}
                      value={formSellingPrice}
                      onChange={(e) => setFormSellingPrice(Number(e.target.value))}
                      className="w-full border border-[#e1dec9] rounded-xl px-3 py-2 focus:ring-2 focus:ring-amber-500 focus:outline-none bg-white font-sans text-neutral-900"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-slate-600 font-black block font-mono">Current Stock *</label>
                    <input 
                      type="number" 
                      required
                      min={0}
                      disabled={!!selectedProduct}
                      value={formCurrentStock}
                      onChange={(e) => setFormCurrentStock(Number(e.target.value))}
                      className="w-full border border-[#e1dec9] rounded-xl px-3 py-2 focus:ring-2 focus:ring-amber-500 focus:outline-none bg-white font-sans text-neutral-900 disabled:opacity-60"
                      title={selectedProduct ? "Stock count can be modified using secure Adjust screen to preserve log trace." : ''}
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-slate-600 font-black block">Safety Min Level *</label>
                    <input 
                      type="number" 
                      required
                      min={1}
                      value={formMinimumStock}
                      onChange={(e) => setFormMinimumStock(Number(e.target.value))}
                      className="w-full border border-[#e1dec9] rounded-xl px-3 py-2 focus:ring-2 focus:ring-amber-500 focus:outline-none bg-white font-sans text-neutral-900"
                    />
                  </div>
                </div>

                {/* Preset Stock image select */}
                <div className="space-y-1.5">
                  <label className="text-slate-600 font-black block">Product Image *</label>
                  <div className="grid grid-cols-3 md:grid-cols-6 gap-2">
                    {PRESET_STOCK_IMAGES.map((preset) => (
                      <button
                        key={preset.label}
                        type="button"
                        onClick={() => setFormImage(preset.url)}
                        className={`p-1.5 rounded-lg border text-center transition-all flex flex-col items-center justify-center bg-slate-50 hover:bg-slate-100 ${formImage === preset.url ? 'border-amber-500 ring-2 ring-amber-400/20' : 'border-[#e3dec9]'}`}
                      >
                        <img 
                          src={preset.url} 
                          alt={preset.label} 
                          referrerPolicy="no-referrer"
                          className="w-8 h-8 rounded object-cover" 
                        />
                        <span className="text-[7.5px] scale-95 leading-none shrink-0 block mt-1 truncate max-w-full font-mono font-medium">{preset.label}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Row 6: Description */}
                <div className="space-y-1">
                  <label className="text-slate-600 font-black block">Custom Product Summary</label>
                  <textarea 
                    rows={2}
                    placeholder="Describe specific grains count, balance weights, wrapping textures..."
                    value={formDescription}
                    onChange={(e) => setFormDescription(e.target.value)}
                    className="w-full border border-[#e1dec9] rounded-xl px-3 py-2 focus:ring-2 focus:ring-amber-500 focus:outline-none bg-white font-sans"
                  />
                </div>

                {/* Submits and controls */}
                <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedProduct(null);
                      setFormModalOpen(false);
                    }}
                    className="px-4 py-2 text-slate-500 font-sans font-bold hover:bg-slate-50 rounded-xl transition-all"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isLoading}
                    className="px-5 py-2 bg-neutral-900 hover:bg-neutral-800 text-white font-mono uppercase font-bold tracking-wider rounded-xl transition-all flex items-center gap-1.5"
                  >
                    <span>{selectedProduct ? 'Save Overrides' : 'Commit Register'}</span>
                  </button>
                </div>

              </form>

            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ADJUSTMENT DRAWER MODAL - SECURITY FIRST ADJUSTMENT DIALOG */}
      <AnimatePresence>
        {adjustModalOpen && selectedProduct && (
          <div className="fixed inset-0 z-50 overflow-y-auto flex items-center justify-center p-4">
            
            {/* Backdrop */}
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => {
                setSelectedProduct(null);
                setAdjustModalOpen(false);
              }}
              className="fixed inset-0 bg-neutral-950/70 backdrop-blur-sm"
            />

            {/* Modal Content */}
            <motion.div 
              initial={{ scale: 0.95, y: 15, opacity: 0 }}
              animate={{ scale: 1, y: 0, opacity: 1 }}
              exit={{ scale: 0.95, y: 15, opacity: 0 }}
              className="bg-white rounded-2xl w-full max-w-md border border-[#e3dec9] shadow-2xl relative overflow-hidden z-25 p-6"
            >
              
              <div className="flex justify-between items-start border-b border-slate-100 pb-3">
                <div>
                  <h3 className="text-base font-black text-slate-900 tracking-tight">
                    Stock Quantity Adjustment
                  </h3>
                  <span className="text-[10px] uppercase font-mono bg-amber-50 text-amber-800 border border-amber-200 px-2 py-0.5 rounded mt-1 inline-block">
                    {selectedProduct.sku}
                  </span>
                </div>
                <button 
                  onClick={() => {
                    setSelectedProduct(null);
                    setAdjustModalOpen(false);
                  }}
                  className="p-1 hover:bg-slate-100 rounded-lg text-slate-500"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="pt-4 space-y-4">
                
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 flex items-center gap-3">
                  <img 
                    src={selectedProduct.productImage} 
                    alt={selectedProduct.name} 
                    referrerPolicy="no-referrer"
                    className="w-12 h-12 rounded object-cover border border-[#e3dec9] bg-white" 
                  />
                  <div>
                    <h4 className="font-bold text-slate-900 leading-snug">{selectedProduct.name}</h4>
                    <span className="text-slate-500 font-mono text-[11px] block mt-0.5">
                      Current ledger holds: <strong>{selectedProduct.currentStock} items</strong>
                    </span>
                  </div>
                </div>

                {/* Adjuster Input Number and Direction Actions */}
                <div className="space-y-1.5 font-mono text-xs">
                  <label className="text-slate-600 font-black block">Quantity Change Value</label>
                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      onClick={() => setAdjustValue((v) => v - 1)}
                      className="w-10 h-10 rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100 font-black text-lg focus:outline-none"
                    >
                      -
                    </button>
                    <input 
                      type="number"
                      value={adjustValue}
                      onChange={(e) => setAdjustValue(Number(e.target.value))}
                      className="flex-1 border border-[#e1dec9] rounded-xl text-center h-10 font-bold text-base focus:ring-2 focus:ring-amber-500 focus:outline-none"
                    />
                    <button
                      type="button"
                      onClick={() => setAdjustValue((v) => v + 1)}
                      className="w-10 h-10 rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100 font-black text-lg focus:outline-none"
                    >
                      +
                    </button>
                  </div>
                  <div className="text-[10.5px] text-slate-400 font-sans text-center">
                    New Computed Stock will be: <strong>{selectedProduct.currentStock + adjustValue} units</strong>
                  </div>
                </div>

                {/* Adjust Reason */}
                <div className="space-y-1.5 font-sans text-xs">
                  <label className="text-slate-600 font-black block">Adjustment Reason *</label>
                  <select
                    value={adjustReason}
                    onChange={(e) => setAdjustReason(e.target.value)}
                    className="w-full border border-[#e1dec9] rounded-xl px-3 py-2 text-neutral-950 bg-white cursor-pointer"
                  >
                    <option value="Physical Audit correction">Physical Audit correction (Count error)</option>
                    <option value="Bulk Purchase Received">Bulk Purchase Received (Aisle replenishment)</option>
                    <option value="Damaged Stock write-off">Damaged Stock write-off (Glove split / seam tear)</option>
                    <option value="Consignment allocation offset">Outside dispatch consignment</option>
                  </select>
                </div>

                <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedProduct(null);
                      setAdjustModalOpen(false);
                    }}
                    className="px-4 py-2 text-slate-500 font-bold hover:bg-slate-50 rounded-xl transition-all"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleApplyAdjustment}
                    className="px-5 py-2 bg-neutral-900 hover:bg-neutral-800 text-white font-mono uppercase font-bold tracking-wider rounded-xl transition-all"
                  >
                    Commit Adjustment
                  </button>
                </div>

              </div>

            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
};
