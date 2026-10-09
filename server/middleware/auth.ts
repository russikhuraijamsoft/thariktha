import type { NextFunction, Request, Response } from 'express';
import type { Auth } from 'firebase-admin/auth';
import type { Firestore } from 'firebase-admin/firestore';
import { ROLES, type Actor, type Role } from '../../shared/erp';
import { ErpError, id } from '../erp/validation';

export interface ERPRequest extends Request { actor?: Actor }
export function createAuthenticate(auth: Pick<Auth, 'verifyIdToken'>, db: Firestore) {
  return async (req: ERPRequest, _res: Response, next: NextFunction) => {
    try {
      const header = req.headers.authorization;
      if (!header || !/^Bearer [^\s]+$/.test(header)) throw new ErpError(401, 'UNAUTHENTICATED', 'Sign in to access the ERP');
      let decoded;
      try { decoded = await auth.verifyIdToken(header.slice(7), true); }
      catch (error: any) {
        if (String(error?.code).startsWith('auth/') && !['auth/internal-error', 'auth/insufficient-permission', 'auth/invalid-credential'].includes(error.code)) {
          throw new ErpError(401, 'INVALID_TOKEN', 'Session expired or invalid. Sign in again.');
        }
        throw new ErpError(503, 'AUTH_UNAVAILABLE', 'Authentication verification is unavailable');
      }
      const snapshot = await db.collection('users').doc(decoded.uid).get();
      const p = snapshot.data();
      if (!p || p.status !== 'active') throw new ErpError(403, 'PROFILE_REQUIRED', 'An administrator must provision an active employee profile before access.');
      const role = p.roleId ?? p.role;
      if (!ROLES.includes(role as Role) || (p.role && p.role !== role)) throw new ErpError(403, 'ROLE_REVIEW_REQUIRED', 'The employee role requires administrator review.');
      try { id(p.companyId, 'companyId'); id(p.branchId, 'branchId'); }
      catch { throw new ErpError(403, 'SCOPE_REQUIRED', 'The employee needs an explicit company and branch assignment.'); }
      req.actor = { uid: decoded.uid, role, companyId: p.companyId, branchId: p.branchId, name: typeof p.name === 'string' ? p.name : '' };
      next();
    } catch (error) { next(error); }
  };
}
