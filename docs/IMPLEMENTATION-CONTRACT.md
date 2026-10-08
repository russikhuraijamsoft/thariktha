# Production ERP implementation contract

Working tree: /data/data/com.termux/files/home/thariktha-production, branch hermes/production-erp, based on latest AI Studio push eb33d12. Original dirty ~/thariktha is untouched. No push or deployment authorized in this task.

## Audit boundary (before implementation)
Repository blueprint and rules already define products, customers, suppliers, inventory, orders, invoices, transactions, manufacturing_jobs, printing_jobs, repair_jobs, users, notifications, roles, settings, teams, analytics, manufacturing_workflows. SQL-like sandbox also names purchaseorders, inventorytransactions, auditlogs. Reuse orders for sales orders; transactions for payments; named job collections, NOT another jobs collection. Reuse purchaseorders, inventorytransactions and auditlogs names. New document types may need quotations, deliveryorders, rfqs, grns, purchasebills, inventoryadjustments, stocktransfers, expenses. Do NOT create duplicate sales_orders/payments/stock_movements entities.
Live collection enumeration returned 403 PERMISSION_DENIED; no ADC, service account environment, or Firebase CLI login present. Live document shapes/rules remain UNVERIFIED. Changes must be tested in emulator, NOT deployed to production. Production command writes must require explicit ERP_SCHEMA_APPROVED=true after authenticated schema/migration review. No deletion of live data.
Client root/src firebase-applet-config.json files are identical and already include the public apiKey; consolidate on ROOT file. Server uses ADC/service account independently; never expose credentials in Vite. Project cricket-closet-imphal, database ai-studio-cricketcloseterp-2be2e18e-4031-4d60-99a3-500634b8d6be.

## Shared API contract (do not silently diverge)
- GET /api/health: liveness, no claim of database readiness.
- GET /api/ready: authenticated readiness/check actual database access (503 unavailable).
- GET /api/erp/session: authenticated actor profile; only preprovisioned active users permitted.
- GET /api/erp/:entity: {records: ERPRecord[]} scoped company+branch, no hidden pagination cap (or explicit incomplete error).
- POST /api/erp/commands: {entity, action, id?, data, idempotencyKey} -> {record: ERPRecord, related?: Record<string,string>, replayed?: boolean}. Success only after committed transaction.
- Error: HTTP 400/401/403/404/409/503 {error: {code, message}}. Errors never silently produce fake empty data.
- Entity keys are actual collection names listed above. No alias duplication.
- Actor: {uid: string, role: Role, companyId: string, branchId: string, name?: string} derived on server from verified Firebase token AND active users/{uid} (roleId or role). No default admin or missing-profile fallback.
- Roles OWNER ADMIN MANAGER SALES INVENTORY PURCHASING PRODUCTION PRINTING SERVICE ACCOUNTING VIEWER.
- Engine module server/erp/engine.ts exports createErpService(db: FirebaseFirestore.Firestore), methods list(actor,entity), execute(actor,command). Shared metadata/types in shared/erp.ts. Export ENTITIES, ROLES and document-specific ACTIONS/status metadata usable in UI if possible. Engine errors have status and code.
- Every mutable document: id, number, companyId, branchId, status, notes, createdAt/updatedAt (server Timestamp), createdBy/updatedBy, auditlogs entries. Preserve originals. Archive masters instead of destructive deletion. Missing scope on legacy records must not be silently assigned.

## Commands and data
create/update/archive for products/customers/suppliers; update allowed only draft transactional docs, server field allowlists. Product: name, sku, unitPrice (INR), costPrice (INR), stockTracked (boolean), category, minimumStock, notes. NEVER currentStock in product edit.
quotations: create {customerId, lines:[{productId,quantity,unitPrice, jobType?: manufacturing|printing|sublimation|repair}], notes}; send (draft->sent); confirm (sent->accepted); convert (accepted->converted + orders draft), idempotent source link.
orders: create with same line fields (optional alternative); confirm draft->confirmed, create each custom job once; deliver confirmed/partially_delivered with {warehouseId, lines:[{lineId,quantity}]} -> deliveryorders + SALE ledger (partial supported, no overdelivery/negative stock); invoice only fully delivered -> invoices issued + order invoiced; pay handled invoices; complete requires fully delivered+paid.
invoices: pay {amount (INR),method: cash|card|bank_transfer|upi,reference} creates transactions and increases amountPaid; reject overpayment/zero/negative; completes linked order once paid and delivered.
rfqs: create {supplierId,lines:[{productId,quantity,unitPrice}],notes}; send draft->sent; confirm sent->accepted; convert accepted->converted + purchaseorders draft.
purchaseorders: create {supplierId,lines:[{productId,quantity,unitPrice}],notes}; confirm draft->confirmed; receive {warehouseId,lines:[{lineId,accepted,rejected,damaged}],reason?} creates immutable grns; only accepted adds stock. Track accepted/received, rejected, damaged and remaining consistently (rejected/damaged remain outstanding replacement demand), prevent total accounted receipt above outstanding; partial/multiple receipts supported; bill received/partially_received quantities NOT already billed -> purchasebills issued. No full-order invoice for partial receipt.
purchasebills: pay same shape as invoice creates outgoing transactions, reject overpayment.
inventoryadjustments: create {productId,warehouseId,quantity (positive magnitude),type: OPENING_STOCK|ADJUSTMENT_IN|ADJUSTMENT_OUT|DAMAGE,reason}; post draft->posted atomic ledger/balance; no negative stock.
stocktransfers: create {productId,quantity,fromWarehouseId,toWarehouseId,reason}; post draft->posted, atomic TRANSFER_OUT/IN.
manufacturing_jobs: start queued->in_progress {warehouseId,materials:[{productId,quantity}]} consumes inputs; complete in_progress->complete {warehouseId,productId,quantity} produces output once (require output bound to job product and max quantity).
printing_jobs: start queued->in_progress; complete in_progress->complete, no pretend manufacturing inventory output.
repair_jobs: start received->in_repair; complete in_repair->ready.
expenses: create {description,amount,method,notes}; post draft->posted.
notifications: markRead only relevant scoped/recipient document. comment action on documents writes audit/chatter note, not simulated local activity.
users: list only management; update roles/status only OWNER/ADMIN with no self escalation or admin->OWNER escalation. No public profile self-create with active privileges; first OWNER provisioned via trusted Admin script/operator.
Read-only ledger entities inventory, inventorytransactions, transactions, auditlogs, grns, deliveryorders; clients cannot create/update these via generic action.
All quantities finite positive integers for this first implementation; monetary values validated finite >=0 up to 2 decimals, compute in integer paise internally, expose INR fields.

## Invariants and QA
All engine writes use Firestore runTransaction, READS BEFORE WRITES. Same idempotency key and same payload returns previous outcome; same key different payload =409; include actor/scope in fingerprint, prevent changed actor payload replay. Source document deterministic links prevent duplicate conversion/jobs/delivery/invoice with another key. Keys persisted only after atomic success. Ledger immutable, server writes before/after/source/product/warehouse/user/timestamp/reason/type; quantity changes sum to authoritative balance. Scoped RBAC at every read/write/reference. No client business writes; Firestore rules deny direct mutation even for privileged clients (Admin SDK engine is boundary).
Tests node:test with tsx. Real Firestore emulator transaction integration tests required (test data explicitly only isolated emulator project). Test CRUD, full sales, stock, purchase partial/damage/GRN/billing, RBAC/branch, duplicate concurrent submission, bad key reuse, empty, invalid transitions and errors. No fake business data in runtime. Fake test fixtures only in tests. UI must use API and retry same idempotency key for ambiguous network outcomes. Error and empty states separate. Preserve Odoo visual language, functional launcher/search/filters/grouping/list/kanban/forms/reports/status/smart links/tabs/audit chatter. Do not retain simulated buttons. Clearly label unsupported modules instead of pretending completed.
