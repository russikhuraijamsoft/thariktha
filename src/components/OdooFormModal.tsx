import React, { useState } from 'react';
import { X, FileText, MessageSquare, ExternalLink } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useERPRecords } from '../hooks/useERPRecords';
import { actionsFor, ACTION_LABELS, canWrite, display, ENTITIES, money, titleOf } from '../erpMetadata';
import type { ERPRecord } from '../services/erpApi';

const REFERENCE_ENTITIES: Record<string, string> = { customerId: 'customers', supplierId: 'suppliers', productId: 'products', orderId: 'orders', quotationId: 'quotations', rfqId: 'rfqs', purchaseOrderId: 'purchaseorders', invoiceId: 'invoices', billId: 'purchasebills', purchaseBillId: 'purchasebills', deliveryId: 'deliveryorders', grnId: 'grns', manufacturingJobId: 'manufacturing_jobs', printingJobId: 'printing_jobs', repairJobId: 'repair_jobs' };
export function recordLinks(record: ERPRecord): { entity: string; id: string; label: string }[] {
  const links: { entity: string; id: string; label: string }[] = [];
  for (const [key, entity] of Object.entries(REFERENCE_ENTITIES)) if (typeof record[key] === 'string' && record[key]) links.push({ entity, id: record[key], label: ENTITIES[entity].label });
  if (record.sourceEntity && ENTITIES[record.sourceEntity] && record.sourceId) links.push({ entity: record.sourceEntity, id: record.sourceId, label: 'Source document' });
  for (const [key, entity] of Object.entries({ deliveryIds: 'deliveryorders', invoiceIds: 'invoices', grnIds: 'grns', billIds: 'purchasebills', transactionIds: 'transactions' })) {
    for (const id of Array.isArray(record[key]) ? record[key] : []) if (typeof id === 'string') links.push({ entity, id, label: ENTITIES[entity].label });
  }
  return links.filter((link, index) => links.findIndex(other => other.entity === link.entity && other.id === link.id) === index);
}
export function OdooFormModal({ entity, record, revision, onClose, onAction, onNavigate }: { entity: string; record: ERPRecord; revision: number; onClose: () => void; onAction: (action: string) => void; onNavigate: (entity: string, id: string) => void }) {
  const { profile } = useAuth();
  const [tab, setTab] = useState('details');
  const audit = useERPRecords('auditlogs', revision);
  const logs = audit.records.filter(log => (log.entity === entity || log.sourceEntity === entity) && (log.recordId === record.id || log.documentId === record.id || log.sourceId === record.id || log.entityId === record.id));
  const permitted = profile && canWrite(profile.role, entity);
  const actions = permitted ? actionsFor(entity, record) : [];
  const stages = [...new Set([...ENTITIES[entity].stages, ...(record.status ? [record.status] : [])])];
  const links = recordLinks(record);
  const fields = Object.entries(record).filter(([key]) => !['lines', 'materials', 'notes', 'id'].includes(key));
  const lines: Record<string, any>[] = record.lines || record.materials || [];
  const lineColumns = [...new Set(lines.flatMap(line => Object.keys(line)))];
  return <div className="fixed inset-0 z-50 bg-neutral-950/80 backdrop-blur-sm p-3 sm:p-6 overflow-y-auto flex items-start justify-center" role="dialog" aria-modal="true" aria-label={titleOf(record)}>
    <section className="w-full max-w-6xl bg-[#1e232a] text-neutral-100 rounded-2xl border border-neutral-700 shadow-2xl overflow-hidden">
      <div className="p-4 bg-[#171b22] border-b border-neutral-700 flex justify-between gap-3 flex-wrap">
        <div className="flex gap-2 flex-wrap">{actions.map(action => <button key={action} className={action === 'update' ? 'erp-button' : 'erp-primary'} onClick={() => onAction(action)}>{action === 'update' ? 'Edit' : ACTION_LABELS[action]}</button>)}{!actions.length && <span className="text-xs text-neutral-400 py-2">Read-only in this status / role</span>}</div>
        <div className="flex items-center gap-2"><div className="flex gap-1 overflow-x-auto max-w-[65vw] bg-[#12151b] rounded-lg p-1" aria-label="Document status">{stages.map(stage => <span key={stage} className={`px-3 py-1 text-xs whitespace-nowrap rounded ${record.status === stage ? 'bg-[#714B67] text-white' : 'text-neutral-400'}`}>{stage.replaceAll('_', ' ')}</span>)}</div><button onClick={onClose} className="erp-button" aria-label="Close document"><X size={18} /></button></div>
      </div>
      <div className="p-4 sm:p-6 flex flex-col lg:flex-row gap-5">
        <div className="flex-1 min-w-0 bg-[#252b34] rounded-xl border border-neutral-700 p-4 sm:p-6">
          <header className="border-b border-neutral-700 pb-5"><p className="text-xs text-amber-400 uppercase tracking-wide">{ENTITIES[entity].label}</p><h1 className="text-2xl font-bold mt-1 break-words">{titleOf(record)}</h1><p className="text-xs text-neutral-400 mt-1">{record.id} · Branch {display(record.branchId)}</p>
            <div className="flex gap-2 flex-wrap mt-4">{links.map(link => <button key={`${link.entity}/${link.id}`} className="erp-button" onClick={() => onNavigate(link.entity, link.id)}><ExternalLink size={13} /><span>{link.label}<small className="block text-neutral-400">{link.id}</small></span></button>)}</div>
            {!links.length && <p className="text-xs text-neutral-400 mt-3">No related document links returned.</p>}
          </header>
          <nav className="flex gap-1 border-b border-neutral-700 mt-3 overflow-x-auto" aria-label="Document tabs">{[['details', 'Details'], ['lines', 'Lines & Quantities'], ['financials', 'Accounting'], ['notes', 'Notes']].map(([id, label]) => <button key={id} onClick={() => setTab(id)} className={`py-3 px-3 text-xs whitespace-nowrap border-b-2 ${tab === id ? 'border-[#714B67] text-white' : 'border-transparent text-neutral-400'}`}>{label}</button>)}</nav>
          <div className="py-5 text-sm">
            {tab === 'details' && <dl className="grid sm:grid-cols-2 gap-4">{fields.map(([key, value]) => <div key={key} className="min-w-0"><dt className="text-xs text-neutral-400">{key.replace(/([A-Z])/g, ' $1')}</dt><dd className="mt-1 break-words whitespace-pre-wrap">{display(value)}</dd></div>)}</dl>}
            {tab === 'lines' && (lines.length ? <div className="overflow-x-auto"><table className="erp-table"><thead><tr>{lineColumns.map(key => <th key={key}>{key.replace(/([A-Z])/g, ' $1')}</th>)}</tr></thead><tbody>{lines.map((line, index) => <tr key={line.id || index}>{lineColumns.map(key => <td key={key}>{key === 'productId' && line[key] ? <button className="text-purple-300 underline" onClick={() => onNavigate('products', line[key])}>{display(line[key])}</button> : display(line[key])}</td>)}</tr>)}</tbody></table></div> : <p className="text-neutral-400">No line items on this record.</p>)}
            {tab === 'financials' && <><dl className="grid sm:grid-cols-2 gap-4">{['totalAmount', 'amount', 'amountPaid', 'unitPrice', 'costPrice'].filter(key => typeof record[key] === 'number').map(key => <div key={key}><dt className="text-neutral-400 text-xs">{key}</dt><dd className="text-amber-400 font-mono">{money(record[key])}</dd></div>)}</dl><p className="text-xs text-neutral-400 mt-4">Only server-recorded INR values are shown. GST calculations, tax filing and statutory invoice templates are unavailable.</p></>}
            {tab === 'notes' && <p className="whitespace-pre-wrap">{record.notes || 'No notes recorded.'}</p>}
          </div>
        </div>
        <aside className="lg:w-80 bg-[#252b34] border border-neutral-700 rounded-xl p-4 shrink-0">
          <h2 className="text-sm font-semibold flex items-center gap-2"><MessageSquare size={16} /> Audit trail & internal notes</h2>
          {permitted && entity !== 'users' && <button className="erp-primary my-3" onClick={() => onAction('comment')}>Log internal note</button>}
          <p className="text-xs text-neutral-400 my-3">Committed server events only. External messages and attachments are unavailable.</p>
          {audit.loading ? <p role="status" className="text-xs">Loading audit trail…</p> : audit.error ? <div role="alert" className="erp-error">Audit unavailable: {audit.error}<button className="erp-button mt-2" onClick={() => void audit.refresh()}>Retry</button></div> : logs.length ? <div className="space-y-4 max-h-[65vh] overflow-y-auto">{logs.map(log => <article key={log.id} className="border-l-2 border-[#714B67] pl-3 text-xs"><div className="font-semibold">{display(log.actorName || log.actorId || log.createdBy || log.uid)}</div><time className="text-neutral-400">{display(log.createdAt || log.timestamp)}</time><p className="mt-1 whitespace-pre-wrap">{display(log.body || log.message || log.note || log.action)}</p><details className="mt-2 text-neutral-400"><summary>Event details</summary><pre className="whitespace-pre-wrap break-all">{JSON.stringify(log, null, 2)}</pre></details></article>)}</div> : <p className="text-xs text-neutral-400">No audit events returned for this document.</p>}
        </aside>
      </div>
      <footer className="p-4 bg-[#171b22] text-xs text-neutral-400 flex justify-between"><span className="flex gap-2 items-center"><FileText size={13} /> Talk of the Town Cricket Closet ERP</span><button onClick={onClose}>Close window</button></footer>
    </section>
  </div>;
}
