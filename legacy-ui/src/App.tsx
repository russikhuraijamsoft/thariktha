import React, { useState, useEffect } from 'react';
import { erpIntegrationService } from './services/erpIntegrationService';
import type {
  ERPOrder,
  ERPInventory,
  ERPJob,
  ERPCustomer,
  ERPInvoice,
  ERPTransaction,
  ERPNotification,
  ERPBranch,
  ERPThemeMode,
  ERPCurrency,
  ERPRouteStop,
  ERPDashboardTab
} from './types/erp';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Database, 
  ShieldAlert, 
  Sliders, 
  LayoutDashboard, 
  Play, 
  CheckCircle2, 
  XCircle, 
  Info, 
  Lock, 
  Search, 
  Code, 
  FileJson, 
  Layers, 
  Hammer, 
  Trophy, 
  Users, 
  Scissors, 
  Printer, 
  TrendingUp, 
  CreditCard, 
  FileText, 
  ShoppingCart, 
  Globe,
  ChevronRight,
  Sparkles,
  ArrowRight,
  Eye,
  Check,
  Cpu,
  RefreshCw,
  FileCheck,
  Plus,
  Bell,
  SlidersHorizontal,
  IndianRupee,
  Boxes,
  MapPin,
  Calendar,
  AlertTriangle,
  FileSpreadsheet
} from 'lucide-react';

import { 
  COLLECTIONS_DATA, 
  COMPOSITE_INDEXES, 
  THREAT_AUDITS, 
  RAW_SECURITY_RULES, 
  CollectionSchema, 
  IndexConfig, 
  ThreatAuditCase 
} from './data';

import { AuthProvider, useAuth } from './context/AuthContext';
import { AuthScreen } from './components/AuthScreen';
import { StaffManagement } from './components/StaffManagement';
import { RoutingArchitecture } from './components/RoutingArchitecture';
import { MainAppShell } from './components/MainAppShell';
import { ReportsView } from './components/ReportsView';
import { SettingsView } from './components/SettingsView';
import { InventoryView } from './components/InventoryView';
import { OrdersView } from './components/OrdersView';
import { ManufacturingWorkflow } from './components/ManufacturingWorkflow';
import { CRMView } from './components/CRMView';
import { BillingPOSView } from './components/BillingPOSView';
import { PrintingSublimationView } from './components/PrintingSublimationView';
import { RepairServicingView } from './components/RepairServicingView';
import { NotificationsActivityView } from './components/NotificationsActivityView';
import { ProposalView } from './components/ProposalView';
import { GoogleDriveView } from './components/GoogleDriveView';

// --- Premium Generated Cricket Gloves Images ---
import tonProGloves from './assets/images/ton_pro_gloves_1779691687706.png';
import ssSkyGloves from './assets/images/ss_sky_gloves_1779691711487.png';

// --- Premium Cricket Gloves Stock Dataset ---
const PREMIUM_GLOVES_STOCK = [
  {
    id: "glove-1",
    name: "SS TON PRO 1.0",
    mrp: 5460,
    mrpDisplay: "₹5,460",
    image: tonProGloves,
    colorScheme: "Gold, Blue & Red Logo",
    description: "Syllable-pattern premium test grade glove with signature soft-fill block articulation. Features custom high-impact carbon protective cells and Pittards super-grip palm sheep skin.",
    rating: "98% Quality Index",
    stock: 24,
    status: "Fully Stocked",
    specs: {
      padding: "Dual density soft-fill v1.0",
      palm: "Pittards sheepskin grip",
      fingerProtection: "Reinforced carbon blocks",
      wrist: "Towel band with secure velcro"
    }
  },
  {
    id: "glove-2",
    name: "SS SKY 1.0",
    mrp: 4820,
    mrpDisplay: "₹4,820",
    image: ssSkyGloves,
    colorScheme: "Lime, Orange & White",
    description: "Vibrant high-contrast edition with custom joint mechanics, as played by Surya Kumar Yadav (SKY) under Sunridge. Built for explosive wrist mobility.",
    rating: "95% Quality Index",
    stock: 12,
    status: "Stressed Stock",
    specs: {
      padding: "High density foam block inserts",
      palm: "Aniline premium sheep leather",
      fingerProtection: "Tri-section joint segmentation",
      wrist: "Wide sweat absorbing towel band"
    }
  },
  {
    id: "glove-3",
    name: "SS TON RO - 45",
    mrp: 5000,
    mrpDisplay: "₹5,000",
    image: "https://images.unsplash.com/photo-1544033527-b192daee1f5b?w=600&auto=format&fit=crop&q=60",
    colorScheme: "Sleek Gray & White",
    description: "Premium test-grade gloves carrying slate-gray accents and multi-shield knuckle impact dispersion guards, designed for consistent high-velocity ball blocking.",
    rating: "96% Quality Index",
    stock: 18,
    status: "Fully Stocked",
    specs: {
      padding: "Triple-layer shield padding",
      palm: "English sheepskin touch-grip",
      fingerProtection: "Fibre-reinforced finger shields",
      wrist: "Elastic band with loop closure"
    }
  },
  {
    id: "glove-4",
    name: "TON PLAYER EDITION",
    mrp: 3740,
    mrpDisplay: "₹3,740",
    image: "https://images.unsplash.com/photo-1587280501635-68a0e82cd5ff?w=600&auto=format&fit=crop&q=60",
    colorScheme: "Traditional White & Blue",
    description: "Classic robust block-fill batting glove designed for supreme durability, heavy training schedules, continuous side-mesh ventilation, and high sweat tolerance.",
    rating: "92% Quality Index",
    stock: 8,
    status: "Reorder Triggered",
    specs: {
      padding: "Block fiber cushion layers",
      palm: "Full cowhide grip strength",
      fingerProtection: "Two-piece flexible thumbs",
      wrist: "Super soft custom sweat shield"
    }
  },
  {
    id: "glove-5",
    name: "TON SUPER TEST",
    mrp: 3720,
    mrpDisplay: "₹3,720",
    image: "https://images.unsplash.com/photo-1509198397868-475647b2a1e5?w=600&auto=format&fit=crop&q=60",
    colorScheme: "Gold Shield Trim",
    description: "Elite match gloves featuring premium textured graphite grip blocks and reinforced finger tips for peak defense and secure holding of bat handle during drives.",
    rating: "91% Quality Index",
    stock: 15,
    status: "Fully Stocked",
    specs: {
      padding: "Multi-layered dynamic foam",
      palm: "A-Grade calfskin softness",
      fingerProtection: "Thermally formed protection",
      wrist: "Contoured supportive sweatband"
    }
  },
  {
    id: "glove-6",
    name: "TON TEST",
    mrp: 3660,
    mrpDisplay: "₹3,660",
    image: "https://images.unsplash.com/photo-1530541930197-ff16ac917b0e?w=600&auto=format&fit=crop&q=60",
    colorScheme: "Classic Silver Trim",
    description: "Perfect entry-tier test glove prioritizing standard high-comfort, neat diagonal stitching, and simple robust safety on the outer cricket batting crease.",
    rating: "90% Quality Index",
    stock: 4,
    status: "Stressed Stock",
    specs: {
      padding: "Breathable air-mesh backup",
      palm: "Standard sheep grip skin",
      fingerProtection: "Contoured fiber-shield caps",
      wrist: "Secure touch fastener lock"
    }
  }
];


// --- Types for Core ERP State (imported from types/erp.ts) ---

export default function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}

function AppContent() {
  const { user, profile, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-neutral-950 flex flex-col items-center justify-center font-mono">
        <motion.div 
          animate={{ scale: [1, 1.1, 1], rotate: [0, 10, -10, 0] }}
          transition={{ repeat: Infinity, duration: 1.5 }}
          className="w-14 h-14 rounded-2xl bg-gradient-to-br from-amber-400 to-yellow-600 flex items-center justify-center text-neutral-950 shadow-lg shadow-amber-500/10"
        >
          <Trophy className="w-7 h-7 stroke-[2.5]" />
        </motion.div>
        <span className="text-[10px] text-neutral-500 mt-5 uppercase tracking-widest animate-pulse font-bold">
          Establishing Auth Tunnel...
        </span>
      </div>
    );
  }

  if (!user || !profile) {
    return <AuthScreen />;
  }

  return <MainERPApp />;
}

function MainERPApp() {
  const { profile, logout } = useAuth();
  
  const [activeTab, setActiveTab] = useState<ERPDashboardTab>('dashboard');
  const [branchScope, setBranchScope] = useState<ERPBranch>((profile?.branchId as ERPBranch) || 'Melbourne Closets');
  const [themeMode, setThemeMode] = useState<ERPThemeMode>('light');

  // --- Gotham/Bento Dashboard Mockup Specific States ---
  const [selectedGloveIdx, setSelectedGloveIdx] = useState<number>(0);
  const [activeCurrency, setActiveCurrency] = useState<ERPCurrency>('INR');
  const [isSimulatingBalance, setIsSimulatingBalance] = useState<boolean>(false);
  const [simulateProgress, setSimulateProgress] = useState<number>(0);
  const [simulateValue, setSimulateValue] = useState<string | null>(null);
  const [activeRouteStop, setActiveRouteStop] = useState<ERPRouteStop>(null);


  // --- Prepopulated ERP Interactive Local States ---
  const [orders, setOrders] = useState<ERPOrder[]>([
    {
      id: "ORD-2026-9501",
      customerId: "CUST-001",
      customerName: "Manipur Cricket Academy (Imphal)",
      itemSummary: "2x Customized Grade-1 Willow Bats",
      itemType: "bat",
      specs: {
        willowGrade: "Grade-1 English Willow",
        weight: "2lb 8oz",
        gripColor: "Metallic Gold",
        handleType: "Oval"
      },
      totalAmount: 900.00,
      paymentStatus: "partially_paid",
      status: "manufacturing",
      promisedDate: "2026-06-12",
      notes: "Custom mill specification: Press sweetspot deep. Heavy face-burnish requested.",
      createdAt: "2026-05-24"
    },
    {
      id: "ORD-2026-9502",
      customerId: "CUST-002",
      customerName: "Imphal Eastern Youth Sports Club",
      itemSummary: "18x Gold Sublimation Jersey Wear",
      itemType: "jersey",
      specs: {
        sublimationDesign: "Imphal Eastern Emerald & Gold custom stripe collection (v4)",
        jerseySize: "Mix (10x Large, 8x Medium)"
      },
      totalAmount: 1350.00,
      paymentStatus: "paid",
      status: "printing",
      promisedDate: "2026-06-15",
      notes: "PMS Gold crest sublimated, breathable micro-mesh backing.",
      createdAt: "2026-05-23"
    },
    {
      id: "ORD-2026-9503",
      customerId: "CUST-003",
      customerName: "Chungkham Singh (Refurb)",
      itemSummary: "1x Toe Guard Repair & Face Clean",
      itemType: "repairs",
      specs: {
        repairCategory: "Splint Crack Binding & Resleeve"
      },
      totalAmount: 120.00,
      paymentStatus: "unpaid",
      status: "ready",
      promisedDate: "2026-05-30",
      notes: "Toe edge split from yorker impact. Hand re-finish with anti-scuff coat.",
      createdAt: "2026-05-22"
    },
    {
      id: "ORD-2026-9504",
      customerId: "CUST-004",
      customerName: "Little Flower School Sports Club (Imphal)",
      itemSummary: "4x English Willow Bats & Matches Balls",
      itemType: "bat",
      specs: {
        willowGrade: "Grade-2 English Willow",
        weight: "2lb 9oz",
        gripColor: "Classic White",
        handleType: "Round"
      },
      totalAmount: 1680.00,
      paymentStatus: "unpaid",
      status: "pending",
      promisedDate: "2026-06-25",
      notes: "Pre-press billets. Hand-selected grain alignments.",
      createdAt: "2026-05-25"
    }
  ]);

  const [inventory, setInventory] = useState<ERPInventory[]>([
    { sku: "BAT-EW-G1", name: "Grade-1 Selected English Willow Billet", category: "bats", stock: 12, safetyLevel: 5, reorderPoint: 8, shelf: "A1-Row-3", price: 450.00, rawCost: 180.00 },
    { sku: "BAT-EW-G2", name: "Grade-2 English Willow Pre-pressed Cleaved Billet", category: "bats", stock: 4, safetyLevel: 5, reorderPoint: 7, shelf: "A1-Row-4", price: 320.00, rawCost: 120.00 }, // LOW
    { sku: "JER-SUB-GLD", name: "Premium Jersey Blank - Gold Edition", category: "apparel", stock: 95, safetyLevel: 20, reorderPoint: 40, shelf: "D3-Row-1", price: 75.00, rawCost: 18.00 },
    { sku: "BAL-LEW-RED", name: "Alum-Tanned 4-Piece Match Leather Ball", category: "balls", stock: 15, safetyLevel: 24, reorderPoint: 48, shelf: "B2-Row-7", price: 45.00, rawCost: 15.00 }, // LOW
    { sku: "PRO-PAD-WHT", name: "Axiom Lightweight Batting Pads (White)", category: "protective", stock: 19, safetyLevel: 6, reorderPoint: 12, shelf: "C1-Row-5", price: 160.00, rawCost: 55.00 }
  ]);

  const [jobs, setJobs] = useState<ERPJob[]>([
    { id: "JOB-MILL-8850", orderId: "ORD-2026-9501", customerName: "Manipur Cricket Academy (Imphal)", sku: "BAT-EW-G1", type: "mill", status: "pressing", priority: "high", notes: "Calibrate press weight to 2.8lb exactly. Soft bounce.", craftsman: "Vijay Merchant" },
    { id: "PRINT-SUB-0023", orderId: "ORD-2026-9502", customerName: "Imphal Eastern Youth Sports Club", sku: "JER-SUB-GLD", type: "print", status: "curing", priority: "medium", notes: "Color pantone check PMS-131C. Cure heat cycle 180s.", craftsman: "Sarah Printworks" },
    { id: "REP-WILLOW-0024", orderId: "ORD-2026-9503", customerName: "Chungkham Singh (Refurb)", sku: "REPAIR-SERVICE", type: "repair", status: "final-tuning", priority: "low", notes: "Sand down splintered grain edges block, replace grip with matching gold ring skin.", craftsman: "Vijay Merchant" }
  ]);

  const [customers, setCustomers] = useState<ERPCustomer[]>([
    { id: "CUST-001", name: "Manipur Cricket Academy (Imphal)", email: "contact@manipurcricketacademy.org.in", phone: "+91-385-2441011", affiliation: "Academy", activeOrders: 1, branch: "Melbourne Closets", address: "Khuman Lampak Sports Complex, Imphal East, Manipur 795001" },
    { id: "CUST-002", name: "Imphal Eastern Youth Sports Club", email: "info@imphaleasternclub.com", phone: "+91-385-2442221", affiliation: "Club Team", activeOrders: 1, branch: "Melbourne Closets", address: "Sajiwa Sports Arena, Imphal East, Manipur 795114" },
    { id: "CUST-003", name: "Chungkham Singh (Refurb)", email: "chungkham@manipurathletics.org.in", phone: "+91-385-9988111", affiliation: "Individual Athlete", activeOrders: 1, branch: "London Closets", address: "Singjamei Thokchom Leikai, Imphal West, Manipur 795008" },
    { id: "CUST-004", name: "Little Flower School Sports Club (Imphal)", email: "sports@littleflowerschoolimphal.edu.in", phone: "+91-385-2440344", affiliation: "Club Team", activeOrders: 1, branch: "Melbourne Closets", address: "Sangaiprou, Airport Road, Imphal, Manipur 795001" }
  ]);

  const [invoices, setInvoices] = useState<ERPInvoice[]>([
    { id: "INV-2026-X11", orderId: "ORD-2026-9501", customerName: "Manipur Cricket Academy (Imphal)", dueDate: "2026-06-12", amount: 900.00, paid: 450.00, status: "partially_paid" },
    { id: "INV-2026-X12", orderId: "ORD-2026-9502", customerName: "Imphal Eastern Youth Sports Club", dueDate: "2026-06-15", amount: 1350.00, paid: 1350.00, status: "paid" },
    { id: "INV-2026-X13", orderId: "ORD-2026-9503", customerName: "Chungkham Singh (Refurb)", dueDate: "2026-05-30", amount: 120.00, paid: 0.00, status: "unpaid" },
    { id: "INV-2026-X14", orderId: "ORD-2026-9504", customerName: "Little Flower School Sports Club (Imphal)", dueDate: "2026-06-25", amount: 1680.00, paid: 0.00, status: "unpaid" }
  ]);

  const [transactions, setTransactions] = useState<ERPTransaction[]>([
    { id: "TXN-9091", invoiceId: "INV-2026-X11", amount: 450.00, type: "incoming_payment", method: "bank_transfer", date: "2026-05-24", reference: "BS-942-IMP_MCA" },
    { id: "TXN-9092", invoiceId: "INV-2026-X12", amount: 1350.00, type: "incoming_payment", method: "card", date: "2026-05-23", reference: "STRIPE_CH_9003" }
  ]);

  const [notifications, setNotifications] = useState<ERPNotification[]>([
    { id: "NOT-01", title: "Low Stock Trigger: English Willow", message: "Grade-2 English Willow cleaves (SKU: BAT-EW-G2) fell below Safety Guard level 5.", type: "low_stock", time: "25 mins ago", read: false },
    { id: "NOT-02", title: "Alum Match Balls Replenishment Needed", message: "Alum 4-Piece Balls (SKU: BAL-LEW-RED) inventory is holding 15 vs safety minimum of 24.", type: "low_stock", time: "2 hours ago", read: false },
    { id: "NOT-03", title: "Job Printing Sublimation In Curing", message: "Sarah Printworks registered PMS color curing session for Imphal Eastern design proofs.", type: "job_milestone", time: "4 hours ago", read: true }
  ]);

  // --- Client Mock Event Streams for PWA Sync telemetry panel ---
  const [telemetryLogs, setTelemetryLogs] = useState<{ id: string; event: string; status: 'info' | 'syncing' | 'synced'; timestamp: string }[]>([    { id: "TLM-1", event: "Offline buffer loaded. Local IndexedDB persistent store active.", status: "info", timestamp: "05:03:12" },
    { id: "TLM-2", event: "PWA synchronization connection established over Cloud Run tunnel secure socket.", status: "synced", timestamp: "05:03:15" }
  ]);

  // Connect root ERP React state setters directly to the central coordination service
  useEffect(() => {
    erpIntegrationService.registerStateSyncSetters({
      setOrders,
      setInventory,
      setJobs,
      setCustomers,
      setNotifications,
      setTelemetryLogs
    });
  }, [orders, inventory, jobs, customers, notifications, telemetryLogs]);

  // Synchronically hydrate ERP collections from Live Azure SQL databases via server proxies
  useEffect(() => {
    const hydrateGlobalERPState = async () => {
      try {
        logTelemetry("Hydrating central ERP registers from Azure SQL database...", "syncing");
        
        // 1. Fetch Inventory
        const resInv = await fetch('/api/inventory');
        if (resInv.ok) {
          const invList = await resInv.json();
          if (invList && invList.length > 0) {
            setInventory(invList);
          }
        }

        // 2. Fetch Customers
        const resCust = await fetch('/api/customers');
        if (resCust.ok) {
          const custList = await resCust.json();
          if (custList && custList.length > 0) {
            setCustomers(custList);
          }
        }

        // 3. Fetch Orders
        const resOrd = await fetch('/api/orders');
        if (resOrd.ok) {
          const ordList = await resOrd.json();
          if (ordList && ordList.length > 0) {
            setOrders(ordList);
          }
        }

        logTelemetry("In-store ERP state hydrated with live cloud registers.", "synced");
      } catch (err) {
        console.error("Hydration error:", err);
        logTelemetry("Azure state hydration skipped, maintaining stored local databases.", "info");
      }
    };

    hydrateGlobalERPState();
  }, [branchScope]);

  // --- Interactive Modals Toggles ---
  const [isNewOrderModalOpen, setIsNewOrderModalOpen] = useState(false);
  const [isInvoicePaymentModalOpen, setIsInvoicePaymentModalOpen] = useState(false);
  const [selectedOrderDetails, setSelectedOrderDetails] = useState<ERPOrder | null>(null);

  // Schema Tab Specific selections
  const [selectedSchemaColId, setSelectedSchemaColId] = useState('users');
  const [selectedThreatAuditId, setSelectedThreatAuditId] = useState('TA-01');

  // Interactive Form States
  const [newOrderForm, setNewOrderForm] = useState({
    customerId: "CUST-001",
    itemType: "bat" as 'bat' | 'jersey',
    willowGrade: "Grade-1 English Willow" as 'Grade-1 English Willow' | 'Grade-2 English Willow',
    weight: "2lb 8oz",
    gripColor: "Pitch Gold",
    handleType: "Round" as 'Round' | 'Oval',
    sublimationDesign: "Custom Spine Stripe",
    notes: "",
    customQty: 1
  });

  const [paymentForm, setPaymentForm] = useState({
    invoiceId: "INV-2026-X13",
    payAmount: 120,
    paymentMethod: "bank_transfer" as 'bank_transfer' | 'cash' | 'card',
    reference: ""
  });

  // Automatically check/validate inventory changes to trigger notifications
  useEffect(() => {
    // Audit current stock and update notifications
    const lowStockItems = inventory.filter(i => i.stock < i.safetyLevel);
    const updatedNotifications = [...notifications];
    
    lowStockItems.forEach(item => {
      const exists = notifications.some(n => n.type === 'low_stock' && n.message.includes(item.sku));
      if (!exists) {
        updatedNotifications.unshift({
          id: `NOT-AUTO-${item.sku}-${Date.now()}`,
          title: `Low Stock Auto-Alarm: ${item.sku}`,
          message: `${item.name} dropped to ${item.stock} in stock. Safety target level is ${item.safetyLevel}.`,
          type: "low_stock",
          time: "Just now",
          read: false
        });
      }
    });
  }, [inventory]);

  // Add standard telemetry notification event
  const logTelemetry = (action: string, status: 'info' | 'syncing' | 'synced') => {
    const now = new Date();
    const timeStr = now.toTimeString().split(' ')[0];
    setTelemetryLogs(prev => [
      { id: `TLM-${Date.now()}`, event: action, status, timestamp: timeStr },
      ...prev.slice(0, 12)
    ]);
  };

  // Run Order creation and corresponding state pipelines
  const submitNewOrder = (e: React.FormEvent) => {
    e.preventDefault();
    const customer = customers.find(c => c.id === newOrderForm.customerId) || customers[0];
    const generatedId = `ORD-2026-${Math.floor(1000 + Math.random() * 9000)}`;
    const priceMultiplier = newOrderForm.itemType === 'bat' ? 450 : 75;
    const finalPrice = priceMultiplier * newOrderForm.customQty;

    // 1. Create Order
    const createdOrder: ERPOrder = {
      id: generatedId,
      customerId: customer.id,
      customerName: customer.name,
      itemSummary: `${newOrderForm.customQty}x Custom ${newOrderForm.itemType === 'bat' ? 'English Willow Bat' : 'Sublimated Jersey'}`,
      itemType: newOrderForm.itemType as any,
      specs: newOrderForm.itemType === 'bat' ? {
        willowGrade: newOrderForm.willowGrade,
        weight: newOrderForm.weight,
        gripColor: newOrderForm.gripColor,
        handleType: newOrderForm.handleType
      } : {
        sublimationDesign: newOrderForm.sublimationDesign,
        jerseySize: "Mix Assorted Sizes"
      },
      totalAmount: finalPrice,
      paymentStatus: "unpaid",
      status: "pending",
      promisedDate: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 15 Days Promised date
      notes: newOrderForm.notes || "Custom spec ordered and registered",
      createdAt: new Date().toISOString().split('T')[0]
    };

    // 2. Reduce corresponding Inventory Stock
    const targetSku = newOrderForm.itemType === 'bat' 
      ? (newOrderForm.willowGrade === 'Grade-1 English Willow' ? "BAT-EW-G1" : "BAT-EW-G2")
      : "JER-SUB-GLD";
    
    setInventory(prev => prev.map(item => {
      if (item.sku === targetSku) {
        return { ...item, stock: Math.max(0, item.stock - newOrderForm.customQty) };
      }
      return item;
    }));

    // 3. Create active Manufacturing/Sublimation Job
    const generatedJobId = `${newOrderForm.itemType === 'bat' ? 'JOB-MILL' : 'PRINT-SUB'}-${Math.floor(1000 + Math.random() * 9000)}`;
    const createdJob: ERPJob = {
      id: generatedJobId,
      orderId: generatedId,
      customerName: customer.name,
      sku: targetSku,
      type: newOrderForm.itemType === 'bat' ? 'mill' : 'print',
      status: "queued",
      priority: "high",
      notes: newOrderForm.notes || "Spec verified against billet reserves.",
      craftsman: newOrderForm.itemType === 'bat' ? "Vijay Merchant" : "Sarah Printworks"
    };

    // 4. Register Invoice
    const generatedInvId = `INV-2026-X${Math.floor(15 + Math.random() * 85)}`;
    const createdInvoice: ERPInvoice = {
      id: generatedInvId,
      orderId: generatedId,
      customerName: customer.name,
      dueDate: createdOrder.promisedDate,
      amount: finalPrice,
      paid: 0,
      status: "unpaid"
    };

    // Commit All Atoms to React state as an Batch Sync transaction operation
    setOrders(prev => [createdOrder, ...prev]);
    setJobs(prev => [createdJob, ...prev]);
    setInvoices(prev => [createdInvoice, ...prev]);

    // Push client logs
    logTelemetry(`PWA State Committed: [${generatedId}] stored in queue.`, 'syncing');
    
    setTimeout(() => {
      logTelemetry(`Atomic Transaction for ${generatedId} written to Google Firestore database context. Rules passed.`, 'synced');
    }, 1200);

    // Track Notification
    setNotifications(prev => [
      {
        id: `NOT-NEW-${generatedId}`,
        title: "New Custom Order Registered",
        message: `${customer.name} triggered active workshop ticket. Invoice generated atomically.`,
        type: "new_order",
        time: "Just now",
        read: false
      },
      ...prev
    ]);

    setIsNewOrderModalOpen(false);
  };

  // Run stock restock button
  const handleQuickRestock = (sku: string) => {
    setInventory(prev => prev.map(item => {
      if (item.sku === sku) {
        logTelemetry(`Syncing Stock adjustment write for SKU: ${sku}: Add +10 billets.`, 'syncing');
        setTimeout(() => {
          logTelemetry(`Firestore document '/inventory/${sku}' successfully updated. Safety warnings cleared.`, 'synced');
        }, 800);
        return { ...item, stock: item.stock + 10 };
      }
      return item;
    }));

    // Dismiss notifications related to this SKU
    setNotifications(prev => prev.map(n => {
      if (n.message.includes(sku)) {
        return { ...n, read: true };
      }
      return n;
    }));
  };

  // Progress Craftsman Workshop step status
  const progressJobStatus = (jobId: string) => {
    const job = jobs.find(j => j.id === jobId);
    if (!job) return;

    let nextStatus: ERPJob['status'] = 'complete';
    if (job.type === 'mill') {
      if (job.status === 'queued') nextStatus = 'splitting';
      else if (job.status === 'splitting') nextStatus = 'shaping';
      else if (job.status === 'shaping') nextStatus = 'pressing';
      else if (job.status === 'pressing') nextStatus = 'quality-check';
      else if (job.status === 'quality-check') nextStatus = 'complete';
    } else if (job.type === 'print') {
      if (job.status === 'queued') nextStatus = 'curing';
      else if (job.status === 'curing') nextStatus = 'quality-check';
      else if (job.status === 'quality-check') nextStatus = 'complete';
    } else {
      if (job.status === 'queued') nextStatus = 'final-tuning';
      else if (job.status === 'final-tuning') nextStatus = 'quality-check';
      else if (job.status === 'quality-check') nextStatus = 'complete';
    }

    // Set updated job
    setJobs(prev => prev.map(j => {
      if (j.id === jobId) {
        const qualityVal = nextStatus === 'complete' ? parseFloat((90 + Math.random() * 9).toFixed(1)) : undefined;
        return { ...j, status: nextStatus, qualityScore: qualityVal };
      }
      return j;
    }));

    // If step went to quality check or complete, sync order status too!
    if (nextStatus === 'complete') {
      setOrders(prev => prev.map(o => {
        if (o.id === job.orderId) {
          return { ...o, status: 'ready' };
        }
        return o;
      }));
      setNotifications(prev => [
        {
          id: `NOT-JOB-${jobId}`,
          title: "Craftsman Job Complete",
          message: `Job ${jobId} finished QC. Bat was assigned grade standard. Order shifted to Ready.`,
          type: "job_milestone",
          time: "Just now",
          read: false
        },
        ...prev
      ]);
      logTelemetry(`Craftsman finished carving specifications. Bat certified as complete. Order: ${job.orderId}`, 'synced');
    } else {
      logTelemetry(`Craftsman transitioned Job [${jobId}] step milestone to ${nextStatus.toUpperCase()}.`, 'synced');
    }
  };

  // Run payment and invoice audit ledger alignment
  const receiveInvoicePayment = (e: React.FormEvent) => {
    e.preventDefault();
    const invoice = invoices.find(i => i.id === paymentForm.invoiceId);
    if (!invoice) return;

    const totalPaid = Math.min(invoice.amount, invoice.paid + paymentForm.payAmount);
    const updatedStatus = totalPaid === invoice.amount ? 'paid' : 'partially_paid';

    setInvoices(prev => prev.map(i => {
      if (i.id === paymentForm.invoiceId) {
        return { ...i, paid: totalPaid, status: updatedStatus };
      }
      return i;
    }));

    // Update orders payment status matches too
    setOrders(prev => prev.map(o => {
      if (o.id === invoice.orderId) {
        return { ...o, paymentStatus: updatedStatus };
      }
      return o;
    }));

    // Append double entry Transaction
    const txnId = `TXN-${Math.floor(1000 + Math.random() * 9000)}`;
    const createdTxn: ERPTransaction = {
      id: txnId,
      invoiceId: invoice.id,
      amount: paymentForm.payAmount,
      type: "incoming_payment",
      method: paymentForm.paymentMethod,
      date: new Date().toISOString().split('T')[0],
      reference: paymentForm.reference || `BANK_TRNF_${txnId}`
    };

    setTransactions(prev => [createdTxn, ...prev]);

    // Log telemetry
    logTelemetry(`Invoice Payment logged for ${invoice.id}: Received ₹${paymentForm.payAmount}. Status: ${updatedStatus.toUpperCase()}`, 'synced');
    
    setNotifications(prev => [
      {
        id: `NOT-PAY-${txnId}`,
        title: "Cash Balance Ledger Credit",
        message: `Registered ₹${paymentForm.payAmount} incoming deposit to account invoice ${invoice.id}.`,
        type: "payment_alert",
        time: "Just now",
        read: false
      },
      ...prev
    ]);

    setIsInvoicePaymentModalOpen(false);
  };

  return (
    <div className={themeMode === 'light' ? 'theme-light' : ''}>
      <MainAppShell
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        branchScope={branchScope}
        setBranchScope={setBranchScope}
        profile={profile}
        logout={logout}
        notifications={notifications}
        setNotifications={setNotifications}
        orders={orders}
        inventory={inventory}
        customers={customers}
        themeMode={themeMode}
        setThemeMode={setThemeMode}
      >
        <AnimatePresence mode="wait">
            
            {/* 1. DASHBOARD VIEW COCKPIT */}
            {activeTab === 'dashboard' && (
              <motion.div 
                key="tab-dashboard" 
                initial={{ opacity: 0, y: 15 }} 
                animate={{ opacity: 1, y: 0 }} 
                exit={{ opacity: 0, y: -15 }}
                className="space-y-8"
              >
                {/* Hero Showcase Widget */}
                <div className="relative bg-gradient-to-br from-neutral-900 via-neutral-950 to-neutral-900 rounded-2xl p-6 lg:p-8 border border-neutral-800 overflow-hidden shadow-2xl">
                  {/* Decorative mesh backings */}
                  <div className="absolute right-0 top-0 w-80 h-80 bg-gradient-to-br from-amber-500/10 to-transparent rounded-full blur-3xl pointer-events-none"></div>
                  
                  <div className="relative z-10 max-w-4xl space-y-3">
                    <span className="text-[10px] font-mono tracking-widest text-[#E5B84B] font-black uppercase bg-[#E5B84B]/10 px-2.5 py-1 rounded-full border border-[#E5B84B]/20">
                      ⚡ Dynamic Operations Center
                    </span>
                    <h2 className="text-2xl lg:text-3xl font-black text-white tracking-tight leading-none uppercase">
                      CRICKET CLOSET WORKSHOP OVERFLOW
                    </h2>
                    <p className="text-neutral-400 text-xs lg:text-sm font-mono leading-relaxed max-w-3xl">
                      Real-time ledger and custom fabrication coordinator. Designed for athletic clubs requiring custom-curated English Willow density grain press, precise dynamic jersey sublimation, and instant offline-first data persistence.
                    </p>
                  </div>
                </div>

                {/* 4 Core Balanced KPI Cards */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4" id="kpi-matrix">
                  
                  {/* Revenue Invoice clearing balance */}
                  <div className="bg-neutral-900 p-5 rounded-xl border border-neutral-800 flex items-center justify-between select-none">
                    <div className="space-y-1">
                      <span className="text-[10px] font-mono font-bold text-neutral-500 tracking-wider uppercase">LEDGER CREDITS (YTD)</span>
                      <h3 className="text-2xl font-black text-white font-mono">₹10,480.00</h3>
                      <div className="flex items-center gap-1 text-[10px] font-mono text-emerald-400">
                        <TrendingUp className="w-3 h-3" />
                        <span>+₹1,800.00 today (100% verified)</span>
                      </div>
                    </div>
                    <div className="w-10 h-10 rounded-lg bg-emerald-500/10 flex items-center justify-center text-emerald-400 border border-emerald-500/20 shrink-0">
                      <IndianRupee className="w-5 h-5 focus:outline-none" />
                    </div>
                  </div>

                  {/* Orders Queue Counter */}
                  <div className="bg-neutral-900 p-5 rounded-xl border border-neutral-800 flex items-center justify-between select-none">
                    <div className="space-y-1">
                      <span className="text-[10px] font-mono font-bold text-neutral-500 tracking-wider uppercase">ACTIVE ORDERS BOOKED</span>
                      <h3 className="text-2xl font-black text-white font-mono">{orders.length} Contracts</h3>
                      <div className="flex items-center gap-1 text-[10px] font-mono text-amber-500">
                        <ShoppingCart className="w-3 h-3" />
                        <span>In manufacturing: {orders.filter(o => o.status === 'manufacturing').length}</span>
                      </div>
                    </div>
                    <div className="w-10 h-10 rounded-lg bg-amber-500/10 flex items-center justify-center text-amber-500 border border-amber-500/20 shrink-0">
                      <ShoppingCart className="w-5 h-5" />
                    </div>
                  </div>

                  {/* Splicing Tasks in progress */}
                  <div className="bg-neutral-900 p-5 rounded-xl border border-neutral-800 flex items-center justify-between select-none">
                    <div className="space-y-1">
                      <span className="text-[10px] font-mono font-bold text-neutral-500 tracking-wider uppercase">FABRICATION BACKLOG</span>
                      <h3 className="text-2xl font-black text-white font-mono">{jobs.filter(j=>j.status !== 'complete').length} Open Jobs</h3>
                      <div className="flex items-center gap-1 text-[10px] font-mono text-neutral-400">
                        <span>Quality target: min 95.0% grade</span>
                      </div>
                    </div>
                    <div className="w-10 h-10 rounded-lg bg-neutral-800 flex items-center justify-center text-neutral-400 border border-neutral-700 shrink-0">
                      <Hammer className="w-5 h-5" />
                    </div>
                  </div>

                  {/* Physical Inventory Slices stock alerts */}
                  <div className="bg-neutral-900 p-5 rounded-xl border border-[#9d3636] flex items-center justify-between select-none">
                    <div className="space-y-1">
                      <span className="text-[10px] font-mono font-bold text-red-500 tracking-wider uppercase">LOW STOCK WARNING</span>
                      <h3 className="text-2xl font-black text-red-400 font-mono">
                        {inventory.filter(i => i.stock < i.safetyLevel).length} SKU Alerts
                      </h3>
                      <div className="text-[10px] font-mono text-red-500/80">
                        <span>Willow / Leather Balls depletion</span>
                      </div>
                    </div>
                    <div className="w-10 h-10 rounded-lg bg-red-950/40 flex items-center justify-center text-red-400 border border-red-800/40 shrink-0">
                      <AlertTriangle className="w-5 h-5" />
                    </div>
                  </div>

                </div>

                {/* Left/Right Operations grid layout (Live sync loops + Low inventory alerts) */}
                <div className="grid grid-cols-1 xl:grid-cols-12 gap-6" id="dashboard-mesh-dashboard">
                  
                  {/* Left Column (8 units): Telemetry + stock alarms quick control */}
                  <div className="xl:col-span-7 space-y-6">
                    
                    {/* Interactive Custom SVG Orders spark graph */}
                    <div className="bg-neutral-900 border border-neutral-800 p-5 rounded-xl space-y-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <h4 className="text-xs font-bold font-mono text-white tracking-widest uppercase flex items-center gap-1.5">
                            <TrendingUp className="w-4 h-4 text-amber-500" />
                            <span>Weekly Order Valuation Matrix</span>
                          </h4>
                          <p className="text-[11px] text-neutral-400 font-mono mt-0.5">Estimated gross ledger credits per fiscal week</p>
                        </div>
                        <span className="text-[10px] font-mono bg-neutral-950 border border-neutral-800 px-2 py-1 rounded text-amber-400 font-bold">14 Collections</span>
                      </div>

                      {/* Spark graph SVG representing dynamic cricket order levels */}
                      <div className="bg-neutral-950 rounded-xl p-4 border border-neutral-800 flex justify-center items-center">
                        <svg className="w-full h-40" viewBox="0 0 500 120" id="svg-valuation-spark">
                          <defs>
                            <linearGradient id="gold-grad" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="0%" stopColor="#E5B84B" stopOpacity="0.3" />
                              <stop offset="100%" stopColor="#E5B84B" stopOpacity="0.0" />
                            </linearGradient>
                          </defs>
                          {/* Grid references */}
                          <line x1="0" y1="20" x2="500" y2="20" stroke="#1c1917" strokeWidth="1" strokeDasharray="3" />
                          <line x1="0" y1="60" x2="500" y2="60" stroke="#1c1917" strokeWidth="1" strokeDasharray="3" />
                          <line x1="0" y1="100" x2="500" y2="100" stroke="#1c1917" strokeWidth="1" strokeDasharray="3" />

                          {/* Poly Fill */}
                          <polygon 
                            points="10,105 100,85 180,95 240,40 330,65 420,30 490,45 490,110 10,110" 
                            fill="url(#gold-grad)" 
                          />

                          {/* Sparkline path */}
                          <path 
                            d="M 10 105 L 100 85 L 180 95 L 240 40 L 330 65 L 420 30 L 490 45" 
                            fill="none" 
                            stroke="#E5B84B" 
                            strokeWidth="3.5" 
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          />

                          {/* Knuckles */}
                          <circle cx="240" cy="40" r="5" fill="#ffffff" stroke="#E5B84B" strokeWidth="2" />
                          <circle cx="420" cy="30" r="5" fill="#ffffff" stroke="#E5B84B" strokeWidth="2" />
                          
                          {/* Tooltip logs */}
                          <text x="245" y="32" fill="#E5B84B" fontSize="9" fontFamily="monospace" fontWeight="bold">ORD-9502: ₹1,350</text>
                          <text x="400" y="20" fill="#E5B84B" fontSize="9" fontFamily="monospace" fontWeight="bold">NEW REVENUE PEAK</text>
                        </svg>
                      </div>
                    </div>

                    {/* Low Stock alarms direct control desk */}
                    <div className="bg-neutral-900 border border-neutral-800 p-5 rounded-xl space-y-4">
                      <div>
                        <h4 className="text-xs font-bold font-mono text-white tracking-widest uppercase flex items-center gap-1.5">
                          <SlidersHorizontal className="w-4 h-4 text-red-500" />
                          <span>Safety Margins Replenishment Desk</span>
                        </h4>
                        <p className="text-[11px] text-neutral-400 font-mono mt-0.5">Immediate stock injection for falling inventory blocks</p>
                      </div>

                      <div className="space-y-2.5">
                        {inventory.map(item => {
                          const isLow = item.stock < item.safetyLevel;
                          return (
                            <div key={item.sku} className={`p-3 rounded-lg border flex flex-col md:flex-row md:items-center justify-between gap-3 text-xs font-mono transition-all ${isLow ? 'bg-red-950/20 border-red-900/40' : 'bg-neutral-950 border-neutral-800'}`}>
                              <div className="space-y-1">
                                <div className="flex items-center gap-2">
                                  <span className="font-bold text-white uppercase">{item.sku}</span>
                                  <span className="text-neutral-400 text-[11px]">• {item.name}</span>
                                </div>
                                <div className="flex items-center gap-3 text-[10px] text-neutral-400">
                                  <span>Warehouse Area: <strong className="text-white">{item.shelf}</strong></span>
                                  <span>Safety Level Check: <strong className="text-neutral-200">{item.safetyLevel}</strong></span>
                                  <span>Current Status: <strong className={isLow ? "text-red-400 font-bold animate-pulse" : "text-emerald-400"}>{isLow ? "STRESSED DEPL" : "SECURE"}</strong></span>
                                </div>
                              </div>

                              <div className="flex items-center gap-3">
                                <div className="text-right">
                                  <span className="text-[10px] text-neutral-500 block">CURRENT DEPOT STOCK</span>
                                  <span className={`text-sm font-black font-mono ${isLow ? "text-red-400 scale-105" : "text-neutral-100"}`}>{item.stock} Billets</span>
                                </div>
                                <button 
                                  onClick={() => handleQuickRestock(item.sku)}
                                  className={`px-3 py-1.5 rounded text-[10px] font-bold tracking-wider uppercase transition-all flex items-center gap-1 shrink-0 ${isLow ? 'bg-red-500 hover:bg-red-400 text-neutral-950' : 'bg-neutral-800 hover:bg-neutral-700 text-white'}`}
                                >
                                  <RefreshCw className="w-3 h-3" />
                                  <span>Sync Restock +10</span>
                                </button>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>

                  </div>

                  {/* Right Column (5 units): Real-time secure synchronous telemetry logs */}
                  <div className="xl:col-span-5 space-y-6">
                    
                    {/* Alarms loop notifications */}
                    <div className="bg-neutral-900 border border-neutral-800 p-5 rounded-xl space-y-4">
                      <div>
                        <h4 className="text-xs font-bold font-mono text-white tracking-widest uppercase flex items-center gap-1.5">
                          <Bell className="w-4 h-4 text-amber-500" />
                          <span>Active Warehouse Dispatch Notifications</span>
                        </h4>
                        <p className="text-[11px] text-neutral-400 font-mono mt-0.5">Real-time alerts triggered by PWA offline caches</p>
                      </div>

                      <div className="space-y-2 max-h-56 overflow-y-auto">
                        {notifications.map(n => (
                          <div 
                            key={n.id} 
                            onClick={() => {
                              // Mark as read
                              setNotifications(prev => prev.map(item => item.id === n.id ? { ...item, read: true } : item));
                            }}
                            className={`p-3 rounded-xl border flex gap-3 text-xs font-mono transition-all cursor-pointer ${n.read ? 'bg-neutral-950/30 border-neutral-800 text-neutral-400 scale-98' : 'bg-neutral-950 border-neutral-850 text-neutral-100 hover:border-neutral-750'}`}
                          >
                            <div className="pt-0.5">
                              {n.type === 'low_stock' ? (
                                <span className="w-2.5 h-2.5 rounded-full bg-red-500 block"></span>
                              ) : n.type === 'new_order' ? (
                                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 block"></span>
                              ) : n.type === 'payment_alert' ? (
                                <span className="w-2.5 h-2.5 rounded-full bg-amber-400 block"></span>
                              ) : (
                                <span className="w-2.5 h-2.5 rounded-full bg-blue-400 block"></span>
                              )}
                            </div>
                            <div className="flex-1 space-y-1">
                              <div className="flex items-center justify-between">
                                <span className="font-bold text-white text-[11px]">{n.title}</span>
                                <span className="text-[9px] text-neutral-500">{n.time}</span>
                              </div>
                              <p className="text-[10px] text-neutral-400 leading-relaxed font-sans">{n.message}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Operational Telemetry Event Feed */}
                    <div className="bg-neutral-900 border border-neutral-800 p-5 rounded-xl space-y-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <h4 className="text-xs font-bold font-mono text-white tracking-widest uppercase flex items-center gap-1.5">
                            <Cpu className="w-4 h-4 text-emerald-400" />
                            <span>PWA Socket Synchronization Feed</span>
                          </h4>
                          <p className="text-[11px] text-neutral-400 font-mono mt-0.5">Server telemetry verified using Firebase rules asserts</p>
                        </div>
                        <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping"></span>
                      </div>

                      <div className="bg-neutral-950 rounded-xl p-4 border border-neutral-800 space-y-2.5 max-h-60 overflow-y-auto">
                        {telemetryLogs.map(l => (
                          <div key={l.id} className="text-[10px] font-mono flex items-start gap-2.5 leading-relaxed">
                            <span className="text-neutral-500 shrink-0">{l.timestamp}</span>
                            <div className="flex-1">
                              <span className={`px-1.5 py-0.5 rounded text-[8px] font-bold mr-1.5 uppercase tracking-wider ${l.status === 'synced' ? 'bg-emerald-950 text-emerald-400 border border-emerald-900' : l.status === 'syncing' ? 'bg-amber-950 text-amber-400 border border-amber-900' : 'bg-neutral-900 text-neutral-400 border border-neutral-800'}`}>
                                {l.status}
                              </span>
                              <span className="text-neutral-300 font-sans">{l.event}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                  </div>

                </div>

              </motion.div>
            )}

            {/* 2. SALES ORDERS LEDGER */}
            {activeTab === 'orders' && (
              <motion.div 
                key="tab-orders" 
                initial={{ opacity: 0, scale: 0.98 }} 
                animate={{ opacity: 1, scale: 1 }} 
                exit={{ opacity: 0, scale: 0.98 }}
              >
                <OrdersView branchScope={branchScope} profile={profile} />
              </motion.div>
            )}

            {/* 3. INVENTORY STOCKROOM */}
            {activeTab === 'inventory' && (
              <motion.div 
                key="tab-inventory" 
                initial={{ opacity: 0, y: 15 }} 
                animate={{ opacity: 1, y: 0 }} 
                exit={{ opacity: 0, y: -15 }}
                className="space-y-6"
              >
                <InventoryView branchScope={branchScope} profile={profile} />
              </motion.div>
            )}

            {/* 4. WORKSHOPS & SPLICING */}
            {activeTab === 'manufacturing' && (
              <motion.div 
                key="tab-manufacturing" 
                initial={{ opacity: 0, y: 15 }} 
                animate={{ opacity: 1, y: 0 }} 
                exit={{ opacity: 0, y: -15 }}
                className="space-y-6"
              >
                <ManufacturingWorkflow branchScope={branchScope} profile={profile} />
              </motion.div>
            )}

            {/* 4.5. APPAREL PRINTING & SUBLIMATION WORKFLOW */}
            {activeTab === 'printing' && (
              <motion.div 
                key="tab-printing" 
                initial={{ opacity: 0, y: 15 }} 
                animate={{ opacity: 1, y: 0 }} 
                exit={{ opacity: 0, y: -15 }}
                className="space-y-6"
              >
                <PrintingSublimationView branchScope={branchScope} profile={profile} />
              </motion.div>
            )}

            {/* 4.6. REPAIR & SERVICING WORKFLOW */}
            {activeTab === 'servicing' && (
              <motion.div 
                key="tab-servicing" 
                initial={{ opacity: 0, y: 15 }} 
                animate={{ opacity: 1, y: 0 }} 
                exit={{ opacity: 0, y: -15 }}
                className="space-y-6"
              >
                <RepairServicingView branchScope={branchScope} profile={profile} />
              </motion.div>
            )}

            {/* 4.7. GOOGLE DRIVE CLOUD ASSET VAULT */}
            {activeTab === 'drive' && (
              <motion.div 
                key="tab-drive" 
                initial={{ opacity: 0, y: 15 }} 
                animate={{ opacity: 1, y: 0 }} 
                exit={{ opacity: 0, y: -15 }}
                className="space-y-6"
              >
                <GoogleDriveView />
              </motion.div>
            )}

            {/* 5. CRM CUSTOMERS */}
            {activeTab === 'customers' && (
              <motion.div 
                key="tab-customers" 
                initial={{ opacity: 0, y: 15 }} 
                animate={{ opacity: 1, y: 0 }} 
                exit={{ opacity: 0, y: -15 }}
                className="space-y-6"
              >
                <CRMView 
                  branchScope={branchScope} 
                  profile={profile} 
                  customers={customers} 
                  setCustomers={setCustomers} 
                />
              </motion.div>
            )}

            {/* 6. BOOKKEEPING FINANCE LIST */}
            {activeTab === 'billing' && (
              <motion.div 
                key="tab-billing" 
                initial={{ opacity: 0, y: 15 }} 
                animate={{ opacity: 1, y: 0 }} 
                exit={{ opacity: 0, y: -15 }}
                className="space-y-4"
              >
                <BillingPOSView 
                  branchScope={branchScope} 
                  profile={profile} 
                />
              </motion.div>
            )}

            {/* 6.1. NOTIFICATIONS & SECURITY ACTIVITY SENTRY MONITOR */}
            {activeTab === 'notifications' && (
              <motion.div 
                key="tab-notifications" 
                initial={{ opacity: 0, y: 15 }} 
                animate={{ opacity: 1, y: 0 }} 
                exit={{ opacity: 0, y: -15 }}
                className="space-y-6"
              >
                <NotificationsActivityView 
                  branchScope={branchScope} 
                  profile={profile} 
                />
              </motion.div>
            )}

            {/* 7. ARCHITECTURE VIEW & FIREBASE SECURITY SCHEMAS */}
            {activeTab === 'architecture' && (
              <motion.div 
                key="tab-architecture" 
                initial={{ opacity: 0, y: 15 }} 
                animate={{ opacity: 1, y: 0 }} 
                exit={{ opacity: 0, y: -15 }}
                className="space-y-6"
              >
                {/* Advanced specifications warning */}
                <div className="bg-neutral-900 p-6 rounded-2xl border border-neutral-800 space-y-2 relative overflow-hidden">
                  <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/5 rounded-full blur-3xl pointer-events-none"></div>
                  <h3 className="text-base font-bold text-white tracking-widest uppercase font-mono flex items-center gap-2">
                    <Database className="w-5 h-5 text-emerald-400 animate-pulse" />
                    <span>Database Architecture & Firebase Rules Blueprint</span>
                  </h3>
                  <p className="text-xs text-neutral-400 font-mono leading-relaxed">
                    Designed explicitly following Zero-Trust architecture specifications. This technical blueprint maps collections schema structures, composite indexing rules, and hardened Firestore security gates compiled directly in the workspace.
                  </p>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                  
                  {/* Left section picker: collections directory */}
                  <div className="lg:col-span-4 space-y-4">
                    <div className="bg-neutral-900 p-4 rounded-xl border border-neutral-800 space-y-3 font-mono text-xs">
                      <span className="font-bold text-neutral-500 uppercase tracking-widest text-[10px] block">Collection Mounter ({COLLECTIONS_DATA.length} schemas)</span>
                      
                      <div className="space-y-1.5 max-h-[460px] overflow-y-auto">
                        {COLLECTIONS_DATA.map(col => (
                          <button 
                            key={col.id}
                            onClick={() => setSelectedSchemaColId(col.id)}
                            className={`w-full flex items-center justify-between p-2.5 rounded-lg border text-left transition-all ${col.id === selectedSchemaColId ? 'bg-amber-500 text-neutral-950 border-transparent font-bold' : 'bg-neutral-950 border-neutral-850 hover:border-neutral-750 text-neutral-300 font-mono'}`}
                          >
                            <span className="text-[11px]">/{col.id}</span>
                            <span className={`text-[9px] px-1.5 py-0.5 rounded ${col.id === selectedSchemaColId ? 'bg-neutral-950/20 text-neutral-950 font-black' : 'bg-neutral-900 text-neutral-500'}`}>{col.title}</span>
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Right section: Selected collection schemas + fields checklist */}
                  <div className="lg:col-span-8 bg-neutral-900 rounded-xl border border-neutral-800 overflow-hidden shadow-2xl" id="schema-explorer-frame">
                    {(() => {
                      const col = COLLECTIONS_DATA.find(c => c.id === selectedSchemaColId) || COLLECTIONS_DATA[0];
                      return (
                        <div className="p-6 space-y-6">
                          
                          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-neutral-800 pb-4 font-mono">
                            <div>
                              <div className="flex items-center gap-2">
                                <span className="bg-amber-500/10 text-amber-500 font-semibold text-[10px] border border-amber-500/20 px-2 py-0.5 rounded uppercase">Verified schema</span>
                                <span className="text-neutral-500 text-[11px]">location: <strong>/{col.id}</strong></span>
                              </div>
                              <h4 className="text-lg font-bold text-white mt-1 uppercase tracking-tight">{col.title} Collection Specification</h4>
                            </div>

                            <div className="flex flex-wrap gap-1">
                              {col.features.map(f => (
                                <span key={f} className="bg-neutral-950 text-neutral-400 border border-neutral-850 px-2 py-0.5 rounded text-[9px]">
                                  {f}
                                </span>
                              ))}
                            </div>
                          </div>

                          <div className="space-y-2">
                            <span className="text-[10px] font-mono text-neutral-500 font-bold uppercase">Collection Intent & Purpose</span>
                            <p className="text-xs text-neutral-300 font-mono bg-neutral-950 p-3 rounded.lg border border-neutral-850 leading-relaxed">
                              {col.description}
                            </p>
                          </div>

                          {/* Fields schema matrix */}
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            
                            <div className="space-y-2">
                              <span className="text-[10px] font-mono text-neutral-500 font-bold uppercase block">Field Data validations</span>
                              <div className="border border-neutral-800 rounded-xl overflow-hidden max-h-56 overflow-y-auto font-mono text-[11px] bg-neutral-950">
                                <table className="w-full text-left">
                                  <thead className="bg-neutral-900 text-neutral-500">
                                    <tr>
                                      <th className="px-3 py-1.5">Key Field</th>
                                      <th className="px-3 py-1.5">Datatype</th>
                                      <th className="px-3 py-1.5 text-center">Required</th>
                                    </tr>
                                  </thead>
                                  <tbody className="divide-y divide-neutral-850/60 text-neutral-300">
                                    {col.fields.map(field => (
                                      <tr key={field.name} className="hover:bg-neutral-800/20">
                                        <td className="px-3 py-1.5 text-white font-bold">{field.name}</td>
                                        <td className="px-3 py-1.5"><span className="bg-neutral-900 px-1 py-0.5 rounded text-neutral-450">{field.type}</span></td>
                                        <td className="px-3 py-1.5 text-center">{field.required ? "Assert" : "Optional"}</td>
                                      </tr>
                                    ))}
                                  </tbody>
                                </table>
                              </div>
                            </div>

                            <div className="space-y-2">
                              <span className="text-[10px] font-mono text-neutral-500 font-bold uppercase block">TypeScript interface declarations</span>
                              <div className="bg-neutral-950 p-4 rounded-xl border border-neutral-850 h-56 overflow-y-auto text-[10px] font-mono text-neutral-400 leading-relaxed select-all scrollbar-thin">
                                <pre>{col.typescriptInterface}</pre>
                              </div>
                            </div>

                          </div>

                          {/* Denormalization Strategy & Query Pathways notes */}
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs font-mono pt-4 border-t border-neutral-800/80">
                            <div className="bg-neutral-950 p-3 rounded-lg border border-neutral-850 space-y-1.5">
                              <span className="text-[9px] text-[#E5B84B] font-bold block uppercase">Denormalization Sync Strategy</span>
                              <p className="text-[10px] text-neutral-400 leading-relaxed font-sans">{col.denormalizationStrategy}</p>
                            </div>
                            <div className="bg-neutral-950 p-3 rounded-lg border border-neutral-850 space-y-1.5">
                              <span className="text-[9px] text-teal-400 font-bold block uppercase">Composite Query Optimizations</span>
                              <p className="text-[10px] text-neutral-400 leading-relaxed font-sans">{col.queryOptimization}</p>
                            </div>
                          </div>

                        </div>
                      );
                    })()}
                  </div>

                </div>

                {/* Secure threat audits mitigation checklist */}
                <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-6 space-y-4" id="securities-blueprint-sandbox">
                  <div>
                    <h4 className="text-xs font-black font-mono text-[#E5B84B] tracking-widest uppercase">Verified Attack Mitigations audits (Zero-Trust)</h4>
                    <p className="text-xs text-neutral-400 font-mono mt-1">
                      Threat audits verified inside current compiled firestore.rules security gates.
                    </p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 font-mono text-xs">
                    {THREAT_AUDITS.map(threat => (
                      <div key={threat.id} className="bg-neutral-950 p-4 rounded-lg border border-neutral-850 space-y-3.5 flex flex-col justify-between">
                        <div className="space-y-2">
                          <div className="flex items-center justify-between">
                            <span className="bg-red-950 text-red-400 border border-red-900/40 text-[9px] px-2 py-0.5 rounded font-bold uppercase">{threat.id}</span>
                            <span className="text-emerald-400 font-bold flex items-center gap-1 text-[10px]">
                              <ShieldAlert className="w-3.5 h-3.5" />
                              <span>{threat.status}</span>
                            </span>
                          </div>
                          <h5 className="font-bold text-white text-[13px]">{threat.exploitName}</h5>
                          <p className="text-[10px] text-neutral-500 font-sans leading-relaxed">
                            <strong>Attack Vector:</strong> {threat.vector}
                          </p>
                        </div>

                        <div className="bg-neutral-900 p-2.5 rounded border border-neutral-850 text-[10px] text-neutral-300 space-y-1">
                          <strong className="text-emerald-400 font-bold text-[9px] uppercase">FIRESTORE SECURITY GATE EXCEEDS:</strong>
                          <p className="leading-normal font-mono text-[9px] text-neutral-450">{threat.rulesMitigation}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

              </motion.div>
            )}

            {/* 8. PERSONNEL DIRECTORY TAB */}
            {activeTab === 'staff' && (
              <motion.div 
                key="tab-staff" 
                initial={{ opacity: 0, y: 15 }} 
                animate={{ opacity: 1, y: 0 }} 
                exit={{ opacity: 0, y: -15 }}
              >
                <StaffManagement />
              </motion.div>
            )}

            {/* 9. ROUTING ROUTE TELEMETRY LOGS */}
            {activeTab === 'routing' && (
              <motion.div 
                key="tab-routing" 
                initial={{ opacity: 0, y: 15 }} 
                animate={{ opacity: 1, y: 0 }} 
                exit={{ opacity: 0, y: -15 }}
              >
                <RoutingArchitecture />
              </motion.div>
            )}

            {/* 10. REPORTS VIEW */}
            {activeTab === 'reports' && (
              <motion.div 
                key="tab-reports" 
                initial={{ opacity: 0, y: 15 }} 
                animate={{ opacity: 1, y: 0 }} 
                exit={{ opacity: 0, y: -15 }}
              >
                <ReportsView orders={orders} inventory={inventory} jobs={jobs} themeMode={themeMode} />
              </motion.div>
            )}

            {/* 11. SYSTEM SETTINGS VIEW */}
            {activeTab === 'settings' && (
              <motion.div 
                key="tab-settings" 
                initial={{ opacity: 0, y: 15 }} 
                animate={{ opacity: 1, y: 0 }} 
                exit={{ opacity: 0, y: -15 }}
              >
                <SettingsView 
                  branchScope={branchScope} 
                  setBranchScope={setBranchScope} 
                  themeMode={themeMode} 
                  setThemeMode={setThemeMode} 
                />
              </motion.div>
            )}

            {/* 12. LAUNCH PROPOSAL DOCUMENT VIEW */}
            {activeTab === 'proposal' && (
              <motion.div 
                key="tab-proposal" 
                initial={{ opacity: 0, y: 15 }} 
                animate={{ opacity: 1, y: 0 }} 
                exit={{ opacity: 0, y: -15 }}
              >
                <ProposalView />
              </motion.div>
            )}

          </AnimatePresence>
        </MainAppShell>

      {/* --- MODAL 1: REGISTER CUSTOM SPORTS SALES ORDER (Interactive Billet and Specsheet Form) --- */}
      {isNewOrderModalOpen && (
        <div className="fixed inset-0 z-50 bg-neutral-950/80 backdrop-blur-sm flex items-center justify-center p-4" id="modal-order-creation">
          
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-neutral-900 border border-neutral-800 rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl"
          >
            {/* Header */}
            <div className="px-6 py-4 bg-neutral-950 border-b border-neutral-800 flex items-center justify-between">
              <h3 className="font-mono text-xs font-black tracking-widest text-amber-500 uppercase flex items-center gap-1.5">
                <ShoppingCart className="w-4 h-4 text-amber-500" />
                <span>Specify Custom Sports Order</span>
              </h3>
              <button 
                onClick={() => setIsNewOrderModalOpen(false)}
                className="text-neutral-400 hover:text-white font-mono text-xs cursor-pointer p-1 rounded hover:bg-neutral-800"
              >
                ✕ Close
              </button>
            </div>

            {/* Form client body */}
            <form onSubmit={submitNewOrder} className="p-6 space-y-4 text-xs font-mono">
              
              <div className="space-y-1.5">
                <label className="text-[10px] text-neutral-500 font-black uppercase block">Select Academy / Client athlete</label>
                <select 
                  value={newOrderForm.customerId}
                  onChange={(e) => setNewOrderForm(prev => ({ ...prev, customerId: e.target.value }))}
                  className="w-full bg-neutral-950 border border-neutral-800 rounded-lg p-2.5 text-xs text-white focus:ring-1 focus:ring-amber-500 focus:outline-none"
                >
                  {customers.map(c => (
                    <option key={c.id} value={c.id}>{c.name} ({c.affiliation})</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-[10px] text-neutral-500 font-black uppercase block">Item category</label>
                  <select 
                    value={newOrderForm.itemType}
                    onChange={(e) => setNewOrderForm(prev => ({ ...prev, itemType: e.target.value as any }))}
                    className="w-full bg-neutral-950 border border-neutral-800 rounded-lg p-2.5 text-xs text-white focus:ring-1 focus:ring-amber-500 focus:outline-none"
                  >
                    <option value="bat">English Willow Cricket Bat</option>
                    <option value="jersey">Custom Sublimated Jersey Wear</option>
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] text-neutral-500 font-black uppercase block">Allocated Item Quantity</label>
                  <input 
                    type="number" 
                    min={1}
                    max={100}
                    value={newOrderForm.customQty}
                    onChange={(e) => setNewOrderForm(prev => ({ ...prev, customQty: parseInt(e.target.value) || 1 }))}
                    className="w-full bg-neutral-950 border border-neutral-800 rounded-lg p-2.5 text-xs text-white focus:ring-1 focus:ring-amber-500 focus:outline-none"
                    required
                  />
                </div>
              </div>

              {/* Conditional parameters based on bat vs jersey wear */}
              {newOrderForm.itemType === 'bat' && (
                <div className="bg-neutral-950/50 p-4 rounded-xl border border-neutral-850 space-y-3.5">
                  <p className="text-[9px] text-amber-500 font-bold uppercase tracking-wider">Willow craft carving details</p>
                  
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="text-[9px] text-neutral-500 uppercase font-black">Willow billet Grade</label>
                      <select 
                        value={newOrderForm.willowGrade}
                        onChange={(e) => setNewOrderForm(prev => ({ ...prev, willowGrade: e.target.value as any }))}
                        className="w-full bg-neutral-900 border border-neutral-805 rounded p-2 text-[11px] text-white focus:outline-none font-mono"
                      >
                        <option value="Grade-1 English Willow">Grade-1 English Willow (Premium grain)</option>
                        <option value="Grade-2 English Willow">Grade-2 English Willow (Standard grain)</option>
                      </select>
                    </div>

                    <div className="space-y-1">
                      <label className="text-[9px] text-neutral-500 uppercase font-black">Calibration weight</label>
                      <input 
                        type="text" 
                        value={newOrderForm.weight}
                        onChange={(e) => setNewOrderForm(prev => ({ ...prev, weight: e.target.value }))}
                        className="w-full bg-neutral-900 border border-neutral-805 rounded p-1.5 text-[11px] text-white focus:outline-none font-mono"
                        placeholder="e.g. 2lb 8oz"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="text-[9px] text-neutral-500 uppercase font-black">Handle grip style color</label>
                      <input 
                        type="text" 
                        value={newOrderForm.gripColor}
                        onChange={(e) => setNewOrderForm(prev => ({ ...prev, gripColor: e.target.value }))}
                        className="w-full bg-neutral-900 border border-neutral-805 rounded p-1.5 text-[11px] text-white focus:outline-none font-mono"
                        placeholder="e.g. Classic Ochre Gold"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-[9px] text-neutral-500 uppercase font-black">Handle cross splice section</label>
                      <select 
                        value={newOrderForm.handleType}
                        onChange={(e) => setNewOrderForm(prev => ({ ...prev, handleType: e.target.value as any }))}
                        className="w-full bg-neutral-900 border border-neutral-805 rounded p-2 text-[11px] text-white focus:outline-none font-mono"
                      >
                        <option value="Round">Round handle (classic drive control)</option>
                        <option value="Oval">Oval handle (strong directional flick)</option>
                      </select>
                    </div>
                  </div>
                </div>
              )}

              {newOrderForm.itemType === 'jersey' && (
                <div className="bg-neutral-950/50 p-4 rounded-xl border border-neutral-850 space-y-3.5">
                  <p className="text-[9px] text-purple-400 font-bold uppercase tracking-wider">Sublimation vector & fabric details</p>
                  
                  <div className="space-y-1.5">
                    <label className="text-[9px] text-neutral-500 uppercase font-black block">Vector Graphic Art Asset</label>
                    <input 
                      type="text" 
                      value={newOrderForm.sublimationDesign}
                      onChange={(e) => setNewOrderForm(prev => ({ ...prev, sublimationDesign: e.target.value }))}
                      className="w-full bg-neutral-900 border border-neutral-805 rounded p-2 text-[11px] text-white focus:outline-none font-mono"
                      placeholder="e.g., Imphal Eastern Club Crest Stripe PMS-Gold"
                    />
                  </div>
                </div>
              )}

              <div className="space-y-1.5">
                <label className="text-[10px] text-neutral-500 font-black uppercase block">Extra instructions for craftsman</label>
                <textarea 
                  value={newOrderForm.notes}
                  onChange={(e) => setNewOrderForm(prev => ({ ...prev, notes: e.target.value }))}
                  className="w-full bg-neutral-950 border border-neutral-800 rounded-lg p-2.5 text-xs text-white h-20 focus:ring-1 focus:ring-amber-500 focus:outline-none"
                  placeholder="e.g., Prefers heavy edges but lightweight pickup. Smooth spine sanding."
                ></textarea>
              </div>

              {/* Submit triggers offline buffer queues */}
              <button 
                type="submit"
                className="w-full py-3 bg-gradient-to-r from-amber-500 to-yellow-600 hover:from-amber-400 hover:to-yellow-500 text-neutral-950 font-bold tracking-widest uppercase rounded-xl transition-all font-mono"
              >
                Assemble & Commit Specs to PWA
              </button>

            </form>
          </motion.div>
        </div>
      )}

      {/* --- MODAL 2: VIEW SPECIFIC SPORTS ORDER MILLING SPECIFICATIONS --- */}
      {selectedOrderDetails && (
        <div className="fixed inset-0 z-50 bg-neutral-950/80 backdrop-blur-sm flex items-center justify-center p-4 shadow-2xl" id="modal-specsheets-detail">
          <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-neutral-900 border border-neutral-800 rounded-2xl w-full max-w-md overflow-hidden"
          >
            {/* Header */}
            <div className="px-6 py-4.5 bg-neutral-950 border-b border-neutral-800 flex items-center justify-between font-mono">
              <span className="text-[10px] text-[#E5B84B] font-bold uppercase tracking-widest bg-[#E5B84B]/10 border border-[#E5B84B]/20 px-2 py-0.5 rounded">
                Custom Spec Sheet: {selectedOrderDetails.id}
              </span>
              <button 
                onClick={() => setSelectedOrderDetails(null)}
                className="text-neutral-400 hover:text-white font-mono font-bold cursor-pointer"
              >
                ✕ Close
              </button>
            </div>

            {/* Spec contents */}
            <div className="p-6 space-y-5 font-mono text-xs">
              
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-[#E5B84B]/10 flex items-center justify-center text-[#E5B84B] border border-[#E5B84B]/20">
                  <Hammer className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-white uppercase">{selectedOrderDetails.customerName} Layout</h4>
                  <span className="text-neutral-500 text-[10px]">Registry: {selectedOrderDetails.customerId} • Scope: Melbourne</span>
                </div>
              </div>

              {/* Attributes block details selection */}
              <div className="bg-neutral-950 rounded-xl p-4 border border-neutral-850 space-y-3.5 text-neutral-300">
                <span className="text-[9px] text-[#E5B84B] font-bold uppercase tracking-wider block border-b border-neutral-900 pb-1.5">Artisan specifications checklist</span>
                
                {selectedOrderDetails.itemType === 'bat' ? (
                  <div className="grid grid-cols-2 gap-y-3 gap-x-1.5 text-[11px]">
                    <div>
                      <span className="text-[9px] text-neutral-500 block uppercase font-black">Willow billet raw:</span>
                      <strong className="text-neutral-200">{selectedOrderDetails.specs.willowGrade}</strong>
                    </div>
                    <div>
                      <span className="text-[9px] text-neutral-500 block uppercase font-black">Fined weight:</span>
                      <strong className="text-neutral-200">{selectedOrderDetails.specs.weight}</strong>
                    </div>
                    <div>
                      <span className="text-[9px] text-neutral-500 block uppercase font-black">Handle splice cross:</span>
                      <strong className="text-neutral-200">{selectedOrderDetails.specs.handleType}</strong>
                    </div>
                    <div>
                      <span className="text-[9px] text-neutral-500 block uppercase font-black">Rubber grip color:</span>
                      <strong className="text-[#E5B84B] font-bold">{selectedOrderDetails.specs.gripColor}</strong>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-2 text-[11px]">
                    <div>
                      <span className="text-[9px] text-neutral-500 block uppercase font-black">Sublimated art proof:</span>
                      <strong className="text-neutral-200">{selectedOrderDetails.specs.sublimationDesign}</strong>
                    </div>
                    <div>
                      <span className="text-[9px] text-neutral-500 block uppercase font-black">Fabrics blends:</span>
                      <strong className="text-neutral-200">100% Breathable moisture-repelling polyester mesh blanks</strong>
                    </div>
                  </div>
                )}
              </div>

              <div className="space-y-1 bg-neutral-950 p-3.5 rounded-xl border border-neutral-850">
                <span className="text-[9px] text-neutral-500 uppercase font-black">Special customer footnotes:</span>
                <p className="text-neutral-350 font-sans leading-relaxed text-[11.5px] font-mono italic">
                  "{selectedOrderDetails.notes}"
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3 text-[11px] pt-2">
                <div>
                  <span className="text-[9px] text-neutral-500 block uppercase font-black">TOTAL BILLETS VALUE:</span>
                  <strong className="text-lg font-black text-[#E5B84B] font-mono">₹{selectedOrderDetails.totalAmount.toFixed(2)}</strong>
                </div>
                <div className="text-right">
                  <span className="text-[9px] text-neutral-500 block uppercase font-black">CONTRACT PROMISED:</span>
                  <strong className="text-white block font-bold pt-1.5">{selectedOrderDetails.promisedDate}</strong>
                </div>
              </div>

            </div>
          </motion.div>
        </div>
      )}

      {/* --- MODAL 3: INVOICE PAYMENT BALANCE RECON DESK BLOCK MANAGER --- */}
      {isInvoicePaymentModalOpen && (
        <div className="fixed inset-0 z-50 bg-neutral-950/80 backdrop-blur-sm flex items-center justify-center p-4 font-mono select-none" id="modal-payment-accounting">
          
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-neutral-900 border border-neutral-800 rounded-2xl w-full max-w-sm overflow-hidden"
          >
            {/* Header */}
            <div className="px-6 py-4 bg-neutral-950 border-b border-neutral-800 flex items-center justify-between">
              <h3 className="text-xs font-black tracking-widest text-[#E5B84B] uppercase flex items-center gap-1.5">
                <CreditCard className="w-4 h-4 text-amber-500" />
                <span>Reconcile Invoice payments</span>
              </h3>
              <button 
                onClick={() => setIsInvoicePaymentModalOpen(false)}
                className="text-neutral-400 hover:text-white"
              >
                ✕ Close
              </button>
            </div>

            {/* Form body */}
            <form onSubmit={receiveInvoicePayment} className="p-6 space-y-4 text-xs font-mono">
              
              <div className="space-y-1">
                <label className="text-[9px] text-neutral-500 uppercase font-black">Choose pending invoice ID</label>
                <select 
                  value={paymentForm.invoiceId}
                  onChange={(e) => {
                    const inv = invoices.find(i => i.id === e.target.value);
                    if (inv) {
                      setPaymentForm(prev => ({ 
                        ...prev, 
                        invoiceId: e.target.value,
                        payAmount: inv.amount - inv.paid
                      }));
                    }
                  }}
                  className="w-full bg-neutral-950 border border-neutral-800 rounded p-2 text-white focus:outline-none"
                >
                  {invoices.filter(i => i.status !== 'paid').map(inv => (
                    <option key={inv.id} value={inv.id}>
                      {inv.id} | {inv.customerName} (₹{(inv.amount - inv.paid).toFixed(2)} debt)
                    </option>
                  ))}
                  {invoices.filter(i => i.status !== 'paid').length === 0 && (
                    <option value="">No outstanding debtor balances</option>
                  )}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[9px] text-neutral-500 uppercase font-black">Amount cleared</label>
                  <input 
                    type="number"
                    value={paymentForm.payAmount}
                    onChange={(e) => setPaymentForm(prev => ({ ...prev, payAmount: parseFloat(e.target.value) || 0 }))}
                    className="w-full bg-neutral-950 border border-neutral-800 rounded p-2 text-white focus:outline-none font-bold text-amber-500"
                    required
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[9px] text-neutral-500 uppercase font-black">Settlement Mode</label>
                  <select 
                    value={paymentForm.paymentMethod}
                    onChange={(e) => setPaymentForm(prev => ({ ...prev, paymentMethod: e.target.value as any }))}
                    className="w-full bg-neutral-950 border border-neutral-800 rounded p-2 text-white focus:outline-none"
                  >
                    <option value="bank_transfer">Direct Bank Transfer</option>
                    <option value="card">Card Terminal terminal</option>
                    <option value="cash">Petty Cash desk</option>
                  </select>
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[9px] text-neutral-500 uppercase font-black">Bank slip or Tx reference No</label>
                <input 
                  type="text"
                  value={paymentForm.reference}
                  onChange={(e) => setPaymentForm(prev => ({ ...prev, reference: e.target.value }))}
                  className="w-full bg-neutral-950 border border-neutral-800 rounded p-2 text-white placeholder-neutral-700"
                  placeholder="e.g. SLIP-VIC-001"
                />
              </div>

              <button 
                type="submit"
                className="w-full py-3 bg-gradient-to-r from-amber-500 to-yellow-600 hover:from-amber-400 hover:to-yellow-500 text-neutral-950 font-bold uppercase tracking-widest text-[11px] rounded"
              >
                Clear invoice item ledger balances &rarr;
              </button>

            </form>
          </motion.div>
        </div>
      )}

    </div>
  );
}

// Simple custom component to replace missing icons or layout elements safely
function BoxIcon({ className = "w-4 h-4 text-white" }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
      <path strokeLinecap="round" strokeLinejoin="round" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
    </svg>
  );
}
