import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { OriginalDashboard, OriginalDashboardView, type OriginalDashboardViewProps } from '../src/components/OriginalDashboard';
import { MetricDashboard, REPORT_ENTITIES, ReportCardView, type DashboardDatasetState, type ReportCardViewProps } from '../src/components/MetricDashboard';
import { ENTITIES, MODULES, money } from '../src/erpMetadata';

const noop = () => {};
const staleRecords = [{ id: 'stale-record', status: 'stale_status', totalAmount: 987654, amountPaid: 0 }];
const dataset = (overrides: Partial<DashboardDatasetState> = {}): DashboardDatasetState => ({ records: [], loading: false, error: '', onRefresh: noop, ...overrides });
const renderDashboard = (summaries: Partial<OriginalDashboardViewProps['summaries']> = {}) => renderToStaticMarkup(<OriginalDashboardView onNavigate={noop} summaries={{ orders: dataset(), manufacturing_jobs: dataset(), inventory: dataset(), invoices: dataset(), ...summaries }} />);
const renderReport = (overrides: Partial<ReportCardViewProps> = {}) => renderToStaticMarkup(<ReportCardView entity="invoices" {...dataset()} {...overrides} />);
const section = (html: string, label: string) => {
  const start = html.indexOf(`aria-label="${label}"`);
  assert.notEqual(start, -1, `Missing section ${label}`);
  return html.slice(start, html.indexOf('</section>', start));
};

// SSR proves markup branches and identity, not browser rendering or click/hook behavior.
test('cockpit restores visible product identity, charcoal/amber hero and original layout', () => {
  const html = renderDashboard();
  for (const title of ['Thariktha · Cricket Closet ERP', 'Dashboard Cockpit', 'Dynamic Operations Center', 'Cricket Closet Workshop Overflow', 'Workshop Operations Desk', 'Inventory &amp; Replenishment Desk', 'Quick Navigation']) assert.ok(html.includes(title), title);
  assert.match(html, /id="kpi-matrix"/); assert.match(html, /id="dashboard-mesh-dashboard"/);
  assert.match(html, /from-\[#24221f\]/); assert.match(html, /text-\[#E5B84B\]/);
  assert.match(html, /bg-\[var\(--bg-inner\)\]/); assert.match(html, /border-\[var\(--border-card\)\]/);
  assert.match(html, /grid-cols-1 md:grid-cols-2 lg:grid-cols-4/);
});

test('cockpit successful empty scope shows four honest zero record counts', () => {
  const html = renderDashboard();
  assert.equal((html.match(/No records in your authorized scope\./g) || []).length, 4);
  assert.equal((html.match(/>0<span[^>]*>records returned/g) || []).length, 4);
  assert.doesNotMatch(html, /role="alert"|Loading authoritative/);
  assert.match(html, /not active queues, stock quantities or financial balances/);
});

test('cockpit loading and error hide stale counts and never imply successful empty scope', () => {
  for (const state of [dataset({ records: staleRecords, loading: true }), dataset({ records: staleRecords, error: 'FORBIDDEN: Access denied' })]) {
    const html = renderDashboard({ orders: state });
    const tile = section(html, 'Sales order records');
    assert.doesNotMatch(tile, /records returned|No records in your authorized scope|987654|stale_status/);
    if (state.loading) { assert.match(tile, /role="status"/); assert.match(tile, /Loading authoritative/); assert.match(tile, /disabled=""/); }
    else { assert.match(tile, /role="alert"/); assert.match(tile, /Access denied/); assert.match(tile, />Retry</); }
  }
});

test('cockpit independent mixed states retain successful datasets alongside failed/loading tiles', () => {
  const html = renderDashboard({
    orders: dataset({ records: [{ id: 'o-1' }, { id: 'o-2', status: 'complete' }] }),
    manufacturing_jobs: dataset({ records: staleRecords, loading: true }),
    inventory: dataset({ records: staleRecords, error: 'Stock API unavailable' }),
  });
  assert.match(section(html, 'Sales order records'), />2<span[^>]*>records returned/);
  assert.match(section(html, 'Manufacturing job records'), /Loading authoritative/);
  assert.match(section(html, 'Stock balance records'), /Stock API unavailable/);
  assert.match(section(html, 'Customer invoice records'), /No records in your authorized scope/);
  assert.doesNotMatch(html, /987654|stale_status|Active orders booked|Fabrication backlog|SKU Alerts/);
});

test('cockpit counts returned rows only, without inferring missing status, stock quantity or revenue', () => {
  const html = renderDashboard({ inventory: dataset({ records: [{ id: 'stock-1', quantity: 500 }, { id: 'stock-2', quantity: 1200 }] }), invoices: dataset({ records: [{ id: 'invoice-1', totalAmount: 12345 }] }) });
  assert.match(section(html, 'Stock balance records'), />2<span[^>]*>records returned/);
  assert.match(section(html, 'Customer invoice records'), />1<span[^>]*>records returned/);
  // Assert visible content, not amber-500 utilities or decorative SVG attributes.
  const visibleText = html.replace(/<[^>]*>/g, '');
  assert.doesNotMatch(visibleText, /500|1200|12,345|12345|Low stock warning|100% verified|Quality target/);
});

test('cockpit explicitly labels missing financial/trend features and never restores fake telemetry', () => {
  const html = renderDashboard();
  assert.match(html, /not recognized revenue or profit/);
  assert.match(html, /sales orders and invoices are not combined/);
  assert.match(html, /Revenue growth, weekly valuation trends and forecasts are unavailable/);
  assert.doesNotMatch(html, /₹|<svg[^>]*viewBox="0 0 500 120"|NEW REVENUE PEAK|10,480|1,800|14 Collections|Cloud Production Active|Offline Local Cache|100% verified|Online|Sync Restock|offline-first/i);
});

test('hook-backed original cockpit begins with four loading states rather than placeholder metrics', () => {
  const html = renderToStaticMarkup(<OriginalDashboard revision={7} onNavigate={noop} />);
  assert.equal((html.match(/Loading authoritative records/g) || []).length, 4);
  assert.doesNotMatch(html, /records returned|No records in your authorized scope|₹/);
});

test('metric dashboard retains exactly eight independent dataset reports and truthful accounting disclaimer', () => {
  assert.deepEqual(REPORT_ENTITIES, ['orders', 'invoices', 'purchaseorders', 'purchasebills', 'expenses', 'manufacturing_jobs', 'printing_jobs', 'repair_jobs']);
  const html = renderToStaticMarkup(<MetricDashboard revision={7} />);
  for (const entity of REPORT_ENTITIES) assert.ok(html.includes(`${ENTITIES[entity].label.replaceAll('&', '&amp;')} report`), entity);
  assert.equal((html.match(/Loading authoritative records/g) || []).length, 8);
  assert.match(html, /Each dataset is fetched independently; failures are not zero balances/);
  assert.match(html, /not recognized revenue or profit/);
  assert.doesNotMatch(html, /No records in your authorized scope|Recorded amount|Unpaid balance/);
});

test('report loading and error hide stale financial totals, count, status and empty-success messages', () => {
  for (const overrides of [{ loading: true }, { error: 'Dataset denied' }, { loading: true, error: 'Previous error' }]) {
    const html = renderReport({ records: staleRecords, ...overrides });
    assert.doesNotMatch(html, /Recorded amount|Unpaid balance|987654|stale status|No records in your authorized scope|<table/);
    if (overrides.loading) { assert.match(html, /role="status"/); assert.match(html, /disabled=""/); assert.doesNotMatch(html, /role="alert"/); }
    else { assert.match(html, /role="alert"/); assert.match(html, /Dataset denied/); assert.match(html, />Retry</); }
  }
});

test('report empty success shows zero records without a fabricated zero financial balance', () => {
  const html = renderReport();
  assert.match(html, />0<span[^>]*>records/);
  assert.match(html, /No records in your authorized scope/);
  assert.doesNotMatch(html, /role="alert"|Loading authoritative|Recorded amount|Unpaid balance|₹/);
});

test('report populated invoices show only recorded amount, unpaid balance and actual status groups', () => {
  const html = renderReport({ records: [
    { id: 'i-1', status: 'partially_paid', totalAmount: 120, amountPaid: 20 },
    { id: 'i-2', status: 'paid', totalAmount: 80, amountPaid: 80 },
    { id: 'i-3' },
  ] });
  assert.match(html, />3<span[^>]*>records/);
  assert.ok(html.includes(`<dd>${money(200)}</dd>`)); assert.ok(html.includes(`<dd>${money(100)}</dd>`));
  assert.match(html, /partially paid/); assert.match(html, /<td>paid<\/td>/); assert.match(html, /<td>—<\/td>/);
  assert.match(html, /2 records with valid monetary amounts/); assert.match(html, /No combined sales \/ invoice total/);
  assert.doesNotMatch(html, /No records in your authorized scope|Revenue|Growth|Profit/);
});

test('non-financial and non-bill reports never reinterpret missing amounts or order balances', () => {
  for (const entity of REPORT_ENTITIES) {
    const html = renderReport({ entity, records: [{ id: 'r-1' }] });
    assert.equal((html.match(/<dd>Not applicable<\/dd>/g) || []).length, 2);
    assert.match(html, /0 records with valid monetary amounts/);
  }
  const order = renderReport({ entity: 'orders', records: [{ id: 'o-1', totalAmount: 300, amountPaid: 100 }] });
  assert.match(order, /<dt[^>]*>Unpaid balance<\/dt><dd>Not applicable<\/dd>/);
});

test('dashboard navigation targets existing modules and owned components use no archived/persistence/mutation paths', () => {
  const dashboard = readFileSync(new URL('../src/components/OriginalDashboard.tsx', import.meta.url), 'utf8');
  const reports = readFileSync(new URL('../src/components/MetricDashboard.tsx', import.meta.url), 'utf8');
  const modules = new Set([...dashboard.matchAll(/(?:onNavigate\(|module: )'([^']+)'/g)].map(match => match[1]));
  for (const match of dashboard.matchAll(/\['([^']+)', '[^']+'\]/g)) modules.add(match[1]);
  for (const module of modules) assert.ok(MODULES[module], `Unknown navigation target: ${module}`);
  assert.ok(modules.has('reports')); assert.ok(modules.has('orders')); assert.ok(modules.has('inventory'));
  for (const source of [dashboard, reports]) assert.doesNotMatch(source, /legacy-ui|localStorage|sessionStorage|firebase\/firestore|\.execute\(|setDoc\(|addDoc\(|updateDoc\(|deleteDoc\(/);
  assert.match(dashboard, /useERPRecords\('orders', revision\)/);
  assert.match(dashboard, /useERPRecords\('manufacturing_jobs', revision\)/);
  assert.match(dashboard, /useERPRecords\('inventory', revision\)/);
  assert.match(dashboard, /useERPRecords\('invoices', revision\)/);
  assert.match(reports, /useERPRecords\(entity, revision\)/);
  assert.match(reports, /REPORT_ENTITIES\.map\(entity => <ReportCard/);
});
