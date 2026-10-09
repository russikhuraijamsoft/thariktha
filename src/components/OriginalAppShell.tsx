import React, { useState } from 'react';
import { BarChart3, Bell, Boxes, ChevronRight, CreditCard, FileText, Grid3X3, Hammer, HardDrive, LayoutDashboard, LogOut, MapPin, Menu, Moon, Printer, Search, Settings, ShieldCheck, ShoppingCart, Sun, Truck, Users, Wrench, X } from 'lucide-react';
import { MODULES } from '../erpMetadata';
import type { UserProfile } from '../types/auth';

// The archive is visual reference only. Navigation targets the active secure modules.
const GROUPS = [
  { title: 'Operations', items: [
    { id: 'dashboard', label: 'Dashboard Cockpit', Icon: LayoutDashboard },
    { id: 'orders', label: 'Sales Orders', Icon: ShoppingCart },
    { id: 'purchasing', label: 'Purchasing & Suppliers', Icon: Truck },
    { id: 'inventory', label: 'Inventory Stock', Icon: Boxes },
    { id: 'manufacturing', label: 'Workshops & Craft', Icon: Hammer },
    { id: 'printing', label: 'Apparel & Printing', Icon: Printer },
    { id: 'servicing', label: 'Repairs & Servicing', Icon: Wrench },
  ] },
  { title: 'Commerce & Finance', items: [
    { id: 'customers', label: 'CRM Clubs & Athletes', Icon: Users },
    { id: 'billing', label: 'Bookkeeping Desk', Icon: CreditCard },
    { id: 'reports', label: 'Operational Reports', Icon: BarChart3 },
  ] },
  { title: 'Security & Customisation', items: [
    { id: 'drive', label: 'Google Drive Storage', Icon: HardDrive },
    { id: 'notifications', label: 'Sentry Audit & Alerts', Icon: Bell },
    { id: 'staff', label: 'Personnel Directory', Icon: Users },
    { id: 'settings', label: 'System Settings', Icon: Settings },
  ] },
] as const;
export const ORIGINAL_NAVIGATION = GROUPS.flatMap(group => [...group.items]);
export interface OriginalAppShellProps {
  activeModule: string;
  onNavigate: (module: string) => void;
  profile: UserProfile | null;
  brandLogo: string;
  onLogout: () => void;
  onOpenApplications: () => void;
  children: React.ReactNode;
}
export interface OriginalAppShellViewProps extends OriginalAppShellProps {
  theme: 'light' | 'dark';
  onToggleTheme: () => void;
  mobileOpen: boolean;
  onToggleMobile: () => void;
  search: string;
  onSearchChange: (value: string) => void;
}
export function OriginalAppShellView(props: OriginalAppShellViewProps) {
  const { activeModule, profile, brandLogo, theme, mobileOpen, search } = props;
  const current = ORIGINAL_NAVIGATION.find(item => item.id === activeModule);
  const matches = ORIGINAL_NAVIGATION.filter(item => `${item.label} ${MODULES[item.id].title}`.toLowerCase().includes(search.trim().toLowerCase()));
  const brand = <div className="flex items-center gap-3.5 pb-5 mb-5 border-b border-[#2b2b2b]">
    <img src={brandLogo} alt="Talk of the Town Logo" className="w-11 h-11 rounded-xl object-cover border border-[#333] shadow-lg shadow-amber-500/10 shrink-0" />
    <div><span className="text-[9px] font-mono tracking-widest text-[#E5B84B] font-bold uppercase bg-amber-500/10 px-1.5 py-0.5 rounded border border-amber-500/15">ERP Platform</span><h1 className="text-sm font-black text-[#fff] tracking-widest mt-2 leading-tight">TALK OF THE TOWN</h1><p className="text-[10px] text-[#aaa] font-mono mt-1">CRICKET CLOSET</p></div>
  </div>;
  const navigation = (label: string) => <nav aria-label={label} className="space-y-5 flex-1">{GROUPS.map(group => <div key={group.title} className="space-y-2">
    <p className="text-[9px] font-mono tracking-widest text-[#888] uppercase font-black px-3.5">{group.title}</p>
    <div className="space-y-1">{group.items.map(({ id, label: name, Icon }) => <button type="button" key={id} aria-current={activeModule === id ? 'page' : undefined} onClick={() => props.onNavigate(id)} className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-[11px] font-bold font-mono tracking-wide uppercase transition-colors border text-left ${activeModule === id ? 'bg-[#E5B84B] text-[#141312] border-[#E5B84B] shadow-md shadow-amber-500/10' : 'text-[#aaa] border-transparent hover:bg-[#262626] hover:text-[#fff]'}`}><Icon size={16} className={activeModule === id ? 'text-[#141312]' : 'text-[#E5B84B]'} aria-hidden="true" /><span>{name}</span></button>)}</div>
  </div>)}</nav>;
  const scope = <div className="mt-6 rounded-xl p-3.5 border border-[#303030] bg-[#111] text-[10px] font-mono space-y-2">
    <p className="text-[#E5B84B] font-bold flex gap-2 items-center"><ShieldCheck size={14} aria-hidden="true" /> SERVER-AUTHORIZED SCOPE</p>
    <p className="text-[#bbb] break-all">{profile?.companyId || 'Scope unavailable'}</p><p className="text-[#aaa]">Branch {profile?.branchId || 'unavailable'} · {profile?.role || 'unavailable'}</p>
    <p className="text-[#888] leading-relaxed">No client-side branch switch or offline business cache.</p>
  </div>;
  return <div className={`original-design ${theme === 'light' ? 'theme-light' : 'theme-dark'} min-h-screen font-sans antialiased selection:bg-amber-500 selection:text-neutral-950`} id="talk-of-the-town-viewport" data-design="original" data-theme={theme}>
    <a href="#erp-view-container-workspace" className="sr-only focus:not-sr-only focus:fixed focus:z-50 focus:top-2 focus:left-2 erp-button">Skip to workspace</a>
    <div className="lg:hidden bg-[#171717] text-[#fff] border-b border-[#303030] px-4 py-3.5 flex items-center justify-between gap-3">
      <div className="flex items-center gap-3"><img src={brandLogo} alt="Talk of the Town Logo" className="w-9 h-9 rounded-lg object-cover" /><div><p className="text-sm font-black tracking-tight">CRICKET CLOSET</p><p className="text-[9px] font-mono text-[#E5B84B]">Talk of the Town · ERP</p></div></div>
      <button type="button" onClick={props.onToggleMobile} aria-expanded={mobileOpen} aria-controls="original-mobile-navigation" aria-label={mobileOpen ? 'Close navigation' : 'Open navigation'} className="rounded-lg border border-[#444] bg-[#242424] p-2">{mobileOpen ? <X size={20} /> : <Menu size={20} />}</button>
    </div>
    {mobileOpen && <div id="original-mobile-navigation" className="lg:hidden bg-[#171717] p-5 border-b border-[#303030]" onKeyDown={event => { if (event.key === 'Escape') props.onToggleMobile(); }}>{navigation('Mobile ERP navigation')}</div>}
    <div className="flex flex-col lg:flex-row min-h-screen">
      <aside className="hidden lg:flex w-72 bg-[#171717] border-r border-[#2b2b2b] p-5 flex-col shrink-0" id="erp-sidebar-desktop">{brand}{navigation('ERP navigation')}{scope}</aside>
      <div className="flex-1 min-w-0 flex flex-col">
        <header className="original-topbar p-4 lg:px-8 flex flex-wrap items-center gap-4 border-b border-[var(--border-card)]">
          <div className="flex items-center gap-2 text-[11px] font-mono tracking-wide min-w-0"><span className="text-[var(--text-muted)] hidden sm:inline">ERP Channels</span><ChevronRight size={14} aria-hidden="true" className="hidden sm:block" /><strong className="uppercase truncate">{current?.label || MODULES[activeModule]?.title || 'Workspace'}</strong></div>
          <div className="relative flex-1 min-w-48 max-w-lg">
            <label htmlFor="original-workspace-search" className="sr-only">Find a workspace</label><Search size={15} className="absolute left-3 top-3 text-[var(--text-muted)] pointer-events-none" aria-hidden="true" />
            <input id="original-workspace-search" type="search" placeholder="Find a workspace…" value={search} onChange={event => props.onSearchChange(event.target.value)} className="erp-input pl-9 !mt-0" />
            {search.trim() && <div className="absolute left-0 right-0 top-full mt-2 z-30 erp-panel shadow-xl" aria-label="Matching workspaces"><p className="font-mono uppercase text-[10px] text-[var(--text-muted)] mb-2">Workspace navigation · not record search</p>{matches.length ? matches.map(item => <button type="button" key={item.id} className="erp-button w-full justify-between mb-1 text-left" onClick={() => props.onNavigate(item.id)}>{item.label}<ChevronRight size={14} aria-hidden="true" /></button>) : <p role="status" className="text-sm">No matching workspaces.</p>}</div>}
          </div>
          <div className="flex items-center gap-2 ml-auto">
            <span className="hidden xl:flex items-center gap-1.5 text-[10px] font-mono text-[var(--text-sub)]"><MapPin size={14} className="text-amber-600" aria-hidden="true" />{profile?.branchId || 'Scope unavailable'}</span>
            <button type="button" className="erp-button p-2.5" onClick={props.onOpenApplications} aria-label="Open applications"><Grid3X3 size={16} /></button>
            <button type="button" className="erp-button p-2.5" onClick={props.onToggleTheme} aria-label={theme === 'light' ? 'Use dark theme' : 'Use light theme'}>{theme === 'light' ? <Moon size={16} /> : <Sun size={16} />}</button>
            <button type="button" className="erp-button p-2.5" onClick={() => props.onNavigate('notifications')} aria-label="Open notifications and audit"><Bell size={16} /></button>
            <details className="relative"><summary className="erp-button cursor-pointer text-xs list-none" aria-label="Account and session details"><Users size={15} aria-hidden="true" /><span>{profile?.name || 'Account'} · {profile?.role || 'Unavailable'}</span></summary><div className="absolute right-0 mt-2 w-64 max-w-[85vw] z-40 erp-panel shadow-xl text-xs space-y-3"><p className="text-[10px] font-mono uppercase text-[var(--text-muted)]">Authenticated ERP profile</p><strong>{profile?.name || profile?.uid || 'Unavailable'}</strong><p className="break-all">Company {profile?.companyId || 'Unavailable'}</p><p>Branch {profile?.branchId || 'Unavailable'} · {profile?.role || 'Unavailable'}</p><button type="button" className="erp-button w-full" onClick={props.onLogout}><LogOut size={15} aria-hidden="true" />Sign out / switch account</button></div></details>
          </div>
        </header>
        <div className="px-4 lg:px-8 py-2 border-b border-[var(--border-card)] text-[10px] font-mono text-[var(--text-muted)] break-words">Company {profile?.companyId || 'Unavailable'} · Branch {profile?.branchId || 'Unavailable'} · INR · Server-authorized scope</div>
        <main className="flex-1 relative p-4 sm:p-6 lg:p-8" id="erp-view-container-workspace" tabIndex={-1}>
          <div aria-hidden="true" className="absolute inset-0 pointer-events-none opacity-[0.025] flex items-center justify-center overflow-hidden"><img src={brandLogo} alt="" className="w-[500px] max-w-full object-contain" /></div>
          <div className="relative z-10 max-w-7xl mx-auto">{props.children}</div>
        </main>
        <footer className="px-4 lg:px-8 py-4 text-[10px] font-mono text-[var(--text-muted)] border-t border-[var(--border-card)] flex flex-wrap gap-2 justify-between"><span>Talk of the Town · Cricket Closet ERP</span><span className="inline-flex items-center gap-1"><FileText size={12} aria-hidden="true" />Unavailable integrations are labelled in their workspaces.</span></footer>
      </div>
    </div>
  </div>;
}
export function OriginalAppShell(props: OriginalAppShellProps) {
  const [theme, setTheme] = useState<'light' | 'dark'>('light');
  const [mobileOpen, setMobileOpen] = useState(false);
  const [search, setSearch] = useState('');
  function navigate(module: string) { if (!MODULES[module]) return; setMobileOpen(false); setSearch(''); props.onNavigate(module); }
  return <OriginalAppShellView {...props} onNavigate={navigate} theme={theme} onToggleTheme={() => setTheme(current => current === 'light' ? 'dark' : 'light')} mobileOpen={mobileOpen} onToggleMobile={() => setMobileOpen(current => !current)} search={search} onSearchChange={setSearch} />;
}
