import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { DesignedEntityWorkspaceView, selectDesignedRecords, type DesignedEntityWorkspaceViewProps } from '../src/components/DesignedEntityWorkspace';
import { ENTITIES, MODULES, canWrite } from '../src/erpMetadata';
import type { UserProfile } from '../src/types/auth';
import type { ERPRecord } from '../src/services/erpApi';

const profile: UserProfile = { uid: 'design-actor', companyId: 'company-a', branchId: 'branch-a', role: 'SALES' };
const records: ERPRecord[] = [
  { id: 'order-1', number: 'SO-101', customerId: 'customer-a', status: 'confirmed', totalAmount: 1200, lines: [{ productId: 'nested-product-secret', quantity: 88 }], notes: 'private-note-secret', companyId: 'private-scope-secret' },
  { id: 'order-2', number: 'SO-102', status: 'draft', totalAmount: 0 },
  { id: 'order-3', description: 'Training kit' },
];
const noop = () => {};
const defaults: DesignedEntityWorkspaceViewProps = {
  entity: 'orders', profile, records, loading: false, error: '', search: '', filter: 'all', view: 'table',
  onRefresh: noop, onNew: noop, onOpen: noop, onSearchChange: noop, onFilterChange: noop, onViewChange: noop,
};
const render = (overrides: Partial<DesignedEntityWorkspaceViewProps> = {}) => renderToStaticMarkup(<DesignedEntityWorkspaceView {...defaults} {...overrides} />);

// These are SSR/pure selector checks, not browser event or hook-race tests.
test('designed selector searches allowed textual fields only, trims and combines exact status', () => {
  for (const query of [' SO-101 ', 'CUSTOMER-A', 'order-1']) assert.deepEqual(selectDesignedRecords(records, query, 'all'), [records[0]]);
  assert.deepEqual(selectDesignedRecords(records, 'so-101', 'draft'), []);
  assert.deepEqual(selectDesignedRecords(records, '', 'confirmed'), [records[0]]);
  assert.deepEqual(selectDesignedRecords(records, 'training', 'all'), [records[2]]);
  for (const query of ['private-note-secret', 'private-scope-secret', 'nested-product-secret', '1200', '88']) assert.deepEqual(selectDesignedRecords(records, query, 'all'), []);
  assert.deepEqual(selectDesignedRecords([{ id: 'plain', name: { secret: 'object-secret' }, quantity: 555, status: null }], 'object-secret', 'all'), []);
  assert.deepEqual(selectDesignedRecords([{ id: 'plain', name: 555 }], '555', 'all'), []);
});

test('designed loading hides stale records, dynamic statuses and summary counts', () => {
  const html = render({ loading: true, records: [{ ...records[0], status: 'stale-only-status' }] });
  assert.match(html, /aria-busy="true"/);
  assert.match(html, /role="status"/);
  assert.match(html, /Loading sales orders from the ERP API/);
  assert.match(html, /disabled=""/);
  assert.doesNotMatch(html, /SO-101|stale-only-status|Scoped record summary|Loaded records|Matching records|<table|Sales Orders cards|No sales orders|No records match/);
});

test('designed failures expose error and retry without empty-success messages or stale summaries', () => {
  for (const error of ['FORBIDDEN: Access denied', 'NETWORK_ERROR: Cannot reach API', 'INVALID_RESPONSE: Malformed response']) {
    const html = render({ error });
    assert.match(html, /role="alert"/);
    assert.match(html, /Sales Orders unavailable/);
    assert.ok(html.includes(error));
    assert.match(html, /Retry/);
    assert.doesNotMatch(html, /SO-101|Scoped record summary|Loaded records|Matching records|<table|No sales orders|No records match/);
  }
  const errorWithNoRows = render({ error: 'Denied', records: [] });
  assert.match(errorWithNoRows, /Retry/);
  assert.doesNotMatch(errorWithNoRows, /No sales orders in/);
});

test('designed loading dominates a retained error without pretending successful emptiness', () => {
  const html = render({ loading: true, error: 'old failure' });
  assert.match(html, /Loading sales orders/);
  assert.doesNotMatch(html, /role="alert"|old failure|Scoped record summary|No sales orders/);
});

test('designed empty authorized scope differs from filtered-empty', () => {
  const empty = render({ records: [] });
  assert.match(empty, /No sales orders in your authorized company \/ branch scope/);
  assert.match(empty, /Loaded records<\/p><p[^>]*>0<\/p>/);
  assert.doesNotMatch(empty, /No records match/);
  for (const options of [{ search: 'missing' }, { filter: 'delivered' }]) {
    const filtered = render(options);
    assert.match(filtered, /No records match your search and status filter/);
    assert.match(filtered, /Loaded records<\/p><p[^>]*>3<\/p>/);
    assert.match(filtered, /Matching records<\/p><p[^>]*>0<\/p>/);
    assert.doesNotMatch(filtered, /No sales orders in your authorized|<table/);
  }
});

test('designed populated table reports only actual scoped record counts and missing labels', () => {
  const html = render();
  assert.match(html, /Order Management Console|Cricket Closet Custom Studio/);
  assert.match(html, /<table/); assert.match(html, /SO-101/); assert.match(html, /Training kit/);
  assert.match(html, /Open details/); assert.match(html, /Not provided/);
  assert.match(html, /Company company-a · Branch branch-a/);
  assert.match(html, /Loaded records<\/p><p[^>]*>3<\/p>/);
  assert.match(html, /Matching records<\/p><p[^>]*>3<\/p>/);
  assert.match(html, /Reported statuses<\/p><p[^>]*>2<\/p>/);
  assert.match(html, /Status not provided<\/p><p[^>]*>1<\/p>/);
  assert.doesNotMatch(html, /Total Sales|Revenue|Low Stock|Out of Stock|In-Production Phase|private-note-secret|nested-product-secret|private-scope-secret/);
});

test('designed cards filter records and expose keyboard-accessible detail buttons', () => {
  const html = render({ view: 'cards', filter: 'confirmed' });
  assert.match(html, /aria-label="Sales Orders cards"/);
  assert.match(html, /<article/); assert.match(html, /SO-101/);
  assert.match(html, /aria-label="Open sales orders record order-1"/);
  assert.match(html, /Matching records<\/p><p[^>]*>1<\/p>/);
  assert.match(html, /aria-pressed="true"/);
  assert.doesNotMatch(html, /SO-102|Training kit|<table/);
});

test('designed create button exactly follows existing metadata and canWrite across module datasets', () => {
  for (const entity of [...MODULES.orders.entities, ...MODULES.inventory.entities]) {
    for (const role of ['VIEWER', 'SALES', 'INVENTORY', 'ACCOUNTING', 'OWNER'] as const) {
      const html = render({ entity, profile: { ...profile, role } });
      const createLabel = `Create ${ENTITIES[entity].label.toLowerCase()}`;
      assert.equal(html.includes(createLabel), !!ENTITIES[entity].create && canWrite(role, entity), `${entity}/${role}`);
      assert.match(html, /Open details/);
    }
    assert.doesNotMatch(render({ entity, profile: null }), /Create /);
  }
});

test('designed stock balances show supplied per-record quantity including zero without aggregate stock claims', () => {
  const html = render({ entity: 'inventory', records: [
    { id: 'balance-1', productId: 'product-a', warehouseId: 'warehouse-a', quantity: 0 },
    { id: 'balance-2', productId: 'product-b', warehouseId: 'warehouse-b', quantity: 12 },
    { id: 'balance-3', productId: 'product-c', quantity: null },
  ] });
  assert.match(html, /Inventory Core Stockroom/); assert.match(html, /Operational Matrix/); assert.match(html, /Stock Balances/);
  assert.match(html, />Quantity<\/th>/); assert.match(html, />0<\/td>/); assert.match(html, />12<\/td>/);
  assert.match(html, /Not provided/); assert.match(html, /warehouse-a/);
  assert.doesNotMatch(html, /Create |Total Unit Stocks|Low Stock|Out of Stock|Inventory Value Margin|Revenue/);
});

test('designed products and orders never synthesize stock from minimums, catalog or nested lines', () => {
  const product = render({ entity: 'products', view: 'cards', records: [
    { id: 'product-1', name: 'Practice bat', sku: 'BAT-A', minimumStock: 20, stockTracked: true, unitPrice: 0 },
    { id: 'product-2', name: 'Training ball', unitPrice: NaN },
  ] });
  assert.match(product, /Practice bat/); assert.match(product, /BAT-A/); assert.match(product, /Unit price/);
  assert.match(product, /₹0\.00/); assert.match(product, /Not provided/);
  assert.doesNotMatch(product, /Current stock|Total Unit Stocks|Low Stock|Out of Stock|>Quantity<|minimumStock|>20</);
  const order = render();
  assert.doesNotMatch(order, />Quantity<|>88<|Current stock|Total Unit Stocks/);
});

test('designed schema handles ledger and transfer fields without missing-property crashes', () => {
  const ledger = render({ entity: 'inventorytransactions', view: 'cards', records: [
    { id: 'movement-1', type: 'ADJUSTMENT', productId: 'product-a', warehouseId: 'warehouse-a', quantity: -4, reference: 'source-a', createdAt: { _seconds: 0 } },
    { id: 'movement-2', quantity: Infinity, createdAt: { unexpected: 'not-a-date' } },
  ] });
  assert.match(ledger, /Stock Ledger cards/); assert.match(ledger, /ADJUSTMENT/);
  assert.match(ledger, />-4<\/dd>/); assert.match(ledger, /1970-01-01T00:00:00\.000Z/);
  assert.match(ledger, /Not provided/); assert.doesNotMatch(ledger, /Infinity|not-a-date/);
  const transfer = render({ entity: 'stocktransfers', records: [{ id: 'transfer-1', fromWarehouseId: 'warehouse-source', toWarehouseId: 'warehouse-target', productId: 'product-a', quantity: 2, status: 'posted' }] });
  assert.match(transfer, /From warehouse/); assert.match(transfer, /To warehouse/);
  assert.match(transfer, /warehouse-source/); assert.match(transfer, /warehouse-target/);
});

test('designed missing or malformed scalar fields do not render object payloads or invented status', () => {
  const html = render({ view: 'cards', records: [{ id: 'minimal', name: { secret: 'object-payload-secret' }, status: false, totalAmount: '12', createdAt: { seconds: Infinity } }] });
  assert.match(html, /Ref: minimal/); assert.match(html, /Not provided/);
  assert.match(html, /Reported statuses<\/p><p[^>]*>0<\/p>/);
  assert.match(html, /Status not provided<\/p><p[^>]*>1<\/p>/);
  assert.doesNotMatch(html, /object-payload-secret|₹12|>false<|Invalid Date/);
  assert.match(html, /var\(--bg-main/); assert.match(html, /var\(--bg-card/); assert.match(html, /var\(--border-card/);
});

test('designed record and failure text are escaped rather than executable markup', () => {
  const payload = '<script>unsafe()</script>';
  for (const view of ['cards', 'table'] as const) {
    const html = render({ view, records: [{ id: 'safe-id', name: payload, status: payload }] });
    assert.match(html, /&lt;script&gt;unsafe\(\)&lt;\/script&gt;/);
    assert.doesNotMatch(html, /<script>/);
  }
  const error = render({ error: payload });
  assert.match(error, /&lt;script&gt;/); assert.doesNotMatch(error, /<script>|Scoped record summary/);
});

test('designed production source delegates reads and commands without archived imports or business persistence', () => {
  const source = readFileSync(new URL('../src/components/DesignedEntityWorkspace.tsx', import.meta.url), 'utf8');
  assert.match(source, /useERPRecords\(profile \? props\.entity : null, props\.revision\)/);
  assert.match(source, /useAuth\(\)/);
  assert.match(source, /metadata\?\.create && canWrite\(profile\.role, entity\)/);
  assert.match(source, /onClick=\{onNew\}/); assert.match(source, /onClick=\{\(\) => onOpen\(record\)\}/);
  assert.doesNotMatch(source, /legacy-ui|firebase\/firestore|localStorage|sessionStorage|indexedDB|fetch\(|erpApi\.|\.execute\(|dangerouslySetInnerHTML/);
});
