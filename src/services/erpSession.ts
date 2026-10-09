import { ROLES, type UserProfile } from '../types/auth';
import { ApiError, errorMessage } from './erpApi';

export interface SessionIdentity { uid: string }
export interface SessionState<T extends SessionIdentity> {
  user: T | null;
  profile: UserProfile | null;
  loading: boolean;
  sessionError: string;
}
const provisioningCodes = new Set(['PROFILE_REQUIRED', 'ROLE_REVIEW_REQUIRED', 'SCOPE_REQUIRED', 'PROVISIONING_REQUIRED']);
export function sessionErrorMessage(error: unknown, uid: string): string {
  if (error instanceof ApiError && provisioningCodes.has(error.code)) {
    return `Provisioning required or access disabled. Ask an authorized operator to review the active users/${uid} profile, role, company and branch. ${errorMessage(error)}`;
  }
  if (error instanceof ApiError && error.status === 401) {
    return `${errorMessage(error)} Sign out and sign in again to renew your session.`;
  }
  return errorMessage(error);
}

// The Firebase identity is not ERP authorization. Only the latest server session
// can publish a profile; account switches, retries and unmounts invalidate old work.
export function createSessionLoader<T extends SessionIdentity>(
  fetchSession: (user: T) => Promise<UserProfile>,
  publish: (state: SessionState<T>) => void,
) {
  let generation = 0;
  return {
    cancel() { generation++; },
    async load(user: T | null): Promise<void> {
      const version = ++generation;
      publish({ user, profile: null, loading: Boolean(user), sessionError: '' });
      if (!user) return;
      let profile: UserProfile | null = null;
      let sessionError = '';
      try {
        const actor = await fetchSession(user);
        if (!actor || actor.uid !== user.uid || !ROLES.includes(actor.role)
          || typeof actor.companyId !== 'string' || !actor.companyId.trim()
          || typeof actor.branchId !== 'string' || !actor.branchId.trim()) {
          throw new ApiError('PROVISIONING_REQUIRED', 'A valid active ERP profile with company, branch and role is required.', 403);
        }
        profile = actor;
      } catch (error) { sessionError = sessionErrorMessage(error, user.uid); }
      if (version === generation) publish({ user, profile, loading: false, sessionError });
    },
  };
}
