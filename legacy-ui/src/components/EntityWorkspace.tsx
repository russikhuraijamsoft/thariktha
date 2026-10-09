import React, { useMemo, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useERPRecords } from '../hooks/useERPRecords';
import { amountOf, canWrite, display, ENTITIES, groupRecords, money, titleOf } from '../erpMetadata';
import { OdooControlPanel, type OdooViewMode } from './OdooControlPanel';
import { OdooKanbanBoard } from './OdooKanbanBoard';
import type { ERPRecord } from '../services/erpApi';
export function exportRecords(entity: string, records: ERPRecord[]) {
  const columns = [...new Set(records.flatMap(record => Object.keys(record)))];
  const cell = (value: any) => { const text = display(value); return `"${(/^[=+\-@\t\r]/.test(text) ? `'${text}` : text).replaceAll('"', '""')}"`; };
  const csv = [columns.map(cell).join(','), ...records.map(record => columns.map(key => cell(record[key])).join(','))].join('\r\n');
  const url = URL.createObjectURL(new Blob(['\uFEFF', csv], { type: 'text/csv;charset=utf-8' }));
  const link = document.createElement('a'); link.href = url; link.download = `${entity}.csv`; link.click(); setTimeout(() => URL.revokeObjectURL(url), 1000);
}
export function EntityWorkspace({ entity, revision, onNew, onOpen }: { entity: string; revision: number; onNew: () => void; onOpen: (record: ERPRecord) => void }) {
  const { profile } = useAuth();
  const { records, loading, error, refresh } = useERPRecords(entity, revision);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('all');
  const [group, setGroup] = useState('none');
  const [view, setView] = useState<OdooViewMode>('list');
  const metadata = ENTITIES[entity];
  const statuses = [...new Set([...metadata.stages, ...records.map(record => record.status).filter(Boolean)])];
  const visible = useMemo(() => records.filter(record => (filter === 'all' || record.status === filter) && JSON.stringify(record).toLowerCase().includes(search.toLowerCase())), [records, filter, search]);
  const groups = groupRecords(visible, group);
  const columns = ['number', 'name', 'description', 'sku', 'customerId', 'supplierId', 'productId', 'warehouseId', 'status', 'quantity', 'totalAmount', 'amountPaid', 'amount', 'role', 'createdAt'].filter(key => records.some(record => record[key] !== undefined));
  const stageKey = group === 'none' ? 'status' : group;
  const kanbanStages = [...new Set([...(stageKey === 'status' ? statuses : []), ...visible.map(record => display(record[stageKey]))])];
  return <section>
    <h2 className="text-xl font-bold mb-4">{metadata.label}</h2>
    <OdooControlPanel appName={metadata.label} breadcrumbs={['Records']} searchQuery={search} onSearchChange={setSearch} activeFilter={filter} onFilterChange={setFilter} availableFilters={[{ id: 'all', label: 'All records' }, ...statuses.map(status => ({ id: status, label: status.replaceAll('_', ' ') }))]} activeGroupBy={group} onGroupByChange={setGroup} availableGroups={['none', 'status', 'category', 'customerId', 'supplierId', 'warehouseId', 'productId', 'branchId'].map(id => ({ id, label: id === 'none' ? 'None' : `By ${id}` }))} viewMode={view} onViewModeChange={setView} onNewRecord={profile && metadata.create && canWrite(profile.role, entity) ? onNew : undefined} onRefresh={() => void refresh()} onExport={!loading && !error && visible.length ? () => exportRecords(entity, visible) : undefined} recordCount={visible.length} totalCount={records.length} />
    {loading ? <p className="erp-empty" role="status">Loading {metadata.label.toLowerCase()} from the ERP API…</p> : error ? <div className="erp-error" role="alert"><strong>Records unavailable</strong><p>{error}</p><button className="erp-button mt-3" onClick={() => void refresh()}>Retry</button></div> : !visible.length ? <p className="erp-empty">{records.length ? 'No records match the current search and filters.' : `No ${metadata.label.toLowerCase()} in your company / branch scope.`}</p> : view === 'kanban' ? <><p className="text-xs text-neutral-400 mb-3">Open a card for document-specific commands. Moving cards does not change business status.</p><OdooKanbanBoard columns={kanbanStages.map(stage => ({ id: stage, title: stage.replaceAll('_', ' ') }))} items={visible.map(record => ({ id: record.id, title: titleOf(record), subtitle: display(record.customerId || record.supplierId || record.productId), amount: amountOf(record), stageId: display(record[stageKey]), rawItem: record }))} onItemClick={item => onOpen(item.rawItem)} /></> : view === 'pivot' ? <div className="erp-panel overflow-x-auto"><p className="text-xs text-neutral-400 mb-4">Report over all matching records returned by the scoped API. Missing amounts are excluded, not invented. Quantities across different products are not interchangeable.</p><table className="erp-table"><thead><tr><th>Group</th><th>Records</th><th>Records with amount</th><th>Amount (INR)</th></tr></thead><tbody>{Object.entries(groupRecords(visible, group === 'none' ? 'status' : group)).map(([key, rows]) => { const amounts = rows.map(amountOf).filter((v): v is number => v !== undefined); return <tr key={key}><td>{key}</td><td>{rows.length}</td><td>{amounts.length}</td><td>{amounts.length ? money(amounts.reduce((sum, value) => sum + Math.round(value * 100), 0) / 100) : 'Not applicable'}</td></tr>; })}</tbody></table></div> : <div className="space-y-4">{Object.entries(groups).map(([label, rows]) => <div key={label} className="erp-panel overflow-x-auto">{group !== 'none' && <h3 className="font-semibold mb-3">{label} <span className="text-neutral-400">({rows.length})</span></h3>}<table className="erp-table"><thead><tr><th>Record</th>{columns.map(key => <th key={key}>{key.replace(/([A-Z])/g, ' $1')}</th>)}</tr></thead><tbody>{rows.map(record => <tr key={record.id}><td><button className="text-purple-300 hover:underline text-left" onClick={() => onOpen(record)}>{titleOf(record)}</button></td>{columns.map(key => <td key={key}>{['totalAmount', 'amountPaid', 'amount'].includes(key) ? money(record[key]) : display(record[key])}</td>)}</tr>)}</tbody></table></div>)}</div>}
    <p className="text-xs text-neutral-500 mt-5">Company {profile?.companyId} · Branch {profile?.branchId} · Explicit refresh, no offline business cache.</p>
  </section>;
}
