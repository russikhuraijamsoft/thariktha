// Schema and descriptive metadata for "Talk of the Town Cricket Closet ERP"

export interface FieldDefinition {
  name: string;
  type: string;
  required: boolean;
  description: string;
  sampleValue: string;
}

export interface CollectionSchema {
  id: string;
  title: string;
  description: string;
  icon: string;
  features: string[];
  fields: FieldDefinition[];
  relationships: {
    source: string;
    target: string;
    type: '1:1' | '1:N' | 'N:M';
    description: string;
  }[];
  denormalizationStrategy: string;
  queryOptimization: string;
  typescriptInterface: string;
}

export const COLLECTIONS_DATA: CollectionSchema[] = [
  {
    id: 'users',
    title: 'Users',
    description: 'Local registry for all ERP administrative team users, staff, and technicians across branch closets.',
    icon: 'Users',
    features: ['PII Protected', 'RBAC Guided', 'Multi-Branch Scoped'],
    fields: [
      { name: 'uid', type: 'string', required: true, description: 'Unique authentication ID matching Firebase Auth UID.', sampleValue: '"u1e90Xsa4a3"' },
      { name: 'name', type: 'string', required: true, description: 'Display or legal name of the employee.', sampleValue: '"Tendulkar Sharma"' },
      { name: 'email', type: 'string', required: true, description: 'Verified business communication email.', sampleValue: '"tendulkar@cricketcloset.com"' },
      { name: 'roleId', type: 'string', required: true, description: 'Matched ID of the assigned RBAC role.', sampleValue: '"branch_manager"' },
      { name: 'branchId', type: 'string', required: true, description: 'Assigned physical closet/branch identifier.', sampleValue: '"closet_melbourne"' },
      { name: 'status', type: 'string', required: true, description: 'Operational account state.', sampleValue: '"active"' },
      { name: 'createdAt', type: 'timestamp', required: true, description: 'Google Cloud Platform server-defined timestamp during record creation.', sampleValue: 'Timestamp.now()' },
      { name: 'updatedAt', type: 'timestamp', required: true, description: 'Google Cloud Platform server-defined timestamp during record modification.', sampleValue: 'Timestamp.now()' }
    ],
    relationships: [
      { source: 'users.roleId', target: 'roles.id', type: '1:1', description: 'Linked constraint representing permissions.' },
      { source: 'users.branchId', target: 'branches.id', type: '1:N', description: 'Assigned office or hardware store location.' }
    ],
    denormalizationStrategy: 'Email validation checks match directly with standard token claims. The roleId and branchId are held flat to bypass redundant aggregate lookups.',
    queryOptimization: 'Indexed by `branchId` + `status` for staff search lookups. The `uid` matches the document path ID directly for single fetch O(1) reads.',
    typescriptInterface: `interface UserProfile {
  uid: string;
  name: string;
  email: string;
  roleId: 'admin' | 'branch_manager' | 'craftsman' | 'printer' | 'staff' | 'customer';
  branchId: string;
  status: 'active' | 'suspended' | 'invited';
  createdAt: Date; // serverTimestamp()
  updatedAt: Date; // serverTimestamp()
}`
  },
  {
    id: 'roles',
    title: 'Roles',
    description: 'Static authorization settings detailing security permissions available to each user account.',
    icon: 'ShieldCheck',
    features: ['Read-Heavy', 'Static Schema', 'Security Backbone'],
    fields: [
      { name: 'id', type: 'string', required: true, description: 'Shorthand serial ID of the role.', sampleValue: '"craftsman"' },
      { name: 'name', type: 'string', required: true, description: 'Human display title.', sampleValue: '"Master Bat Craftsman"' },
      { name: 'description', type: 'string', required: true, description: 'Overview of standard capabilities.', sampleValue: '"Represents blade finishing and repair professionals"' },
      { name: 'permissions', type: 'string[]', required: true, description: 'Exact string tags parsed in security rules/client routers.', sampleValue: '["read:jobs", "update:jobs:status"]' }
    ],
    relationships: [],
    denormalizationStrategy: 'Roles are cached client-side in React Context states. Writes are exclusively reserved for global super-admins, meaning Firestore rule replication reads of Roles are lightweight.',
    queryOptimization: 'The role document is stored as `/roles/{roleId}` allowing fast static references during initialization queries.',
    typescriptInterface: `interface AccessRole {
  id: string;
  name: string;
  description: string;
  permissions: string[];
}`
  },
  {
    id: 'customers',
    title: 'Customers',
    description: 'Client registries tracking corporate academies, individual cricket athletes, and coaches.',
    icon: 'UserSwitch',
    features: ['PII Isolated', 'Offline Buffered', 'Sync-Optimized'],
    fields: [
      { name: 'id', type: 'string', required: true, description: 'Unique customer sequence identifier.', sampleValue: '"cust_cricket_aus"' },
      { name: 'name', type: 'string', required: true, description: 'Contact champion or institute title.', sampleValue: '"Victorian Cricket Academy"' },
      { name: 'email', type: 'string', required: true, description: 'Direct email for invoices.', sampleValue: '"billing@viccricket.org"' },
      { name: 'phone', type: 'string', required: true, description: 'Global sequence phone number.', sampleValue: '"+61-491-570-156"' },
      { name: 'company', type: 'string', required: false, description: 'Parent organization if business account.', sampleValue: '"Cricket Victoria"' },
      { name: 'branchId', type: 'string', required: true, description: 'Physical closet location that manages this relationship.', sampleValue: '"closet_melbourne"' },
      { name: 'teamIds', type: 'string[]', required: false, description: 'References to teams affiliated with customer.', sampleValue: '["team_vic_u19", "team_vic_womens"]' },
      { name: 'address', type: 'map', required: true, description: 'Detailed shipping and billing coordinates.', sampleValue: '{"street": "87 St Kilda Rd", "city": "Melbourne"}' },
      { name: 'createdAt', type: 'timestamp', required: true, description: 'Registry creation date.', sampleValue: 'Timestamp' },
      { name: 'updatedAt', type: 'timestamp', required: true, description: 'Latest details modification timestamp.', sampleValue: 'Timestamp' }
    ],
    relationships: [
      { source: 'customers.id', target: 'orders.customerId', type: '1:N', description: 'Provides billing coordinates to sales contracts.' },
      { source: 'customers.teamIds', target: 'teams.id', type: 'N:M', description: 'Affiliates corporate customer with team rosters.' }
    ],
    denormalizationStrategy: 'For high-frequency list rendering of orders, `customer.name` and parent `customer.company` are duplicated on the `/orders` records.',
    queryOptimization: 'Searchable via index structure of `branchId` + `name` supporting localized multi-branch client listings.',
    typescriptInterface: `interface Customer {
  id: string;
  name: string;
  email: string;
  phone: string;
  company?: string;
  branchId: string;
  teamIds: string[];
  address: {
    street: string;
    city: string;
    state: string;
    postcode: string;
    country: string;
  };
  createdAt: Date;
  updatedAt: Date;
}`
  },
  {
    id: 'teams',
    title: 'Teams',
    description: 'Cricket teams and coaching clubs linked to uniform styles, custom color specs, and dimensional logs.',
    icon: 'Trophy',
    features: ['Custom Dimensions', 'Teamwear Bound'],
    fields: [
      { name: 'id', type: 'string', required: true, description: 'Unique team collection identification index.', sampleValue: '"team_cobras_mel"' },
      { name: 'name', type: 'string', required: true, description: 'Official club moniker.', sampleValue: '"Cobras CC (U-16)"' },
      { name: 'sportType', type: 'string', required: true, description: 'The sports category (Default: Cricket).', sampleValue: '"Cricket"' },
      { name: 'contactPerson', type: 'string', required: true, description: 'Coordinating coach or manager.', sampleValue: '"Stuart Broad"' },
      { name: 'customerId', type: 'string', required: true, description: 'Corresponding billing entity ID.', sampleValue: '"cust_stuart_b"' },
      { name: 'athletesCount', type: 'int', required: true, description: 'Total members registered to the roster.', sampleValue: '18' },
      { name: 'branchId', type: 'string', required: true, description: 'Physical branch/closet coordinator.', sampleValue: '"closet_melbourne"' },
      { name: 'createdAt', type: 'timestamp', required: true, description: 'Database setup record timing.', sampleValue: 'Timestamp' },
      { name: 'updatedAt', type: 'timestamp', required: true, description: 'Updates tracker.', sampleValue: 'Timestamp' }
    ],
    relationships: [
      { source: 'teams.customerId', target: 'customers.id', type: '1:1', description: 'References financial guarantor.' }
    ],
    denormalizationStrategy: 'Team logos and names are locked; denormalizing team attributes within orders eliminates aggregate multi-reads on sublimation order lists.',
    queryOptimization: 'Composite index of `customerId` + `createdAt DESC` minimizes latency when customers examine affiliated squad records.',
    typescriptInterface: `interface Team {
  id: string;
  name: string;
  sportType: 'Cricket' | 'Other';
  contactPerson: string;
  customerId: string;
  athletesCount: number;
  branchId: string;
  createdAt: Date;
  updatedAt: Date;
}`
  },
  {
    id: 'products',
    title: 'Products',
    description: 'Master list of items encompassing custom-milled English Willow bats, balls, protective pads, and printed jerseys.',
    icon: 'Briefcase',
    features: ['Master Catalog', 'Pricing Rules'],
    fields: [
      { name: 'id', type: 'string', required: true, description: 'Product base skew mapping ID.', sampleValue: '"prod_english_willow_g1"' },
      { name: 'sku', type: 'string', required: true, description: 'Stock Keeping Unit serial identifier.', sampleValue: '"BAT-EW-G1"' },
      { name: 'name', type: 'string', required: true, description: 'Clean descriptive title.', sampleValue: '"Talk of the Town Grade-1 Special Willow Bat"' },
      { name: 'category', type: 'string', required: true, description: 'Specific category group.', sampleValue: '"bats"' },
      { name: 'unitPrice', type: 'number', required: true, description: 'Selling retail value.', sampleValue: '450.00' },
      { name: 'costPrice', type: 'number', required: true, description: 'Manufacturing raw material expense.', sampleValue: '180.00' },
      { name: 'variations', type: 'array', required: false, description: 'Sub-sizes, handle grip layers, and gram weights.', sampleValue: '[{"weight": "2lb 8oz", "handle": "oval"}]' },
      { name: 'status', type: 'string', required: true, description: 'Visibility in customer interfaces.', sampleValue: '"active"' },
      { name: 'createdAt', type: 'timestamp', required: true, description: 'First entry timestamp.', sampleValue: 'Timestamp' }
    ],
    relationships: [
      { source: 'products.id', target: 'inventory.productId', type: '1:N', description: 'Inventories across branches track specific product SKU values.' }
    ],
    denormalizationStrategy: 'Standard list queries cache name, SKU, and unit prices directly within Order sub-items, protecting invoices from retroactive pricing changes.',
    queryOptimization: 'Segmented search indexing configured on `category` + `status` allows clients to catalog items immediately.',
    typescriptInterface: `interface Product {
  id: string;
  sku: string;
  name: string;
  category: 'bats' | 'balls' | 'protective' | 'teamwear' | 'accessories';
  unitPrice: number;
  costPrice: number;
  variations?: {
    size?: string;
    weight?: string;
    handleType?: 'round' | 'oval';
    finish?: string;
  }[];
  status: 'active' | 'discontinued' | 'draft';
  createdAt: Date;
}`
  },
  {
    id: 'inventory',
    title: 'Inventory',
    description: 'Dynamic local warehouse quantities tracked per product localized across multi-branch physical closets.',
    icon: 'Layers',
    features: ['High-Frequency Writes', 'Low-Stock Indicators'],
    fields: [
      { name: 'id', type: 'string', required: true, description: 'Compound key representing branchId_productId.', sampleValue: '"melbourne_ewG1"' },
      { name: 'productId', type: 'string', required: true, description: 'Linked product item.', sampleValue: '"prod_english_willow_g1"' },
      { name: 'branchId', type: 'string', required: true, description: 'Target closet warehouse location.', sampleValue: '"closet_melbourne"' },
      { name: 'quantityInStock', type: 'int', required: true, description: 'Active inventory items physically present.', sampleValue: '24' },
      { name: 'safetyStockLevel', type: 'int', required: true, description: 'Quantity count that triggers staff notifications.', sampleValue: '5' },
      { name: 'reorderPoint', type: 'int', required: true, description: 'Calculated number where replenishment triggers.', sampleValue: '8' },
      { name: 'locationShelf', type: 'string', required: false, description: 'Hardware shelf coordinate location identifier.', sampleValue: '"Row-C3-Shelf-B"' },
      { name: 'lastStockTakeAt', type: 'timestamp', required: true, description: 'Manual audit verification timestamp.', sampleValue: 'Timestamp' }
    ],
    relationships: [
      { source: 'inventory.productId', target: 'products.id', type: '1:1', description: 'Core product info lookup.' },
      { source: 'inventory.branchId', target: 'users.branchId', type: '1:N', description: 'Physical depot constraints bounds.' }
    ],
    denormalizationStrategy: 'The unique document ID is modeled directly as `branchId + "_" + productId`. This bypasses expensive multiple queries, achieving instant O(1) reads for checkout validation.',
    queryOptimization: 'Real-time syncing queries target `branchId` and filter by `quantityInStock <= safetyStockLevel` for low-stock alarms.',
    typescriptInterface: `interface Inventory {
  id: string; // branchId_productId
  productId: string;
  branchId: string;
  quantityInStock: number;
  safetyStockLevel: number;
  reorderPoint: number;
  locationShelf?: string;
  lastStockTakeAt: Date;
}`
  },
  {
    id: 'orders',
    title: 'Orders',
    description: 'ERP purchase receipts capturing athletic custom order parameters (wood-grades, design proofs, timelines).',
    icon: 'ShoppingCart',
    features: ['State Machine Locked', 'Batch Atomic Transactions'],
    fields: [
      { name: 'id', type: 'string', required: true, description: 'Unique ledger order code.', sampleValue: '"ORD-2026-9502"' },
      { name: 'customerId', type: 'string', required: true, description: 'Guaranteed purchasing entity references ID.', sampleValue: '"cust_cricket_aus"' },
      { name: 'teamId', type: 'string', required: false, description: 'Optional cricket team references identifier.', sampleValue: '"team_cobras_mel"' },
      { name: 'branchId', type: 'string', required: true, description: 'Associated service branch.', sampleValue: '"closet_melbourne"' },
      { name: 'status', type: 'string', required: true, description: 'Operational pipeline milestone.', sampleValue: '"manufacturing"' },
      { name: 'orderDate', type: 'timestamp', required: true, description: 'Contract signature date.', sampleValue: 'Timestamp' },
      { name: 'promisedDate', type: 'string', required: true, description: 'Target date promised to client.', sampleValue: '"2026-06-15"' },
      { name: 'orderItems', type: 'array', required: true, description: 'Item items details, customizations, and prices.', sampleValue: '[{"sku": "BAT-EW-G1", "qty": 2, "price": 450}]' },
      { name: 'paymentStatus', type: 'string', required: true, description: 'Tied status of billing clearing.', sampleValue: '"partially_paid"' },
      { name: 'totalAmount', type: 'number', required: true, description: 'Sum total of invoices, tax, and custom adjustments.', sampleValue: '900.00' },
      { name: 'notes', type: 'string', required: false, description: 'Special customization requests (e.g. anti-scuff blade protector).', sampleValue: '"Wants slightly lighter pickup around 2lb 7oz"' },
      { name: 'createdAt', type: 'timestamp', required: true, description: 'Time order was registered.', sampleValue: 'Timestamp' },
      { name: 'updatedAt', type: 'timestamp', required: true, description: 'Action timestamp.', sampleValue: 'Timestamp' }
    ],
    relationships: [
      { source: 'orders.customerId', target: 'customers.id', type: '1:1', description: 'Locates billing champion coordinates.' },
      { source: 'orders.id', target: 'manufacturing_jobs.orderId', type: '1:N', description: 'Triggers active wood carving jobs.' },
      { source: 'orders.id', target: 'printing_jobs.orderId', type: '1:N', description: 'Triggers screen-printing clothing steps.' }
    ],
    denormalizationStrategy: 'Customer name, team name, and item details are locked in the `orderItems` list to provide an historical snapshot that resists schema drift or catalog changes.',
    queryOptimization: 'Composite indexing: `branchId` + `status` + `createdAt DESC` scales dashboard filters across branches.',
    typescriptInterface: `interface Order {
  id: string;
  customerId: string;
  teamId?: string;
  branchId: string;
  status: 'draft' | 'pending' | 'manufacturing' | 'printing' | 'ready' | 'delivered' | 'canceled';
  orderDate: Date;
  promisedDate: string; // YYYY-MM-DD
  orderItems: {
    productId: string;
    sku: string;
    name: string;
    quantity: number;
    unitPrice: number;
    customizationDetails?: string; 
  }[];
  paymentStatus: 'unpaid' | 'partially_paid' | 'paid';
  totalAmount: number;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}`
  },
  {
    id: 'invoices',
    title: 'Invoices',
    description: 'Financial ledger documentation specifying payment timelines and breakdown accounts for accounting.',
    icon: 'FileText',
    features: ['Audit Trailed', 'Temporal Monitored'],
    fields: [
      { name: 'id', type: 'string', required: true, description: 'Invoice identity.', sampleValue: '"INV-2026-X11"' },
      { name: 'orderId', type: 'string', required: true, description: 'Target purchase order linked.', sampleValue: '"ORD-2026-9502"' },
      { name: 'invoiceNumber', type: 'string', required: true, description: 'Sequence number matches accounting rules.', sampleValue: '"CC-MEL-00344"' },
      { name: 'amountDue', type: 'number', required: true, description: 'Required billing charges.', sampleValue: '900.00' },
      { name: 'amountPaid', type: 'number', required: true, description: 'Cleared billing cash records total.', sampleValue: '450.00' },
      { name: 'dueDate', type: 'string', required: true, description: 'Represents final balance clearing limit date.', sampleValue: '"2026-06-30"' },
      { name: 'status', type: 'string', required: true, description: 'Aging payment criteria.', sampleValue: '"partially_paid"' },
      { name: 'pdfUrl', type: 'string', required: false, description: 'Path inside Firebase cloud bucket.', sampleValue: '"/invoices/cc_mel_00344.pdf"' },
      { name: 'createdAt', type: 'timestamp', required: true, description: 'Registry trigger timing.', sampleValue: 'Timestamp' }
    ],
    relationships: [
      { source: 'invoices.orderId', target: 'orders.id', type: '1:1', description: 'Financial verification linked.' }
    ],
    denormalizationStrategy: 'Stores the flat `orderId` and customer reference indices representing immediate lookups without walking collection trees.',
    queryOptimization: 'Composite index: `status` + `dueDate ASC` provides accountant lists matching overdue parameters easily.',
    typescriptInterface: `interface Invoice {
  id: string;
  orderId: string;
  invoiceNumber: string;
  amountDue: number;
  amountPaid: number;
  dueDate: string; // YYYY-MM-DD
  status: 'unpaid' | 'partially_paid' | 'paid' | 'voided';
  pdfUrl?: string; // Cloud Storage link
  createdAt: Date;
}`
  },
  {
    id: 'transactions',
    title: 'Transactions',
    description: 'Actual financial operations representing cash desk operations, electronic gateway clearance, or ledger debts.',
    icon: 'CreditCard',
    features: ['Double-Entry Safe', 'Read-Only Ledger'],
    fields: [
      { name: 'id', type: 'string', required: true, description: 'Secure reference token.', sampleValue: '"tx_mel_94220"' },
      { name: 'invoiceId', type: 'string', required: false, description: 'Linked invoice record.', sampleValue: '"INV-2026-X11"' },
      { name: 'orderId', type: 'string', required: false, description: 'Direct purchase contract.', sampleValue: '"ORD-2026-9502"' },
      { name: 'branchId', type: 'string', required: true, description: 'Closet register that received payment.', sampleValue: '"closet_melbourne"' },
      { name: 'paymentMethod', type: 'string', required: true, description: 'Form of capital transfer.', sampleValue: '"bank_transfer"' },
      { name: 'referenceNumber', type: 'string', required: false, description: 'Bank slip, checkout capture ID, or check sequence.', sampleValue: '"BS-9994-AUD"' },
      { name: 'amount', type: 'number', required: true, description: 'Ledger currency total.', sampleValue: '450.00' },
      { name: 'type', type: 'string', required: true, description: 'Cashbook direction indicator.', sampleValue: '"credit"' },
      { name: 'status', type: 'string', required: true, description: 'Reconciliation indicator.', sampleValue: '"cleared"' },
      { name: 'date', type: 'timestamp', required: true, description: 'Payment processing date.', sampleValue: 'Timestamp' },
      { name: 'notes', type: 'string', required: false, description: 'Ledger footnotes.', sampleValue: '"Second half settlement deposit Victorian CC"' }
    ],
    relationships: [
      { source: 'transactions.invoiceId', target: 'invoices.id', type: '1:N', description: 'Slices debt outstanding counters.' }
    ],
    denormalizationStrategy: 'Transactions are written strictly once (append-only ledger). The compound branch and order indices guarantee static ledger safety.',
    queryOptimization: 'Index filters sorted via `branchId` + `type` + `date DESC` support local balance sheets computation.',
    typescriptInterface: `interface Transaction {
  id: string;
  invoiceId?: string;
  orderId?: string;
  branchId: string;
  paymentMethod: 'cash' | 'card' | 'bank_transfer' | 'cheque';
  referenceNumber?: string;
  amount: number;
  type: 'credit' | 'debit'; // credit=incoming invoice, debit=raw inventory purchase
  status: 'pending' | 'cleared' | 'failed';
  date: Date;
  notes?: string;
}`
  },
  {
    id: 'manufacturing_jobs',
    title: 'Manufacturing Jobs',
    description: 'Specialist tasks mapping bat shaping, blade compression, willow slicing, and handle binding assignments.',
    icon: 'Hammer',
    features: ['Status Progress Tracking', 'Technician Task Logs'],
    fields: [
      { name: 'id', type: 'string', required: true, description: 'Internal job control ticket index.', sampleValue: '"job_mill_8850"' },
      { name: 'orderId', type: 'string', required: true, description: 'Reference order mapping sku values.', sampleValue: '"ORD-2026-9502"' },
      { name: 'assignedTo', type: 'string', required: false, description: 'Uid of designated craftsman.', sampleValue: '"u1e90Xsa4a3"' },
      { name: 'status', type: 'string', required: true, description: 'Current production milestones step.', sampleValue: '"pressing"' },
      { name: 'priority', type: 'string', required: true, description: 'Production backlog emergency prioritization.', sampleValue: '"rush"' },
      { name: 'qualityScore', type: 'number', required: false, description: 'QA verification percent score before closure.', sampleValue: '96.5' },
      { name: 'startDate', type: 'timestamp', required: true, description: 'Queue entry timestamp.', sampleValue: 'Timestamp' },
      { name: 'completedDate', type: 'timestamp', required: false, description: 'Execution termination timestamp.', sampleValue: 'Timestamp' },
      { name: 'notes', type: 'string', required: false, description: 'Custom bat specifications.', sampleValue: '"Must press to slightly softer bounce, profile standard handles."' }
    ],
    relationships: [
      { source: 'manufacturing_jobs.orderId', target: 'orders.id', type: '1:1', description: 'Core order requirements linked.' },
      { source: 'manufacturing_jobs.assignedTo', target: 'users.uid', type: '1:1', description: 'Identifies the tasking artisan.' }
    ],
    denormalizationStrategy: 'The core product SKU specifications are deeply duplicated on the job document to avoid forcing craftsmen to access product catalogs while offline.',
    queryOptimization: 'Composite index: `assignedTo` + `status` + `startDate DESC` powers the craftsman workload checklist on mobile screens.',
    typescriptInterface: `interface ManufacturingJob {
  id: string;
  orderId: string;
  assignedTo?: string; // craftsman UID
  status: 'queued' | 'wood-splicing' | 'shaping' | 'pressing' | 'binding' | 'finishing' | 'quality-check' | 'complete';
  priority: 'low' | 'medium' | 'high' | 'rush';
  qualityScore?: number; // QA inspection grade (0-100)
  startDate: Date;
  completedDate?: Date;
  notes?: string;
}`
  },
  {
    id: 'printing_jobs',
    title: 'Printing Jobs',
    description: 'Vector artwork approval, sublimation pipelines, design logos setup, and cured print runs for athletic gear.',
    icon: 'Printer',
    features: ['Sublimation Milestones', 'Logo Specs Included'],
    fields: [
      { name: 'id', type: 'string', required: true, description: 'Sublimation printing ticket serial SKU.', sampleValue: '"print_cr_0023"' },
      { name: 'orderId', type: 'string', required: true, description: 'Matched sales order contract index.', sampleValue: '"ORD-2026-9502"' },
      { name: 'printingType', type: 'string', required: true, description: 'Execution method utilized.', sampleValue: '"sublimation"' },
      { name: 'status', type: 'string', required: true, description: 'Print-run milestone step.', sampleValue: '"vector-proofing"' },
      { name: 'inkSpecs', type: 'map', required: false, description: 'PMS pantones and color codes requirements map.', sampleValue: '{"primary": "PMS-186C", "secondary": "PMS-Black"}' },
      { name: 'assignedTo', type: 'string', required: false, description: 'Sublimation printer technician UID.', sampleValue: '"print_tech_94"' },
      { name: 'itemsCount', type: 'int', required: true, description: 'Total shirts, pants register list elements size.', sampleValue: '48' },
      { name: 'completedDate', type: 'timestamp', required: false, description: 'Curing and final shipping complete timestamp.', sampleValue: 'Timestamp' }
    ],
    relationships: [
      { source: 'printing_jobs.orderId', target: 'orders.id', type: '1:1', description: 'Tied print orders dimensions.' }
    ],
    denormalizationStrategy: 'Contains denormalized customer team labels. Sub-items count distribution holds flat sizing matrix structures for fast printing grid rendering.',
    queryOptimization: 'Composite index: `status` + `printingType` scales printer queue scheduling panels dynamically.',
    typescriptInterface: `interface PrintingJob {
  id: string;
  orderId: string;
  printingType: 'sublimation' | 'embroidery' | 'screen-print' | 'vinyl-transfer';
  status: 'queued' | 'vector-proofing' | 'print-run' | 'curing' | 'quality-check' | 'complete';
  inkSpecs?: {
    pantoneCodes: string[];
    fabricBlend: string;
  };
  assignedTo?: string; // printer UID
  itemsCount: number;
  completedDate?: Date;
}`
  },
  {
    id: 'repair_jobs',
    title: 'Repair Jobs',
    description: 'Post-game refurbishments, re-wrapping handles, face polishing, crack binds, and toe guard replacements.',
    icon: 'Scissors',
    features: ['Service Pipeline', 'Quoting Engines'],
    fields: [
      { name: 'id', type: 'string', required: true, description: 'Direct service log ID.', sampleValue: '"rep_willow_0024"' },
      { name: 'customerId', type: 'string', required: true, description: 'Client athlete who owned item.', sampleValue: '"cust_cricket_aus"' },
      { name: 'itemDescription', type: 'string', required: true, description: 'Item specifics (e.g., Kookaburra Grade-2 Bat).', sampleValue: '"Kookaburra Ghost Pro (Damaged toe edge)"' },
      { name: 'repairType', type: 'string', required: true, description: 'Required restoration category.', sampleValue: '"toe-guard"' },
      { name: 'status', type: 'string', required: true, description: 'Refurbishment status milestone tracker.', sampleValue: '"in-repair"' },
      { name: 'priceQuote', type: 'number', required: true, description: 'Billed service quote fee.', sampleValue: '65.00' },
      { name: 'assignedTo', type: 'string', required: false, description: 'Craftsman uid executing restoration actions.', sampleValue: '"u1e90Xsa4a3"' },
      { name: 'completedAt', type: 'timestamp', required: false, description: 'Service resolution date.', sampleValue: 'Timestamp' }
    ],
    relationships: [
      { source: 'repair_jobs.customerId', target: 'customers.id', type: '1:N', description: 'Lookup client billing contact.' }
    ],
    denormalizationStrategy: 'The Repair item details are written dynamically inside unique textual logs, separating repairs from standard catalogue structure references cleanly.',
    queryOptimization: 'Index constraints on `customerId` with `status` enables push dashboard updates to clients regarding repair progression.',
    typescriptInterface: `interface RepairJob {
  id: string;
  customerId: string;
  itemDescription: string;
  repairType: 'scuff-clearing' | 'thread-wrap' | 'toe-guard' | 'handle-re-splice' | 'blade-bind';
  status: 'received' | 'assessing' | 'in-repair' | 'polishing' | 'ready';
  priceQuote: number;
  assignedTo?: string; // craftsman UID
  completedAt?: Date;
}`
  },
  {
    id: 'notifications',
    title: 'Notifications',
    description: 'System actions reporting low-inventory warning limits, job advances, invoice overdue, and general announcements.',
    icon: 'BellRing',
    features: ['Real-Time Pushed', 'Query Scoped'],
    fields: [
      { name: 'id', type: 'string', required: true, description: 'Serial Notification ID.', sampleValue: '"notif_mel_88421"' },
      { name: 'recipientId', type: 'string', required: true, description: 'Target user ID or "all_managers" for administrative broadcasts.', sampleValue: '"all_branch_managers"' },
      { name: 'category', type: 'string', required: true, description: 'Trigger categories.', sampleValue: '"inventory_alert"' },
      { name: 'title', type: 'string', required: true, description: 'Notification caption header.', sampleValue: '"Low Stock Alert: English Willow"' },
      { name: 'message', type: 'string', required: true, description: 'Rich message description details.', sampleValue: '"Melbourne warehouse inventory levels for Grade-1 special willow bats fell under minimum safety buffer (3 level)."' },
      { name: 'read', type: 'boolean', required: true, description: 'Read status metrics.', sampleValue: 'false' },
      { name: 'branchId', type: 'string', required: true, description: 'Physcial branch context identifier.', sampleValue: '"closet_melbourne"' },
      { name: 'actionUrl', type: 'string', required: false, description: 'Navigation path inside client dashboard.', sampleValue: '"/inventory?sku=BAT-EW-G1"' },
      { name: 'createdAt', type: 'timestamp', required: true, description: 'Event dispatch timestamp.', sampleValue: 'Timestamp' }
    ],
    relationships: [],
    denormalizationStrategy: 'Includes isolated flat metadata like `sku` and `branchId` to support quick page navigations without extra resource pulls.',
    queryOptimization: 'Strictly indexed by `recipientId` + `read` + `createdAt DESC` to facilitate immediate sync in mobile drawers.',
    typescriptInterface: `interface Notification {
  id: string;
  recipientId: string; // user UID or group indicator (e.g. 'all_branch_managers')
  category: 'inventory_alert' | 'job_advancement' | 'new_order' | 'payment_overdue';
  title: string;
  message: string;
  read: boolean;
  branchId: string;
  actionUrl?: string; // Routing jump point
  createdAt: Date;
}`
  },
  {
    id: 'analytics',
    title: 'Analytics',
    description: 'Macro performance indicators, daily sales logs, average fabrication durations, and job completed ratios.',
    icon: 'TrendingUp',
    features: ['Pre-Aggregated Snapshots', 'Zero Client DB Reads'],
    fields: [
      { name: 'id', type: 'string', required: true, description: 'Compound pre-aggregated target string: branchId_YYYYMMDD.', sampleValue: '"melbourne_20260525"' },
      { name: 'branchId', type: 'string', required: true, description: 'Physical branch index.', sampleValue: '"closet_melbourne"' },
      { name: 'date', type: 'string', required: true, description: 'Precompiled date index (YYYY-MM-DD).', sampleValue: '"2026-05-25"' },
      { name: 'totalSales', type: 'number', required: true, description: 'Summary branch revenue calculated globally.', sampleValue: '3580.50' },
      { name: 'activeJobsCount', type: 'int', required: true, description: 'Active items in fabrication pipeline.', sampleValue: '12' },
      { name: 'completedJobsCount', type: 'int', required: true, description: 'Successfully resolved jobs for period.', sampleValue: '6' },
      { name: 'leadTimeMs', type: 'number', required: true, description: 'Average millisecond duration to resolve order batches.', sampleValue: '1296000000' },
      { name: 'updatedAt', type: 'timestamp', required: true, description: 'Snapshot compilation timestamp.', sampleValue: 'Timestamp' }
    ],
    relationships: [],
    denormalizationStrategy: 'These analytics documents represent highly optimized, pre-calculated historical records compiled via serverless backend functions (such as Cloud Functions), preventing the client ERP from issuing expensive aggregate operations directly across live order collections.',
    queryOptimization: 'The document ID structure `branchId_date` yields single fetch O(1) performance for daily operational scoreboards.',
    typescriptInterface: `interface AnalyticalSummary {
  id: string; // branchId_date string
  branchId: string;
  date: string; // YYYY-MM-DD
  totalSales: number;
  activeJobsCount: number;
  completedJobsCount: number;
  leadTimeMs: number; // Avg Millis per resolved job cycle
  updatedAt: Date;
}`
  }
];

export interface IndexConfig {
  collection: string;
  fields: { name: string; mode: 'Ascending' | 'Descending' | 'Arrays' }[];
  queryPattern: string;
}

export const COMPOSITE_INDEXES: IndexConfig[] = [
  {
    collection: 'orders',
    fields: [
      { name: 'branchId', mode: 'Ascending' },
      { name: 'status', mode: 'Ascending' },
      { name: 'createdAt', mode: 'Descending' }
    ],
    queryPattern: 'Filter orders by branch & timeline status to prioritize manufacture sequences.'
  },
  {
    collection: 'manufacturing_jobs',
    fields: [
      { name: 'assignedTo', mode: 'Ascending' },
      { name: 'status', mode: 'Ascending' },
      { name: 'startDate', mode: 'Descending' }
    ],
    queryPattern: 'Fetch personal fabrication list for specified craftsman ordered by timeline urgency.'
  },
  {
    collection: 'printing_jobs',
    fields: [
      { name: 'assignedTo', mode: 'Ascending' },
      { name: 'status', mode: 'Ascending' }
    ],
    queryPattern: 'Select queued custom design sublimations aligned with printer technicians.'
  },
  {
    collection: 'inventory',
    fields: [
      { name: 'branchId', mode: 'Ascending' },
      { name: 'quantityInStock', mode: 'Ascending' }
    ],
    queryPattern: 'Facilitate low-inventory warnings checks and catalog replenishment metrics.'
  },
  {
    collection: 'invoices',
    fields: [
      { name: 'status', mode: 'Ascending' },
      { name: 'dueDate', mode: 'Ascending' }
    ],
    queryPattern: 'Identify overdue debtor balances for corporate account notifications.'
  },
  {
    collection: 'notifications',
    fields: [
      { name: 'recipientId', mode: 'Ascending' },
      { name: 'read', mode: 'Ascending' },
      { name: 'createdAt', mode: 'Descending' }
    ],
    queryPattern: 'Synchronize active notification items for authenticated technicians or branch staff.'
  }
];

export interface ThreatAuditCase {
  id: string;
  exploitName: string;
  vector: string;
  targetCollection: string;
  rulesMitigation: string;
  securityPillar: string;
  status: 'Protected' | 'Vulnerable';
}

export const THREAT_AUDITS: ThreatAuditCase[] = [
  {
    id: 'TA-01',
    exploitName: 'Privilege Self-Escalation',
    vector: 'Malicious client specifies roleId: "admin" during self-registration payload.',
    targetCollection: '/users/{userId}',
    rulesMitigation: 'create block strictly dictates that unless user is verified admin, incoming().roleId MUST match "customer" exclusively.',
    securityPillar: 'Pillar 3: Self-Assigned Roles Prevention Check',
    status: 'Protected'
  },
  {
    id: 'TA-02',
    exploitName: 'Ghost Field Schema Bypass',
    vector: 'Attempting to inject a custom "isPremium" or "isAdminOverride: true" flag into existing credentials.',
    targetCollection: '/users/{userId}',
    rulesMitigation: 'isValidUser schema validation blocks unexpected fields by checking strict key maps integrity constraints keys().size() == 8.',
    securityPillar: 'Pillar 2: Strict Keys & Partial Updates Enforcements',
    status: 'Protected'
  },
  {
    id: 'TA-03',
    exploitName: 'Temporal Tampering',
    vector: 'Client modifies system payload clock to forge creation timeline to back-date invoices.',
    targetCollection: '/orders/{orderId}',
    rulesMitigation: 'Rules mandate temporal matching against system authority: incoming().createdAt == request.time.',
    securityPillar: 'Pillar 13: Temporal Integrity Checks (request.time)',
    status: 'Protected'
  },
  {
    id: 'TA-04',
    exploitName: 'Fictitious Orphan Writes',
    vector: 'Creating sub-fabrication tasks referencing imaginary sales orders to corrupt material queues.',
    targetCollection: '/manufacturing_jobs/{jobId}',
    rulesMitigation: 'The creation rule locks access viaexists(/databases/$(database)/documents/orders/$(orderId)) relational matching validation.',
    securityPillar: 'Pillar 1: Relational Sync "Master Gate" Validation',
    status: 'Protected'
  },
  {
    id: 'TA-05',
    exploitName: 'PII Blanket Query Leak',
    vector: 'Unauthenticated user requests comprehensive customer list dump.',
    targetCollection: '/customers',
    rulesMitigation: 'allow list checks filter parameters dynamically on existing data resources, bounding lookups explicitly to staff references.',
    securityPillar: 'Pillar 8: Secure List Queries (No Client Delegation)',
    status: 'Protected'
  },
  {
    id: 'TA-06',
    exploitName: 'Path Poisoning Exploit',
    vector: 'Injecting directory traversal symbols or HTML snippet fragments into custom identifier targets (e.g. keying customer ID as script tags).',
    targetCollection: '/customers/{customerId}',
    rulesMitigation: 'isValidId() function filters target indicators to clean alphanumerics only, restricting lengths to safe size boundaries (<= 128 chars).',
    securityPillar: 'Pillar 3: Path Variable ID Poisoning Guard',
    status: 'Protected'
  }
];

export const RAW_SECURITY_RULES = `rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {

    // 1. Global Safety Net: Default Deny All
    match /{document=**} {
      allow read, write: if false;
    }

    // ==========================================
    // GLOBAL REUSABLE HELPER FUNCTIONS
    // ==========================================
    function isSignedIn() { return request.auth != null; }
    function incoming() { return request.resource.data; }
    function existing() { return resource.data; }
    function isValidId(id) { return id is string && id.size() <= 128 && id.matches('^[a-zA-Z0-9_\\\\-]+$'); }
    function isTimestamp(val) { return val is timestamp; }

    function getUserData() { return get(/databases/\$(database)/documents/users/\$(request.auth.uid)).data; }
    function getUserRole() { return getUserData().roleId; }

    function isAdmin() { return isSignedIn() && exists(/databases/\$(database)/documents/users/\$(request.auth.uid)) && getUserRole() == 'admin'; }
    function isBranchManager() { return isSignedIn() && exists(/databases/\$(database)/documents/users/\$(request.auth.uid)) && getUserRole() == 'branch_manager'; }
    function isStaff() { return isSignedIn() && exists(/databases/\$(database)/documents/users/\$(request.auth.uid)) && (getUserRole() in ['admin', 'branch_manager', 'staff']); }

    // --- USERS MATCH GRID ---
    match /users/{userId} {
      allow get: if isSignedIn();
      allow list: if isStaff();
      
      function isValidUser(data) {
        return data.keys().hasAll(['uid', 'name', 'email', 'roleId', 'branchId', 'status', 'createdAt', 'updatedAt'])
          && data.keys().size() == 8
          && data.uid == request.auth.uid
          && data.roleId is string
          && data.branchId is string
          && data.status in ['active', 'suspended', 'invited']
          && isTimestamp(data.createdAt) && isTimestamp(data.updatedAt);
      }

      allow create: if isSignedIn() && userId == request.auth.uid && isValidUser(incoming()) && incoming().createdAt == request.time && incoming().roleId == 'customer';
      allow update: if isSignedIn() && (userId == request.auth.uid || isAdmin()) && isValidUser(incoming()) && incoming().updatedAt == request.time && (userId == request.auth.uid && incoming().diff(existing()).affectedKeys().hasOnly(['name', 'email', 'updatedAt']) || isAdmin());
      allow delete: if isAdmin();
    }

    // --- ORDERS MATCH GRID ---
    match /orders/{orderId} {
      allow get: if isSignedIn();
      allow list: if isStaff() || (isSignedIn() && resource.data.customerId == request.auth.uid);

      function isValidOrder(data) {
        return data.keys().hasAll(['id', 'customerId', 'branchId', 'status', 'orderDate', 'paymentStatus', 'totalAmount', 'createdAt', 'updatedAt'])
          && data.status in ['draft', 'pending', 'manufacturing', 'printing', 'ready', 'delivered', 'canceled']
          && data.paymentStatus in ['unpaid', 'partially_paid', 'paid']
          && data.totalAmount is number && data.totalAmount >= 0;
      }

      allow create: if isSignedIn() && isValidId(orderId) && isValidOrder(incoming()) && incoming().createdAt == request.time && (incoming().customerId == request.auth.uid || isStaff());
      allow update: if isSignedIn() && isValidOrder(incoming()) && incoming().updatedAt == request.time && ((incoming().customerId == request.auth.uid && existing().status in ['draft', 'pending'] && incoming().diff(existing()).affectedKeys().hasOnly(['status', 'updatedAt']) && incoming().status == 'canceled') || isStaff());
      allow delete: if isAdmin();
    }

    // --- MANUFACTURING JOBS GRID ---
    match /manufacturing_jobs/{jobId} {
      allow read: if isSignedIn();

      function isValidMJob(data) {
        return data.keys().hasAll(['id', 'orderId', 'status', 'priority', 'startDate'])
          && data.status in ['queued', 'wood-splicing', 'shaping', 'pressing', 'binding', 'finishing', 'quality-check', 'complete']
          && isTimestamp(data.startDate);
      }

      allow create: if isStaff() && isValidId(jobId) && isValidMJob(incoming()) && exists(/databases/\$(database)/documents/orders/\$(incoming().orderId));
      allow update: if isStaff() && isValidMJob(incoming()) && ( (getUserRole() == 'craftsman' && incoming().diff(existing()).affectedKeys().hasOnly(['status', 'notes', 'qualityScore'])) || isBranchManager() || isAdmin() );
      allow delete: if isAdmin();
    }
  }
}`;
