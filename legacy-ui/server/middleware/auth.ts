import type { Request, Response, NextFunction } from 'express';
import { adminAuth, adminDb } from '../firebase-admin';

// Extend Express Request to include authenticated user
declare global {
  namespace Express {
    interface Request {
      user?: {
        uid: string;
        email: string;
        roleId: string;
        branchId: string;
        status: string;
      };
    }
  }
}

/**
 * Firebase Auth Middleware
 * Verifies the Firebase ID token from the Authorization header
 * and attaches the user's profile to the request object.
 */
export async function firebaseAuthMiddleware(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({
      error: 'UNAUTHORIZED',
      message: 'Missing or invalid Authorization header. Expected: Bearer <token>'
    });
    return;
  }

  const token = authHeader.split('Bearer ')[1];

  if (!token || token.length < 20) {
    res.status(401).json({
      error: 'UNAUTHORIZED',
      message: 'Invalid token format'
    });
    return;
  }

  if (!adminAuth || !adminDb) {
    res.status(503).json({
      error: 'SERVICE_UNAVAILABLE',
      message: 'Authentication service not configured. Set GOOGLE_APPLICATION_CREDENTIALS env var.'
    });
    return;
  }

  try {
    const decodedToken = await adminAuth.verifyIdToken(token);

    // Fetch user profile from Firestore
    const userDoc = await adminDb.collection('users').doc(decodedToken.uid).get();

    if (!userDoc.exists) {
      res.status(401).json({
        error: 'UNAUTHORIZED',
        message: 'User profile not found'
      });
      return;
    }

    const userData = userDoc.data()!;
    req.user = {
      uid: decodedToken.uid,
      email: decodedToken.email || '',
      roleId: userData.roleId || 'customer',
      branchId: userData.branchId || '',
      status: userData.status || 'active'
    };

    next();
  } catch (error: any) {
    if (error.code === 'auth/expired-token') {
      res.status(401).json({
        error: 'TOKEN_EXPIRED',
        message: 'Firebase ID token has expired'
      });
      return;
    }
    if (error.code === 'auth/argument-error') {
      res.status(401).json({
        error: 'INVALID_TOKEN',
        message: 'Could not verify the provided token'
      });
      return;
    }
    console.error('[AUTH] Token verification error:', error.message);
    res.status(401).json({
      error: 'UNAUTHORIZED',
      message: 'Token verification failed'
    });
  }
}

/**
 * Role-based authorization middleware factory
 * Usage: app.get('/api/orders', requireRole('admin', 'manager'), handler)
 */
export function requireRole(...allowedRoles: string[]) {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({
        error: 'UNAUTHORIZED',
        message: 'Authentication required'
      });
      return;
    }

    if (!allowedRoles.includes(req.user.roleId)) {
      res.status(403).json({
        error: 'FORBIDDEN',
        message: `Access denied. Required role: ${allowedRoles.join(' or ')}. Your role: ${req.user.roleId}`
      });
      return;
    }

    next();
  };
}

/**
 * Middleware to check if user account is active
 */
export function requireActive(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  if (!req.user) {
    res.status(401).json({
      error: 'UNAUTHORIZED',
      message: 'Authentication required'
    });
    return;
  }

  if (req.user.status !== 'active') {
    res.status(403).json({
      error: 'ACCOUNT_SUSPENDED',
      message: 'Your account is not active. Contact your administrator.'
    });
    return;
  }

  next();
}
