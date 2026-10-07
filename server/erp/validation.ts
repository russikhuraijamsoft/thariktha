export class ErpError extends Error {
  constructor(public status: number, public code: string, message: string) { super(message); this.name = 'ErpError'; }
}
export function fail(status: number, code: string, message: string): never { throw new ErpError(status, code, message); }
export function assert(value: unknown, status: number, code: string, message: string): asserts value {
  if (!value) fail(status, code, message);
}
export function object(value: unknown, label = 'data'): Record<string, any> {
  assert(value !== null && typeof value === 'object' && !Array.isArray(value) &&
    (Object.getPrototypeOf(value) === Object.prototype || Object.getPrototypeOf(value) === null),
  400, 'VALIDATION', `${label} must be an object`);
  return value as Record<string, any>;
}
export function fields(value: Record<string, any>, allowed: readonly string[]) {
  for (const key of Object.keys(value)) assert(allowed.includes(key), 400, 'VALIDATION', `Unknown or server-managed field: ${key}`);
}
export function text(value: unknown, label: string, max = 200, empty = false): string {
  assert(typeof value === 'string' && value.length <= max && (empty || value.trim().length > 0),
    400, 'VALIDATION', `${label} must be ${empty ? 'a' : 'a nonempty'} string (max ${max})`);
  return value.trim();
}
export function id(value: unknown, label = 'id'): string {
  const result = text(value, label, 128);
  assert(/^[A-Za-z0-9_:@.-]+$/.test(result) && result !== '.' && result !== '..', 400, 'VALIDATION', `${label} is not a valid identifier`);
  return result;
}
export function integer(value: unknown, label: string, zero = false): number {
  assert(typeof value === 'number' && Number.isSafeInteger(value) && value >= (zero ? 0 : 1) && value <= 1_000_000_000,
    400, 'VALIDATION', `${label} must be a ${zero ? 'nonnegative' : 'positive'} integer, at most 1000000000`);
  return value;
}
export function money(value: unknown, label = 'amount'): number {
  assert(typeof value === 'number' && Number.isFinite(value) && value >= 0 && value <= 100_000_000_000,
    400, 'VALIDATION', `${label} must be a finite nonnegative INR amount`);
  const raw = String(value);
  assert(/^\d+(\.\d{1,2})?$/.test(raw), 400, 'VALIDATION', `${label} must have at most two decimal places`);
  const [whole, fraction = ''] = raw.split('.');
  return safe(BigInt(whole) * 100n + BigInt(fraction.padEnd(2, '0')));
}
export function safe(value: bigint): number {
  assert(value >= 0n && value <= BigInt(Number.MAX_SAFE_INTEGER), 400, 'VALIDATION', 'Numeric total exceeds safe integer precision');
  return Number(value);
}
export function multiply(a: number, b: number): number { return safe(BigInt(a) * BigInt(b)); }
export function sum(values: number[]): number { return safe(values.reduce((a, b) => a + BigInt(b), 0n)); }
export function choice<T extends string>(value: unknown, choices: readonly T[], label: string): T {
  assert(typeof value === 'string' && choices.includes(value as T), 400, 'VALIDATION', `${label} must be one of ${choices.join(', ')}`);
  return value as T;
}
export function array(value: unknown, label: string): Record<string, any>[] {
  assert(Array.isArray(value) && value.length > 0 && value.length <= 30, 400, 'VALIDATION', `${label} must contain 1–30 entries`);
  return value.map((item, i) => object(item, `${label}[${i}]`));
}
/** Sorted keys make semantically identical JSON independent of property insertion order. */
export function canonical(value: unknown): string {
  if (value === null || typeof value === 'boolean' || typeof value === 'string') return JSON.stringify(value);
  if (typeof value === 'number') {
    assert(Number.isFinite(value), 400, 'VALIDATION', 'Nonfinite numbers are forbidden'); return JSON.stringify(value);
  }
  if (Array.isArray(value)) return `[${value.map(canonical).join(',')}]`;
  const data = object(value);
  return `{${Object.keys(data).sort().map(k => `${JSON.stringify(k)}:${canonical(data[k])}`).join(',')}}`;
}
export function serialize(value: any): any {
  if (value === null || value === undefined) return value;
  if (typeof value.toDate === 'function') return value.toDate().toISOString();
  if (Array.isArray(value)) return value.map(serialize);
  if (typeof value === 'object') return Object.fromEntries(Object.entries(value).map(([k, v]) => [k, serialize(v)]));
  return value;
}
