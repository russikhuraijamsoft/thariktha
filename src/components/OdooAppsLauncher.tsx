import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  ShoppingCart, Boxes, Hammer, CreditCard, Printer, Wrench, 
  Users, HardDrive, BarChart3, Bell, Database, FileText, 
  Settings, SlidersHorizontal, Search, X, Sparkles, CheckCircle2,
  Layers, Package, Shield, Receipt, Building2, Cpu
} from 'lucide-react';

export interface OdooAppItem {
  id: string;
  name: string;
  description: string;
  category: 'Operations' | 'Finance' | 'Customization' | 'Productivity';
  icon: React.ComponentType<{ className?: string }>;
  accentColor: string;
  badge?: string | number;
  badgeColor?: string;
}

interface OdooAppsLauncherProps {
  isOpen: boolean;
  onClose: () => void;
  activeTab: string;
  onSelectApp: (appId: string) => void;
  ordersCount?: number;
  lowStockCount?: number;
  unreadAlertsCount?: number;
}

export const ODOO_APPS: OdooAppItem[] = [
  {
    id: 'dashboard',
    name: 'Cockpit',
    description: 'Executive overview, real-time metrics & KPI summary',
    category: 'Operations',
    icon: BarChart3,
    accentColor: 'from-purple-600 to-indigo-700 text-purple-100',
  },
  {
    id: 'orders',
    name: 'Sales & Orders',
    description: 'Custom bat specs, quotes, customer orders & deliveries',
    category: 'Operations',
    icon: ShoppingCart,
    accentColor: 'from-blue-600 to-cyan-600 text-blue-100',
  },
  {
    id: 'inventory',
    name: 'Inventory',
    description: 'Stock levels, warehouse shelves, SKU tracking & safety limits',
    category: 'Operations',
    icon: Boxes,
    accentColor: 'from-emerald-600 to-teal-700 text-emerald-100',
  },
  {
    id: 'manufacturing',
    name: 'Manufacturing (MRP)',
    description: 'Bat milling, grain pressing, handle shaping & quality checks',
    category: 'Operations',
    icon: Hammer,
    accentColor: 'from-amber-600 to-yellow-700 text-amber-100',
  },
  {
    id: 'billing',
    name: 'Point of Sale & Invoicing',
    description: 'Counter checkout, customer invoicing, ledger & receipts',
    category: 'Finance',
    icon: CreditCard,
    accentColor: 'from-indigo-600 to-violet-700 text-indigo-100',
  },
  {
    id: 'servicing',
    name: 'Repairs & Servicing',
    description: 'Equipment refurbishing, handle rebinding, toe guard & oiling',
    category: 'Operations',
    icon: Wrench,
    accentColor: 'from-rose-600 to-red-700 text-rose-100',
  },
  {
    id: 'printing',
    name: 'Apparel & Sublimation',
    description: 'Team cricket jerseys, custom print layouts & roster batches',
    category: 'Operations',
    icon: Printer,
    accentColor: 'from-fuchsia-600 to-pink-700 text-fuchsia-100',
  },
  {
    id: 'customers',
    name: 'CRM & Clubs',
    description: 'Cricket academies, school clubs, player profiles & pipelines',
    category: 'Operations',
    icon: Users,
    accentColor: 'from-sky-600 to-blue-700 text-sky-100',
  },
  {
    id: 'reports',
    name: 'Reporting & Analytics',
    description: 'Sales velocity, stock turnover & workshop performance',
    category: 'Finance',
    icon: Layers,
    accentColor: 'from-teal-600 to-emerald-700 text-teal-100',
  },
  {
    id: 'drive',
    name: 'Drive Cloud Vault',
    description: 'Google Drive cloud document vault & CAD design storage',
    category: 'Productivity',
    icon: HardDrive,
    accentColor: 'from-sky-500 to-cyan-700 text-sky-100',
    badge: 'Drive',
    badgeColor: 'bg-sky-500 text-white'
  },
  {
    id: 'staff',
    name: 'Personnel & Employees',
    description: 'Craftsmen roster, attendance records & role permissions',
    category: 'Operations',
    icon: Users,
    accentColor: 'from-pink-600 to-rose-700 text-pink-100',
  },
  {
    id: 'notifications',
    name: 'Sentry & Audit Trail',
    description: 'Security logs, system alarms & automated stock alerts',
    category: 'Productivity',
    icon: Bell,
    accentColor: 'from-slate-600 to-zinc-700 text-slate-100',
  },
  {
    id: 'architecture',
    name: 'Cloud Firestore & Rules',
    description: 'Database schema blueprint, zero-trust rules & indexes',
    category: 'Customization',
    icon: Database,
    accentColor: 'from-teal-600 to-cyan-700 text-teal-100',
    badge: 'Rules',
    badgeColor: 'bg-teal-600 text-white'
  },
  {
    id: 'proposal',
    name: 'Bank DPR Proposal',
    description: 'State Bank of India official project report & financials',
    category: 'Finance',
    icon: FileText,
    accentColor: 'from-amber-600 to-orange-700 text-amber-100',
    badge: 'DPR',
    badgeColor: 'bg-amber-600 text-white'
  },
  {
    id: 'routing',
    name: 'Sentry Auth Routing',
    description: 'Identity verification & access control gate architecture',
    category: 'Customization',
    icon: SlidersHorizontal,
    accentColor: 'from-purple-600 to-violet-700 text-purple-100',
  },
  {
    id: 'settings',
    name: 'Settings & Branches',
    description: 'Multi-branch settings, currency rules & company preferences',
    category: 'Customization',
    icon: Settings,
    accentColor: 'from-neutral-700 to-stone-800 text-neutral-100',
  }
];

export const OdooAppsLauncher: React.FC<OdooAppsLauncherProps> = ({
  isOpen,
  onClose,
  activeTab,
  onSelectApp,
  ordersCount = 0,
  lowStockCount = 0,
  unreadAlertsCount = 0
}) => {
  const [search, setSearch] = useState('');
  const [activeCategory, setActiveCategory] = useState<string>('All');

  const categories = ['All', 'Operations', 'Finance', 'Productivity', 'Customization'];

  const filteredApps = useMemo(() => {
    return ODOO_APPS.filter(app => {
      const matchesSearch = 
        app.name.toLowerCase().includes(search.toLowerCase()) ||
        app.description.toLowerCase().includes(search.toLowerCase());
      const matchesCategory = activeCategory === 'All' || app.category === activeCategory;
      return matchesSearch && matchesCategory;
    });
  }, [search, activeCategory]);

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-start justify-center pt-8 sm:pt-16 p-4 overflow-y-auto">
        {/* Backdrop with Odoo-style slight blur */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="fixed inset-0 bg-neutral-950/80 backdrop-blur-md"
        />

        {/* Modal Container */}
        <motion.div
          initial={{ opacity: 0, scale: 0.96, y: -10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.96, y: -10 }}
          transition={{ duration: 0.18, ease: 'easeOut' }}
          className="relative w-full max-w-4xl bg-[#1e232a] text-neutral-100 rounded-2xl shadow-2xl border border-neutral-700/60 overflow-hidden z-10 flex flex-col max-h-[85vh]"
        >
          {/* Header Bar */}
          <div className="px-6 py-5 border-b border-neutral-700/60 flex items-center justify-between gap-4 bg-[#181c22]">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#714B67] to-[#51354a] flex items-center justify-center text-white shadow-md shadow-[#714B67]/30">
                <div className="grid grid-cols-3 gap-0.5 p-1">
                  <div className="w-1.5 h-1.5 rounded-xs bg-white"></div>
                  <div className="w-1.5 h-1.5 rounded-xs bg-white"></div>
                  <div className="w-1.5 h-1.5 rounded-xs bg-white"></div>
                  <div className="w-1.5 h-1.5 rounded-xs bg-white"></div>
                  <div className="w-1.5 h-1.5 rounded-xs bg-white"></div>
                  <div className="w-1.5 h-1.5 rounded-xs bg-white"></div>
                  <div className="w-1.5 h-1.5 rounded-xs bg-white"></div>
                  <div className="w-1.5 h-1.5 rounded-xs bg-white"></div>
                  <div className="w-1.5 h-1.5 rounded-xs bg-white"></div>
                </div>
              </div>
              <div>
                <h2 className="text-base font-bold text-white tracking-tight flex items-center gap-2">
                  <span>Odoo Enterprise Apps</span>
                  <span className="text-[10px] font-mono text-neutral-400 bg-neutral-800 px-2 py-0.5 rounded-md border border-neutral-700">
                    v18.0 Standard
                  </span>
                </h2>
                <p className="text-xs text-neutral-400">Talk of the Town Cricket Closet ERP Suite</p>
              </div>
            </div>

            <button
              onClick={onClose}
              className="p-2 rounded-xl text-neutral-400 hover:text-white hover:bg-neutral-800 transition cursor-pointer"
              title="Close (Esc)"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Search & Filter Toolbar */}
          <div className="px-6 py-3.5 bg-[#1b1f26] border-b border-neutral-700/40 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
            {/* Search Input */}
            <div className="relative flex-1 max-w-md">
              <Search className="w-4 h-4 text-neutral-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search an app or module... (e.g. Sales, Stock, POS)"
                autoFocus
                className="w-full bg-[#12151a] border border-neutral-700 rounded-xl pl-10 pr-4 py-2 text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-[#714B67] focus:ring-1 focus:ring-[#714B67] transition"
              />
              {search && (
                <button
                  onClick={() => setSearch('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-neutral-400 hover:text-white"
                >
                  Clear
                </button>
              )}
            </div>

            {/* Category Segmented Tabs */}
            <div className="flex items-center gap-1 overflow-x-auto pb-1 sm:pb-0">
              {categories.map((cat) => (
                <button
                  key={cat}
                  onClick={() => setActiveCategory(cat)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition cursor-pointer whitespace-nowrap ${
                    activeCategory === cat
                      ? 'bg-[#714B67] text-white shadow-sm'
                      : 'text-neutral-400 hover:text-white hover:bg-neutral-800'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>

          {/* Apps Grid */}
          <div className="p-6 overflow-y-auto flex-1">
            {filteredApps.length === 0 ? (
              <div className="py-16 text-center text-neutral-400">
                <Search className="w-8 h-8 mx-auto text-neutral-600 mb-2" />
                <p className="text-sm">No applications found matching "{search}"</p>
                <button
                  onClick={() => { setSearch(''); setActiveCategory('All'); }}
                  className="mt-3 text-xs text-[#d97706] hover:underline"
                >
                  Reset search filter
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                {filteredApps.map((app) => {
                  const Icon = app.icon;
                  const isCurrent = activeTab === app.id;
                  
                  // Dynamic live badges
                  let appBadge = app.badge;
                  let appBadgeColor = app.badgeColor;
                  if (app.id === 'orders' && ordersCount > 0) {
                    appBadge = ordersCount;
                    appBadgeColor = 'bg-blue-600 text-white';
                  } else if (app.id === 'inventory' && lowStockCount > 0) {
                    appBadge = `${lowStockCount} LOW`;
                    appBadgeColor = 'bg-rose-600 text-white';
                  } else if (app.id === 'notifications' && unreadAlertsCount > 0) {
                    appBadge = unreadAlertsCount;
                    appBadgeColor = 'bg-amber-600 text-white';
                  }

                  return (
                    <button
                      key={app.id}
                      onClick={() => {
                        onSelectApp(app.id);
                        onClose();
                      }}
                      className={`group relative p-4 rounded-xl border text-left flex flex-col transition-all cursor-pointer select-none ${
                        isCurrent
                          ? 'bg-[#29303d] border-[#714B67] shadow-lg shadow-[#714B67]/20 ring-1 ring-[#714B67]'
                          : 'bg-[#181c22]/90 border-neutral-700/50 hover:bg-[#222832] hover:border-neutral-600'
                      }`}
                    >
                      {/* Top icon and badge */}
                      <div className="flex items-start justify-between mb-3 w-full">
                        <div className={`w-11 h-11 rounded-xl bg-gradient-to-br ${app.accentColor} flex items-center justify-center shadow-md group-hover:scale-105 transition-transform duration-150`}>
                          <Icon className="w-5 h-5 text-white" />
                        </div>
                        {appBadge !== undefined && (
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${appBadgeColor || 'bg-neutral-700 text-neutral-200'}`}>
                            {appBadge}
                          </span>
                        )}
                      </div>

                      {/* App Name */}
                      <h3 className="text-sm font-semibold text-white tracking-tight group-hover:text-amber-400 transition-colors flex items-center gap-1.5">
                        <span>{app.name}</span>
                        {isCurrent && (
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
                        )}
                      </h3>

                      {/* Description */}
                      <p className="text-[11px] text-neutral-400 leading-snug mt-1 line-clamp-2">
                        {app.description}
                      </p>

                      {/* Category tag */}
                      <div className="mt-3 pt-2 border-t border-neutral-700/40 flex items-center justify-between text-[10px] text-neutral-500">
                        <span>{app.category}</span>
                        <span className="opacity-0 group-hover:opacity-100 text-amber-400 font-medium transition-opacity">
                          Open →
                        </span>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Quick Footer Bar */}
          <div className="px-6 py-3 bg-[#16191f] border-t border-neutral-700/60 flex items-center justify-between text-xs text-neutral-400">
            <div className="flex items-center gap-4 text-[11px]">
              <span>Tip: Press <kbd className="px-1.5 py-0.5 bg-neutral-800 border border-neutral-700 rounded text-neutral-300 font-mono text-[10px]">Esc</kbd> to return</span>
              <span>·</span>
              <span>Connected to Cloud Firestore</span>
            </div>
            <div className="text-[11px] font-mono text-neutral-400">
              Multi-Branch: Imphal · Melbourne · London
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
