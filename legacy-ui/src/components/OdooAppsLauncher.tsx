import React, { useEffect, useMemo, useState } from 'react';
import { ShoppingCart, Boxes, Hammer, CreditCard, Printer, Wrench, Users, HardDrive, BarChart3, Bell, Settings, Search, X, Layers, Truck } from 'lucide-react';
import { MODULES } from '../erpMetadata';
export interface OdooAppItem { id: string; name: string; description: string; category: string; icon: React.ComponentType<{ className?: string }>; accentColor: string }
export const ODOO_APPS: OdooAppItem[] = [
  { id: 'dashboard', name: 'Cockpit', description: 'Scoped ERP aggregates and operational counts', category: 'Operations', icon: BarChart3, accentColor: 'from-purple-600 to-indigo-700' },
  { id: 'orders', name: 'Sales & Orders', description: 'Quotations, orders, partial deliveries and invoices', category: 'Operations', icon: ShoppingCart, accentColor: 'from-blue-600 to-cyan-600' },
  { id: 'purchasing', name: 'Purchasing', description: 'RFQs, purchase orders, receipts and vendor bills', category: 'Operations', icon: Truck, accentColor: 'from-teal-600 to-cyan-700' },
  { id: 'inventory', name: 'Inventory', description: 'Products, stock ledger, adjustments and transfers', category: 'Operations', icon: Boxes, accentColor: 'from-emerald-600 to-teal-700' },
  { id: 'manufacturing', name: 'Manufacturing', description: 'Job inputs, start and output completion', category: 'Operations', icon: Hammer, accentColor: 'from-amber-600 to-yellow-700' },
  { id: 'billing', name: 'Accounting', description: 'Invoices, vendor bills, payments and expenses', category: 'Finance', icon: CreditCard, accentColor: 'from-indigo-600 to-violet-700' },
  { id: 'servicing', name: 'Repairs & Servicing', description: 'Start repairs and mark completed work ready', category: 'Operations', icon: Wrench, accentColor: 'from-rose-600 to-red-700' },
  { id: 'printing', name: 'Printing & Sublimation', description: 'Order-linked printing job workflow', category: 'Operations', icon: Printer, accentColor: 'from-fuchsia-600 to-pink-700' },
  { id: 'customers', name: 'Contacts', description: 'Customer and supplier master records', category: 'Operations', icon: Users, accentColor: 'from-sky-600 to-blue-700' },
  { id: 'reports', name: 'Reporting', description: 'Live scoped aggregates; no forecasts or demo metrics', category: 'Finance', icon: Layers, accentColor: 'from-teal-600 to-emerald-700' },
  { id: 'staff', name: 'Staff Access', description: 'Provisioned staff roles and account status', category: 'Operations', icon: Users, accentColor: 'from-pink-600 to-rose-700' },
  { id: 'notifications', name: 'Notifications & Audit', description: 'Scoped notifications and committed server events', category: 'Productivity', icon: Bell, accentColor: 'from-slate-600 to-zinc-700' },
  { id: 'drive', name: 'Document Vault', description: 'Unavailable: document storage is not connected', category: 'Productivity', icon: HardDrive, accentColor: 'from-sky-500 to-cyan-700' },
  { id: 'settings', name: 'Settings & Branches', description: 'Unavailable: managed through trusted operator tools', category: 'Customization', icon: Settings, accentColor: 'from-neutral-700 to-stone-800' },
];
export function OdooAppsLauncher({ isOpen, onClose, activeTab, onSelectApp }: { isOpen: boolean; onClose: () => void; activeTab: string; onSelectApp: (id: string) => void }) {
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('All');
  useEffect(() => { if (!isOpen) return; const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); }; window.addEventListener('keydown', onKey); return () => window.removeEventListener('keydown', onKey); }, [isOpen, onClose]);
  const apps = useMemo(() => ODOO_APPS.filter(app => (category === 'All' || category === app.category) && `${app.name} ${app.description}`.toLowerCase().includes(search.toLowerCase())), [category, search]);
  if (!isOpen) return null;
  return <div className="fixed inset-0 z-50 bg-neutral-950/80 backdrop-blur-md flex items-start justify-center pt-8 sm:pt-16 p-4" role="dialog" aria-modal="true" aria-label="Applications">
    <div className="relative w-full max-w-4xl bg-[#1e232a] text-neutral-100 rounded-2xl shadow-2xl border border-neutral-700/60 overflow-hidden flex flex-col max-h-[85vh]">
      <header className="px-6 py-5 border-b border-neutral-700/60 flex justify-between bg-[#181c22]"><div><h2 className="font-bold">Applications</h2><p className="text-xs text-neutral-400">Talk of the Town Cricket Closet ERP</p></div><button onClick={onClose} className="erp-button" aria-label="Close applications"><X size={18} /></button></header>
      <div className="px-6 py-3 bg-[#1b1f26] border-b border-neutral-700 flex gap-3 flex-wrap"><label className="relative flex-1 min-w-48"><Search className="w-4 h-4 absolute left-3 top-3 text-neutral-400" /><input className="erp-input !mt-0 !pl-9" autoFocus aria-label="Search applications" value={search} onChange={e => setSearch(e.target.value)} placeholder="Search applications…" /></label><select className="erp-input !mt-0 !w-auto" aria-label="Application category" value={category} onChange={e => setCategory(e.target.value)}>{['All', 'Operations', 'Finance', 'Productivity', 'Customization'].map(value => <option key={value}>{value}</option>)}</select></div>
      <div className="p-6 overflow-y-auto"><div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">{apps.map(app => <button key={app.id} onClick={() => { onSelectApp(app.id); onClose(); }} className={`p-4 rounded-xl border text-left flex flex-col transition ${activeTab === app.id ? 'bg-[#29303d] border-[#714B67] ring-1 ring-[#714B67]' : 'bg-[#181c22] border-neutral-700/50 hover:bg-[#222832] hover:border-neutral-600'}`}>
        <div className={`w-11 h-11 rounded-xl bg-gradient-to-br ${app.accentColor} flex items-center justify-center shadow-md mb-3`}><app.icon className="w-5 h-5 text-white" /></div><h3 className="text-sm font-semibold">{app.name}</h3><p className="text-[11px] text-neutral-400 mt-1">{app.description}</p><div className="mt-3 pt-2 border-t border-neutral-700/40 text-[10px] text-neutral-500 w-full">{MODULES[app.id].entities.length === 0 && MODULES[app.id].unavailable ? 'Unavailable' : app.category}</div>
      </button>)}</div>{!apps.length && <p className="py-12 text-center text-neutral-400">No applications match your search.</p>}</div>
      <footer className="px-6 py-3 bg-[#16191f] border-t border-neutral-700 text-xs text-neutral-400 flex justify-between"><span>Esc to close · Authenticated ERP API</span><span>Imphal, Manipur, India</span></footer>
    </div>
  </div>;
}
