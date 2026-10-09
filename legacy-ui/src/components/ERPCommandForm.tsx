import React, { useRef, useState } from 'react';
import { X, Plus, Trash2 } from 'lucide-react';
import { erpApi, useAuth } from '../context/AuthContext';
import { useERPRecords } from '../hooks/useERPRecords';
import { ACTION_LABELS, display, ENTITIES, titleOf } from '../erpMetadata';
import { buildCommandData, initialValues, LINE_DOCUMENTS } from '../erpForms';
import { errorMessage, prepareCommand, type CommandResult, type ERPRecord } from '../services/erpApi';
import { ROLES } from '../types/auth';

function Lookup({ entity, value, onChange, label, disabled = false }: { entity: string; value: string; onChange: (value: string) => void; label: string; disabled?: boolean }) {
  const { records, loading, error, refresh } = useERPRecords(entity);
  return <label className="block text-xs text-neutral-300">{label}
    <select className="erp-input" required value={value || ''} disabled={disabled || loading || !!error} onChange={e => onChange(e.target.value)}>
      <option value="">{loading ? 'Loading…' : 'Select a record'}</option>
      {value && !records.some(r => r.id === value) && <option value={value}>{value} (not in loaded list)</option>}
      {records.filter(r => r.status !== 'archived' || r.id === value).map(r => <option key={r.id} value={r.id}>{titleOf(r)}{r.sku ? ` · ${r.sku}` : ''}</option>)}
    </select>
    {error && <span role="alert" className="block text-red-300">{error} <button type="button" onClick={() => void refresh()}>Retry lookup</button></span>}
    {!loading && !error && !records.length && <span className="text-neutral-400">No {ENTITIES[entity]?.label.toLowerCase()} available. Create the master record first.</span>}
  </label>;
}
export function ERPCommandForm({ entity, action, record, onClose, onCommitted }: { entity: string; action: string; record?: ERPRecord; onClose: () => void; onCommitted: (result: CommandResult) => void }) {
  const { profile } = useAuth();
  const [values, setValues] = useState(() => initialValues(entity, action, record));
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [pending, setPending] = useState<Awaited<ReturnType<typeof prepareCommand>> | null>(null);
  const gate = useRef(false);
  const change = (key: string, value: any) => setValues(old => ({ ...old, [key]: value }));
  const textField = (key: string, label: string, type = 'text', required = true, min?: number, step?: string) => <label key={key} className="block text-xs text-neutral-300">{label}<input className="erp-input" type={type} required={required} min={min} step={step} value={values[key] ?? ''} onChange={e => change(key, e.target.value)} /></label>;
  const select = (key: string, label: string, options: string[]) => <label className="block text-xs text-neutral-300">{label}<select required className="erp-input" value={values[key] || ''} onChange={e => change(key, e.target.value)}><option value="">Select…</option>{options.map(option => <option key={option} value={option}>{option}</option>)}</select></label>;
  const lookup = (key: string, target: string, label: string, disabled = false) => <Lookup entity={target} value={values[key] || ''} onChange={value => change(key, value)} label={label} disabled={disabled} />;
  const warehouse = (key = 'warehouseId', label = 'Warehouse ID') => <div>{textField(key, label)}<p className="text-[11px] text-neutral-400 mt-1">Use the exact warehouse ID provisioned for this branch. Warehouse administration is unavailable here; the server validates scope.</p></div>;
  const notes = <label className="block text-xs text-neutral-300">Notes<textarea className="erp-input" value={values.notes || ''} onChange={e => change('notes', e.target.value)} /></label>;
  const mutateLine = (key: string, index: number, field: string, value: any) => change(key, values[key].map((line: any, i: number) => i === index ? { ...line, [field]: value } : line));
  const lineEditor = (materials = false) => {
    const key = materials ? 'materials' : 'lines';
    return <div className="space-y-3 col-span-full"><h3 className="font-semibold">{materials ? 'Input materials' : 'Order lines'}</h3>
      {(values[key] || []).map((line: any, index: number) => <div key={index} className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3 rounded-lg p-3 border border-neutral-700 bg-[#171b22]">
        <Lookup label={`Product · line ${index + 1}`} entity="products" value={line.productId} onChange={v => mutateLine(key, index, 'productId', v)} />
        <label className="text-xs">Quantity<input className="erp-input" type="number" min="1" step="1" required value={line.quantity} onChange={e => mutateLine(key, index, 'quantity', e.target.value)} /></label>
        {!materials && <label className="text-xs">Unit price (INR)<input className="erp-input" type="number" min="0" step="0.01" required value={line.unitPrice} onChange={e => mutateLine(key, index, 'unitPrice', e.target.value)} /></label>}
        {!materials && ['orders', 'quotations'].includes(entity) && <label className="text-xs">Custom job<select className="erp-input" value={line.jobType || ''} onChange={e => mutateLine(key, index, 'jobType', e.target.value)}><option value="">None</option>{['manufacturing', 'printing', 'sublimation', 'repair'].map(type => <option key={type}>{type}</option>)}</select></label>}
        <button className="erp-button justify-self-start" type="button" onClick={() => change(key, values[key].filter((_: any, i: number) => i !== index))}><Trash2 size={13} /> Remove line</button>
      </div>)}
      <button className="erp-button" type="button" onClick={() => change(key, [...(values[key] || []), { productId: '', quantity: 1, ...(materials ? {} : { unitPrice: '', jobType: '' }) }])}><Plus size={13} /> Add line</button>
    </div>;
  };
  async function submit(event: React.FormEvent) {
    event.preventDefault(); if (gate.current || !profile) return;
    gate.current = true; setBusy(true); setError('');
    let result: CommandResult | undefined;
    try {
      const prepared = pending || await prepareCommand(profile, { entity, action, ...(record ? { id: record.id } : {}), data: buildCommandData(entity, action, values) });
      setPending(prepared);
      result = await erpApi.execute(prepared.command);
      prepared.acknowledged();
    } catch (e) { setError(errorMessage(e)); }
    finally { gate.current = false; setBusy(false); }
    // Refresh errors are not command errors: only a committed response reaches here.
    if (result) onCommitted(result);
  }
  function close() {
    if (busy) return;
    if (pending && !window.confirm('This command has not been acknowledged. It may already have committed. Its retry key is retained, but leaving this form loses unsaved input. Prefer Retry, or inspect the server records before creating another command. Close anyway?')) return;
    onClose();
  }
  const editing = action === 'create' || action === 'update';
  return <div className="fixed inset-0 z-[70] bg-neutral-950/85 p-3 sm:p-6 overflow-y-auto flex items-start justify-center" role="dialog" aria-modal="true" aria-label={`${ACTION_LABELS[action]} ${ENTITIES[entity].label}`}>
    <section className="w-full max-w-4xl bg-[#1e232a] rounded-xl border border-neutral-700 shadow-2xl">
      <header className="flex justify-between items-center p-5 border-b border-neutral-700 bg-[#171b22] rounded-t-xl"><div><p className="text-xs text-purple-300">{ENTITIES[entity].label}</p><h2 className="text-lg font-bold">{ACTION_LABELS[action]}{record ? ` · ${titleOf(record)}` : ''}</h2></div><button className="erp-button" type="button" onClick={close} disabled={busy} aria-label="Close command"><X size={18} /></button></header>
      <form onSubmit={submit} className="p-5 space-y-5">
        <fieldset disabled={busy || !!pending} className="grid sm:grid-cols-2 gap-4 disabled:opacity-70">
          {editing && entity === 'products' && <>{textField('name', 'Product name')}{textField('sku', 'SKU')}{textField('unitPrice', 'Unit price (INR)', 'number', true, 0, '0.01')}{textField('costPrice', 'Cost price (INR)', 'number', true, 0, '0.01')}{textField('category', 'Category', 'text', false)}{textField('minimumStock', 'Minimum stock', 'number', true, 0, '1')}<label className="text-sm flex gap-2 items-center"><input type="checkbox" checked={!!values.stockTracked} onChange={e => change('stockTracked', e.target.checked)} /> Track inventory</label>{notes}<p className="text-xs text-neutral-400 col-span-full">Stock is ledger-controlled. Use a posted adjustment for opening stock; this form cannot set stock balances.</p></>}
          {editing && ['customers', 'suppliers'].includes(entity) && <>{textField('name', 'Name')}{textField('email', 'Email', 'email', false)}{textField('phone', 'Phone', 'tel', false)}{textField('address', 'Address', 'text', false)}{notes}</>}
          {editing && LINE_DOCUMENTS.includes(entity) && <>{['rfqs', 'purchaseorders'].includes(entity) ? lookup('supplierId', 'suppliers', 'Supplier') : lookup('customerId', 'customers', 'Customer')}{notes}{lineEditor()}</>}
          {editing && entity === 'users' && <>{select('role', 'Role', ROLES.filter(role => profile?.role === 'OWNER' || role !== 'OWNER'))}{select('status', 'Status', ['active', 'suspended'])}<p className="text-xs col-span-full text-neutral-400">Server-enforced role controls prohibit self-escalation and ADMIN → OWNER escalation. This does not create Firebase accounts.</p></>}
          {action === 'pay' && <>{textField('amount', 'Payment amount (INR)', 'number', true, 0.01, '0.01')}{select('method', 'Method', ['cash', 'card', 'bank_transfer', 'upi'])}{textField('reference', 'Reference', 'text', false)}<p className="text-sm">Invoice total: {display(record?.totalAmount)} INR · Already paid: {display(record?.amountPaid)} INR</p></>}
          {['deliver', 'receive'].includes(action) && <>{warehouse()}{action === 'receive' && textField('reason', 'Receipt reason / damage notes', 'text', false)}<div className="col-span-full overflow-x-auto"><p className="text-xs text-neutral-400 mb-3">Enter only quantities for this operation; leave other lines at zero. Rejected and damaged units do not add stock and remain replacement demand. The server checks remaining quantities.</p><table className="erp-table"><thead><tr><th>Product / source line</th><th>Ordered</th><th>{action === 'deliver' ? 'Delivered' : 'Accepted so far'}</th>{(action === 'deliver' ? ['quantity'] : ['accepted', 'rejected', 'damaged']).map(field => <th key={field}>{field}</th>)}</tr></thead><tbody>{(values.lines || []).map((line: any, index: number) => <tr key={line.lineId || index}><td>{display(record?.lines?.[index]?.productId)}<small className="block">{line.lineId || 'Missing line ID — operation unavailable'}</small></td><td>{display(record?.lines?.[index]?.quantity)}</td><td>{display(action === 'deliver' ? record?.lines?.[index]?.deliveredQuantity : record?.lines?.[index]?.receivedQuantity)}</td>{(action === 'deliver' ? ['quantity'] : ['accepted', 'rejected', 'damaged']).map(field => <td key={field}><input className="erp-input min-w-20" aria-label={`${field} for line ${index + 1}`} type="number" min="0" step="1" required value={line[field]} onChange={e => mutateLine('lines', index, field, e.target.value)} /></td>)}</tr>)}</tbody></table></div></>}
          {editing && entity === 'inventoryadjustments' && <>{lookup('productId', 'products', 'Product')}{warehouse()}{textField('quantity', 'Quantity (positive magnitude)', 'number', true, 1, '1')}{select('type', 'Type', ['OPENING_STOCK', 'ADJUSTMENT_IN', 'ADJUSTMENT_OUT', 'DAMAGE'])}{textField('reason', 'Reason')}</>}
          {editing && entity === 'stocktransfers' && <>{lookup('productId', 'products', 'Product')}{textField('quantity', 'Quantity', 'number', true, 1, '1')}{warehouse('fromWarehouseId', 'Source warehouse ID')}{warehouse('toWarehouseId', 'Destination warehouse ID')}{textField('reason', 'Reason')}</>}
          {entity === 'manufacturing_jobs' && action === 'start' && <>{warehouse()}{lineEditor(true)}</>}
          {entity === 'manufacturing_jobs' && action === 'complete' && <>{warehouse()}{lookup('productId', 'products', 'Job output product', true)}{textField('quantity', 'Output quantity', 'number', true, 1, '1')}</>}
          {editing && entity === 'expenses' && <>{textField('description', 'Description')}{textField('amount', 'Amount (INR)', 'number', true, 0.01, '0.01')}{select('method', 'Method', ['cash', 'card', 'bank_transfer', 'upi'])}{notes}</>}
          {action === 'comment' && <label className="col-span-full text-sm">Internal note<textarea className="erp-input" rows={4} required value={values.body || ''} onChange={e => change('body', e.target.value)} /></label>}
          {!editing && !['pay', 'deliver', 'receive', 'comment'].includes(action) && !(entity === 'manufacturing_jobs' && ['start', 'complete'].includes(action)) && <p className="text-sm col-span-full">Confirm “{ACTION_LABELS[action]}” for this document. This is a server-validated command, not a free status change.{action === 'send' && ' This marks the document sent; email delivery is unavailable.'}{action === 'bill' && ' Only received quantities not yet billed will be billed.'}{action === 'complete' && entity === 'orders' && ' Requires fully delivered and paid.'}</p>}
        </fieldset>
        {error && <div role="alert" className="erp-error">{error}{pending && <p className="mt-2">The submitted payload and key are locked for a safe retry. To change inputs, close and reopen the form; resolve any unknown outcome first.</p>}</div>}
        <footer className="flex flex-wrap justify-between gap-3 border-t border-neutral-700 pt-4"><p className="text-xs text-neutral-400 max-w-lg">{pending ? `Retained key: ${pending.command.idempotencyKey}` : 'Changes take effect only after the server commits. Draft creation does not post stock or payments.'}</p><div className="flex gap-2"><button className="erp-button" type="button" disabled={busy} onClick={close}>Cancel</button><button className="erp-primary" disabled={busy} type="submit">{busy ? 'Submitting…' : pending ? 'Retry same command' : ACTION_LABELS[action]}</button></div></footer>
      </form>
    </section>
  </div>;
}
