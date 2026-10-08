import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  collection, 
  doc, 
  setDoc, 
  addDoc, 
  updateDoc, 
  onSnapshot, 
  query, 
  where, 
  orderBy, 
  limit, 
  Timestamp, 
  writeBatch 
} from 'firebase/firestore';
import { 
  ShoppingCart, Search, Plus, Minus, Trash2, QrCode, Printer, 
  Download, Database, AlertTriangle, CheckCircle2, UserPlus, 
  Receipt, CreditCard, FileText, Barcode, Wallet, Banknote, 
  Sparkles, PlusCircle, XCircle, ChevronRight, HelpCircle, ArrowRight,
  Calculator, ListFilter, ClipboardList, TrendingUp, DollarSign,
  Briefcase, Coffee, Wrench, ShieldCheck, UserCheck, RefreshCw, Layers
} from 'lucide-react';
import { db, isCloudConnected } from '../firebase';
import type { ProductItem } from './InventoryView';
import type { CRMCustomer } from './CRMView';
import { LoansAdvancesView } from './LoansAdvancesView';
import brandLogo from '../assets/images/talk_of_the_town_logo_1780894452079.png';

// Fallback seed products in case Firestore is empty
const SEED_POS_PRODUCTS = [
  {
    id: "prod-ton-pro",
    sku: "GLV-TON-PRO",
    barcode: "8901234500018",
    name: "SS TON PRO 1.0 Batting Gloves",
    brand: "TON",
    category: "protective",
    purchasePrice: 2200,
    sellingPrice: 5460,
    currentStock: 24,
    minimumStock: 8,
    supplier: "Sareen Sports Industries",
    productImage: "https://images.unsplash.com/photo-1544033527-b192daee1f5b?w=600&auto=format&fit=crop&q=80",
    description: "Syllable-pattern premium test grade glove.",
    status: "active",
    branchId: "Melbourne Closets",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: "prod-ss-sky",
    sku: "GLV-SS-SKY10",
    barcode: "8901234500025",
    name: "SS SKY 1.0 Custom Gloves",
    brand: "SS",
    category: "protective",
    purchasePrice: 2000,
    sellingPrice: 4820,
    currentStock: 12,
    minimumStock: 5,
    supplier: "Sunridge Sports",
    productImage: "https://images.unsplash.com/photo-1509198397868-475647b2a1e5?w=600&auto=format&fit=crop&q=80",
    description: "Vibrant custom Orange & Lime design.",
    status: "active",
    branchId: "Melbourne Closets",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: "prod-ton-silver",
    sku: "BAT-TON-SILV",
    barcode: "8901234500056",
    name: "Ton Silver Edition English Willow Bat",
    brand: "TON",
    category: "bats",
    purchasePrice: 8500,
    sellingPrice: 18000,
    currentStock: 15,
    minimumStock: 2,
    supplier: "Sareen Sports Industries",
    productImage: "https://images.unsplash.com/photo-1530541930197-ff16ac917b0e?w=600&auto=format&fit=crop&q=80",
    description: "Select Grade-A narrow grains willow bat.",
    status: "active",
    branchId: "Melbourne Closets",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: "prod-ss-gutsy",
    sku: "BAL-SS-GUTSY",
    barcode: "8901234500087",
    name: "Ball - SS Gutsy (Alum Tanned)",
    brand: "SS",
    category: "balls",
    purchasePrice: 160,
    sellingPrice: 410,
    currentStock: 100,
    minimumStock: 25,
    supplier: "Sareen Sports Industries",
    productImage: "https://images.unsplash.com/photo-1587280501635-68a0e82cd5ff?w=600&auto=format&fit=crop&q=80",
    description: "Premium grade alum-tanned match ball.",
    status: "active",
    branchId: "Melbourne Closets",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  }
];

const SEED_POS_CUSTOMERS = [
  { id: "CUST-001", name: "Manipur Cricket Academy (Imphal)", email: "contact@manipurcricketacademy.org.in", phone: "+91-385-2441011", branch: "Melbourne Closets" },
  { id: "CUST-002", name: "Imphal Eastern Youth Sports Club", email: "info@imphaleasternclub.com", phone: "+91-385-2442221", branch: "Melbourne Closets" },
  { id: "CUST-003", name: "Chungkham Singh (Refurb)", email: "chungkham@manipurathletics.org.in", phone: "+91-385-9988111", branch: "London Closets" }
];

interface CartItem {
  product: ProductItem;
  quantity: number;
  notes: string;
}

export interface LoanRepayment {
  id: string;
  amount: number;
  paymentMethod: 'cash' | 'card' | 'bank_transfer';
  repaymentDate: string;
  referenceCode: string;
  notes: string;
}

export interface LoanRecord {
  id: string;
  borrowerName: string;
  borrowerCategory: 'staff' | 'customer' | 'external';
  borrowerId?: string;
  amountDisbursed: number;
  interestRate: number;
  durationMonths: number;
  disbursalDate: string;
  status: 'active' | 'fully_paid' | 'defaulted';
  notes: string;
  repayments: LoanRepayment[];
}

const SEED_LOANS: LoanRecord[] = [
  {
    id: "LOAN-2026-001",
    borrowerName: "Chungkham Singh (Personnel - Coach)",
    borrowerCategory: "staff",
    borrowerId: "STAFF-001",
    amountDisbursed: 25000,
    interestRate: 0,
    durationMonths: 6,
    disbursalDate: "2026-04-10",
    status: "active",
    notes: "Salary advance for medical expenses. Repayments deducted monthly.",
    repayments: [
      { id: "RPAY-2026-001", amount: 4166.67, paymentMethod: "cash", repaymentDate: "2026-05-01", referenceCode: "CASH-REC-102", notes: "First month installment" },
      { id: "RPAY-2026-002", amount: 4166.67, paymentMethod: "cash", repaymentDate: "2026-06-01", referenceCode: "CASH-REC-128", notes: "Second month installment" }
    ]
  },
  {
    id: "LOAN-2026-002",
    borrowerName: "Manipur Cricket Academy (Imphal)",
    borrowerCategory: "customer",
    borrowerId: "CUST-001",
    amountDisbursed: 150000,
    interestRate: 4.5,
    durationMonths: 12,
    disbursalDate: "2026-01-15",
    status: "active",
    notes: "Equipment purchase seasonal loan. Interest rate calculated flat annually.",
    repayments: [
      { id: "RPAY-2026-003", amount: 50000, paymentMethod: "bank_transfer", repaymentDate: "2026-03-31", referenceCode: "HSBC-TXN-90212", notes: "Bulk advance return" }
    ]
  },
  {
    id: "LOAN-2026-003",
    borrowerName: "Sunridge Sports India",
    borrowerCategory: "external",
    amountDisbursed: 80000,
    interestRate: 0,
    durationMonths: 3,
    disbursalDate: "2026-05-01",
    status: "fully_paid",
    notes: "Reversible container customs deposit advance.",
    repayments: [
      { id: "RPAY-2026-004", amount: 80000, paymentMethod: "bank_transfer", repaymentDate: "2026-05-28", referenceCode: "SBI-REMIT-8431", notes: "Refund from customs cleared" }
    ]
  }
];

interface BillingPOSViewProps {
  branchScope: 'Melbourne Closets' | 'London Closets';
  profile: any;
}

export const BillingPOSView: React.FC<BillingPOSViewProps> = ({ branchScope, profile }) => {
  // Sync States
  const [products, setProducts] = useState<ProductItem[]>([]);
  const [customers, setCustomers] = useState<CRMCustomer[]>([]);
  const [recentTransactions, setRecentTransactions] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // --- LOANS & ADVANCES MANAGEMENT STATE ---
  const [billingSubTab, setBillingSubTab] = useState<'checkout' | 'loans'>('checkout');
  
  const [loans, setLoans] = useState<LoanRecord[]>(() => {
    const local = localStorage.getItem('cricket_closet_loans');
    if (local) {
      try {
        return JSON.parse(local);
      } catch {
        // ignore
      }
    }
    return SEED_LOANS;
  });

  useEffect(() => {
    localStorage.setItem('cricket_closet_loans', JSON.stringify(loans));
  }, [loans]);

  const [selectedLoanId, setSelectedLoanId] = useState<string | null>("LOAN-2026-001");
  const [loanSearch, setLoanSearch] = useState('');
  const [loanCategoryFilter, setLoanCategoryFilter] = useState<'all' | 'staff' | 'customer' | 'external' | 'fully_paid'>('all');

  // New Loan Form Dialog state
  const [isDisburseModalOpen, setIsDisburseModalOpen] = useState(false);
  const [newLoanName, setNewLoanName] = useState('');
  const [newLoanCategory, setNewLoanCategory] = useState<'staff' | 'customer' | 'external'>('staff');
  const [newLoanId, setNewLoanId] = useState('');
  const [newLoanAmount, setNewLoanAmount] = useState('');
  const [newLoanInterest, setNewLoanInterest] = useState('0');
  const [newLoanDuration, setNewLoanDuration] = useState('6');
  const [newLoanDate, setNewLoanDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [newLoanNotes, setNewLoanNotes] = useState('');

  // Repayment Form Dialog state
  const [isRepayModalOpen, setIsRepayModalOpen] = useState(false);
  const [repayAmount, setRepayAmount] = useState('');
  const [repayMethod, setRepayMethod] = useState<'cash' | 'card' | 'bank_transfer'>('cash');
  const [repayDate, setRepayDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [repayCode, setRepayCode] = useState('');
  const [repayNotes, setRepayNotes] = useState('');

  // Handle disbursing new loan
  const handleDisburseLoan = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newLoanName.trim()) {
      alert("Borrower name is required.");
      return;
    }
    const amount = parseFloat(newLoanAmount);
    if (isNaN(amount) || amount <= 0) {
      alert("Please enter a valid disbursement amount.");
      return;
    }
    const interest = parseFloat(newLoanInterest) || 0;
    const duration = parseInt(newLoanDuration) || 1;

    const newLoan: LoanRecord = {
      id: `LOAN-${Date.now().toString().slice(-6)}`,
      borrowerName: newLoanName,
      borrowerCategory: newLoanCategory,
      borrowerId: newLoanId.trim() || undefined,
      amountDisbursed: amount,
      interestRate: interest,
      durationMonths: duration,
      disbursalDate: newLoanDate,
      status: 'active',
      notes: newLoanNotes || 'No specific terms documented.',
      repayments: []
    };

    setLoans(prev => [newLoan, ...prev]);
    setSelectedLoanId(newLoan.id);
    
    // Reset Form
    setNewLoanName('');
    setNewLoanCategory('staff');
    setNewLoanId('');
    setNewLoanAmount('');
    setNewLoanInterest('0');
    setNewLoanDuration('6');
    setNewLoanNotes('');
    setIsDisburseModalOpen(false);

    // Create Audit Log
    if (isCloudConnected) {
      try {
        const auditId = `AUDIT-LN-${Date.now()}`;
        setDoc(doc(db, "audit_logs", auditId), {
          id: auditId,
          actionType: "CREATE",
          targetTable: "loans",
          targetId: newLoan.id,
          details: `Disbursed loan ledger of INR ${amount} to ${newLoanName} (${newLoanCategory.toUpperCase()})`,
          operator: profile?.name || "Terminal Accountant",
          timestamp: Timestamp.now()
        });
      } catch (err) {
        console.warn("Failed to write live Cloud SQL log:", err);
      }
    }
  };

  // Handle Recording repayments
  const handleRecordRepayment = (e: React.FormEvent) => {
    e.preventDefault();
    const activeLoan = loans.find(l => l.id === selectedLoanId);
    if (!activeLoan) return;

    const amount = parseFloat(repayAmount);
    if (isNaN(amount) || amount <= 0) {
      alert("Please enter a valid payment amount.");
      return;
    }

    const calcTotalExpected = activeLoan.amountDisbursed + (activeLoan.amountDisbursed * (activeLoan.interestRate / 100));
    const calcAlreadyPaid = activeLoan.repayments.reduce((acc, r) => acc + r.amount, 0);
    const calcPending = calcTotalExpected - calcAlreadyPaid;

    if (amount > calcPending + 0.1) {
      alert(`Payment amount INR ${amount} exceeds remaining outstanding balance of INR ${calcPending.toFixed(2)}`);
      return;
    }

    const repaymentItem: LoanRepayment = {
      id: `RPAY-${Date.now().toString().slice(-6)}`,
      amount: amount,
      paymentMethod: repayMethod,
      repaymentDate: repayDate,
      referenceCode: repayCode.trim() || `REF-${Math.floor(100000 + Math.random() * 900000)}`,
      notes: repayNotes || 'Standard installment repaid'
    };

    const updatedRepayments = [...activeLoan.repayments, repaymentItem];
    const nextPaidTotal = updatedRepayments.reduce((acc, r) => acc + r.amount, 0);
    const isFullyPaid = nextPaidTotal >= calcTotalExpected - 0.5;

    setLoans(prev => prev.map(l => {
      if (l.id === activeLoan.id) {
        return {
          ...l,
          status: isFullyPaid ? 'fully_paid' : l.status,
          repayments: updatedRepayments
        };
      }
      return l;
    }));

    // Reset Form
    setRepayAmount('');
    setRepayCode('');
    setRepayNotes('');
    setIsRepayModalOpen(false);

    // Log live audit
    if (isCloudConnected) {
      try {
        const auditId = `AUDIT-LN-RP-${Date.now()}`;
        setDoc(doc(db, "audit_logs", auditId), {
          id: auditId,
          actionType: "UPDATE",
          targetTable: "loans",
          targetId: activeLoan.id,
          details: `Recorded repayment receipt of INR ${amount} for loan ${activeLoan.id}. Outstanding: INR ${(calcPending - amount).toFixed(2)}`,
          operator: profile?.name || "Terminal Accountant",
          timestamp: Timestamp.now()
        });
      } catch (err) {
        console.warn("Failed to write live Cloud SQL log:", err);
      }
    }
  };

  // Search/Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [barcodeSearch, setBarcodeSearch] = useState('');

  // Cart Management
  const [cart, setCart] = useState<CartItem[]>([]);
  const [discountType, setDiscountType] = useState<'none' | 'flat' | 'percent'>('none');
  const [discountValue, setDiscountValue] = useState<number>(0);
  const [cartNotes, setCartNotes] = useState('');

  // Customer Linking
  const [linkedCustomer, setLinkedCustomer] = useState<CRMCustomer | null>(null);
  const [showCRMDropdown, setShowCRMDropdown] = useState(false);
  const [quickCustName, setQuickCustName] = useState('');
  const [quickCustPhone, setQuickCustPhone] = useState('');
  const [quickCustEmail, setQuickCustEmail] = useState('');
  const [quickRegisterOpen, setQuickRegisterOpen] = useState(false);

  // Payment configuration
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'card' | 'bank_transfer' | 'mixed'>('cash');
  const [amountPaidInput, setAmountPaidInput] = useState<string>('');
  const [partialPayment, setPartialPayment] = useState(false);
  
  // Mixed Payment parameters
  const [mixedCashAmount, setMixedCashAmount] = useState<number>(0);
  const [mixedCardAmount, setMixedCardAmount] = useState<number>(0);
  const [mixedBankAmount, setMixedBankAmount] = useState<number>(0);

  // Daily Cashbook Register
  const [startingFloat, setStartingFloat] = useState<number>(500);
  const [cashbookExpenses, setCashbookExpenses] = useState<any[]>([]);
  const [expenseAmount, setExpenseAmount] = useState<string>('');
  const [expenseCategory, setExpenseCategory] = useState<string>('tea_snacks');
  const [expenseNotes, setExpenseNotes] = useState<string>('');
  const [cashbookDrawerOpen, setCashbookDrawerOpen] = useState(false);

  // Dynamic UPI QR code modal
  const [showUPIDrawer, setShowUPIDrawer] = useState(false);
  const [upiPayload, setUpiPayload] = useState('');

  // Printing & Invoice Previews
  const [activeInvoice, setActiveInvoice] = useState<any | null>(null);
  const [showThermalReceipt, setShowThermalReceipt] = useState(false);
  const [showPDFInvoice, setShowPDFInvoice] = useState(false);

  // Ref for focus
  const barcodeInputRef = useRef<HTMLInputElement>(null);

  // 1. Snapshot Realtime Subscriptions
  useEffect(() => {
    setIsLoading(true);
    let unsubProducts = () => {};
    let unsubCustomers = () => {};
    let unsubTxns = () => {};

    if (isCloudConnected) {
      // Products Sync
      const prodQuery = query(collection(db, 'products'), where('status', '==', 'active'));
      unsubProducts = onSnapshot(prodQuery, (snapshot) => {
        const list: ProductItem[] = [];
        snapshot.forEach((doc) => {
          list.push({ id: doc.id, ...doc.data() } as ProductItem);
        });
        setProducts(list.length > 0 ? list : SEED_POS_PRODUCTS as any[]);
        setIsLoading(false);
      }, (error) => {
        console.error("POS products subscription error:", error);
        setProducts(SEED_POS_PRODUCTS as any[]);
        setIsLoading(false);
      });

      // Customers Sync
      const custQuery = query(collection(db, 'customers'));
      unsubCustomers = onSnapshot(custQuery, (snapshot) => {
        const list: CRMCustomer[] = [];
        snapshot.forEach((doc) => {
          list.push({ id: doc.id, ...doc.data() } as CRMCustomer);
        });
        setCustomers(list.length > 0 ? list : SEED_POS_CUSTOMERS as any[]);
      }, (err) => {
        setCustomers(SEED_POS_CUSTOMERS as any[]);
      });

      // Recent payment transactions log
      const txnsQuery = query(collection(db, 'transactions'), orderBy('date', 'desc'), limit(15));
      unsubTxns = onSnapshot(txnsQuery, (snapshot) => {
        const list: any[] = [];
        snapshot.forEach((doc) => {
          list.push({ id: doc.id, ...doc.data() });
        });
        setRecentTransactions(list);
      });
    } else {
      // Fallback Seed arrays in sandbox mode
      setProducts(SEED_POS_PRODUCTS as any[]);
      setCustomers(SEED_POS_CUSTOMERS as any[]);
      setRecentTransactions([
        { id: "TXN-AUTO-1001", amount: 4820, paymentMethod: "card", date: new Date().toLocaleTimeString(), type: "credit", status: "cleared" },
        { id: "TXN-AUTO-1002", amount: 10920, paymentMethod: "cash", date: new Date().toLocaleTimeString(), type: "credit", status: "cleared" }
      ]);
      setIsLoading(false);
    }

    return () => {
      unsubProducts();
      unsubCustomers();
      unsubTxns();
    };
  }, [branchScope]);

  // Handle barcode scanning auto detection
  const handleBarcodeSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!barcodeSearch.trim()) return;

    const matchedProduct = products.find(
      p => p.barcode === barcodeSearch.trim() || p.sku.toLowerCase() === barcodeSearch.trim().toLowerCase()
    );

    if (matchedProduct) {
      addToCart(matchedProduct);
      setBarcodeSearch('');
      // Visual pulse trigger on matched
      const element = document.getElementById(`prod-card-${matchedProduct.id}`);
      if (element) {
        element.classList.add('ring-4', 'ring-amber-500', 'scale-105');
        setTimeout(() => {
          element.classList.remove('ring-4', 'ring-amber-500', 'scale-105');
        }, 600);
      }
    } else {
      alert(`SKU/Barcode matches nothing: "${barcodeSearch}"`);
    }
  };

  // Add Item to active cart
  const addToCart = (product: ProductItem) => {
    setCart(prev => {
      const existing = prev.find(item => item.product.id === product.id);
      if (existing) {
        return prev.map(item => 
          item.product.id === product.id 
            ? { ...item, quantity: item.quantity + 1 }
            : item
        );
      }
      return [...prev, { product, quantity: 1, notes: '' }];
    });
  };

  const updateCartQty = (productId: string, delta: number) => {
    setCart(prev => prev.map(item => {
      if (item.product.id === productId) {
        const nextQty = item.quantity + delta;
        return nextQty > 0 ? { ...item, quantity: nextQty } : item;
      }
      return item;
    }).filter(item => item.quantity > 0));
  };

  const updateItemNotes = (productId: string, notes: string) => {
    setCart(prev => prev.map(item => 
      item.product.id === productId ? { ...item, notes } : item
    ));
  };

  const removeFromCart = (productId: string) => {
    setCart(prev => prev.filter(item => item.product.id !== productId));
  };

  const clearCart = () => {
    setCart([]);
    setDiscountType('none');
    setDiscountValue(0);
    setLinkedCustomer(null);
    setAmountPaidInput('');
    setCartNotes('');
  };

  // Calculate Subtotals & GST
  // SGST (9%), CGST (9%) calculated in tax components
  const cartSubtotal = cart.reduce((sum, item) => sum + (item.product.sellingPrice * item.quantity), 0);
  
  const getDiscountAmount = () => {
    if (discountType === 'flat') return discountValue;
    if (discountType === 'percent') return (cartSubtotal * discountValue) / 100;
    return 0;
  };
  
  const discountAmt = getDiscountAmount();
  const taxableAmount = Math.max(0, cartSubtotal - discountAmt);
  const cgst = parseFloat((taxableAmount * 0.09).toFixed(2));
  const sgst = parseFloat((taxableAmount * 0.09).toFixed(2));
  const cartTotal = parseFloat((taxableAmount + cgst + sgst).toFixed(2));

  // Payment calculation helpers
  const getAmountPaid = () => {
    if (paymentMethod === 'mixed') {
      return mixedCashAmount + mixedCardAmount + mixedBankAmount;
    }
    if (partialPayment && amountPaidInput) {
      return parseFloat(amountPaidInput) || 0;
    }
    return cartTotal;
  };

  const amountPaid = getAmountPaid();
  const balanceDue = Math.max(0, cartTotal - amountPaid);

  // Quick Register New Customer inline
  const handleQuickCustomerRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!quickCustName || !quickCustPhone) {
      alert("Name and Phone contact parameters cannot be empty.");
      return;
    }

    const newCustId = `CRM-${Date.now().toString().slice(-6)}`;
    const custData: CRMCustomer = {
      id: newCustId,
      name: quickCustName,
      phone: quickCustPhone,
      email: quickCustEmail || `${quickCustName.toLowerCase().replace(/\s+/g, '')}@cricket.erp`,
      address: "Quick POS Registration Desk",
      gstDetails: "Unregistered",
      type: "individual",
      notes: "Registered quickly on checkout lane",
      branch: branchScope,
      activeOrders: 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    try {
      if (isCloudConnected) {
        await setDoc(doc(db, "customers", newCustId), custData);
      }
      setCustomers(prev => [custData, ...prev]);
      setLinkedCustomer(custData);
      setQuickRegisterOpen(false);
      setQuickCustName('');
      setQuickCustPhone('');
      setQuickCustEmail('');
      alert(`Customer profile for ${custData.name} registered and linked successfully!`);
    } catch (err: any) {
      console.error(err);
      alert(`Failed to write customer document: ${err.message}`);
    }
  };

  // Generate UPI QR Pay link
  const triggerUPIPayload = () => {
    const amount = cartTotal;
    const payeeName = "Talk Of The Town ERP";
    const upiId = "talkofthetown@okaxis";
    const note = `INV-${Date.now().toString().slice(-4)}`;
    
    // Standard UPI pay intent URL specification
    const uri = `upi://pay?pa=${upiId}&pn=${encodeURIComponent(payeeName)}&am=${amount}&tn=${encodeURIComponent(note)}&cu=INR`;
    setUpiPayload(uri);
    setShowUPIDrawer(true);
  };

  // Checkout process - Writes relational Order, Invoice, and Transaction atomic documents to Firestore
  const handleCheckoutProcess = async () => {
    if (cart.length === 0) {
      alert("Cannot check out an empty POS bin.");
      return;
    }

    if (paymentMethod === 'mixed' && Math.abs(amountPaid - cartTotal) > 0.05 && !partialPayment) {
      alert(`Mixed payment counts do not match total sum. Total Paid: ₹${amountPaid.toFixed(2)} vs Cart Total: ₹${cartTotal.toFixed(2)}`);
      return;
    }

    setIsLoading(true);
    const orderId = `ORD-POS-${Math.floor(100000 + Math.random() * 900000)}`;
    const invoiceId = `INV-POS-${Math.floor(100000 + Math.random() * 900000)}`;
    const checkoutDate = new Date().toISOString();

    const orderDoc = {
      id: orderId,
      customerId: linkedCustomer?.id || "WALK_IN_CLIENT",
      customerName: linkedCustomer?.name || "Walk-in Retail Buyer",
      phone: linkedCustomer?.phone || "N/A",
      branchId: branchScope,
      status: "ready", // Completed instantly
      orderDate: Timestamp.now(),
      paymentStatus: balanceDue <= 0 ? "paid" : "partially_paid",
      totalAmount: cartTotal,
      orderItems: cart.map(item => ({
        id: item.product.id || `custom-${item.product.sku}`,
        name: item.product.name,
        price: item.product.sellingPrice,
        qty: item.quantity,
        category: item.product.category,
        notes: item.notes || ""
      })),
      notes: cartNotes || "POS Fast Checkout Lane Register",
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now()
    };

    const invoiceDoc = {
      id: invoiceId,
      orderId: orderId,
      invoiceNumber: `INV-2026-${Math.floor(1000 + Math.random() * 9000)}`,
      amountDue: cartTotal,
      amountPaid: amountPaid,
      dueDate: new Date().toISOString().split('T')[0],
      status: balanceDue <= 0 ? "paid" : "partially_paid",
      createdAt: Timestamp.now()
    };

    const txnId = `TXN-POS-${Date.now()}`;
    const transactionDoc = {
      id: txnId,
      invoiceId: invoiceId,
      orderId: orderId,
      branchId: branchScope,
      paymentMethod: paymentMethod === 'mixed' ? 'card' : paymentMethod,
      amount: amountPaid,
      type: "credit",
      status: "cleared",
      date: Timestamp.now(),
      notes: `POS Received Payment - ${paymentMethod.toUpperCase()} | Link to Customer: ${linkedCustomer?.name || 'Walk-in'}`
    };

    try {
      // 1. Post to live custom REST server backend to sync with live Azure SQL / Sandbox Memory
      const restOrderRes = await fetch('/api/orders', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          id: orderId,
          customerId: linkedCustomer?.id || "CUST-001",
          totalAmount: cartTotal,
          status: "ready", // POS sale is completed instantly
          notes: cartNotes || "POS Fast Checkout Lane Register",
          paymentStatus: balanceDue <= 0 ? "paid" : "partially_paid",
          promisedDate: new Date().toISOString().split('T')[0]
        })
      });

      if (!restOrderRes.ok) {
        console.warn("Failed to log order on REST backend server, proceeding with checkout.");
      }

      // Post each item to REST backend to trigger auto-deduction, transactions and audit logging
      for (let idx = 0; idx < cart.length; idx++) {
        const item = cart[idx];
        const restItemRes = await fetch('/api/orderitems', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            itemId: `ORI-${orderId}-${idx}`,
            orderId: orderId,
            sku: item.product.sku,
            quantity: item.quantity,
            unitPrice: item.product.sellingPrice
          })
        });

        if (!restItemRes.ok) {
          console.warn(`Failed to log order item for ${item.product.sku} on REST backend.`);
        }
      }

      if (isCloudConnected) {
        // Write multi-documents relationally matching firestore security constraints
        await setDoc(doc(db, "orders", orderId), orderDoc);
        await setDoc(doc(db, "invoices", invoiceId), invoiceDoc);
        await setDoc(doc(db, "transactions", txnId), transactionDoc);

        // Inventory Stock Deduction
        for (const item of cart) {
          if (item.product.id) {
            const productRef = doc(db, "products", item.product.id);
            const nextStock = Math.max(0, item.product.currentStock - item.quantity);
            await updateDoc(productRef, {
              currentStock: nextStock,
              updatedAt: new Date().toISOString()
            });

            // Log corresponding stock adjustment audit trail
            const logId = `LOG-${Date.now()}-${Math.floor(10 + Math.random()*90)}`;
            await setDoc(doc(db, "inventory_logs", logId), {
              id: logId,
              productId: item.product.id,
              productName: item.product.name,
              sku: item.product.sku,
              type: "decrease",
              amount: item.quantity,
              previousStock: item.product.currentStock,
              newStock: nextStock,
              reason: `POS Checkout sales - ${invoiceDoc.invoiceNumber}`,
              operator: profile?.name || "Lanes cashier",
              branchId: branchScope,
              timestamp: new Date().toISOString()
            });
          }
        }
      }

      // Local State Update
      const finalInvoiceObject = {
        invoiceNumber: invoiceDoc.invoiceNumber,
        orderId,
        checkoutDate,
        customerName: linkedCustomer?.name || "Walk-In Buyer",
        customerPhone: linkedCustomer?.phone || "N/A",
        cartItems: [...cart],
        subtotal: cartSubtotal,
        discount: discountAmt,
        taxable: taxableAmount,
        cgst,
        sgst,
        total: cartTotal,
        amountPaid,
        balanceDue,
        status: invoiceDoc.status,
        paymentDetails: paymentMethod === 'mixed' 
          ? `Mixed (Cash: ₹${mixedCashAmount}, Card: ₹${mixedCardAmount}, Bank: ₹${mixedBankAmount})`
          : paymentMethod.toUpperCase(),
        notes: cartNotes
      };

      setActiveInvoice(finalInvoiceObject);
      setShowThermalReceipt(true);
      clearCart();
      setIsLoading(false);

    } catch (err: any) {
      console.error("POS Atomic checkout failed:", err);
      alert(`Zero-Trust checkout transaction refused: ${err.message}`);
      setIsLoading(false);
    }
  };

  // Cashbook Expense post logic
  const handleLogExpense = async (e: React.FormEvent) => {
    e.preventDefault();
    const cost = parseFloat(expenseAmount);
    if (isNaN(cost) || cost <= 0) {
      alert("Please specify a valid expense debit quantity.");
      return;
    }

    const expenseTxnId = `EXP-${Date.now()}`;
    const expenseDoc = {
      id: expenseTxnId,
      branchId: branchScope,
      paymentMethod: "cash",
      amount: cost,
      type: "debit",
      status: "cleared",
      date: Timestamp.now(),
      notes: `Daily Cashbook: Category [${expenseCategory}] | Comments: ${expenseNotes || "No notes provided"}`
    };

    try {
      if (isCloudConnected) {
        await setDoc(doc(db, "transactions", expenseTxnId), expenseDoc);
      }
      setCashbookExpenses(prev => [{ ...expenseDoc, date: new Date().toLocaleTimeString() }, ...prev]);
      setExpenseAmount('');
      setExpenseNotes('');
      alert("Expense logged in cashbook register successfully!");
    } catch (err: any) {
      alert("Expense write failed: " + err.message);
    }
  };

  // Search filter matching
  const filteredProducts = products.filter(p => {
    const matchQuery = p.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                       p.sku.toLowerCase().includes(searchQuery.toLowerCase());
    const matchCategory = selectedCategory === 'all' || p.category === selectedCategory;
    return matchQuery && matchCategory;
  });

  return (
    <div className="bg-[#FAF9F5] text-neutral-900 p-6 rounded-3xl border border-[#e3dec9] shadow-md font-sans space-y-6">
      
      {/* 1. TOP DOCK LEDGER METRICS GRID */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-xl border border-[#e3dec9] flex items-center justify-between shadow-sm">
          <div className="space-y-1">
            <span className="text-[10px] uppercase tracking-widest text-[#848279] font-mono block">Lane Sales (Today)</span>
            <span className="text-xl font-bold font-mono text-neutral-950">
              ${recentTransactions.reduce((acc, t) => t.type === 'credit' ? acc + t.amount : acc, 0).toFixed(2)}
            </span>
          </div>
          <div className="p-3 bg-amber-50 rounded-lg text-amber-600 border border-amber-100">
            <TrendingUp className="w-5 h-5 text-[#E5B84B]" />
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-[#e3dec9] flex items-center justify-between shadow-sm">
          <div className="space-y-1">
            <span className="text-[10px] uppercase tracking-widest text-[#848279] font-mono block">Cashbook Float</span>
            <span className="text-xl font-bold font-mono text-[#E5B84B]">
              ${(startingFloat + recentTransactions.reduce((acc, t) => {
                if (t.paymentMethod === 'cash') {
                  return t.type === 'credit' ? acc + t.amount : acc - t.amount;
                }
                return acc;
              }, 0)).toFixed(2)}
            </span>
          </div>
          <button 
            onClick={() => setCashbookDrawerOpen(true)}
            className="p-3 bg-[#FAF9F5] rounded-lg text-neutral-600 border border-[#e3dec9] hover:bg-[#ebd498]/20 transition-all cursor-pointer"
          >
            <Wallet className="w-5 h-5 text-amber-700" />
          </button>
        </div>

        <div className="bg-white p-4 rounded-xl border border-[#e3dec9] flex items-center justify-between shadow-sm">
          <div className="space-y-1">
            <span className="text-[10px] uppercase tracking-widest text-[#848279] font-mono block">Outstanding Credit Accounts</span>
            <span className="text-xl font-bold font-mono text-red-600">
              ${recentTransactions.reduce((acc, t) => t.status === 'pending' ? acc + t.amount : acc, 350.00).toFixed(2)}
            </span>
          </div>
          <div className="p-3 bg-red-50 rounded-lg text-red-600 border border-red-100">
            <AlertTriangle className="w-5 h-5 text-red-500" />
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-[#e3dec9] flex items-center justify-between shadow-sm">
          <div className="space-y-1">
            <span className="text-[10px] uppercase tracking-widest text-[#848279] font-mono block">Active Cashier Channel</span>
            <span className="text-xs font-bold text-neutral-900 font-mono block truncate">{profile?.name || "Terminal 1 Cashier"}</span>
            <span className="text-[10px] text-green-700 font-mono block flex items-center gap-1">● Online Ready</span>
          </div>
          <div className="p-3 bg-emerald-50 rounded-lg border border-emerald-100">
            <ShieldCheck className="w-5 h-5 text-emerald-600" />
          </div>
        </div>
      </div>

      {/* Dynamic Bookkeeping Subtab navigation matches Cricket Closet specs */}
      <div className="flex border-b border-[#e3dec9] gap-6" id="bookkeeping-subtabs">
        <button
          onClick={() => setBillingSubTab('checkout')}
          className={`pb-3 px-1 flex items-center gap-2 border-b-2 text-xs font-mono font-bold uppercase transition-all duration-200 cursor-pointer ${
            billingSubTab === 'checkout' ? 'border-amber-500 text-neutral-950 font-black' : 'border-transparent text-neutral-400 hover:text-neutral-600'
          }`}
        >
          <ShoppingCart className="w-4 h-4 text-neutral-650" />
          <span>Point-of-Sale Checkout</span>
        </button>
        <button
          onClick={() => setBillingSubTab('loans')}
          className={`pb-3 px-1 flex items-center gap-2 border-b-2 text-xs font-mono font-bold uppercase transition-all duration-200 cursor-pointer ${
            billingSubTab === 'loans' ? 'border-amber-500 text-neutral-950 font-black' : 'border-transparent text-neutral-400 hover:text-neutral-600'
          }`}
        >
          <Wallet className="w-4 h-4 text-neutral-650" />
          <span>Loans & Advances Ledger</span>
          <span className="px-1.5 py-0.5 rounded-full text-[9px] bg-red-50 text-red-700 border border-red-100 font-bold font-mono">
            {loans.filter(l => l.status === 'active').length} Active
          </span>
        </button>
      </div>

      {billingSubTab === 'checkout' && (
        <>
          {/* 2. BARCODE PRE-INPUT TRIGGER & CORE WORKFLOW GRID */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* LEFT COLUMN: PRODUCT PICKER & CATALOG GRIDS (SPAN 7) */}
        <div className="lg:col-span-7 space-y-4">
          
          {/* SEARCH, CATEGORIES, BARCODE SCANNING BAR */}
          <div className="bg-white p-4 rounded-2xl border border-[#e3dec9] shadow-sm space-y-3">
            <div className="flex flex-col md:flex-row gap-3">
              <form onSubmit={handleBarcodeSubmit} className="flex-1 relative">
                <Barcode className="absolute left-3 top-2.5 w-5 h-5 text-[#848279]" />
                <input 
                  ref={barcodeInputRef}
                  type="text" 
                  placeholder="Flash Barcode / Enter SKU..." 
                  value={barcodeSearch}
                  onChange={(e) => setBarcodeSearch(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 text-xs rounded-xl border border-[#e3dec9] focus:outline-none focus:ring-2 focus:ring-[#E5B84B] font-mono bg-[#FAF9F5]"
                />
                <button type="submit" className="hidden" />
              </form>

              <div className="relative md:w-64">
                <Search className="absolute left-3 top-2.5 w-4 h-4 text-[#848279]" />
                <input 
                  type="text" 
                  placeholder="Key search name/SKU..." 
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 text-xs rounded-xl border border-[#e3dec9] focus:outline-none focus:ring-2 focus:ring-[#E5B84B] bg-[#FAF9F5]"
                />
              </div>
            </div>

            {/* Quick Categories filter buttons scroll */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-thin">
              {['all', 'protective', 'bats', 'balls', 'apparel', 'bags', 'signage'].map((cat) => (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  className={`text-[10px] font-bold font-sans uppercase px-3 py-1.5 rounded-lg border transition-all shrink-0 cursor-pointer ${
                    selectedCategory === cat 
                      ? 'bg-neutral-900 border-transparent text-[#E5B84B] font-black'
                      : 'bg-[#FAF9F5] border-[#e3dec9] text-[#848279] hover:bg-neutral-100'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>

          {/* PRODUCTS RETAIL GRID */}
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4 max-h-[460px] overflow-y-auto pr-1">
            {isLoading ? (
              <div className="col-span-full py-12 flex flex-col items-center justify-center gap-3">
                <RefreshCw className="w-8 h-8 text-[#E5B84B] animate-spin" />
                <span className="text-xs font-mono text-[#848279]">Loading dynamic catalogue stock levels...</span>
              </div>
            ) : filteredProducts.length === 0 ? (
              <div className="col-span-full bg-white p-12 rounded-2xl border border-dashed border-[#e3dec9] text-center space-y-2">
                <AlertTriangle className="w-8 h-8 text-amber-500 mx-auto" />
                <h5 className="text-xs font-bold font-mono">No items align with search query</h5>
                <p className="text-[10px] text-[#848279]">Add new listings via System Inventory to populate database records.</p>
              </div>
            ) : (
              filteredProducts.map((p) => {
                const lowStock = p.currentStock <= p.minimumStock;
                const isOutOfStock = p.currentStock === 0;
                return (
                  <motion.div
                    key={p.id}
                    id={`prod-card-${p.id}`}
                    whileHover={{ scale: isOutOfStock ? 1 : 1.02 }}
                    whileTap={{ scale: isOutOfStock ? 1 : 0.98 }}
                    onClick={() => !isOutOfStock && addToCart(p)}
                    className={`bg-white border p-3 rounded-2xl flex flex-col justify-between shadow-sm h-[200px] cursor-pointer transition-shadow hover:shadow-md ${
                      isOutOfStock ? 'opacity-50 border-[#e3dec9]' : lowStock ? 'border-amber-400' : 'border-[#e3dec9]'
                    }`}
                  >
                    <div className="space-y-1.5 relative">
                      {isOutOfStock ? (
                        <span className="absolute top-1 right-1 bg-neutral-950 text-white text-[8px] font-black uppercase px-1.5 rounded">SOLD OUT</span>
                      ) : lowStock ? (
                        <span className="absolute top-1 right-1 bg-amber-500 text-neutral-950 text-[8px] font-black uppercase px-1.5 rounded">LOW STATUS</span>
                      ) : null}

                      <div className="w-full h-24 rounded-lg bg-neutral-50 overflow-hidden border border-neutral-100 flex items-center justify-center">
                        <img 
                          src={p.productImage || 'https://images.unsplash.com/photo-1544033527-b192daee1f5b?w=200'} 
                          alt={p.name} 
                          className="object-cover w-full h-full"
                          referrerPolicy="no-referrer"
                        />
                      </div>
                      <span className="text-[9px] font-mono px-1.5 py-0.5 bg-neutral-100 rounded text-neutral-600 block self-start max-w-fit">{p.brand}</span>
                      <h4 className="text-xs font-bold text-neutral-900 truncate leading-snug">{p.name}</h4>
                    </div>

                    <div className="flex items-center justify-between mt-2 pt-1 border-t border-neutral-100 pr-1">
                      <span className="text-xs font-mono font-bold text-amber-700 font-extrabold">₹{p.sellingPrice.toFixed(2)}</span>
                      <span className={`text-[10px] font-mono shrink-0 font-bold ${isOutOfStock ? 'text-red-600' : lowStock ? 'text-amber-600' : 'text-neutral-500'}`}>
                        {p.currentStock} left
                      </span>
                    </div>
                  </motion.div>
                );
              })
            )}
          </div>

          {/* CRM DIRECTORY LINK / NEW CUSTOMER MODULE */}
          <div className="bg-white p-4 rounded-2xl border border-[#e3dec9] shadow-sm relative">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <UserCheck className="w-4 h-4 text-[#E5B84B]" />
                <h5 className="text-xs font-bold font-sans text-neutral-900">CRM Link Customer Profile</h5>
              </div>
              <button 
                onClick={() => setQuickRegisterOpen(!quickRegisterOpen)}
                className="bg-[#FAF9F5] border border-[#e3dec9] hover:bg-[#E5B84B] hover:text-neutral-950 px-2 py-1 rounded text-[10px] font-bold font-mono uppercase transition-all"
              >
                {quickRegisterOpen ? "Cancel Registration" : "Create New Customer"}
              </button>
            </div>

            {quickRegisterOpen ? (
              <form onSubmit={handleQuickCustomerRegister} className="space-y-3 pt-2 border-t border-neutral-100">
                <span className="text-[9px] font-bold block text-amber-600 uppercase tracking-widest font-mono">Fast Queue Lane Registry</span>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                  <input 
                    type="text" 
                    placeholder="Full Customer Name" 
                    value={quickCustName}
                    onChange={(e) => setQuickCustName(e.target.value)}
                    required
                    className="p-1.5 text-xs rounded-xl border border-[#e3dec9]"
                  />
                  <input 
                    type="tel" 
                    placeholder="Contacts Phone Number"
                    value={quickCustPhone} 
                    onChange={(e) => setQuickCustPhone(e.target.value)}
                    required
                    className="p-1.5 text-xs rounded-xl border border-[#e3dec9]"
                  />
                  <input 
                    type="email" 
                    placeholder="Email Address (Optional)" 
                    value={quickCustEmail}
                    onChange={(e) => setQuickCustEmail(e.target.value)}
                    className="p-1.5 text-xs rounded-xl border border-[#e3dec9]"
                  />
                </div>
                <button 
                  type="submit" 
                  className="w-full bg-[#E5B84B] text-neutral-950 active:scale-95 py-2 rounded-xl text-xs font-bold tracking-widest uppercase hover:bg-amber-400 font-mono transition-all pr-1 cursor-pointer"
                >
                  Confirm CRM Doc Writing
                </button>
              </form>
            ) : (
              <div className="space-y-2">
                <div className="relative">
                  <button 
                    type="button"
                    onClick={() => setShowCRMDropdown(!showCRMDropdown)}
                    className="w-full text-left bg-[#FAF9F5] border border-[#e3dec9] p-2.5 rounded-xl text-xs flex justify-between items-center"
                  >
                    {linkedCustomer ? (
                      <span className="font-mono text-amber-700 font-bold">🎯 {linkedCustomer.name} - {linkedCustomer.phone}</span>
                    ) : (
                      <span className="text-neutral-400">Search / Associate Walk-in customer to CRM database...</span>
                    )}
                    <ChevronRight className={`w-4 h-4 transition-transform ${showCRMDropdown ? 'rotate-90' : ''}`} />
                  </button>

                  <AnimatePresence>
                    {showCRMDropdown && (
                      <motion.div 
                        initial={{ opacity: 0, y: -5 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -5 }}
                        className="absolute bottom-12 left-0 right-0 max-h-40 overflow-y-auto bg-white border border-[#e3dec9] rounded-xl shadow-lg z-20 p-1"
                      >
                        <button
                          type="button"
                          onClick={() => {
                            setLinkedCustomer(null);
                            setShowCRMDropdown(false);
                          }}
                          className="w-full text-left p-2 hover:bg-neutral-50 text-[11px] font-mono text-red-650 font-bold border-b border-neutral-100"
                        >
                          ❌ Clear / Set to Walk-in Client
                        </button>
                        {customers.map(c => (
                          <button
                            key={c.id}
                            type="button"
                            onClick={() => {
                              setLinkedCustomer(c);
                              setShowCRMDropdown(false);
                            }}
                            className="w-full text-left p-2 hover:bg-[#FAF9F5] text-xs font-sans flex flex-col border-b border-neutral-50"
                          >
                            <span className="font-bold text-neutral-800">{c.name}</span>
                            <span className="text-[10px] text-neutral-500 font-mono">{c.phone} | {c.email}</span>
                          </button>
                        ))}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </div>
            )}
          </div>

        </div>

        {/* RIGHT COLUMN: CASHIER CART & CHECKOUT CONTROLLER (SPAN 5) */}
        <div className="lg:col-span-5 space-y-4">
          
          {/* CART SUMMARY HOLDER */}
          <div className="bg-white p-5 rounded-2xl border border-[#e3dec9] shadow-sm flex flex-col justify-between min-h-[420px]">
            <div className="space-y-4">
              <div className="flex items-center justify-between border-b border-neutral-100 pb-3">
                <div className="flex items-center gap-1.5">
                  <ShoppingCart className="w-5 h-5 text-[#E5B84B]" />
                  <h4 className="text-xs font-bold font-sans uppercase text-neutral-950">Active Cart Checklist</h4>
                </div>
                <span className="text-[10px] font-mono px-2 py-0.5 bg-neutral-100 rounded-full font-black">
                  {cart.reduce((sum, i) => sum + i.quantity, 0)} units
                </span>
              </div>

              {/* LIST OF CART ITEMS */}
              <div className="space-y-3.5 max-h-[220px] overflow-y-auto pr-1">
                {cart.length === 0 ? (
                  <div className="text-center py-12 space-y-2">
                    <Barcode className="w-10 h-10 text-neutral-350 mx-auto animate-pulse" />
                    <span className="text-[11px] font-mono text-neutral-400 block uppercase">Cart is empty</span>
                    <p className="text-[10px] text-[#848279]">Flash products above or type keywords to begin fast checkout.</p>
                  </div>
                ) : (
                  cart.map((item) => (
                    <div key={item.product.id} className="flex gap-2.5 bg-[#FAF9F5] p-3 rounded-xl border border-[#e3dec9] relative">
                      <div className="w-10 h-10 bg-white border border-neutral-200 rounded overflow-hidden shrink-0 flex items-center justify-center">
                        <img 
                          src={item.product.productImage} 
                          alt={item.product.name} 
                          className="object-cover w-full h-full"
                          referrerPolicy="no-referrer"
                        />
                      </div>

                      <div className="flex-1 min-w-0 space-y-1">
                        <div className="flex items-start justify-between gap-1">
                          <h5 className="text-xs font-bold text-neutral-900 truncate">{item.product.name}</h5>
                          <button 
                            onClick={() => removeFromCart(item.product.id!)}
                            className="text-neutral-400 hover:text-red-500 cursor-pointer"
                          >
                            <XCircle className="w-4 h-4" />
                          </button>
                        </div>
                        <span className="text-[10px] font-mono text-[#848279] block">SKU: {item.product.sku}</span>
                        
                        {/* Inline Product Notes comment */}
                        <input 
                          type="text" 
                          placeholder="Add detail notes (sizes, grip, etc)..." 
                          value={item.notes}
                          onChange={(e) => updateItemNotes(item.product.id!, e.target.value)}
                          className="w-full text-[9px] bg-white border border-neutral-200 rounded p-1"
                        />

                        {/* Adjust quantities */}
                        <div className="flex items-center justify-between pt-1">
                          <span className="text-xs font-mono font-bold text-neutral-700">₹{(item.product.sellingPrice * item.quantity).toFixed(2)}</span>
                          <div className="flex items-center gap-2 bg-white border border-neutral-200 rounded px-1.5 py-0.5">
                            <button onClick={() => updateCartQty(item.product.id!, -1)} className="text-[#848279] hover:text-neutral-950">
                              <Minus className="w-3.5 h-3.5" />
                            </button>
                            <span className="text-xs font-mono font-bold w-4 text-center select-none">{item.quantity}</span>
                            <button onClick={() => updateCartQty(item.product.id!, 1)} className="text-[#848279] hover:text-[#E5B84B]">
                              <Plus className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>

              {/* DISCOUNTS & NOTES COLLAPSE PANEL */}
              {cart.length > 0 && (
                <div className="bg-[#FAF9F5] p-3 rounded-xl border border-[#e3dec9] space-y-2">
                  <div className="flex items-center justify-between text-[11px] font-mono text-[#848279]">
                    <span>MODIFIERS / SCHEMES</span>
                    <button 
                      onClick={() => clearCart()}
                      className="text-red-650 hover:underline font-bold font-mono text-[9px] uppercase"
                    >
                      Empty Cart List
                    </button>
                  </div>

                  <div className="grid grid-cols-3 gap-1">
                    <button 
                      onClick={() => { setDiscountType('none'); setDiscountValue(0); }}
                      className={`py-1 text-[9px] font-bold rounded cursor-pointer ${discountType === 'none' ? 'bg-neutral-950 text-white font-mono' : 'bg-white border text-neutral-600'}`}
                    >
                      No Disc
                    </button>
                    <button 
                      onClick={() => { setDiscountType('flat'); setDiscountValue(500); }}
                      className={`py-1 text-[9px] font-bold rounded cursor-pointer ${discountType === 'flat' ? 'bg-neutral-950 text-white font-mono' : 'bg-white border text-neutral-600'}`}
                    >
                      Flat ₹500
                    </button>
                    <button 
                      onClick={() => { setDiscountType('percent'); setDiscountValue(10); }}
                      className={`py-1 text-[9px] font-bold rounded cursor-pointer ${discountType === 'percent' ? 'bg-neutral-950 text-white font-mono' : 'bg-white border text-neutral-600'}`}
                    >
                      10% Off
                    </button>
                  </div>

                  <div className="flex gap-1">
                    <input 
                      type="text" 
                      placeholder="Custom Transaction comments / invoice prints..."
                      value={cartNotes}
                      onChange={(e) => setCartNotes(e.target.value)}
                      className="w-full text-[10px] p-1.5 rounded border border-neutral-200 bg-white"
                    />
                  </div>
                </div>
              )}

            </div>

            {/* BILL CALCULATOR PANEL */}
            {cart.length > 0 && (
              <div className="border-t border-neutral-100 pt-3 mt-4 space-y-2.5">
                <div className="space-y-1 text-xs font-mono">
                  <div className="flex justify-between text-neutral-500">
                    <span>Retail Subtotal</span>
                    <span>₹{cartSubtotal.toFixed(2)}</span>
                  </div>
                  {discountType !== 'none' && (
                    <div className="flex justify-between text-emerald-600 font-bold">
                      <span>Discount deduction ({discountType.toUpperCase()})</span>
                      <span>-₹{discountAmt.toFixed(2)}</span>
                    </div>
                  )}
                  <div className="flex justify-between text-neutral-400 text-[10px]">
                    <span>CGST (9.0%)</span>
                    <span>+₹{cgst.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-neutral-400 text-[10px]">
                    <span>SGST (9.0%)</span>
                    <span>+₹{sgst.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-neutral-950 text-sm font-black border-t border-dashed border-neutral-200 pt-1.5 font-mono">
                    <span>Total Tax Inc</span>
                    <span className="text-amber-700 font-extrabold">₹{cartTotal.toFixed(2)}</span>
                  </div>
                </div>

                {/* DOUBLE-ENTRY PAYMENT CONFIG SECTION */}
                <div className="bg-neutral-50 p-3 rounded-xl border border-neutral-200 space-y-3">
                  <span className="text-[9px] font-mono block text-[#848279] uppercase tracking-wider font-bold">Billing Payment Mode & Allocation</span>
                  
                  <div className="grid grid-cols-4 gap-1.5">
                    {['cash', 'card', 'bank_transfer', 'mixed'].map(method => (
                      <button
                        key={method}
                        type="button"
                        onClick={() => {
                          setPaymentMethod(method as any);
                          if (method !== 'mixed') {
                            setMixedCashAmount(0);
                            setMixedCardAmount(0);
                            setMixedBankAmount(0);
                          }
                        }}
                        className={`text-[9px] py-1.5 rounded-lg border font-mono font-bold select-none cursor-pointer hover:bg-neutral-100 ${paymentMethod === method ? 'bg-[#E5B84B] border-transparent font-black text-neutral-950' : 'bg-white border-neutral-200 text-neutral-600'}`}
                      >
                        {method === 'bank_transfer' ? 'Transfer' : method.toUpperCase()}
                      </button>
                    ))}
                  </div>

                  {/* Split / Mixed payment specifications */}
                  {paymentMethod === 'mixed' && (
                    <div className="space-y-1 p-2 bg-white border rounded-lg text-[10px] font-mono grid grid-cols-3 gap-1">
                      <div>
                        <span>Cash Amount</span>
                        <input 
                          type="number" 
                          placeholder="0.00"
                          value={mixedCashAmount || ''} 
                          onChange={(e) => setMixedCashAmount(parseFloat(e.target.value) || 0)}
                          className="w-full text-xs p-1 mt-0.5 border rounded"
                        />
                      </div>
                      <div>
                        <span>Card Amount</span>
                        <input 
                          type="number" 
                          placeholder="0.00"
                          value={mixedCardAmount || ''} 
                          onChange={(e) => setMixedCardAmount(parseFloat(e.target.value) || 0)}
                          className="w-full text-xs p-1 mt-0.5 border rounded"
                        />
                      </div>
                      <div>
                        <span>Bank Amount</span>
                        <input 
                          type="number" 
                          placeholder="0.00"
                          value={mixedBankAmount || ''} 
                          onChange={(e) => setMixedBankAmount(parseFloat(e.target.value) || 0)}
                          className="w-full text-xs p-1 mt-0.5 border rounded"
                        />
                      </div>
                      <div className="col-span-3 text-[9px] text-right text-[#848279] mt-1 pt-1 border-t">
                        Sum allocated: <strong className="text-amber-700">₹{amountPaid.toFixed(2)}</strong> / total ₹{cartTotal.toFixed(2)}
                      </div>
                    </div>
                  )}

                  {/* Partial Payment toggler */}
                  <div className="flex items-center justify-between text-[11px] font-mono text-neutral-600 border-t pt-2">
                    <label className="flex items-center gap-1.5 cursor-pointer">
                      <input 
                        type="checkbox" 
                        checked={partialPayment}
                        onChange={(e) => {
                          setPartialPayment(e.target.checked);
                          if (!e.target.checked) setAmountPaidInput('');
                        }}
                        className="rounded border-neutral-300Accent"
                      />
                      <span>Enable Partial Balance / Credit</span>
                    </label>

                    {partialPayment && (
                      <div className="flex items-center gap-1 font-mono">
                        <span>Paid:</span>
                        <input 
                          type="number" 
                          value={amountPaidInput}
                          onChange={(e) => setAmountPaidInput(e.target.value)}
                          placeholder={cartTotal.toString()}
                          className="w-20 p-1 rounded border text-xs"
                        />
                      </div>
                    )}
                  </div>

                  {partialPayment && balanceDue > 0 && (
                    <div className="text-[9.5px] font-mono text-red-600 text-right">
                      Will write outstanding balance: <strong>₹{balanceDue.toFixed(2)}</strong> to CRM invoice
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-2 pt-2 border-t border-neutral-100">
                  <button
                    type="button"
                    onClick={triggerUPIPayload}
                    className="bg-neutral-900 text-white font-mono hover:bg-neutral-800 text-xs py-2 rounded-xl border border-neutral-700 font-bold uppercase transition-all flex items-center justify-center gap-1"
                  >
                    <QrCode className="w-4 h-4 text-[#E5B84B]" />
                    <span>Generate UPI link</span>
                  </button>

                  <button
                    type="button"
                    disabled={isLoading}
                    onClick={handleCheckoutProcess}
                    className="bg-[#E5B84B] hover:bg-amber-400 active:scale-95 text-neutral-950 font-sans text-xs py-2 rounded-xl font-bold uppercase tracking-wider transition-all flex items-center justify-center gap-1 cursor-pointer"
                  >
                    {isLoading ? (
                      <RefreshCw className="w-4 h-4 animate-spin text-neutral-950" />
                    ) : (
                      <ShieldCheck className="w-4 h-4 text-neutral-950 stroke-[2.5]" />
                    )}
                    <span>Secure Checkout</span>
                  </button>
                </div>
              </div>
            )}
          </div>

        </div>

      </div>
        </>
      )}

      {billingSubTab === 'loans' && (
        <LoansAdvancesView 
          branchScope={branchScope} 
          profile={profile} 
          customers={customers} 
          loans={loans}
          setLoans={setLoans}
        />
      )}

      {/* 3. CASHBOOK FLOATS DRAWER MODULE */}
      <AnimatePresence>
        {cashbookDrawerOpen && (
          <div className="fixed inset-0 bg-neutral-950/40 backdrop-blur-sm flex items-center justify-center z-50">
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white p-6 rounded-3xl border border-[#e3dec9] w-full max-w-lg shadow-2xl space-y-4 text-neutral-900"
            >
              <div className="flex items-center justify-between border-b pb-3">
                <div className="flex items-center gap-2">
                  <Banknote className="w-5 h-5 text-amber-700" />
                  <h4 className="text-sm font-bold font-mono text-neutral-950 uppercase tracking-widest">Daily Cashbook & Safe Float</h4>
                </div>
                <button onClick={() => setCashbookDrawerOpen(false)} className="text-neutral-400 hover:text-neutral-600">
                  <XCircle className="w-5 h-5" />
                </button>
              </div>

              <div className="bg-[#FAF9F5] p-3 rounded-xl border border-[#e3dec9] text-xs font-mono space-y-1.5">
                <div className="flex justify-between">
                  <span>Register Opening Float</span>
                  <span className="font-bold">₹{startingFloat.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-green-700">
                  <span>Total Cash Collected (Sales)</span>
                  <span className="font-bold">
                    +₹{recentTransactions.reduce((acc, t) => t.paymentMethod === 'cash' && t.type === 'credit' ? acc + t.amount : acc, 0).toFixed(2)}
                  </span>
                </div>
                <div className="flex justify-between text-red-600">
                  <span>Logged Expense Debits</span>
                  <span className="font-bold">
                    -₹{(cashbookExpenses.reduce((acc, t) => acc + t.amount, 0) + recentTransactions.reduce((acc, t) => t.paymentMethod === 'cash' && t.type === 'debit' ? acc + t.amount : acc, 0)).toFixed(2)}
                  </span>
                </div>
                <div className="flex justify-between border-t border-dashed border-neutral-350 pt-1.5 text-sm font-black text-neutral-950">
                  <span>System Safe Reserve Balance</span>
                  <span className="text-amber-700 font-extrabold">
                    +₹{(startingFloat + recentTransactions.reduce((acc, t) => {
                      if (t.paymentMethod === 'cash') {
                        return t.type === 'credit' ? acc + t.amount : acc - t.amount;
                      }
                      return acc;
                    }, 0)).toFixed(2)}
                  </span>
                </div>
              </div>

              {/* Log Expense Form */}
              <form onSubmit={handleLogExpense} className="space-y-3 pt-2">
                <span className="text-[10px] font-mono text-[#848279] uppercase block font-bold border-b pb-1">Register Operational Expense Doc</span>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-[10px] text-[#848279] font-mono">Amount Debit (₹)</label>
                    <input 
                      type="number" 
                      required
                      placeholder="e.g. 150.00"
                      value={expenseAmount}
                      onChange={(e) => setExpenseAmount(e.target.value)}
                      className="w-full text-xs p-1.5 border rounded-xl"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-[#848279] font-mono">Debit Category</label>
                    <select 
                      value={expenseCategory}
                      onChange={(e) => setExpenseCategory(e.target.value)}
                      className="w-full text-xs p-1.5 border rounded-xl"
                    >
                      <option value="tea_snacks">🍿 Staff Tea & Snacks</option>
                      <option value="freight">🚚 Urgent Courier & Freight</option>
                      <option value="raw_materials">🪵 Emergency Handle Spares</option>
                      <option value="utilities">💡 Internet/Stationeries/Power</option>
                    </select>
                  </div>
                </div>
                <div>
                  <label className="text-[10px] text-[#848279] font-mono">Expense Reference notes</label>
                  <input 
                    type="text" 
                    placeholder="Courier split payment, chai run for workshop teams..."
                    value={expenseNotes}
                    onChange={(e) => setExpenseNotes(e.target.value)}
                    className="w-full text-xs p-1.5 border rounded-xl"
                  />
                </div>
                <button 
                  type="submit" 
                  className="w-full bg-[#E5B84B] text-neutral-950 py-2 rounded-xl text-xs font-bold font-mono uppercase hover:bg-amber-400 select-none cursor-pointer"
                >
                  Post Ledger Debit Entry
                </button>
              </form>

              {/* Recent Safe/Float Entries log */}
              <div className="space-y-1.5 max-h-[160px] overflow-y-auto pt-2 border-t">
                <span className="text-[10px] font-mono text-[#848279] block uppercase font-bold text-neutral-500">Local Journal Entries streams</span>
                {cashbookExpenses.map(ex => (
                  <div key={ex.id} className="flex justify-between text-[11px] font-mono p-1 border-b">
                    <span className="text-red-500">[{ex.date}] -{ex.amount} EXP</span>
                    <span className="text-neutral-500">{ex.notes}</span>
                  </div>
                ))}
                {recentTransactions.filter(t => t.paymentMethod === 'cash').map(cf => (
                  <div key={cf.id} className="flex justify-between text-[11px] font-mono p-1 border-b">
                    <span className={cf.type === 'credit' ? 'text-green-600' : 'text-red-505'}>
                      {cf.type === 'credit' ? '+' : '-'}₹{cf.amount.toFixed(2)}
                    </span>
                    <span className="text-neutral-400">POS Sales {cf.type} - Cash register</span>
                  </div>
                ))}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* 4. DYNAMIC UPI QR PAYER DRAWER MODAL */}
      <AnimatePresence>
        {showUPIDrawer && (
          <div className="fixed inset-0 bg-neutral-950/40 backdrop-blur-sm flex items-center justify-center z-50">
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white p-6 rounded-3xl border border-[#e3dec9] w-full max-w-sm text-center shadow-2xl space-y-4 text-neutral-900"
            >
              <div className="flex items-center justify-between border-b pb-3 text-left">
                <div className="flex items-center gap-2">
                  <QrCode className="w-5 h-5 text-amber-700" />
                  <span className="text-xs font-bold font-mono tracking-widest uppercase">UPI Unified QR Scan</span>
                </div>
                <button onClick={() => setShowUPIDrawer(false)} className="text-neutral-400 hover:text-neutral-600">
                  <XCircle className="w-5 h-5" />
                </button>
              </div>

              <div className="space-y-2">
                <div className="bg-neutral-50 p-6 rounded-2xl inline-block border border-dashed border-[#e3dec9]">
                  {/* Real-looking UPI QR scan mock diagram displaying dynamic amount */}
                  <div className="w-44 h-44 bg-white border border-[#e3dec9] p-2 flex flex-col items-center justify-center relative shadow-inner">
                    <div className="grid grid-cols-5 gap-1.5 opacity-80 select-none">
                      {Array.from({ length: 25 }).map((_, idx) => (
                        <div 
                          key={idx} 
                          className={`w-6 h-6 rounded ${
                            (idx % 3 === 0 || idx % 4 === 0 || idx < 5 || idx % 5 === 0) ? 'bg-neutral-900' : 'bg-transparent'
                          }`} 
                        />
                      ))}
                    </div>
                    {/* Centered Golden Indian Rupee sign block */}
                    <div className="absolute inset-0 m-auto w-10 h-10 bg-[#E5B84B] rounded-full border border-white flex items-center justify-center text-neutral-950 font-black text-lg select-none shadow shadow-[#E5B84B]/40 animate-pulse">
                      ₹
                    </div>
                  </div>
                </div>

                <div className="space-y-1.5 font-mono text-xs text-neutral-800">
                  <span className="text-[10px] text-[#848279] uppercase block font-bold">UPI Payment Intent Key</span>
                  <p className="font-bold text-neutral-950 truncate text-[10px] bg-neutral-50 p-2 rounded border">{upiPayload}</p>
                  <p className="text-sm font-black text-amber-700">Scan to Pay: ₹{cartTotal.toFixed(2)}</p>
                  <p className="text-[9.5px] text-[#848279] leading-snug">Compatible with Google Pay, PhonePe, Paytm, BHIM, and other standard retail merchant protocols.</p>
                </div>
              </div>

              <button 
                onClick={() => setShowUPIDrawer(false)}
                className="w-full bg-[#E5B84B] text-neutral-950 hover:bg-amber-400 py-2 rounded-xl text-xs font-bold font-mono uppercase tracking-widest transition-all cursor-pointer"
              >
                Scan Confirmed / Back
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* 5. INTERACTIVE 80mm THERMAL RECEIPT PRINT OUT MODAL */}
      <AnimatePresence>
        {showThermalReceipt && activeInvoice && (
          <div className="fixed inset-0 bg-neutral-950/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white p-6 rounded-3xl border border-[#e3dec9] w-full max-w-md shadow-2xl space-y-4 text-neutral-900"
            >
              <div className="flex items-center justify-between border-b pb-2 cursor-default">
                <div className="flex items-center gap-1.5 text-[#E5B84B]">
                  <Receipt className="w-5 h-5 text-amber-700" />
                  <span className="text-xs font-mono font-bold uppercase tracking-widest text-[#E5B84B]">Thermal Print Lane</span>
                </div>
                <div className="flex items-center gap-2">
                  <button 
                    onClick={() => { setShowThermalReceipt(false); setShowPDFInvoice(true); }}
                    className="text-xs text-neutral-500 hover:text-neutral-900 underline font-mono font-bold uppercase shrink-0"
                  >
                    Load PDF Copy
                  </button>
                  <button onClick={() => setShowThermalReceipt(false)} className="text-neutral-400 hover:text-neutral-600">
                    <XCircle className="w-5 h-5" />
                  </button>
                </div>
              </div>

              {/* 80mm THERMAL RECEIPT EMULATOR GRID CONTAINER */}
              <div 
                id="thermal-receipt-lane"
                className="bg-[#FAF9F5] p-5 border border-[#e3dec9] rounded-xl text-xs font-mono text-neutral-950 space-y-3 max-h-[380px] overflow-y-auto mx-auto shadow-inner select-all"
                style={{ fontFamily: 'monospace' }}
              >
                <div className="text-center space-y-1">
                  <h3 className="font-black text-sm uppercase">🏏 TALK OF THE TOWN</h3>
                  <p className="text-[10px] text-neutral-500">Premium Cricket Custom Closet ERP</p>
                  <p className="text-[10px] text-neutral-500">Branch: {branchScope}</p>
                  <p className="text-[10px]">Ph: +61-491-570-156</p>
                  <p className="text-[10px] text-[#848279]">GSTIN/ARN: 33AAFCT9009R1ZP</p>
                </div>

                <div className="border-t border-dashed border-neutral-350 pt-2 space-y-1 text-[10px]">
                  <div className="flex justify-between">
                    <span>Receipt ID:</span>
                    <span className="font-bold">{activeInvoice.invoiceNumber}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Order Reference:</span>
                    <span>{activeInvoice.orderId}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Cashier Operator:</span>
                    <span>{profile?.name || "Lanes Terminal 1"}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Date Checkout:</span>
                    <span>{new Date(activeInvoice.checkoutDate).toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between text-neutral-800">
                    <span>Customer Account:</span>
                    <span className="font-bold">{activeInvoice.customerName}</span>
                  </div>
                </div>

                <div className="border-t border-dashed border-neutral-350 pt-2 text-[10.5px]">
                  <div className="grid grid-cols-12 font-bold border-b pb-1 text-[#848279]">
                    <span className="col-span-6">ITEM SPEC</span>
                    <span className="col-span-2 text-center">QTY</span>
                    <span className="col-span-4 text-right">TOTAL</span>
                  </div>

                  <div className="space-y-1.5 pt-1.5">
                    {activeInvoice.cartItems.map((item: any) => (
                      <div key={item.product.id} className="grid grid-cols-12">
                        <div className="col-span-6 flex flex-col">
                          <span className="font-bold truncate text-[11px]">{item.product.name}</span>
                          {item.notes && <span className="text-[9px] text-[#848279] italic">*{item.notes}</span>}
                        </div>
                        <span className="col-span-2 text-center text-neutral-800">x{item.quantity}</span>
                        <span className="col-span-4 text-right font-bold">₹{(item.product.sellingPrice * item.quantity).toFixed(2)}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="border-t border-dashed border-neutral-350 pt-2 space-y-1 text-[10.5px] text-right">
                  <div className="flex justify-between">
                    <span className="text-[#848279]">Catalogue Subtotal:</span>
                    <span>₹{activeInvoice.subtotal.toFixed(2)}</span>
                  </div>
                  {activeInvoice.discount > 0 && (
                    <div className="flex justify-between text-emerald-600 font-bold">
                      <span>Adjustment Discount:</span>
                      <span>-₹{activeInvoice.discount.toFixed(2)}</span>
                    </div>
                  )}
                  <div className="flex justify-between text-neutral-400 text-[10px]">
                    <span>CGST (9.0%):</span>
                    <span>+₹{activeInvoice.cgst.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-neutral-400 text-[10px]">
                    <span>SGST (9.0%):</span>
                    <span>+₹{activeInvoice.sgst.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between font-black text-sm text-neutral-950 pt-1.5 border-t border-neutral-250 font-mono">
                    <span>GRAND PAY TOTAL:</span>
                    <span className="text-[#E5B84B]">₹{activeInvoice.total.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-[11px] text-neutral-600">
                    <span>Payment Received:</span>
                    <span className="font-bold text-neutral-800">₹{activeInvoice.amountPaid.toFixed(2)}</span>
                  </div>
                  {activeInvoice.balanceDue > 0 && (
                    <div className="flex justify-between text-[11px] text-red-600 font-bold">
                      <span>Outstanding Bal Due:</span>
                      <span>₹{activeInvoice.balanceDue.toFixed(2)}</span>
                    </div>
                  )}
                  <div className="text-[9.5px] text-left text-neutral-500 pt-1">
                    Method Payload: <strong>{activeInvoice.paymentDetails}</strong>
                  </div>
                </div>

                <div className="border-t border-dashed border-neutral-350 pt-3 text-center text-[10px] space-y-1 text-neutral-500">
                  <p className="font-bold font-mono">🏏 THANK YOU FOR SHOPPING! 🏏</p>
                  <p>Custom gear crafted to power your explosive visual boundaries.</p>
                  <p className="text-[9px]">ERP Lane Terminal transaction index verified successfully.</p>
                </div>
              </div>

              <div className="flex gap-2">
                <button
                  onClick={() => window.print()}
                  className="flex-1 bg-neutral-900 border border-neutral-700 text-white hover:bg-neutral-800 py-2 rounded-xl text-xs font-bold font-mono uppercase transition-all flex items-center justify-center gap-1 cursor-pointer"
                >
                  <Printer className="w-4 h-4 text-[#E5B84B]" />
                  <span>NATIVE PRINT RECEIPT</span>
                </button>
                <button
                  onClick={() => setShowThermalReceipt(false)}
                  className="bg-[#E5B84B] hover:bg-amber-400 text-neutral-950 py-2 px-6 rounded-xl text-xs font-bold font-sans uppercase transition-all cursor-pointer"
                >
                  Confirm Close
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* 6. GORGEOUS GOLD-ACCENTED CORPORATE PDF INVOICE DRAWER */}
      <AnimatePresence>
        {showPDFInvoice && activeInvoice && (
          <div className="fixed inset-0 bg-neutral-950/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white p-8 rounded-3xl border border-[#e3dec9] w-full max-w-4xl shadow-2xl relative overflow-hidden"
            >
              {/* Backing Gold Seal Decors */}
              <div className="absolute -top-12 -right-12 w-48 h-48 bg-amber-500/5 rounded-full blur-2xl pointer-events-none" />

              <div className="flex items-center justify-between border-b pb-4 mb-6">
                <div className="flex items-center gap-2">
                  <FileText className="w-6 h-6 text-amber-700" />
                  <div>
                    <h3 className="text-sm font-bold font-mono uppercase tracking-widest">Financial Corporate Invoice copy</h3>
                    <p className="text-[10px] text-[#848279]">Gold Seal ledger series printable layout document</p>
                  </div>
                </div>
                <button onClick={() => setShowPDFInvoice(false)} className="text-neutral-450 hover:text-neutral-600">
                  <XCircle className="w-6 h-6 animate-pulse text-[#E5B84B]" />
                </button>
              </div>

              {/* DYNAMIC CORPORATE PRINT SHEET CONTAINER */}
              <div 
                id="corporate-pdf-surface"
                className="bg-white p-8 border border-[#e3dec9] rounded-2xl shadow-inner text-neutral-900 space-y-6 max-h-[500px] overflow-y-auto select-all"
              >
                
                {/* PDF Header Logo & Meta columns */}
                <div className="flex justify-between items-start">
                  <div className="flex gap-4 items-start text-left">
                    <img 
                      src={brandLogo} 
                      alt="Brand Logo" 
                      className="w-12 h-12 object-cover rounded-lg border border-neutral-200 shrink-0" 
                      referrerPolicy="no-referrer"
                    />
                    <div className="space-y-1.5">
                      <span className="text-[11px] font-black tracking-widest text-[#E5B84B] font-mono select-none px-2 py-0.5 bg-neutral-950 inline-block uppercase">TALK OF THE TOWN CRICKET CLOSET</span>
                      <h2 className="text-xl font-sans font-black tracking-tight text-neutral-950 leading-none">TAX INVOICE / RECONCILIATION</h2>
                      <p className="text-[10px] text-neutral-500 max-w-xs leading-normal">Premium English Willow fabrication, digital sublimated layouts, sports armor customized specs.</p>
                    </div>
                  </div>

                  <div className="text-right space-y-1 text-xs font-mono">
                    <div className="text-neutral-500 block uppercase text-[9px] tracking-widest">INVOICE SERIAL</div>
                    <span className="text-sm font-bold text-neutral-950 font-mono block">{activeInvoice.invoiceNumber}</span>
                    <div className="text-neutral-550">Date: {new Date(activeInvoice.checkoutDate).toLocaleDateString()}</div>
                    <div className="text-neutral-550">Place checkout: {branchScope}</div>
                    <div className="text-neutral-550 font-bold block text-emerald-600 uppercase text-[9px]">[{activeInvoice.status}]</div>
                  </div>
                </div>

                {/* Sender vs Recipient billing columns */}
                <div className="grid grid-cols-2 gap-8 border-t border-b border-[#FAF9F5] py-4 text-xs">
                  <div className="space-y-1.5/ text-left border-r pr-6">
                    <span className="text-[10px] font-mono text-[#848279] uppercase block font-bold">SUPPLIER ADRESS / METRICS</span>
                    <h4 className="font-bold text-neutral-950 font-sans">Talk of the Town Cricket Corporates</h4>
                    <p className="text-neutral-505">Warehouse Closet Complex Suite 4A</p>
                    <p className="text-neutral-505">Melbourne Terminal Road, Victoria Australia 3004</p>
                    <p className="text-neutral-505 font-mono text-[9px] text-[#848279]">GSTIN/Tax index ID: 33AAFCT9009R1ZP</p>
                  </div>

                  <div className="space-y-1.5/ text-left">
                    <span className="text-[10px] font-mono text-[#848279] uppercase block font-bold">BILLED OUT TO RECIPIENT</span>
                    <h4 className="font-bold text-neutral-950 font-sans">{activeInvoice.customerName}</h4>
                    <p className="text-neutral-505">Contact Phone: {activeInvoice.customerPhone}</p>
                    <p className="text-neutral-505">Place scope: {branchScope} Registry Profile</p>
                    <p className="text-neutral-505 font-mono text-[9.5px] italic text-neutral-500">Linked CRM token status verified</p>
                  </div>
                </div>

                {/* Items breakdown ledger table */}
                <div className="text-xs">
                  <div className="grid grid-cols-12 font-bold bg-[#FAF9F5] p-2.5 border-b border-t border-[#e3dec9] text-neutral-700 font-mono">
                    <span className="col-span-1">#</span>
                    <span className="col-span-5 text-left">CATALOGUE DESCRIPTION / SKU</span>
                    <span className="col-span-2 text-right">UNIT RATE</span>
                    <span className="col-span-1 text-center">QTY</span>
                    <span className="col-span-3 text-right">GROSS AMT</span>
                  </div>

                  <div className="divide-y divide-[#FAF9F5] pt-1">
                    {activeInvoice.cartItems.map((item: any, index: number) => (
                      <div key={item.product.id} className="grid grid-cols-12 p-2.5 text-neutral-800 font-sans items-center">
                        <span className="col-span-1 font-mono text-[#848279]">{index + 1}</span>
                        <div className="col-span-5 text-left flex flex-col">
                          <span className="font-bold text-neutral-950">{item.product.name}</span>
                          <span className="text-[9.5px] text-[#848279] font-mono">SKU: {item.product.sku} | Barcode: {item.product.barcode}</span>
                          {item.notes && <span className="text-[9.5px] text-amber-800 font-mono italic">Custom detail: {item.notes}</span>}
                        </div>
                        <span className="col-span-2 text-right font-mono">₹{item.product.sellingPrice.toFixed(2)}</span>
                        <span className="col-span-1 text-center font-mono font-bold">x{item.quantity}</span>
                        <span className="col-span-3 text-right font-mono font-bold">₹{(item.product.sellingPrice * item.quantity).toFixed(2)}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Financial values splits block */}
                <div className="grid grid-cols-12 gap-4 border-t border-dashed border-neutral-350 pt-4 text-xs font-sans text-left">
                  
                  {/* Left: General statements watermark */}
                  <div className="col-span-6 space-y-2 select-none">
                    <div className="p-3 bg-[#FAF9F5] border border-neutral-200 rounded-xl space-y-1">
                      <span className="text-[9px] font-bold block text-green-700 font-mono">✓ CRYPTOGRAPHIC LEDGER STATEMENT</span>
                      <p className="text-[9px] text-[#848279] leading-snug">This is a valid Tax doc generated from the Closet ERP cloud run server instances. Quantities deducted successfully under branch record parameters.</p>
                    </div>
                    {activeInvoice.notes && (
                      <div className="text-[10px] italic text-neutral-500">
                        *Lane Cashier Comment: "{activeInvoice.notes}"
                      </div>
                    )}
                  </div>

                  {/* Right: Calculations ledger */}
                  <div className="col-span-6 space-y-1.5 text-right font-mono text-[11px]">
                    <div className="flex justify-between">
                      <span className="text-[#848279]">Catalogue gross net:</span>
                      <span>₹{activeInvoice.subtotal.toFixed(2)}</span>
                    </div>
                    {activeInvoice.discount > 0 && (
                      <div className="flex justify-between text-emerald-600 font-bold">
                        <span>Corporate adjustment disc:</span>
                        <span>-₹{activeInvoice.discount.toFixed(2)}</span>
                      </div>
                    )}
                    <div className="flex justify-between text-neutral-450 text-[10px]">
                      <span>Federal Central GST (CGST 9.0%):</span>
                      <span>+₹{activeInvoice.cgst.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between text-neutral-450 text-[10px]">
                      <span>State and Territorial GST (SGST 9.0%):</span>
                      <span>+₹{activeInvoice.sgst.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between font-black text-sm text-neutral-950 pt-1.5 border-t border-neutral-250 select-all font-mono">
                      <span>CLIENT TOTAL ASSESSED:</span>
                      <span className="text-amber-700 font-extrabold">₹{activeInvoice.total.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between border-t border-neutral-100 pt-1">
                      <span>Total Payment Received:</span>
                      <span className="font-extrabold text-neutral-900">₹{activeInvoice.amountPaid.toFixed(2)}</span>
                    </div>
                    {activeInvoice.balanceDue > 0 && (
                      <div className="flex justify-between text-red-655 font-bold">
                        <span>Balance Debit Due:</span>
                        <span>₹{activeInvoice.balanceDue.toFixed(2)}</span>
                      </div>
                    )}
                  </div>

                </div>

                {/* PDF Signatures bottom line */}
                <div className="border-t pt-6 mt-6 flex justify-between items-center text-[10px] text-neutral-500">
                  <div className="text-left font-mono">
                    <p>Secured via Firebase RBAC protocol gates.</p>
                    <p>Authorized Cashier Signature: <strong>{profile?.name || "System Lanes Manager"}</strong></p>
                  </div>
                  
                  <div className="text-right">
                    <p className="font-bold">TALK OF THE TOWN CRICKET INDUSTRIES</p>
                    <p>Melbourne Office • London Office • Sublimation Hub Delhi NCR</p>
                  </div>
                </div>

              </div>

              <div className="flex justify-end gap-2 mt-4 pt-1">
                <button
                  onClick={() => window.print()}
                  className="bg-neutral-950 text-white hover:bg-neutral-800 px-4 py-2 rounded-xl text-xs font-bold font-mono uppercase tracking-wider flex items-center gap-1 cursor-pointer"
                >
                  <Download className="w-4 h-4 text-[#E5B84B]" />
                  <span>Download / Export PDF copy</span>
                </button>
                <button
                  onClick={() => setShowPDFInvoice(false)}
                  className="bg-[#E5B84B] hover:bg-amber-400 text-neutral-950 font-sans font-bold px-6 py-2 rounded-xl text-xs uppercase"
                >
                  Close Document
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
};
