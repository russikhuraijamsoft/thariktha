import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import brandLogo from '../assets/images/talk_of_the_town_logo_1780894452079.png';
import { 
  LayoutDashboard, ShoppingCart, Boxes, Hammer, Users, CreditCard, 
  BarChart3, Settings, SlidersHorizontal, Database, Bell, Search, 
  LogOut, Menu, X, Sun, Moon, ChevronRight, ChevronDown, Trophy, Sparkles, 
  Check, MapPin, User, Mail, ShieldAlert, Key, HelpCircle,
  Printer, Wrench, FileText, HardDrive, LayoutGrid, Clock, Building2,
  ExternalLink, Layers, Plus, Filter, ArrowRight
} from 'lucide-react';
import { PWAInstallButton } from './PWAInstallButton';
import { OdooAppsLauncher } from './OdooAppsLauncher';

interface MainAppShellProps {
  activeTab: 'dashboard' | 'orders' | 'inventory' | 'manufacturing' | 'printing' | 'servicing' | 'notifications' | 'customers' | 'billing' | 'staff' | 'routing' | 'architecture' | 'reports' | 'settings' | 'proposal' | 'drive';
  setActiveTab: (tab: any) => void;
  branchScope: 'Melbourne Closets' | 'London Closets' | 'Imphal Central Hub';
  setBranchScope: (scope: any) => void;
  profile: any;
  logout: () => void;
  notifications: any[];
  setNotifications: React.Dispatch<React.SetStateAction<any[]>>;
  orders: any[];
  inventory: any[];
  customers: any[];
  themeMode: 'light' | 'dark';
  setThemeMode: (mode: 'light' | 'dark') => void;
  children: React.ReactNode;
}

export const MainAppShell: React.FC<MainAppShellProps> = ({
  activeTab,
  setActiveTab,
  branchScope,
  setBranchScope,
  profile,
  logout,
  notifications,
  setNotifications,
  orders,
  inventory,
  customers,
  themeMode,
  setThemeMode,
  children
}) => {
  const [isAppsLauncherOpen, setIsAppsLauncherOpen] = useState(false);
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isBranchMenuOpen, setIsBranchMenuOpen] = useState(false);
  const [isActivitiesOpen, setIsActivitiesOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [showSearchResults, setShowSearchResults] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);

  const notificationsRef = useRef<HTMLDivElement>(null);
  const profileRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLDivElement>(null);
  const branchRef = useRef<HTMLDivElement>(null);
  const activitiesRef = useRef<HTMLDivElement>(null);

  // Close dropdowns on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (notificationsRef.current && !notificationsRef.current.contains(event.target as Node)) {
        setIsNotificationsOpen(false);
      }
      if (profileRef.current && !profileRef.current.contains(event.target as Node)) {
        setIsProfileOpen(false);
      }
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setShowSearchResults(false);
      }
      if (branchRef.current && !branchRef.current.contains(event.target as Node)) {
        setIsBranchMenuOpen(false);
      }
      if (activitiesRef.current && !activitiesRef.current.contains(event.target as Node)) {
        setIsActivitiesOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Theme support
  const isLight = themeMode === 'light';
  const toggleTheme = () => setThemeMode(isLight ? 'dark' : 'light');

  // Odoo Module Sub-Navigations
  const subNavMap: Record<string, { label: string; actionTab: string }[]> = {
    dashboard: [
      { label: 'Overview', actionTab: 'dashboard' },
      { label: 'Sales Orders', actionTab: 'orders' },
      { label: 'Stockroom', actionTab: 'inventory' },
      { label: 'Manufacturing', actionTab: 'manufacturing' },
      { label: 'Analytics', actionTab: 'reports' }
    ],
    orders: [
      { label: 'Orders Ledger', actionTab: 'orders' },
      { label: 'Clubs & Academies', actionTab: 'customers' },
      { label: 'Invoices & POS', actionTab: 'billing' },
      { label: 'Manufacturing Jobs', actionTab: 'manufacturing' }
    ],
    inventory: [
      { label: 'Products & Stock', actionTab: 'inventory' },
      { label: 'Workshop Milling', actionTab: 'manufacturing' },
      { label: 'POS Counter', actionTab: 'billing' },
      { label: 'Replenishment', actionTab: 'reports' }
    ],
    manufacturing: [
      { label: 'Work Orders', actionTab: 'manufacturing' },
      { label: 'Apparel Printing', actionTab: 'printing' },
      { label: 'Repairs & Restorations', actionTab: 'servicing' },
      { label: 'Inventory Raw Goods', actionTab: 'inventory' }
    ],
    billing: [
      { label: 'POS Terminal', actionTab: 'billing' },
      { label: 'Sales Orders', actionTab: 'orders' },
      { label: 'Bank DPR & Finance', actionTab: 'proposal' },
      { label: 'Ledger Audit', actionTab: 'reports' }
    ],
    servicing: [
      { label: 'Repairs & Servicing', actionTab: 'servicing' },
      { label: 'Bat Shaping & Mill', actionTab: 'manufacturing' },
      { label: 'Orders Ledger', actionTab: 'orders' }
    ],
    printing: [
      { label: 'Sublimation Jerseys', actionTab: 'printing' },
      { label: 'Sales Orders', actionTab: 'orders' },
      { label: 'Athletic Clubs', actionTab: 'customers' }
    ],
    customers: [
      { label: 'All Sport Clubs', actionTab: 'customers' },
      { label: 'Orders Ledger', actionTab: 'orders' },
      { label: 'Billing Invoices', actionTab: 'billing' }
    ],
    drive: [
      { label: 'Google Drive Storage', actionTab: 'drive' },
      { label: 'DPR & Contracts', actionTab: 'proposal' },
      { label: 'Firestore Security', actionTab: 'architecture' }
    ],
    staff: [
      { label: 'Staff Directory', actionTab: 'staff' },
      { label: 'Access Control', actionTab: 'routing' },
      { label: 'System Preferences', actionTab: 'settings' }
    ],
    notifications: [
      { label: 'Sentry Audit & Alarms', actionTab: 'notifications' },
      { label: 'Firestore Rules', actionTab: 'architecture' },
      { label: 'System Settings', actionTab: 'settings' }
    ],
    reports: [
      { label: 'Analytics Cockpit', actionTab: 'reports' },
      { label: 'Orders Valuation', actionTab: 'orders' },
      { label: 'Inventory Stock', actionTab: 'inventory' }
    ],
    architecture: [
      { label: 'Database Blueprint', actionTab: 'architecture' },
      { label: 'Auth Routing', actionTab: 'routing' },
      { label: 'Google Drive Sync', actionTab: 'drive' }
    ],
    proposal: [
      { label: 'Bank DPR Document', actionTab: 'proposal' },
      { label: 'Financial Reports', actionTab: 'reports' },
      { label: 'Cloud Drive Backup', actionTab: 'drive' }
    ],
    settings: [
      { label: 'Branch Preferences', actionTab: 'settings' },
      { label: 'Staff Permissions', actionTab: 'staff' },
      { label: 'Database Rules', actionTab: 'architecture' }
    ]
  };

  const menuGroups = [
    {
      title: "Operations",
      items: [
        { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
        { id: 'orders', label: 'Sales & Orders', icon: ShoppingCart, badge: orders.length },
        { 
          id: 'inventory', 
          label: 'Inventory', 
          icon: Boxes, 
          badge: inventory.filter(i => i.stock < i.safetyLevel).length ? 'LOW' : undefined,
          badgeColor: 'bg-rose-600 text-white' 
        },
        { id: 'manufacturing', label: 'Manufacturing (MRP)', icon: Hammer },
        { id: 'printing', label: 'Sublimation & Print', icon: Printer },
        { id: 'servicing', label: 'Repairs & Servicing', icon: Wrench }
      ]
    },
    {
      title: "Finance & CRM",
      items: [
        { id: 'customers', label: 'CRM & Clubs', icon: Users },
        { id: 'billing', label: 'POS & Invoicing', icon: CreditCard },
        { id: 'reports', label: 'Reporting', icon: BarChart3 },
        { id: 'proposal', label: 'Bank DPR Project', icon: FileText }
      ]
    },
    {
      title: "System & Cloud",
      items: [
        { id: 'drive', label: 'Drive Cloud Vault', icon: HardDrive, badge: 'Drive' },
        { id: 'notifications', label: 'Sentry & Audit', icon: Bell, badge: 'Live' },
        { id: 'staff', label: 'Personnel', icon: Users },
        { id: 'architecture', label: 'Firestore & Rules', icon: Database },
        { id: 'settings', label: 'Settings', icon: Settings }
      ]
    }
  ];

  const getAppName = () => {
    switch (activeTab) {
      case 'dashboard': return 'Cockpit';
      case 'orders': return 'Sales & Orders';
      case 'inventory': return 'Inventory';
      case 'manufacturing': return 'Manufacturing (MRP)';
      case 'printing': return 'Apparel & Sublimation';
      case 'servicing': return 'Repairs & Servicing';
      case 'drive': return 'Drive Cloud Vault';
      case 'notifications': return 'Sentry Audit & Alarms';
      case 'customers': return 'CRM & Clubs';
      case 'billing': return 'Point of Sale & Invoicing';
      case 'reports': return 'Reporting & Analytics';
      case 'staff': return 'Personnel Directory';
      case 'routing': return 'Sentry Auth Routing';
      case 'architecture': return 'Cloud Firestore & Rules';
      case 'proposal': return 'Bank DPR Project';
      case 'settings': return 'System Settings';
      default: return 'Talk of the Town ERP';
    }
  };

  const getFilteredResults = () => {
    if (!searchQuery.trim()) return [];
    const query = searchQuery.toLowerCase();
    
    const matchedOrders = orders
      .filter(o => o.customerName.toLowerCase().includes(query) || o.id.toLowerCase().includes(query))
      .map(o => ({ type: 'Order', id: o.id, label: `${o.id} - ${o.customerName}`, sub: o.itemSummary, tab: 'orders' }));

    const matchedInventory = inventory
      .filter(i => i.name.toLowerCase().includes(query) || i.sku.toLowerCase().includes(query))
      .map(i => ({ type: 'Inventory', id: i.sku, label: `${i.sku} - ${i.name}`, sub: `${i.stock} in stock • ₹${i.price}`, tab: 'inventory' }));

    const matchedCustomers = customers
      .filter(c => c.name.toLowerCase().includes(query) || c.affiliation.toLowerCase().includes(query))
      .map(c => ({ type: 'Customer', id: c.id, label: c.name, sub: c.affiliation, tab: 'customers' }));

    return [...matchedOrders, ...matchedInventory, ...matchedCustomers].slice(0, 6);
  };

  const searchResults = getFilteredResults();
  const unreadCount = notifications.filter(n => !n.read).length;
  const lowStockCount = inventory.filter(i => i.stock < i.safetyLevel).length;

  const markAllAsRead = () => {
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
  };

  const handleNotificationClick = (id: string) => {
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
  };

  return (
    <div className={`min-h-screen font-sans antialiased flex flex-col ${isLight ? 'bg-[#f4f5f7] text-neutral-800' : 'bg-[#111418] text-neutral-100'}`} id="odoo-erp-viewport">
      
      {/* ========================================================
          1. ODOO ENTERPRISE TOP NAVBAR (Standard Odoo 17/18 Header)
         ======================================================== */}
      <header className={`sticky top-0 z-40 border-b flex items-center justify-between px-3 sm:px-5 h-14 select-none ${
        isLight ? 'bg-[#714B67] border-[#5e3e56] text-white shadow-sm' : 'bg-[#1a1c23] border-neutral-800 text-white'
      }`}>
        
        {/* Left: Odoo Apps Waffle Launcher + Brand & App Title */}
        <div className="flex items-center gap-3">
          {/* Odoo 9-dots App Launcher Button */}
          <button
            onClick={() => setIsAppsLauncherOpen(true)}
            className="w-9 h-9 rounded-lg hover:bg-black/20 flex items-center justify-center transition cursor-pointer active:scale-95"
            title="Open Odoo Apps Launcher (All Modules)"
          >
            <div className="grid grid-cols-3 gap-0.8 p-1">
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
          </button>

          {/* Brand Logo & Current App Name */}
          <div className="flex items-center gap-2.5">
            <img 
              src={brandLogo} 
              alt="Talk of the Town" 
              className="w-7 h-7 rounded-md object-cover border border-white/20 shrink-0"
              referrerPolicy="no-referrer"
            />
            <div className="flex items-center gap-2">
              <span className="font-bold text-sm tracking-tight hidden md:inline opacity-90">
                Talk of the Town
              </span>
              <span className="text-white/40 hidden md:inline">/</span>
              <span className="font-bold text-sm tracking-tight text-amber-300">
                {getAppName()}
              </span>
            </div>
          </div>
        </div>

        {/* Center: Odoo Quick Omnibar Search */}
        <div ref={searchRef} className="hidden md:flex relative w-72 lg:w-96 mx-4">
          <Search className="w-3.5 h-3.5 text-white/60 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setShowSearchResults(true);
            }}
            onFocus={() => setShowSearchResults(true)}
            placeholder="Search records, orders, items..."
            className="w-full bg-black/20 hover:bg-black/30 focus:bg-black/40 text-white placeholder-white/60 text-xs rounded-lg pl-8.5 pr-7 py-1.5 border border-white/10 focus:outline-none focus:border-amber-400 transition"
          />
          {searchQuery && (
            <button
              onClick={() => { setSearchQuery(''); setShowSearchResults(false); }}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-white/60 hover:text-white"
            >
              <X className="w-3 h-3" />
            </button>
          )}

          {/* Quick Search Popover */}
          <AnimatePresence>
            {showSearchResults && searchQuery && (
              <motion.div
                initial={{ opacity: 0, y: 5 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 5 }}
                className="absolute left-0 right-0 top-full mt-1.5 bg-[#1e232a] text-neutral-100 border border-neutral-700 rounded-xl shadow-2xl p-2 z-50 text-xs"
              >
                <div className="px-2 py-1 text-[10px] text-neutral-400 uppercase font-bold border-b border-neutral-800 mb-1">
                  Matched ERP Records
                </div>
                {searchResults.length === 0 ? (
                  <div className="p-3 text-center text-neutral-400 italic">No records match query</div>
                ) : (
                  <div className="space-y-0.5">
                    {searchResults.map((item, idx) => (
                      <button
                        key={idx}
                        onClick={() => {
                          setActiveTab(item.tab);
                          setSearchQuery('');
                          setShowSearchResults(false);
                        }}
                        className="w-full text-left p-2 rounded-lg hover:bg-neutral-800 flex items-center justify-between transition cursor-pointer"
                      >
                        <div>
                          <strong className="block text-white">{item.label}</strong>
                          <span className="text-[10px] text-neutral-400 block">{item.sub}</span>
                        </div>
                        <span className="bg-amber-500/20 text-amber-300 text-[9px] px-2 py-0.5 rounded font-bold">
                          {item.type}
                        </span>
                      </button>
                    ))}
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Right Section: Multi-Branch + Activities + Theme + User Menu */}
        <div className="flex items-center gap-1.5 sm:gap-2">
          
          {/* PWA Install Button */}
          <div className="hidden sm:block">
            <PWAInstallButton variant="nav" />
          </div>

          {/* Odoo Multi-Branch / Company Switcher Dropdown */}
          <div ref={branchRef} className="relative">
            <button
              onClick={() => setIsBranchMenuOpen(!isBranchMenuOpen)}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg hover:bg-black/20 text-xs font-medium transition cursor-pointer"
              title="Switch Active Company / Branch"
            >
              <Building2 className="w-3.5 h-3.5 text-amber-300" />
              <span className="hidden lg:inline">{branchScope}</span>
              <span className="lg:hidden">{branchScope.split(' ')[0]}</span>
              <ChevronDown className="w-3 h-3 text-white/60" />
            </button>

            {isBranchMenuOpen && (
              <div className="absolute right-0 mt-1.5 w-52 bg-[#1e232a] border border-neutral-700 text-neutral-200 rounded-xl shadow-xl p-1.5 z-50 text-xs">
                <div className="px-2.5 py-1 text-[10px] uppercase font-bold text-neutral-400 border-b border-neutral-800 mb-1">
                  Active Branches
                </div>
                {[
                  { id: 'Melbourne Closets', label: 'Melbourne Closets Whse' },
                  { id: 'London Closets', label: 'London Closets Hub' },
                  { id: 'Imphal Central Hub', label: 'Imphal Central Workshop' }
                ].map((b) => (
                  <button
                    key={b.id}
                    onClick={() => {
                      setBranchScope(b.id as any);
                      setIsBranchMenuOpen(false);
                    }}
                    className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-left transition ${
                      branchScope === b.id ? 'bg-[#714B67] text-white font-medium' : 'hover:bg-neutral-800'
                    }`}
                  >
                    <span>{b.label}</span>
                    {branchScope === b.id && <Check className="w-3 h-3 text-amber-300" />}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Odoo Quick Activity / Clock Schedule */}
          <div ref={activitiesRef} className="relative">
            <button
              onClick={() => setIsActivitiesOpen(!isActivitiesOpen)}
              className="p-1.5 rounded-lg hover:bg-black/20 transition cursor-pointer relative"
              title="Scheduled Activities & Tasks"
            >
              <Clock className="w-4 h-4 text-white/90" />
              {lowStockCount > 0 && (
                <span className="absolute top-0.5 right-0.5 w-2 h-2 rounded-full bg-rose-500 ring-2 ring-[#714B67]"></span>
              )}
            </button>

            {isActivitiesOpen && (
              <div className="absolute right-0 mt-1.5 w-72 bg-[#1e232a] border border-neutral-700 text-neutral-200 rounded-xl shadow-xl p-3 z-50 text-xs">
                <div className="flex items-center justify-between border-b border-neutral-800 pb-2 mb-2">
                  <span className="font-bold text-[11px] text-white">Odoo Activities</span>
                  <span className="text-[10px] text-amber-400 font-mono">Today</span>
                </div>
                <div className="space-y-2 text-xs">
                  <div className="p-2 bg-neutral-800/80 rounded-lg flex items-start gap-2">
                    <span className="w-2 h-2 rounded-full bg-amber-400 mt-1 shrink-0"></span>
                    <div>
                      <strong className="block text-white text-[11px]">Quality Check Inspection</strong>
                      <span className="text-neutral-400 text-[10px]">Bat milling batch for Manipur Cricket Academy</span>
                    </div>
                  </div>
                  {lowStockCount > 0 && (
                    <div className="p-2 bg-rose-950/40 border border-rose-800/40 rounded-lg flex items-start gap-2">
                      <span className="w-2 h-2 rounded-full bg-rose-500 mt-1 shrink-0"></span>
                      <div>
                        <strong className="block text-rose-300 text-[11px]">{lowStockCount} Low Stock Reorders</strong>
                        <span className="text-neutral-400 text-[10px]">Inventory items below safety levels</span>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Notifications Bell */}
          <div ref={notificationsRef} className="relative">
            <button
              onClick={() => setIsNotificationsOpen(!isNotificationsOpen)}
              className="p-1.5 rounded-lg hover:bg-black/20 transition cursor-pointer relative"
              title="System Alerts & Sentry"
            >
              <Bell className="w-4 h-4 text-white/90" />
              {unreadCount > 0 && (
                <span className="absolute -top-0.5 -right-0.5 px-1 min-w-3.5 h-3.5 bg-rose-500 text-white text-[8px] font-bold rounded-full flex items-center justify-center">
                  {unreadCount}
                </span>
              )}
            </button>

            {isNotificationsOpen && (
              <div className="absolute right-0 mt-1.5 w-80 bg-[#1e232a] border border-neutral-700 text-neutral-200 rounded-xl shadow-xl p-3 z-50 text-xs">
                <div className="flex items-center justify-between border-b border-neutral-800 pb-2 mb-2">
                  <span className="font-bold text-[11px] text-white">System Notifications</span>
                  {unreadCount > 0 && (
                    <button onClick={markAllAsRead} className="text-[10px] text-amber-400 hover:underline">
                      Mark all read
                    </button>
                  )}
                </div>
                <div className="space-y-2 max-h-60 overflow-y-auto">
                  {notifications.length === 0 ? (
                    <div className="text-center text-neutral-400 italic py-4">No notifications</div>
                  ) : (
                    notifications.map((n) => (
                      <div
                        key={n.id}
                        onClick={() => handleNotificationClick(n.id)}
                        className={`p-2 rounded-lg border text-xs cursor-pointer ${
                          n.read ? 'border-transparent opacity-70' : 'bg-neutral-800/80 border-amber-500/30'
                        }`}
                      >
                        <strong className="block text-white text-[11px]">{n.title}</strong>
                        <p className="text-neutral-400 text-[10px] mt-0.5">{n.message}</p>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Light / Dark Mode Switch */}
          <button
            onClick={toggleTheme}
            className="p-1.5 rounded-lg hover:bg-black/20 transition cursor-pointer text-white/90"
            title="Toggle Light / Dark Interface"
          >
            {isLight ? <Moon className="w-4 h-4" /> : <Sun className="w-4 h-4 text-amber-300" />}
          </button>

          {/* User Profile Avatar Menu */}
          <div ref={profileRef} className="relative ml-1">
            <button
              onClick={() => setIsProfileOpen(!isProfileOpen)}
              className="flex items-center gap-1.5 p-1 rounded-lg hover:bg-black/20 transition cursor-pointer"
            >
              <div className="w-7 h-7 rounded-lg bg-amber-400 text-neutral-950 font-bold flex items-center justify-center text-xs shadow-xs">
                {profile?.name ? profile.name.charAt(0).toUpperCase() : 'A'}
              </div>
              <ChevronDown className="w-3 h-3 text-white/60 hidden sm:block" />
            </button>

            {isProfileOpen && (
              <div className="absolute right-0 mt-1.5 w-56 bg-[#1e232a] border border-neutral-700 text-neutral-200 rounded-xl shadow-xl p-2 z-50 text-xs">
                <div className="px-2.5 py-2 border-b border-neutral-800 mb-1">
                  <div className="font-bold text-white text-xs">{profile?.name || 'Administrator'}</div>
                  <div className="text-[10px] text-amber-400 font-mono mt-0.5">{profile?.roleId?.toUpperCase() || 'SUPER ADMIN'}</div>
                  <div className="text-[10px] text-neutral-400 truncate">{profile?.email || 'russi.khuraijam@gmail.com'}</div>
                </div>

                <button
                  onClick={() => { setActiveTab('settings'); setIsProfileOpen(false); }}
                  className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg hover:bg-neutral-800 text-left transition"
                >
                  <Settings className="w-3.5 h-3.5 text-neutral-400" />
                  <span>Preferences</span>
                </button>

                <button
                  onClick={() => { setActiveTab('staff'); setIsProfileOpen(false); }}
                  className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg hover:bg-neutral-800 text-left transition"
                >
                  <Users className="w-3.5 h-3.5 text-neutral-400" />
                  <span>My Employees</span>
                </button>

                <div className="border-t border-neutral-800 my-1 pt-1">
                  <button
                    onClick={() => { setIsProfileOpen(false); logout(); }}
                    className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg hover:bg-rose-950/60 text-rose-400 text-left transition"
                  >
                    <LogOut className="w-3.5 h-3.5" />
                    <span>Sign Out</span>
                  </button>
                </div>
              </div>
            )}
          </div>

        </div>

      </header>

      {/* ========================================================
          2. ODOO SUB-NAVBAR (Action Bar for the Active Application)
         ======================================================== */}
      <div className={`border-b px-4 sm:px-6 h-10 flex items-center justify-between text-xs select-none overflow-x-auto ${
        isLight ? 'bg-white border-neutral-200 text-neutral-700' : 'bg-[#181b22] border-neutral-800 text-neutral-300'
      }`}>
        {/* Left: Module Action Sub-tabs */}
        <div className="flex items-center gap-1 sm:gap-2">
          {(subNavMap[activeTab] || [
            { label: 'Overview', actionTab: activeTab },
            { label: 'Analytics', actionTab: 'reports' }
          ]).map((subItem, idx) => {
            const isCurrent = activeTab === subItem.actionTab;
            return (
              <button
                key={idx}
                onClick={() => setActiveTab(subItem.actionTab)}
                className={`px-3 py-1 rounded-md text-xs font-medium transition cursor-pointer whitespace-nowrap ${
                  isCurrent
                    ? (isLight ? 'bg-neutral-100 text-[#714B67] font-semibold' : 'bg-neutral-800 text-amber-300 font-semibold')
                    : 'hover:text-amber-500 hover:bg-neutral-800/40'
                }`}
              >
                {subItem.label}
              </button>
            );
          })}
        </div>

        {/* Right: Quick Apps Switcher trigger text */}
        <div className="hidden md:flex items-center gap-3 text-[11px] text-neutral-400">
          <button
            onClick={() => setIsAppsLauncherOpen(true)}
            className="flex items-center gap-1.5 text-neutral-400 hover:text-amber-400 transition cursor-pointer font-medium"
          >
            <LayoutGrid className="w-3.5 h-3.5" />
            <span>All Apps</span>
          </button>
        </div>
      </div>

      {/* ========================================================
          3. MAIN LAYOUT: COMPACT SIDEBAR DOCK + CONTENT WORKSPACE
         ======================================================== */}
      <div className="flex-1 flex min-w-0 relative">
        
        {/* Sleek Odoo Compact / Collapsible Sidebar Dock */}
        <aside className={`hidden md:flex ${isSidebarCollapsed ? 'w-16' : 'w-60'} border-r transition-all duration-200 flex-col select-none ${
          isLight ? 'bg-white border-neutral-200' : 'bg-[#15181e] border-neutral-800'
        }`}>
          {/* Collapse Toggle */}
          <div className="p-3 border-b border-neutral-800/60 flex items-center justify-between">
            {!isSidebarCollapsed && (
              <span className="text-[10px] uppercase font-bold tracking-wider text-neutral-400">
                ERP Navigation
              </span>
            )}
            <button
              onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
              className="p-1 rounded-md hover:bg-neutral-800 text-neutral-400 hover:text-white transition cursor-pointer ml-auto"
              title={isSidebarCollapsed ? "Expand Sidebar" : "Collapse Sidebar"}
            >
              <Menu className="w-4 h-4" />
            </button>
          </div>

          {/* Sidebar Menu Grouping */}
          <nav className="flex-1 overflow-y-auto p-2 space-y-4">
            {menuGroups.map((group, gIdx) => (
              <div key={gIdx} className="space-y-1">
                {!isSidebarCollapsed && (
                  <p className="text-[9px] uppercase font-bold tracking-wider text-neutral-400 px-2.5 py-1">
                    {group.title}
                  </p>
                )}
                <div className="space-y-0.5">
                  {group.items.map((item) => {
                    const Icon = item.icon;
                    const isCurrent = activeTab === item.id;
                    return (
                      <button
                        key={item.id}
                        onClick={() => setActiveTab(item.id)}
                        className={`w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-xs font-medium transition cursor-pointer ${
                          isCurrent
                            ? (isLight 
                                ? 'bg-[#714B67] text-white shadow-xs font-semibold' 
                                : 'bg-neutral-800 text-amber-300 shadow-xs font-semibold')
                            : (isLight 
                                ? 'text-neutral-600 hover:bg-neutral-100 hover:text-neutral-900' 
                                : 'text-neutral-400 hover:bg-neutral-800/60 hover:text-white')
                        }`}
                        title={isSidebarCollapsed ? item.label : undefined}
                      >
                        <Icon className={`w-4 h-4 shrink-0 ${isCurrent ? (isLight ? 'text-white' : 'text-amber-300') : 'text-neutral-400'}`} />
                        {!isSidebarCollapsed && (
                          <span className="truncate">{item.label}</span>
                        )}
                        {!isSidebarCollapsed && item.badge !== undefined && (
                          <span className={`ml-auto text-[9px] px-1.5 py-0.2 rounded-full font-bold ${
                            item.badgeColor || (isCurrent ? 'bg-white/20 text-white' : 'bg-neutral-800 text-neutral-300')
                          }`}>
                            {item.badge}
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </nav>

          {/* Bottom App Launcher Shortcut Button */}
          <div className="p-3 border-t border-neutral-800/60">
            <button
              onClick={() => setIsAppsLauncherOpen(true)}
              className={`w-full flex items-center justify-center gap-2 p-2 rounded-lg border text-xs font-semibold transition cursor-pointer ${
                isLight 
                  ? 'bg-neutral-50 hover:bg-neutral-100 border-neutral-200 text-[#714B67]' 
                  : 'bg-[#1a1e26] hover:bg-[#222832] border-neutral-700 text-amber-300'
              }`}
            >
              <LayoutGrid className="w-4 h-4" />
              {!isSidebarCollapsed && <span>Odoo App Drawer</span>}
            </button>
          </div>
        </aside>

        {/* Content Workspace Area */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8 overflow-y-auto relative">
          <div className="w-full max-w-7xl mx-auto">
            <AnimatePresence mode="wait">
              <motion.div
                key={activeTab}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.15 }}
              >
                {children}
              </motion.div>
            </AnimatePresence>
          </div>
        </main>

      </div>

      {/* ========================================================
          4. ODOO FULL-SCREEN APPS LAUNCHER MODAL
         ======================================================== */}
      <OdooAppsLauncher
        isOpen={isAppsLauncherOpen}
        onClose={() => setIsAppsLauncherOpen(false)}
        activeTab={activeTab}
        onSelectApp={(appId) => setActiveTab(appId as any)}
        ordersCount={orders.length}
        lowStockCount={lowStockCount}
        unreadAlertsCount={unreadCount}
      />

    </div>
  );
};
