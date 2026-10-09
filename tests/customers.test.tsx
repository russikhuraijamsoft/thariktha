import test from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { CustomersWorkspaceView, type CustomersWorkspaceViewProps } from '../src/components/CustomersWorkspace';
import { customerCounts, selectCustomers } from '../src/services/customerWorkspace';
import { ApiError, createErpApi, prepareCommand } from '../src/services/erpApi';
import { buildCommandData } from '../src/erpForms';
import type { UserProfile } from '../src/types/auth';

const profile: UserProfile = { uid: 'customer-test-actor', role: 'SALES', companyId: 'company-a', branchId: 'branch-a' };
const records = [
  { id: 'cust-1', name: 'Asha Rao', phone: '555123', email: 'asha@example.test', address: 'North Street', status: 'active' },
  { id: 'cust-2', name: 'Ben', status: 'archived' },
  { id: 'cust-3', name: 'Unknown status', notes: 'not searchable' },
];
const noop = () => {};
const defaults: CustomersWorkspaceViewProps = {
  profile, records, loading: false, error: '', onRefresh: noop, onNew: noop, onOpen: noop,
  search: '', onSearchChange: noop, filter: 'all', onFilterChange: noop, view: 'cards', onViewChange: noop,
};
const render = (overrides: Partial<CustomersWorkspaceViewProps> = {}) => renderToStaticMarkup(<CustomersWorkspaceView {...defaults} {...overrides} />);
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });

test('customer search uses only name/phone/email/address/id, trims and combines status', () => {
  for (const query of [' ASHA ', '555', 'EXAMPLE.TEST', 'north', 'cust-1']) assert.deepEqual(selectCustomers(records, query, 'all'), [records[0]]);
  assert.deepEqual(selectCustomers(records, 'asha', 'archived'), []);
  assert.deepEqual(selectCustomers(records, '', 'active'), [records[0]]);
  assert.deepEqual(selectCustomers(records, '', 'archived'), [records[1]]);
  assert.deepEqual(selectCustomers(records, 'not searchable', 'all'), []);
  assert.deepEqual(customerCounts(records), { total: 3, active: 1, archived: 1 });
});

test('SSR loading and error hide stale rows/counts and never claim empty results', () => {
  const loading = render({ loading: true });
  assert.match(loading, /role="status"/); assert.match(loading, /Loading customers/);
  const error = render({ error: 'FORBIDDEN: Access denied' });
  assert.match(error, /role="alert"/); assert.match(error, /Customers unavailable/); assert.match(error, /Retry/);
  for (const html of [loading, error]) {
    assert.doesNotMatch(html, /Asha Rao|Loaded profiles|Matching profiles|No customers/);
    assert.doesNotMatch(html, /Customer cards|<table/);
  }
});

test('SSR empty scope and empty filtered result are distinct', () => {
  const empty = render({ records: [] });
  assert.match(empty, /No customers in your authorized company \/ branch scope/);
  assert.match(empty, /Loaded profiles/);
  const filtered = render({ search: 'missing' });
  assert.match(filtered, /No customers match your search and status filter/);
  assert.doesNotMatch(filtered, /No customers in your authorized/);
});

test('SSR card/list states show real contact fields, missing labels, status and scoped counts', () => {
  const cards = render({ filter: 'active' });
  assert.match(cards, /Customer cards/); assert.match(cards, /Asha Rao/); assert.match(cards, /555123/); assert.match(cards, /North Street/);
  assert.doesNotMatch(cards, /Ref: cust-2/);
  assert.match(cards, /Open details/); assert.match(cards, /Company company-a · Branch branch-a/);
  const list = render({ view: 'list', filter: 'archived' });
  assert.match(list, /<table/); assert.match(list, /cust-2/); assert.match(list, /Not provided/); assert.doesNotMatch(list, /Asha Rao/);
  assert.doesNotMatch(cards + list, /VIP|tier|Revenue|100% verified|Cloud Production Active|Offline Local Cache/);
  assert.match(cards, /Loaded profiles<\/p><p[^>]*>3<\/p>/);
  assert.match(cards, /Matching profiles<\/p><p[^>]*>1<\/p>/);
});

test('SSR shared permissions hide onboarding for viewer, inventory and missing profile', () => {
  assert.match(render(), /Onboard customer/);
  for (const role of ['VIEWER', 'INVENTORY'] as const) assert.doesNotMatch(render({ profile: { ...profile, role } }), /Onboard customer/);
  assert.doesNotMatch(render({ profile: null }), /Onboard customer/);
  assert.match(render({ profile: { ...profile, role: 'VIEWER' } }), /Open details/);
});

test('customer list API sends bearer/no-store GET, never client scope, rejects invalid/error payloads', async () => {
  const api = createErpApi(async () => 'test-token', async (url, init) => {
    assert.equal(url, '/api/erp/customers'); assert.equal(init?.method, 'GET'); assert.equal(init?.cache, 'no-store');
    assert.equal(new Headers(init?.headers).get('Authorization'), 'Bearer test-token'); assert.equal(init?.body, undefined);
    return json({ records });
  });
  assert.deepEqual(await api.list('customers'), records);
  for (const payload of [{}, { records: {} }, { records: [{ name: 'missing ID' }] }]) {
    await assert.rejects(createErpApi(async () => 't', async () => json(payload)).list('customers'), (e: unknown) => e instanceof ApiError && e.code === 'INVALID_RESPONSE');
  }
  await assert.rejects(createErpApi(async () => 't', async () => json({ error: { code: 'FORBIDDEN', message: 'Denied' } }, 403)).list('customers'), /Denied/);
  await assert.rejects(createErpApi(async () => 't', async () => { throw new Error('offline'); }).list('customers'), /No records were loaded/);
});

test('existing customer command builder allows contact data only; archive has no side-effect payload', () => {
  const values = { name: ' Asha ', phone: ' 555 ', email: '', address: '', notes: '', companyId: 'forged', branchId: 'forged', role: 'OWNER', revenue: 999, tier: 'VIP' };
  const expected = { name: 'Asha', phone: '555', email: '', address: '', notes: '' };
  assert.deepEqual(buildCommandData('customers', 'create', values), expected);
  assert.deepEqual(buildCommandData('customers', 'update', values), expected);
  assert.deepEqual(buildCommandData('customers', 'archive', values), {});
  assert.throws(() => buildCommandData('customers', 'create', { name: ' ' }), /Name is required/);
});

test('unknown/error customer commands never succeed and existing retry keys/payload survive until acknowledgement', async () => {
  const input = { entity: 'customers', action: 'create', data: buildCommandData('customers', 'create', { name: 'Retry customer' }) };
  const prepared = await prepareCommand(profile, input);
  const seen: string[] = [];
  let attempt = 0;
  const api = createErpApi(async () => 't', async (_url, init) => {
    seen.push(String(init?.body));
    attempt++;
    if (attempt === 1) throw new Error('unknown outcome');
    if (attempt === 2) return json({ success: true });
    if (attempt === 3) return new Response('not JSON', { status: 200 });
    if (attempt === 4) return json({ error: { code: 'FORBIDDEN', message: 'Denied' } }, 403);
    return json({ record: { id: 'committed-customer', name: 'Retry customer' }, replayed: true });
  });
  for (const message of [/Outcome unknown/, /No valid committed record acknowledgement/, /No valid command acknowledgement/, /Denied/]) {
    await assert.rejects(api.execute(prepared.command), message);
    assert.equal((await prepareCommand(profile, input)).command.idempotencyKey, prepared.command.idempotencyKey);
  }
  const result = await api.execute(prepared.command);
  assert.equal(result.record.id, 'committed-customer'); assert.equal(result.replayed, true);
  assert.equal(new Set(seen).size, 1);
  const sent = JSON.parse(seen[0]); assert.deepEqual(sent.data, input.data); assert.equal(sent.entity, 'customers'); assert.equal(sent.companyId, undefined);
  const otherScope = await prepareCommand({ ...profile, branchId: 'branch-b' }, input);
  assert.notEqual(otherScope.command.idempotencyKey, prepared.command.idempotencyKey);
  prepared.acknowledged(); otherScope.acknowledged();
  const fresh = await prepareCommand(profile, input);
  assert.notEqual(fresh.command.idempotencyKey, prepared.command.idempotencyKey); fresh.acknowledged();
});
