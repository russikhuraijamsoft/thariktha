/**
 * Firestore security rules tests
 * Run with: npx jest firestore-rules.test.ts
 * 
 * These tests verify that the Firestore security rules properly block
 * the "Dirty Dozen" attack vectors described in security_spec.md
 */

import type { RulesTestEnvironment } from '@firebase/rules-unit-testing';
import { initializeTestEnvironment } from '@firebase/rules-unit-testing';
import { doc, setDoc, getDoc, updateDoc } from 'firebase/firestore';

let testEnv: RulesTestEnvironment;

beforeAll(async () => {
  testEnv = await initializeTestEnvironment({
    projectId: 'talk-of-the-town-closet-erp',
    firestore: {
      rules: require('fs').readFileSync('firestore.rules', 'utf8'),
      host: '127.0.0.1',
      port: 8080,
    },
  });
});

afterAll(async () => {
  await testEnv.cleanup();
});

describe('Zero-Trust Exploits Security Verification', () => {
  describe('DB-01: Admin Privilege Escalation', () => {
    it('should block self-assigned admin role during registration', async () => {
      const db = testEnv.authenticatedContext('attacker_uid').firestore();
      const userDoc = doc(db, 'users/attacker_uid');

      await expect(setDoc(userDoc, {
        uid: 'attacker_uid',
        name: 'Malicious User',
        email: 'attacker@gmail.com',
        roleId: 'admin',
        branchId: 'closet_branch_1',
        status: 'active',
        createdAt: new Date(),
        updatedAt: new Date()
      })).rejects.toThrow();
    });
  });

  describe('DB-02: Ghost Fields (Schema Expansion)', () => {
    it('should block schema expansion attacks', async () => {
      const db = testEnv.authenticatedContext('attacker_uid').firestore();
      const userDoc = doc(db, 'users/attacker_uid');

      // First create a valid user
      await setDoc(userDoc, {
        uid: 'attacker_uid',
        name: 'Test User',
        email: 'test@gmail.com',
        roleId: 'customer',
        branchId: 'closet_branch_1',
        status: 'active',
        createdAt: new Date(),
        updatedAt: new Date()
      });

      // Try to add ghost field
      await expect(updateDoc(userDoc, {
        isAdminOverride: true
      })).rejects.toThrow();
    });
  });

  describe('DB-03: Temporal Tampering', () => {
    it('should block backdated createdAt timestamps', async () => {
      const db = testEnv.authenticatedContext('attacker_uid').firestore();
      const orderDoc = doc(db, 'orders/order_test_1');

      await expect(setDoc(orderDoc, {
        id: 'order_test_1',
        customerId: 'attacker_uid',
        branchId: 'closet_branch_1',
        status: 'pending',
        orderDate: new Date(),
        paymentStatus: 'unpaid',
        totalAmount: 1500.0,
        createdAt: new Date('2020-01-01'),
        updatedAt: new Date()
      })).rejects.toThrow();
    });
  });

  describe('DB-04: Fraudulent Billing (Negative Amount)', () => {
    it('should block negative totalAmount', async () => {
      const db = testEnv.authenticatedContext('attacker_uid').firestore();
      const orderDoc = doc(db, 'orders/order_test_1');

      await expect(setDoc(orderDoc, {
        id: 'order_test_1',
        customerId: 'attacker_uid',
        branchId: 'closet_branch_1',
        status: 'pending',
        orderDate: new Date(),
        paymentStatus: 'unpaid',
        totalAmount: -500.0,
        createdAt: new Date(),
        updatedAt: new Date()
      })).rejects.toThrow();
    });
  });

  describe('DB-05: Orphan Write Injection', () => {
    it('should block manufacturing jobs without parent order', async () => {
      const db = testEnv.authenticatedContext('staff_uid').firestore();
      const jobDoc = doc(db, 'manufacturing_jobs/job_1');

      await expect(setDoc(jobDoc, {
        id: 'job_1',
        orderId: 'non_existent_fake_order_XYZ',
        status: 'queued',
        priority: 'rush',
        startDate: new Date()
      })).rejects.toThrow();
    });
  });

  describe('DB-06: ID Poisoning Attack', () => {
    it('should block invalid document IDs', async () => {
      const db = testEnv.authenticatedContext('staff_uid').firestore();
      const customerDoc = doc(db, 'customers/<script>alert(1)</script>');

      await expect(setDoc(customerDoc, {
        id: 'malicious_script_id',
        name: 'Target Customer',
        email: 'cust@domain.com',
        branchId: 'closet_branch_1',
        createdAt: new Date(),
        updatedAt: new Date()
      })).rejects.toThrow();
    });
  });

  describe('DB-07: Ledger Manipulation', () => {
    it('should block transaction date modification', async () => {
      const db = testEnv.authenticatedContext('staff_uid').firestore();
      const txnDoc = doc(db, 'transactions/tx_112');

      // Create transaction
      await setDoc(txnDoc, {
        id: 'tx_112',
        branchId: 'closet_branch_1',
        paymentMethod: 'bank_transfer',
        amount: 1000.0,
        type: 'credit',
        status: 'cleared',
        date: new Date()
      });

      // Try to modify date
      await expect(updateDoc(txnDoc, {
        date: new Date('2020-01-01')
      })).rejects.toThrow();
    });
  });

  describe('DB-08: Cross-Branch Analytics Access', () => {
    it('should block non-managers from reading analytics', async () => {
      const db = testEnv.authenticatedContext('customer_uid').firestore();
      const analyticsDoc = doc(db, 'analytics/branch_2_daily_summary');

      await expect(getDoc(analyticsDoc)).rejects.toThrow();
    });
  });

  describe('DB-09: Printer Step Hijack', () => {
    it('should block printers from modifying pricing/quantities', async () => {
      const db = testEnv.authenticatedContext('printer_uid').firestore();
      const jobDoc = doc(db, 'printing_jobs/print_job_1');

      // Create job
      await setDoc(jobDoc, {
        id: 'print_job_1',
        orderId: 'order_1',
        printingType: 'sublimation',
        status: 'queued',
        itemsCount: 10
      });

      // Try to modify itemsCount
      await expect(updateDoc(jobDoc, {
        itemsCount: 99999
      })).rejects.toThrow();
    });
  });

  describe('DB-10: PII Spill Attempt', () => {
    it('should block customers from reading other customer profiles', async () => {
      const db = testEnv.authenticatedContext('customer_uid').firestore();
      const customerDoc = doc(db, 'customers/customer_secure_99');

      await expect(getDoc(customerDoc)).rejects.toThrow();
    });
  });

  describe('DB-11: Quality Audit Bypass', () => {
    it('should block craftsman from self-assigning quality score', async () => {
      const db = testEnv.authenticatedContext('craftsman_uid').firestore();
      const jobDoc = doc(db, 'manufacturing_jobs/splice_job_4');

      // Create job
      await setDoc(jobDoc, {
        id: 'splice_job_4',
        orderId: 'order_4',
        status: 'queued',
        priority: 'medium',
        startDate: new Date()
      });

      // Try to set quality score and complete status
      await expect(updateDoc(jobDoc, {
        status: 'complete',
        qualityScore: 100
      })).rejects.toThrow();
    });
  });

  describe('DB-12: Retroactive Invoice Edits', () => {
    it('should block customers from modifying invoice status', async () => {
      const db = testEnv.authenticatedContext('customer_uid').firestore();
      const invoiceDoc = doc(db, 'invoices/invoice_order_33');

      await expect(updateDoc(invoiceDoc, {
        status: 'paid',
        amountDue: 0.0
      })).rejects.toThrow();
    });
  });
});
