import type { ERPRecord } from './erpApi';

export type CustomerFilter = 'all' | 'active' | 'archived';
export type CustomerViewMode = 'cards' | 'list';
const SEARCH_FIELDS = ['name', 'phone', 'email', 'address', 'id'] as const;

// Unknown/missing status is not silently classified as active.
export function selectCustomers(records: ERPRecord[], search: string, filter: CustomerFilter) {
  const query = search.trim().toLowerCase();
  return records.filter(record => (filter === 'all' || record.status === filter) &&
    (!query || SEARCH_FIELDS.some(field => typeof record[field] === 'string' && record[field].toLowerCase().includes(query))));
}
export function customerCounts(records: ERPRecord[]) {
  return {
    total: records.length,
    active: records.filter(record => record.status === 'active').length,
    archived: records.filter(record => record.status === 'archived').length,
  };
}
export function customerText(value: unknown) {
  return typeof value === 'string' && value.trim() ? value : 'Not provided';
}
