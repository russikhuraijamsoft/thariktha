import React, { useState } from 'react';
import { Boxes, ClipboardList, Grid2X2, List, Plus, RefreshCw } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useERPRecords } from '../hooks/useERPRecords';
import { canWrite, ENTITIES, MODULES, money } from '../erpMetadata';
import type { ERPRecord } from '../services/erpApi';
import type { UserProfile } from '../types/auth';

export interface DesignedEntityWorkspaceProps {
  entity: string;
  revision: number;
  onNew: () => void;
  onOpen: (record: ERPRecord) => void;
}
export type DesignedWorkspaceMode = 'table' | 'cards';
export interface DesignedEntityWorkspaceViewProps extends Omit<DesignedEntityWorkspaceProps, 'revision'> {
  profile: UserProfile | null;
  records: ERPRecord[];
  loading: boolean;
  error: string;
  onRefresh: () => void;
  search: string;
  onSearchChange: (value: string) => void;
  filter: string;
  onFilterChange: (value: string) => void;
  view: DesignedWorkspaceMode;
  onViewChange: (value: DesignedWorkspaceMode) => void;
}

// Only explicitly permitted, textual top-level fields are searchable. Never serialize a
// record: notes, scope, financial values and nested/private payloads are not search fields.
const SEARCH_FIELDS = ['id', 'number', 'name', 'description', 'sku', 'barcode', 'category',
  'customerId', 'customerName', 'supplierId', 'supplierName', 'productId', 'productName',
  'warehouseId', 'warehouseName', 'status', 'type', 'reference', 'reason', 'unit',
  'email', 'phone', 'address'] as const;
function text(value: unknown): string | undefined {
  return typeof value === 'string' && value.trim() ? value.trim() : undefined;
}
function statusOf(record: ERPRecord) { return text(record.status); }
export function selectDesignedRecords(records: ERPRecord[], search: string, filter: string): ERPRecord[] {
  const query = search.trim().toLowerCase();
  return records.filter(record => (filter === 'all' || statusOf(record) === filter)
    && (!query || SEARCH_FIELDS.some(field => text(record[field])?.toLowerCase().includes(query))));
}
function recordTitle(record: ERPRecord): string {
  for (const key of ['number', 'name', 'description', 'sku', 'productName', 'productId', 'id']) {
    const value = text(record[key]);
    if (value) return value;
  }
  return 'Not provided';
}

interface Column { key: string; label: string; kind?: 'money' | 'number' | 'date' }
// Columns follow the actual returned schema. In particular quantity is not inferred
// from order lines, product settings or stockTracked/minimumStock/catalog records.
const COLUMNS: Column[] = [
  { key: 'number', label: 'Document number' }, { key: 'name', label: 'Name' },
  { key: 'description', label: 'Description' }, { key: 'sku', label: 'SKU' },
  { key: 'category', label: 'Category' }, { key: 'customerName', label: 'Customer name' },
  { key: 'customerId', label: 'Customer ID' }, { key: 'supplierId', label: 'Supplier ID' },
  { key: 'productName', label: 'Product name' }, { key: 'productId', label: 'Product ID' },
  { key: 'warehouseId', label: 'Warehouse ID' }, { key: 'fromWarehouseId', label: 'From warehouse' },
  { key: 'toWarehouseId', label: 'To warehouse' }, { key: 'status', label: 'Status' },
  { key: 'type', label: 'Type' }, { key: 'quantity', label: 'Quantity', kind: 'number' },
  { key: 'unit', label: 'Unit' }, { key: 'totalAmount', label: 'Document total', kind: 'money' },
  { key: 'amount', label: 'Amount', kind: 'money' }, { key: 'amountPaid', label: 'Amount paid', kind: 'money' },
  { key: 'unitPrice', label: 'Unit price', kind: 'money' }, { key: 'reference', label: 'Reference' },
  { key: 'reason', label: 'Reason' }, { key: 'phone', label: 'Phone' },
  { key: 'email', label: 'Email' }, { key: 'address', label: 'Address' },
  { key: 'createdAt', label: 'Created', kind: 'date' },
];
function fieldValue(record: ERPRecord, column: Column): string {
  const value: unknown = record[column.key];
  if (column.kind === 'number' || column.kind === 'money') {
    if (typeof value !== 'number' || !Number.isFinite(value)) return 'Not provided';
    return column.kind === 'money' ? money(value) : String(value);
  }
  if (column.kind === 'date' && value && typeof value === 'object') {
    const timestamp = value as { seconds?: unknown; _seconds?: unknown };
    const seconds = timestamp.seconds ?? timestamp._seconds;
    if (typeof seconds === 'number' && Number.isFinite(seconds)) {
      const date = new Date(seconds * 1000);
      if (Number.isFinite(date.getTime())) return date.toISOString();
    }
    return 'Not provided';
  }
  const label = text(value);
  return label ? (column.key === 'status' ? label.replaceAll('_', ' ') : label) : 'Not provided';
}

// Injectable presentation; the wrapper below is the only production data source.
export function DesignedEntityWorkspaceView(props: DesignedEntityWorkspaceViewProps) {
  const { entity, profile, records, loading, error, search, filter, view, onNew, onOpen, onRefresh } = props;
  const metadata = ENTITIES[entity];
  const inventory = MODULES.inventory.entities.includes(entity);
  const label = metadata?.label ?? 'Records';
  const ready = !loading && !error;
  const loaded = ready ? records : [];
  const visible = selectDesignedRecords(loaded, search, filter);
  const reportedStatuses = [...new Set(loaded.map(statusOf).filter((value): value is string => !!value))];
  const statuses = [...new Set([...(metadata?.stages ?? []), ...reportedStatuses])];
  const columns = COLUMNS.filter(column => column.key === 'status' || loaded.some(record => Object.hasOwn(record, column.key)));
  const writable = !!profile && !!metadata?.create && canWrite(profile.role, entity);
  const Icon = inventory ? Boxes : ClipboardList;
  const panelStyle = { background: 'var(--bg-card, #fffdf7)', borderColor: 'var(--border-card, #e3dec9)' };
  const mutedStyle = { color: 'var(--text-muted, #777365)' };
  const summary: [string, number, string][] = [
    ['Loaded records', loaded.length, 'Returned by the scoped API'],
    ['Matching records', visible.length, 'Current search and status filter'],
    ['Reported statuses', reportedStatuses.length, 'Distinct explicit status values'],
    ['Status not provided', loaded.filter(record => !statusOf(record)).length, 'No business state inferred'],
  ];
  return <section className="designed-entity-workspace rounded-3xl border p-4 sm:p-6 space-y-5 font-sans" style={{ background: 'var(--bg-main, #f4f3eb)', borderColor: 'var(--border-card, #e3dec9)', color: 'var(--text-main, #1a1a1a)' }} aria-label={`${label} workspace`} aria-busy={loading}>
    <header className="erp-panel rounded-2xl p-5 sm:p-6 flex flex-wrap items-center justify-between gap-4" style={panelStyle}>
      <div className="space-y-2 min-w-0">
        <div className="flex items-center gap-2 text-[#E5B84B] font-mono text-[10px] uppercase font-bold tracking-widest"><Icon size={18} aria-hidden="true" />{inventory ? 'Operational Matrix' : 'Cricket Closet Custom Studio'}</div>
        <h2 className="text-xl sm:text-2xl font-black tracking-tight">{inventory ? 'Inventory Core Stockroom' : 'Order Management Console'}</h2>
        <p className="text-sm font-semibold">{label} <span className="font-mono text-xs font-normal" style={mutedStyle}>· Branch {profile?.branchId || 'Not provided'}</span></p>
        <p className="text-xs" style={{ color: 'var(--text-sub, #625f52)' }}>Server-authorized records. Open details for existing document commands.</p>
      </div>
      {writable && <button type="button" className="erp-primary rounded-xl font-mono text-xs uppercase tracking-wide" style={{ background: '#1a1a1a', color: '#E5B84B', borderColor: '#E5B84B' }} onClick={onNew}><Plus size={16} aria-hidden="true" />Create {label.toLowerCase()}</button>}
    </header>
    {ready && <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4" aria-label="Scoped record summary">{summary.map(([name, count, explanation]) => <div key={name} className="erp-panel rounded-2xl p-5 shadow-sm" style={panelStyle}>
      <p className="font-mono text-[10px] uppercase tracking-wider font-bold" style={mutedStyle}>{name}</p>
      <p className={`text-3xl font-black font-mono mt-2 ${name === 'Matching records' ? 'text-[#E5B84B]' : ''}`}>{count}</p>
      <p className="text-xs mt-2" style={mutedStyle}>{explanation}</p>
    </div>)}</div>}
    <div className="erp-panel rounded-2xl p-4 flex flex-wrap items-end gap-3" style={panelStyle}>
      <label className="text-xs font-semibold flex-1 min-w-48">Search {label.toLowerCase()}
        <input className="erp-input" type="search" value={search} onChange={event => props.onSearchChange(event.target.value)} placeholder="Name, document, SKU or related ID" />
      </label>
      <label className="text-xs font-semibold">Status
        <select className="erp-input" value={filter} onChange={event => props.onFilterChange(event.target.value)}><option value="all">All statuses</option>{statuses.map(status => <option key={status} value={status}>{status.replaceAll('_', ' ')}</option>)}</select>
      </label>
      <div role="group" aria-label="Record view" className="flex gap-1 rounded-xl p-1" style={{ background: 'var(--bg-inner, #eeecdf)' }}>
        {(['table', 'cards'] as const).map(mode => <button type="button" className="erp-button font-mono text-xs" key={mode} aria-pressed={view === mode} onClick={() => props.onViewChange(mode)} style={view === mode ? { background: '#1a1a1a', color: '#E5B84B', borderColor: '#E5B84B' } : undefined}>{mode === 'table' ? <List size={15} aria-hidden="true" /> : <Grid2X2 size={15} aria-hidden="true" />}{mode === 'table' ? 'Table' : 'Cards'}</button>)}
      </div>
      <button type="button" className="erp-button" disabled={loading} onClick={onRefresh}><RefreshCw size={15} aria-hidden="true" />Refresh</button>
    </div>
    {loading ? <p className="erp-empty" role="status">Loading {label.toLowerCase()} from the ERP API…</p>
      : error ? <div className="erp-error" role="alert"><h3 className="font-bold">{label} unavailable</h3><p className="mt-2 text-sm break-words">{error}</p><p className="mt-2 text-xs">Records and summaries are hidden until a successful response.</p><button type="button" className="erp-button mt-3" onClick={onRefresh}>Retry</button></div>
      : !visible.length ? <div className="erp-empty" role="status"><h3 className="font-bold">{loaded.length ? 'No records match your search and status filter.' : `No ${label.toLowerCase()} in your authorized company / branch scope.`}</h3><p className="text-xs mt-2" style={mutedStyle}>{loaded.length ? 'Change your search or choose All statuses.' : 'Records will appear here when returned by the ERP API.'}</p></div>
      : view === 'cards' ? <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-4" aria-label={`${label} cards`}>{visible.map(record => <article className="erp-panel rounded-2xl p-5 space-y-4" style={panelStyle} key={record.id}>
        <div className="flex items-start justify-between gap-3"><h3 className="font-bold break-words">{recordTitle(record)}</h3><span className="font-mono text-[10px] rounded-lg border px-2 py-1" style={{ background: 'var(--bg-inner, #eeecdf)', borderColor: 'var(--border-card, #e3dec9)' }}>{fieldValue(record, { key: 'status', label: 'Status' })}</span></div>
        <p className="text-xs font-mono break-all" style={mutedStyle}>Ref: {record.id}</p>
        <dl className="grid grid-cols-2 gap-3 text-sm">{columns.filter(column => column.key !== 'status').map(column => <div key={column.key} className="min-w-0"><dt className="font-mono uppercase text-[10px]" style={mutedStyle}>{column.label}</dt><dd className="break-words mt-1">{fieldValue(record, column)}</dd></div>)}</dl>
        <button type="button" className="erp-button w-full" onClick={() => onOpen(record)} aria-label={`Open ${label.toLowerCase()} record ${record.id}`}>Open details</button>
      </article>)}</div>
      : <div className="erp-panel rounded-2xl overflow-x-auto" style={panelStyle}><table className="erp-table"><caption className="text-left text-xs pb-3" style={mutedStyle}>{label} matching the current search and status filter</caption><thead><tr><th scope="col">Record</th>{columns.map(column => <th scope="col" key={column.key}>{column.label}</th>)}<th scope="col">Details</th></tr></thead><tbody>{visible.map(record => <tr key={record.id}><th scope="row"><button type="button" className="text-left underline font-semibold break-words" onClick={() => onOpen(record)} aria-label={`Open ${label.toLowerCase()} record ${record.id}`}>{recordTitle(record)}</button><p className="font-mono text-[10px] font-normal mt-1 break-all" style={mutedStyle}>Ref: {record.id}</p></th>{columns.map(column => <td className="break-words" key={column.key}>{fieldValue(record, column)}</td>)}<td><button type="button" className="erp-button whitespace-nowrap" onClick={() => onOpen(record)} aria-label={`Open details for ${record.id}`}>Open details</button></td></tr>)}</tbody></table></div>}
    <footer className="text-xs" style={mutedStyle}>Company {profile?.companyId || 'Not provided'} · Branch {profile?.branchId || 'Not provided'} · Summaries cover only returned API records, not lifetime totals. Quantities are shown as supplied, never inferred stock. No offline business cache.</footer>
  </section>;
}

function AuthenticatedDesignedWorkspace({ profile, ...props }: DesignedEntityWorkspaceProps & { profile: UserProfile | null }) {
  const { records, loading, error, refresh } = useERPRecords(profile ? props.entity : null, props.revision);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('all');
  const [view, setView] = useState<DesignedWorkspaceMode>('table');
  return <DesignedEntityWorkspaceView {...props} profile={profile} records={profile ? records : []} loading={loading} error={profile ? error : 'Authenticated ERP profile unavailable.'} onRefresh={() => void refresh()} search={search} onSearchChange={setSearch} filter={filter} onFilterChange={setFilter} view={view} onViewChange={setView} />;
}
export function DesignedEntityWorkspace(props: DesignedEntityWorkspaceProps) {
  const { profile } = useAuth();
  // Remount the existing guarded hook on dataset or authenticated scope changes so
  // no old rows or view filters flash across datasets/accounts before its effect runs.
  return <AuthenticatedDesignedWorkspace key={`${props.entity}:${profile?.uid}:${profile?.companyId}:${profile?.branchId}:${profile?.role}`} {...props} profile={profile} />;
}
