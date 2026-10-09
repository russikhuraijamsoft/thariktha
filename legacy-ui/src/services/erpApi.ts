import type { UserProfile } from '../types/auth';

export interface ERPRecord { id: string; [key: string]: any }
export interface ERPCommand { entity: string; action: string; id?: string; data: Record<string, unknown>; idempotencyKey: string }
export interface CommandResult { record: ERPRecord; related?: Record<string, string>; replayed?: boolean }
export class ApiError extends Error {
  constructor(public code: string, message: string, public status = 0) { super(message); this.name = 'ApiError'; }
}
export function errorMessage(error: unknown): string {
  return error instanceof ApiError ? `${error.code}: ${error.message}` : error instanceof Error ? error.message : 'Unexpected error. Nothing has been confirmed.';
}

// No Firestore access, offline queue, local business store, or synthesized records.
export function createErpApi(getToken: () => Promise<string>, transport: typeof fetch = fetch) {
  async function request<T>(path: string, command?: ERPCommand): Promise<T> {
    const token = await getToken();
    let response: Response;
    try {
      response = await transport(`/api/${path}`, {
        method: command ? 'POST' : 'GET', cache: 'no-store',
        headers: { Authorization: `Bearer ${token}`, ...(command ? { 'Content-Type': 'application/json' } : {}) },
        ...(command ? { body: JSON.stringify(command) } : {}),
      });
    } catch { throw new ApiError('NETWORK_ERROR', command ? 'Outcome unknown. Retry this same command; its idempotency key is retained.' : 'Cannot reach the ERP API. No records were loaded.'); }
    let body: any;
    try { body = await response.json(); }
    catch { throw new ApiError('INVALID_RESPONSE', command ? 'No valid command acknowledgement. Retry with the retained key.' : 'The API returned an invalid response.', response.status); }
    if (!response.ok) throw new ApiError(body?.error?.code || 'API_ERROR', body?.error?.message || `Request failed (${response.status})`, response.status);
    return body as T;
  }
  return {
    session: () => request<UserProfile>('erp/session'),
    ready: () => request<unknown>('ready'),
    async list(entity: string): Promise<ERPRecord[]> {
      const result = await request<{ records: ERPRecord[] }>(`erp/${encodeURIComponent(entity)}`);
      if (!Array.isArray(result.records) || result.records.some(r => !r || typeof r.id !== 'string')) throw new ApiError('INVALID_RESPONSE', 'The API did not return a complete record list.');
      return result.records;
    },
    async execute(command: ERPCommand): Promise<CommandResult> {
      const result = await request<CommandResult>('erp/commands', command);
      if (!result.record || typeof result.record.id !== 'string') throw new ApiError('INVALID_RESPONSE', 'No valid committed record acknowledgement. Retry with the retained key.');
      return result;
    },
  };
}
export type ErpApi = ReturnType<typeof createErpApi>;

function canonical(value: any): string {
  if (Array.isArray(value)) return `[${value.map(canonical).join(',')}]`;
  if (value && typeof value === 'object') return `{${Object.keys(value).sort().filter(k => value[k] !== undefined).map(k => `${JSON.stringify(k)}:${canonical(value[k])}`).join(',')}}`;
  return JSON.stringify(value);
}
// Persist ONLY opaque digest -> random key, never tokens, profile, or business data.
// This survives reloads for the same actor/scope and unchanged payload. Memory fallback
// still retains the key for retries in this tab when sessionStorage is unavailable.
const retryKeys = new Map<string, string>();
export async function prepareCommand(actor: UserProfile, input: Omit<ERPCommand, 'idempotencyKey'>): Promise<{ command: ERPCommand; acknowledged: () => void }> {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(canonical({ actor, input })));
  const slot = `erp-command-key:${Array.from(new Uint8Array(digest), b => b.toString(16).padStart(2, '0')).join('')}`;
  let key = retryKeys.get(slot);
  try { key = key || sessionStorage.getItem(slot) || undefined; } catch { /* storage blocked */ }
  key = key || crypto.randomUUID();
  retryKeys.set(slot, key);
  try { sessionStorage.setItem(slot, key); } catch { /* in-memory retry remains available */ }
  return { command: { ...input, idempotencyKey: key }, acknowledged: () => {
    retryKeys.delete(slot);
    try { sessionStorage.removeItem(slot); } catch { /* storage blocked */ }
  } };
}
