import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  LayoutDashboard, ShoppingCart, Boxes, Hammer, Users, CreditCard, 
  BarChart3, Settings, SlidersHorizontal, Database, Bell, Search, 
  LogOut, Menu, X, Sun, Moon, ChevronRight, Trophy, Sparkles, 
  Check, MapPin, User, Mail, ShieldAlert, Key, HelpCircle,
  Printer, Wrench
} from 'lucide-react';

interface MainAppShellProps {
  activeTab: 'dashboard' | 'orders' | 'inventory' | 'manufacturing' | 'printing' | 'servicing' | 'notifications' | 'customers' | 'billing' | 'staff' | 'routing' | 'architecture' | 'reports' | 'settings';
  setActiveTab: (tab: any) => void;
  branchScope: 'Melbourne Closets' | 'London Closets';
  setBranchScope: (scope: 'Melbourne Closets' | 'London Closets') => void;
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
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [showSearchResults, setShowSearchResults] = useState(false);

  const notificationsRef = useRef<HTMLDivElement>(null);
  const profileRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLDivElement>(null);

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
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Theme support
  const isLight = themeMode === 'light';

  // Toggle theme mode
  const toggleTheme = () => {
    setThemeMode(isLight ? 'dark' : 'light');
  };

  const menuGroups = [
    {
      title: "Operations",
      items: [
        { id: 'dashboard', label: 'Dashboard Cockpit', icon: LayoutDashboard },
        { id: 'orders', label: 'Sales Orders', icon: ShoppingCart, badge: orders.length },
        { 
          id: 'inventory', 
          label: 'Inventory Stock', 
          icon: Boxes, 
          badge: inventory.filter(i => i.stock < i.safetyLevel).length ? 'LOW' : undefined,
          badgeColor: 'bg-red-950/80 text-red-400 border border-red-800/40' 
        },
        { id: 'manufacturing', label: 'Workshops & Craft', icon: Hammer },
        { id: 'printing', label: 'Apparel & Printing', icon: Printer },
        { id: 'servicing', label: 'Repairs & Servicing', icon: Wrench }
      ]
    },
    {
      title: "Commerce & Finance",
      items: [
        { id: 'customers', label: 'CRM Clubs & Athletes', icon: Users },
        { id: 'billing', label: 'Bookkeeping Desk', icon: CreditCard },
        { id: 'reports', label: 'Operational Reports', icon: BarChart3 }
      ]
    },
    {
      title: "Security & Customisation",
      items: [
        { id: 'notifications', label: 'Sentry Audit & Alerts', icon: Bell, badge: 'Logs', badgeColor: 'bg-amber-950 text-amber-400 border border-amber-800/30' },
        { id: 'staff', label: 'Personnel Directory', icon: Users, badge: profile?.roleId === 'super_admin' ? 'Super' : undefined, badgeColor: 'bg-emerald-950 text-emerald-400 border border-emerald-800/30' },
        { id: 'routing', label: 'Routing & Sentry Auth', icon: SlidersHorizontal },
        { id: 'architecture', label: 'Database & Security Rules', icon: Database, badge: 'GCP', badgeColor: 'bg-teal-950 text-teal-400 border border-teal-800/35' },
        { id: 'settings', label: 'System Settings', icon: Settings }
      ]
    }
  ];

  // Map active tab to visual title and path
  const getTabBreadcrumb = () => {
    switch (activeTab) {
      case 'dashboard': return 'Dashboard Cockpit';
      case 'orders': return 'Sales Orders Ledger';
      case 'inventory': return 'Inventory Stockroom';
      case 'manufacturing': return 'Workshops & Fabrication';
      case 'printing': return 'Apparel Printing & Sublimation';
      case 'servicing': return 'Cricket Equipment Restoration & Repair Desk';
      case 'notifications': return 'Audit Logs & Sentry Monitor';
      case 'customers': return 'CRM Sport Clubs';
      case 'billing': return 'Bookkeeping Desk';
      case 'reports': return 'Operational Reports';
      case 'staff': return 'Personnel Directory';
      case 'routing': return 'Sentry Auth Routing';
      case 'architecture': return 'Database Rules & Specs';
      case 'settings': return 'System Settings';
      default: return 'Active Channel';
    }
  };

  // Real-time Global Search Filter logic
  const getFilteredResults = () => {
    if (!searchQuery.trim()) return [];
    const query = searchQuery.toLowerCase();
    
    const matchedOrders = orders
      .filter(o => o.customerName.toLowerCase().includes(query) || o.id.toLowerCase().includes(query))
      .map(o => ({ type: 'Order', id: o.id, label: `${o.id} - ${o.customerName}`, sub: o.itemSummary, tab: 'orders' }));

    const matchedInventory = inventory
      .filter(i => i.name.toLowerCase().includes(query) || i.sku.toLowerCase().includes(query))
      .map(i => ({ type: 'Inventory', id: i.sku, label: `${i.sku} - ${i.name}`, sub: `${i.stock} in stock • $${i.price}`, tab: 'inventory' }));

    const matchedCustomers = customers
      .filter(c => c.name.toLowerCase().includes(query) || c.affiliation.toLowerCase().includes(query))
      .map(c => ({ type: 'Customer', id: c.id, label: c.name, sub: c.affiliation, tab: 'customers' }));

    return [...matchedOrders, ...matchedInventory, ...matchedCustomers].slice(0, 6);
  };

  const searchResults = getFilteredResults();
  const unreadCount = notifications.filter(n => !n.read).length;

  const markAllAsRead = () => {
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
  };

  const handleNotificationClick = (id: string) => {
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
  };

  return (
    <div className={`min-h-screen font-sans antialiased flex flex-col selection:bg-amber-500 selection:text-neutral-900 ${isLight ? 'bg-[#FCFBF7] text-neutral-800' : 'bg-neutral-950 text-neutral-100'}`} id="talk-of-the-town-viewport">
      
      {/* 2. RECON HEADER / TOP NAVIGATION (Mobile Only Trigger & Brand) */}
      <div className="lg:hidden bg-neutral-900 text-white border-b border-neutral-800 px-5 py-3.5 flex items-center justify-between z-30">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-amber-400 to-yellow-600 flex items-center justify-center text-neutral-950 font-bold shadow shadow-amber-500/10">
            <Trophy className="w-4 h-4 stroke-[2.5]" />
          </div>
          <div>
            <h1 className="text-sm font-black tracking-tight uppercase">CRICKET CLOSET</h1>
            <span className="text-[9px] font-mono text-amber-500">Production ERP v4.2</span>
          </div>
        </div>
        <button 
          onClick={() => setIsMobileSidebarOpen(true)}
          className="p-1.5 bg-neutral-800 border border-neutral-700 rounded-lg text-neutral-300"
        >
          <Menu className="w-5 h-5" />
        </button>
      </div>

      {/* Main Structural Layout Wrapper */}
      <div className="flex-1 flex flex-col lg:flex-row relative">

        {/* 1. PERSISTENT SIDEBAR NAVIGATION (Desktop: Persistent | Mobile: Sliding Drawer) */}
        
        {/* Desktop Sidebar */}
        <aside className="hidden lg:flex w-72 bg-neutral-900 border-r border-neutral-800/80 p-5 flex-col gap-1 shrink-0 text-neutral-200 select-none" id="erp-sidebar-desktop">
          
          {/* Sidebar Top: Premium Logo and App Metadata */}
          <div className="flex items-center gap-3.5 pb-5 mb-5 border-b border-neutral-800/60">
            <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-amber-400 to-yellow-600 flex items-center justify-center text-neutral-950 shadow-lg shadow-amber-500/20 shrink-0">
              <Trophy className="w-5.5 h-5.5 stroke-[2.5]" />
            </div>
            <div>
              <div className="flex items-center gap-1.5 mb-0.5">
                <span className="text-[9px] font-mono tracking-widest text-[#E5B84B] font-bold uppercase bg-amber-500/10 px-1.5 py-0.5 rounded border border-amber-500/15">
                  ERP Platform
                </span>
                <span className="text-neutral-500 text-[10px] font-mono">v4.2</span>
              </div>
              <h1 className="text-sm font-black text-white tracking-widest leading-none uppercase">
                TALK OF THE TOWN
              </h1>
            </div>
          </div>

          {/* Navigation Structure Grouping */}
          <nav className="space-y-5 flex-1 overflow-y-auto">
            {menuGroups.map((group, groupIdx) => (
              <div key={groupIdx} className="space-y-1.5">
                <p className="text-[9.5px] font-mono tracking-widest text-neutral-500 uppercase font-black px-3.5">
                  {group.title}
                </p>
                <div className="space-y-1">
                  {group.items.map((item) => {
                    const Icon = item.icon;
                    const isActive = activeTab === item.id;
                    return (
                      <button
                        key={item.id}
                        onClick={() => setActiveTab(item.id)}
                        className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-bold font-mono tracking-wide uppercase transition-all border ${
                          isActive 
                            ? 'bg-[#E5B84B] text-neutral-950 border-[#E5B84B] shadow-md shadow-amber-500/10' 
                            : 'text-neutral-400 border-transparent hover:bg-neutral-800 hover:text-white'
                        }`}
                      >
                        <Icon className={`w-4 h-4 ${isActive ? 'text-neutral-950' : 'text-amber-500'}`} />
                        <span>{item.label}</span>
                        {item.badge !== undefined && (
                          <span className={`ml-auto text-[9px] px-1.5 py-0.5 rounded-md font-bold ${
                            item.badgeColor || (isActive ? 'bg-neutral-950 text-[#E5B84B]' : 'bg-neutral-800 text-amber-500 border border-neutral-700')
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

          {/* Sidebar Footer Indicator with dynamic connection status */}
          <div className="mt-6 bg-neutral-950/80 rounded-xl p-3.5 border border-neutral-800 text-[10px] font-mono" id="sidebar-control-telemetry">
            <div className="flex items-center justify-between text-neutral-500 mb-1.5">
              <span>LOCAL GATEWAY CLOUD</span>
              <span className="text-emerald-500 animate-pulse font-bold">● ACTIVE</span>
            </div>
            <div className="h-1.5 w-full bg-neutral-800 rounded-full overflow-hidden">
              <div className="h-full bg-[#E5B84B] rounded-full w-full"></div>
            </div>
            <p className="text-neutral-500 leading-relaxed text-[9px] mt-2">
              Syncing over Secure Firestore rules. IndexedDB persistent.
            </p>
          </div>
        </aside>

        {/* Dynamic Mobile Sidebar Drawer wrapper */}
        <AnimatePresence>
          {isMobileSidebarOpen && (
            <div className="lg:hidden fixed inset-0 z-50 flex" id="mobile-sidebar-drawer">
              {/* Overlay Backdrop */}
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setIsMobileSidebarOpen(false)}
                className="fixed inset-0 bg-black/60 backdrop-blur-xs"
              ></motion.div>

              {/* Drawer Container */}
              <motion.aside 
                initial={{ x: '-100%' }}
                animate={{ x: 0 }}
                exit={{ x: '-100%' }}
                transition={{ type: 'spring', damping: 25, stiffness: 220 }}
                className="relative w-80 max-w-sm bg-neutral-900 text-white p-5 flex flex-col gap-1 shrink-0 h-full z-10 select-none border-r border-neutral-800"
              >
                {/* Close Button top corner */}
                <button 
                  onClick={() => setIsMobileSidebarOpen(false)}
                  className="absolute right-4 top-4 p-1.5 bg-neutral-800 rounded-lg text-neutral-400 hover:text-white"
                >
                  <X className="w-5 h-5" />
                </button>

                {/* Micro Brand and Name */}
                <div className="flex items-center gap-3.5 pb-5 mb-5 border-b border-neutral-800/60">
                  <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-amber-400 to-yellow-600 flex items-center justify-center text-neutral-950 font-black shadow-md shrink-0">
                    <Trophy className="w-5 h-5 stroke-[2.5]" />
                  </div>
                  <div>
                    <h1 className="text-xs font-black tracking-widest text-white leading-none uppercase">
                      TALK OF THE TOWN
                    </h1>
                    <span className="text-[9px] text-[#E5B84B] font-mono uppercase font-bold">CRICKET CLOSET ERP</span>
                  </div>
                </div>

                {/* Tabs render on mobile */}
                <nav className="space-y-4 flex-1 overflow-y-auto">
                  {menuGroups.map((group, groupIdx) => (
                    <div key={groupIdx} className="space-y-1.5">
                      <p className="text-[9px] font-mono tracking-widest text-neutral-500 uppercase font-black px-2">
                        {group.title}
                      </p>
                      <div className="space-y-1">
                        {group.items.map((item) => {
                          const Icon = item.icon;
                          const isActive = activeTab === item.id;
                          return (
                            <button
                              key={item.id}
                              onClick={() => {
                                setActiveTab(item.id);
                                setIsMobileSidebarOpen(false);
                              }}
                              className={`w-full flex items-center gap-3 px-3.5 py-2 rounded-xl text-xs font-bold font-mono tracking-wide uppercase transition-all ${
                                isActive 
                                  ? 'bg-[#E5B84B] text-neutral-950 font-bold' 
                                  : 'text-neutral-400 hover:bg-neutral-800 hover:text-white'
                              }`}
                            >
                              <Icon className={`w-4 h-4 ${isActive ? 'text-neutral-950' : 'text-amber-500'}`} />
                              <span>{item.label}</span>
                              {item.badge !== undefined && (
                                <span className={`ml-auto text-[9px] px-1.5 py-0.5 rounded ${
                                  isActive ? 'bg-neutral-950 text-[#E5B84B]' : 'bg-neutral-800 text-amber-500'
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

                <div className="bg-neutral-950/80 rounded-lg p-3 border border-neutral-800 text-[10px] font-mono">
                  <div className="flex items-center justify-between text-neutral-500">
                    <span>MOBILE CONSOLE</span>
                    <strong className="text-emerald-500">SECURE CONNECTED</strong>
                  </div>
                </div>
              </motion.aside>
            </div>
          )}
        </AnimatePresence>

        {/* Responsive Content Core Shell Layout Wrapper */}
        <div className="flex-1 flex flex-col min-w-0" id="erp-main-view-box">
          
          {/* 3. TOP NAVIGATION BAR (Topbar) */}
          <header className={`sticky top-0 z-20 border-b flex flex-col md:flex-row items-stretch md:items-center justify-between px-6 py-4.5 gap-4 backdrop-blur-md transition-all ${
            isLight ? 'bg-white/95 border-neutral-200/80 shadow-sm shadow-neutral-100/30' : 'bg-neutral-900/95 border-neutral-800'
          }`} id="top-navigation-bar">
            
            {/* Left Portion: Breadcrumbs with path hierarchy */}
            <div className="flex items-center gap-1.5 select-none font-mono text-xs">
              <span className="text-neutral-400 hover:text-amber-500 transition-all cursor-pointer">ERP Channels</span>
              <ChevronRight className="w-3.5 h-3.5 text-neutral-400 pointer-events-none" />
              <strong className={`font-black uppercase tracking-wider ${isLight ? 'text-neutral-900' : 'text-yellow-500'}`}>
                {getTabBreadcrumb()}
              </strong>
            </div>

            {/* Middle: Live Interactive Dynamic Global Search Bar */}
            <div ref={searchRef} className="relative w-full md:max-w-md" id="global-telemetry-search">
              <div className="relative">
                <Search className={`absolute left-3.5 top-2.5 w-4 h-4 pointer-events-none transition-all ${isLight ? 'text-neutral-400' : 'text-neutral-500'}`} />
                <input 
                  type="text" 
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    setShowSearchResults(true);
                  }}
                  onFocus={() => setShowSearchResults(true)}
                  placeholder="Interactive Filter queries... (Search order, SKU, client)"
                  className={`w-full text-xs font-mono rounded-xl pl-10 pr-4 py-2.5 focus:outline-none focus:ring-1 focus:ring-amber-500 transition-all border ${
                    isLight 
                      ? 'bg-neutral-50 border-neutral-200/80 placeholder-neutral-400 text-neutral-800' 
                      : 'bg-neutral-950 border-neutral-800 placeholder-neutral-500 text-white'
                  }`}
                />
                {searchQuery && (
                  <button 
                    onClick={() => {
                      setSearchQuery('');
                      setShowSearchResults(false);
                    }}
                    className={`absolute right-3 top-2.5 text-[10px] font-bold uppercase transition-all ${isLight ? 'text-neutral-400 hover:text-neutral-600' : 'text-neutral-500 hover:text-neutral-300'}`}
                  >
                    Clear
                  </button>
                )}
              </div>

              {/* Search Results Dropdown Popover */}
              <AnimatePresence>
                {showSearchResults && searchQuery && (
                  <motion.div 
                    initial={{ opacity: 0, y: 5 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 5 }}
                    className={`absolute left-0 right-0 mt-2 rounded-xl border p-2 z-50 text-xs font-mono shadow-2xl ${
                      isLight ? 'bg-white border-neutral-200 text-neutral-700' : 'bg-neutral-900 border-neutral-800 text-neutral-200'
                    }`}
                  >
                    <div className="px-2.5 py-1 text-[9px] text-neutral-500 uppercase font-black border-b border-neutral-800/10 mb-1">
                      Matched Operational Records
                    </div>
                    {searchResults.length === 0 ? (
                      <div className="p-3 text-center text-neutral-400 italic">No matched database items</div>
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
                            className={`w-full text-left p-2 rounded-lg flex items-center justify-between transition-all ${
                              isLight ? 'hover:bg-neutral-50' : 'hover:bg-neutral-850'
                            }`}
                          >
                            <div>
                              <strong className={`block ${isLight ? 'text-neutral-800' : 'text-white'}`}>{item.label}</strong>
                              <span className="text-[10px] text-neutral-400 block">{item.sub}</span>
                            </div>
                            <span className="bg-amber-500/10 text-amber-500 border border-amber-500/15 text-[8.5px] px-2 py-0.5 rounded uppercase font-black">
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

            {/* Right Portion: Controls grid */}
            <div className="flex items-center gap-3.5 justify-end">
              
              {/* Branch Scope Display Selection Overlay (Notion layout style) */}
              <div className={`hidden md:flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-mono transition-all ${
                isLight ? 'bg-neutral-50 border-neutral-200/80 text-neutral-700' : 'bg-neutral-950 border-neutral-800 text-neutral-400'
              }`}>
                <MapPin className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                <select 
                  value={branchScope}
                  onChange={(e) => setBranchScope(e.target.value as any)}
                  className="bg-transparent font-bold cursor-pointer focus:outline-none"
                >
                  <option value="Melbourne Closets" className="bg-neutral-900 text-white">Melbourne Whse</option>
                  <option value="London Closets" className="bg-neutral-900 text-white">London Closet</option>
                </select>
              </div>

              {/* 9. THEME MODE TOGGLE CONTROL (Sun/Moon Switch button) */}
              <button
                onClick={toggleTheme}
                title="Change display colors"
                className={`p-2.5 rounded-xl border cursor-pointer hover:scale-105 active:scale-95 transition-all text-xs flex items-center justify-center ${
                  isLight ? 'bg-white border-neutral-200 text-neutral-600 hover:bg-neutral-50' : 'bg-neutral-900 border-neutral-800 text-amber-400 hover:bg-neutral-850'
                }`}
              >
                {isLight ? (
                  <Moon className="w-4 h-4 text-neutral-600" />
                ) : (
                  <Sun className="w-4 h-4 text-amber-500" />
                )}
              </button>

              {/* 4. NOTIFICATION DROPDOWN POPULAR ITEM */}
              <div ref={notificationsRef} className="relative">
                <button
                  onClick={() => setIsNotificationsOpen(!isNotificationsOpen)}
                  className={`p-2.5 rounded-xl border cursor-pointer hover:scale-105 active:scale-95 transition-all relative ${
                    isLight ? 'bg-white border-neutral-200 text-neutral-600 hover:bg-neutral-50' : 'bg-neutral-900 border-neutral-800 text-neutral-300 hover:bg-neutral-850'
                  }`}
                  id="notifications-icon-trigger"
                >
                  <Bell className="w-4 h-4" />
                  {unreadCount > 0 && (
                    <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 text-white text-[8px] font-extrabold flex items-center justify-center rounded-full animate-bounce">
                      {unreadCount}
                    </span>
                  )}
                </button>

                {/* Notifications dropdown popover card */}
                <AnimatePresence>
                  {isNotificationsOpen && (
                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: 10 }}
                      className={`absolute right-0 mt-3.5 w-80 rounded-2xl border p-4.5 z-40 text-xs font-mono shadow-2xl ${
                        isLight ? 'bg-white border-neutral-200 text-neutral-700' : 'bg-neutral-900 border-neutral-800 text-neutral-200'
                      }`}
                    >
                      <div className="flex items-center justify-between border-b border-neutral-800/10 pb-2 mb-3">
                        <span className="font-extrabold text-[10px] text-neutral-500 uppercase font-mono">System Notifications</span>
                        {unreadCount > 0 && (
                          <button 
                            onClick={markAllAsRead}
                            className="text-[9.5px] text-amber-500 hover:underline hover:text-amber-400 font-bold font-mono"
                          >
                            Mark all read
                          </button>
                        )}
                      </div>
                      <div className="space-y-2.5 max-h-64 overflow-y-auto">
                        {notifications.length === 0 ? (
                          <div className="text-center text-neutral-400 italic py-5">Zero active security or stock alerts</div>
                        ) : (
                          notifications.map((notif) => (
                            <div 
                              key={notif.id}
                              onClick={() => handleNotificationClick(notif.id)}
                              className={`p-2.5 border rounded-xl flex items-start gap-2.5 transition-all cursor-pointer ${
                                notif.read 
                                  ? 'opacity-65 border-transparent' 
                                  : (isLight ? 'bg-amber-500/5 border-amber-500/20' : 'bg-[#E5B84B]/5 border-[#E5B84B]/15')
                              }`}
                            >
                              <span className={`w-2 h-2 rounded-full mt-1.5 shrink-0 ${notif.read ? 'bg-neutral-500' : 'bg-amber-500 animate-pulse'}`}></span>
                              <div className="space-y-0.5">
                                <strong className={`block text-[11px] leading-tight ${isLight ? 'text-neutral-800' : 'text-neutral-100'}`}>{notif.title}</strong>
                                <p className="text-[9.5px] text-neutral-400 leading-normal">{notif.message}</p>
                                <span className="text-[8.5px] text-neutral-500 block mt-1">{notif.time}</span>
                              </div>
                            </div>
                          ))
                        )}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* 5. USER PROFILE CONTAINER & MENU */}
              <div ref={profileRef} className="relative">
                <button
                  onClick={() => setIsProfileOpen(!isProfileOpen)}
                  className={`flex items-center gap-2.5 pl-1.5 pr-2.5 py-1.5 rounded-xl border border-transparent cursor-pointer transition-all ${
                    isLight ? 'hover:bg-neutral-50 hover:border-neutral-200' : 'hover:bg-neutral-800 hover:border-neutral-800'
                  }`}
                  id="user-profile-trigger"
                >
                  <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-amber-400 to-yellow-600 font-mono text-neutral-950 font-black text-xs flex items-center justify-center shadow shadow-amber-500/10">
                    {profile?.name ? profile.name.slice(0, 2).toUpperCase() : 'OP'}
                  </div>
                  <div className="hidden sm:block text-left font-mono text-xs">
                    <span className="text-[10px] text-neutral-500 block uppercase leading-none font-bold">Operator</span>
                    <strong className={`font-black uppercase leading-none mt-1 block tracking-tight ${isLight ? 'text-neutral-900' : 'text-white'}`}>
                      {profile?.name || 'Clerk'}
                    </strong>
                  </div>
                </button>

                {/* Profile dialog dropdown card */}
                <AnimatePresence>
                  {isProfileOpen && (
                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: 10 }}
                      className={`absolute right-0 mt-3.5 w-56 rounded-2xl border p-4.5 z-40 text-xs font-mono shadow-2xl ${
                        isLight ? 'bg-white border-neutral-200 text-neutral-700' : 'bg-neutral-900 border-neutral-800 text-neutral-200'
                      }`}
                    >
                      <div className="space-y-2 mb-4">
                        <div className="text-[9px] text-neutral-500 font-black uppercase">Verified Claims Auth Scope</div>
                        <div className="flex items-center gap-2">
                          <span className="inline-block w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></span>
                          <strong className={isLight ? 'text-neutral-800' : 'text-white'}>
                            {profile?.roleId?.replace('_', ' ')?.toUpperCase() || 'OPERATOR'}
                          </strong>
                        </div>
                        <div className="text-[9.5px] text-neutral-450 truncate">Email: {profile?.email || 'unregistered'}</div>
                      </div>

                      <div className="border-t border-neutral-850 my-3.5 pt-3">
                        <button
                          onClick={() => {
                            setActiveTab('settings');
                            setIsProfileOpen(false);
                          }}
                          className={`w-full text-left py-1.5 px-2 rounded-lg flex items-center gap-2 font-black transition-all ${
                            isLight ? 'hover:bg-neutral-50 text-neutral-600' : 'hover:bg-neutral-850 text-neutral-300'
                          }`}
                        >
                          <Settings className="w-3.5 h-3.5 text-[#E5B84B]" />
                          <span>System Preferences</span>
                        </button>
                      </div>

                      {/* Explicit Secure Logout */}
                      <button
                        onClick={() => {
                          setIsProfileOpen(false);
                          logout();
                        }}
                        className="w-full mt-1.5 py-2.5 bg-red-950/20 hover:bg-red-950/40 text-red-500 border border-red-900/40 hover:border-red-500/60 rounded-xl transition-all font-bold text-center flex items-center justify-center gap-1.5 uppercase tracking-wide cursor-pointer font-mono"
                      >
                        <LogOut className="w-3.5 h-3.5" />
                        <span>Sign Out Session</span>
                      </button>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

            </div>
          </header>

          {/* 7. RESPONSIVE CONTENT AREA */}
          <main className={`flex-1 p-6 lg:p-8 overflow-y-auto ${
            isLight ? 'bg-[#FAF9F5]' : 'bg-neutral-950'
          }`} id="erp-view-container-workspace">
            <div className="w-full max-w-7xl mx-auto">
              <AnimatePresence mode="wait">
                <motion.div
                  key={activeTab}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -12 }}
                  transition={{ duration: 0.22 }}
                >
                  {children}
                </motion.div>
              </AnimatePresence>
            </div>
          </main>

        </div>

      </div>

    </div>
  );
};
