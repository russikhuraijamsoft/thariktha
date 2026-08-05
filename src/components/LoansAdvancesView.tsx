import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  collection, 
  doc, 
  setDoc, 
  Timestamp 
} from 'firebase/firestore';
import { 
  Search, Plus, Printer, Download, AlertTriangle, CheckCircle2, 
  UserPlus, Receipt, Wallet, Banknote, Sparkles, PlusCircle, 
  XCircle, ChevronRight, HelpCircle, ArrowRight, ClipboardList, 
  TrendingUp, DollarSign, Briefcase, Users, Calendar, Percent, Landmark
} from 'lucide-react';
import { db, isCloudConnected } from '../firebase';
import { CRMCustomer } from './CRMView';

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
  interestRate: number; // Flat interest rate percentage (e.g. 5%)
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
    interestRate: 0, // Interest-free salary advance
    durationMonths: 6,
    disbursalDate: "2026-04-10",
    status: "active",
    notes: "Salary advance for medical expenses. Repayments deducted monthly from wages.",
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
    interestRate: 5.0, // 5% flat setup credit
    durationMonths: 12,
    disbursalDate: "2026-01-15",
    status: "active",
    notes: "Equipment purchase seasonal layout credit terms. Interest rate calculated flat annually.",
    repayments: [
      { id: "RPAY-2026-003", amount: 50000, paymentMethod: "bank_transfer", repaymentDate: "2026-03-31", referenceCode: "HSBC-TXN-90212", notes: "Initial bulk advance return" }
    ]
  },
  {
    id: "LOAN-2026-003",
    borrowerName: "Sunridge Sports India Ltd.",
    borrowerCategory: "external",
    amountDisbursed: 80000,
    interestRate: 0,
    durationMonths: 3,
    disbursalDate: "2026-05-01",
    status: "fully_paid",
    notes: "Reversible container customs clearance advance.",
    repayments: [
      { id: "RPAY-2026-004", amount: 80000, paymentMethod: "bank_transfer", repaymentDate: "2026-05-28", referenceCode: "SBI-REMIT-8431", notes: "Security refund from customs cleared" }
    ]
  }
];

interface LoansAdvancesViewProps {
  branchScope: 'Melbourne Closets' | 'London Closets';
  profile: any;
  customers: CRMCustomer[];
  loans?: LoanRecord[];
  setLoans?: React.Dispatch<React.SetStateAction<LoanRecord[]>>;
}

export const LoansAdvancesView: React.FC<LoansAdvancesViewProps> = ({ 
  branchScope, 
  profile, 
  customers,
  loans: propLoans,
  setLoans: propSetLoans
}) => {
  // --- LOANS & ADVANCES MANAGEMENT STATE ---
  const [localLoans, setLocalLoans] = useState<LoanRecord[]>(() => {
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

  const loans = propLoans !== undefined ? propLoans : localLoans;
  const setLoans = propSetLoans !== undefined ? propSetLoans : setLocalLoans;

  useEffect(() => {
    if (propLoans === undefined) {
      localStorage.setItem('cricket_closet_loans', JSON.stringify(localLoans));
    }
  }, [localLoans, propLoans]);

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

  // Active Loan Object Lookup
  const selectedLoan = loans.find(l => l.id === selectedLoanId) || loans[0] || null;

  // Repayment Calculation Helpers for Selected Loan
  const getExpectedWithInterest = (l: LoanRecord) => {
    const interestAmt = l.amountDisbursed * (l.interestRate / 100);
    return l.amountDisbursed + interestAmt;
  };

  const getPaidTotal = (l: LoanRecord) => {
    return l.repayments.reduce((sum, r) => sum + r.amount, 0);
  };

  // Calculations for global dynamic counters
  const totalPrincipalDisbursed = loans.reduce((acc, l) => acc + l.amountDisbursed, 0);
  
  const totalRepaymentsReceived = loans.reduce((acc, l) => acc + getPaidTotal(l), 0);
  
  const totalInterestCollected = loans.reduce((acc, l) => {
    const interestRatio = l.interestRate / 100;
    const paid = getPaidTotal(l);
    if (paid <= 0) return acc;
    
    // Proportional calculation of interest paid
    const totalExpected = getExpectedWithInterest(l);
    const totalInterest = l.amountDisbursed * interestRatio;
    const proportionPaid = paid / totalExpected;
    return acc + (totalInterest * proportionPaid);
  }, 0);

  const totalOutstandingLedger = loans.reduce((acc, l) => {
    if (l.status === 'fully_paid') return acc;
    return acc + (getExpectedWithInterest(l) - getPaidTotal(l));
  }, 0);

  // Filter Matching
  const filteredLoans = loans.filter(l => {
    const matchSearch = l.borrowerName.toLowerCase().includes(loanSearch.toLowerCase()) || 
                        l.id.toLowerCase().includes(loanSearch.toLowerCase()) ||
                        (l.notes && l.notes.toLowerCase().includes(loanSearch.toLowerCase()));
    
    if (loanCategoryFilter === 'fully_paid') {
      return matchSearch && l.status === 'fully_paid';
    }
    if (loanCategoryFilter === 'all') {
      return matchSearch;
    }
    return matchSearch && l.borrowerCategory === loanCategoryFilter && l.status !== 'fully_paid';
  });

  // Handle Disbursing New Loan
  const handleDisburseLoanSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newLoanName.trim()) {
      alert("Borrower Name is mandatory.");
      return;
    }
    const amt = parseFloat(newLoanAmount);
    if (isNaN(amt) || amt <= 0) {
      alert("Please specify a valid disbursement amount.");
      return;
    }
    const interest = parseFloat(newLoanInterest) || 0;
    const duration = parseInt(newLoanDuration) || 1;

    const newRec: LoanRecord = {
      id: `LOAN-${Date.now().toString().slice(-6)}`,
      borrowerName: newLoanName,
      borrowerCategory: newLoanCategory,
      borrowerId: newLoanId.trim() || undefined,
      amountDisbursed: amt,
      interestRate: interest,
      durationMonths: duration,
      disbursalDate: newLoanDate,
      status: 'active',
      notes: newLoanNotes || 'Corporate advance contract.',
      repayments: []
    };

    setLoans(prev => [newRec, ...prev]);
    setSelectedLoanId(newRec.id);

    // Reset fields
    setNewLoanName('');
    setNewLoanCategory('staff');
    setNewLoanId('');
    setNewLoanAmount('');
    setNewLoanInterest('0');
    setNewLoanDuration('6');
    setNewLoanNotes('');
    setIsDisburseModalOpen(false);

    // Audit logs entry
    if (isCloudConnected) {
      try {
        const auditId = `AUDIT-LN-DISB-${Date.now()}`;
        setDoc(doc(db, "audit_logs", auditId), {
          id: auditId,
          actionType: "CREATE",
          targetTable: "loans",
          targetId: newRec.id,
          details: `Disbursed INR ${newRec.amountDisbursed} corporate loan to ${newRec.borrowerName}. Rate: ${newRec.interestRate}%.`,
          operator: profile?.name || "Corporate Treasury",
          timestamp: Timestamp.now()
        });
      } catch (err) {
        console.warn("Cloud log write bypass:", err);
      }
    }
  };

  // Handle Recording New Repayment Receipt
  const handleRecordRepaymentSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedLoan) return;

    const amt = parseFloat(repayAmount);
    if (isNaN(amt) || amt <= 0) {
      alert("Please specify a valid payment amount.");
      return;
    }

    const expected = getExpectedWithInterest(selectedLoan);
    const paid = getPaidTotal(selectedLoan);
    const remaining = expected - paid;

    if (amt > remaining + 0.05) {
      alert(`The repayment amount of INR ${amt} exceeds the remaining outstanding requirement of INR ${remaining.toFixed(2)}`);
      return;
    }

    const rpy: LoanRepayment = {
      id: `RPAY-${Date.now().toString().slice(-5)}`,
      amount: amt,
      paymentMethod: repayMethod,
      repaymentDate: repayDate,
      referenceCode: repayCode.trim() || `REF-LN-${Math.floor(100000 + Math.random() * 900000)}`,
      notes: repayNotes || 'Regular seasonal installment'
    };

    const nextRepayments = [...selectedLoan.repayments, rpy];
    const nextPaidTotal = nextRepayments.reduce((sum, r) => sum + r.amount, 0);
    const fullyPaid = nextPaidTotal >= expected - 0.5;

    setLoans(prev => prev.map(l => {
      if (l.id === selectedLoan.id) {
        return {
          ...l,
          status: fullyPaid ? 'fully_paid' : l.status,
          repayments: nextRepayments
        };
      }
      return l;
    }));

    // Reset Form
    setRepayAmount('');
    setRepayCode('');
    setRepayNotes('');
    setIsRepayModalOpen(false);

    // Audit logs entry
    if (isCloudConnected) {
      try {
        const auditId = `AUDIT-LN-RPY-${Date.now()}`;
        setDoc(doc(db, "audit_logs", auditId), {
          id: auditId,
          actionType: "UPDATE",
          targetTable: "loans",
          targetId: selectedLoan.id,
          details: `Recorded INR ${amt} repayment for loan ${selectedLoan.id}. Form code: ${rpy.referenceCode}`,
          operator: profile?.name || "Corporate Treasury",
          timestamp: Timestamp.now()
        });
      } catch (err) {
        console.warn("Cloud log write bypass:", err);
      }
    }
  };

  // Helper to trigger simulated downloadable invoice printing
  const handlePrintReceipt = (repay: LoanRepayment, loanRec: LoanRecord) => {
    alert(`--- LOAN REPAYMENT VOUCHER ---\nVirtual Print Receipt Generated!\nID: ${repay.id}\nLoan ID: ${loanRec.id}\nBorrower Name: ${loanRec.borrowerName}\nAmount Received: INR ${repay.amount}\nDate: ${repay.repaymentDate}\nMethod: ${repay.paymentMethod.toUpperCase()}\nReference: ${repay.referenceCode}\nAuthorized Signatory: ${profile?.name || 'Administrator'}`);
  };

  return (
    <div className="space-y-6" id="digital-treasury-loans-workspace">
      
      {/* 1. FINANCIAL REPORTING COUNTERS CARD ROWS */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        
        <div className="bg-white p-5 rounded-2xl border border-[#e3dec9] shadow-sm relative overflow-hidden">
          <div className="absolute top-0 right-0 w-24 h-24 bg-amber-500/5 rounded-full blur-2xl"></div>
          <span className="text-[10px] font-mono uppercase tracking-widest text-neutral-400 block mb-1">Corporate Disbursements</span>
          <div className="flex items-baseline gap-1">
            <span className="text-2xl font-black font-mono text-neutral-900">₹{totalPrincipalDisbursed.toLocaleString('en-IN', { maximumFractionDigits: 2 })}</span>
          </div>
          <p className="text-[10.5px] text-neutral-400 font-mono mt-1">Sum of all approved loans disbursed</p>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-[#e3dec9] shadow-sm relative overflow-hidden">
          <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-500/5 rounded-full blur-2xl"></div>
          <span className="text-[10px] font-mono uppercase tracking-widest text-neutral-400 block mb-1">Repayments Recovered</span>
          <div className="flex items-baseline gap-1">
            <span className="text-2xl font-black font-mono text-green-700">₹{totalRepaymentsReceived.toLocaleString('en-IN', { maximumFractionDigits: 2 })}</span>
          </div>
          <p className="text-[10.5px] text-emerald-700 font-mono mt-1">√ {( (totalRepaymentsReceived / (totalPrincipalDisbursed || 1)) * 100 ).toFixed(1)}% safe capital recovery rate</p>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-[#e3dec9] shadow-sm relative overflow-hidden">
          <div className="absolute top-0 right-0 w-24 h-24 bg-amber-500/5 rounded-full blur-2xl"></div>
          <span className="text-[10px] font-mono uppercase tracking-widest text-neutral-400 block mb-1">Interest Realized</span>
          <div className="flex items-baseline gap-1">
            <span className="text-2xl font-black font-mono text-amber-600">₹{totalInterestCollected.toLocaleString('en-IN', { maximumFractionDigits: 2 })}</span>
          </div>
          <p className="text-[10.5px] text-neutral-400 font-mono mt-1">Proportional interest earnings credited</p>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-[#e3dec9] shadow-sm relative overflow-hidden">
          <div className="absolute top-0 right-0 w-24 h-24 bg-red-500/5 rounded-full blur-2xl"></div>
          <span className="text-[10px] font-mono uppercase tracking-widest text-neutral-400 block mb-1">Outstanding Capital</span>
          <div className="flex items-baseline gap-1">
            <span className="text-2xl font-black font-mono text-red-600">₹{totalOutstandingLedger.toLocaleString('en-IN', { maximumFractionDigits: 2 })}</span>
          </div>
          <p className="text-[10.5px] text-red-500 font-mono mt-1">⏳ Total active capital in circulation</p>
        </div>
      </div>

      {/* 2. THREE-PANEL RECON WORKFLOW */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* LEFT COMPASS: LIST & SENSORY CONTROLS (SPAN 5) */}
        <div className="lg:col-span-5 space-y-4">
          
          <div className="bg-white p-4 rounded-2xl border border-[#e3dec9] space-y-3 shadow-sm">
            
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-black tracking-widest uppercase text-neutral-700 font-mono flex items-center gap-1.5">
                <ClipboardList className="w-4 h-4 text-amber-500" />
                <span>Loan Book Database</span>
              </h4>
              <button
                onClick={() => setIsDisburseModalOpen(true)}
                className="bg-neutral-900 hover:bg-neutral-850 text-white font-mono font-bold text-[10px] hover:text-[#E5B84B] px-3 py-1.5 rounded-lg flex items-center gap-1 transition-all uppercase cursor-pointer border border-neutral-700"
              >
                <Plus className="w-3.5 h-3.5 text-[#E5B84B]" />
                <span>Disburse Loan</span>
              </button>
            </div>

            {/* Quick Search & Filter bar matches */}
            <div className="relative">
              <Search className="absolute left-3 top-2.5 w-4 h-4 text-neutral-400" />
              <input
                type="text"
                placeholder="Lookup Borrower / ID Code / Terms..."
                value={loanSearch}
                onChange={(e) => setLoanSearch(e.target.value)}
                className="w-full pl-9 pr-4 py-2 text-xs rounded-xl border border-[#e3dec9] focus:outline-none focus:ring-2 focus:ring-amber-500 bg-[#FAF9F5] font-mono"
              />
            </div>

            {/* Sentry category toggle bar */}
            <div className="flex items-center gap-1 overflow-x-auto pb-1 scrollbar-thin">
              {[
                { id: 'all', label: 'All Ledgers' },
                { id: 'staff', label: 'Staff Advances' },
                { id: 'customer', label: 'CRM Credits' },
                { id: 'external', label: 'External' },
                { id: 'fully_paid', label: 'Archived / Paid' }
              ].map(cat => (
                <button
                  key={cat.id}
                  onClick={() => setLoanCategoryFilter(cat.id as any)}
                  className={`text-[9.5px] font-bold uppercase tracking-tight px-2.5 py-1.5 rounded-lg border transition-all shrink-0 cursor-pointer ${
                    loanCategoryFilter === cat.id 
                      ? 'bg-neutral-900 border-transparent text-amber-400 font-black'
                      : 'bg-[#FAF9F5] border-[#e3dec9] text-[#848279] hover:bg-neutral-150'
                  }`}
                >
                  {cat.label}
                </button>
              ))}
            </div>

          </div>

          {/* LOANS LIST PANEL */}
          <div className="space-y-3 max-h-[500px] overflow-y-auto pr-1">
            {filteredLoans.length === 0 ? (
              <div className="bg-white p-12 rounded-2xl border border-dashed border-[#e3dec9] text-center space-y-2">
                <AlertTriangle className="w-8 h-8 text-amber-500 mx-auto" />
                <h5 className="text-xs font-bold font-mono text-neutral-700">No loan records align with filters</h5>
                <p className="text-[10px] text-neutral-400">Expand lookups or disburse a new asset term above.</p>
              </div>
            ) : (
              filteredLoans.map((l) => {
                const isSelected = selectedLoanId === l.id;
                const expected = getExpectedWithInterest(l);
                const paid = getPaidTotal(l);
                const pending = expected - paid;
                const pct = Math.min(100, Math.round((paid / expected) * 100));

                return (
                  <motion.div
                    key={l.id}
                    whileHover={{ scale: 1.01 }}
                    whileTap={{ scale: 0.99 }}
                    onClick={() => setSelectedLoanId(l.id)}
                    className={`p-4 rounded-xl border text-left cursor-pointer transition-all relative ${
                      isSelected 
                        ? 'bg-[#FCFBF7] border-amber-500 shadow-md ring-1 ring-amber-400' 
                        : 'bg-white border-[#e3dec9] hover:border-neutral-400 shadow-sm'
                    }`}
                  >
                    {/* Corner category flags */}
                    <div className="absolute top-3 right-3 flex items-center gap-1.5">
                      <span className={`text-[8.5px] font-mono uppercase px-2 py-0.5 rounded font-bold ${
                        l.borrowerCategory === 'staff' ? 'bg-indigo-50 text-indigo-700 border border-indigo-100' :
                        l.borrowerCategory === 'customer' ? 'bg-amber-50 text-amber-700 border border-amber-100' :
                        'bg-teal-50 text-teal-700 border border-teal-100'
                      }`}>
                        {l.borrowerCategory}
                      </span>
                      <span className={`text-[8.5px] font-mono px-1.5 py-0.5 rounded font-bold uppercase ${
                        l.status === 'fully_paid' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                      }`}>
                        {l.status === 'fully_paid' ? 'Archived' : 'Active'}
                      </span>
                    </div>

                    <div className="space-y-2.5">
                      <div>
                        <div className="text-[10px] font-mono text-neutral-400">{l.id}</div>
                        <h4 className="text-xs font-extrabold text-neutral-800 truncate max-w-[200px] mt-0.5">{l.borrowerName}</h4>
                      </div>

                      <div className="grid grid-cols-2 gap-2 text-[11px] font-mono border-t border-dashed border-neutral-100 pt-2">
                        <div>
                          <span className="text-[9px] text-neutral-400 block uppercase">Disbursed</span>
                          <span className="font-bold text-neutral-700">₹{l.amountDisbursed.toLocaleString('en-IN')}</span>
                        </div>
                        <div>
                          <span className="text-[9px] text-neutral-400 block uppercase">Balance Due</span>
                          <span className="font-bold text-red-600">₹{pending.toLocaleString('en-IN', { maximumFractionDigits: 1 })}</span>
                        </div>
                      </div>

                      {/* Micro Progress bar metric */}
                      <div className="space-y-1 pt-1">
                        <div className="flex justify-between items-center text-[9px] font-mono text-neutral-400">
                          <span>Progress Rate</span>
                          <span className="font-bold text-neutral-700">{pct}% Repaid</span>
                        </div>
                        <div className="w-full bg-neutral-100 rounded-full h-1.5 overflow-hidden">
                          <div 
                            className={`h-full rounded-full transition-all duration-300 ${l.status === 'fully_paid' ? 'bg-emerald-500' : 'bg-amber-500'}`}
                            style={{ width: `${pct}%` }}
                          ></div>
                        </div>
                      </div>

                      <div className="text-[9.5px] text-neutral-400 font-mono flex items-center justify-between pt-1">
                        <span>Term: {l.durationMonths} Mon @ {l.interestRate}% Int</span>
                        <span>Disp: {l.disbursalDate}</span>
                      </div>
                    </div>
                  </motion.div>
                );
              })
            )}
          </div>
        </div>

        {/* RIGHT REGISTRY FOCUS: DETAIL PORT & TRANSACTIONS CHRONOLOGY (SPAN 7) */}
        <div className="lg:col-span-7">
          {selectedLoan ? (
            <div className="bg-white rounded-3xl border border-[#e3dec9] shadow-sm p-6 space-y-6">
              
              {/* Profile Header Block */}
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-neutral-100">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-mono bg-neutral-100 text-neutral-600 px-2 py-0.5 rounded-md font-bold">{selectedLoan.id}</span>
                    <span className={`text-[10px] font-mono uppercase font-black px-2 py-0.5 rounded-full ${
                      selectedLoan.status === 'fully_paid' ? 'bg-emerald-100 text-emerald-800 border border-emerald-300/30' : 'bg-[#FFF7E6] text-amber-700 border border-amber-300/20'
                    }`}>
                      {selectedLoan.status === 'fully_paid' ? '✓ FULLY REPAID & ARCHIVED' : '⏳ ACTIVE LEDGER TERMS'}
                    </span>
                  </div>
                  <h3 className="text-base font-black text-neutral-900">{selectedLoan.borrowerName}</h3>
                  <p className="text-[11px] text-neutral-500 font-mono">Disbursal Entry: {selectedLoan.disbursalDate} in System Ledger</p>
                </div>

                <div className="flex items-center gap-2">
                  {selectedLoan.status !== 'fully_paid' && (
                    <button
                      onClick={() => {
                        setRepayAmount((getExpectedWithInterest(selectedLoan) - getPaidTotal(selectedLoan)).toFixed(2));
                        setIsRepayModalOpen(true);
                      }}
                      className="bg-neutral-900 border border-neutral-700 hover:bg-neutral-800 text-white font-mono font-bold text-xs px-4 py-2 rounded-xl flex items-center gap-1.5 uppercase transition-all shadow-sm cursor-pointer"
                    >
                      <Receipt className="w-4 h-4 text-amber-400" />
                      <span>Record Repayment</span>
                    </button>
                  )}
                </div>
              </div>

              {/* Dynamic Financial Audit Summary Table */}
              <div className="bg-[#FAF9F5] rounded-2xl border border-[#e3dec9] p-5">
                <h4 className="text-[10.5px] uppercase font-bold tracking-widest text-neutral-500 mb-3 font-mono">Amortization & Capital Breakdown</h4>
                
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="bg-white p-3 rounded-xl border border-[#e3dec9] text-center">
                    <span className="text-[9px] uppercase tracking-wider text-neutral-400 font-mono block">Principal Disbursed</span>
                    <span className="text-base font-black text-neutral-800 font-mono">₹{selectedLoan.amountDisbursed.toLocaleString('en-IN')}</span>
                  </div>

                  <div className="bg-white p-3 rounded-xl border border-[#e3dec9] text-center">
                    <span className="text-[9px] uppercase tracking-wider text-neutral-400 font-mono block">Flat Interest Rate</span>
                    <span className="text-base font-black text-[#E5B84B] font-mono">{selectedLoan.interestRate}% ({selectedLoan.durationMonths} Mon)</span>
                  </div>

                  <div className="bg-white p-3 rounded-xl border border-[#e3dec9] text-center">
                    <span className="text-[9px] uppercase tracking-wider text-neutral-400 font-mono block">Cumulative Expected</span>
                    <span className="text-base font-black text-neutral-900 font-mono">₹{getExpectedWithInterest(selectedLoan).toLocaleString('en-IN', { maximumFractionDigits: 1 })}</span>
                  </div>

                  <div className="bg-white p-3 rounded-xl border border-[#e3dec9] text-center">
                    <span className="text-[9px] uppercase tracking-wider text-neutral-400 font-mono block">Remaining Due</span>
                    <span className="text-base font-black text-red-600 font-mono">₹{(getExpectedWithInterest(selectedLoan) - getPaidTotal(selectedLoan)).toLocaleString('en-IN', { maximumFractionDigits: 1 })}</span>
                  </div>
                </div>

                <div className="mt-4 pt-3 border-t border-dashed border-neutral-200 text-xs text-neutral-500 leading-relaxed">
                  <strong className="font-mono text-neutral-700 uppercase block text-[9.5px] mb-0.5">Agreement Scope Notes:</strong>
                  {selectedLoan.notes}
                </div>
              </div>

              {/* Chronologic Repayments History */}
              <div className="space-y-3">
                <h4 className="text-xs font-black tracking-widest uppercase text-neutral-600 font-mono flex items-center gap-1.5">
                  <Banknote className="w-4 h-4 text-emerald-600" />
                  <span>Repayments Timeline & Vouchers</span>
                </h4>

                <div className="border border-neutral-100 rounded-2xl overflow-hidden shadow-sm bg-white">
                  <table className="w-full text-xs text-left text-neutral-500">
                    <thead className="text-[9px] uppercase tracking-widest bg-neutral-50 text-neutral-400 font-mono border-b border-neutral-100">
                      <tr>
                        <th className="px-4 py-3">Receipt Code</th>
                        <th className="px-4 py-3">Date</th>
                        <th className="px-4 py-3">Channel</th>
                        <th className="px-4 py-3 text-right">Amount Rec.</th>
                        <th className="px-4 py-3 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-neutral-50">
                      {selectedLoan.repayments.length === 0 ? (
                        <tr>
                          <td colSpan={5} className="text-center py-8 font-mono text-[#848279] bg-neutral-50/50">
                            No repayments logged under this agreement folder yet.
                          </td>
                        </tr>
                      ) : (
                        selectedLoan.repayments.map((r, i) => (
                          <tr key={r.id} className="hover:bg-neutral-50 transition-colors">
                            <td className="px-4 py-3.5 font-mono">
                              <div className="font-bold text-neutral-700">{r.id}</div>
                              <div className="text-[9.5px] text-neutral-400 truncate max-w-[120px]">{r.notes}</div>
                            </td>
                            <td className="px-4 py-3.5 font-mono text-neutral-600">{r.repaymentDate}</td>
                            <td className="px-4 py-3.5 uppercase font-mono text-[9.5px]">
                              <span className={`px-2 py-0.5 rounded font-bold ${
                                r.paymentMethod === 'cash' ? 'bg-amber-50 text-amber-700' :
                                r.paymentMethod === 'card' ? 'bg-indigo-50 text-indigo-700' :
                                'bg-teal-50 text-teal-700'
                              }`}>
                                {r.paymentMethod.replace('_', ' ')}
                              </span>
                            </td>
                            <td className="px-4 py-3.5 text-right font-bold text-green-700 font-mono">
                              ₹{r.amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                            </td>
                            <td className="px-4 py-3.5 text-right">
                              <div className="flex items-center justify-end gap-1.5">
                                <button
                                  onClick={() => handlePrintReceipt(r, selectedLoan)}
                                  className="p-1 px-2 border border-neutral-200 text-neutral-600 hover:text-amber-500 hover:border-amber-400 rounded transition-all text-[10px] font-mono uppercase bg-white cursor-pointer"
                                  title="Print Receipt"
                                >
                                  <Printer className="w-3.5 h-3.5 inline mr-1" />
                                  <span>Print</span>
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>

                {/* Micro visual ledger footer */}
                {selectedLoan.status !== 'fully_paid' && (
                  <div className="bg-amber-50/30 border border-dashed border-amber-300/30 rounded-xl p-3 text-[10.5px] font-mono text-amber-800 flex items-center justify-between">
                    <span>💡 Standard installment estimate: ₹{Math.ceil(getExpectedWithInterest(selectedLoan) / selectedLoan.durationMonths).toLocaleString('en-IN')} / month</span>
                    <span>Remaining Term: approx. {Math.max(1, selectedLoan.durationMonths - selectedLoan.repayments.length)} installments left</span>
                  </div>
                )}

              </div>

            </div>
          ) : (
            <div className="bg-white rounded-3xl border border-dashed border-[#e3dec9] p-16 text-center space-y-3">
              <Wallet className="w-12 h-12 text-[#E5B84B] mx-auto animate-pulse" />
              <h3 className="text-sm font-bold font-mono">No Active Loan Record Focus</h3>
              <p className="text-xs text-[#848279] max-w-sm mx-auto">Select an existing ledger line from the sidebar to review dynamic repayment schedules or post returns.</p>
            </div>
          )}
        </div>

      </div>

      {/* ==================== DIALOGS / OVERLAY FORMS ==================== */}
      <AnimatePresence>
        
        {/* NEW DISBURSEMENT MODAL DIALOG */}
        {isDisburseModalOpen && (
          <div className="fixed inset-0 bg-neutral-950/40 backdrop-blur-sm flex items-center justify-center z-50">
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white w-full max-w-lg rounded-3xl border border-[#e3dec9] shadow-xl p-6 space-y-4 text-left"
            >
              <div className="flex items-center justify-between border-b pb-3 border-neutral-100">
                <h3 className="text-xs font-black tracking-widest uppercase text-neutral-700 font-mono flex items-center gap-2">
                  <Landmark className="w-5 h-5 text-[#E5B84B]" />
                  <span>Disburse Capital Loan Agreement</span>
                </h3>
                <button onClick={() => setIsDisburseModalOpen(false)} className="text-neutral-400 hover:text-neutral-600 cursor-pointer">
                  <XCircle className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleDisburseLoanSubmit} className="space-y-4">
                
                <div>
                  <label className="text-[9px] uppercase tracking-widest font-mono text-neutral-400 block mb-1">Borrower Classification</label>
                  <div className="grid grid-cols-3 gap-2">
                    {[
                      { id: 'staff', label: 'Staff Member' },
                      { id: 'customer', label: 'CRM Client' },
                      { id: 'external', label: 'External Vendor' }
                    ].map(opt => (
                      <button
                        type="button"
                        key={opt.id}
                        onClick={() => {
                          setNewLoanCategory(opt.id as any);
                          // Auto populated defaults
                          if (opt.id === 'staff') {
                            setNewLoanId('STAFF-004');
                          } else if (opt.id === 'customer') {
                            setNewLoanId(customers[0]?.id || 'CUST-004');
                          } else {
                            setNewLoanId('VNDR-883');
                          }
                        }}
                        className={`text-[10px] py-2 border rounded-lg font-mono uppercase font-bold text-center cursor-pointer ${
                          newLoanCategory === opt.id 
                            ? 'bg-neutral-900 text-amber-400 border-transparent' 
                            : 'bg-[#FAF9F5] border-[#e3dec9] text-neutral-400 hover:bg-neutral-100'
                        }`}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <label className="text-[9px] uppercase tracking-widest font-mono text-neutral-400 block mb-1">Borrower Full Name</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Liam Dawson (Coach)"
                      value={newLoanName}
                      onChange={(e) => setNewLoanName(e.target.value)}
                      className="w-full text-xs p-2 rounded-lg border border-[#e3dec9] bg-[#FAF9F5] focus:ring-1 focus:ring-amber-500 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="text-[9px] uppercase tracking-widest font-mono text-neutral-400 block mb-1">Linked System Code (Optional)</label>
                    <input
                      type="text"
                      placeholder="e.g. STAFF-004, CUST-002"
                      value={newLoanId}
                      onChange={(e) => setNewLoanId(e.target.value)}
                      className="w-full text-xs p-2 rounded-lg border border-[#e3dec9] bg-[#FAF9F5] focus:ring-1 focus:ring-amber-500 focus:outline-none font-mono"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-[9px] uppercase tracking-widest font-mono text-neutral-400 block mb-1">Principal Amount (INR)</label>
                    <input
                      type="number"
                      required
                      placeholder="e.g. 50000"
                      value={newLoanAmount}
                      onChange={(e) => setNewLoanAmount(e.target.value)}
                      className="w-full text-xs p-2 rounded-lg border border-[#e3dec9] bg-[#FAF9F5] focus:ring-1 focus:ring-amber-500 focus:outline-none font-mono font-bold"
                    />
                  </div>
                  <div>
                    <label className="text-[9px] uppercase tracking-widest font-mono text-neutral-400 block mb-1">Flat Annual Interest (%)</label>
                    <input
                      type="number"
                      placeholder="e.g. 5"
                      value={newLoanInterest}
                      onChange={(e) => setNewLoanInterest(e.target.value)}
                      className="w-full text-xs p-2 rounded-lg border border-[#e3dec9] bg-[#FAF9F5] focus:ring-1 focus:ring-amber-500 focus:outline-none font-mono"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-[9px] uppercase tracking-widest font-mono text-neutral-400 block mb-1">Term Length (Months)</label>
                    <select
                      value={newLoanDuration}
                      onChange={(e) => setNewLoanDuration(e.target.value)}
                      className="w-full text-xs p-2 rounded-lg border border-[#e3dec9] bg-[#FAF9F5] focus:ring-1 focus:ring-amber-500 focus:outline-none font-mono"
                    >
                      <option value="3">3 Months</option>
                      <option value="6">6 Months</option>
                      <option value="12">12 Months (1 Year)</option>
                      <option value="24">24 Months (2 Years)</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-[9px] uppercase tracking-widest font-mono text-neutral-400 block mb-1">Disbursal Entry Date</label>
                    <input
                      type="date"
                      value={newLoanDate}
                      onChange={(e) => setNewLoanDate(e.target.value)}
                      className="w-full text-xs p-2 rounded-lg border border-[#e3dec9] bg-[#FAF9F5] focus:ring-1 focus:ring-amber-500 focus:outline-none font-mono"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-[9px] uppercase tracking-widest font-mono text-neutral-400 block mb-1">Agreement Terms / Purpose Notes</label>
                  <textarea
                    rows={3}
                    placeholder="Document amortization breakdown, collateral guarantees or special deduction conditions here..."
                    value={newLoanNotes}
                    onChange={(e) => setNewLoanNotes(e.target.value)}
                    className="w-full text-xs p-2 rounded-lg border border-[#e3dec9] bg-[#FAF9F5] focus:ring-1 focus:ring-amber-500 focus:outline-none leading-normal"
                  />
                </div>

                <div className="flex justify-end gap-2 pt-2 border-t mt-4">
                  <button
                    type="button"
                    onClick={() => setIsDisburseModalOpen(false)}
                    className="text-neutral-500 font-mono text-xs px-4 py-2 border border-neutral-200 rounded-lg hover:bg-neutral-50 cursor-pointer"
                  >
                    Discard
                  </button>
                  <button
                    type="submit"
                    className="bg-neutral-900 border border-neutral-700 hover:bg-neutral-850 hover:text-amber-400 text-white font-mono font-bold text-xs px-5 py-2 rounded-lg uppercase transition-all flex items-center gap-1 cursor-pointer"
                  >
                    <PlusCircle className="w-4 h-4 text-amber-500" />
                    <span>Approve & Disburse</span>
                  </button>
                </div>

              </form>
            </motion.div>
          </div>
        )}

        {/* RECORD REPAYMENT MODAL DIALOG */}
        {isRepayModalOpen && selectedLoan && (
          <div className="fixed inset-0 bg-neutral-950/40 backdrop-blur-sm flex items-center justify-center z-50">
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white w-full max-w-md rounded-3xl border border-[#e3dec9] shadow-xl p-6 space-y-4 text-left"
            >
              <div className="flex items-center justify-between border-b pb-3 border-neutral-100">
                <h3 className="text-xs font-black tracking-widest uppercase text-neutral-700 font-mono flex items-center gap-2">
                  <Receipt className="w-5 h-5 text-emerald-600 animate-bounce" />
                  <span>Log Capital Repayment Receipt</span>
                </h3>
                <button onClick={() => setIsRepayModalOpen(false)} className="text-neutral-400 hover:text-neutral-600 cursor-pointer">
                  <XCircle className="w-5 h-5" />
                </button>
              </div>

              <div className="bg-[#FAF9F5] p-3 rounded-xl border border-[#e3dec9] text-xs space-y-1">
                <div>Borrower: <strong>{selectedLoan.borrowerName}</strong></div>
                <div>Agreement Code: <strong className="font-mono">{selectedLoan.id}</strong></div>
                <div>Outstanding Balance: <strong className="font-mono text-red-650">₹{(getExpectedWithInterest(selectedLoan) - getPaidTotal(selectedLoan)).toLocaleString('en-IN', { maximumFractionDigits: 1 })}</strong></div>
              </div>

              <form onSubmit={handleRecordRepaymentSubmit} className="space-y-4">
                
                <div>
                  <label className="text-[9px] uppercase tracking-widest font-mono text-neutral-400 block mb-1">Repayment Receipt Amount (INR)</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    placeholder="e.g. 5000"
                    value={repayAmount}
                    onChange={(e) => setRepayAmount(e.target.value)}
                    className="w-full text-xs p-2 rounded-lg border border-[#e3dec9] bg-[#FAF9F5] focus:ring-1 focus:ring-amber-500 focus:outline-none font-mono font-bold text-lg"
                  />
                  <div className="flex gap-1.5 mt-2">
                    <button
                      type="button"
                      onClick={() => {
                        const monthlyEst = Math.ceil(getExpectedWithInterest(selectedLoan) / selectedLoan.durationMonths);
                        setRepayAmount(monthlyEst.toString());
                      }}
                      className="text-[9.5px] font-mono bg-neutral-100/70 hover:bg-neutral-200/80 px-2 py-1 rounded text-neutral-600 border border-neutral-250 cursor-pointer"
                    >
                      Monthly Installment Standard
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        const remaining = getExpectedWithInterest(selectedLoan) - getPaidTotal(selectedLoan);
                        setRepayAmount(remaining.toFixed(2));
                      }}
                      className="text-[9.5px] font-mono bg-neutral-100/70 hover:bg-neutral-200/80 px-2 py-1 rounded text-neutral-650 border border-neutral-250 cursor-pointer"
                    >
                      Full Outstanding Closure
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-[9px] uppercase tracking-widest font-mono text-neutral-400 block mb-1">Payment Method</label>
                    <select
                      value={repayMethod}
                      onChange={(e) => setRepayMethod(e.target.value as any)}
                      className="w-full text-xs p-2 rounded-lg border border-[#e3dec9] bg-[#FAF9F5] focus:ring-1 focus:ring-amber-500 focus:outline-none font-mono"
                    >
                      <option value="cash">💵 Cash Deposit</option>
                      <option value="card">💳 Card Terminal</option>
                      <option value="bank_transfer">🏦 Bank Remittance</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-[9px] uppercase tracking-widest font-mono text-neutral-400 block mb-1">Receipt Date</label>
                    <input
                      type="date"
                      value={repayDate}
                      onChange={(e) => setRepayDate(e.target.value)}
                      className="w-full text-xs p-2 rounded-lg border border-[#e3dec9] bg-[#FAF9F5] focus:ring-1 focus:ring-amber-500 focus:outline-none font-mono"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-3">
                  <div>
                    <label className="text-[9px] uppercase tracking-widest font-mono text-neutral-400 block mb-1">Reference / Transaction / Voucher Code</label>
                    <input
                      type="text"
                      placeholder="e.g. NEFT-90212 or CASH-VCH-883"
                      value={repayCode}
                      onChange={(e) => setRepayCode(e.target.value)}
                      className="w-full text-xs p-2 rounded-lg border border-[#e3dec9] bg-[#FAF9F5] focus:ring-1 focus:ring-amber-500 focus:outline-none font-mono"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-[9px] uppercase tracking-widest font-mono text-neutral-400 block mb-1">Repayment Remarks / Notes</label>
                  <input
                    type="text"
                    placeholder="e.g. Regular monthly installment deducted or bank transfer received"
                    value={repayNotes}
                    onChange={(e) => setRepayNotes(e.target.value)}
                    className="w-full text-xs p-2 rounded-lg border border-[#e3dec9] bg-[#FAF9F5] focus:ring-1 focus:ring-amber-500 focus:outline-none"
                  />
                </div>

                <div className="flex justify-end gap-2 pt-2 border-t mt-4">
                  <button
                    type="button"
                    onClick={() => setIsRepayModalOpen(false)}
                    className="text-neutral-500 font-mono text-xs px-4 py-2 border border-neutral-200 rounded-lg hover:bg-neutral-50 cursor-pointer"
                  >
                    Discard
                  </button>
                  <button
                    type="submit"
                    className="bg-neutral-900 border border-neutral-700 hover:bg-neutral-850 hover:text-amber-400 text-white font-mono font-bold text-xs px-5 py-2 rounded-lg uppercase transition-all flex items-center gap-1 cursor-pointer"
                  >
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 animate-pulse" />
                    <span>Commit Payment</span>
                  </button>
                </div>

              </form>
            </motion.div>
          </div>
        )}

      </AnimatePresence>

    </div>
  );
};
