/**
 * Unit tests for authentication middleware
 * Run with: npx jest auth.test.ts
 */

import type { Request, Response } from 'express';
import { firebaseAuthMiddleware, requireRole, requireActive } from '../server/middleware/auth';

// Mock firebase-admin
jest.mock('../server/firebase-admin', () => ({
  adminAuth: {
    verifyIdToken: jest.fn()
  },
  adminDb: {
    collection: jest.fn(() => ({
      doc: jest.fn(() => ({
        get: jest.fn()
      }))
    }))
  }
}));

import { adminAuth, adminDb } from '../server/firebase-admin';

describe('Auth Middleware', () => {
  let mockReq: Partial<Request>;
  let mockRes: Partial<Response>;
  let nextFunction: jest.Mock;

  beforeEach(() => {
    mockReq = {
      headers: {},
      user: undefined
    };
    mockRes = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn()
    };
    nextFunction = jest.fn();
  });

  describe('firebaseAuthMiddleware', () => {
    it('should reject missing Authorization header', async () => {
      await firebaseAuthMiddleware(mockReq as Request, mockRes as Response, nextFunction);

      expect(mockRes.status).toHaveBeenCalledWith(401);
      expect(mockRes.json).toHaveBeenCalledWith({
        error: 'UNAUTHORIZED',
        message: 'Missing or invalid Authorization header. Expected: Bearer <token>'
      });
      expect(nextFunction).not.toHaveBeenCalled();
    });

    it('should reject invalid token format', async () => {
      mockReq.headers = { authorization: 'Bearer short' };

      await firebaseAuthMiddleware(mockReq as Request, mockRes as Response, nextFunction);

      expect(mockRes.status).toHaveBeenCalledWith(401);
      expect(mockRes.json).toHaveBeenCalledWith({
        error: 'UNAUTHORIZED',
        message: 'Invalid token format'
      });
      expect(nextFunction).not.toHaveBeenCalled();
    });

    it('should reject expired token', async () => {
      mockReq.headers = { authorization: 'Bearer valid_token_format_here' };
      (adminAuth.verifyIdToken as jest.Mock).mockRejectedValue({ code: 'auth/expired-token' });

      await firebaseAuthMiddleware(mockReq as Request, mockRes as Response, nextFunction);

      expect(mockRes.status).toHaveBeenCalledWith(401);
      expect(mockRes.json).toHaveBeenCalledWith({
        error: 'TOKEN_EXPIRED',
        message: 'Firebase ID token has expired'
      });
      expect(nextFunction).not.toHaveBeenCalled();
    });

    it('should reject when user profile not found', async () => {
      mockReq.headers = { authorization: 'Bearer valid_token_format_here' };
      (adminAuth.verifyIdToken as jest.Mock).mockResolvedValue({ uid: 'user123', email: 'test@test.com' });
      const mockGet = jest.fn().mockResolvedValue({ exists: false });
      (adminDb.collection as jest.Mock).mockReturnValue({
        doc: jest.fn().mockReturnValue({ get: mockGet })
      });

      await firebaseAuthMiddleware(mockReq as Request, mockRes as Response, nextFunction);

      expect(mockRes.status).toHaveBeenCalledWith(401);
      expect(mockRes.json).toHaveBeenCalledWith({
        error: 'UNAUTHORIZED',
        message: 'User profile not found'
      });
      expect(nextFunction).not.toHaveBeenCalled();
    });

    it('should attach user to request on successful auth', async () => {
      mockReq.headers = { authorization: 'Bearer valid_token_format_here' };
      (adminAuth.verifyIdToken as jest.Mock).mockResolvedValue({ uid: 'user123', email: 'test@test.com' });
      const mockGet = jest.fn().mockResolvedValue({
        exists: true,
        data: () => ({
          roleId: 'admin',
          branchId: 'Melbourne Closets',
          status: 'active'
        })
      });
      (adminDb.collection as jest.Mock).mockReturnValue({
        doc: jest.fn().mockReturnValue({ get: mockGet })
      });

      await firebaseAuthMiddleware(mockReq as Request, mockRes as Response, nextFunction);

      expect(nextFunction).toHaveBeenCalled();
      expect(mockReq.user).toEqual({
        uid: 'user123',
        email: 'test@test.com',
        roleId: 'admin',
        branchId: 'Melbourne Closets',
        status: 'active'
      });
    });
  });

  describe('requireRole', () => {
    it('should reject when user not authenticated', () => {
      const middleware = requireRole('admin');
      middleware(mockReq as Request, mockRes as Response, nextFunction);

      expect(mockRes.status).toHaveBeenCalledWith(401);
      expect(mockRes.json).toHaveBeenCalledWith({
        error: 'UNAUTHORIZED',
        message: 'Authentication required'
      });
      expect(nextFunction).not.toHaveBeenCalled();
    });

    it('should reject when user role not allowed', () => {
      mockReq.user = {
        uid: 'user123',
        email: 'test@test.com',
        roleId: 'customer',
        branchId: 'Melbourne Closets',
        status: 'active'
      };
      const middleware = requireRole('admin', 'manager');
      middleware(mockReq as Request, mockRes as Response, nextFunction);

      expect(mockRes.status).toHaveBeenCalledWith(403);
      expect(mockRes.json).toHaveBeenCalledWith({
        error: 'FORBIDDEN',
        message: 'Access denied. Required role: admin or manager. Your role: customer'
      });
      expect(nextFunction).not.toHaveBeenCalled();
    });

    it('should allow when user role is allowed', () => {
      mockReq.user = {
        uid: 'user123',
        email: 'test@test.com',
        roleId: 'admin',
        branchId: 'Melbourne Closets',
        status: 'active'
      };
      const middleware = requireRole('admin', 'manager');
      middleware(mockReq as Request, mockRes as Response, nextFunction);

      expect(nextFunction).toHaveBeenCalled();
    });
  });

  describe('requireActive', () => {
    it('should reject suspended accounts', () => {
      mockReq.user = {
        uid: 'user123',
        email: 'test@test.com',
        roleId: 'admin',
        branchId: 'Melbourne Closets',
        status: 'suspended'
      };
      requireActive(mockReq as Request, mockRes as Response, nextFunction);

      expect(mockRes.status).toHaveBeenCalledWith(403);
      expect(mockRes.json).toHaveBeenCalledWith({
        error: 'ACCOUNT_SUSPENDED',
        message: 'Your account is not active. Contact your administrator.'
      });
      expect(nextFunction).not.toHaveBeenCalled();
    });

    it('should allow active accounts', () => {
      mockReq.user = {
        uid: 'user123',
        email: 'test@test.com',
        roleId: 'admin',
        branchId: 'Melbourne Closets',
        status: 'active'
      };
      requireActive(mockReq as Request, mockRes as Response, nextFunction);

      expect(nextFunction).toHaveBeenCalled();
    });
  });
});
