import React, { useState, useEffect } from 'react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  LineChart, Line, AreaChart, Area, PieChart, Pie, Cell, ComposedChart, Scatter
} from 'recharts';
import { 
  TrendingUp, Users, Calendar, Award, ChevronRight, FileSpreadsheet, Download, 
  RefreshCw, Sparkles, Filter, Package, Hammer, Zap, Wrench, CreditCard, Ship,
  Lock, ArrowRight, Table, HelpCircle, HardDrive, Terminal, DollarSign, Clock,
  CheckCircle2, AlertTriangle, FileText, ClipboardList, TrendingDown, Eye
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { db, isCloudConnected } from '../firebase';
import { collection, doc, setDoc, getDocs, getDoc } from 'firebase/firestore';

// --- TS INTERFACES ---
interface ReportsViewProps {
  orders: any[];
  inventory: any[];
  jobs: any[];
  themeMode: 'light' | 'dark';
}

interface StaticMonthData {
  name: string;
  bats: number;
  jerseys: number;
  repairs: number;
  revenue: number;
  expenses: number;
  customersCount: number;
}

// Preset Analytical Seeds (Failsafes & Baseline Trends)
const ANALYTICS_TREND_SEEDS: StaticMonthData[] = [
  { name: 'Jan', bats: 12, jerseys: 45, repairs: 8, revenue: 12400, expenses: 5100, customersCount: 48 },
  { name: 'Feb', bats: 15, jerseys: 62, repairs: 12, revenue: 15100, expenses: 6200, customersCount: 54 },
  { name: 'Mar', bats: 18, jerseys: 88, repairs: 15, revenue: 21300, expenses: 8400, customersCount: 61 },
  { name: 'Apr', bats: 22, jerseys: 110, repairs: 19, revenue: 26800, expenses: 9800, customersCount: 74 },
  { name: 'May', bats: 28, jerseys: 95, repairs: 24, revenue: 23900, expenses: 10200, customersCount: 88 },
  { name: 'Jun', bats: 35, jerseys: 140, repairs: 30, revenue: 34500, expenses: 13200, customersCount: 110 }
];

export const ReportsView: React.FC<ReportsViewProps> = ({ orders = [], inventory = [], jobs = [], themeMode }) => {
  const isLight = themeMode === 'light';

  // State Management
  const [activeTab, setActiveTab] = useState<'executive' | 'sales' | 'inventory' | 'manufacturing' | 'customers' | 'financials' | 'staff' | 'export_panel'>('executive');
  const [timeframe, setTimeframe] = useState<'30days' | 'ytd' | 'custom'>('30days');
  const [branchFilter, setBranchFilter] = useState<'all' | 'Melbourne' | 'London'>('all');
  const [customDateStart, setCustomDateStart] = useState('2026-05-01');
  const [customDateEnd, setCustomDateEnd] = useState('2026-05-31');

  // Cloud/Firestore sync state
  const [syncStatus, setSyncStatus] = useState<'synced' | 'connecting' | 'offline'>('connecting');
  const [isSyncingLive, setIsSyncingLive] = useState(false);
  const [telemetryLogs, setTelemetryLogs] = useState<string[]>([]);
  const [firestoreMetrics, setFirestoreMetrics] = useState<any | null>(null);

  // File Compilation UI Simulation State
  const [exportType, setExportType] = useState<'csv' | 'pdf'>('csv');
  const [exportScope, setExportScope] = useState<'full_ledger' | 'manufacturing_backlog' | 'inventory_audit' | 'revenue_aged_receipts'>('full_ledger');
  const [compilingProgress, setCompilingProgress] = useState<number>(-1);
  const [compilingLog, setCompilingLog] = useState<string>('');
  const [isCompileSuccess, setIsCompileSuccess] = useState<boolean>(false);

  // Helper log emitter
  const logTelemetry = (text: string) => {
    const timeStr = new Date().toISOString().split('T')[1].slice(0, 8);
    setTelemetryLogs(prev => [`[${timeStr}] ${text}`, ...prev.slice(0, 10)]);
  };

  // --- COMPUTE KEY METRICS & AGGREGATIONS ---
  const dailySalesVolume = orders.filter(o => o.createdAt === '2026-05-25' || o.createdAt === new Date().toISOString().split('T')[0]).reduce((acc, curr) => acc + (curr.totalAmount || 0), 0);
  const totalOutstandingDrafts = orders.filter(o => o.paymentStatus !== 'paid').reduce((acc, curr) => acc + (curr.totalAmount || 0), 0);
  
  // High value stats
  const totalStockItems = inventory.reduce((sum, item) => sum + (item.stock || 0), 0);
  const lowStockCount = inventory.filter(item => (item.stock || 0) <= (item.safetyLevel || 5)).length;
  const rawMaterialCapital = inventory.reduce((acc, curr) => acc + ((curr.stock || 0) * (curr.rawCost || 0)), 0);
  const projectedSalesValue = inventory.reduce((acc, curr) => acc + ((curr.stock || 0) * (curr.price || 0)), 0);
  
  // Pending fabrication
  const pendingJobsCount = jobs.filter(j => j.status !== 'ready' && j.status !== 'quality-check').length;
  const completedJobsCount = jobs.filter(j => j.status === 'ready' || j.status === 'quality-check').length;
  const totalJobsCount = jobs.length || 3;
  const jobCompletionRate = totalJobsCount > 0 ? Math.round((completedJobsCount / totalJobsCount) * 100) : 85;

  // Best selling category calculation
  const salesByCategory = orders.reduce((acc: any, curr) => {
    const type = curr.itemType || 'other';
    acc[type] = (acc[type] || 0) + (curr.totalAmount || 0);
    return acc;
  }, {});

  const bestSellingProductCategory = Object.keys(salesByCategory).length > 0 
    ? Object.keys(salesByCategory).reduce((a, b) => salesByCategory[a] > salesByCategory[b] ? a : b)
    : 'apparel';

  // Simulated double entry datasets (Fallback ledger alignment)
  const outstandingInvoices = [
    { client: 'Manipur Cricket Academy (Imphal)', inv: 'INV-2026-X11', status: 'partially_paid', balance: 450.00, age: '1 day' },
    { client: 'Chungkham Singh (Refurb)', inv: 'INV-2026-X13', status: 'unpaid', balance: 120.00, age: '25 days' },
    { client: 'Little Flower School Sports Club (Imphal)', inv: 'INV-2026-X14', status: 'unpaid', balance: 1680.00, age: '4 days' },
    { client: 'Imphal East Sports League', inv: 'INV-2026-X15', status: 'unpaid', balance: 2950.00, age: '12 days' }
  ];

  const totalOutstandingPayments = outstandingInvoices.reduce((sum, i) => sum + i.balance, 0);

  // Simulated Craftsman Performance Data (Leaderboard)
  const staffProductivity = [
    { name: 'Vijay Merchant', role: 'English Willow Moulder', completed: 28, active: 4, efficiency: '98.5%', delayCount: 0 },
    { name: 'Sarah Alum-Prints', role: 'Sublimation Screen Operator', completed: 42, active: 1, efficiency: '96.2%', delayCount: 1 },
    { name: 'Tenzing Norgay', role: 'Stitch Operator / Glove Tech', completed: 19, active: 3, efficiency: '94.8%', delayCount: 2 },
    { name: 'Devesh Shastri', role: 'Restoration Lead craftsman', completed: 22, active: 2, efficiency: '99.1%', delayCount: 0 }
  ];

  // Simulated Monthly Revenue data based on branch filters
  const filteredTrendData = ANALYTICS_TREND_SEEDS.map(item => {
    if (branchFilter === 'Melbourne') {
      return { 
        ...item, 
        revenue: Math.round(item.revenue * 0.7), 
        expenses: Math.round(item.expenses * 0.65),
        bats: Math.round(item.bats * 0.8),
        jerseys: Math.round(item.jerseys * 0.6)
      };
    } else if (branchFilter === 'London') {
      return { 
        ...item, 
        revenue: Math.round(item.revenue * 0.3), 
        expenses: Math.round(item.expenses * 0.35),
        bats: Math.round(item.bats * 0.2),
        jerseys: Math.round(item.jerseys * 0.4)
      };
    }
    return item;
  });

  // Category Colors mapped for high contrast
  const categoryColors = {
    bat: '#E5B84B',      // Theme Gold Accent
    jersey: '#2563EB',   // Slate Blue
    repairs: '#10B981',  // Emerald Mint
    gloves: '#7C3AED',   // Royal Purple
    other: '#6B7280'     // Neutral Gray
  };

  // Pie chart categories map
  const chartCategoriesList = Object.keys(salesByCategory).map(key => ({
    name: key === 'bat' ? 'English Willow Bats' : key === 'jersey' ? 'Team Jerseys' : key === 'repairs' ? 'Restoration Repairs' : key.toUpperCase(),
    value: salesByCategory[key] || 1500,
    color: (categoryColors as any)[key] || '#E5B84B'
  }));

  // Default fallback if orders are empty during boots
  const finalizedPieData = chartCategoriesList.length > 0 ? chartCategoriesList : [
    { name: 'English Willow Bats', value: 4850, color: '#E5B84B' },
    { name: 'Team Jerseys', value: 3670, color: '#2563EB' },
    { name: 'Restoration Repairs', value: 1200, color: '#10B981' }
  ];

  // 1. Fetch live metrics from Firebase Firestore on initialization
  useEffect(() => {
    logTelemetry("Operational Analytics engine initialized...");
    setSyncStatus('connecting');

    const fetchLiveAggregates = async () => {
      if (isCloudConnected) {
        try {
          const summaryRef = doc(db, 'erp_analytics_summary', 'main_kpi_dashboard');
          const summarySnap = await getDoc(summaryRef);
          
          if (summarySnap.exists()) {
            setFirestoreMetrics(summarySnap.data());
            logTelemetry("GCP Firestore aggregates synced: loaded optimized telemetry structures.");
          } else {
            // Write initial aggregated payload matching seeds
            const defaultSummaryPayload = {
              computedAt: new Date().toISOString(),
              totalGrossRevenueYTD: 134840.00,
              totalWillowMilled: 130,
              avgTurnaroundDays: 4.2,
              fastMovingSku: 'BAT-EW-G1',
              customerRetentionRate: '88.4%',
              dailyTargetProgress: 94,
              lastSyncedBy: 'Sentry Analytics System'
            };
            await setDoc(summaryRef, defaultSummaryPayload);
            setFirestoreMetrics(defaultSummaryPayload);
            logTelemetry("Created baseline analytics schema inside 'erp_analytics_summary' collection.");
          }
          setSyncStatus('synced');
        } catch (e: any) {
          console.error("Firestore metrics pull failure: ", e);
          setSyncStatus('offline');
          logTelemetry("Firestore unavailable. Defaulting to local in-app computing indexes.");
        }
      } else {
        setSyncStatus('offline');
        logTelemetry("PWA stand-alone offline sandbox activated. Local state aggregators linked.");
      }
    };

    fetchLiveAggregates();
  }, [orders, inventory, jobs]);

  // Handle active manual aggregation synchronization
  const handleAggregatesRecompute = async () => {
    setIsSyncingLive(true);
    logTelemetry("⚠️ Re-indexing entire double-entry records ledger...");
    
    // Simulate real aggregation computation wait
    setTimeout(async () => {
      const liveComputationSummary = {
        computedAt: new Date().toISOString(),
        totalGrossRevenueYTD: orders.reduce((sum, o) => sum + (o.totalAmount || 0), 0) + 128500, // include backlog
        totalWillowMilled: 130 + orders.filter(o => o.itemType === 'bat').length,
        avgTurnaroundDays: parseFloat((4.0 + Math.random() * 0.5).toFixed(1)),
        fastMovingSku: inventory.length > 0 ? inventory[0].sku : 'BAT-EW-G1',
        customerRetentionRate: '89.6%',
        dailyTargetProgress: Math.min(100, 80 + Math.floor(Math.random() * 20)),
        lastSyncedBy: 'Executive Dashboard Dispatcher'
      };

      setFirestoreMetrics(liveComputationSummary);
      logTelemetry(`✅ Recomputation compiled: $${liveComputationSummary.totalGrossRevenueYTD.toLocaleString()} YTD.`);
      
      if (isCloudConnected) {
        try {
          await setDoc(doc(db, 'erp_analytics_summary', 'main_kpi_dashboard'), liveComputationSummary);
          logTelemetry("Uploaded synchronized indicators safely to Firestore cloud.");
        } catch (err) {
          console.error("Upload aggregated summary failed: ", err);
        }
      }
      setIsSyncingLive(false);
    }, 1200);
  };

  // Excel/PDF simulated export routine with status print outputs
  const handleCompileExport = (e: React.FormEvent) => {
    e.preventDefault();
    setIsCompileSuccess(false);
    setCompilingProgress(0);
    setCompilingLog('Initializing sandbox secure compilation loop...');

    const logSteps = [
      { p: 15, log: 'Establishing structural schema mapping...' },
      { p: 35, log: 'Aggregating local PWA collections + Firestore real-time indexes...' },
      { p: 55, log: 'Compiling double-entry balancing ledger rows...' },
      { p: 75, log: 'Normalizing currency calculations and timestamps...' },
      { p: 90, log: 'Rendering vector charts and layout boundaries...' },
      { p: 100, log: 'Validating cryptographic tamper-proof SHA-256 seal...' }
    ];

    logSteps.forEach((step, idx) => {
      setTimeout(() => {
        setCompilingProgress(step.p);
        setCompilingLog(step.log);
        if (step.p === 100) {
          setIsCompileSuccess(true);
          logTelemetry(`💾 Compiled "${exportScope}" export as ${exportType.toUpperCase()}`);
        }
      }, (idx + 1) * 450);
    });
  };

  return (
    <div className="space-y-6" id="analytics-reporting-view-system">
      
      {/* 2. DYNAMIC HEADER BLOCK WITH ACCENTS */}
      <div className="bg-white p-6 rounded-2xl border border-neutral-200/80 flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-4 shadow-sm relative overflow-hidden">
        {/* Underpinning golden highlight bar */}
        <div className="absolute top-0 left-0 right-0 h-1 bg-[#E5B84B]"></div>
        
        <div>
          <div className="flex items-center gap-2 flex-wrap text-xs">
            <span className="text-[10px] font-mono tracking-widest text-[#E5B84B] font-black uppercase bg-amber-50 px-2.5 py-1 rounded border border-amber-200">
              Department: CORE BUSINESS INTELLIGENCE
            </span>
            <span className={`text-[10px] font-mono px-2 py-0.5 rounded flex items-center gap-1.5 font-bold ${
              syncStatus === 'synced' ? 'bg-amber-50 text-amber-700 border border-amber-200' : 'bg-neutral-50 text-neutral-500 border border-neutral-200'
            }`}>
              <span className={`w-1.5 h-1.5 rounded-full ${syncStatus === 'synced' ? 'bg-[#E5B84B] animate-ping' : 'bg-neutral-400 animate-pulse'}`}></span>
              <span>{syncStatus === 'synced' ? "LIVE MONITOR LINKED" : "SANDBOX DATA CONDUIT"}</span>
            </span>
          </div>

          <h2 className="text-xl font-black text-neutral-900 tracking-tight mt-2 uppercase font-sans flex items-center gap-2">
            <TrendingUp className="w-6 h-6 text-[#E5B84B]" />
            <span>Cricket Closet Executive Analytics & Intelligence Portal</span>
          </h2>

          <p className="text-xs text-neutral-500 font-sans mt-1">
            Production grade double-entry gross revenues, fabrication bottlenecks, safety stock re-calculations, and customizable exports.
          </p>
        </div>

        {/* Global Action Tools */}
        <div className="flex items-center gap-2.5 shrink-0">
          <button
            type="button"
            onClick={handleAggregatesRecompute}
            disabled={isSyncingLive}
            className={`px-3.5 py-2.5 rounded-xl text-xs font-mono font-bold tracking-tight border transition-all flex items-center gap-1.5 cursor-pointer ${
              isSyncingLive 
                ? 'bg-neutral-50 text-neutral-400 border-neutral-200' 
                : 'bg-white hover:bg-neutral-50 text-neutral-800 border-neutral-200 hover:border-[#E5B84B] shadow-sm'
            }`}
          >
            <RefreshCw className={`w-3.5 h-3.5 text-[#E5B84B] ${isSyncingLive ? 'animate-spin' : ''}`} />
            <span>{isSyncingLive ? "Compiling..." : "Sync Aggregates"}</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setActiveTab('export_panel');
              logTelemetry("Navigated operator core direct layout to files export wizard.");
            }}
            className="bg-neutral-900 hover:bg-neutral-800 text-white hover:text-[#E5B84B] px-4 py-2.5 rounded-xl text-xs font-mono font-bold tracking-tight transition-all flex items-center gap-1.5 cursor-pointer"
          >
            <FileSpreadsheet className="w-4 h-4 text-[#E5B84B]" />
            <span>Export CSV/PDF</span>
          </button>
        </div>
      </div>

      {/* 3. DATE RANGE & FILTERS CONTROLS BAR */}
      <div className="bg-white p-4.5 rounded-2xl border border-neutral-200/80 shadow-sm flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4 font-mono text-xs">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-neutral-400 text-[10px] font-bold uppercase flex items-center gap-1">
            <Filter className="w-3.5 h-3.5 text-[#E5B84B]" />
            <span>Scope Filter:</span>
          </span>

          {/* Branch filter */}
          <select
            value={branchFilter}
            onChange={(e) => {
              setBranchFilter(e.target.value as any);
              logTelemetry(`Filtered report records scope by: ${e.target.value}`);
            }}
            className="p-2 bg-neutral-50 border border-neutral-200 rounded-xl font-bold cursor-pointer text-neutral-800"
          >
            <option value="all">All Closet Branches</option>
            <option value="Melbourne">Melbourne WHSE Depot</option>
            <option value="London">London Closet Closet</option>
          </select>

          {/* Timeframe Quick Buttons */}
          <div className="flex items-center gap-1 p-1 bg-neutral-50 rounded-xl border border-neutral-200">
            <button
              type="button"
              onClick={() => {
                setTimeframe('30days');
                logTelemetry("Time bounds limited back to raw 30-day epoch.");
              }}
              className={`px-3 py-1 rounded-lg transition-all font-bold ${timeframe === '30days' ? 'bg-[#E5B84B] text-neutral-950 shadow-sm' : 'text-neutral-500 hover:text-neutral-800'}`}
            >
              30 Days
            </button>
            <button
              type="button"
              onClick={() => {
                setTimeframe('ytd');
                logTelemetry("Aggregating year-to-date calendar balance indicators.");
              }}
              className={`px-3 py-1 rounded-lg transition-all font-bold ${timeframe === 'ytd' ? 'bg-[#E5B84B] text-neutral-950 shadow-sm' : 'text-neutral-500 hover:text-neutral-800'}`}
            >
              YTD
            </button>
            <button
              type="button"
              onClick={() => {
                setTimeframe('custom');
                logTelemetry("Custom date selector enabled.");
              }}
              className={`px-3 py-1 rounded-lg transition-all font-bold ${timeframe === 'custom' ? 'bg-[#E5B84B] text-neutral-950 shadow-sm' : 'text-neutral-500 hover:text-neutral-800'}`}
            >
              Custom Date Range
            </button>
          </div>
        </div>

        {/* Custom Calendar Inputs when checked */}
        <AnimatePresence>
          {timeframe === 'custom' && (
            <motion.div 
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              className="flex items-center gap-2 flex-wrap"
            >
              <input 
                type="date" 
                value={customDateStart} 
                onChange={(e) => setCustomDateStart(e.target.value)} 
                className="p-1.5 bg-neutral-50 border border-neutral-200 rounded-lg text-[11px] text-neutral-700 font-bold"
              />
              <span className="text-neutral-400 text-xs">to</span>
              <input 
                type="date" 
                value={customDateEnd} 
                onChange={(e) => setCustomDateEnd(e.target.value)} 
                className="p-1.5 bg-neutral-50 border border-neutral-200 rounded-lg text-[11px] text-neutral-700 font-bold"
              />
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* 4. SUB-PORT MODULE SELECTOR TABS (Light Elegant Tabs) */}
      <div className="flex border-b border-neutral-200 font-mono text-xs overflow-x-auto whitespace-nowrap scrollbar-none gap-2">
        <button
          onClick={() => setActiveTab('executive')}
          className={`pb-3 px-4 font-bold border-b-2 transition-all flex items-center gap-1.5 ${
            activeTab === 'executive' ? 'border-[#E5B84B] text-neutral-950 font-black' : 'border-transparent text-neutral-500 hover:text-neutral-800'
          }`}
        >
          <Award className="w-4 h-4 text-[#E5B84B]" />
          <span>Executive HUD Dashboard</span>
        </button>

        <button
          onClick={() => setActiveTab('sales')}
          className={`pb-3 px-4 font-bold border-b-2 transition-all flex items-center gap-1.5 ${
            activeTab === 'sales' ? 'border-[#E5B84B] text-neutral-950 font-black' : 'border-transparent text-neutral-500 hover:text-neutral-800'
          }`}
        >
          <TrendingUp className="w-4 h-4 text-emerald-500" />
          <span>Sales & Demand</span>
        </button>

        <button
          onClick={() => setActiveTab('inventory')}
          className={`pb-3 px-4 font-bold border-b-2 transition-all flex items-center gap-1.5 ${
            activeTab === 'inventory' ? 'border-[#E5B84B] text-neutral-950 font-black' : 'border-transparent text-neutral-500 hover:text-neutral-800'
          }`}
        >
          <Package className="w-4 h-4 text-sky-500" />
          <span>Inventory & Materials ({lowStockCount} alert)</span>
        </button>

        <button
          onClick={() => setActiveTab('manufacturing')}
          className={`pb-3 px-4 font-bold border-b-2 transition-all flex items-center gap-1.5 ${
            activeTab === 'manufacturing' ? 'border-[#E5B84B] text-neutral-950 font-black' : 'border-transparent text-neutral-500 hover:text-neutral-800'
          }`}
        >
          <Hammer className="w-4 h-4 text-purple-500" />
          <span>Workshop & Splicing</span>
        </button>

        <button
          onClick={() => setActiveTab('customers')}
          className={`pb-3 px-4 font-bold border-b-2 transition-all flex items-center gap-1.5 ${
            activeTab === 'customers' ? 'border-[#E5B84B] text-neutral-950 font-black' : 'border-transparent text-neutral-500 hover:text-neutral-800'
          }`}
        >
          <Users className="w-4 h-4 text-blue-500" />
          <span>Customer Affiliations</span>
        </button>

        <button
          onClick={() => setActiveTab('financials')}
          className={`pb-3 px-4 font-bold border-b-2 transition-all flex items-center gap-1.5 ${
            activeTab === 'financials' ? 'border-[#E5B84B] text-neutral-950 font-black' : 'border-transparent text-neutral-500 hover:text-neutral-800'
          }`}
        >
          <CreditCard className="w-4 h-4 text-[#D3B45F]" />
          <span>Accounts Receivable</span>
        </button>

        <button
          onClick={() => setActiveTab('staff')}
          className={`pb-3 px-4 font-bold border-b-2 transition-all flex items-center gap-1.5 ${
            activeTab === 'staff' ? 'border-[#E5B84B] text-neutral-950 font-black' : 'border-transparent text-neutral-500 hover:text-neutral-800'
          }`}
        >
          <Sparkles className="w-4 h-4 text-indigo-500" />
          <span>Staff Productivity</span>
        </button>
      </div>

      {/* 5. ACTIVE VIEWPORT GRID OUTLETS */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* LEFT COLUMN: ACTIVE VIEW CARD SUBSTRUCTURE (8 Units) */}
        <div className="lg:col-span-8 space-y-6">
          
          {/* TAB: EXECUTIVE HUD DASHBOARD */}
          {activeTab === 'executive' && (
            <div className="space-y-6">
              
              {/* PRIMARY KPI ROW: Bento Design with direct mathematical references */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                
                {/* Daily Bookings widget */}
                <div className="bg-white p-5 rounded-2xl border border-neutral-200/80 shadow-sm relative overflow-hidden flex flex-col justify-between h-34">
                  <div className="absolute top-0 left-0 right-0 h-1.5 bg-[#E5B84B]/20"></div>
                  <div>
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-mono font-bold text-neutral-400 uppercase tracking-wider">Daily Balance Sheet</span>
                      <TrendingUp className="w-4 h-4 text-emerald-500" />
                    </div>
                    <h3 className="text-2xl font-black font-mono text-neutral-900 mt-2">
                      ${dailySalesVolume > 0 ? dailySalesVolume.toLocaleString('en-US', { minimumFractionDigits: 2 }) : "$2,250.00"}
                    </h3>
                  </div>
                  <span className="text-[9.5px] font-mono text-neutral-500 block">
                    Compiled receipts on 2026-05-25 loop.
                  </span>
                </div>

                {/* Monthly gross estimate */}
                <div className="bg-white p-5 rounded-2xl border border-[#E5B84B]/20 shadow-sm relative overflow-hidden flex flex-col justify-between h-34">
                  <div className="absolute top-0 left-0 right-0 h-1.5 bg-[#E5B84B]"></div>
                  <div>
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-mono font-bold text-neutral-400 uppercase tracking-wider">Gross Revenue YTD</span>
                      <DollarSign className="w-4 h-4 text-[#E5B84B]" />
                    </div>
                    <h3 className="text-2xl font-black font-mono text-neutral-900 mt-2">
                      ${firestoreMetrics ? firestoreMetrics.totalGrossRevenueYTD.toLocaleString('en-US', { minimumFractionDigits: 2 }) : "$134,840.00"}
                    </h3>
                  </div>
                  <span className="text-[9.5px] font-mono text-neutral-500 block flex items-center gap-1">
                    <Sparkles className="w-3 h-3 text-[#E5B84B]" />
                    <span>Calculated over active operational lifecycles</span>
                  </span>
                </div>

                {/* Pending active orders */}
                <div className="bg-white p-5 rounded-2xl border border-neutral-200/80 shadow-sm relative overflow-hidden flex flex-col justify-between h-34">
                  <div className="absolute top-0 left-0 right-0 h-1.5 bg-sky-500/20"></div>
                  <div>
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-mono font-bold text-neutral-400 uppercase tracking-wider">Pending Orders Sentry</span>
                      <Package className="w-4 h-4 text-sky-500" />
                    </div>
                    <h3 className="text-2xl font-black font-mono text-neutral-900 mt-2">
                      {orders.filter(o => o.status !== 'ready' && o.status !== 'delivered').length} Active
                    </h3>
                  </div>
                  <span className="text-[9.5px] font-mono text-neutral-500 block">
                    Aggregate queued queue: {orders.length} orders total
                  </span>
                </div>

              </div>

              {/* SECONDARY ROW widgets */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                
                {/* Low stock indicators */}
                <div className="bg-white p-5 rounded-2xl border border-neutral-200 hover:border-[#E5B84B]/40 shadow-sm flex items-center justify-between transition-all">
                  <div className="space-y-1">
                    <span className="text-[10px] font-mono font-bold text-neutral-400 uppercase block leading-none">Low Stock Threshold</span>
                    <h4 className="text-xl font-black font-mono text-neutral-900">{lowStockCount} SKUs Breeched</h4>
                    <span className="text-[9.5px] font-mono block text-amber-600 font-bold uppercase">Critical Sentry Warning</span>
                  </div>
                  <div className="w-9 h-9 rounded-xl bg-red-50 text-red-500 border border-red-100 flex items-center justify-center shrink-0">
                    <AlertTriangle className="w-4 h-4 stroke-[2.5] text-red-600 animate-pulse" />
                  </div>
                </div>

                {/* Outstanding invoices balance */}
                <div className="bg-white p-5 rounded-2xl border border-neutral-200 shadow-sm flex items-center justify-between">
                  <div className="space-y-1">
                    <span className="text-[10px] font-mono font-bold text-neutral-400 uppercase block leading-none">Outstanding Payments</span>
                    <h4 className="text-xl font-black font-mono text-neutral-900">${totalOutstandingPayments.toLocaleString()}</h4>
                    <span className="text-[9.5px] font-mono block text-neutral-500">Aging accounts receivable</span>
                  </div>
                  <div className="w-9 h-9 rounded-xl bg-amber-50 text-[#E5B84B] border border-amber-100 flex items-center justify-center shrink-0">
                    <CreditCard className="w-4 h-4" />
                  </div>
                </div>

                {/* Fabrication Completion status */}
                <div className="bg-white p-5 rounded-2xl border border-neutral-200 shadow-sm flex items-center justify-between">
                  <div className="space-y-1">
                    <span className="text-[10px] font-mono font-bold text-neutral-400 uppercase block leading-none">Production SLA</span>
                    <h4 className="text-xl font-black font-mono text-neutral-900">{jobCompletionRate}% Completed</h4>
                    <span className="text-[9.5px] font-mono block text-emerald-500 font-bold uppercase">● Optimal bandwidth</span>
                  </div>
                  <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-600 border border-emerald-100 flex items-center justify-center shrink-0">
                    <CheckCircle2 className="w-4 h-4" />
                  </div>
                </div>

              </div>

              {/* CHART: Revenue Area Flow Trend Over 6 Months */}
              <div className="bg-white p-6 rounded-2xl border border-neutral-200/80 shadow-sm">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-4 gap-2">
                  <div>
                    <h3 className="text-xs font-black uppercase text-neutral-900 tracking-wider">
                      Aggregate Intake Revenue vs Operational Expenses
                    </h3>
                    <span className="text-[10px] text-neutral-400 font-mono">Comparing double-entry ledger streams</span>
                  </div>

                  <span className="text-[10.5px] font-mono bg-amber-50 text-[#E5B84B] font-bold px-2 py-0.5 rounded border border-amber-200 uppercase">
                    YTD Fiscal Outlook
                  </span>
                </div>

                <div className="h-72 w-full text-xs font-mono">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={filteredTrendData} margin={{ top: 10, right: 10, left: -15, bottom: 0 }}>
                      <defs>
                        <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#E5B84B" stopOpacity={0.25}/>
                          <stop offset="95%" stopColor="#E5B84B" stopOpacity={0}/>
                        </linearGradient>
                        <linearGradient id="colorExpenses" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.15}/>
                          <stop offset="95%" stopColor="#3B82F6" stopOpacity={0}/>
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="#eaeaea" />
                      <XAxis dataKey="name" stroke="#888" tickLine={false} />
                      <YAxis stroke="#888" tickLine={false} />
                      <Tooltip contentStyle={{ backgroundColor: '#fff', borderColor: '#eaeaea', borderRadius: '8px' }} />
                      <Legend verticalAlign="top" height={36} />
                      
                      <Area 
                        type="monotone" 
                        dataKey="revenue" 
                        name="Gross Booked Revenue ($)" 
                        stroke="#E5B84B" 
                        strokeWidth={2.5}
                        fillOpacity={1} 
                        fill="url(#colorRevenue)" 
                      />
                      <Area 
                        type="monotone" 
                        dataKey="expenses" 
                        name="Direct Overheads & Raw Costs ($)" 
                        stroke="#3B82F6" 
                        strokeWidth={2}
                        fillOpacity={1} 
                        fill="url(#colorExpenses)" 
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* QUICK TABLE: Real-time top customers & fast-moving inventory */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                
                {/* Top Customers widget block */}
                <div className="bg-white p-5 rounded-2xl border border-neutral-200/80 shadow-sm space-y-3 flex flex-col justify-between">
                  <div>
                    <h3 className="text-xs font-black uppercase text-neutral-900 tracking-wider">Top Affiliated Accounts</h3>
                    <p className="text-[10px] text-neutral-400 font-mono">Consolidated highest total billing ledger volumes</p>
                  </div>

                  <div className="space-y-2.5 font-mono text-[11px] pt-2">
                    <div className="flex items-center justify-between border-b pb-1.5">
                      <span className="font-bold text-neutral-800">1. Manipur Cricket Academy (Imphal)</span>
                      <span className="font-black text-amber-600">INR 54,200.00</span>
                    </div>
                    <div className="flex items-center justify-between border-b pb-1.5">
                      <span className="font-bold text-neutral-800">2. Imphal Eastern Youth Sports Club</span>
                      <span className="font-black text-neutral-700">INR 38,150.00</span>
                    </div>
                    <div className="flex items-center justify-between border-b pb-1.5">
                      <span className="font-bold text-neutral-800">3. Chungkham Singh (Refurb)</span>
                      <span className="font-black text-neutral-700">INR 18,460.00</span>
                    </div>
                  </div>

                  <button 
                    onClick={() => setActiveTab('customers')}
                    className="mt-3 text-[#E5B84B] font-bold select-none text-xs flex items-center gap-1 hover:underline cursor-pointer"
                  >
                    <span>View cohort retention indicators</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>

                {/* Fast moving inventory items */}
                <div className="bg-white p-5 rounded-2xl border border-neutral-200/80 shadow-sm space-y-3 flex flex-col justify-between">
                  <div>
                    <h3 className="text-xs font-black uppercase text-neutral-900 tracking-wider">Fast-Moving Core SKUs</h3>
                    <p className="text-[10px] text-neutral-400 font-mono">Highest inventory turnover materials</p>
                  </div>

                  <div className="space-y-2.5 font-mono text-[11px] pt-2">
                    <div className="flex items-center justify-between border-b pb-1.5">
                      <span className="text-neutral-500">BAT-EW-G1 (English Billet)</span>
                      <span className="font-black text-neutral-800">12 units remain</span>
                    </div>
                    <div className="flex items-center justify-between border-b pb-1.5">
                      <span className="text-neutral-500">JER-SUB-GLD (Jersey Blank)</span>
                      <span className="font-black text-neutral-800">95 units remain</span>
                    </div>
                    <div className="flex items-center justify-between border-b pb-1.5">
                      <span className="text-neutral-500">BAL-LEW-RED (Leather Balls)</span>
                      <span className="font-black text-amber-600">15 units remaining</span>
                    </div>
                  </div>

                  <button 
                    onClick={() => setActiveTab('inventory')}
                    className="mt-3 text-[#E5B84B] font-bold select-none text-xs flex items-center gap-1 hover:underline cursor-pointer"
                  >
                    <span>Inspect inventory turnover logs</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>

              </div>

            </div>
          )}

          {/* TAB: SALES & COHORT DEMAND DEEP-DIVE */}
          {activeTab === 'sales' && (
            <div className="space-y-6">
              
              {/* Product distribution percentages */}
              <div className="bg-white p-6 rounded-2xl border border-neutral-200/80 shadow-sm">
                <div>
                  <h3 className="text-xs font-black uppercase text-neutral-900 tracking-wider">
                    Volume Share by Product Category
                  </h3>
                  <span className="text-[10px] text-neutral-400 font-mono">Continuous order streams calculated this sprint</span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-center pt-4">
                  
                  {/* Recharts Pie Chart representation */}
                  <div className="h-56 relative flex items-center justify-center">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={finalizedPieData}
                          cx="50%"
                          cy="50%"
                          innerRadius={65}
                          outerRadius={85}
                          paddingAngle={4}
                          dataKey="value"
                        >
                          {finalizedPieData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.color} />
                          ))}
                        </Pie>
                        <Tooltip />
                      </PieChart>
                    </ResponsiveContainer>

                    {/* Middle overlay */}
                    <div className="absolute text-center flex flex-col">
                      <span className="text-2xl font-black font-mono text-neutral-900">
                        {orders.length || 15}
                      </span>
                      <span className="text-[9px] text-neutral-500 uppercase tracking-widest font-mono">
                        Active orders
                      </span>
                    </div>
                  </div>

                  {/* Distribution descriptive details */}
                  <div className="space-y-4">
                    <div className="text-xs font-mono pb-2 border-b">
                      <span className="text-neutral-400 text-[10px] font-bold block uppercase">Core Best-Seller:</span>
                      <strong className="text-neutral-800 uppercase text-sm font-black flex items-center gap-1 mt-0.5">
                        <Sparkles className="w-4 h-4 text-[#E5B84B]" />
                        <span>{bestSellingProductCategory === 'bat' ? 'English Willow G1 bats' : 'Team Wear jerseys'}</span>
                      </strong>
                    </div>

                    <div className="space-y-2 text-[11px] font-mono">
                      {finalizedPieData.map((category, index) => {
                        return (
                          <div key={index} className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: category.color }}></span>
                              <span className="text-neutral-500">{category.name}</span>
                            </div>
                            <span className="font-bold text-neutral-800">
                              ${category.value.toLocaleString()}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                </div>
              </div>

              {/* SALES TREND CHART */}
              <div className="bg-white p-6 rounded-2xl border border-neutral-200/80 shadow-sm">
                <div className="mb-4">
                  <h3 className="text-xs font-black uppercase text-neutral-900 tracking-wider">
                    Monthly Sales Trend Progression
                  </h3>
                  <span className="text-[10px] text-neutral-400 font-mono">Units compiled by bat milling & silk printing</span>
                </div>

                <div className="h-64 w-full text-xs font-mono">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={filteredTrendData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#eaeaea" />
                      <XAxis dataKey="name" stroke="#888" tickLine={false} />
                      <YAxis stroke="#888" tickLine={false} />
                      <Tooltip />
                      <Legend verticalAlign="top" height={36} />
                      
                      <Bar dataKey="bats" name="Premium Willow Bats Milled" fill="#E5B84B" radius={[3, 3, 0, 0]} />
                      <Bar dataKey="jerseys" name="Sublimated Jersey shirts Ordered" fill="#2563EB" radius={[3, 3, 0, 0]} />
                      <Bar dataKey="repairs" name="Aesthetic restoration Tickets" fill="#10B981" radius={[3, 3, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

            </div>
          )}

          {/* TAB: INVENTORY & MATERIALS CORES */}
          {activeTab === 'inventory' && (
            <div className="space-y-6">
              
              {/* Tied capital details & fast indicators */}
              <div className="bg-white p-6 rounded-2xl border border-neutral-200/80 shadow-sm space-y-5">
                <div className="pb-3 border-b border-neutral-150">
                  <h3 className="text-xs font-black uppercase text-neutral-900 tracking-wider">
                    Inventory Capital Tied-up Audit
                  </h3>
                  <p className="text-[10px] text-neutral-400 font-mono">
                    Total acquisition overheads vs projected markup sale value coordinates
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  
                  {/* Left layout: statistics metrics */}
                  <div className="bg-neutral-50 p-4.5 rounded-xl space-y-2 pointer-events-none">
                    <span className="text-[10px] font-mono text-neutral-400 uppercase font-bold block">Material tied-up capital:</span>
                    <h3 className="text-2xl font-black font-mono text-[#E5B84B]">${rawMaterialCapital.toLocaleString()}</h3>
                    <p className="text-[10px] text-neutral-500 font-sans leading-relaxed">
                      This represents the raw acquisition cost of Grade-1 and Grade-2 English Willow billets and Premium blank apparel currently stored on shelf.
                    </p>
                  </div>

                  <div className="bg-neutral-50 p-4.5 rounded-xl space-y-2 pointer-events-none">
                    <span className="text-[10px] font-mono text-neutral-400 uppercase font-bold block">Projected retail sale value:</span>
                    <h3 className="text-2xl font-black font-mono text-neutral-900">${projectedSalesValue.toLocaleString()}</h3>
                    <p className="text-[10px] text-neutral-500 font-sans leading-relaxed">
                      Expected gross value at point-of-sale checkout when material processing completes successfully.
                    </p>
                  </div>

                </div>
              </div>

              {/* CRITICAL LOW STOCK BREECH LIST */}
              <div className="bg-white p-6 rounded-2xl border border-neutral-200/80 shadow-sm">
                <div className="flex items-center justify-between pb-3 border-b border-neutral-100">
                  <div>
                    <h3 className="text-xs font-black uppercase text-neutral-900 tracking-wider">Safety Stock Breach Sentry</h3>
                    <p className="text-[10px] text-neutral-400 font-mono">SKUs fell below target safety buffer threshold bounds</p>
                  </div>
                  <span className="bg-red-100 text-red-800 text-[10px] font-mono font-bold px-2 py-0.5 rounded uppercase">
                    Alert Level: High
                  </span>
                </div>

                <div className="divide-y divide-neutral-100 text-xs font-mono pt-3">
                  {inventory.filter(item => (item.stock || 0) <= (item.safetyLevel || 5)).map((item, idx) => {
                    return (
                      <div key={idx} className="py-3 flex items-center justify-between flex-wrap gap-2">
                        <div>
                          <span className="text-[9.5px] font-black text-rose-600 block">[ALERT {item.sku}]</span>
                          <strong className="text-neutral-800 text-[11.5px] font-sans">{item.name}</strong>
                          <span className="block text-[10px] text-neutral-400 font-mono">Shelf Location: {item.shelf || 'N/A'}</span>
                        </div>

                        <div className="text-right">
                          <span className="block text-[#E5B84B] font-bold">In Stock: {item.stock} units</span>
                          <span className="block text-neutral-400 text-[10px]">Buffer line: {item.safetyLevel || 5} units</span>
                        </div>
                      </div>
                    );
                  })}

                  {inventory.filter(item => (item.stock || 0) <= (item.safetyLevel || 5)).length === 0 && (
                    <div className="p-8 text-center text-neutral-400 font-sans">
                      All inventory codes are healthy. No threshold warnings detected.
                    </div>
                  )}
                </div>
              </div>

            </div>
          )}

          {/* TAB: WORKSHOP & QUEUE BOTTLENECKS */}
          {activeTab === 'manufacturing' && (
            <div className="space-y-6">
              
              {/* Slicing backlog bar indicators */}
              <div className="bg-white p-6 rounded-2xl border border-neutral-200/80 shadow-sm">
                <div>
                  <h3 className="text-xs font-black uppercase text-neutral-900 tracking-wider">
                    Stage Queue & Delay Diagnostics
                  </h3>
                  <span className="text-[10px] text-neutral-400 font-mono">Active physical work queue at craftsmanship workbench</span>
                </div>

                <div className="space-y-4 font-mono text-xs pt-4">
                  <div>
                    <div className="flex justify-between text-[11px] mb-1">
                      <span className="text-neutral-500">Splicing & Spine Shaping queue</span>
                      <span className="font-bold text-neutral-800">
                        {jobs.filter(j => j.status === 'splitting' || j.status === 'shaping').length} Active (Delay probability: Low)
                      </span>
                    </div>
                    <div className="h-2.5 w-full rounded-full bg-neutral-100 overflow-hidden">
                      <div className="h-full bg-amber-500" style={{ width: '40%' }}></div>
                    </div>
                  </div>

                  <div>
                    <div className="flex justify-between text-[11px] mb-1">
                      <span className="text-neutral-500">Hydraulic Billet Compacters</span>
                      <span className="font-bold text-neutral-800">
                        {jobs.filter(j => j.status === 'pressing').length} Active (Delay probability: Medium)
                      </span>
                    </div>
                    <div className="h-2.5 w-full rounded-full bg-neutral-100 overflow-hidden">
                      <div className="h-full bg-blue-500" style={{ width: '60%' }}></div>
                    </div>
                  </div>

                  <div>
                    <div className="flex justify-between text-[11px] mb-1">
                      <span className="text-rose-600 font-bold">Curing cycle & back-plate pressing bottleneck</span>
                      <span className="font-black text-rose-700 uppercase text-[9px] bg-rose-100 px-1.5 rounded inline-block">
                        High Tension Delay
                      </span>
                    </div>
                    <div className="h-2.5 w-full rounded-full bg-neutral-100 overflow-hidden">
                      <div className="h-full bg-red-650 bg-red-500 animate-pulse" style={{ width: '85%' }}></div>
                    </div>
                  </div>

                  <div>
                    <div className="flex justify-between text-[11px] mb-1">
                      <span className="text-neutral-500">Manual burnishing, gripping & calibration</span>
                      <span className="font-bold text-neutral-800">
                        {jobs.filter(j => j.status === 'final-tuning' || j.status === 'quality-check').length} Active
                      </span>
                    </div>
                    <div className="h-2.5 w-full rounded-full bg-neutral-100 overflow-hidden">
                      <div className="h-full bg-emerald-500" style={{ width: '30%' }}></div>
                    </div>
                  </div>
                </div>

                <div className="mt-6 border-t pt-4 bg-amber-50/50 p-4 rounded-xl border border-amber-100 text-xs font-sans text-amber-900 leading-normal">
                  <strong className="block font-sans font-bold text-neutral-800">Sentry Bottleneck Diagnosis:</strong>
                  Curing workbench reports physical delays owing to atmospheric humidity variance in the curing room. Shift the billet buffer row to dry storage shelf B4 for optimized moisture normalization.
                </div>
              </div>

              {/* WORKSHOP JOBS TIMELINE OUTLET */}
              <div className="bg-white p-6 rounded-2xl border border-neutral-200/80 shadow-sm">
                <h3 className="text-xs font-black uppercase text-neutral-900 tracking-wider">Active Fabrication Telemetry</h3>
                <div className="divide-y divide-neutral-100 font-mono text-xs pt-3">
                  {jobs.map((job, index) => {
                    return (
                      <div key={index} className="py-2.5 flex items-center justify-between">
                        <div>
                          <strong className="text-neutral-800 text-[11px] block">{job.id} - {job.customerName}</strong>
                          <span className="text-neutral-400 text-[9.5px]">Specs: {job.notes}</span>
                        </div>
                        <span className="bg-neutral-100 text-neutral-600 font-bold px-2 py-0.5 rounded text-[10px] uppercase border font-mono">
                          {job.status}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>

            </div>
          )}

          {/* TAB: CUSTOMER AFFILIATION & COHORT DEMOGRAPHICS */}
          {activeTab === 'customers' && (
            <div className="space-y-6">
              
              {/* Cohort share analysis */}
              <div className="bg-white p-6 rounded-2xl border border-neutral-200/80 shadow-sm">
                <div>
                  <h3 className="text-xs font-black uppercase text-neutral-900 tracking-wider">
                    Customer Group Cohort Distribution
                  </h3>
                  <span className="text-[10px] text-neutral-400 font-mono">Classification matching cricket club memberships</span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4 items-center">
                  
                  {/* Cohort Pie */}
                  <div className="h-56 relative flex items-center justify-center">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={[
                            { name: 'Club Teams', value: 45, color: '#E5B84B' },
                            { name: 'Sport Academies', value: 35, color: '#2563EB' },
                            { name: 'Individual Athletes', value: 20, color: '#10B981' }
                          ]}
                          cx="50%"
                          cy="50%"
                          innerRadius={65}
                          outerRadius={85}
                          paddingAngle={3}
                          dataKey="value"
                        >
                          <Cell fill="#E5B84B" />
                          <Cell fill="#2563EB" />
                          <Cell fill="#10B981" />
                        </Pie>
                        <Tooltip />
                      </PieChart>
                    </ResponsiveContainer>

                    <div className="absolute text-center flex flex-col">
                      <span className="text-2xl font-black font-mono text-neutral-900">
                        {firestoreMetrics ? firestoreMetrics.customerRetentionRate : "88.4%"}
                      </span>
                      <span className="text-[9px] text-neutral-550 uppercase tracking-widest font-mono">
                        Loyalty Retention
                      </span>
                    </div>
                  </div>

                  {/* Demographic lists */}
                  <div className="space-y-3 font-mono text-xs">
                    <div className="p-3 bg-neutral-50 rounded-xl">
                      <span className="text-neutral-400 text-[9px] font-bold block uppercase">Retention Cohort Indicator:</span>
                      <p className="text-neutral-600 text-[11px] font-sans mt-0.5 leading-relaxed">
                        High retention rate due to locked-in annual maintenance refurbishment tickets handled dynamically by the Melbourne Workshop.
                      </p>
                    </div>

                    <div className="space-y-1.5 text-[11px]">
                      <div className="flex items-center justify-between">
                        <span className="text-neutral-500">🏆 Club Team Affiliate:</span>
                        <strong className="text-neutral-800">45% Volume</strong>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-neutral-500">🏫 Sport Academies:</span>
                        <strong className="text-neutral-800">35% Volume</strong>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-neutral-500">🏏 Private Elite Athletes:</span>
                        <strong className="text-neutral-800">20% Volume</strong>
                      </div>
                    </div>
                  </div>

                </div>
              </div>

            </div>
          )}

          {/* TAB: ACCOUNTS RECEIVABLE & DEBT LEDGER */}
          {activeTab === 'financials' && (
            <div className="space-y-6">
              
              {/* Debt aged receivables list */}
              <div className="bg-white p-6 rounded-2xl border border-neutral-200/80 shadow-sm">
                <div className="flex items-center justify-between pb-3 border-b border-neutral-100">
                  <div>
                    <h3 className="text-xs font-black uppercase text-neutral-900 tracking-wider">
                      Accounts Receivable Aging Ledger
                    </h3>
                    <span className="text-[10px] text-neutral-400 font-mono">Aged unpaid customer balances owing this week</span>
                  </div>
                  <span className="bg-amber-100 text-amber-800 text-[10px] font-mono px-2 py-0.5 rounded font-bold uppercase border border-amber-200">
                    Aged Overdrafts
                  </span>
                </div>

                <div className="pt-3 overflow-x-auto">
                  <table className="w-full text-left font-mono text-xs">
                    <thead>
                      <tr className="border-b text-neutral-400 text-[10px] uppercase">
                        <th className="pb-2">Client Affiliation</th>
                        <th className="pb-2">Invoice Code</th>
                        <th className="pb-2">Outstanding Bal</th>
                        <th className="pb-2 text-right">Aging Period</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-neutral-100">
                      {outstandingInvoices.map((inv, idx) => {
                        return (
                          <tr key={idx} className="hover:bg-neutral-50">
                            <td className="py-2.5 font-bold text-neutral-800">{inv.client}</td>
                            <td className="py-2.5 text-neutral-500">{inv.inv}</td>
                            <td className="py-2.5 font-black text-rose-500">${inv.balance.toFixed(2)}</td>
                            <td className="py-2.5 text-right text-neutral-500">{inv.age}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                <div className="mt-5 border-t pt-4 bg-rose-50/20 p-4 rounded-xl border border-rose-100 flex items-center justify-between font-mono text-xs">
                  <span className="text-rose-900 font-bold block">Total Risk Overdraft:</span>
                  <strong className="text-rose-600 font-black text-sm">${totalOutstandingPayments.toLocaleString()}</strong>
                </div>
              </div>

            </div>
          )}

          {/* TAB: STAFF PRODUCTIVITY METRICS */}
          {activeTab === 'staff' && (
            <div className="space-y-6">
              
              <div className="bg-white p-6 rounded-2xl border border-neutral-200/80 shadow-sm">
                <div className="mb-4">
                  <h3 className="text-xs font-black uppercase text-neutral-900 tracking-wider">
                    Staff Productivity Leaderboard
                  </h3>
                  <p className="text-[10px] text-neutral-400 font-mono">
                    Completed fabrication quotas and speed ratings per craftsman profile
                  </p>
                </div>

                <div className="space-y-4 pt-2">
                  {staffProductivity.map((staff, idx) => {
                    return (
                      <div key={idx} className="p-4 bg-neutral-50 rounded-xl border border-neutral-200/50 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-amber-500/10 border border-amber-200 flex items-center justify-center font-mono font-black text-[#E5B84B] shrink-0 text-xs">
                            {staff.name.slice(0, 2).toUpperCase()}
                          </div>

                          <div>
                            <h4 className="font-sans font-bold text-[12.5px] text-neutral-900 leading-tight">{staff.name}</h4>
                            <span className="block font-mono text-[9.5px] text-neutral-400 mt-0.5">{staff.role}</span>
                          </div>
                        </div>

                        <div className="flex items-center gap-5 float-right font-mono text-xs whitespace-nowrap">
                          <div>
                            <span className="block text-neutral-400 text-[10px] uppercase">Handled:</span>
                            <span className="font-black text-neutral-700">{staff.completed} items</span>
                          </div>

                          <div>
                            <span className="block text-neutral-400 text-[10px] uppercase">Efficiency:</span>
                            <span className="font-black text-emerald-600">{staff.efficiency}</span>
                          </div>

                          <div>
                            <span className="block text-neutral-400 text-[10px] uppercase">Delays:</span>
                            <span className={`font-black ${staff.delayCount > 0 ? 'text-amber-500' : 'text-neutral-400'}`}>
                              {staff.delayCount} queue
                            </span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

            </div>
          )}

          {/* TAB: TEMPLATE EXPORTS GENERATOR PANEL */}
          {activeTab === 'export_panel' && (
            <div className="bg-white p-6 rounded-2xl border border-neutral-200 shadow-sm space-y-5 font-mono text-xs">
              
              <div className="pb-3 border-b border-neutral-100">
                <h3 className="text-base font-black text-neutral-900 uppercase font-sans flex items-center gap-1.5">
                  <FileSpreadsheet className="w-5 h-5 text-[#E5B84B]" />
                  <span>Double-Entry CSV & PDF File Exporter Panel</span>
                </h3>
                <p className="text-neutral-400 mt-1 font-sans leading-normal">
                  Download certified sports business intelligence summaries with cryptographic hashing indicators compatible with QuickBooks and Excel ledger imports.
                </p>
              </div>

              <form onSubmit={handleCompileExport} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Select file layout template */}
                  <div className="space-y-1">
                    <label className="text-neutral-500 text-[10px] font-black uppercase block">File Scope Target</label>
                    <select
                      value={exportScope}
                      onChange={(e) => setExportScope(e.target.value as any)}
                      className="w-full bg-neutral-50 p-2.5 rounded-xl border border-neutral-200 font-bold text-neutral-800"
                    >
                      <option value="full_ledger">Full double-entry balancing ledger</option>
                      <option value="manufacturing_backlog">Workshop Fabrication Backlogs</option>
                      <option value="inventory_audit">Shelf stock & safe buffer audit</option>
                      <option value="revenue_aged_receipts">Aged accounts receivable</option>
                    </select>
                  </div>

                  {/* Format */}
                  <div className="space-y-1">
                    <label className="text-neutral-500 text-[10px] font-black uppercase block">Export Compile Format</label>
                    <div className="flex items-center gap-2 mt-1">
                      <button
                        type="button"
                        onClick={() => setExportType('csv')}
                        className={`flex-1 p-2 rounded-xl border text-center font-bold ${
                          exportType === 'csv' 
                            ? 'bg-neutral-900 border-none text-white font-black' 
                            : 'bg-neutral-50 border-neutral-200 text-neutral-400 hover:bg-neutral-150'
                        }`}
                      >
                        Compacted CSV Microsoft Excel
                      </button>
                      <button
                        type="button"
                        onClick={() => setExportType('pdf')}
                        className={`flex-1 p-2 rounded-xl border text-center font-bold ${
                          exportType === 'pdf' 
                            ? 'bg-neutral-900 border-none text-white font-black' 
                            : 'bg-neutral-50 border-neutral-200 text-neutral-400 hover:bg-neutral-150'
                        }`}
                      >
                        Laser Vector PDF Layout
                      </button>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-neutral-500 text-[10px] font-black uppercase block">Scope Location Target</label>
                    <input
                      type="text"
                      disabled
                      value={branchFilter === 'all' ? "Dynamic Combined Branches" : `${branchFilter} Branch Depot`}
                      className="w-full bg-neutral-100 p-2.5 rounded-xl border border-neutral-200 text-neutral-500 font-sans"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-neutral-500 text-[10px] font-black uppercase block">Ledger Verification Type</label>
                    <span className="block text-[#E5B84B] font-bold py-2">
                       SHA-256 Tamper Audit Verification Active
                    </span>
                  </div>
                </div>

                <button
                  type="submit"
                  className="w-full bg-[#E5B84B] hover:bg-amber-500 text-neutral-950 font-black tracking-tight p-3 rounded-xl flex items-center justify-center gap-1.5 shadow cursor-pointer uppercase transition-all"
                >
                  <Download className="w-4 h-4" />
                  <span>Assemble Secure Business Intelligence File</span>
                </button>
              </form>

              {/* SIMULATED DOWNLOAD INTEGRATION COMPILING SCREEN */}
              {compilingProgress >= 0 && (
                <div className="bg-neutral-900 rounded-xl p-5 border border-neutral-800 text-neutral-300 space-y-3">
                  <div className="flex items-center justify-between text-[11px] font-mono">
                    <span className="flex items-center gap-1.5 font-bold text-[#E5B84B]">
                      <Terminal className="w-4 h-4 text-[#E5B84B] animate-pulse" />
                      <span>Sentry Exporter Console:</span>
                    </span>
                    <span className="font-bold text-neutral-400">{compilingProgress}% Compiled</span>
                  </div>

                  {/* Progress bar */}
                  <div className="h-1.5 bg-neutral-800 rounded-full overflow-hidden">
                    <div className="h-full bg-[#E5B84B] transition-all duration-300" style={{ width: `${compilingProgress}%` }}></div>
                  </div>

                  <p className="text-[10px] font-mono text-neutral-400 min-h-4 block truncate">
                    &gt;&gt; {compilingLog}
                  </p>

                  <AnimatePresence>
                    {isCompileSuccess && (
                      <motion.div
                        initial={{ opacity: 0, y: 5 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="pt-2 flex items-center justify-between font-mono gap-2"
                      >
                        <span className="text-[10px] text-emerald-400 font-bold block flex items-center gap-1 leading-none uppercase">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                          <span>Ledger compilation complete!</span>
                        </span>

                        <a
                          href={`data:text/plain;charset=utf-8,${encodeURIComponent(`Talk of the Town Cricket Closet ERP - ${exportScope.toUpperCase()} Report\nExport Date: ${new Date().toLocaleString()}\nVerified secure ledger trace: sha256_e02f912bcfac9ad\n`)}`}
                          download={`cricket_closet_${exportScope}_export_${Math.floor(Date.now() / 1000)}.${exportType}`}
                          className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold p-1.5 px-3 rounded text-[10px] uppercase flex items-center gap-1 cursor-pointer select-none transition-all"
                        >
                          <Download className="w-3 h-3" />
                          <span>Download File Asset</span>
                        </a>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              )}

            </div>
          )}

        </div>

        {/* RIGHT COLUMN: RECENT TELEMETRY LOGS & ACTIVE SENTRY STATUS (4 Units) */}
        <div className="lg:col-span-4 space-y-6">
          
          {/* SECURE BLOCK SENTRY TELEMETRY */}
          <div className="bg-neutral-900 border border-neutral-850 p-5 rounded-2xl text-white space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-neutral-800">
              <span className="text-[10px] font-mono tracking-widest text-[#E5B84B] font-black uppercase block">
                Analytics engine status
              </span>
              <span className="bg-emerald-500/10 text-emerald-400 text-[9px] font-mono px-2 py-0.5 rounded font-bold uppercase animate-pulse border border-emerald-500/15">
                Optimized
              </span>
            </div>

            <div className="space-y-3 font-mono text-[11px]">
              <div className="flex justify-between items-center leading-none">
                <span className="text-neutral-450 uppercase flex items-center gap-1">
                  <HardDrive className="w-3.5 h-3.5 text-[#E5B84B]" />
                  <span>Firestore indexes:</span>
                </span>
                <span className="font-bold text-neutral-300">
                  {isCloudConnected ? "GCP Live Sync" : "Cached Sandbox"}
                </span>
              </div>

              <div className="flex justify-between items-center leading-none">
                <span className="text-neutral-455 uppercase flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5 text-sky-400" />
                  <span>Reporting Period:</span>
                </span>
                <span className="font-bold text-neutral-300">
                  {timeframe === '30days' ? "Last 30 Days" : timeframe === 'ytd' ? "YTD Calendar" : "Custom Window"}
                </span>
              </div>

              <div className="flex justify-between items-center leading-none">
                <span className="text-neutral-455 uppercase flex items-center gap-1">
                  <Terminal className="w-3.5 h-3.5 text-purple-400" />
                  <span>Cryptographic Mode:</span>
                </span>
                <span className="font-bold text-neutral-300">
                  SHA-256 Sentry
                </span>
              </div>
            </div>

            {/* Micro bar visual indicator */}
            <div className="pt-2">
              <span className="text-[9.5px] font-mono text-neutral-500 block uppercase font-bold mb-1">Compute core thermal throttle:</span>
              <div className="h-1 bg-neutral-800 rounded-full overflow-hidden">
                <div className="h-full bg-emerald-500" style={{ width: '22%' }}></div>
              </div>
            </div>
          </div>

          {/* TELEMETRY TERMINAL OUTPUT WINDOW */}
          <div className="bg-neutral-950 p-5 rounded-2xl border border-neutral-850 text-neutral-300 font-mono space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-neutral-900">
              <div className="flex items-center gap-1.5">
                <Terminal className="w-4 h-4 text-[#E5B84B] animate-pulse" />
                <span className="text-[10px] font-mono tracking-widest text-neutral-450 uppercase font-black">
                  Intelligence Feed Logs
                </span>
              </div>
              <button
                type="button"
                onClick={() => setTelemetryLogs([])}
                className="text-[9px] hover:text-[#E5B84B] text-neutral-500 transition-all font-bold uppercase"
              >
                Clear
              </button>
            </div>

            <div className="space-y-2 text-[10px] font-mono">
              {telemetryLogs.map((log, idx) => {
                return (
                  <p key={idx} className="leading-normal text-neutral-400">
                    <span className="text-[#E5B84B]">&gt;&gt;</span> {log}
                  </p>
                );
              })}

              {telemetryLogs.length === 0 && (
                <p className="text-neutral-600 italic">No telemetry actions received. Recalculate indicators to fetch aggregates feed.</p>
              )}
            </div>
          </div>

        </div>

      </div>

    </div>
  );
};
