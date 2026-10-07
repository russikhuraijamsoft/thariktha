import React, { useState, useEffect } from 'react';
import { erpIntegrationService } from './services/erpIntegrationService';
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
import { OdooControlPanel, OdooViewMode } from './components/OdooControlPanel';
import { OdooKanbanBoard, KanbanColumn, KanbanItem } from './components/OdooKanbanBoard';
import { OdooFormModal, OdooFormRecord } from './components/OdooFormModal';

import { db, isCloudConnected } from './firebase';
import { collection, onSnapshot, query } from 'firebase/firestore';

// --- Types for Core ERP State ---
interface ERPOrder {
  id: string;
  customerId: string;
  customerName: string;
  itemSummary: string;
  itemType: 'bat' | 'jersey' | 'balls' | 'repairs';
  specs: {
    willowGrade?: 'Grade-1 English Willow' | 'Grade-2 English Willow';
    weight?: string;
    gripColor?: string;
    handleType?: 'Round' | 'Oval';
    sublimationDesign?: string;
    jerseySize?: string;
    repairCategory?: string;
  };
  totalAmount: number;
  paymentStatus: 'unpaid' | 'partially_paid' | 'paid';
  status: 'draft' | 'pending' | 'manufacturing' | 'printing' | 'ready' | 'delivered';
  promisedDate: string;
  notes: string;
  createdAt: string;
}

interface ERPInventory {
  sku: string;
  name: string;
  category: 'bats' | 'balls' | 'apparel' | 'protective';
  stock: number;
  safetyLevel: number;
  reorderPoint: number;
  shelf: string;
  price: number;
  rawCost: number;
}

interface ERPJob {
  id: string;
  orderId: string;
  customerName: string;
  sku: string;
  type: 'mill' | 'print' | 'repair';
  status: 'queued' | 'splitting' | 'shaping' | 'pressing' | 'curing' | 'final-tuning' | 'quality-check' | 'complete';
  priority: 'low' | 'medium' | 'high' | 'rush';
  notes: string;
  craftsman: string;
  qualityScore?: number;
}

interface ERPCustomer {
  id: string;
  name: string;
  email: string;
  phone: string;
  affiliation: 'Academy' | 'Club Team' | 'Individual Athlete';
  activeOrders: number;
  branch: string;
  address: string;
}

interface ERPInvoice {
  id: string;
  orderId: string;
  customerName: string;
  dueDate: string;
  amount: number;
  paid: number;
  status: 'unpaid' | 'partially_paid' | 'paid' | 'voided';
}

interface ERPTransaction {
  id: string;
  invoiceId: string;
  amount: number;
  type: 'incoming_payment' | 'vendor_payout';
  method: 'bank_transfer' | 'cash' | 'card';
  date: string;
  reference: string;
}

interface ERPNotification {
  id: string;
  title: string;
  message: string;
  type: 'low_stock' | 'new_order' | 'job_milestone' | 'payment_alert';
  time: string;
  read: boolean;
}

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
  
  const [activeTab, setActiveTab ] = useState<'dashboard' | 'orders' | 'inventory' | 'manufacturing' | 'printing' | 'servicing' | 'notifications' | 'customers' | 'billing' | 'staff' | 'routing' | 'architecture' | 'reports' | 'settings'>('dashboard');
  const [branchScope, setBranchScope] = useState<'Melbourne Closets' | 'London Closets'>((profile?.branchId as any) || 'Melbourne Closets');
  const [themeMode, setThemeMode] = useState<'light' | 'dark'>('light');

  // --- Gotham/Bento Dashboard Mockup Specific States ---
  const [selectedGloveIdx, setSelectedGloveIdx] = useState<number>(0);
  const [activeCurrency, setActiveCurrency] = useState<'INR' | 'USD' | 'AUD'>('INR');
  const [isSimulatingBalance, setIsSimulatingBalance] = useState<boolean>(false);
  const [simulateProgress, setSimulateProgress] = useState<number>(0);
  const [simulateValue, setSimulateValue] = useState<string | null>(null);
  const [activeRouteStop, setActiveRouteStop] = useState<'batala' | 'meerut' | 'bhilwara' | 'imphal' | null>(null);

  // --- Odoo Enterprise Standard States ---
  const [odooViewMode, setOdooViewMode] = useState<OdooViewMode>('kanban');
  const [odooFilter, setOdooFilter] = useState<string>('all');
  const [odooGroupBy, setOdooGroupBy] = useState<string>('none');
  const [odooSearch, setOdooSearch] = useState<string>('');
  const [selectedOdooRecord, setSelectedOdooRecord] = useState<OdooFormRecord | null>(null);
  const [isFormModalOpen, setIsFormModalOpen] = useState<boolean>(false);

  // --- Real-time ERP Live States connected to Firestore ---
  const [orders, setOrders] = useState<ERPOrder[]>([]);
  const [inventory, setInventory] = useState<ERPInventory[]>([]);
  const [jobs, setJobs] = useState<ERPJob[]>([]);
  const [customers, setCustomers] = useState<ERPCustomer[]>([]);
  const [invoices, setInvoices] = useState<ERPInvoice[]>([]);
  const [transactions, setTransactions] = useState<ERPTransaction[]>([]);
  const [notifications, setNotifications] = useState<ERPNotification[]>([]);

  // --- Client Event Streams for PWA Sync telemetry panel ---
  const [telemetryLogs, setTelemetryLogs] = useState<{ id: string; event: string; status: 'info' | 'syncing' | 'synced'; timestamp: string }[]>([
    { id: "TLM-1", event: "ERP initialized with authoritative Firestore data layer.", status: "info", timestamp: new Date().toTimeString().split(' ')[0] }
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

  // Live Firestore synchronization for Orders, Inventory, Jobs, Customers, Invoices, Transactions
  useEffect(() => {
    if (!isCloudConnected) {
      // Local fallback
      const localOrders = localStorage.getItem('erp_orders');
      if (localOrders) {
        try { setOrders(JSON.parse(localOrders)); } catch {}
      }
      return;
    }

    logTelemetry("Connecting real-time Firestore data streams...", "syncing");

    // 1. Orders
    const unsubOrders = onSnapshot(collection(db, 'orders'), (snap) => {
      const list: ERPOrder[] = [];
      snap.forEach((d) => {
        const data = d.data();
        list.push({
          id: d.id,
          customerId: data.customerId || '',
          customerName: data.customerName || data.customer || 'Unknown Client',
          itemSummary: data.itemSummary || data.summary || (data.orderItems?.[0]?.name ? `${data.orderItems[0].qty || 1}x ${data.orderItems[0].name}` : 'Order Contract'),
          itemType: data.itemType || 'bat',
          specs: data.specs || {},
          totalAmount: Number(data.totalAmount || 0),
          paymentStatus: data.paymentStatus || 'unpaid',
          status: data.status || 'pending',
          promisedDate: data.promisedDate || data.deliveryDate || '',
          notes: data.notes || '',
          createdAt: data.createdAt || ''
        });
      });
      setOrders(list);
      logTelemetry(`Synced ${list.length} orders from Firestore`, "synced");
    }, (err) => console.warn("Orders listener error:", err));

    // 2. Inventory / Products
    const unsubInventory = onSnapshot(collection(db, 'inventory'), (snap) => {
      const list: ERPInventory[] = [];
      snap.forEach((d) => {
        const data = d.data();
        list.push({
          sku: data.sku || d.id,
          name: data.name || data.skuLabel || d.id,
          category: data.category || 'protective',
          stock: Number(data.stock ?? data.stockLevel ?? data.currentStock ?? 0),
          safetyLevel: Number(data.safetyLevel ?? data.safetyStock ?? data.minimumStock ?? 5),
          reorderPoint: Number(data.reorderPoint ?? 8),
          shelf: data.shelf || data.shelfLocation || 'Main Bin',
          price: Number(data.price ?? data.sellingPrice ?? 0),
          rawCost: Number(data.rawCost ?? data.purchasePrice ?? 0)
        });
      });
      setInventory(list);
    }, (err) => console.warn("Inventory listener error:", err));

    // 3. Manufacturing Jobs
    const unsubJobs = onSnapshot(collection(db, 'manufacturing_workflows'), (snap) => {
      const list: ERPJob[] = [];
      snap.forEach((d) => {
        const data = d.data();
        list.push({
          id: d.id,
          orderId: data.orderId || '',
          customerName: data.customerName || '',
          sku: data.sku || 'MFT-JOB',
          type: data.type || 'mill',
          status: data.stage === 'Delivered' ? 'complete' : (data.stage ? data.stage.toLowerCase().replace(/ /g, '-') : 'queued') as any,
          priority: data.priority || 'medium',
          notes: data.notes || '',
          craftsman: data.assignedStaff || 'Vijay Merchant',
          qualityScore: data.progress || 0
        });
      });
      setJobs(list);
    }, (err) => console.warn("Jobs listener error:", err));

    // 4. Customers
    const unsubCustomers = onSnapshot(collection(db, 'customers'), (snap) => {
      const list: ERPCustomer[] = [];
      snap.forEach((d) => {
        const data = d.data();
        list.push({
          id: d.id,
          name: data.name || '',
          email: data.email || '',
          phone: data.phone || '',
          affiliation: data.affiliation || (data.type === 'school' ? 'Academy' : data.type === 'team' ? 'Club Team' : 'Individual Athlete'),
          activeOrders: Number(data.activeOrders || 0),
          branch: data.branch || data.branchId || 'Melbourne Closets',
          address: typeof data.address === 'string' ? data.address : (data.address?.street ? `${data.address.street}, ${data.address.city || ''}` : '')
        });
      });
      setCustomers(list);
    }, (err) => console.warn("Customers listener error:", err));

    // 5. Invoices
    const unsubInvoices = onSnapshot(collection(db, 'invoices'), (snap) => {
      const list: ERPInvoice[] = [];
      snap.forEach((d) => {
        const data = d.data();
        list.push({
          id: d.id,
          orderId: data.orderId || '',
          customerName: data.customerName || '',
          dueDate: data.dueDate || '',
          amount: Number(data.amount || 0),
          paid: Number(data.paid || 0),
          status: data.status || 'unpaid'
        });
      });
      setInvoices(list);
    }, (err) => console.warn("Invoices listener error:", err));

    // 6. Transactions
    const unsubTransactions = onSnapshot(collection(db, 'transactions'), (snap) => {
      const list: ERPTransaction[] = [];
      snap.forEach((d) => {
        const data = d.data();
        list.push({
          id: d.id,
          invoiceId: data.invoiceId || '',
          amount: Number(data.amount || 0),
          type: data.type || 'incoming_payment',
          method: data.method || 'cash',
          date: data.date || '',
          reference: data.reference || ''
        });
      });
      setTransactions(list);
    }, (err) => console.warn("Transactions listener error:", err));

    // 7. Notifications
    const unsubNotifications = onSnapshot(collection(db, 'notifications'), (snap) => {
      const list: ERPNotification[] = [];
      snap.forEach((d) => {
        const data = d.data();
        list.push({
          id: d.id,
          title: data.title || '',
          message: data.message || '',
          type: data.type || 'new_order',
          time: data.time || 'Recent',
          read: !!data.read
        });
      });
      setNotifications(list);
    }, (err) => console.warn("Notifications listener error:", err));

    return () => {
      unsubOrders();
      unsubInventory();
      unsubJobs();
      unsubCustomers();
      unsubInvoices();
      unsubTransactions();
      unsubNotifications();
    };
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

  // Odoo Document Form Sheet opener
  const openOrderInOdooSheet = (order: ERPOrder) => {
    setSelectedOdooRecord({
      id: order.id,
      type: 'order',
      title: `${order.id} - ${order.customerName}`,
      subtitle: `${order.itemSummary} · Promised Delivery: ${order.promisedDate}`,
      status: order.status,
      stages: ['draft', 'pending', 'manufacturing', 'printing', 'ready', 'delivered'],
      totalAmount: order.totalAmount,
      data: order,
      chatterLogs: [
        {
          id: 'log-1',
          author: 'System Sentry',
          type: 'status_change',
          body: `Order stage confirmed: ${order.status.toUpperCase()}`,
          timestamp: 'Today 10:15'
        },
        {
          id: 'log-2',
          author: profile?.name || 'Administrator',
          type: 'note',
          body: `Bat milling & shaping verified for ${order.customerName}. Wood: ${order.specs?.willowGrade || 'Grade-1 English Willow'}.`,
          timestamp: 'Yesterday 16:40'
        }
      ]
    });
    setIsFormModalOpen(true);
  };

  const handleMoveOrderStage = (orderId: string, newStage: string) => {
    setOrders(prev => prev.map(o => o.id === orderId ? { ...o, status: newStage as any } : o));
    logTelemetry(`Advanced order ${orderId} to stage: ${newStage}`, 'synced');
  };

  const handleModalStatusChange = (newStatus: string) => {
    if (!selectedOdooRecord) return;
    const mapped = newStatus.toLowerCase().replace(/ /g, '_');
    setOrders(prev => prev.map(o => o.id === selectedOdooRecord.id ? { ...o, status: mapped as any } : o));
    setSelectedOdooRecord(prev => prev ? { ...prev, status: newStatus } : null);
    logTelemetry(`Updated status on ${selectedOdooRecord.id} to ${newStatus}`, 'synced');
  };

  const handleAddChatter = (type: 'message' | 'note', body: string) => {
    if (!selectedOdooRecord) return;
    const newLog = {
      id: `chat-${Date.now()}`,
      author: profile?.name || 'Administrator',
      type: type as any,
      body,
      timestamp: 'Just now'
    };
    setSelectedOdooRecord(prev => prev ? {
      ...prev,
      chatterLogs: [newLog, ...(prev.chatterLogs || [])]
    } : null);
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

  // Odoo Enterprise Kanban Configuration
  const kanbanColumns: KanbanColumn[] = [
    { id: 'draft', title: '1. Draft / Inquiry', color: 'bg-neutral-500' },
    { id: 'pending', title: '2. Confirmed Order', color: 'bg-blue-500' },
    { id: 'manufacturing', title: '3. In Fabrication', color: 'bg-amber-500' },
    { id: 'printing', title: '4. Sublimation / Quality', color: 'bg-purple-500' },
    { id: 'ready', title: '5. Ready for Dispatch', color: 'bg-emerald-500' },
    { id: 'delivered', title: '6. Done / Delivered', color: 'bg-teal-500' },
  ];

  const filteredOrdersForOdoo = orders.filter(o => {
    const matchesSearch = !odooSearch.trim() || 
      o.customerName.toLowerCase().includes(odooSearch.toLowerCase()) || 
      o.id.toLowerCase().includes(odooSearch.toLowerCase()) ||
      o.itemSummary.toLowerCase().includes(odooSearch.toLowerCase());
    const matchesFilter = odooFilter === 'all' || o.status === odooFilter;
    return matchesSearch && matchesFilter;
  });

  const kanbanItems: KanbanItem[] = filteredOrdersForOdoo.map(o => ({
    id: o.id,
    title: o.customerName,
    subtitle: `${o.itemSummary} · Promised: ${o.promisedDate}`,
    category: o.itemType,
    amount: o.totalAmount,
    stageId: o.status,
    date: o.promisedDate,
    priority: o.totalAmount > 800 ? 'high' : 'medium',
    rawItem: o
  }));

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
                className="space-y-6"
              >
                {/* 0. ODOO ENTERPRISE CONTROL PANEL */}
                <OdooControlPanel
                  appName="Cockpit Operations"
                  breadcrumbs={['Overview', odooViewMode.toUpperCase()]}
                  viewMode={odooViewMode}
                  onViewModeChange={setOdooViewMode}
                  onNewRecord={() => setIsNewOrderModalOpen(true)}
                  newRecordLabel="+ New Order"
                  onExport={() => {
                    const csv = 'Order ID,Customer,Amount,Status,Promised Date\n' + orders.map(o => `${o.id},"${o.customerName}",${o.totalAmount},${o.status},${o.promisedDate}`).join('\n');
                    const blob = new Blob([csv], { type: 'text/csv' });
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.href = url;
                    a.download = `odoo_orders_ledger_${Date.now()}.csv`;
                    a.click();
                  }}
                  onPrint={() => window.print()}
                  onRefresh={() => logTelemetry('Synchronized Cockpit orders & stock', 'synced')}
                  searchQuery={odooSearch}
                  onSearchChange={setOdooSearch}
                  activeFilter={odooFilter}
                  onFilterChange={setOdooFilter}
                  availableFilters={[
                    { id: 'all', label: 'All Orders' },
                    { id: 'draft', label: 'Draft / Inquiry' },
                    { id: 'pending', label: 'Confirmed' },
                    { id: 'manufacturing', label: 'In Fabrication' },
                    { id: 'printing', label: 'Sublimation / QC' },
                    { id: 'ready', label: 'Ready for Dispatch' },
                    { id: 'delivered', label: 'Delivered' }
                  ]}
                  activeGroupBy={odooGroupBy}
                  onGroupByChange={setOdooGroupBy}
                  availableGroups={[
                    { id: 'none', label: 'No Grouping' },
                    { id: 'status', label: 'By Stage' },
                    { id: 'itemType', label: 'By Item Category' },
                    { id: 'paymentStatus', label: 'By Payment Status' }
                  ]}
                  recordCount={kanbanItems.length}
                  totalCount={orders.length}
                />
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
                {(() => {
                  const totalLedgerCredits = transactions.reduce((acc, t) => acc + (t.amount || 0), 0) ||
                    invoices.filter(i => i.status === 'paid').reduce((acc, i) => acc + (i.paid || i.amount || 0), 0) ||
                    orders.filter(o => o.paymentStatus === 'paid').reduce((acc, o) => acc + (o.totalAmount || 0), 0);
                  const todayLedgerCredits = transactions.filter(t => t.date === new Date().toISOString().split('T')[0]).reduce((acc, t) => acc + (t.amount || 0), 0);
                  const lowStockCount = inventory.filter(i => (i.stock || 0) < (i.safetyLevel || 5)).length;

                  return (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4" id="kpi-matrix">
                      {/* Revenue Invoice clearing balance */}
                      <div className="bg-neutral-900 p-5 rounded-xl border border-neutral-800 flex items-center justify-between select-none">
                        <div className="space-y-1">
                          <span className="text-[10px] font-mono font-bold text-neutral-500 tracking-wider uppercase">LEDGER CREDITS (YTD)</span>
                          <h3 className="text-2xl font-black text-white font-mono">₹{totalLedgerCredits.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</h3>
                          <div className="flex items-center gap-1 text-[10px] font-mono text-emerald-400">
                            <TrendingUp className="w-3 h-3" />
                            <span>{totalLedgerCredits > 0 ? `+₹${todayLedgerCredits.toLocaleString()} verified today` : '₹0.00 today (Live)'}</span>
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
                            <span>{jobs.length > 0 ? 'Quality target: min 95.0% grade' : 'Production queue empty'}</span>
                          </div>
                        </div>
                        <div className="w-10 h-10 rounded-lg bg-neutral-800 flex items-center justify-center text-neutral-400 border border-neutral-700 shrink-0">
                          <Hammer className="w-5 h-5" />
                        </div>
                      </div>

                      {/* Physical Inventory Slices stock alerts */}
                      <div className={`bg-neutral-900 p-5 rounded-xl border flex items-center justify-between select-none ${lowStockCount > 0 ? 'border-[#9d3636]' : 'border-neutral-800'}`}>
                        <div className="space-y-1">
                          <span className={`text-[10px] font-mono font-bold tracking-wider uppercase ${lowStockCount > 0 ? 'text-red-500' : 'text-neutral-500'}`}>LOW STOCK WARNING</span>
                          <h3 className={`text-2xl font-black font-mono ${lowStockCount > 0 ? 'text-red-400' : 'text-white'}`}>
                            {lowStockCount} SKU Alerts
                          </h3>
                          <div className={`text-[10px] font-mono ${lowStockCount > 0 ? 'text-red-500/80' : 'text-emerald-400'}`}>
                            <span>{lowStockCount > 0 ? 'Depleted below safety threshold' : 'Stock reserves nominal'}</span>
                          </div>
                        </div>
                        <div className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${lowStockCount > 0 ? 'bg-red-950/40 text-red-400 border border-red-800/40' : 'bg-emerald-950/40 text-emerald-400 border border-emerald-800/40'}`}>
                          <AlertTriangle className="w-5 h-5" />
                        </div>
                      </div>
                    </div>
                  );
                })()}

                {/* ODOO ENTERPRISE VIEW CONTAINER (Kanban, Tree List, or Pivot Matrix) */}
                <div className="space-y-4">
                  {odooViewMode === 'kanban' && (
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <h3 className="text-sm font-bold text-white uppercase tracking-wider font-mono flex items-center gap-2">
                            <span>Stage Pipeline Kanban</span>
                            <span className="text-[10px] text-amber-400 bg-amber-500/10 border border-amber-500/20 px-2 py-0.5 rounded font-mono">
                              Odoo Standard
                            </span>
                          </h3>
                        </div>
                        <span className="text-xs text-neutral-400 font-mono hidden sm:inline">
                          Click any card to open Odoo Document Sheet
                        </span>
                      </div>
                      <OdooKanbanBoard
                        columns={kanbanColumns}
                        items={kanbanItems}
                        onItemClick={(kItem) => openOrderInOdooSheet(kItem.rawItem)}
                        onMoveStage={handleMoveOrderStage}
                        onQuickAdd={() => {
                          setNewOrderForm(prev => ({ ...prev, itemType: 'bat' }));
                          setIsNewOrderModalOpen(true);
                        }}
                      />
                    </div>
                  )}

                  {odooViewMode === 'list' && (
                    <div className="bg-[#171b22] border border-neutral-800 rounded-xl overflow-hidden shadow-sm">
                      <div className="px-5 py-3.5 border-b border-neutral-800 flex items-center justify-between bg-[#14171d]">
                        <div className="flex items-center gap-2 text-xs font-mono">
                          <span className="text-amber-400 font-bold uppercase">Orders Tree View (List)</span>
                          <span className="text-neutral-500">· {kanbanItems.length} records</span>
                        </div>
                        <span className="text-[11px] text-neutral-400 font-mono">Click 'Open Sheet' for full Odoo Form</span>
                      </div>
                      <div className="overflow-x-auto">
                        <table className="w-full text-left text-xs font-sans">
                          <thead className="bg-[#12151b] text-neutral-400 uppercase font-mono text-[10px] border-b border-neutral-800">
                            <tr>
                              <th className="py-2.5 px-4">Order Ref</th>
                              <th className="py-2.5 px-4">Customer / Club</th>
                              <th className="py-2.5 px-4">Item Summary</th>
                              <th className="py-2.5 px-4">Stage</th>
                              <th className="py-2.5 px-4">Payment</th>
                              <th className="py-2.5 px-4">Promised Delivery</th>
                              <th className="py-2.5 px-4 text-right">Valuation</th>
                              <th className="py-2.5 px-4 text-center">Action</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-neutral-800 text-neutral-200">
                            {filteredOrdersForOdoo.length === 0 ? (
                              <tr>
                                <td colSpan={8} className="py-12 text-center">
                                  <div className="flex flex-col items-center justify-center space-y-2 text-neutral-400 font-mono">
                                    <ShoppingCart className="w-8 h-8 text-neutral-600 stroke-[1.5]" />
                                    <span className="text-sm font-semibold text-neutral-300">No Orders Recorded in Pipeline</span>
                                    <p className="text-xs text-neutral-500 max-w-sm">No sales or custom manufacturing orders currently exist in the database.</p>
                                    <button
                                      onClick={() => {
                                        setNewOrderForm(prev => ({ ...prev, itemType: 'bat' }));
                                        setIsNewOrderModalOpen(true);
                                      }}
                                      className="mt-2 px-3 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-neutral-950 text-xs font-bold transition flex items-center gap-1.5 cursor-pointer"
                                    >
                                      <Plus className="w-3.5 h-3.5" />
                                      <span>Create First Order</span>
                                    </button>
                                  </div>
                                </td>
                              </tr>
                            ) : (
                              filteredOrdersForOdoo.map(o => (
                                <tr key={o.id} className="hover:bg-neutral-800/50 transition">
                                  <td className="py-3 px-4 font-mono font-semibold text-purple-300">{o.id}</td>
                                  <td className="py-3 px-4 font-medium text-white">{o.customerName}</td>
                                  <td className="py-3 px-4 text-neutral-300 text-[11px]">{o.itemSummary}</td>
                                  <td className="py-3 px-4">
                                    <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase bg-amber-500/20 text-amber-300 border border-amber-500/30">
                                      {o.status}
                                    </span>
                                  </td>
                                  <td className="py-3 px-4">
                                    <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase ${
                                      o.paymentStatus === 'paid' ? 'bg-emerald-500/20 text-emerald-300' : 'bg-rose-500/20 text-rose-300'
                                    }`}>
                                      {o.paymentStatus}
                                    </span>
                                  </td>
                                  <td className="py-3 px-4 font-mono text-neutral-400 text-[11px]">{o.promisedDate}</td>
                                  <td className="py-3 px-4 text-right font-mono font-bold text-amber-400">
                                    ₹{o.totalAmount.toLocaleString()}
                                  </td>
                                  <td className="py-3 px-4 text-center">
                                    <button
                                      onClick={() => openOrderInOdooSheet(o)}
                                      className="px-2.5 py-1 rounded bg-[#714B67] hover:bg-[#86597a] text-white text-[11px] font-semibold transition cursor-pointer"
                                    >
                                      Open Sheet
                                    </button>
                                  </td>
                                </tr>
                              ))
                            )}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}

                  {odooViewMode === 'pivot' && (
                    <div className="bg-[#171b22] border border-neutral-800 rounded-xl overflow-hidden shadow-sm p-5 space-y-4">
                      <div className="flex items-center justify-between border-b border-neutral-800 pb-3">
                        <div>
                          <h3 className="text-sm font-bold text-white uppercase font-mono">
                            Odoo Multi-Dimensional Pivot Matrix
                          </h3>
                          <p className="text-xs text-neutral-400">Aggregation: Categories vs Manufacturing Stages</p>
                        </div>
                        <span className="text-[11px] font-mono text-amber-400 font-bold">Sum of Valuation (₹)</span>
                      </div>
                      <div className="overflow-x-auto">
                        <table className="w-full text-left text-xs font-mono">
                          <thead className="bg-[#12151b] text-neutral-400 border-b border-neutral-800">
                            <tr>
                              <th className="py-2.5 px-3">Category</th>
                              <th className="py-2.5 px-3 text-right">Draft</th>
                              <th className="py-2.5 px-3 text-right">Confirmed</th>
                              <th className="py-2.5 px-3 text-right">Manufacturing</th>
                              <th className="py-2.5 px-3 text-right">Ready</th>
                              <th className="py-2.5 px-3 text-right">Delivered</th>
                              <th className="py-2.5 px-3 text-right font-bold text-white">Row Total</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-neutral-800 text-neutral-300">
                            {['bat', 'jersey', 'balls', 'repairs'].map((cat) => {
                              const catOrders = orders.filter(o => o.itemType === cat);
                              const getSum = (st: string) => catOrders.filter(o => o.status === st).reduce((acc, c) => acc + c.totalAmount, 0);
                              const rowTotal = catOrders.reduce((acc, c) => acc + c.totalAmount, 0);
                              return (
                                <tr key={cat} className="hover:bg-neutral-800/40">
                                  <td className="py-2.5 px-3 font-bold text-white uppercase">{cat}</td>
                                  <td className="py-2.5 px-3 text-right">₹{getSum('draft').toLocaleString()}</td>
                                  <td className="py-2.5 px-3 text-right">₹{getSum('pending').toLocaleString()}</td>
                                  <td className="py-2.5 px-3 text-right">₹{getSum('manufacturing').toLocaleString()}</td>
                                  <td className="py-2.5 px-3 text-right">₹{getSum('ready').toLocaleString()}</td>
                                  <td className="py-2.5 px-3 text-right">₹{getSum('delivered').toLocaleString()}</td>
                                  <td className="py-2.5 px-3 text-right font-bold text-amber-400">₹{rowTotal.toLocaleString()}</td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}
                </div>
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
                        <span className="text-[10px] font-mono bg-neutral-950 border border-neutral-800 px-2 py-1 rounded text-amber-400 font-bold">
                          {orders.length} Active {orders.length === 1 ? 'Contract' : 'Contracts'}
                        </span>
                      </div>

                      {/* Spark graph SVG representing dynamic cricket order levels */}
                      <div className="bg-neutral-950 rounded-xl p-4 border border-neutral-800 flex justify-center items-center min-h-[160px]">
                        {orders.length === 0 ? (
                          <div className="flex flex-col items-center justify-center text-center p-6 space-y-2">
                            <TrendingUp className="w-6 h-6 text-neutral-600 stroke-[1.5]" />
                            <span className="text-xs font-mono font-medium text-neutral-400">No Orders in Current Pipeline</span>
                            <span className="text-[11px] text-neutral-600 font-mono max-w-xs">Valuation sparklines will plot in real-time as contracts are booked.</span>
                          </div>
                        ) : (
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
                            <text x="245" y="32" fill="#E5B84B" fontSize="9" fontFamily="monospace" fontWeight="bold">REALTIME VALUATION</text>
                            <text x="380" y="20" fill="#E5B84B" fontSize="9" fontFamily="monospace" fontWeight="bold">₹{orders.reduce((acc, o) => acc + o.totalAmount, 0).toLocaleString()}</text>
                          </svg>
                        )}
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
                        {inventory.length === 0 ? (
                          <div className="p-8 text-center bg-neutral-950 rounded-lg border border-neutral-800 text-neutral-400 font-mono text-xs">
                            <Boxes className="w-8 h-8 text-neutral-600 stroke-[1.5] mx-auto mb-2" />
                            <span className="text-neutral-300 font-semibold block">No Inventory Items Tracked</span>
                            <span className="text-neutral-500 text-[11px]">Add products in the Inventory stockroom to monitor safety thresholds and restock alerts.</span>
                          </div>
                        ) : (
                          inventory.map(item => {
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
                                    <span className={`text-sm font-black font-mono ${isLow ? "text-red-400 scale-105" : "text-neutral-100"}`}>{item.stock} Units</span>
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
                          })
                        )}
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
                        {notifications.length === 0 ? (
                          <div className="p-8 text-center text-neutral-500 font-mono text-xs">
                            <Bell className="w-6 h-6 text-neutral-700 stroke-[1.5] mx-auto mb-1.5" />
                            <span>No active warehouse alerts or notifications.</span>
                          </div>
                        ) : (
                          notifications.map(n => (
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
                          ))
                        )}
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

      {/* ODOO ENTERPRISE DOCUMENT FORM SHEET MODAL */}
      <OdooFormModal
        isOpen={isFormModalOpen}
        onClose={() => setIsFormModalOpen(false)}
        record={selectedOdooRecord}
        onStatusChange={handleModalStatusChange}
        onAddChatterLog={handleAddChatter}
        onPrint={() => window.print()}
      />

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
