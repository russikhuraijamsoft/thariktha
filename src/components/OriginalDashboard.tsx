import React from 'react';
import { ArrowRight, ClipboardList, Hammer, IndianRupee, Package, Printer, ShieldCheck, Wrench, Zap } from 'lucide-react';
import { useERPRecords } from '../hooks/useERPRecords';
import type { DashboardDatasetState } from './MetricDashboard';

const SUMMARY_TILES = [
  { entity: 'orders', module: 'orders', label: 'Sales order records', Icon: ClipboardList },
  { entity: 'manufacturing_jobs', module: 'manufacturing', label: 'Manufacturing job records', Icon: Hammer },
  { entity: 'inventory', module: 'inventory', label: 'Stock balance records', Icon: Package },
  { entity: 'invoices', module: 'billing', label: 'Customer invoice records', Icon: IndianRupee },
] as const;
export type DashboardSummaryEntity = typeof SUMMARY_TILES[number]['entity'];
export interface OriginalDashboardViewProps {
  summaries: Record<DashboardSummaryEntity, DashboardDatasetState>;
  onNavigate: (module: string) => void;
}

export function OriginalDashboardView({ summaries, onNavigate }: OriginalDashboardViewProps) {
  return <section className="space-y-8 text-[var(--text-main)]" aria-labelledby="dashboard-cockpit-title">
    <header className="flex flex-wrap items-end justify-between gap-3">
      <div><p className="text-[10px] font-mono font-bold tracking-widest uppercase text-[var(--text-muted)]">Thariktha · Cricket Closet ERP</p><h1 id="dashboard-cockpit-title" className="text-2xl lg:text-3xl font-black tracking-tight mt-1">Dashboard Cockpit</h1></div>
      <button type="button" className="erp-button" onClick={() => onNavigate('reports')}>Operational reports <ArrowRight size={15} aria-hidden="true" /></button>
    </header>

    <div className="relative bg-gradient-to-br from-[#24221f] via-[#141312] to-[#29251e] rounded-2xl p-6 lg:p-8 border border-[#39352e] overflow-hidden shadow-xl" aria-labelledby="workshop-hero-title">
      <div aria-hidden="true" className="absolute right-0 top-0 w-80 h-80 bg-gradient-to-br from-amber-500/10 to-transparent rounded-full blur-3xl pointer-events-none" />
      <div className="relative z-10 max-w-4xl space-y-4">
        <span className="inline-flex items-center gap-1.5 text-[10px] font-mono tracking-widest text-[#E5B84B] font-black uppercase bg-[#E5B84B]/10 px-2.5 py-1 rounded-full border border-[#E5B84B]/20"><Zap size={12} aria-hidden="true" /> Dynamic Operations Center</span>
        <h2 id="workshop-hero-title" className="text-2xl lg:text-3xl font-black text-[#fffaf0] tracking-tight leading-tight uppercase">Cricket Closet Workshop Overflow</h2>
        <p className="text-[#c8c0b2] text-xs lg:text-sm font-mono leading-relaxed max-w-3xl">Coordinate sales, stock, custom fabrication, jersey sublimation and repairs from your authorized company / branch records.</p>
        <div className="flex flex-wrap gap-3 pt-1"><button type="button" className="erp-primary" onClick={() => onNavigate('orders')}>Open sales workspace <ArrowRight size={15} aria-hidden="true" /></button><button type="button" className="inline-flex items-center gap-2 rounded-lg border border-[#635841] px-3 py-2 text-sm font-medium text-[#E5B84B] hover:bg-[#E5B84B]/10 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-400" onClick={() => onNavigate('manufacturing')}>Workshop jobs <Hammer size={15} aria-hidden="true" /></button></div>
      </div>
    </div>

    <section aria-label="Authorized record summaries">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4" id="kpi-matrix">
        {SUMMARY_TILES.map(({ entity, module, label, Icon }) => {
          const { records, loading, error, onRefresh } = summaries[entity];
          return <section key={entity} className="erp-panel min-w-0 space-y-3" aria-label={label}>
            <div className="flex justify-between items-start gap-3"><h2 className="text-[10px] font-mono font-bold tracking-wider uppercase text-[var(--text-sub)]">{label}</h2><span className="w-10 h-10 rounded-lg bg-amber-500/10 text-amber-700 border border-amber-500/20 flex items-center justify-center shrink-0"><Icon size={20} aria-hidden="true" /></span></div>
            {loading ? <p role="status" className="text-sm text-[var(--text-sub)]">Loading authoritative records…</p> : error ? <p role="alert" className="erp-error text-xs">Unavailable: {error}</p> : <>
              <p className="text-2xl font-black font-mono">{records.length}<span className="text-xs font-normal text-[var(--text-muted)] ml-2">records returned</span></p>
              <p className="text-[11px] text-[var(--text-sub)]">{records.length ? 'Authorized company / branch scope.' : 'No records in your authorized scope.'}</p>
            </>}
            <div className="flex flex-wrap gap-2"><button type="button" className="erp-button text-xs" disabled={loading} onClick={() => void onRefresh()}>{error && !loading ? 'Retry' : 'Refresh'}</button><button type="button" className="erp-button text-xs" onClick={() => onNavigate(module)}>Open <ArrowRight size={12} aria-hidden="true" /></button></div>
          </section>;
        })}
      </div>
      <p className="mt-3 text-xs text-[var(--text-muted)]">Counts describe returned records, not active queues, stock quantities or financial balances. Each dataset loads independently; an unavailable dataset is not zero.</p>
    </section>

    <div className="grid grid-cols-1 xl:grid-cols-12 gap-6" id="dashboard-mesh-dashboard">
      <div className="xl:col-span-7 space-y-6">
        <section className="erp-panel space-y-4" aria-labelledby="workshop-operations-title">
          <div><h2 id="workshop-operations-title" className="text-xs font-bold font-mono tracking-widest uppercase">Workshop Operations Desk</h2><p className="text-xs text-[var(--text-sub)] mt-1">Review recorded jobs and their workflow stages in the dedicated workspaces.</p></div>
          <div className="grid sm:grid-cols-3 gap-3">{[
            { module: 'manufacturing', title: 'Custom Fabrication', text: 'Manufacturing jobs', Icon: Hammer },
            { module: 'printing', title: 'Printing & Sublimation', text: 'Jersey and printing jobs', Icon: Printer },
            { module: 'servicing', title: 'Repairs & Servicing', text: 'Repair jobs', Icon: Wrench },
          ].map(({ module, title, text, Icon }) => <button type="button" key={module} onClick={() => onNavigate(module)} className="rounded-xl border border-[var(--border-card)] bg-[var(--bg-inner)] p-4 text-left space-y-2 hover:border-amber-500 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-500"><Icon className="text-amber-700" size={20} aria-hidden="true" /><span className="block text-sm font-bold">{title}</span><span className="block text-xs text-[var(--text-sub)]">{text}</span><ArrowRight size={14} aria-hidden="true" /></button>)}</div>
        </section>
        <section className="erp-panel space-y-4" aria-labelledby="stock-desk-title">
          <div><h2 id="stock-desk-title" className="text-xs font-bold font-mono tracking-widest uppercase">Inventory & Replenishment Desk</h2><p className="text-xs text-[var(--text-sub)] mt-1">Inspect stock balances and the stock ledger before using the existing purchasing or adjustment workflows. Low-stock thresholds are not evaluated here.</p></div>
          <div className="flex flex-wrap gap-2"><button type="button" className="erp-button" onClick={() => onNavigate('inventory')}>Review inventory</button><button type="button" className="erp-button" onClick={() => onNavigate('purchasing')}>Open purchasing</button></div>
        </section>
      </div>
      <div className="xl:col-span-5 space-y-6">
        <section className="erp-panel space-y-4" aria-labelledby="quick-navigation-title">
          <h2 id="quick-navigation-title" className="text-xs font-bold font-mono tracking-widest uppercase">Quick Navigation</h2>
          <nav aria-label="Dashboard quick navigation" className="grid sm:grid-cols-2 gap-2">{[
            ['orders', 'Sales & Orders'], ['customers', 'Customer Contacts'], ['billing', 'Invoices & Payments'], ['reports', 'Operational Reports'], ['notifications', 'Notifications & Audit'], ['staff', 'Staff Access'],
          ].map(([module, label]) => <button type="button" key={module} className="erp-button justify-between" onClick={() => onNavigate(module)}>{label}<ArrowRight size={14} aria-hidden="true" /></button>)}</nav>
        </section>
        <section className="erp-panel space-y-3" aria-labelledby="reporting-boundary-title">
          <h2 id="reporting-boundary-title" className="text-xs font-bold font-mono tracking-widest uppercase flex items-center gap-2"><ShieldCheck size={16} className="text-amber-700" aria-hidden="true" /> Financial Reporting Boundary</h2>
          <p className="text-xs text-[var(--text-sub)] leading-relaxed">Reports show recorded INR amounts and unpaid balances where applicable, separately for each dataset. These are not recognized revenue or profit; sales orders and invoices are not combined.</p>
          <p className="text-xs text-[var(--text-muted)] leading-relaxed">Revenue growth, weekly valuation trends and forecasts are unavailable. No estimated chart or connection-status claim is displayed.</p>
          <button type="button" className="erp-button" onClick={() => onNavigate('reports')}>Review dataset reports <ArrowRight size={14} aria-hidden="true" /></button>
        </section>
      </div>
    </div>
  </section>;
}

export function OriginalDashboard({ revision, onNavigate }: { revision: number; onNavigate: (module: string) => void }) {
  const orders = useERPRecords('orders', revision);
  const manufacturing = useERPRecords('manufacturing_jobs', revision);
  const inventory = useERPRecords('inventory', revision);
  const invoices = useERPRecords('invoices', revision);
  const state = (dataset: ReturnType<typeof useERPRecords>): DashboardDatasetState => ({ records: dataset.records, loading: dataset.loading, error: dataset.error, onRefresh: dataset.refresh });
  return <OriginalDashboardView onNavigate={onNavigate} summaries={{ orders: state(orders), manufacturing_jobs: state(manufacturing), inventory: state(inventory), invoices: state(invoices) }} />;
}
