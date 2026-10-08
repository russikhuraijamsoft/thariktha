import React from 'react';
import { useERPRecords } from '../hooks/useERPRecords';
import { aggregateReport, ENTITIES, money } from '../erpMetadata';

const REPORT_ENTITIES = ['orders', 'invoices', 'purchaseorders', 'purchasebills', 'expenses', 'manufacturing_jobs', 'printing_jobs', 'repair_jobs'];
function ReportCard({ entity, revision }: { entity: string; revision: number }) {
  const { records, loading, error, refresh } = useERPRecords(entity, revision);
  const report = aggregateReport(records);
  return <section className="erp-panel min-w-0">
    <div className="flex justify-between gap-3 items-center"><h2 className="font-semibold">{ENTITIES[entity].label}</h2><button className="erp-button" disabled={loading} onClick={() => void refresh()}>Refresh</button></div>
    {loading ? <p role="status" className="py-6 text-neutral-400">Loading authoritative records…</p> : error ? <p role="alert" className="erp-error mt-4">Unavailable: {error}</p> : <>
      <div className="text-3xl font-bold mt-4">{report.count}<span className="text-xs font-normal text-neutral-400 ml-2">records</span></div>
      {!records.length ? <p className="text-sm text-neutral-400 mt-3">No records in your authorized scope.</p> : <>
        <dl className="grid grid-cols-2 gap-3 my-4 text-sm"><div><dt className="text-neutral-400">Recorded amount</dt><dd>{report.amountCount ? money(report.totalAmount) : 'Not applicable'}</dd></div><div><dt className="text-neutral-400">Unpaid balance</dt><dd>{['invoices', 'purchasebills'].includes(entity) && report.balanceCount ? money(report.outstanding) : 'Not applicable'}</dd></div></dl>
        <table className="erp-table"><thead><tr><th>Status</th><th>Records</th></tr></thead><tbody>{Object.entries(report.statuses).map(([status, count]) => <tr key={status}><td>{status.replaceAll('_', ' ')}</td><td>{count}</td></tr>)}</tbody></table>
        <p className="text-xs text-neutral-500 mt-3">{report.amountCount} records with valid monetary amounts. No combined sales / invoice total.</p>
      </>}
    </>}
  </section>;
}
export function MetricDashboard({ revision }: { revision: number }) {
  return <section><h1 className="text-2xl font-bold mb-2">Operational reporting</h1><p className="text-sm text-neutral-400 mb-5">All returned company / branch records, grouped by status. Values are recorded INR totals, not recognized revenue or profit. Each dataset is fetched independently; failures are not zero balances. Refresh for current server state.</p><div className="grid md:grid-cols-2 xl:grid-cols-3 gap-4">{REPORT_ENTITIES.map(entity => <ReportCard key={entity} entity={entity} revision={revision} />)}</div><p className="text-xs text-neutral-400 mt-5">Forecasts, tax reporting, consolidated accounting and historical trend comparisons are unavailable.</p></section>;
}
