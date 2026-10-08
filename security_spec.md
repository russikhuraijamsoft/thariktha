# "Talk of the Town Cricket Closet ERP" Security & Zero-Trust Threat Specification

This document details the Zero-Trust Threat Specification, Data Invariants, and the "Dirty Dozen" malicious payloads evaluated against the hardened authorization gates of the Cricket Closet ERP platforms.

## 1. Data Invariants & Authorization Boundaries

To ensure absolute system integrity, the following data conditions are locked at the protocol layer via Cloud Firestore security rules:

1.  **Orphan Guard on Child Records**: A `manufacturing_job` or `printing_job` cannot be created or progress unless a corresponding parent `order` exists in the database.
2.  **Immortality of Creation Metrics**: Immutable keys such as `createdAt`, `uid` (on profiles), `customerId` (on orders), and `orderId` (on jobs) are mathematically blocked from updates.
3.  **No Self-Assigned Privileges**: A user cannot assign their own database role ID during signup or update. By default, self-registered users are confined to the `customer` role. Admin assignment requires an explicitly authenticated write gate.
4.  **Temporal Authenticity**: All `createdAt` and `updatedAt` timestamps are enforced directly on the Google Cloud Firestore server using `request.time`. Clients cannot back-date orders, invoices, or transactions.
5.  **Multi-Tenant Branch Isolation**: Branch Managers can view and execute writes on orders, transactions, and inventories *only* if they align with the physical branch ID assigned to their account.
6.  **Absolute Terminal State Lock**: An order or job that reaches terminal states (`canceled`, `complete`, `delivered`) cannot receive any further updates.

---

## 2. The "Dirty Dozen" Payloads (Exploit Vector Scenarios)

The following 12 JSON payloads represent standard pen-testing vectors designed to exploit identity validation gaps, status escalation, value poisoning, or privilege escalation. All of these payloads fail with **`PERMISSION_DENIED`** at the engine.

### DB-01: Admin Privilege Escalation (Self-Assigned Role)
*   **Vector**: Attempting to bypass the RBAC gate by passing `roleId: "admin"` during initial registration.
*   **Target Collection**: `/users/attacker_uid` (Create)
*   **Payload**:
    ```json
    {
      "uid": "attacker_uid",
      "name": "Malicious User",
      "email": "attacker@gmail.com",
      "roleId": "admin",
      "branchId": "closet_branch_1",
      "status": "active",
      "createdAt": "SERVER_TIMESTAMP",
      "updatedAt": "SERVER_TIMESTAMP"
    }
    ```
*   **Result**: `PERMISSION_DENIED` (Create block strictly overrides and forces `roleId == 'customer'`).

### DB-02: Ghost Fields (Schema Expansion Injection)
*   **Vector**: Attempting to force additional custom admin flags during profile edits.
*   **Target Collection**: `/users/attacker_uid` (Update)
*   **Payload**:
    ```json
    {
      "uid": "attacker_uid",
      "name": "Attacker User",
      "email": "attacker@gmail.com",
      "roleId": "customer",
      "branchId": "closet_branch_1",
      "status": "active",
      "isAdminOverride": true,
      "createdAt": "2026-05-25T00:00:00Z",
      "updatedAt": "SERVER_TIMESTAMP"
    }
    ```
*   **Result**: `PERMISSION_DENIED` (The validation helper evaluates strict key matching: `data.keys().size() == 8`, stopping shadow updates).

### DB-03: Temporal Tampering (Submitting Client Clock)
*   **Vector**: Forging the `createdAt` timestamp to backdate order records for performance metrics.
*   **Target Collection**: `/orders/order_test_1` (Create)
*   **Payload**:
    ```json
    {
      "id": "order_test_1",
      "customerId": "attacker_uid",
      "branchId": "closet_branch_1",
      "status": "pending",
      "orderDate": "2020-01-01T00:00:00Z",
      "paymentStatus": "unpaid",
      "totalAmount": 1500.0,
      "createdAt": "2020-01-01T00:00:00Z",
      "updatedAt": "SERVER_TIMESTAMP"
    }
    ```
*   **Result**: `PERMISSION_DENIED` (Rules mandate: `incoming().createdAt == request.time`).

### DB-04: Fraudulent Billing Injection (Negative Total Cost)
*   **Vector**: Manipulating the client payload during purchase to credit the balance or place free orders.
*   **Target Collection**: `/orders/order_test_1` (Create)
*   **Payload**:
    ```json
    {
      "id": "order_test_1",
      "customerId": "attacker_uid",
      "branchId": "closet_branch_1",
      "status": "pending",
      "orderDate": "SERVER_TIMESTAMP",
      "paymentStatus": "unpaid",
      "totalAmount": -500.0,
      "createdAt": "SERVER_TIMESTAMP",
      "updatedAt": "SERVER_TIMESTAMP"
    }
    ```
*   **Result**: `PERMISSION_DENIED` (Rules check: `totalAmount >= 0`).

### DB-05: Orphan Write Injection (Fictitious Order Link)
*   **Vector**: Attempting to inject a manufacturing job attached to an order sequence ID that does not exist.
*   **Target Collection**: `/manufacturing_jobs/job_1` (Create)
*   **Payload**:
    ```json
    {
      "id": "job_1",
      "orderId": "non_existent_fake_order_XYZ",
      "status": "queued",
      "priority": "rush",
      "startDate": "SERVER_TIMESTAMP"
    }
    ```
*   **Result**: `PERMISSION_DENIED` (Enforces: `exists(/databases/$(database)/documents/orders/$(incoming().orderId))`).

### DB-06: ID Poisoning Attack (Junk Script Injection in Paths)
*   **Vector**: Injecting script wrappers as document IDs to trigger deserialization or wallet denial of service.
*   **Target Collection**: `/customers/<script>alert(1)</script>` (Create)
*   **Payload**:
    ```json
    {
      "id": "malicious_script_id",
      "name": "Target Customer",
      "email": "cust@domain.com",
      "branchId": "closet_branch_1",
      "createdAt": "SERVER_TIMESTAMP",
      "updatedAt": "SERVER_TIMESTAMP"
    }
    ```
*   **Result**: `PERMISSION_DENIED` (The document identity must pass regex validation and characters limitations of `isValidId()`).

### DB-07: Micro-Transaction Ledger Manipulation (Direct Ledger Edits)
*   **Vector**: Attempting to force-edit previous transaction histories to state clearing manually.
*   **Target Collection**: `/transactions/tx_112` (Update)
*   **Payload**:
    ```json
    {
      "id": "tx_112",
      "branchId": "closet_branch_1",
      "paymentMethod": "bank_transfer",
      "amount": 10000.0,
      "type": "credit",
      "status": "cleared",
      "date": "2026-05-25T01:00:00Z"
    }
    ```
*   **Result**: `PERMISSION_DENIED` (Rules block modifications to ledger records by verifying `incoming().date == existing().date`).

### DB-08: Cross-Branch Ledger Scraping (Unauthorized Reads)
*   **Vector**: Requesting total listings of sales and macro analytical data from branch closets the staff is not registered to.
*   **Target Collection**: `/analytics/branch_2_daily_summary` (Get)
*   **Result**: `PERMISSION_DENIED` (ABAC constraints limit custom lookups strictly to users matching specific role descriptors or administrative overrides).

### DB-09: Intercepting Active Printing Workflows (Printer Step Hijack)
*   **Vector**: A user registered as a basic printing operator attempt to modify the pricing structure, quantities, or order details on printing jobs.
*   **Target Collection**: `/printing_jobs/print_job_1` (Update)
*   **Payload**:
    ```json
    {
      "id": "print_job_1",
      "orderId": "order_1",
      "printingType": "sublimation",
      "status": "complete",
      "itemsCount": 99999
    }
    ```
*   **Result**: `PERMISSION_DENIED` (Printers are restricted strictly via `affectedKeys().hasOnly(['status', 'completedDate'])`).

### DB-10: PII Spill Attempt (Unauthorized User Scrapes)
*   **Vector**: A guest client attempting to retrieve private customer emails or phones belonging to unrelated team buyers.
*   **Target Collection**: `/customers/customer_secure_99` (Get/List)
*   **Result**: `PERMISSION_DENIED` (Get is locked, lists are scoped. Only administrative Staff can pull records).

### DB-11: Shortcycling Quality Audits (Craftsman Step Bypass)
*   **Vector**: Self-assigning a perfect `qualityScore` and shifting a complex splice bat directly to `complete` without the validation framework check.
*   **Target Collection**: `/manufacturing_jobs/splice_job_4` (Update)
*   **Payload**:
    ```json
    {
      "id": "splice_job_4",
      "orderId": "order_4",
      "status": "complete",
      "priority": "medium",
      "startDate": "2026-05-25T02:00:00Z",
      "qualityScore": 100
    }
    ```
*   **Result**: `PERMISSION_DENIED` (Validation schemas verify exact schema types and restrict craftsman modifications to strict fields).

### DB-12: Retroactive Invoicing Edits (Voiding Completed Dues)
*   **Vector**: Customer edit payload attempting to force-change their invoice status to `paid` to claim credits on unpaid jobs.
*   **Target Collection**: `/invoices/invoice_order_33` (Update)
*   **Payload**:
    ```json
    {
      "id": "invoice_order_33",
      "orderId": "order_33",
      "invoiceNumber": "INV-2026-X11",
      "amountDue": 0.0,
      "amountPaid": 2500.0,
      "status": "paid"
    }
    ```
*   **Result**: `PERMISSION_DENIED` (Rules filter access of invoices strictly to Staff-level accounts).

---

## 3. Server-Side Security (NEW in v2.0)

### 3.1 Authentication
- All `/api/*` endpoints (except `/api/health` and `/api/db-status`) require a valid Firebase ID token
- Tokens are verified server-side using the Firebase Admin SDK
- User profiles are fetched from Firestore to determine role and branch

### 3.2 Authorization
- Role-based access control (RBAC) enforced via `requireRole()` middleware
- Account status checked via `requireActive()` middleware
- Suspended accounts are blocked from all API access

### 3.3 Input Validation
- All request bodies validated against strict schemas
- Type checking, range validation, pattern matching
- Unexpected fields rejected (strict mode)

### 3.4 Rate Limiting
- 100 requests per 15 minutes per IP address
- Returns 429 with `Retry-After` header when exceeded

### 3.5 Security Headers
- `X-Content-Type-Options: nosniff`
- `X-Frame-Options: DENY`
- `X-XSS-Protection: 1; mode=block`
- `Strict-Transport-Security: max-age=31536000; includeSubDomains`
- `Content-Security-Policy` with strict directives
- `Referrer-Policy: strict-origin-when-cross-origin`
- `Permissions-Policy: camera=(), microphone=(), geolocation=()`

### 3.6 CORS
- Configurable via `ALLOWED_ORIGINS` environment variable
- Preflight requests handled correctly

### 3.7 Audit Logging
- All security events logged with timestamp, user, IP, and user agent
- Events: auth success/failure, access denied, privilege escalation attempts, validation failures, rate limit violations

---

## 4. Threat Verification Test Suite

To run automated checks verifying these rules against our `firestore.rules`, use the test builder as mapped below:

```typescript
// firestore.rules.test.ts
// Test Executor verifying zero-trust and the Dirty Dozen exploits

import { initializeTestEnvironment, RulesTestEnvironment } from '@firebase/rules-unit-testing';
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

describe('Zero-Trust Exploits Security Verification', () => {
  test('DB-01: Admin Privilege Escalation (Self-Assigned Role) -> PERMISSION_DENIED', async () => {
    const unauthedDb = testEnv.authenticatedContext('attacker_uid').firestore();
    const newUserDoc = doc(unauthedDb, 'users/attacker_uid');
    
    await expect(setDoc(newUserDoc, {
      uid: 'attacker_uid',
      name: 'Malicious User',
      email: 'attacker@gmail.com',
      roleId: 'admin', // Escalation exploit
      branchId: 'closet_branch_1',
      status: 'active',
      createdAt: new Date(),
      updatedAt: new Date()
    })).rejects.toThrow();
  });

  test('DB-02: Ghost Fields (Schema Expansion Injection) -> PERMISSION_DENIED', async () => {
    const unauthedDb = testEnv.authenticatedContext('attacker_uid').firestore();
    const targetDoc = doc(unauthedDb, 'users/attacker_uid');
    
    await expect(updateDoc(targetDoc, {
      name: 'Attacker User',
      isAdminOverride: true // Schema poisoning exploit
    })).rejects.toThrow();
  });

  test('DB-03: Temporal Tampering (Submitting Client Clock) -> PERMISSION_DENIED', async () => {
    const unauthedDb = testEnv.authenticatedContext('attacker_uid').firestore();
    const orderDoc = doc(unauthedDb, 'orders/order_test_1');
    
    await expect(setDoc(orderDoc, {
      id: 'order_test_1',
      customerId: 'attacker_uid',
      branchId: 'closet_branch_1',
      status: 'pending',
      orderDate: new Date(),
      paymentStatus: 'unpaid',
      totalAmount: 1500.0,
      createdAt: new Date('2020-01-01'), // Fake backdate exploit
      updatedAt: new Date()
    })).rejects.toThrow();
  });
});
```

---

## 5. Changelog

### v2.0.0 (Enterprise Hardening)
- **CRITICAL**: Removed Firestore shim alias -- app now uses real Firebase SDK
- **CRITICAL**: Added Firebase Admin SDK for server-side token verification
- **CRITICAL**: All `/api/*` endpoints now require authentication
- **CRITICAL**: Fixed privilege escalation -- new users default to `customer` role
- **HIGH**: Added role-based access control (RBAC) on all endpoints
- **HIGH**: Added input validation schemas for all request bodies
- **HIGH**: Added rate limiting (100 req/15min per IP)
- **HIGH**: Added security headers (CSP, HSTS, X-Frame-Options, etc.)
- **HIGH**: Tightened Firestore rules -- removed overly permissive reads
- **HIGH**: Tightened Storage rules -- restricted to staff/owner only
- **MEDIUM**: Added CORS configuration
- **MEDIUM**: Added security audit logging
- **MEDIUM**: Added global error handler
- **MEDIUM**: Removed unused dependencies (puppeteer, mssql, @azure/identity, @google/genai)
- **LOW**: Standardized on npm (removed bun.lock)
