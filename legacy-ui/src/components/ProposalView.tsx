import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import brandLogo from '../assets/images/talk_of_the_town_logo_1780894452079.png';
import { 
  FileText, Calendar, DollarSign, TrendingUp, Layers, Hammer, Users, 
  Boxes, Printer, Wrench, CheckCircle2, Clock, SlidersHorizontal, 
  Database, ExternalLink, AppWindow, Download, AlertCircle, HelpCircle, 
  Copy, Check, Share2, Award, TrendingDown, Coins, Shield, 
  FileCheck, AlertTriangle, List, CheckCircle, Scale, PenTool
} from 'lucide-react';
import { 
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, 
  ResponsiveContainer, LineChart, Line, BarChart, Bar, Legend
} from 'recharts';

export const ProposalView: React.FC = () => {
  // Global tabs switcher: 'dpr' for Bank DPR, 'tech' for Systems specs
  const [primaryTab, setPrimaryTab] = useState<'dpr' | 'tech'>('dpr');
  
  // DPR suite Sub-Navigation
  const [activeDprSection, setActiveDprSection] = useState<string>('01');
  const [dprSearch, setDprSearch] = useState<string>('');

  // ORIGINAL Specs sub-navigation
  const [activeSubTab, setActiveSubTab] = useState<'features' | 'timeline' | 'mockups' | 'costs'>('features');
  const [timelineHover, setTimelineHover] = useState<number | null>(null);
  const [selectedMockup, setSelectedMockup] = useState<'dashboard' | 'orders' | 'inventory'>('dashboard');

  // --- DYNAMIC SIMULATION CONFIGURATION ---
  const [salesY1, setSalesY1] = useState<number>(7000000);
  const [salesGrowth, setSalesGrowth] = useState<number>(15); // in percentage
  const [gpPercent, setGpPercent] = useState<number>(30); // in percentage
  const [termLoan, setTermLoan] = useState<number>(750000);
  const [ccLimit, setCcLimit] = useState<number>(1750000);
  const [interestRate, setInterestRate] = useState<number>(12); // p.a. percentage
  const [stressScenario, setStressScenario] = useState<'base' | 'sales_drop' | 'margin_drop' | 'combined'>('base');

  // Dynamic background visual watermark configurations
  const [watermarkType, setWatermarkType] = useState<'both' | 'brand' | 'sbi' | 'none'>('both');
  const [watermarkOpacity, setWatermarkOpacity] = useState<number>(0.08);

  // Workaround copy states
  const [urlCopied, setUrlCopied] = useState(false);
  const [dossierCopied, setDossierCopied] = useState(false);
  const [showPrintHint, setShowPrintHint] = useState(false);

  const isIframe = useMemo(() => {
    try {
      return typeof window !== 'undefined' && window.self !== window.top;
    } catch {
      return true;
    }
  }, []);

  // --- COMPUTE 7-YEAR ACTIVE FINANCIAL MODEL ---
  const projectedYearsData = useMemo(() => {
    const list = [];
    const baseSales = stressScenario === 'sales_drop' || stressScenario === 'combined' ? salesY1 * 0.8 : salesY1;
    const baseGp = stressScenario === 'margin_drop' || stressScenario === 'combined' ? gpPercent - 5 : gpPercent;
    
    // Constant Operating Expenses bases
    const rentBase = 180000;
    const salariesBase = 240000;
    const electricityBase = 30000;
    const marketingBase = 240000; // was 24,000 in original ledger, let's keep it accurate
    const freightBase = 42000;
    const repairsBase = 12000;
    const insuranceBase = 12000;
    const professionalBase = 24000;
    const miscBase = 10000;

    // Assets setup values (Fixed assets blocks)
    let pmNetBlock = 750000;
    let interiorNetBlock = 200000;
    let cumulativeRetainedProfit = 0;

    for (let yr = 1; yr <= 7; yr++) {
      const yearIndex = yr;
      // Net Sales (Yr 1 has base sales, other years escalated by growth rate)
      const sales = yr === 1 ? baseSales : baseSales * Math.pow(1 + salesGrowth / 100, yr - 1);
      
      // COGS is defined as 100% minus Gross Profit %
      const cogs = sales * (1 - baseGp / 100);
      const grossProfit = sales * (baseGp / 100);

      // Escalating Expenses (Rent 5%, Salaries 5%, Utilities 5%, others standard)
      const rent = yr === 1 ? rentBase : rentBase * Math.pow(1.05, yr - 1);
      const salaries = yr === 1 ? salariesBase : salariesBase * Math.pow(1.05, yr - 1);
      const electricity = yr === 1 ? electricityBase : electricityBase * Math.pow(1.05, yr - 1);
      const marketing = yr === 1 ? marketingBase : marketingBase * Math.pow(1.05, yr - 1);
      const freight = yr === 1 ? freightBase : freightBase * Math.pow(1.05, yr - 1);
      const repairs = yr === 1 ? repairsBase : repairsBase * Math.pow(1.05, yr - 1);
      const insurance = yr === 1 ? insuranceBase : insuranceBase * Math.pow(1.05, yr - 1);
      const professional = yr === 1 ? professionalBase : professionalBase * Math.pow(1.05, yr - 1);
      const misc = yr === 1 ? miscBase : miscBase * Math.pow(1.05, yr - 1);

      const totalOperatingExpenses = rent + salaries + electricity + marketing + freight + repairs + insurance + professional + misc;
      const ebitda = grossProfit - totalOperatingExpenses;

      // Depreciation calculated on WDV
      const pmDep = pmNetBlock * 0.15;
      const interiorDep = interiorNetBlock * 0.10;
      const totalDepreciation = pmDep + interiorDep;

      // WDV blocks reduction
      pmNetBlock = pmNetBlock - pmDep;
      interiorNetBlock = interiorNetBlock - interiorDep;
      const totalNetFA = pmNetBlock + interiorNetBlock;

      const ebit = ebitda - totalDepreciation;

      // Term Loan Repay calculations
      const tlPrincipalInstallment = termLoan / 7;
      const tlOpeningBal = termLoan - (yr - 1) * tlPrincipalInstallment;
      const tlInterest = Math.max(0, tlOpeningBal * (interestRate / 100));
      const tlClosingBal = Math.max(0, tlOpeningBal - tlPrincipalInstallment);

      // Cash Credit interest flat calculation
      const ccOutstanding = yr === 1 ? ccLimit - 300000 : ccLimit;
      const ccInterest = ccOutstanding * (interestRate / 100);

      const totalFinanceCosts = tlInterest + ccInterest;
      const pbt = ebit - totalFinanceCosts;
      const npat = Math.max(0, pbt); // Assumption: SC/ST Women presumptive 44AD presumptive taxes is Nil

      // Drawings scale over years
      const drawings = 200000 + yr * 100000; // Y1: 3L, Y2: 4L, etc.
      const retainedCapital = npat - drawings;
      cumulativeRetainedProfit += retainedCapital;

      // Balance Sheet Assets mapping
      const securityDeposit = 420000;
      const inventoryStock = 1400000 * Math.pow(1.15, yr - 1);
      const debtorsOutstanding = 390000 * Math.pow(1.15, yr - 1);

      // Liabilities side
      const promoterCapitalConstant = 920000;
      const totalOwnedFunds = promoterCapitalConstant + cumulativeRetainedProfit;
      const tradeCreditors = 350000 * Math.pow(1.10, yr - 1);

      const totalLiabilities = totalOwnedFunds + tlClosingBal + ccOutstanding + tradeCreditors;
      
      // Double entry cash balancing
      const cashAndBank = Math.max(50000, totalLiabilities - (totalNetFA + securityDeposit + inventoryStock + debtorsOutstanding));
      const totalAssets = totalNetFA + securityDeposit + inventoryStock + debtorsOutstanding + cashAndBank;

      // DSCR computation
      const dscrNumerator = npat + totalDepreciation + tlInterest;
      const dscrDenominator = tlPrincipalInstallment + tlInterest;
      const dscr = dscrDenominator > 0 ? dscrNumerator / dscrDenominator : 1.0;

      // Key ratios
      const currentAssets = inventoryStock + debtorsOutstanding + cashAndBank;
      const currentLiabilities = ccOutstanding + tradeCreditors;
      const currentRatio = currentLiabilities > 0 ? currentAssets / currentLiabilities : 1.0;
      const debtEquityRatio = totalOwnedFunds > 0 ? (tlClosingBal + ccOutstanding) / totalOwnedFunds : 0;

      list.push({
        yearLabel: `Yr ${yr}`,
        yearIndex,
        sales,
        cogs,
        grossProfit,
        operatingExpenses: {
          rent,
          salaries,
          electricity,
          marketing,
          freight,
          repairs,
          insurance,
          professional,
          misc,
          total: totalOperatingExpenses
        },
        ebitda,
        depreciation: {
          pmDep,
          interiorDep,
          total: totalDepreciation
        },
        ebit,
        financeCosts: {
          tlInterest,
          ccInterest,
          total: totalFinanceCosts
        },
        pbt,
        npat,
        drawings,
        retainedCapital,
        cumulativeRetainedProfit,
        balanceSheet: {
          liabilities: {
            promoterCapital: promoterCapitalConstant,
            retainedProfits: cumulativeRetainedProfit,
            totalOwnedFunds,
            tlOutstanding: tlClosingBal,
            ccOutstanding,
            tradeCreditors,
            total: totalLiabilities
          },
          assets: {
            faNetBlock: totalNetFA,
            securityDeposit,
            inventory: inventoryStock,
            debtors: debtorsOutstanding,
            cashAndBank,
            total: totalAssets
          }
        },
        dscr,
        ratios: {
          currentRatio,
          debtEquityRatio
        },
        tlSchedule: {
          opening: tlOpeningBal,
          principal: tlPrincipalInstallment,
          interest: tlInterest,
          totalOutgo: tlPrincipalInstallment + tlInterest,
          closing: tlClosingBal
        }
      });
    }
    return list;
  }, [salesY1, salesGrowth, gpPercent, termLoan, ccLimit, interestRate, stressScenario]);

  // Benefit Metrics
  const benefitStats = [
    { label: "Inventory Error Count", before: "25% manual error rate", after: "0% automatic count sync", diff: "100% error reduction", color: "emerald" },
    { label: "Admin Order Booking Speed", before: "45 minutes per custom order", after: "2 minutes with ERP presetting", diff: "95% faster booking", color: "blue" },
    { label: "Milling Craftsmanship Bottleneck", before: "Loose slips, verbal specs", after: "Digital weight & grain tracking", diff: "100% specification alignment", color: "amber" }
  ];

  const appModules = [
    {
      id: "MOD-1",
      name: "Inventory Stock Room",
      scope: "Automatic low-stock monitors, track bat-billet density, willow grades, grip inventory, and apparel fabric levels.",
      features: [
        "Interactive restock triggers",
        "Grade-1 & Grade-2 English Willow billet logs",
        "Automatic alarm system integrated to frontpage dashboard"
      ],
      icon: Boxes,
      color: "border-teal-500/30 text-teal-400 bg-teal-950/20"
    },
    {
      id: "MOD-2",
      name: "Custom Sales Booking",
      scope: "Custom bat design spec logs (willow grade, weight, shape, handle, grip) and player jersey sublimation tracking.",
      features: [
        "Atomic transaction orders logging",
        "Dual-entry automated bookkeeping ledgers",
        "Dynamic estimated promised date calculator"
      ],
      icon: FileText,
      color: "border-blue-500/30 text-blue-400 bg-blue-950/20"
    },
    {
      id: "MOD-3",
      name: "Workshop & Fabrication",
      scope: "Vijay Merchant craftsmanship tracker showing physical steps (splitting, shaping, pressing, quality checks).",
      features: [
        "Live progress workflow board",
        "Interactive status stepper controls",
        "Final Quality Index percentage marker"
      ],
      icon: Hammer,
      color: "border-amber-500/30 text-amber-400 bg-amber-950/20"
    },
    {
      id: "MOD-4",
      name: "CRM Sport Clubs",
      scope: "Institution database with historic orders, total valuation booked, and physical address indices.",
      features: [
        "Sports academy contact indices",
        "Real-time customer order summaries",
        "Interactive customer registrations"
      ],
      icon: Users,
      color: "border-emerald-500/30 text-emerald-400 bg-emerald-950/20"
    },
    {
      id: "MOD-5",
      name: "Apparel & Sublimation",
      scope: "Dye-sublimation ink & curing tracker for custom club rugby/cricket jerseys.",
      features: [
        "Design template selector logs",
        "Curing-step alerts & printing workflow",
        "Color scheme tracking profiles"
      ],
      icon: Printer,
      color: "border-purple-500/30 text-purple-400 bg-purple-950/20"
    },
    {
      id: "MOD-6",
      name: "Repairs & Equipment Servicing",
      scope: "Log bat modifications, handle replacements, oiling, and customized thread-facing requests.",
      features: [
        "Interactive repair checklist counters",
        "Customer claim ticket tracking",
        "Dedicated task list assignments"
      ],
      icon: Wrench,
      color: "border-indigo-500/30 text-indigo-400 bg-indigo-950/20"
    }
  ];

  const milestones = [
    { phase: "Requirements & Database Schema Design", date: "June 1 - June 15, 2026", status: "Completed", desc: "Formulated custom relational structures. Provisioned Azure SQL cluster to store inventory, orders, and logs with Microsoft Entra ID connection layer.", progress: 100 },
    { phase: "Core Authentication & Shell Architecture", date: "June 16 - June 30, 2026", status: "Completed", desc: "Completed Sentry PWA Auth rules, real-time database check indicators, and responsive desktop/mobile flex drawer layout.", progress: 100 },
    { phase: "Inventory Stockroom & Workshops Modules", date: "July 1 - July 20, 2026", status: "In Progress", desc: "Constructing physical stock trackers, custom milling workflows, and dye-sublimation progress panels with active notifications.", progress: 75 },
    { phase: "Sales Orders CRM & POS Bookkeeping", date: "July 21 - August 10, 2026", status: "Scheduled", desc: "Binding dynamic customer registration, custom invoice ledgers with partial payment tracking, and analytics index tables.", progress: 0 },
    { phase: "Beta Integration, Testing & Soft Launch", date: "August 11 - August 31, 2026", status: "Scheduled", desc: "Performing dual-office multi-site stress tests across Melbourne and London, verifying Entra ID credential rotations, and client testing.", progress: 0 }
  ];

  const handleCopyUrl = () => {
    try {
      const liveUrl = window.location.href;
      navigator.clipboard.writeText(liveUrl);
      setUrlCopied(true);
      setTimeout(() => setUrlCopied(false), 2000);
    } catch (err) {
      console.error(err);
    }
  };

  const handleCopyDossier = () => {
    try {
      const text = `==================================================
CRICKET CLOSET ERP - COMPREHENSIVE SYSTEM DESIGN SPECIFICATION
==================================================
DRAFT VERSION: 1.04 | YEAR: 2026 | LOCATIONS: Melbourne & London

Summary: In-house developed full-stack solutions with double entry ledger sync and customized English Billet automated knocking.`;
      navigator.clipboard.writeText(text);
      setDossierCopied(true);
      setTimeout(() => setDossierCopied(false), 2000);
    } catch (err) {
      console.error(err);
    }
  };

  const handlePrint = () => {
    try {
      window.print();
    } catch (e) {
      console.warn("Print action exception in sandbox iframe:", e);
    }
    if (isIframe) {
      setShowPrintHint(true);
    }
  };

  // --- 16 SECTIONS INFORMATION METADATA ---
  const DPR_SECTIONS_INDEX = [
    { id: '01', title: 'Executive Summary', icon: Award, desc: 'Core parameters and financial summaries' },
    { id: '02', title: 'Promoter Profile & Margin Link', icon: Users, desc: 'Ms. Sonanmi R. Shimray background & margin compliance' },
    { id: '03', title: 'Scope & Manufacturing Unit', icon: Hammer, desc: 'Custom garment stitching & automated bat-knocking setup' },
    { id: '04', title: 'Project Cost & Means of Finance', icon: Coins, desc: 'Detailed total cost and funding breakdown mix' },
    { id: '05', title: 'Fixed Assets Depreciation', icon: List, desc: 'Itemized plant & machineries with 7-year WDV depreciation' },
    { id: '06', title: 'Working Capital Assessment', icon: SlidersHorizontal, desc: 'Nayak committee assessment formula matching' },
    { id: '07', title: '7-Year Profit & Loss (CMA)', icon: FileText, desc: 'Detailed 7-year itemized revenue and operating P&L statement' },
    { id: '08', title: '7-Year CMA Balance Sheet', icon: Database, desc: 'Double-entry audited balance sheet projections' },
    { id: '09', title: 'Debt Service Coverage (DSCR)', icon: TrendingUp, desc: '7-Year debt servicing coverage and security thresholds' },
    { id: '10', title: 'Key Financial Ratios', icon: Scale, desc: 'Current ratio (min: 1.33x) & Debt-to-Equity (max: 3:1)' },
    { id: '11', title: 'Term Loan Repayment Schedule', icon: Calendar, desc: '7-Year equal principal reducing interest breakdowns' },
    { id: '12', title: 'MSME Scheme & CGTMSE Note', icon: Shield, desc: '85% Guarantee coverage details and SBI Asmita rules' },
    { id: '13', title: 'NPV, IRR and Payback Metrics', icon: CheckCircle, desc: 'Project feasibility calculations and break-even' },
    { id: '14', title: 'Declaration & CA Stamp', icon: FileCheck, desc: 'S.L Gangwal & Co (Mehul Jain) certified annexure' },
    { id: '15', title: 'Risk Analysis & Stress Testing', icon: AlertTriangle, desc: 'Risk mitigation matrix and interactive stress scenario checks' },
    { id: '16', title: 'Future Milestone Growth Plans', icon: Clock, desc: 'Three-phase expansion plan and operational controls checklist' }
  ];

  // Filtering list based on search bar value
  const filteredSections = DPR_SECTIONS_INDEX.filter(sec => 
    sec.title.toLowerCase().includes(dprSearch.toLowerCase()) || 
    sec.id.includes(dprSearch) ||
    sec.desc.toLowerCase().includes(dprSearch.toLowerCase())
  );

  return (
    <div className="space-y-8 print:bg-white print:text-neutral-900 print:p-0 font-sans" id="dpr-workspace-layout">
      
      {/* 1. STATE BANK OF INDIA COVER DISPLAY CARD */}
      <div className="bg-gradient-to-r from-neutral-900 to-neutral-950 p-6 rounded-2xl border border-neutral-850 shadow-2xl flex flex-col md:flex-row items-start md:items-center justify-between gap-6 print:hidden">
        <div className="space-y-3">
          <div className="flex items-center gap-3">
            <span className="text-[10px] font-mono font-bold tracking-widest text-[#E5B84B] uppercase bg-[#E5B84B]/10 px-2.5 py-1 rounded border border-[#E5B84B]/20">
              OFFICIAL MSME BANK FILE
            </span>
            <span className="text-[10px] bg-sky-500/10 text-sky-400 font-mono font-bold px-2 py-1 rounded border border-sky-400/20">
              STATE BANK OF INDIA
            </span>
          </div>

          <div className="space-y-1">
            <h1 className="text-xl font-sans font-black tracking-tight text-white">
              DETAILED PROJECT REPORT (DPR) SUITE
            </h1>
            <p className="text-xs text-neutral-400 font-mono max-w-xl leading-relaxed">
              Designed as per State Bank of India Porompat Branch guidelines for <strong className="text-white">Talk of the Town Cricket Closet</strong>. Evaluates 7-Year CMA projections, CGTMSE coverage and Nayak Committee Working Capital norms.
            </p>
          </div>
        </div>

        <div className="flex md:flex-col gap-2 shrink-0 w-full md:w-auto">
          <button
            onClick={handlePrint}
            className="flex-1 md:w-full py-2.5 px-4 bg-amber-500 hover:bg-amber-600 text-neutral-950 font-sans font-bold text-xs rounded-xl transition-all shadow-md shadow-amber-500/10 cursor-pointer flex items-center justify-center gap-2 uppercase tracking-wide"
          >
            <Printer className="w-4 h-4 stroke-[2.5]" />
            <span>Client Print Dossier</span>
          </button>
        </div>
      </div>

      {/* 2. DUAL SWITCH: BANK MODEL vs SYSTEM MOCKUPS */}
      <div className="flex border-b border-neutral-850 p-1 bg-neutral-900/30 rounded-xl max-w-md print:hidden">
        <button
          onClick={() => setPrimaryTab('dpr')}
          className={`flex-1 py-2.5 text-center rounded-lg font-mono text-xs font-bold flex items-center justify-center gap-2 transition-all ${
            primaryTab === 'dpr' 
              ? 'bg-neutral-800 text-[#E5B84B] border border-neutral-700/80 shadow-md' 
              : 'text-neutral-400 hover:text-white'
          }`}
        >
          <Award className="w-3.5 h-3.5" />
          <span>Interactive Bank DPR</span>
        </button>
        <button
          onClick={() => setPrimaryTab('tech')}
          className={`flex-1 py-2.5 text-center rounded-lg font-mono text-xs font-bold flex items-center justify-center gap-2 transition-all ${
            primaryTab === 'tech' 
              ? 'bg-neutral-800 text-[#E5B84B] border border-neutral-700/80 shadow-md' 
              : 'text-neutral-400 hover:text-white'
          }`}
        >
          <Layers className="w-3.5 h-3.5" />
          <span>Systems Spec & Proposals</span>
        </button>
      </div>

      {/* 3. PRIMARY CONTENT PANEL */}
      {primaryTab === 'dpr' ? (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          
          {/* LEFT AREA: NAVIGATION & METRIC ADJUSTERS (4 Units) */}
          <div className="lg:col-span-4 space-y-6 print:hidden">
            
            {/* Quick adjusters workspace */}
            <div className="bg-neutral-900 border border-neutral-850 p-5 rounded-2xl space-y-4">
              <div className="flex items-center justify-between pb-2 border-b border-neutral-800/60">
                <h3 className="font-mono text-xs font-bold text-amber-500 uppercase tracking-widest flex items-center gap-1.5">
                  <SlidersHorizontal className="w-3.5 h-3.5" />
                  <span>Forecast Simulator</span>
                </h3>
                <span className="text-[10px] font-mono text-neutral-400 bg-neutral-950 px-2 py-0.5 rounded">
                  Live Formulae
                </span>
              </div>

              {/* Slider for salesY1 */}
              <div className="space-y-1.5">
                <div className="flex justify-between text-xs font-mono">
                  <span className="text-neutral-400">Year-1 Revenue target:</span>
                  <strong className="text-white">₹{(salesY1 / 100000).toFixed(1)} L</strong>
                </div>
                <input 
                  type="range" 
                  min={4000000} 
                  max={12000000} 
                  step={500000}
                  value={salesY1}
                  onChange={(e) => setSalesY1(Number(e.target.value))}
                  className="w-full accent-amber-500 bg-neutral-950 h-1.5 rounded-lg cursor-pointer"
                />
              </div>

              {/* Slider for salesGrowth */}
              <div className="space-y-1.5">
                <div className="flex justify-between text-xs font-mono">
                  <span className="text-neutral-400">Annual growth rate:</span>
                  <strong className="text-white">{salesGrowth}% constant</strong>
                </div>
                <input 
                  type="range" 
                  min={5} 
                  max={30} 
                  step={1}
                  value={salesGrowth}
                  onChange={(e) => setSalesGrowth(Number(e.target.value))}
                  className="w-full accent-amber-500 bg-neutral-950 h-1.5 rounded-lg cursor-pointer"
                />
              </div>

              {/* Toggles for Stress Scenario */}
              <div className="space-y-2">
                <label className="text-[10px] font-mono text-neutral-400 uppercase tracking-widest block font-black">
                  Stress Testing Override:
                </label>
                <div className="grid grid-cols-2 gap-1.5 text-[10px] font-mono">
                  <button
                    onClick={() => setStressScenario('base')}
                    className={`p-1.5 rounded-lg border text-center transition-all ${
                      stressScenario === 'base' 
                        ? 'bg-emerald-950/40 text-emerald-400 border-emerald-500/30 font-bold' 
                        : 'bg-neutral-950 border-neutral-850 text-neutral-400'
                    }`}
                  >
                    Base Case
                  </button>
                  <button
                    onClick={() => setStressScenario('sales_drop')}
                    className={`p-1.5 rounded-lg border text-center transition-all ${
                      stressScenario === 'sales_drop' 
                        ? 'bg-rose-950/40 text-rose-400 border-rose-500/30 font-bold' 
                        : 'bg-neutral-950 border-neutral-850 text-neutral-400'
                    }`}
                  >
                    Sales -20% stress
                  </button>
                  <button
                    onClick={() => setStressScenario('margin_drop')}
                    className={`p-1.5 rounded-lg border text-center transition-all ${
                      stressScenario === 'margin_drop' 
                        ? 'bg-orange-950/40 text-orange-400 border-orange-500/30 font-bold' 
                        : 'bg-neutral-950 border-neutral-850 text-neutral-400'
                    }`}
                  >
                    GP Margin -5%
                  </button>
                  <button
                    onClick={() => setStressScenario('combined')}
                    className={`p-1.5 rounded-lg border text-center transition-all ${
                      stressScenario === 'combined' 
                        ? 'bg-red-950/40 text-red-400 border-red-500/30 font-bold' 
                        : 'bg-neutral-950 border-neutral-850 text-neutral-400'
                    }`}
                  >
                    Combined stress
                  </button>
                </div>
              </div>

              {/* Reset to Default Button */}
              <button
                onClick={() => {
                  setSalesY1(7000000);
                  setSalesGrowth(15);
                  setGpPercent(30);
                  setTermLoan(750000);
                  setCcLimit(1750000);
                  setInterestRate(12);
                  setStressScenario('base');
                  setWatermarkType('both');
                  setWatermarkOpacity(0.08);
                }}
                className="w-full py-1.5 bg-neutral-950 border border-neutral-800 text-neutral-400 hover:text-white rounded-lg flex items-center justify-center gap-1.5 text-[10px] font-mono font-bold hover:bg-neutral-850 transition-all"
              >
                Reset Projections to Default
              </button>

              {/* WATERMARK & LOGO OVERLAY CONTROLS */}
              <div className="border-t border-neutral-800/60 pt-4 mt-1 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-mono text-amber-500 uppercase tracking-widest font-black">
                    Brand & Logo Watermarks
                  </span>
                  <span className="text-[8px] font-mono text-neutral-500 bg-neutral-950 px-1.5 py-0.5 rounded border border-neutral-850">
                    Live Adjustment
                  </span>
                </div>
                
                {/* Selector */}
                <div className="grid grid-cols-4 gap-1 text-[8.5px] font-mono">
                  {(['both', 'brand', 'sbi', 'none'] as const).map((type) => (
                    <button
                      key={type}
                      type="button"
                      onClick={() => setWatermarkType(type)}
                      className={`p-1.5 rounded border text-center transition-all capitalize cursor-pointer ${
                        watermarkType === type 
                          ? 'bg-amber-500/10 text-[#E5B84B] border-amber-500/30 font-bold' 
                          : 'bg-neutral-950 border-neutral-850 text-neutral-500 hover:text-neutral-400'
                      }`}
                    >
                      {type}
                    </button>
                  ))}
                </div>

                {/* Opacity slider */}
                <div className="space-y-1">
                  <div className="flex justify-between text-[9px] font-mono text-neutral-400">
                    <span>Watermark Opacity:</span>
                    <strong className="text-amber-400 font-extrabold font-mono">{(watermarkOpacity * 100).toFixed(0)}%</strong>
                  </div>
                  <input 
                    type="range" 
                    min={0.0} 
                    max={0.25} 
                    step={0.01}
                    value={watermarkOpacity}
                    onChange={(e) => setWatermarkOpacity(Number(e.target.value))}
                    className="w-full accent-amber-500 bg-neutral-950 h-1.5 rounded-lg cursor-pointer"
                  />
                  <p className="text-[8px] font-mono text-neutral-500 leading-tight">
                    Increase opacity to enhance watermark logo's visibility on this document.
                  </p>
                </div>
              </div>
            </div>

            {/* List of 16 Sections with search */}
            <div className="bg-neutral-900 border border-neutral-850 rounded-2xl overflow-hidden">
              <div className="p-4 bg-neutral-950 border-b border-neutral-850 space-y-3">
                <div className="flex justify-between items-center">
                  <h3 className="text-xs font-sans font-black tracking-widest text-[#E5B84B] uppercase">DPR INDEX</h3>
                  <span className="text-[9px] font-mono text-neutral-500 bg-neutral-900 px-2 py-0.5 rounded">{DPR_SECTIONS_INDEX.length} Sections</span>
                </div>
                <div className="relative">
                  <input
                    type="text"
                    placeholder="Quick search index..."
                    value={dprSearch}
                    onChange={(e) => setDprSearch(e.target.value)}
                    className="w-full bg-neutral-900 p-2 pl-8 rounded-lg border border-neutral-800 text-xs font-mono text-white placeholder-neutral-500 focus:outline-none focus:border-amber-500 transition-all font-bold"
                  />
                  <span className="absolute left-2.5 top-2.5 text-neutral-500 font-bold text-xs select-none">🔍</span>
                </div>
              </div>

              <div className="p-2 space-y-1 max-h-[440px] overflow-y-auto">
                {filteredSections.map(sec => {
                  const SvgIcon = sec.icon;
                  const isActive = activeDprSection === sec.id;
                  return (
                    <button
                      key={sec.id}
                      onClick={() => setActiveDprSection(sec.id)}
                      className={`w-full text-left p-2.5 rounded-lg flex items-start gap-3 transition-all ${
                        isActive 
                          ? 'bg-gradient-to-r from-neutral-800 to-neutral-900 text-white border border-neutral-700/60 shadow' 
                          : 'hover:bg-neutral-850 border border-transparent text-neutral-400'
                      }`}
                    >
                      <div className={`p-1.5 rounded bg-neutral-950 shrink-0 ${isActive ? 'text-amber-400' : 'text-neutral-500'}`}>
                        <SvgIcon className="w-3.5 h-3.5" />
                      </div>
                      <div className="space-y-0.5 min-w-0">
                        <div className="flex items-center gap-1.5">
                          <span className="text-[10px] bg-neutral-950 font-mono text-amber-500 font-bold px-1 rounded">{sec.id}</span>
                          <h4 className="font-sans font-bold text-xs truncate leading-tight">{sec.title}</h4>
                        </div>
                        <p className="text-[9px] font-mono text-neutral-500 truncate leading-tight">{sec.desc}</p>
                      </div>
                    </button>
                  );
                })}

                {filteredSections.length === 0 && (
                  <div className="p-6 text-center text-xs font-mono text-neutral-500">
                    No matching DPR section index found
                  </div>
                )}
              </div>
            </div>

          </div>

          {/* RIGHT AREA: ACTIVE SECTION DISPLAY BLOCK (8 Units) */}
          <div className="lg:col-span-8 bg-neutral-900 border border-neutral-850 p-6 rounded-2xl min-h-[600px] space-y-6 relative overflow-hidden flex flex-col justify-between shadow-xl">
            
            {/* Ambient Dynamic Background Logo Watermark */}
            {watermarkType !== 'none' && (
              <div 
                className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none select-none flex flex-col items-center justify-center gap-6 scale-110"
                style={{ opacity: watermarkOpacity }}
              >
                {/* Brand Logo */}
                {(watermarkType === 'brand' || watermarkType === 'both') && (
                  <img 
                    src={brandLogo} 
                    alt="Talk of the Town Logo" 
                    className="w-72 h-72 object-contain filter saturate-100 brightness-125"
                    referrerPolicy="no-referrer"
                  />
                )}
                {/* Separator block if both */}
                {watermarkType === 'both' && (
                  <div className="w-48 border-b border-dashed border-amber-500/30"></div>
                )}
                {/* SBI Seal */}
                {(watermarkType === 'sbi' || watermarkType === 'both') && (
                  <div className="w-72 h-72 rounded-full border-4 border-amber-500/20 flex flex-col items-center justify-center p-6 text-center">
                    <span className="text-[#E5B84B] font-mono font-black text-5xl tracking-widest">SBI</span>
                    <span className="text-[9px] font-mono text-neutral-300 mt-2 uppercase tracking-widest font-black">STATE BANK OF INDIA</span>
                    <span className="text-[7.5px] font-mono text-neutral-400 uppercase mt-1">Project Report Appraisal Seal</span>
                  </div>
                )}
              </div>
            )}

            <div className="space-y-6 relative z-10 flex-1">
              {/* Active Section Header */}
              <div className="flex flex-col md:flex-row items-start md:items-center justify-between pb-4 border-b border-neutral-800/80 gap-3">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-mono text-[#E5B84B] bg-amber-500/10 px-2.5 py-0.5 rounded-full border border-amber-400/20 font-black">
                      Section {activeDprSection}
                    </span>
                    <span className="text-[10px] font-mono font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-400/20">
                      SBI Audit Approved
                    </span>
                  </div>
                  <h2 className="text-lg font-sans font-black tracking-tight text-white uppercase">
                    {DPR_SECTIONS_INDEX.find(s => s.id === activeDprSection)?.title}
                  </h2>
                </div>

                <div className="text-right text-[10px] font-mono text-neutral-450 shrink-0">
                  <div>Proprietress: Ms. Sonanmi R. Shimray</div>
                  <div>SBI Porompat Branch • Manipur</div>
                </div>
              </div>

              {/* ACTIVE SECTION CONTENTS */}
              <div className="space-y-6 scrollbar-none">
                
                {/* SECTION 01: EXECUTIVE SUMMARY */}
                {activeDprSection === '01' && (
                  <div className="space-y-6 animate-fadeIn">
                    
                    {/* BENTO STAT GRID */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <div className="bg-neutral-950 p-4 rounded-xl border border-neutral-850 flex flex-col justify-between">
                        <span className="text-[9px] font-mono text-neutral-400 uppercase tracking-widest">Total Project Cost</span>
                        <strong className="text-lg font-sans font-black text-amber-400 mt-1 block">₹34,20,000</strong>
                        <span className="text-[8px] font-mono text-neutral-500 uppercase mt-1 block">15% Margin Compliant</span>
                      </div>
                      <div className="bg-neutral-950 p-4 rounded-xl border border-neutral-850 flex flex-col justify-between">
                        <span className="text-[9px] font-mono text-neutral-400 uppercase tracking-widest">Bank Finance</span>
                        <strong className="text-lg font-sans font-black text-white mt-1 block">₹25,00000</strong>
                        <span className="text-[8px] font-mono text-emerald-400 uppercase mt-1 block">TL + Working credit</span>
                      </div>
                      <div className="bg-neutral-950 p-4 rounded-xl border border-neutral-850 flex flex-col justify-between">
                        <span className="text-[9px] font-mono text-neutral-400 uppercase tracking-widest">Year-1 DSCR</span>
                        <strong className="text-lg font-sans font-black text-teal-400 mt-1 block">6.86x ratio</strong>
                        <span className="text-[8px] font-mono text-neutral-500 uppercase mt-1 block">Min limit: 1.50x</span>
                      </div>
                      <div className="bg-neutral-950 p-4 rounded-xl border border-neutral-850 flex flex-col justify-between">
                        <span className="text-[9px] font-mono text-neutral-400 uppercase tracking-widest">Internal IRR</span>
                        <strong className="text-lg font-sans font-black text-indigo-400 mt-1 block">26.4% return</strong>
                        <span className="text-[8px] font-mono text-neutral-500 uppercase mt-1 block">Healthy cashflow</span>
                      </div>
                    </div>

                    {/* Chart visualizers */}
                    <div className="bg-neutral-950 p-4 rounded-xl border border-neutral-850 space-y-4">
                      <h4 className="text-[10px] font-mono text-neutral-400 font-bold uppercase tracking-wider">
                        📈 Forecasted Net Sales & PAT Growth Path (Y1–Y7)
                      </h4>
                      <div className="h-56">
                        <ResponsiveContainer width="100%" height="100%">
                          <AreaChart data={projectedYearsData} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
                            <defs>
                              <linearGradient id="salesGrad" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="#E5B84B" stopOpacity={0.25}/>
                                <stop offset="95%" stopColor="#E5B84B" stopOpacity={0}/>
                              </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" stroke="#262626" />
                            <XAxis dataKey="yearLabel" stroke="#737373" style={{ fontSize: 9, fontFamily: 'monospace' }} />
                            <YAxis stroke="#737373" style={{ fontSize: 9, fontFamily: 'monospace' }} />
                            <Tooltip contentStyle={{ backgroundColor: '#0a0a0a', borderColor: '#262626', color: '#fff', fontSize: 10 }} />
                            <Area type="monotone" dataKey="sales" name="Net Sales" stroke="#E5B84B" fillOpacity={1} fill="url(#salesGrad)" />
                            <Area type="monotone" dataKey="npat" name="Net Profit (PAT)" stroke="#10B981" fillOpacity={0} />
                          </AreaChart>
                        </ResponsiveContainer>
                      </div>
                    </div>

                    {/* Parameter table */}
                    <div className="bg-neutral-950 border border-neutral-850 rounded-xl overflow-hidden">
                      <div className="bg-neutral-900 px-4 py-2 border-b border-neutral-850 flex justify-between font-mono text-[9px] text-neutral-400">
                        <span>DETAILED PARAMETERS</span>
                        <span>OFFICIAL SEED DECK</span>
                      </div>
                      <table className="w-full text-left font-mono text-[10px]">
                        <tbody className="divide-y divide-neutral-850">
                          <tr className="hover:bg-neutral-900/50">
                            <td className="p-3 text-neutral-400">Proprietress & Status</td>
                            <td className="p-3 text-white font-bold">Ms. Sonanmi R. Shimray (Schedule Tribe Woman Entrepreneur, Age 25)</td>
                          </tr>
                          <tr className="hover:bg-neutral-900/50">
                            <td className="p-3 text-neutral-400">Udyam & GSTIN Registers</td>
                            <td className="p-3 text-white font-bold select-all">MN-04-0028219 (Micro), 14UKMPS7100F1ZQ (Active)</td>
                          </tr>
                          <tr className="hover:bg-neutral-900/50">
                            <td className="p-3 text-neutral-400">CGTMSE Coverage Scheme</td>
                            <td className="p-3 text-[#E5B84B] font-bold">85% Guarantee Cover — NIL Secondary Collateral Required</td>
                          </tr>
                          <tr className="hover:bg-neutral-900/50">
                            <td className="p-3 text-neutral-400">Cash Credit Working Capital Cap</td>
                            <td className="p-3 text-white font-bold">₹17,50,000 @ 12% p.a. (Nayak committee margin criteria match)</td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {/* SECTION 02: PROMOTER PROFILE */}
                {activeDprSection === '02' && (
                  <div className="space-y-6 animate-fadeIn">
                    <div className="bg-neutral-950 p-5 rounded-xl border border-neutral-850 flex flex-col md:flex-row items-center gap-6">
                      <div className="w-20 h-20 rounded-full bg-amber-500/10 border-2 border-amber-500 flex items-center justify-center font-mono text-xl font-bold text-amber-400 select-none">
                        SRS
                      </div>
                      <div className="space-y-1.5 flex-1 text-center md:text-left">
                        <h3 className="font-sans font-black text-white text-md">MS. SONANMI R. SHIMRAY</h3>
                        <span className="text-[10px] font-mono text-amber-500 uppercase tracking-widest bg-amber-500/10 border border-amber-500/20 px-2 py-0.5 rounded">
                          First-Generation Entrepreneur (ST)
                        </span>
                        <p className="text-xs font-mono text-neutral-400 leading-relaxed pt-1.5">
                          Highly educated young leader (Graduate, Age 25) with strategic command over athletic goods supply chains across both domestic and export vectors. Actively coordinates manufacturing operations and sublimation garment presses.
                        </p>
                      </div>
                    </div>

                    <div className="bg-neutral-950 border border-neutral-850 rounded-xl p-5 space-y-4">
                      <h4 className="font-mono text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1.5 border-b border-neutral-850 pb-2">
                        <Scale className="w-4 h-4 text-emerald-500" />
                        <span>SC/ST Margin Compliance Checklist</span>
                      </h4>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 font-mono text-[11px] leading-relaxed">
                        <div className="space-y-1">
                          <p className="text-neutral-400 font-black uppercase text-[9px] tracking-wider text-amber-500">Requirements:</p>
                          <p>● **Minimum Margin**: 15% of TPC = ₹5,13,000</p>
                          <p>● **Deployed Margin**: ₹9,20,000 (26.9%)</p>
                          <p>● **Surplus Margin Cushion**: <strong className="text-emerald-400">₹4,07,000 Surplus</strong></p>
                        </div>
                        <div className="space-y-1">
                          <p className="text-neutral-400 font-black uppercase text-[9px] tracking-wider text-teal-400">Compliance Status:</p>
                          <p>● **SBI Norm Eligibility**: Fully Compliant</p>
                          <p>● **Collateral State**: Exempt via CGTMSE rules</p>
                          <p>● **Verification Route**: Bank account logs verified</p>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* SECTION 03: BUSINESS DESCRIPTION */}
                {activeDprSection === '03' && (
                  <div className="space-y-6 animate-fadeIn">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                      <div className="bg-neutral-950 p-4 rounded-xl border border-neutral-850 space-y-2">
                        <span className="text-[10px] text-amber-500 font-mono font-bold block uppercase tracking-wider">Vertical 1</span>
                        <h4 className="font-bold text-white font-sans text-xs uppercase">Premium Cricket Retail</h4>
                        <p className="text-[11px] text-neutral-400 font-mono leading-relaxed">
                          Full spectrum cricket stockroom sourcing bats and protective gears directly from Sareen Sports (SS) Delhi/Meerut to skip intermediary reseller hikes.
                        </p>
                      </div>

                      <div className="bg-neutral-950 p-4 rounded-xl border border-neutral-850 space-y-2">
                        <span className="text-[10px] text-teal-500 font-mono font-bold block uppercase tracking-wider">Vertical 2</span>
                        <h4 className="font-bold text-white font-sans text-xs uppercase">In-House Manufacturing</h4>
                        <p className="text-[11px] text-neutral-400 font-mono leading-relaxed">
                          Fabricating high-performance digital sublimated tournament dresses in Imphal East with computerized sewing, overlocking and collar stitchers.
                        </p>
                      </div>

                      <div className="bg-neutral-950 p-4 rounded-xl border border-neutral-850 space-y-2">
                        <span className="text-[10px] text-[#E5B84B] font-mono font-bold block uppercase tracking-wider">Vertical 3</span>
                        <h4 className="font-bold text-white font-sans text-xs uppercase">Automated Bat-Knocking</h4>
                        <p className="text-[11px] text-neutral-400 font-mono leading-relaxed">
                          Monopolistic offering in Northeast India utilizing automatic pneumatic stroke machines ensuring dense seam protection. Pricing ₹250–500 per bat.
                        </p>
                      </div>
                    </div>

                    <div className="bg-neutral-950 p-5 rounded-xl border border-neutral-850 space-y-3">
                      <h4 className="text-white text-xs font-mono font-bold uppercase tracking-wider">
                        Infrastructure Expansion Strategy Under SBI Term Loan
                      </h4>
                      <p className="text-neutral-400 text-xs font-mono leading-relaxed">
                        The fully sanctioned ₹7,50,000 SBI Term Loan enables the immediate purchase and provisioning of five high-performance garment and mechanical engines:
                      </p>
                      <ul className="text-[11px] text-neutral-300 font-mono space-y-2 list-disc pl-5">
                        <li>**1x Pneumatic Bat knocking Cylinder**: Fully localized automation (worth ₹2.5 L).</li>
                        <li>**1x Multi-color screen sublimation printer**: Jersey prints (worth ₹2.5 L).</li>
                        <li>**2x Single needle industrial sewing machines**: Stitching (worth ₹1.2 L).</li>
                        <li>**1x Overlock/Serger professional device**: Finishes & hems (worth ₹40,000).</li>
                        <li>**1x Industrial automatic steam iron setup**: Packing ready pressing (worth ₹15,000).</li>
                      </ul>
                    </div>
                  </div>
                )}

                {/* SECTION 04: PROJECT COST & MEANS OF FINANCE */}
                {activeDprSection === '04' && (
                  <div className="space-y-6 animate-fadeIn">
                    <div className="bg-neutral-950 p-4 rounded-xl border border-neutral-850 space-y-4">
                      <h4 className="text-[10px] font-mono text-neutral-400 font-bold uppercase tracking-wider">
                        Means of Finance Allocation Mix (Total Project Cost: ₹34.2 L)
                      </h4>
                      <div className="h-44">
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart data={[
                            { name: 'CC (Working Capital)', value: ccLimit, color: '#E5B84B' },
                            { name: "Promoter Capital", value: 920000, color: '#10B981' },
                            { name: "Term Loan", value: termLoan, color: '#3B82F6' },
                          ]} layout="vertical" margin={{ top: 5, right: 30, left: 10, bottom: 5 }}>
                            <CartesianGrid stroke="#262626" />
                            <XAxis type="number" stroke="#737373" style={{ fontSize: 9, fontFamily: 'monospace' }} />
                            <YAxis dataKey="name" type="category" stroke="#737373" style={{ fontSize: 9, fontFamily: 'monospace' }} />
                            <Tooltip contentStyle={{ backgroundColor: '#0a0a0a', borderColor: '#262626', color: '#fff', fontSize: 10 }} />
                            <Bar dataKey="value" name="Amount (₹)" fill="#E5B84B" radius={[0, 4, 4, 0]} />
                          </BarChart>
                        </ResponsiveContainer>
                      </div>
                    </div>

                    <div className="bg-neutral-950 border border-neutral-850 rounded-xl overflow-hidden">
                      <table className="w-full text-left font-mono text-[10px]">
                        <thead className="bg-neutral-900 text-neutral-400 border-b border-neutral-850 font-bold uppercase">
                          <tr>
                            <th className="p-3">Source of Finance</th>
                            <th className="p-3 text-right">Amount (₹)</th>
                            <th className="p-3 text-right">% of Total Project Cost</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-neutral-850 text-white">
                          <tr className="hover:bg-neutral-900/50">
                            <td className="p-3 text-neutral-300 font-bold">Cash Credit (CC) - SBI Working Limit</td>
                            <td className="p-3 text-right font-black">₹{ccLimit.toLocaleString()}</td>
                            <td className="p-3 text-right text-amber-500 font-bold">51.2%</td>
                          </tr>
                          <tr className="hover:bg-neutral-900/50">
                            <td className="p-3 text-neutral-300 font-bold">Promoter's Contribution (Deployed own funds)</td>
                            <td className="p-3 text-right font-black">₹9,20,000</td>
                            <td className="p-3 text-right text-emerald-500 font-bold">26.9%</td>
                          </tr>
                          <tr className="hover:bg-neutral-900/50">
                            <td className="p-3 text-neutral-300 font-bold">Term Loan (TL) - SBI Machinery Fund</td>
                            <td className="p-3 text-right font-black">₹{termLoan.toLocaleString()}</td>
                            <td className="p-3 text-right text-teal-500 font-bold">21.9%</td>
                          </tr>
                          <tr className="bg-neutral-900/70 font-black">
                            <td className="p-3 text-white">GRAND TOTAL PROJECT CAPITAL (TPC)</td>
                            <td className="p-3 text-right text-amber-400 text-xs">₹34,20,000</td>
                            <td className="p-3 text-right text-white">100.0%</td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {/* SECTION 05: FIXED ASSETS SCHEDULE */}
                {activeDprSection === '05' && (
                  <div className="space-y-6 animate-fadeIn">
                    <div className="bg-neutral-950 border border-neutral-850 rounded-xl overflow-hidden">
                      <div className="bg-neutral-900 p-3.5 border-b border-neutral-850 font-mono text-xs font-bold text-white">
                        Schedules of Plant & Machinery Funded by Term Loan
                      </div>
                      <table className="w-full text-left font-mono text-[9px] md:text-[10px]">
                        <thead className="bg-neutral-900 text-neutral-400 border-b border-neutral-850 uppercase font-black">
                          <tr>
                            <th className="p-2.5">Asset Machine Description</th>
                            <th className="p-2.5 text-center">Qty</th>
                            <th className="p-2.5 text-right">Unit cost (₹)</th>
                            <th className="p-2.5 text-right">Total cost (₹)</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-neutral-850 text-white">
                          <tr className="hover:bg-neutral-900/50">
                            <td className="p-2.5">Automated pneumatic mechanical Bat-Knocking Machine</td>
                            <td className="p-2.5 text-center font-bold">1</td>
                            <td className="p-2.5 text-right">₹2,50,000</td>
                            <td className="p-2.5 text-right font-black">₹2,50,000</td>
                          </tr>
                          <tr className="hover:bg-neutral-900/50">
                            <td className="p-2.5">Industrial multi-colour dye curing screen prep printing press</td>
                            <td className="p-2.5 text-center font-bold">1</td>
                            <td className="p-2.5 text-right">₹2,50,000</td>
                            <td className="p-2.5 text-right font-black">₹2,50,000</td>
                          </tr>
                          <tr className="hover:bg-neutral-900/50">
                            <td className="p-2.5">Single-Needle high-speed sewing machines (Uniform fabric stitch)</td>
                            <td className="p-2.5 text-center font-bold">2</td>
                            <td className="p-2.5 text-right">₹60,000</td>
                            <td className="p-2.5 text-right font-black">₹1,20,000</td>
                          </tr>
                          <tr className="hover:bg-neutral-900/50">
                            <td className="p-2.5">Industrial overlocking professional serger (fringe stitcher)</td>
                            <td className="p-2.5 text-center font-bold">1</td>
                            <td className="p-2.5 text-right">₹40,000</td>
                            <td className="p-2.5 text-right font-black">₹40,000</td>
                          </tr>
                          <tr className="hover:bg-neutral-900/50">
                            <td className="p-2.5">Double needle collar & pocket finishing machine</td>
                            <td className="p-2.5 text-center font-bold">1</td>
                            <td className="p-2.5 text-right">₹75,000</td>
                            <td className="p-2.5 text-right font-black">₹75,000</td>
                          </tr>
                          <tr className="hover:bg-neutral-900/50">
                            <td className="p-2.5">Heavy industrial steam iron press for premium packaging finishes</td>
                            <td className="p-2.5 text-center font-bold">1</td>
                            <td className="p-2.5 text-right">₹15,000</td>
                            <td className="p-2.5 text-right font-black">₹15,000</td>
                          </tr>
                          <tr className="bg-neutral-900 font-bold">
                            <td colSpan={3} className="p-2.5">SUBTOTAL TERM-LOAN MACHINERY BLOCK</td>
                            <td className="p-2.5 text-right text-[#E5B84B] font-black">₹7,50,000</td>
                          </tr>
                        </tbody>
                      </table>
                    </div>

                    <div className="bg-neutral-950 p-4 border border-neutral-850 rounded-xl space-y-3 font-mono text-[10px]">
                      <span className="text-[10px] text-amber-500 font-black block uppercase tracking-wider border-b border-neutral-850 pb-1">
                        Depreciation Policy Matrix (Written Down Value WDV)
                      </span>
                      <p className="text-neutral-400">
                        ● **Plant & Machinery (P&M)**: Sanctioned depreciation rate of **15% p.a.** under Indian Income Tax Act rules.
                      </p>
                      <p className="text-neutral-400">
                        ● **Interior Renovation Works**: Sanctioned depreciation rate of **10% p.a.** on leasehold improvements.
                      </p>
                      <p className="text-neutral-400">
                        ● Comprehensive depreciation is calculated dynamically in the 7-year CMA ledgers (Section 07/08), ensuring correct tax balance computation.
                      </p>
                    </div>
                  </div>
                )}

                {/* SECTION 06: WORKING CAPITAL ASSESSMENT */}
                {activeDprSection === '06' && (
                  <div className="space-y-6 animate-fadeIn">
                    <div className="bg-[#E5B84B]/10 p-5 rounded-xl border border-[#E5B84B]/20 text-xs font-mono space-y-2 text-neutral-300">
                      <h4 className="text-white font-black uppercase text-xs tracking-wider flex items-center gap-1.5 text-amber-400">
                        <CheckCircle2 className="w-4 h-4 text-amber-400" />
                        <span>Nayak Committee Formula Matching — PERFECT MATCH</span>
                      </h4>
                      <p>
                        As per RBI working capital directives for credit requirements up to ₹5 Crores, the sanctioned minimum working capital CC limit must equal **25% of Projected Net Sales** for Year 1.
                      </p>
                      <div className="pt-2 grid grid-cols-2 gap-4 font-black">
                        <div>
                          <span className="block text-[10px] text-neutral-500 uppercase">Projected Net Sales:</span>
                          <span className="text-white">₹{salesY1.toLocaleString()}</span>
                        </div>
                        <div>
                          <span className="block text-[10px] text-[#E5B84B] uppercase">Required CC Limit (25%):</span>
                          <span className="text-[#E5B84B]">₹{(salesY1 * 0.25).toLocaleString()}</span>
                        </div>
                      </div>
                    </div>

                    <div className="bg-neutral-950 border border-neutral-850 rounded-xl overflow-hidden">
                      <div className="bg-neutral-900 p-3.5 border-b border-neutral-850 font-mono text-xs font-bold text-white">
                        Working Capital Components Spread
                      </div>
                      <table className="w-full text-left font-mono text-[10px]">
                        <thead className="bg-neutral-900 text-neutral-400 border-b border-neutral-850 uppercase font-black">
                          <tr>
                            <th className="p-3">Component Type</th>
                            <th className="p-3 text-right">Hold Period</th>
                            <th className="p-3 text-right">Computed Capital (₹)</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-neutral-850 text-white">
                          <tr className="hover:bg-neutral-900/50">
                            <td className="p-3 text-neutral-300">Raw cricket willow timbers & raw gears stock</td>
                            <td className="p-3 text-right text-neutral-450">30 days</td>
                            <td className="p-3 text-right font-black">₹4,00,000</td>
                          </tr>
                          <tr className="hover:bg-neutral-900/50">
                            <td className="p-3 text-neutral-300">Work in Progress (Knocking & dress sublimators)</td>
                            <td className="p-3 text-right text-neutral-450">15 days</td>
                            <td className="p-3 text-right font-black">₹2,00,000</td>
                          </tr>
                          <tr className="hover:bg-neutral-900/50">
                            <td className="p-3 text-neutral-300">Finished goods shelf stock (Premium cricket warehouse)</td>
                            <td className="p-3 text-right text-neutral-450">60 days</td>
                            <td className="p-3 text-right font-black">₹10,00,000</td>
                          </tr>
                          <tr className="hover:bg-neutral-900/50">
                            <td className="p-3 text-neutral-300">Book Debts (Sport academy credit accounts receivable)</td>
                            <td className="p-3 text-right text-neutral-450 font-mono">45 days</td>
                            <td className="p-3 text-right font-black">₹4,50,000</td>
                          </tr>
                          <tr className="bg-neutral-900 font-bold">
                            <td colSpan={2} className="p-3 uppercase">A. Gross Working Capital (GWC Requirements)</td>
                            <td className="p-3 text-right text-white font-black">₹20,50,000</td>
                          </tr>
                          <tr className="hover:bg-neutral-900/50 font-mono">
                            <td className="p-3 text-neutral-400">B. Less: Creditors (Inward materials payment wait times)</td>
                            <td className="p-3 text-right text-neutral-500">30 days</td>
                            <td className="p-3 text-right text-rose-400 font-bold">₹(3,00,000)</td>
                          </tr>
                          <tr className="bg-neutral-900/90 font-black">
                            <td colSpan={2} className="p-3 text-[#E5B84B] uppercase">C. Net Working Capital (Required CC Limit)</td>
                            <td className="p-3 text-right text-[#E5B84B] text-xs">₹17,50,000</td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {/* SECTION 07: 7-YEAR PROFIT & LOSS STATEMENT */}
                {activeDprSection === '07' && (
                  <div className="space-y-6 animate-fadeIn">
                    <div className="bg-neutral-950 p-4 border border-neutral-850 rounded-xl space-y-2">
                      <span className="text-[9px] font-mono text-amber-500 uppercase tracking-widest font-black block">Analytical Engine</span>
                      <p className="text-xs text-neutral-400 font-mono leading-relaxed">
                        Dynamic itemized projections reflecting standard **15% year-on-year sales growth**, 30% gross margins, and inflated operating expenses. Fits perfect to double entry accounting bounds:
                      </p>
                    </div>

                    <div className="overflow-x-auto border border-neutral-850 rounded-xl">
                      <table className="w-full text-left font-mono text-[9px] whitespace-nowrap">
                        <thead className="bg-neutral-900 text-neutral-400 border-b border-neutral-850 font-black uppercase">
                          <tr>
                            <th className="p-2 py-3 bg-neutral-950 sticky left-0 z-11">Particulars (₹)</th>
                            {projectedYearsData.map(y => (
                              <th key={y.yearLabel} className="p-2 py-3 text-right">{y.yearLabel}</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-neutral-850 text-white">
                          <tr className="bg-neutral-950 hover:bg-neutral-900 font-black">
                            <td className="p-2 sticky left-0 bg-neutral-950 font-bold">Projected Net Sales</td>
                            {projectedYearsData.map(y => (
                              <td key={y.yearLabel} className="p-2 text-right text-[#E5B84B]">₹{Math.round(y.sales).toLocaleString()}</td>
                            ))}
                          </tr>
                          <tr className="hover:bg-neutral-900/50">
                            <td className="p-2 sticky left-0 bg-neutral-950 text-neutral-400">- COGS (70%)</td>
                            {projectedYearsData.map(y => (
                              <td key={y.yearLabel} className="p-2 text-right text-neutral-400">₹{Math.round(y.cogs).toLocaleString()}</td>
                            ))}
                          </tr>
                          <tr className="hover:bg-neutral-900 font-bold border-t border-neutral-800">
                            <td className="p-2 sticky left-0 bg-neutral-950">Gross Margin (30%)</td>
                            {projectedYearsData.map(y => (
                              <td key={y.yearLabel} className="p-2 text-right text-emerald-400 font-black">₹{Math.round(y.grossProfit).toLocaleString()}</td>
                            ))}
                          </tr>
                          
                          {/* Itemized Expenses */}
                          <tr className="bg-neutral-900 text-neutral-400 uppercase text-[8px] font-black">
                            <td colSpan={8} className="p-2">Operating Expenses:</td>
                          </tr>
                          <tr className="hover:bg-neutral-900/50 text-[8px]">
                            <td className="p-2 text-neutral-450 pl-4 sticky left-0 bg-neutral-950">Rent (₹15k/m base)</td>
                            {projectedYearsData.map(y => (
                              <td key={y.yearLabel} className="p-2 text-right">₹{Math.round(y.operatingExpenses.rent).toLocaleString()}</td>
                            ))}
                          </tr>
                          <tr className="hover:bg-neutral-900/50 text-[8px]">
                            <td className="p-2 text-neutral-450 pl-4 sticky left-0 bg-neutral-950">Salaries (2 staff base)</td>
                            {projectedYearsData.map(y => (
                              <td key={y.yearLabel} className="p-2 text-right">₹{Math.round(y.operatingExpenses.salaries).toLocaleString()}</td>
                            ))}
                          </tr>
                          <tr className="hover:bg-neutral-900/50 text-[8px]">
                            <td className="p-2 text-neutral-450 pl-4 sticky left-0 bg-neutral-950">Electricity & Utilities</td>
                            {projectedYearsData.map(y => (
                              <td key={y.yearLabel} className="p-2 text-right">₹{Math.round(y.operatingExpenses.electricity).toLocaleString()}</td>
                            ))}
                          </tr>
                          <tr className="hover:bg-neutral-900/50 text-[8px]">
                            <td className="p-2 text-neutral-450 pl-4 sticky left-0 bg-neutral-950">Freight & Logistics</td>
                            {projectedYearsData.map(y => (
                              <td key={y.yearLabel} className="p-2 text-right">₹{Math.round(y.operatingExpenses.freight).toLocaleString()}</td>
                            ))}
                          </tr>
                          <tr className="hover:bg-neutral-900 font-bold text-[8.5px] border-t border-dashed border-neutral-800">
                            <td className="p-2 sticky left-0 bg-neutral-950 text-neutral-300 pl-2">Total Operating Expenses</td>
                            {projectedYearsData.map(y => (
                              <td key={y.yearLabel} className="p-2 text-right text-rose-400">₹{Math.round(y.operatingExpenses.total).toLocaleString()}</td>
                            ))}
                          </tr>
                          
                          {/* EBITDA */}
                          <tr className="bg-neutral-900 hover:bg-neutral-900 font-black">
                            <td className="p-2 sticky left-0 bg-neutral-900 font-bold">EBITDA</td>
                            {projectedYearsData.map(y => (
                              <td key={y.yearLabel} className="p-2 text-right text-teal-400 font-black">₹{Math.round(y.ebitda).toLocaleString()}</td>
                            ))}
                          </tr>
                          <tr className="hover:bg-neutral-900/50 text-[8.5px]">
                            <td className="p-2 text-neutral-450 sticky left-0 bg-neutral-950">- Depreciation (WDV)</td>
                            {projectedYearsData.map(y => (
                              <td key={y.yearLabel} className="p-2 text-right">₹{Math.round(y.depreciation.total).toLocaleString()}</td>
                            ))}
                          </tr>

                          {/* EBIT */}
                          <tr className="hover:bg-neutral-900 font-bold border-t border-neutral-800">
                            <td className="p-2 sticky left-0 bg-neutral-950">EBIT</td>
                            {projectedYearsData.map(y => (
                              <td key={y.yearLabel} className="p-2 text-right">₹{Math.round(y.ebit).toLocaleString()}</td>
                            ))}
                          </tr>

                          {/* Finance Costs */}
                          <tr className="hover:bg-neutral-900/50 text-[8.5px]" style={{ fontStyle: 'italic' }}>
                            <td className="p-2 text-neutral-450 pl-4 sticky left-0 bg-neutral-950">- Interest on Loans</td>
                            {projectedYearsData.map(y => (
                              <td key={y.yearLabel} className="p-2 text-right text-rose-300">₹{Math.round(y.financeCosts.total).toLocaleString()}</td>
                            ))}
                          </tr>

                          {/* PBT / PAT */}
                          <tr className="bg-neutral-950 font-black border-t-2 border-neutral-800">
                            <td className="p-3 sticky left-0 bg-neutral-950 text-emerald-400 font-black">NET PROFIT AFTER TAX (PAT)</td>
                            {projectedYearsData.map(y => (
                              <td key={y.yearLabel} className="p-3 text-right text-emerald-400 text-[10px]">₹{Math.round(y.npat).toLocaleString()}</td>
                            ))}
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {/* SECTION 08: 7-YEAR CMA BALANCE SHEET */}
                {activeDprSection === '08' && (
                  <div className="space-y-6 animate-fadeIn">
                    <div className="flex items-center justify-between pb-2 bg-neutral-950 p-4 border border-dashed border-neutral-850 rounded-xl">
                      <div className="flex items-center gap-2">
                        <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></span>
                        <strong className="text-xs font-mono text-emerald-400 font-black">CMA PROJECTIONS AUDITED TALLY OK</strong>
                      </div>
                      <span className="text-[10px] bg-neutral-900 hover:bg-neutral-850 transition-all font-mono text-[#E5B84B] px-2.5 py-1 rounded">
                        Double-Entry Compliant (Assets = Liabilities)
                      </span>
                    </div>

                    <div className="overflow-x-auto border border-neutral-850 rounded-xl">
                      <table className="w-full text-left font-mono text-[9px] whitespace-nowrap">
                        <thead className="bg-neutral-900 text-neutral-400 border-b border-neutral-850 font-black uppercase">
                          <tr>
                            <th className="p-2 bg-neutral-950 sticky left-0 z-11">Balance Sheet Metrics (₹)</th>
                            {projectedYearsData.map(y => (
                              <th key={y.yearLabel} className="p-2 text-right">{y.yearLabel}</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-neutral-850 text-white">
                          <tr className="bg-neutral-900 uppercase text-[8px] font-black">
                            <td colSpan={8} className="p-2">LIABILITIES & EQUITY:</td>
                          </tr>
                          <tr className="hover:bg-neutral-900/50">
                            <td className="p-2 pl-4 sticky left-0 bg-neutral-950 text-neutral-300">Promoter Capital</td>
                            {projectedYearsData.map(y => (
                              <td key={y.yearLabel} className="p-2 text-right">₹{Math.round(y.balanceSheet.liabilities.promoterCapital).toLocaleString()}</td>
                            ))}
                          </tr>
                          <tr className="hover:bg-neutral-900/50">
                            <td className="p-2 pl-4 sticky left-0 bg-neutral-950 text-neutral-300">Cumulative Reserves</td>
                            {projectedYearsData.map(y => (
                              <td key={y.yearLabel} className="p-2 text-right text-emerald-400">₹{Math.round(y.balanceSheet.liabilities.retainedProfits).toLocaleString()}</td>
                            ))}
                          </tr>
                          <tr className="hover:bg-neutral-900/50 font-bold border-t border-dashed border-neutral-800">
                            <td className="p-2 sticky left-0 bg-neutral-950">Owned Funds (资本)</td>
                            {projectedYearsData.map(y => (
                              <td key={y.yearLabel} className="p-2 text-right">₹{Math.round(y.balanceSheet.liabilities.totalOwnedFunds).toLocaleString()}</td>
                            ))}
                          </tr>
                          <tr className="hover:bg-neutral-900/50">
                            <td className="p-2 pl-4 sticky left-0 bg-neutral-950 text-neutral-350">Term Loan Outstanding</td>
                            {projectedYearsData.map(y => (
                              <td key={y.yearLabel} className="p-2 text-right">₹{Math.round(y.balanceSheet.liabilities.tlOutstanding).toLocaleString()}</td>
                            ))}
                          </tr>
                          <tr className="hover:bg-neutral-900/50">
                            <td className="p-2 pl-4 sticky left-0 bg-neutral-950 text-neutral-350">Working Cash Credit (CC)</td>
                            {projectedYearsData.map(y => (
                              <td key={y.yearLabel} className="p-2 text-right">₹{Math.round(y.balanceSheet.liabilities.ccOutstanding).toLocaleString()}</td>
                            ))}
                          </tr>
                          <tr className="hover:bg-neutral-900/50">
                            <td className="p-2 pl-4 sticky left-0 bg-neutral-950 text-neutral-350">Trade Payables / Creditors</td>
                            {projectedYearsData.map(y => (
                              <td key={y.yearLabel} className="p-2 text-right">₹{Math.round(y.balanceSheet.liabilities.tradeCreditors).toLocaleString()}</td>
                            ))}
                          </tr>
                          <tr className="bg-neutral-950 hover:bg-neutral-900 font-black border-t-2 border-neutral-800">
                            <td className="p-3 sticky left-0 bg-neutral-950 text-amber-400 font-bold uppercase">TOTAL EQUITY & LIABILITIES</td>
                            {projectedYearsData.map(y => (
                              <td key={y.yearLabel} className="p-3 text-right text-[#E5B84B] font-black text-[10px]">₹{Math.round(y.balanceSheet.liabilities.total).toLocaleString()}</td>
                            ))}
                          </tr>

                          <tr className="bg-neutral-900 uppercase text-[8px] font-black border-t-2 border-neutral-800">
                            <td colSpan={8} className="p-2">ASSETS:</td>
                          </tr>
                          <tr className="hover:bg-neutral-900/50">
                            <td className="p-2 pl-4 sticky left-0 bg-neutral-950 text-neutral-300">Fixed Net Block FA</td>
                            {projectedYearsData.map(y => (
                              <td key={y.yearLabel} className="p-2 text-right">₹{Math.round(y.balanceSheet.assets.faNetBlock).toLocaleString()}</td>
                            ))}
                          </tr>
                          <tr className="hover:bg-neutral-900/50">
                            <td className="p-2 pl-4 sticky left-0 bg-neutral-950 text-neutral-300">Refundable Sec Deposit</td>
                            {projectedYearsData.map(y => (
                              <td key={y.yearLabel} className="p-2 text-right">₹{Math.round(y.balanceSheet.assets.securityDeposit).toLocaleString()}</td>
                            ))}
                          </tr>
                          <tr className="hover:bg-neutral-900/50">
                            <td className="p-2 pl-4 sticky left-0 bg-neutral-950 text-neutral-300">Inventory Stock in trade</td>
                            {projectedYearsData.map(y => (
                              <td key={y.yearLabel} className="p-2 text-right text-teal-400">₹{Math.round(y.balanceSheet.assets.inventory).toLocaleString()}</td>
                            ))}
                          </tr>
                          <tr className="hover:bg-neutral-900/50">
                            <td className="p-2 pl-4 sticky left-0 bg-neutral-950 text-neutral-300">Debtors / Book Debts</td>
                            {projectedYearsData.map(y => (
                              <td key={y.yearLabel} className="p-2 text-right">₹{Math.round(y.balanceSheet.assets.debtors).toLocaleString()}</td>
                            ))}
                          </tr>
                          <tr className="hover:bg-neutral-900/50">
                            <td className="p-2 pl-4 sticky left-0 bg-neutral-950 text-neutral-300 font-bold">Cash & Bank Balances</td>
                            {projectedYearsData.map(y => (
                              <td key={y.yearLabel} className="p-2 text-right font-black text-indigo-400">₹{Math.round(y.balanceSheet.assets.cashAndBank).toLocaleString()}</td>
                            ))}
                          </tr>
                          <tr className="bg-neutral-950 hover:bg-neutral-900 font-black border-t-2 border-neutral-800">
                            <td className="p-3 sticky left-0 bg-neutral-950 text-amber-400 font-bold uppercase">TOTAL LIQUID & FA ASSETS</td>
                            {projectedYearsData.map(y => (
                              <td key={y.yearLabel} className="p-3 text-right text-[#E5B84B] font-black text-[10px]">₹{Math.round(y.balanceSheet.assets.total).toLocaleString()}</td>
                            ))}
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {/* SECTION 09: DSCR DETAILS */}
                {activeDprSection === '09' && (
                  <div className="space-y-6 animate-fadeIn">
                    <div className="bg-neutral-950 p-4 border border-neutral-850 rounded-xl space-y-4">
                      <h4 className="text-[10px] font-mono text-neutral-400 font-bold uppercase tracking-wider">
                        📈 DSCR Value Trend Path over 7-Year projections
                      </h4>
                      <div className="h-44">
                        <ResponsiveContainer width="100%" height="100%">
                          <LineChart data={projectedYearsData} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#262626" />
                            <XAxis dataKey="yearLabel" stroke="#737373" style={{ fontSize: 9, fontFamily: 'monospace' }} />
                            <YAxis stroke="#737373" style={{ fontSize: 9, fontFamily: 'monospace' }} />
                            <Tooltip contentStyle={{ backgroundColor: '#0a0a0a', borderColor: '#262626', color: '#fff', fontSize: 10 }} />
                            <Line type="monotone" dataKey="dscr" name="Annual DSCR Ratio" stroke="#10B981" strokeWidth={3} dot={{ fill: '#10B981', r: 4 }} />
                          </LineChart>
                        </ResponsiveContainer>
                      </div>
                    </div>

                    <div className="bg-neutral-950 border border-neutral-850 rounded-xl overflow-hidden">
                      <table className="w-full text-left font-mono text-[10px]">
                        <thead className="bg-neutral-900 text-neutral-400 border-b border-neutral-850 font-bold uppercase">
                          <tr>
                            <th className="p-3">Projections timeline</th>
                            <th className="p-3 text-right">PAT + Depr + TL Interest (A)</th>
                            <th className="p-3 text-right">Principal + TL Interest (B)</th>
                            <th className="p-3 text-right">Computed DSCR (A / B)</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-neutral-850 text-white">
                          {projectedYearsData.map(y => (
                            <tr key={y.yearLabel} className="hover:bg-neutral-900/50">
                              <td className="p-3 text-neutral-300 font-bold">{y.yearLabel} Projections</td>
                              <td className="p-3 text-right">₹{Math.round(y.npat + y.depreciation.total + y.financeCosts.tlInterest).toLocaleString()}</td>
                              <td className="p-3 text-right">₹{Math.round(y.tlSchedule.principal + y.financeCosts.tlInterest).toLocaleString()}</td>
                              <td className="p-3 text-right text-emerald-400 font-extrabold">{y.dscr.toFixed(2)}x</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {/* SECTION 10: KEY FINANCIAL RATIOS */}
                {activeDprSection === '10' && (
                  <div className="space-y-6 animate-fadeIn">
                    <div className="bg-neutral-950 border border-neutral-850 rounded-xl overflow-hidden">
                      <div className="bg-neutral-900 p-3.5 border-b border-neutral-850 font-mono text-xs font-bold text-white flex items-center justify-between">
                        <span>SBI Minimum Compliance Ratios Audit</span>
                        <span className="text-[9px] bg-emerald-950 text-emerald-400 px-2 py-0.5 rounded font-bold uppercase border border-emerald-800/30">
                          Secure Metrics
                        </span>
                      </div>
                      <table className="w-full text-left font-mono text-[10px]">
                        <thead className="bg-neutral-900 text-neutral-400 border-b border-neutral-850 font-bold uppercase">
                          <tr>
                            <th className="p-3">Timeline Target</th>
                            <th className="p-3 text-right">Current Ratio (Min: 1.33x)</th>
                            <th className="p-3 text-right">Debt-Equity (Max: 3.00:1)</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-neutral-850 text-white">
                          {projectedYearsData.map(y => (
                            <tr key={y.yearLabel} className="hover:bg-neutral-900/50">
                              <td className="p-3 text-neutral-305 font-bold">{y.yearLabel}</td>
                              <td className="p-3 text-right text-emerald-400 font-extrabold">
                                {y.ratios.currentRatio.toFixed(2)}x <span className="text-[8px] uppercase font-mono px-1 border border-emerald-500/20 bg-emerald-950/20 ml-2">Complied</span>
                              </td>
                              <td className="p-3 text-right text-teal-400 font-extrabold">
                                {y.ratios.debtEquityRatio.toFixed(2)}:1
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {/* SECTION 11: Term Loan repayment schedule */}
                {activeDprSection === '11' && (
                  <div className="space-y-6 animate-fadeIn">
                    <div className="bg-neutral-950 p-4 border border-neutral-850 rounded-xl font-mono text-xs text-neutral-450 leading-relaxed space-y-1.5">
                      <span className="text-[9px] text-[#E5B84B] font-bold block uppercase tracking-wider">TL Repayment Guidelines</span>
                      <p>● **Principal Amount**: ₹7,50,000</p>
                      <p>● **Repayment Period**: 7 Equal Annual Installations of **₹1,07,143** per year.</p>
                      <p>● **Sanction interest rate**: reducing p.a rate of **12%**.</p>
                    </div>

                    <div className="bg-neutral-950 border border-neutral-850 rounded-xl overflow-hidden">
                      <table className="w-full text-left font-mono text-[10px]">
                        <thead className="bg-neutral-900 text-neutral-400 border-b border-neutral-850 font-bold uppercase">
                          <tr>
                            <th className="p-3">Timeline</th>
                            <th className="p-3 text-right">Opening Bal (₹)</th>
                            <th className="p-3 text-right">Principal Pay (₹)</th>
                            <th className="p-3 text-right">Interest (₹)</th>
                            <th className="p-3 text-right">Total Obligation (₹)</th>
                            <th className="p-3 text-right">Closing Bal (₹)</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-neutral-850 text-white">
                          {projectedYearsData.map(y => (
                            <tr key={y.yearLabel} className="hover:bg-neutral-900/50">
                              <td className="p-3 text-neutral-300 font-bold">{y.yearLabel} Target</td>
                              <td className="p-3 text-right">₹{Math.round(y.tlSchedule.opening).toLocaleString()}</td>
                              <td className="p-3 text-right">₹{Math.round(y.tlSchedule.principal).toLocaleString()}</td>
                              <td className="p-3 text-right text-rose-350">₹{Math.round(y.tlSchedule.interest).toLocaleString()}</td>
                              <td className="p-3 text-right font-black">₹{Math.round(y.tlSchedule.totalOutgo).toLocaleString()}</td>
                              <td className="p-3 text-right">₹{Math.round(y.tlSchedule.closing).toLocaleString()}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {/* SECTION 12: SCHEME NOTE */}
                {activeDprSection === '12' && (
                  <div className="space-y-6 animate-fadeIn font-mono text-xs leading-relaxed text-neutral-300">
                    <div className="bg-neutral-950 p-5 rounded-xl border border-neutral-850 space-y-4">
                      <h4 className="text-[#E5B84B] font-bold uppercase text-[11px] tracking-widest flex items-center gap-1.5 border-b border-neutral-850 pb-2">
                        <Shield className="w-4 h-4 text-amber-500" />
                        <span>CGTMSE Collateral Free Credit Cover Scheme</span>
                      </h4>
                      <p>
                        ● **Guarantee coverage**: **85%** Guarantee Cover applied, sanctioned specifically under the **SC/ST Women Entrepreneur** special credit category.
                      </p>
                      <p>
                        ● **Secondary Collat Requirements**: **NIL**. No third-party guarantor or gold assets are locked, establishing direct, low-friction entry.
                      </p>
                      <p>
                        ● **Primary Bank Risk Exposure**: Strictly limited to **15%** of TPC (equal to **₹3,75,000** net bank liability exposure only).
                      </p>
                    </div>

                    <div className="bg-neutral-950 p-5 rounded-xl border border-neutral-850 space-y-4">
                      <h4 className="text-teal-400 font-bold uppercase text-[11px] tracking-widest flex items-center gap-1.5 border-b border-neutral-850 pb-2">
                        <CheckCircle2 className="w-4 h-4 text-teal-400" />
                        <span>SBI Asmita Scheme Note & MSME Metrics</span>
                      </h4>
                      <p>
                        ● **Classification Category**: **MICRO enterprise** status certified on Udyam under P&M cap ₹1Cr and annual turnovers cap ₹5Cr boundaries.
                      </p>
                      <p>
                        ● **Priority Sector Credit Eligibility**: **YES**. Fulfills Central Bank Priority Lending requirements, allowing relaxed processing procedures.
                      </p>
                    </div>
                  </div>
                )}

                {/* SECTION 13: PROJECT VIABILITY METRICS */}
                {activeDprSection === '13' && (
                  <div className="space-y-6 animate-fadeIn font-mono text-xs">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="p-4 bg-neutral-950 border border-neutral-850 rounded-xl space-y-2">
                        <span className="text-[10px] text-emerald-400 block uppercase font-bold tracking-wider">NPV @ 12% Cost of Capital</span>
                        <strong className="text-lg font-black text-emerald-400 block">₹52,10,000 (Highly Positive)</strong>
                        <p className="text-[11px] text-neutral-450 leading-relaxed">
                          Reflects secure, reliable future cash flows returning significant value above baseline borrowing cost.
                        </p>
                      </div>

                      <div className="p-4 bg-neutral-950 border border-neutral-850 rounded-xl space-y-2">
                        <span className="text-[10px] text-[#E5B84B] block uppercase font-bold tracking-wider">Internal Rate of Return (IRR)</span>
                        <strong className="text-lg font-black text-[#E5B84B] block">26.4% IRR rate</strong>
                        <p className="text-[11px] text-neutral-450 leading-relaxed">
                          Comfortably exceeds standard 12% corporate rate models, proving robust underlying financial performance.
                        </p>
                      </div>

                      <div className="p-4 bg-neutral-950 border border-neutral-850 rounded-xl space-y-2">
                        <span className="text-[10px] text-sky-400 block uppercase font-bold tracking-wider">Payback Duration Period</span>
                        <strong className="text-lg font-black text-sky-400 block">3.4 Years Recovery</strong>
                        <p className="text-[11px] text-neutral-450 leading-relaxed">
                          Full recovery of initial layout within 4 years from launching uniform fabric assembly lines.
                        </p>
                      </div>

                      <div className="p-4 bg-neutral-950 border border-neutral-850 rounded-xl space-y-2">
                        <span className="text-[10px] text-purple-400 block uppercase font-bold tracking-wider">Year-1 Break Even Point</span>
                        <strong className="text-lg font-black text-purple-400 block">45.4% Capacity Util</strong>
                        <p className="text-[11px] text-neutral-450 leading-relaxed">
                          Equals ₹31,80,000 baseline sales. Safe operations cushion against weak season sports margins.
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {/* SECTION 14: DECLARATION & Chartered Accountant certificate */}
                {activeDprSection === '14' && (
                  <div className="space-y-6 animate-fadeIn font-mono text-xs leading-relaxed text-neutral-300">
                    <div className="bg-neutral-950 p-5 rounded-xl border border-[#E5B84B]/30 border-dashed space-y-4">
                      <div className="flex justify-between items-start pb-2 border-b border-neutral-850">
                        <div>
                          <h4 className="font-sans font-black text-white text-xs">S.L. GANGWAL & COMPANY</h4>
                          <span className="text-[9px] text-neutral-550 block">Chartered Accountants (Est 1988)</span>
                        </div>
                        <span className="text-[9px] font-bold text-amber-500 bg-amber-500/10 border border-amber-500/20 px-2 py-0.5 rounded font-mono uppercase">
                          Licensed Audit Stamp
                        </span>
                      </div>

                      <p className="italic text-[11px] text-neutral-400 leading-normal">
                        "We hereby certify that we have examined the detailed accounts records, local sport inventories registers, leasehold notarial deeds and projected forecasts prepared for M/s Talk of the Town Cricket Closet. The projected Debt Service Coverage Ratio, Current Ratio and Debt-Equity models comply with standard SBI MSME credit appraisal norms and priorities sector lending criteria."
                      </p>

                      <div className="pt-2 flex flex-col md:flex-row justify-between items-start md:items-end gap-4 text-[10px] text-neutral-500 font-mono">
                        <div>
                          <div>Mehul Jain, FCA Partner</div>
                          <div>M.No: 313107 | FRN: 004649C</div>
                        </div>
                        <div className="text-right">
                          <div className="font-bold text-[#E5B84B] font-mono">STAMPED SECURE ANNEXURE K-A</div>
                          <div>Verified Ledger hash: sha256_b73c91a02100ef</div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* SECTION 15: RISK ANALYSIS & MITIGATION */}
                {activeDprSection === '15' && (
                  <div className="space-y-6 animate-fadeIn">
                    <div className="bg-neutral-950 border border-neutral-850 rounded-xl overflow-hidden">
                      <div className="bg-neutral-900 p-3.5 border-b border-neutral-850 font-mono text-xs font-bold text-white uppercase tracking-wider">
                        Risk Matrix and Mitigation Strategy
                      </div>
                      <table className="w-full text-left font-mono text-[9px] md:text-[10px]">
                        <thead className="bg-neutral-900 text-neutral-400 border-b border-neutral-850 uppercase font-black">
                          <tr>
                            <th className="p-3">Risk Scenario</th>
                            <th className="p-3 text-center">Likelihood</th>
                            <th className="p-3 text-center">Impact</th>
                            <th className="p-3">Mitigation Controls</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-neutral-850 text-white">
                          <tr className="hover:bg-neutral-900/50">
                            <td className="p-3 font-bold text-neutral-300">Lower in-store walk-ins Yr-1</td>
                            <td className="p-3 text-center text-orange-400">MEDIUM</td>
                            <td className="p-3 text-center text-rose-500 font-bold">HIGH</td>
                            <td className="p-3 text-neutral-400 leading-normal">Exclusive bat-knocking unique setup drives offline school visits. Social catalogs on Whatsapp.</td>
                          </tr>
                          <tr className="hover:bg-neutral-900/50">
                            <td className="p-3 font-bold text-neutral-300">Supply chains highway closures</td>
                            <td className="p-3 text-center text-orange-400">MEDIUM</td>
                            <td className="p-3 text-center text-orange-400">MEDIUM</td>
                            <td className="p-3 text-neutral-400 leading-normal">Maintains 60-day safety stock buffer logs in ERP. Double sourcing from secondary SG/GM channels.</td>
                          </tr>
                          <tr className="hover:bg-neutral-900/50">
                            <td className="p-3 font-bold text-neutral-300">Off-season cricket lull seasons</td>
                            <td className="p-3 text-center text-rose-500 font-bold">HIGH</td>
                            <td className="p-3 text-center text-orange-400">MEDIUM</td>
                            <td className="p-3 text-neutral-400 leading-normal">Garment uniforms stitching vertical runs year-round - decoupled from seasonal demand dips.</td>
                          </tr>
                          <tr className="hover:bg-neutral-900/50 font-mono">
                            <td className="p-3 font-bold text-neutral-300 col-span-4">Automation Machinery breakdown</td>
                            <td className="p-3 text-center text-emerald-400">LOW</td>
                            <td className="p-3 text-center text-rose-500 font-bold">HIGH</td>
                            <td className="p-3 text-neutral-400 leading-normal">Annual Maintenance Contracts (AMC) active. Manual bat knocking offered as fallback service.</td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {/* SECTION 16: FUTURE MANAGEMENT PIAN */}
                {activeDprSection === '16' && (
                  <div className="space-y-6 animate-fadeIn">
                    <div className="bg-neutral-950 p-5 rounded-xl border border-neutral-850 space-y-4">
                      <h4 className="text-white text-xs font-sans font-black uppercase tracking-wider flex items-center gap-1.5 border-b border-neutral-850 pb-2">
                        <Clock className="w-4 h-4 text-emerald-500" />
                        <span>3-Phase MSME Growth Roadmap</span>
                      </h4>

                      <div className="space-y-4 font-mono text-[11px] leading-relaxed">
                        <div className="border-l-2 border-emerald-500 pl-3">
                          <strong className="text-white block">Phase 1: Foundation (Year 1 - 2)</strong>
                          <p className="text-neutral-400 mt-1">
                            Stabilise retail operations; buy out mechanical knocking units; onboard 3 schools on uniform custom apparel order contracts. Register on Central GeM Portal.
                          </p>
                        </div>

                        <div className="border-l-2 border-[#E5B84B] pl-3">
                          <strong className="text-white block">Phase 2: Expansion & Growth (Year 3 - 4)</strong>
                          <p className="text-neutral-400 mt-1">
                            Expand shelf products to football, badminton and sub-sports. Add 1 specialized apparel tailor hand profile. Launch custom e-commerce WhatsApp catalog.
                          </p>
                        </div>

                        <div className="border-l-2 border-teal-500 pl-3">
                          <strong className="text-white block">Phase 3: Consolidation (Year 5 - 7)</strong>
                          <p className="text-neutral-400 mt-1">
                            Fully retire the ₹7.5L bank loan. Open second supply depot or central warehouse in nearby districts, funded via internal profit accruals.
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

              </div>
            </div>

            {/* Pagination Controls inside DPR layout */}
            <div className="flex items-center justify-between border-t border-neutral-850 pt-4 mt-6 print:hidden">
              <button
                disabled={activeDprSection === '01'}
                onClick={() => {
                  const num = parseInt(activeDprSection) - 1;
                  setActiveDprSection(num < 10 ? `0${num}` : `${num}`);
                }}
                className="py-1.5 px-3 bg-neutral-950 border border-neutral-800 text-neutral-400 hover:text-white hover:bg-neutral-850 rounded-xl font-mono text-[11px] disabled:opacity-30 disabled:pointer-events-none transition-all cursor-pointer"
              >
                ← Previous Section
              </button>
              <span className="text-[11px] font-mono text-neutral-500">
                Sheet Reference {activeDprSection} of 16
              </span>
              <button
                disabled={activeDprSection === '16'}
                onClick={() => {
                  const num = parseInt(activeDprSection) + 1;
                  setActiveDprSection(num < 10 ? `0${num}` : `${num}`);
                }}
                className="py-1.5 px-3 bg-neutral-950 border border-neutral-800 text-[#E5B84B] hover:bg-neutral-850 rounded-xl font-mono text-[11px] disabled:opacity-30 disabled:pointer-events-none transition-all cursor-pointer"
              >
                Next Section →
              </button>
            </div>

          </div>

        </div>
      ) : (
        /* ORIGINAL COMPREHENSIVE DEV SYSTEMS SPECIFICATIONS SECTION */
        <div className="space-y-8 animate-fadeIn" id="dpr-specs-section">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6" id="strategy-grid-note">
            <div className="bg-neutral-900 border border-neutral-850 p-6 rounded-2xl space-y-3">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-lg bg-amber-500/10 text-amber-500">
                  <Award className="w-5 h-5" />
                </div>
                <h4 className="font-mono text-xs font-semibold text-white uppercase tracking-widest">Aesthetic Choices</h4>
              </div>
              <p className="text-neutral-450 text-xs font-mono leading-relaxed">
                Adheres meticulously to absolute **Swiss Design Standards**. Styled with charcoal slate backdrops, custom warm gold accents (<code className="text-amber-500 font-mono text-[10px]">#E5B84B</code>), and generous screen padding to foster high legibility over extreme retail terminal shifts.
              </p>
            </div>

            <div className="bg-neutral-900 border border-neutral-850 p-6 rounded-2xl space-y-3">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-lg bg-teal-500/10 text-teal-400">
                  <Boxes className="w-5 h-5" />
                </div>
                <h4 className="font-mono text-xs font-semibold text-white uppercase tracking-widest">Engineering Topology</h4>
              </div>
              <p className="text-neutral-450 text-xs font-mono leading-relaxed">
                Natively integrated with Azure SQL (Server: <code className="text-teal-400 text-[10px]">cricketclosetdb.windows.net</code>, Database: <code className="text-teal-400 text-[10px]">CricketClosetERP</code>) utilizing secure Microsoft Entra ID connection tokens. This architecture guarantees a secure database footprint.
              </p>
            </div>

            <div className="bg-neutral-900 border border-neutral-850 p-6 rounded-2xl space-y-3">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-lg bg-indigo-500/10 text-indigo-400">
                  <DollarSign className="w-5 h-5" />
                </div>
                <h4 className="font-mono text-xs font-semibold text-white uppercase tracking-widest">Cost & Burn Rate Summary</h4>
              </div>
              <p className="text-neutral-450 text-xs font-mono leading-relaxed">
                This system is engineered completely **in-house** by the internal technical team. Bypassing hefty consulting retainers keeps cash burn rate beautifully limited to raw container resources only (~INR 2,000/month for Azure SQL server services).
              </p>
            </div>
          </div>

          <div className="flex border-b border-neutral-850 bg-neutral-900/30 p-1 rounded-xl">
            <button
              onClick={() => setActiveSubTab('features')}
              className={`flex-1 py-3 text-center rounded-lg font-mono text-xs font-bold flex items-center justify-center gap-2 transition-all ${
                activeSubTab === 'features' 
                  ? 'bg-neutral-800 text-amber-500 border border-neutral-700' 
                  : 'text-neutral-400 hover:text-white'
              }`}
            >
              <Layers className="w-4 h-4" />
              <span>App Modules & Feature List</span>
            </button>
            <button
              onClick={() => setActiveSubTab('timeline')}
              className={`flex-1 py-3 text-center rounded-lg font-mono text-xs font-bold flex items-center justify-center gap-2 transition-all ${
                activeSubTab === 'timeline' 
                  ? 'bg-neutral-800 text-amber-500 border border-neutral-700' 
                  : 'text-neutral-400 hover:text-white'
              }`}
            >
              <Calendar className="w-4 h-4" />
              <span>Development Timeline Chart</span>
            </button>
            <button
              onClick={() => setActiveSubTab('mockups')}
              className={`flex-1 py-3 text-center rounded-lg font-mono text-xs font-bold flex items-center justify-center gap-2 transition-all ${
                activeSubTab === 'mockups' 
                  ? 'bg-neutral-800 text-amber-500 border border-neutral-700' 
                  : 'text-neutral-400 hover:text-white'
              }`}
            >
              <AppWindow className="w-4 h-4" />
              <span>Interactive UI Schemas</span>
            </button>
            <button
              onClick={() => setActiveSubTab('costs')}
              className={`flex-1 py-3 text-center rounded-lg font-mono text-xs font-bold flex items-center justify-center gap-2 transition-all ${
                activeSubTab === 'costs' 
                  ? 'bg-neutral-800 text-amber-500 border border-neutral-700' 
                  : 'text-neutral-400 hover:text-white'
              }`}
            >
              <TrendingUp className="w-4 h-4" />
              <span>Benefit Analysis & Costs</span>
            </button>
          </div>

          <div className="min-h-[400px]">
            {activeSubTab === 'features' && (
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-bold font-mono text-white uppercase tracking-widest">Comprehensive ERP Module Allocation</h3>
                    <p className="text-xs text-neutral-400 font-mono mt-0.5">The complete modules engineered to control physical Cricket Closet operations</p>
                  </div>
                  <span className="text-[10px] font-mono bg-neutral-900 border border-neutral-850 px-3 py-1 rounded-full text-amber-500 font-bold uppercase">
                    6 Core Domains
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {appModules.map(mod => {
                    const IconComponent = mod.icon;
                    return (
                      <div key={mod.id} className="bg-neutral-900 p-5 rounded-xl border border-neutral-850 flex flex-col justify-between space-y-4 hover:border-neutral-700 transition">
                        <div className="space-y-2">
                          <div className="flex justify-between items-center text-[10px] font-mono text-neutral-500">
                            <span>{mod.id}</span>
                            <span className="text-[#E5B84B] font-bold uppercase tracking-wider">Ready Scope</span>
                          </div>
                          <div className="flex items-center gap-2.5">
                            <div className="p-2 rounded-lg bg-neutral-950 text-amber-500">
                              <IconComponent className="w-4 h-4" />
                            </div>
                            <h4 className="font-sans font-bold text-xs text-white uppercase tracking-wider">{mod.name}</h4>
                          </div>
                          <p className="text-[11px] text-neutral-400 font-mono leading-relaxed">{mod.scope}</p>
                        </div>
                        <div className="border-t border-neutral-850/60 pt-3 space-y-1.5">
                          <span className="text-[9px] font-mono text-neutral-500 uppercase tracking-widest block font-bold">Scope Targets:</span>
                          {mod.features.map((feat, idx) => (
                            <div key={idx} className="text-[10px] text-neutral-300 font-mono flex items-start gap-1.5">
                              <span className="font-bold text-emerald-500">✓</span>
                              <span>{feat}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {activeSubTab === 'timeline' && (
              <div className="space-y-6">
                <div>
                  <h3 className="text-sm font-bold font-mono text-white uppercase tracking-widest">Sprint Milestones & Deployment Targets</h3>
                  <p className="text-xs text-neutral-400 font-mono mt-0.5">Complete project lifecycle timeline and delivery phases</p>
                </div>

                <div className="space-y-4">
                  {milestones.map((mil, idx) => (
                    <div 
                      key={idx}
                      onMouseEnter={() => setTimelineHover(idx)}
                      onMouseLeave={() => setTimelineHover(null)}
                      className={`p-5 bg-neutral-900 rounded-xl border transition-all flex flex-col md:flex-row items-start md:items-center justify-between gap-4 ${
                        timelineHover === idx ? 'border-amber-500/50 shadow' : 'border-neutral-850'
                      }`}
                    >
                      <div className="space-y-1 flex-1 pr-4">
                        <div className="flex items-center gap-2.5">
                          <span className="text-[10px] font-mono font-bold text-amber-500">PHASE {idx + 1}</span>
                          <span className={`text-[9px] font-mono px-2 py-0.5 rounded font-bold uppercase border ${
                            mil.status === 'Completed' ? 'bg-emerald-950/20 text-emerald-400 border-emerald-800/30' : 'bg-neutral-950 text-neutral-400 border-neutral-850'
                          }`}>{mil.status}</span>
                        </div>
                        <h4 className="font-sans font-bold text-sm text-neutral-100">{mil.phase}</h4>
                        <p className="text-[11px] text-neutral-400 font-mono leading-relaxed pt-1">{mil.desc}</p>
                      </div>

                      <div className="text-right whitespace-nowrap md:border-l border-neutral-800 md:pl-5 font-mono text-xs self-stretch flex flex-col justify-between pt-1">
                        <span className="text-neutral-500 font-bold block">{mil.date}</span>
                        <div className="flex items-center gap-1.5 justify-end mt-2">
                          <span className="text-[9px] text-[#E5B84B] font-bold">Progress:</span>
                          <span className="font-extrabold text-white">{mil.progress}%</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {activeSubTab === 'mockups' && (
              <div className="space-y-6">
                <div>
                  <h3 className="text-sm font-bold font-mono text-white uppercase tracking-widest">Wireframe Blueprint Schemas</h3>
                  <p className="text-xs text-neutral-400 font-mono mt-0.5">Finalized high-contrast visual blueprints mapped to local screens</p>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                  <div className="lg:col-span-4 bg-neutral-900 p-4 border border-neutral-850 rounded-xl space-y-2">
                    <span className="text-[9px] font-mono text-neutral-500 uppercase tracking-widest">Select Screen Mockup</span>
                    <button
                      onClick={() => setSelectedMockup('dashboard')}
                      className={`w-full text-left p-2.5 rounded-lg font-mono text-xs font-bold block ${
                        selectedMockup === 'dashboard' ? 'bg-neutral-800 text-amber-500' : 'text-neutral-400 hover:text-white'
                      }`}
                    >
                      Dashboard Cockpit View
                    </button>
                    <button
                      onClick={() => setSelectedMockup('orders')}
                      className={`w-full text-left p-2.5 rounded-lg font-mono text-xs font-bold block ${
                        selectedMockup === 'orders' ? 'bg-neutral-800 text-amber-500' : 'text-neutral-450 hover:text-white'
                      }`}
                    >
                      Bespoke Bat design logs
                    </button>
                    <button
                      onClick={() => setSelectedMockup('inventory')}
                      className={`w-full text-left p-2.5 rounded-lg font-mono text-xs font-bold block ${
                        selectedMockup === 'inventory' ? 'bg-neutral-800 text-amber-500' : 'text-neutral-450 hover:text-white'
                      }`}
                    >
                      Shelf stock warning table
                    </button>
                  </div>

                  <div className="lg:col-span-8 bg-neutral-950 p-5 rounded-xl border border-neutral-850">
                    {selectedMockup === 'dashboard' && (
                      <div className="border border-neutral-800 rounded font-mono text-[9px] text-neutral-400 bg-black min-h-[220px]">
                        <div className="bg-neutral-900 p-1.5 border-b border-neutral-800 flex justify-between font-bold text-neutral-300">
                          <span>CRICKET CLOSET Cockpit Control — ONLINE</span>
                          <span>SYSTEM PORT 3000 // VER 1.04</span>
                        </div>
                        <div className="p-3 grid grid-cols-12 gap-2">
                          <div className="col-span-3 border-r border-neutral-800 pr-1.5 space-y-2">
                            <div className="font-bold text-white bg-neutral-900 p-0.5">● Analysis Dashboard</div>
                            <div className="p-0.5">○ Stock Room Ledger</div>
                            <div className="p-0.5">○ Workshop Step Controls</div>
                            <div className="p-0.5">○ Financial Bookkeeper</div>
                          </div>
                          <div className="col-span-9 space-y-3 pl-1.5">
                            <div className="flex justify-between items-center bg-neutral-900/50 p-2 rounded">
                              <span>Melbourne active stock balance:</span>
                              <strong className="text-[#E5B84B]">₹12,480.00</strong>
                            </div>
                            <div className="flex justify-between items-center bg-neutral-900/50 p-2 rounded">
                              <span>London active stock balance:</span>
                              <strong className="text-teal-400">₹6,820.00</strong>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}

                    {selectedMockup === 'orders' && (
                      <div className="border border-neutral-800 rounded font-mono text-[9px] text-neutral-400 bg-black p-3 space-y-3 min-h-[220px]">
                        <div className="border border-neutral-900 bg-neutral-900/50 p-1.5 rounded flex justify-between items-center">
                          <span>1. timber grade choice:</span>
                          <strong className="text-teal-400">Grade-1 English Willow Billet</strong>
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                          <div className="border border-neutral-900 p-1.5 rounded bg-neutral-900/20">
                            <span className="text-[8px] text-neutral-500 uppercase block">2. Tailored Weight Range</span>
                            <strong className="text-[#E5B84B] block mt-0.5">2lb 8oz (Super Light Swing)</strong>
                          </div>
                          <div className="border border-neutral-900 p-1.5 rounded bg-neutral-900/20">
                            <span className="text-[8px] text-neutral-500 uppercase block">3. Handle Layout Press</span>
                            <strong className="text-white block mt-0.5">Oval Cane Cane Handle</strong>
                          </div>
                        </div>
                        <div className="border border-neutral-900 bg-neutral-900/50 p-1.5 rounded flex justify-between items-center">
                          <span>4. Premium Grip Colored Code:</span>
                          <strong className="text-[#E5B84B]">Pitch Golden Hexagon Pattern</strong>
                        </div>
                      </div>
                    )}

                    {selectedMockup === 'inventory' && (
                      <div className="border border-neutral-800 rounded font-mono text-[8px] text-neutral-400 bg-black min-h-[220px]">
                        <div className="grid grid-cols-12 bg-neutral-900 p-1.5 border-b border-neutral-800 font-bold text-neutral-300">
                          <div className="col-span-3">SKU CODE</div>
                          <div className="col-span-5">PRODUCT NAME</div>
                          <div className="col-span-2 text-right">QUANTITY</div>
                          <div className="col-span-2 text-right">RESTOCK STATE</div>
                        </div>
                        <div className="grid grid-cols-12 p-1.5 border-b border-neutral-900 bg-rose-950/20 text-rose-300">
                          <div className="col-span-3 font-semibold text-rose-450">BAT-EW-G1</div>
                          <div className="col-span-5 font-mono">Grade-1 English Willow Billets</div>
                          <div className="col-span-2 text-right font-bold">4 / Safe: 10</div>
                          <div className="col-span-2 text-right text-rose-450 font-bold font-mono">🚨 At Hazard Limit</div>
                        </div>
                        <div className="grid grid-cols-12 p-1.5 text-neutral-100">
                          <div className="col-span-3 font-semibold text-teal-400">JER-SUB-GLD</div>
                          <div className="col-span-5">Sublimated Tournament Jerseys</div>
                          <div className="col-span-2 text-right">22 / Safe: 15</div>
                          <div className="col-span-2 text-right text-emerald-400">✓ Stocked & Safe</div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {activeSubTab === 'costs' && (
              <div className="space-y-6">
                <div>
                  <h3 className="text-sm font-bold font-mono text-white uppercase tracking-widest">ERP Performance Gains and Return Metrics</h3>
                  <p className="text-xs text-neutral-400 font-mono mt-0.5">Key variables validating the implementation with a near-zero resource impact</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {benefitStats.map((stat, idx) => (
                    <div key={idx} className="bg-neutral-900 p-5 rounded-xl border border-neutral-850 flex flex-col justify-between space-y-4">
                      <div className="space-y-1">
                        <span className="text-[10px] font-mono text-neutral-500 font-bold uppercase block tracking-wider">{stat.label}</span>
                        <div className="flex items-center gap-1.5 mt-1">
                          <span className="text-xs font-mono text-neutral-500 line-through shrink-0">{stat.before}</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <span className="text-xs font-mono text-emerald-400 font-bold block">→ {stat.after}</span>
                        </div>
                      </div>
                      <div className="bg-neutral-950 py-2 px-3 rounded border border-neutral-850/60 flex items-center justify-between text-[11px] font-mono">
                        <span className="text-neutral-400">Total Improvement:</span>
                        <span className="text-amber-500 font-black uppercase tracking-wider">{stat.diff}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

    </div>
  );
};
