import React, { useState } from 'react';
import { Plus, RefreshCw, Users } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useERPRecords } from '../hooks/useERPRecords';
import { canWrite, ENTITIES } from '../erpMetadata';
import type { ERPRecord } from '../services/erpApi';
import type { UserProfile } from '../types/auth';
import { customerCounts, customerText, selectCustomers, type CustomerFilter, type CustomerViewMode } from '../services/customerWorkspace';

interface Callbacks { onNew: () => void; onOpen: (record: ERPRecord) => void }
export interface CustomersWorkspaceViewProps extends Callbacks {
  profile: UserProfile | null;
  records: ERPRecord[];
  loading: boolean;
  error: string;
  onRefresh: () => void;
  search: string;
  onSearchChange: (value: string) => void;
  filter: CustomerFilter;
  onFilterChange: (value: CustomerFilter) => void;
  view: CustomerViewMode;
  onViewChange: (value: CustomerViewMode) => void;
}

// Presentation is injectable so loading/error/permission states can be tested without auth or a DOM.
export function CustomersWorkspaceView(props: CustomersWorkspaceViewProps) {
  const { profile, records, loading, error, search, filter, view, onNew, onOpen, onRefresh } = props;
  const ready = !loading && !error;
  const visible = ready ? selectCustomers(records, search, filter) : [];
  const counts = ready ? customerCounts(records) : null;
  const writable = !!profile && !!ENTITIES.customers.create && canWrite(profile.role, 'customers');
  return <section className="bg-slate-50 text-slate-800 p-4 sm:p-6 rounded-3xl border border-slate-200 space-y-5" aria-label="Customer CRM workspace" aria-busy={loading}>
    <header className="bg-gradient-to-r from-slate-900 to-slate-800 rounded-2xl p-5 sm:p-6 text-white flex flex-wrap items-center justify-between gap-4">
      <div className="space-y-2">
        <span className="text-[10px] uppercase tracking-wider font-mono font-bold text-amber-300">CRM Workspace · Customer directory</span>
        <h2 className="text-xl font-bold">Talk of the Town · Cricket Closet Customers</h2>
        <p className="text-xs text-slate-300">Customer contacts in your server-authorized company / branch scope.</p>
      </div>
      {writable && <button type="button" onClick={onNew} className="bg-[#E5B84B] hover:bg-amber-400 text-slate-950 font-bold py-2.5 px-4 rounded-xl text-sm flex gap-2 items-center"><Plus size={16} /> Onboard customer</button>}
    </header>
    {counts && <div className="grid grid-cols-2 lg:grid-cols-4 gap-3" aria-label="Loaded customer counts">
      {[['Loaded profiles', counts.total], ['Active profiles', counts.active], ['Archived profiles', counts.archived], ['Matching profiles', visible.length]].map(([label, count]) => <div key={label} className="bg-white rounded-2xl border border-slate-200 p-4"><p className="text-xs text-slate-500 font-mono">{label}</p><p className="text-3xl font-bold mt-1">{count}</p></div>)}
    </div>}
    <div className="bg-white border border-slate-200 rounded-2xl p-4 flex flex-wrap items-end gap-3">
      <label className="flex-1 min-w-48 text-xs font-semibold">Search customers
        <input type="search" value={search} onChange={e => props.onSearchChange(e.target.value)} placeholder="Name, phone, email, address or ID" className="block w-full mt-1 p-2 rounded-lg border border-slate-300 bg-white text-slate-900" />
      </label>
      <label className="text-xs font-semibold">Status
        <select value={filter} onChange={e => props.onFilterChange(e.target.value as CustomerFilter)} className="block mt-1 p-2 rounded-lg border border-slate-300 bg-white text-slate-900">
          <option value="all">All statuses</option><option value="active">Active</option><option value="archived">Archived</option>
        </select>
      </label>
      <div className="flex gap-1" role="group" aria-label="Customer view">
        {(['cards', 'list'] as const).map(mode => <button type="button" key={mode} aria-pressed={view === mode} onClick={() => props.onViewChange(mode)} className={`px-3 py-2 border rounded-lg text-sm ${view === mode ? 'bg-slate-900 text-white border-slate-900' : 'bg-white border-slate-300'}`}>{mode === 'cards' ? 'Cards' : 'List'}</button>)}
      </div>
      <button type="button" disabled={loading} onClick={onRefresh} className="px-3 py-2 border border-slate-300 rounded-lg text-sm flex items-center gap-2 disabled:opacity-50"><RefreshCw size={14} /> Refresh</button>
    </div>
    {loading ? <p role="status" className="p-8 text-center text-slate-600">Loading customers from the ERP API…</p>
      : error ? <div role="alert" className="bg-rose-50 border border-rose-200 text-rose-800 p-5 rounded-2xl"><h3 className="font-bold">Customers unavailable</h3><p className="text-sm mt-2">{error}</p><p className="text-xs mt-2">No customer list or counts are shown until a successful response.</p><button type="button" onClick={onRefresh} className="mt-3 px-4 py-2 border border-rose-300 rounded-lg font-semibold">Retry</button></div>
      : !visible.length ? <div className="bg-white border border-slate-200 rounded-2xl p-8 text-center"><Users size={24} className="mx-auto text-slate-400 mb-3" /><h3 className="font-semibold">{records.length ? 'No customers match your search and status filter.' : 'No customers in your authorized company / branch scope.'}</h3><p className="text-sm text-slate-500 mt-2">{records.length ? 'Change the search or choose All statuses.' : writable ? 'Use Onboard customer to create a server-validated contact.' : 'Customer records will appear here when available.'}</p></div>
      : view === 'cards' ? <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-4" aria-label="Customer cards">{visible.map(record => <article key={record.id} className="bg-white border border-slate-200 rounded-2xl p-4 space-y-3">
        <div className="flex justify-between gap-2 items-start"><h3 className="font-bold break-words">{customerText(record.name)}</h3><span className="text-xs bg-slate-100 rounded px-2 py-1">{customerText(record.status)}</span></div>
        <p className="text-xs text-slate-500 break-all font-mono">Ref: {record.id}</p>
        <dl className="text-sm space-y-2">{(['phone', 'email', 'address'] as const).map(field => <div key={field}><dt className="text-xs text-slate-500 capitalize">{field}</dt><dd className="break-words">{customerText(record[field])}</dd></div>)}</dl>
        <button type="button" onClick={() => onOpen(record)} className="w-full text-sm font-semibold border border-amber-300 hover:bg-amber-50 rounded-lg p-2" aria-label={`Open customer ${customerText(record.name)} (${record.id})`}>Open details</button>
      </article>)}</div>
      : <div className="overflow-x-auto rounded-2xl bg-white border border-slate-200"><table className="w-full text-sm text-left"><caption className="p-3 text-left text-slate-500">Customers matching the current search and filter</caption><thead className="bg-slate-100"><tr>{['Customer', 'ID', 'Phone', 'Email', 'Address', 'Status', 'Details'].map(label => <th className="p-3" scope="col" key={label}>{label}</th>)}</tr></thead><tbody>{visible.map(record => <tr key={record.id} className="border-t border-slate-200"><th scope="row" className="p-3">{customerText(record.name)}</th>{(['id', 'phone', 'email', 'address', 'status'] as const).map(field => <td key={field} className="p-3 break-words">{customerText(record[field])}</td>)}<td className="p-3"><button type="button" onClick={() => onOpen(record)} className="underline font-semibold" aria-label={`Open customer ${customerText(record.name)} (${record.id})`}>Open details</button></td></tr>)}</tbody></table></div>}
    <footer className="text-xs text-slate-500">Company {profile?.companyId} · Branch {profile?.branchId} · Counts cover only records returned by the scoped API, not lifetime sales. No offline business cache. Changes require server confirmation.</footer>
  </section>;
}

export function CustomersWorkspace({ revision, onNew, onOpen }: Callbacks & { revision: number }) {
  const { profile } = useAuth();
  const { records, loading, error, refresh } = useERPRecords('customers', revision);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<CustomerFilter>('all');
  const [view, setView] = useState<CustomerViewMode>('cards');
  return <CustomersWorkspaceView profile={profile} records={records} loading={loading} error={error} onRefresh={() => void refresh()} search={search} onSearchChange={setSearch} filter={filter} onFilterChange={setFilter} view={view} onViewChange={setView} onNew={onNew} onOpen={onOpen} />;
}
