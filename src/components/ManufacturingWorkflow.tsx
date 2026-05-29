import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  collection, 
  doc, 
  setDoc, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  onSnapshot, 
  query, 
  where,
  getDocs,
  Timestamp 
} from 'firebase/firestore';
import { 
  Plus, 
  Search, 
  Trash2, 
  X, 
  Layers, 
  Calendar, 
  Users, 
  AlertTriangle, 
  CheckCircle2, 
  RefreshCw, 
  Tag, 
  SlidersHorizontal,
  ChevronRight,
  ChevronLeft,
  Flame,
  UserCheck,
  History,
  FileSpreadsheet,
  Gauge,
  Workflow,
  Coins,
  Cpu,
  Bookmark,
  PackageCheck
} from 'lucide-react';
import { db, isCloudConnected } from '../firebase';
import { UserProfile } from '../types/auth';

// --- STAGES DATA ---
export const WORKFLOW_STAGES = [
  "Pending", 
  "Design Approved", 
  "Cutting", 
  "Printing", 
  "Stitching", 
  "Quality Check", 
  "Packed", 
  "Ready for Delivery", 
  "Delivered"
] as const;

export type WorkflowStage = typeof WORKFLOW_STAGES[number];

export interface WorkflowCardItem {
  id: string; // e.g. "CC-MFT-7311"
  orderId: string; // reference sale ID e.g. "TOTT-2026-9501"
  customerName: string; // "Victorian Cricket Academy"
  quantity: number; // total units (e.g. 50 jerseys)
  dueDate: string; // "YYYY-MM-DD"
  assignedStaff: string; // e.g. "Vijay Merchant"
  progress: number; // 0 to 100
  priority: 'low' | 'medium' | 'high' | 'rush';
  paymentStatus: 'unpaid' | 'partially_paid' | 'paid';
  stage: WorkflowStage;
  notes: string;
  materials: {
    [itemName: string]: number; // material name to quantity consumed
  };
  history: {
    timestamp: string;
    stage: string;
    note: string;
    updatedBy: string;
  }[];
  createdAt: string;
  updatedAt: string;
}

// Preset cricket specific materials
const CRICKET_MATERIALS = [
  { key: 'willow_g1', name: 'Grade-1 English Willow Billet', unit: 'pcs' },
  { key: 'willow_g2', name: 'Grade-2 English Willow Billet', unit: 'pcs' },
  { key: 'jersey_blank', name: 'Jersey Sublimation Blank (Gold Edition)', unit: 'pcs' },
  { key: 'leather_pack', name: 'Alum-Tanned Red Leather Pack', unit: 'packs' },
  { key: 'gold_threads', name: 'Holographic Gold Silk Thread', unit: 'spools' },
  { key: 'batting_pads', name: 'Axiom Protective Pad Shell', unit: 'pairs' },
  { key: 'rubber_grip', name: 'Octopus Non-Slip Rubber Grip', unit: 'pcs' },
  { key: 'toe_cover', name: 'Heavy Duty Epoxy Toe Protectors', unit: 'pcs' }
];

// Initial dummy database when firestore is empty
const SEED_WORKFLOWS: WorkflowCardItem[] = [
  {
    id: "CC-MFT-8011",
    orderId: "TOTT-2026-9501",
    customerName: "Victorian Cricket Academy",
    quantity: 50,
    dueDate: "2026-05-29",
    assignedStaff: "Sarah Printworks",
    progress: 50,
    priority: "high",
    paymentStatus: "partially_paid",
    stage: "Printing",
    notes: "PMS Gold 131C vector sublimation alignment check. High heat curing cycle 180s.",
    materials: { "Jersey Sublimation Blank (Gold Edition)": 50, "Holographic Gold Silk Thread": 2 },
    history: [
      { timestamp: "2026-05-25T05:00:00Z", stage: "Pending", note: "Order custom ledger initialized under Melbourne branch", updatedBy: "Sir Donald Bradman" },
      { timestamp: "2026-05-25T08:30:00Z", stage: "Design Approved", note: "Roster vectors aligned with pantone palette", updatedBy: "Ricky Ponting" },
      { timestamp: "2026-05-25T11:00:00Z", stage: "Printing", note: "Run sequence queued on Sublimation Core #2", updatedBy: "Sarah Printworks" }
    ],
    createdAt: "2026-05-25T05:00:00Z",
    updatedAt: "2026-05-25T11:00:00Z"
  },
  {
    id: "CC-MFT-8012",
    orderId: "TOTT-2026-9502",
    customerName: "Melton Cobras CC",
    quantity: 12,
    dueDate: "2026-05-28",
    assignedStaff: "Vijay Merchant",
    progress: 35,
    priority: "rush",
    paymentStatus: "paid",
    stage: "Cutting",
    notes: "Willow block calibration. Weight must be 2.8lb exactly. Handle dynamic splice matching.",
    materials: { "Grade-1 English Willow Billet": 12, "Octopus Non-Slip Rubber Grip": 12 },
    history: [
      { timestamp: "2026-05-24T10:00:00Z", stage: "Pending", note: "Contract registered in ERP ledger", updatedBy: "Sir Donald Bradman" },
      { timestamp: "2026-05-25T02:15:00Z", stage: "Design Approved", note: "Blades specifications confirmed by team coach Stuart Broad", updatedBy: "Ricky Ponting" },
      { timestamp: "2026-05-25T06:00:00Z", stage: "Cutting", note: "Billet wood shaving started on bench 1", updatedBy: "Vijay Merchant" }
    ],
    createdAt: "2026-05-24T10:00:00Z",
    updatedAt: "2026-05-25T06:00:00Z"
  },
  {
    id: "CC-MFT-8013",
    orderId: "TOTT-2026-9503",
    customerName: "Stuart Broad (Refurb)",
    quantity: 1,
    dueDate: "2026-05-25",
    assignedStaff: "Vijay Merchant",
    progress: 80,
    priority: "low",
    paymentStatus: "unpaid",
    stage: "Quality Check",
    notes: "Epoxy toe guard tuning. Splinter grain binding and thread-wrap around Sweetspot.",
    materials: { "Heavy Duty Epoxy Toe Protectors": 1, "Holographic Gold Silk Thread": 1 },
    history: [
      { timestamp: "2026-05-23T04:00:00Z", stage: "Pending", note: "Refurbishment intake created", updatedBy: "Clara Ledger" },
      { timestamp: "2026-05-24T06:00:00Z", stage: "Cutting", note: "Shaving splintered edges on blade block", updatedBy: "Vijay Merchant" },
      { timestamp: "2026-05-24T14:00:00Z", stage: "Stitching", note: "Fine twine winding done around shoulder", updatedBy: "Vijay Merchant" },
      { timestamp: "2026-05-25T09:00:00Z", stage: "Quality Check", note: "Weight test passed. Ready for premium polish", updatedBy: "Vijay Merchant" }
    ],
    createdAt: "2026-05-23T04:00:00Z",
    updatedAt: "2026-05-25T09:00:00Z"
  },
  {
    id: "CC-MFT-8014",
    orderId: "TOTT-2026-9504",
    customerName: "Sydney Stars Club",
    quantity: 120,
    dueDate: "2026-06-03",
    assignedStaff: "Ricky Ponting",
    progress: 65,
    priority: "medium",
    paymentStatus: "unpaid",
    stage: "Stitching",
    notes: "Four piece match-grade alum leather hand-stitching sequence. Triple alignment check.",
    materials: { "Alum-Tanned Red Leather Pack": 40, "Holographic Gold Silk Thread": 3 },
    history: [
      { timestamp: "2026-05-21T02:00:00Z", stage: "Pending", note: "Mass ball custom package setup completed", updatedBy: "Sir Donald Bradman" },
      { timestamp: "2026-05-22T08:00:00Z", stage: "Cutting", note: "Leather templates stamped and sorted", updatedBy: "Vijay Merchant" },
      { timestamp: "2026-05-25T01:00:00Z", stage: "Stitching", note: "Transitioning to triple nylon lock stitch workflow", updatedBy: "Ricky Ponting" }
    ],
    createdAt: "2026-05-21T02:00:00Z",
    updatedAt: "2026-05-25T01:00:00Z"
  },
  {
    id: "CC-MFT-8015",
    orderId: "TOTT-2026-9505",
    customerName: "Lions Sports Club",
    quantity: 30,
    dueDate: "2026-06-12",
    assignedStaff: "Kane Stockroom",
    progress: 20,
    priority: "medium",
    paymentStatus: "paid",
    stage: "Design Approved",
    notes: "Embroidery matching on heavy-capacity fabrics. Waterproof lining specs check.",
    materials: {},
    history: [
      { timestamp: "2026-05-25T03:00:00Z", stage: "Pending", note: "ERP entry created", updatedBy: "Sir Donald Bradman" },
      { timestamp: "2026-05-25T07:00:00Z", stage: "Design Approved", note: "Sticker logo proofs matched by coach Stuart Broad", updatedBy: "Kane Stockroom" }
    ],
    createdAt: "2026-05-25T03:00:00Z",
    updatedAt: "2026-05-25T07:00:00Z"
  }
];

interface ManufacturingWorkflowProps {
  branchScope: string;
  profile: UserProfile | null;
}

export const ManufacturingWorkflow: React.FC<ManufacturingWorkflowProps> = ({ branchScope, profile }) => {
  const [cards, setCards] = useState<WorkflowCardItem[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedPriority, setSelectedPriority] = useState<string>('all');
  const [selectedStaff, setSelectedStaff] = useState<string>('all');
  const [syncing, setSyncing] = useState(false);

  // Modals / Panels
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [editingCard, setEditingCard] = useState<WorkflowCardItem | null>(null);

  // New Card Form State
  const [newCard, setNewCard] = useState<Partial<WorkflowCardItem>>({
    orderId: '',
    customerName: '',
    quantity: 1,
    dueDate: new Date().toISOString().split('T')[0],
    assignedStaff: 'Vijay Merchant',
    priority: 'medium',
    paymentStatus: 'unpaid',
    stage: 'Pending',
    notes: '',
    materials: {}
  });

  // Default interactive material state inside modlas
  const [cardMaterials, setCardMaterials] = useState<Record<string, number>>({});
  const [newMaterialName, setNewMaterialName] = useState('');
  const [newMaterialQty, setNewMaterialQty] = useState(1);

  // Define default workflow completion levels
  const getDefaultProgressForStage = (stage: WorkflowStage): number => {
    switch (stage) {
      case "Pending": return 5;
      case "Design Approved": return 20;
      case "Cutting": return 40;
      case "Printing": return 55;
      case "Stitching": return 70;
      case "Quality Check": return 85;
      case "Packed": return 90;
      case "Ready for Delivery": return 95;
      case "Delivered": return 100;
    }
  };

  // Predefined list of team workers for assignments from context list
  const WORKERS = [
    "Vijay Merchant",
    "Sarah Printworks",
    "Ricky Ponting",
    "Sir Donald Bradman",
    "Clara Ledger",
    "Kane Stockroom"
  ];

  // Helper function to throw schema specific errors
  const handleFirestoreError = (error: unknown, operationType: string, path: string | null) => {
    const errInfo = {
      error: error instanceof Error ? error.message : String(error),
      operationType,
      path,
      authInfo: {
        userId: profile?.uid,
        email: profile?.email
      }
    };
    console.error('Firestore Error Payload: ', JSON.stringify(errInfo));
    alert(`Firestore Security constraint failed: ${errInfo.error}. Make sure you carry valid multi-branch staff authentications!`);
  };

  // --- Realtime Firestore Sync or persistence ---
  useEffect(() => {
    setSyncing(true);
    if (isCloudConnected) {
      const q = query(collection(db, 'manufacturing_workflows'));
      const unsubscribe = onSnapshot(q, (snapshot) => {
        const fetched: WorkflowCardItem[] = [];
        snapshot.forEach((docSnap) => {
          fetched.push({ ...docSnap.data() } as WorkflowCardItem);
        });
        
        if (fetched.length === 0) {
          // If Firestore exists but collection is empty, seed it to give an interactive layout
          setCards(SEED_WORKFLOWS);
          SEED_WORKFLOWS.forEach(async (card) => {
            try {
              await setDoc(doc(db, 'manufacturing_workflows', card.id), card);
            } catch (tr) {
              console.warn("Could not seeding card in cloud database", tr);
            }
          });
        } else {
          setCards(fetched);
        }
        setSyncing(false);
      }, (error) => {
        console.error("onSnapshot failed, falling back to local simulation: ", error);
        loadLocalSimulation();
      });
      return () => unsubscribe();
    } else {
      loadLocalSimulation();
    }
  }, []);

  const loadLocalSimulation = () => {
    const cached = localStorage.getItem('erp_manufacturing_workflows_data');
    if (cached) {
      setCards(JSON.parse(cached));
    } else {
      setCards(SEED_WORKFLOWS);
      localStorage.setItem('erp_manufacturing_workflows_data', JSON.stringify(SEED_WORKFLOWS));
    }
    setSyncing(false);
  };

  // Persist locally if offline
  const saveState = async (nextCards: WorkflowCardItem[]) => {
    setCards(nextCards);
    if (!isCloudConnected) {
      localStorage.setItem('erp_manufacturing_workflows_data', JSON.stringify(nextCards));
    }
  };

  // --- ACTIONS ---

  // Drag-and-drop state
  const handleDragStart = (e: React.DragEvent, cardId: string) => {
    e.dataTransfer.setData('text/plain', cardId);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = async (e: React.DragEvent, targetStage: WorkflowStage) => {
    e.preventDefault();
    const cardId = e.dataTransfer.getData('text/plain');
    if (!cardId) return;

    await moveCardStage(cardId, targetStage, "Dragged to next column lane");
  };

  // Stage modification handle
  const moveCardStage = async (cardId: string, nextStage: WorkflowStage, auditComment?: string) => {
    const targetCard = cards.find(c => c.id === cardId);
    if (!targetCard) return;

    const previousStage = targetCard.stage;
    if (previousStage === nextStage) return;

    // Build timeline log
    const updatedBy = profile?.name || 'Authorized Craftsman';
    const transitionLog = {
      timestamp: new Date().toISOString(),
      stage: nextStage,
      note: auditComment || `Transitioned status from ${previousStage} to ${nextStage}`,
      updatedBy
    };

    const newHistory = [...targetCard.history, transitionLog];
    const newProgress = getDefaultProgressForStage(nextStage);

    const updatedCard: WorkflowCardItem = {
      ...targetCard,
      stage: nextStage,
      progress: newProgress,
      history: newHistory,
      updatedAt: transitionLog.timestamp
    };

    const nextCollection = cards.map(c => c.id === cardId ? updatedCard : c);
    await saveState(nextCollection);

    if (isCloudConnected) {
      try {
        await updateDoc(doc(db, 'manufacturing_workflows', cardId), {
          stage: nextStage,
          progress: newProgress,
          history: newHistory,
          updatedAt: transitionLog.timestamp
        });
      } catch (err) {
        handleFirestoreError(err, 'update', `manufacturing_workflows/${cardId}`);
        // rollback
        loadLocalSimulation();
      }
    }
  };

  // Submit Brand New Custom Order Job
  const handleRegisterJob = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCard.customerName) {
      alert("Please provide the guarantor custom customer name");
      return;
    }

    const uniqueId = `CC-MFT-${Math.floor(1000 + Math.random() * 9000)}`;
    const matchedOrderId = newCard.orderId || `ORD-2026-${Math.floor(1000 + Math.random() * 9000)}`;
    const stamp = new Date().toISOString();

    const createdCard: WorkflowCardItem = {
      id: uniqueId,
      orderId: matchedOrderId,
      customerName: newCard.customerName,
      quantity: Number(newCard.quantity) || 1,
      dueDate: newCard.dueDate || stamp.split('T')[0],
      assignedStaff: newCard.assignedStaff || 'Vijay Merchant',
      progress: getDefaultProgressForStage(newCard.stage || 'Pending'),
      priority: (newCard.priority as any) || 'medium',
      paymentStatus: (newCard.paymentStatus as any) || 'unpaid',
      stage: newCard.stage || 'Pending',
      notes: newCard.notes || '',
      materials: cardMaterials,
      history: [
        {
          timestamp: stamp,
          stage: newCard.stage || 'Pending',
          note: `Intake registered successfully: ${newCard.notes || 'Custom assembly started'}`,
          updatedBy: profile?.name || 'System Operator'
        }
      ],
      createdAt: stamp,
      updatedAt: stamp
    };

    const nextCollection = [createdCard, ...cards];
    await saveState(nextCollection);

    if (isCloudConnected) {
      try {
        await setDoc(doc(db, 'manufacturing_workflows', uniqueId), createdCard);
      } catch (err) {
        handleFirestoreError(err, 'create', `manufacturing_workflows/${uniqueId}`);
        loadLocalSimulation();
      }
    }

    // Reset Form
    setNewCard({
      orderId: '',
      customerName: '',
      quantity: 1,
      dueDate: new Date().toISOString().split('T')[0],
      assignedStaff: 'Vijay Merchant',
      priority: 'medium',
      paymentStatus: 'unpaid',
      stage: 'Pending',
      notes: '',
      materials: {}
    });
    setCardMaterials({});
    setIsCreateModalOpen(false);
  };

  // Update Existing Specs Inside Card edit Modal
  const handleSaveCardEdits = async () => {
    if (!editingCard) return;

    const stamp = new Date().toISOString();
    const updatedBy = profile?.name || 'ERP Overseer';

    // Verify if due date or priority changed to insert a history log
    const original = cards.find(c => c.id === editingCard.id);
    const addedHistory = [];
    if (original) {
      if (original.assignedStaff !== editingCard.assignedStaff) {
        addedHistory.push({
          timestamp: stamp,
          stage: editingCard.stage,
          note: `Staff re-assigned: ${original.assignedStaff} ➔ ${editingCard.assignedStaff}`,
          updatedBy
        });
      }
      if (original.priority !== editingCard.priority) {
        addedHistory.push({
          timestamp: stamp,
          stage: editingCard.stage,
          note: `Priority scaled: ${original.priority.toUpperCase()} ➔ ${editingCard.priority.toUpperCase()}`,
          updatedBy
        });
      }
      if (original.dueDate !== editingCard.dueDate) {
        addedHistory.push({
          timestamp: stamp,
          stage: editingCard.stage,
          note: `Due date rescheduled: ${original.dueDate} ➔ ${editingCard.dueDate}`,
          updatedBy
        });
      }
    }

    const compiledHistory = original 
      ? [...original.history, ...addedHistory] 
      : editingCard.history;

    const modifiedCard: WorkflowCardItem = {
      ...editingCard,
      materials: cardMaterials,
      history: compiledHistory,
      updatedAt: stamp
    };

    const nextCollection = cards.map(c => c.id === editingCard.id ? modifiedCard : c);
    await saveState(nextCollection);

    if (isCloudConnected) {
      try {
        await setDoc(doc(db, 'manufacturing_workflows', editingCard.id), modifiedCard);
      } catch (err) {
        handleFirestoreError(err, 'update', `manufacturing_workflows/${editingCard.id}`);
        loadLocalSimulation();
      }
    }

    setEditingCard(null);
  };

  // Delete card entirely
  const handleDeleteCard = async (id: string) => {
    if (!window.confirm("Critical Action: Archive or delete this sports custom workflow card?")) return;

    const nextCollection = cards.filter(c => c.id !== id);
    await saveState(nextCollection);

    if (isCloudConnected) {
      try {
        await deleteDoc(doc(db, 'manufacturing_workflows', id));
      } catch (err) {
        handleFirestoreError(err, 'delete', `manufacturing_workflows/${id}`);
        loadLocalSimulation();
      }
    }

    setEditingCard(null);
  };

  // Quick material handlers inside modals and forms
  const addMaterialQtyField = (name: string, quantity: number) => {
    if (!name) return;
    setCardMaterials(prev => ({
      ...prev,
      [name]: (prev[name] || 0) + quantity
    }));
  };

  const removeMaterialQtyField = (name: string) => {
    setCardMaterials(prev => {
      const copy = { ...prev };
      delete copy[name];
      return copy;
    });
  };

  // Open Edit panel & populate properties
  const openCardEdits = (card: WorkflowCardItem) => {
    setEditingCard(card);
    setCardMaterials(card.materials || {});
  };

  // --- ANALYTICS CALCULATIONS ---
  const activeCards = cards.filter(c => c.stage !== 'Delivered');
  const finishedCards = cards.filter(c => c.stage === 'Delivered');
  
  // Calculate average completion metrics
  const getAverageProgress = () => {
    if (cards.length === 0) return 0;
    const sum = cards.reduce((acc, c) => acc + c.progress, 0);
    return Math.round(sum / cards.length);
  };

  // Calculate current delay count (due date passed today's 2026-05-25 date and not Delivered)
  const getDelayedCount = () => {
    const todayStr = '2026-05-25'; // Fixed current temporal baseline
    return cards.filter(c => c.stage !== 'Delivered' && c.dueDate < todayStr).length;
  };

  // Sum raw packaging material units consumed
  const getTotalMaterialsConsumed = () => {
    let sum = 0;
    cards.forEach(c => {
      Object.values(c.materials || {}).forEach(v => {
        sum += (v as number) || 0;
      });
    });
    return sum;
  };

  // --- FILTERS APPLIED ---
  const filteredCards = cards.filter(card => {
    const matchSearch = card.customerName.toLowerCase().includes(searchQuery.toLowerCase()) || 
                        card.orderId.toLowerCase().includes(searchQuery.toLowerCase()) || 
                        card.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
                        (card.notes && card.notes.toLowerCase().includes(searchQuery.toLowerCase()));
    
    const matchPriority = selectedPriority === 'all' || card.priority === selectedPriority;
    const matchWorker = selectedStaff === 'all' || card.assignedStaff === selectedStaff;

    return matchSearch && matchPriority && matchWorker;
  });

  return (
    <div className="bg-slate-50 min-h-screen text-slate-800 font-sans p-6 md:p-8 rounded-2xl border border-slate-200" id="manufacturing-module-root">
      
      {/* 1. Header with custom workflow specs */}
      <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-6 pb-6 border-b border-slate-200/80 mb-6">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-2 bg-amber-500/10 text-[#E5B84B] rounded-xl border border-amber-500/20">
              <Workflow className="w-5 h-5 stroke-[2.5]" />
            </span>
            <h2 className="text-xl font-bold font-mono tracking-tight text-slate-900">
              Cricket Manufacturing Workflow Board
            </h2>
          </div>
          <p className="text-xs text-slate-500 font-mono mt-1">
            Realtime factory tracking: Cutting, Screen printing alignment, Sublimation ink specifications, and QA milestones.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {syncing && (
            <span className="flex items-center gap-1.5 text-xs text-amber-500 font-mono animate-pulse">
              <RefreshCw className="w-3.5 h-3.5 animate-spin" />
              <span>Syncing Firestore...</span>
            </span>
          )}

          <button
            onClick={() => setIsCreateModalOpen(true)}
            className="px-4 py-2.5 bg-gradient-to-r from-[#E5B84B] to-amber-600 hover:from-amber-400 hover:to-amber-500 text-white hover:text-neutral-950 font-mono rounded-xl text-xs font-bold tracking-wider uppercase transition-all shadow-md shadow-amber-500/10 flex items-center gap-2 shrink-0 active:scale-95"
            id="register-job-btn"
          >
            <Plus className="w-4 h-4 stroke-[3]" />
            <span>Enqueue Custom Job</span>
          </button>
        </div>
      </div>

      {/* 2. Top-Level Workflow Analytics Widgets */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8" id="analytics-grid-widgets">
        
        {/* Active workload count */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm flex items-center gap-4">
          <div className="p-3.5 bg-sky-50 text-sky-600 rounded-xl border border-sky-100">
            <Gauge className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[10px] text-slate-400 font-mono block uppercase font-black tracking-wider">Active Factory queue</span>
            <span className="text-xl font-bold font-mono text-slate-800 leading-tight">
              {activeCards.length} orders
            </span>
            <span className="text-[10px] text-slate-400 block font-mono mt-0.5">
              {finishedCards.length} delivered successfully
            </span>
          </div>
        </div>

        {/* Delay alert and priority rush items */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm flex items-center gap-4">
          <div className={`p-3.5 rounded-xl border ${getDelayedCount() > 0 ? 'bg-rose-50 text-rose-500 border-rose-100 animate-pulse' : 'bg-amber-50 text-amber-500 border-amber-100'}`}>
            <AlertTriangle className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[10px] text-slate-400 font-mono block uppercase font-black tracking-wider">Delay Red flags</span>
            <span className="text-xl font-bold font-mono text-slate-800 leading-tight">
              {getDelayedCount()} Overdue
            </span>
            <span className="text-[10px] text-rose-500 block font-mono font-bold mt-0.5">
              Requires immediate action
            </span>
          </div>
        </div>

        {/* Global completion rate */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm flex items-center gap-4">
          <div className="p-3.5 bg-amber-50 text-amber-500 rounded-xl border border-amber-100">
            <Flame className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[10px] text-slate-400 font-mono block uppercase font-black tracking-wider">Avg Stage progress</span>
            <span className="text-xl font-bold font-mono text-slate-800 leading-tight">
              {getAverageProgress()}%
            </span>
            <div className="w-full bg-slate-100 h-1.5 rounded-full mt-1.5 overflow-hidden">
              <div className="bg-[#E5B84B] h-full rounded-full transition-all duration-300" style={{ width: `${getAverageProgress()}%` }} />
            </div>
          </div>
        </div>

        {/* Material raw usage tally */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm flex items-center gap-4">
          <div className="p-3.5 bg-emerald-50 text-emerald-600 rounded-xl border border-emerald-100">
            <PackageCheck className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[10px] text-slate-400 font-mono block uppercase font-black tracking-wider">Material units consumed</span>
            <span className="text-xl font-bold font-mono text-slate-800 leading-tight text-emerald-600">
              {getTotalMaterialsConsumed()} units
            </span>
            <span className="text-[10px] text-slate-400 block font-mono mt-0.5">
              English willow & jerseys
            </span>
          </div>
        </div>

      </div>

      {/* 3. Search and Action Filters Dashboard */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-sm mb-8 flex flex-col md:flex-row gap-4 items-center justify-between" id="filtering-rail">
        
        {/* Search query field */}
        <div className="relative w-full md:max-w-md">
          <Search className="absolute left-3 top-2.5 w-4.5 h-4.5 text-slate-400" />
          <input
            type="text"
            placeholder="Search by ID, customer name, notes, order refer..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 focus:border-amber-400 focus:bg-white rounded-xl text-xs text-slate-700 placeholder-slate-400 transition-all font-mono outline-none"
          />
        </div>

        {/* Category filters */}
        <div className="flex flex-wrap items-center gap-3 w-full md:w-auto justify-end">
          
          {/* Priority filter */}
          <div className="flex items-center gap-1.5">
            <Tag className="w-3.5 h-3.5 text-slate-400" />
            <select
              value={selectedPriority}
              onChange={(e) => setSelectedPriority(e.target.value)}
              className="px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-mono text-slate-600 hover:bg-slate-100 outline-none"
            >
              <option value="all">Priority (All)</option>
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
              <option value="rush">Rush</option>
            </select>
          </div>

          {/* Assigned Worker filter */}
          <div className="flex items-center gap-1.5">
            <Users className="w-3.5 h-3.5 text-slate-400" />
            <select
              value={selectedStaff}
              onChange={(e) => setSelectedStaff(e.target.value)}
              className="px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-mono text-slate-600 hover:bg-slate-100 outline-none"
            >
              <option value="all">Staff Assigned (All)</option>
              {WORKERS.map(worker => (
                <option key={worker} value={worker}>{worker}</option>
              ))}
            </select>
          </div>

          <button
            onClick={() => {
              setSearchQuery('');
              setSelectedPriority('all');
              setSelectedStaff('all');
            }}
            className="p-1 px-2.5 bg-slate-100 hover:bg-slate-200 text-slate-500 rounded-lg text-xs font-mono transition-all"
            title="Reset active filtering parameters"
          >
            Clear Filters
          </button>

        </div>
      </div>

      {/* 4. DRAG AND DROP KANBAN BOARD WRAPPER */}
      <div className="overflow-x-auto pb-6" id="kanban-scroller-track">
        <div className="flex gap-4 select-none min-w-[1200px] xl:grid xl:grid-cols-9 xl:min-w-fit">
          
          {WORKFLOW_STAGES.map((stageIndex) => {
            const laneCards = filteredCards.filter(c => c.stage === stageIndex);
            
            return (
              <div
                key={stageIndex}
                onDragOver={handleDragOver}
                onDrop={(e) => handleDrop(e, stageIndex)}
                className="bg-slate-100/70 py-4 px-3 rounded-2xl flex flex-col min-h-[550px] w-[280px] xl:w-auto border border-slate-200/50 transition-colors duration-200 hover:bg-slate-100"
                id={`kanban-lane-${stageIndex.toLowerCase().replace(/\s+/g, '-')}`}
              >
                
                {/* Lane headers block */}
                <div className="flex items-center justify-between px-1 mb-3 pb-2 border-b border-slate-200">
                  <div className="flex flex-col">
                    <span className="text-[11px] font-black tracking-wider uppercase font-mono text-slate-700 block truncate max-w-[200px]" title={stageIndex}>
                      {stageIndex}
                    </span>
                    <span className="text-[9px] text-slate-400 font-mono mt-0.5">
                      {laneCards.length} {laneCards.length === 1 ? 'task' : 'tasks'}
                    </span>
                  </div>
                  
                  {/* Visual accent indicators in gold/amber */}
                  <span className="px-2 py-0.5 bg-white border border-slate-200 rounded text-[9px] font-mono text-[#E5B84B] font-bold">
                    {laneCards.reduce((acc, c) => acc + c.quantity, 0)} pcs
                  </span>
                </div>

                {/* Vertical listing of cards inside lane */}
                <div className="flex-1 space-y-3 overflow-y-auto max-h-[500px] pr-1 scrollbar-thin">
                  {laneCards.length === 0 ? (
                    <div className="h-28 border border-dashed border-slate-350 rounded-xl flex items-center justify-center p-4 text-center text-[10px] font-mono text-slate-400">
                      Drag & Drop here
                    </div>
                  ) : (
                    laneCards.map(card => {
                      const todayStr = '2026-05-25'; // Temporal baseline
                      const isDelayed = card.stage !== 'Delivered' && card.dueDate < todayStr;
                      
                      // Material items key string summary
                      const matKeys = Object.keys(card.materials || {});

                      return (
                        <div
                          key={card.id}
                          draggable
                          onDragStart={(e) => handleDragStart(e, card.id)}
                          onClick={() => openCardEdits(card)}
                          className={`bg-white border-2 rounded-xl p-3.5 shadow-sm hover:shadow-md cursor-pointer transition-all duration-200 group relative ${isDelayed ? 'border-rose-300 hover:border-rose-400' : 'border-slate-100 hover:border-[#E5B84B]'}`}
                          id={`card-${card.id}`}
                        >
                          {/* Alert delayed badge */}
                          {isDelayed && (
                            <span className="absolute -top-2 -right-1 bg-rose-600 text-white text-[8px] font-mono font-black py-0.5 px-1.5 rounded-full shadow border border-white uppercase tracking-wider animate-bounce">
                              ⚠️ Delayed
                            </span>
                          )}

                          {/* Top row: ID and Priority Tag */}
                          <div className="flex items-center justify-between gap-2 mb-2">
                            <span className="text-[9px] bg-slate-100 text-slate-500 font-bold px-1.5 py-0.5 rounded border border-slate-200 font-mono truncate">
                              {card.id}
                            </span>
                            
                            {/* Color-coded priority marker */}
                            <span className={`px-1.5 py-0.5 rounded text-[8px] font-mono font-bold uppercase tracking-widest ${card.priority === 'rush' ? 'bg-rose-150 text-rose-600 border border-rose-200 animate-pulse' : card.priority === 'high' ? 'bg-orange-50 text-orange-600 border border-orange-200' : card.priority === 'medium' ? 'bg-amber-50 text-amber-600 border border-amber-200' : 'bg-slate-50 text-slate-600 border border-slate-200'}`}>
                              ● {card.priority}
                            </span>
                          </div>

                          {/* Title / Customer Name */}
                          <h4 className="text-xs font-bold font-sans text-slate-800 leading-snug group-hover:text-[#E5B84B] transition-colors truncate">
                            {card.customerName}
                          </h4>

                          {/* Specifications summary */}
                          <div className="mt-2 space-y-1 font-mono text-[10px] text-slate-500">
                            
                            {/* Order ID refer reference */}
                            <div className="flex items-center gap-1.5 truncate">
                              <Bookmark className="w-3 h-3 text-slate-400 shrink-0" />
                              <span>Ref: {card.orderId}</span>
                            </div>

                            {/* Quantity and items count */}
                            <div className="flex items-center gap-1.5">
                              <Cpu className="w-3 h-3 text-[#E5B84B] shrink-0" />
                              <span className="font-bold text-slate-700">Quantity: {card.quantity} sets</span>
                            </div>

                            {/* Due date marker */}
                            <div className="flex items-center justify-between gap-1 mt-1 font-sans">
                              <div className="flex items-center gap-1">
                                <Calendar className="w-3 h-3 text-slate-400" />
                                <span className={isDelayed ? 'text-rose-600 font-bold' : 'text-slate-500'}>{card.dueDate}</span>
                              </div>
                              <span className={`px-1.5 py-0.5 rounded text-[8px] font-mono uppercase font-black tracking-wide ${card.paymentStatus === 'paid' ? 'bg-emerald-100 text-emerald-700' : card.paymentStatus === 'partially_paid' ? 'bg-amber-100 text-amber-700' : 'bg-slate-100 text-slate-500'}`}>
                                {card.paymentStatus}
                              </span>
                            </div>
                          </div>

                          {/* Active Worker info */}
                          <div className="mt-3 pt-2 border-t border-slate-100 flex items-center justify-between gap-2">
                            <span className="text-[9px] text-slate-400 font-mono truncate max-w-[120px]">
                              👤 {card.assignedStaff || 'Unassigned'}
                            </span>
                            
                            {/* Progress bar and text */}
                            <div className="flex items-center gap-1.5 shrink-0">
                              <span className="text-[9px] font-bold text-[#E5B84B] font-mono">{card.progress}%</span>
                              <div className="w-10 bg-slate-100 h-1 rounded-full overflow-hidden">
                                <div className="bg-[#E5B84B] h-full rounded" style={{ width: `${card.progress}%` }} />
                              </div>
                            </div>
                          </div>

                          {/* Quick stage controls (Mobile responsiveness backup & flawless UI testing) */}
                          <div className="mt-2.5 pt-2 border-t border-slate-100/60 flex items-center justify-between gap-1">
                            <span className="text-[8px] text-slate-400 font-mono block uppercase">Quick Shift</span>
                            <div className="flex gap-1">
                              {stageIndex !== WORKFLOW_STAGES[0] && (
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    const prevIdx = WORKFLOW_STAGES.indexOf(stageIndex) - 1;
                                    moveCardStage(card.id, WORKFLOW_STAGES[prevIdx], "Shifted back using controls");
                                  }}
                                  className="p-0.5 bg-slate-50 hover:bg-slate-150 rounded border border-slate-200 text-slate-500"
                                  title="Move to previous stage"
                                >
                                  <ChevronLeft className="w-3 h-3" />
                                </button>
                              )}
                              {stageIndex !== WORKFLOW_STAGES[WORKFLOW_STAGES.length - 1] && (
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    const nextIdx = WORKFLOW_STAGES.indexOf(stageIndex) + 1;
                                    moveCardStage(card.id, WORKFLOW_STAGES[nextIdx], "Advanced stage using controls");
                                  }}
                                  className="p-0.5 bg-slate-50 hover:bg-slate-150 rounded border border-slate-200 text-slate-500"
                                  title="Move to next stage"
                                >
                                  <ChevronRight className="w-3 h-3" />
                                </button>
                              )}
                            </div>
                          </div>

                        </div>
                      );
                    })
                  )}
                </div>

              </div>
            );
          })}

        </div>
      </div>

      {/* --- ADD NEW CUSTOM WORKFLOW MODAL --- */}
      <AnimatePresence>
        {isCreateModalOpen && (
          <div className="fixed inset-0 bg-neutral-950/40 backdrop-blur-xs z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-2xl max-w-2xl w-full border border-slate-200 max-h-[90vh] overflow-y-auto p-6 shadow-2xl relative"
            >
              
              <button
                onClick={() => setIsCreateModalOpen(false)}
                className="absolute top-4 right-4 p-1.5 bg-slate-100 hover:bg-slate-200 rounded-full text-slate-400 hover:text-slate-600 transition-all font-mono"
              >
                <X className="w-4 h-4" />
              </button>

              <h3 className="text-lg font-bold font-mono text-slate-950 flex items-center gap-2 mb-4">
                <Workflow className="w-5 h-5 text-[#E5B84B]" />
                <span>Register Custom Manufacturing Intake</span>
              </h3>

              <form onSubmit={handleRegisterJob} className="space-y-4">
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  
                  {/* Customer / Team Name */}
                  <div className="space-y-1">
                    <label className="text-[10px] font-mono text-slate-500 uppercase block font-bold">Guarantor Customer Name *</label>
                    <input
                      type="text"
                      placeholder="e.g. Victorian Cricket Club"
                      required
                      value={newCard.customerName}
                      onChange={(e) => setNewCard(prev => ({ ...prev, customerName: e.target.value }))}
                      className="w-full bg-slate-50 border border-slate-200 focus:border-amber-400 rounded-lg p-2.5 text-xs text-slate-800 outline-none font-mono"
                    />
                  </div>

                  {/* Reference sales order */}
                  <div className="space-y-1">
                    <label className="text-[10px] font-mono text-slate-500 uppercase block font-bold">Order Reference ID (Optional)</label>
                    <input
                      type="text"
                      placeholder="e.g. TOTT-2026-9051"
                      value={newCard.orderId}
                      onChange={(e) => setNewCard(prev => ({ ...prev, orderId: e.target.value }))}
                      className="w-full bg-slate-50 border border-slate-200 focus:border-amber-400 rounded-lg p-2.5 text-xs text-slate-800 outline-none font-mono"
                    />
                  </div>

                  {/* Job batch unit quantity */}
                  <div className="space-y-1">
                    <label className="text-[10px] font-mono text-slate-500 uppercase block font-bold">Intake unit Quantity *</label>
                    <input
                      type="number"
                      min={1}
                      required
                      value={newCard.quantity}
                      onChange={(e) => setNewCard(prev => ({ ...prev, quantity: Number(e.target.value) }))}
                      className="w-full bg-slate-50 border border-slate-200 focus:border-amber-400 rounded-lg p-2.5 text-xs text-slate-800 outline-none font-mono font-bold"
                    />
                  </div>

                  {/* Specified Calendar promised due Date */}
                  <div className="space-y-1">
                    <label className="text-[10px] font-mono text-slate-500 uppercase block font-bold">Promised Delivery Date *</label>
                    <input
                      type="date"
                      required
                      value={newCard.dueDate}
                      onChange={(e) => setNewCard(prev => ({ ...prev, dueDate: e.target.value }))}
                      className="w-full bg-slate-50 border border-slate-200 focus:border-amber-400 rounded-lg p-2.5 text-xs text-slate-800 outline-none font-mono"
                    />
                  </div>

                  {/* Operational Worker assignment */}
                  <div className="space-y-1">
                    <label className="text-[10px] font-mono text-slate-500 uppercase block font-bold">Assigned Technician Bench</label>
                    <select
                      value={newCard.assignedStaff}
                      onChange={(e) => setNewCard(prev => ({ ...prev, assignedStaff: e.target.value }))}
                      className="w-full bg-slate-50 border border-slate-200 focus:border-amber-400 rounded-lg p-2.5 text-xs text-slate-800 outline-none font-mono"
                    >
                      {WORKERS.map(w => (
                        <option key={w} value={w}>{w}</option>
                      ))}
                    </select>
                  </div>

                  {/* Priority Tag setting */}
                  <div className="space-y-1">
                    <label className="text-[10px] font-mono text-slate-500 uppercase block font-bold">Priority Milestone level</label>
                    <select
                      value={newCard.priority}
                      onChange={(e) => setNewCard(prev => ({ ...prev, priority: e.target.value as any }))}
                      className="w-full bg-slate-50 border border-slate-200 focus:border-amber-400 rounded-lg p-2.5 text-xs text-slate-800 outline-none font-mono"
                    >
                      <option value="low">Low Mode</option>
                      <option value="medium">Medium Standard</option>
                      <option value="high">High Velocity</option>
                      <option value="rush">🔥 RUSH PIPELINE</option>
                    </select>
                  </div>

                  {/* Payment clearance status */}
                  <div className="space-y-1">
                    <label className="text-[10px] font-mono text-slate-500 uppercase block font-bold">Financial Payment Clearance</label>
                    <select
                      value={newCard.paymentStatus}
                      onChange={(e) => setNewCard(prev => ({ ...prev, paymentStatus: e.target.value as any }))}
                      className="w-full bg-slate-50 border border-slate-200 focus:border-amber-400 rounded-lg p-2.5 text-xs text-slate-800 outline-none font-mono"
                    >
                      <option value="unpaid">Unpaid / Deferred</option>
                      <option value="partially_paid">Partially paid / Deposit cleared</option>
                      <option value="paid">Pre-paid Complete</option>
                    </select>
                  </div>

                  {/* Starting stage */}
                  <div className="space-y-1">
                    <label className="text-[10px] font-mono text-slate-500 uppercase block font-bold">Initial Stage Lane</label>
                    <select
                      value={newCard.stage}
                      onChange={(e) => setNewCard(prev => ({ ...prev, stage: e.target.value as any }))}
                      className="w-full bg-slate-50 border border-slate-200 focus:border-amber-400 rounded-lg p-2.5 text-xs text-slate-800 outline-none font-mono"
                    >
                      {WORKFLOW_STAGES.map(stage => (
                        <option key={stage} value={stage}>{stage}</option>
                      ))}
                    </select>
                  </div>

                </div>

                {/* Material Allocation subform */}
                <div className="bg-slate-50 p-4 rounded-xl border border-slate-200/60 mt-2">
                  <h4 className="text-[10px] font-mono text-slate-500 uppercase block font-bold mb-2 tracking-wide text-neutral-900 border-b border-slate-200 pb-1">
                    🔧 Raw Materials Allocation Tracker
                  </h4>
                  
                  <div className="flex gap-2 items-center mb-3">
                    <select
                      value={newMaterialName}
                      onChange={(e) => setNewMaterialName(e.target.value)}
                      className="bg-white border border-slate-200 rounded-lg p-2 text-xs font-mono outline-none flex-1 max-w-sm"
                    >
                      <option value="">Select inventory stock material...</option>
                      {CRICKET_MATERIALS.map(m => (
                        <option key={m.key} value={m.name}>{m.name} ({m.unit})</option>
                      ))}
                    </select>
                    
                    <input
                      type="number"
                      min={1}
                      value={newMaterialQty}
                      onChange={(e) => setNewMaterialQty(Number(e.target.value))}
                      className="w-20 bg-white border border-slate-200 rounded-lg p-2 text-xs font-mono font-bold text-center outline-none"
                    />

                    <button
                      type="button"
                      onClick={() => {
                        if (!newMaterialName) return;
                        addMaterialQtyField(newMaterialName, newMaterialQty);
                        setNewMaterialName('');
                      }}
                      className="bg-neutral-900 hover:bg-neutral-800 text-white font-mono px-3 py-2 rounded-lg text-xs"
                    >
                      Allocate
                    </button>
                  </div>

                  {/* Sub-item listed layout */}
                  {Object.keys(cardMaterials).length === 0 ? (
                    <p className="text-[10px] text-slate-400 italic">No custom materials currently registered for this order cycle.</p>
                  ) : (
                    <div className="flex flex-wrap gap-2">
                      {Object.entries(cardMaterials).map(([name, qty]) => (
                        <span key={name} className="inline-flex items-center gap-1.5 px-2 py-1 bg-white border border-slate-200 rounded-xl text-[10px] font-mono text-slate-600">
                          <strong>{qty}x</strong> {name}
                          <button
                            type="button"
                            onClick={() => removeMaterialQtyField(name)}
                            className="text-rose-500 font-bold hover:text-rose-700 ml-1"
                          >
                            &times;
                          </button>
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                {/* Sublimation specification and workshop Notes */}
                <div className="space-y-1">
                  <label className="text-[10px] font-mono text-slate-500 uppercase block font-bold">Milling & Artwork Specifications Notes</label>
                  <textarea
                    rows={3}
                    placeholder="Provide specific dimensions, weight, handle grip preferences, sublimation pantone inks detail..."
                    value={newCard.notes}
                    onChange={(e) => setNewCard(prev => ({ ...prev, notes: e.target.value }))}
                    className="w-full bg-slate-50 border border-slate-200 focus:border-amber-400 rounded-lg p-2.5 text-xs text-slate-800 outline-none font-sans"
                  />
                </div>

                {/* Submissions key triggers */}
                <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-3">
                  <button
                    type="button"
                    onClick={() => setIsCreateModalOpen(false)}
                    className="p-2 px-4 bg-slate-100 hover:bg-slate-200 rounded-xl text-slate-600 font-mono text-xs transition-all"
                  >
                    Discard
                  </button>
                  <button
                    type="submit"
                    className="p-2 px-6 bg-[#E5B84B] hover:bg-amber-500 text-white hover:text-slate-900 font-mono font-bold rounded-xl text-xs uppercase shadow-md active:scale-95 transition-all"
                  >
                    Dispatch to Factory &rarr;
                  </button>
                </div>

              </form>

            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* --- EDIT / DETAIL WORKFLOW CARD PANEL MODAL --- */}
      <AnimatePresence>
        {editingCard && (
          <div className="fixed inset-0 bg-neutral-950/40 backdrop-blur-xs z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-2xl max-w-3xl w-full border border-slate-200 max-h-[90vh] overflow-y-auto p-6 shadow-2xl relative grid grid-cols-1 md:grid-cols-12 gap-6"
            >
              
              <button
                onClick={() => setEditingCard(null)}
                className="absolute top-4 right-4 p-1.5 bg-slate-100 hover:bg-slate-200 rounded-full text-slate-400 hover:text-slate-600 transition-all font-mono"
              >
                <X className="w-4 h-4" />
              </button>

              {/* LEFT COLUMN: GENERAL EDIT METRIC */}
              <div className="md:col-span-7 space-y-4">
                
                <div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-[10px] bg-slate-100 border border-slate-200 text-slate-500 font-bold px-2 py-0.5 rounded font-mono">
                      {editingCard.id}
                    </span>
                    <span className="text-xs text-slate-450 font-mono">Order Ref: {editingCard.orderId}</span>
                  </div>
                  
                  <h3 className="text-base font-black font-sans text-slate-900 mt-1 flex items-center gap-1.5">
                    {editingCard.customerName}
                  </h3>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                  
                  {/* Current Active Stage selector */}
                  <div className="space-y-1">
                    <label className="text-[9px] font-mono text-slate-400 uppercase font-bold block">Current Stage Lane</label>
                    <select
                      value={editingCard.stage}
                      onChange={(e) => {
                        const targetStage = e.target.value as WorkflowStage;
                        setEditingCard(prev => prev ? {
                          ...prev,
                          stage: targetStage,
                          progress: getDefaultProgressForStage(targetStage)
                        } : null);
                      }}
                      className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 text-xs text-slate-700 font-mono outline-none"
                    >
                      {WORKFLOW_STAGES.map(s => (
                        <option key={s} value={s}>{s}</option>
                      ))}
                    </select>
                  </div>

                  {/* Manual Progress Override */}
                  <div className="space-y-1">
                    <label className="text-[9px] font-mono text-slate-400 uppercase font-bold block flex justify-between">
                      <span>Completion level</span>
                      <strong className="text-[#E5B84B]">{editingCard.progress}%</strong>
                    </label>
                    <input
                      type="range"
                      min={0}
                      max={100}
                      value={editingCard.progress}
                      onChange={(e) => {
                        const nextVal = Number(e.target.value);
                        setEditingCard(prev => prev ? { ...prev, progress: nextVal } : null);
                      }}
                      className="w-full h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-[#E5B84B] mt-2.5"
                    />
                  </div>

                  {/* Assigned Bench technician selection */}
                  <div className="space-y-1">
                    <label className="text-[9px] font-mono text-slate-400 uppercase font-bold block">Assigned Staff Roster</label>
                    <select
                      value={editingCard.assignedStaff}
                      onChange={(e) => setEditingCard(prev => prev ? { ...prev, assignedStaff: e.target.value } : null)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 text-xs text-slate-700 font-mono outline-none"
                    >
                      {WORKERS.map(w => (
                        <option key={w} value={w}>{w}</option>
                      ))}
                    </select>
                  </div>

                  {/* Priority Scaling setting */}
                  <div className="space-y-1">
                    <label className="text-[9px] font-mono text-slate-400 uppercase font-bold block">Priority Index</label>
                    <select
                      value={editingCard.priority}
                      onChange={(e) => setEditingCard(prev => prev ? { ...prev, priority: e.target.value as any } : null)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 text-xs text-slate-700 font-mono outline-none"
                    >
                      <option value="low">Low Priority</option>
                      <option value="medium">Medium Standard</option>
                      <option value="high">High Velocity</option>
                      <option value="rush">🔥 RUSH CRITICAL</option>
                    </select>
                  </div>

                  {/* Delivery calendar Promised Date */}
                  <div className="space-y-1">
                    <label className="text-[9px] font-mono text-slate-400 uppercase font-bold block">Promised Due Date</label>
                    <input
                      type="date"
                      value={editingCard.dueDate}
                      onChange={(e) => setEditingCard(prev => prev ? { ...prev, dueDate: e.target.value } : null)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 text-xs text-slate-700 font-mono outline-none"
                    />
                  </div>

                  {/* Payment status edit */}
                  <div className="space-y-1">
                    <label className="text-[9px] font-mono text-slate-400 uppercase font-bold block">Invoicing Status Clear</label>
                    <select
                      value={editingCard.paymentStatus}
                      onChange={(e) => setEditingCard(prev => prev ? { ...prev, paymentStatus: e.target.value as any } : null)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 text-xs text-slate-700 font-mono outline-none"
                    >
                      <option value="unpaid">Unpaid</option>
                      <option value="partially_paid">Partially paid</option>
                      <option value="paid">Pre-paid Fully</option>
                    </select>
                  </div>

                </div>

                {/* Sub-Material allocator panel */}
                <div className="bg-slate-50 p-4 rounded-xl border border-slate-200/60 mt-3">
                  <h4 className="text-[9px] font-mono text-slate-500 uppercase font-bold block tracking-wide text-neutral-900 border-b border-slate-200 pb-1 mb-2">
                    🔧 Track Factory Materials Spent
                  </h4>
                  
                  <div className="flex gap-2 items-center mb-3">
                    <select
                      value={newMaterialName}
                      onChange={(e) => setNewMaterialName(e.target.value)}
                      className="bg-white border border-slate-200 rounded-lg p-2 text-xs font-mono outline-none flex-1"
                    >
                      <option value="">Add stock item allocation...</option>
                      {CRICKET_MATERIALS.map(m => (
                        <option key={m.key} value={m.name}>{m.name}</option>
                      ))}
                    </select>

                    <button
                      type="button"
                      onClick={() => {
                        if (!newMaterialName) return;
                        addMaterialQtyField(newMaterialName, 1);
                        setNewMaterialName('');
                      }}
                      className="bg-[#E5B84B] hover:bg-amber-500 text-white font-mono px-3 py-2 rounded-lg text-xs"
                    >
                      Add +1
                    </button>
                  </div>

                  {/* Item badges display with increase/decrease quick tickers */}
                  {Object.keys(cardMaterials).length === 0 ? (
                    <p className="text-[10px] text-slate-400 italic">No materials units consumed registered yet.</p>
                  ) : (
                    <div className="space-y-1.5 max-h-[140px] overflow-y-auto pr-1">
                      {Object.entries(cardMaterials).map(([name, val]) => {
                        const qty = val as number;
                        return (
                          <div key={name} className="flex items-center justify-between bg-white border border-slate-200 rounded-lg p-1.5 px-3">
                            <span className="text-[11px] font-mono font-bold text-slate-700">{name}</span>
                            <div className="flex items-center gap-2">
                              <button
                                type="button"
                                onClick={() => {
                                  if (qty > 1) {
                                    setCardMaterials(prev => ({ ...prev, [name]: qty - 1 }));
                                  } else {
                                    removeMaterialQtyField(name);
                                  }
                                }}
                                className="w-5 h-5 bg-slate-100 hover:bg-slate-200 rounded font-bold text-xs"
                              >
                                -
                              </button>
                              <span className="font-mono font-bold text-xs w-6 text-center text-slate-800">{qty}</span>
                              <button
                                type="button"
                                onClick={() => {
                                  setCardMaterials(prev => ({ ...prev, [name]: qty + 1 }));
                                }}
                                className="w-5 h-5 bg-slate-100 hover:bg-slate-200 rounded font-bold text-xs"
                              >
                                +
                              </button>
                              <button
                                type="button"
                                onClick={() => removeMaterialQtyField(name)}
                                className="text-rose-500 font-bold font-mono text-xs hover:bg-rose-50 p-1 rounded"
                              >
                                &times;
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* Sublimation specification and workshop Notes */}
                <div className="space-y-1 mt-3">
                  <label className="text-[10px] font-mono text-slate-400 uppercase font-black block">Active Milling/Print notes specs</label>
                  <textarea
                    rows={3}
                    placeholder="Provide specific dimensions, weight, handle grip preferences, sublimation pantone inks detail..."
                    value={editingCard.notes}
                    onChange={(e) => {
                      const nextVal = e.target.value;
                      setEditingCard(prev => prev ? { ...prev, notes: nextVal } : null);
                    }}
                    className="w-full bg-slate-50 border border-slate-200 focus:border-amber-400 rounded-lg p-2.5 text-xs text-slate-850 outline-none font-sans"
                  />
                </div>

                {/* Save button and delete triggers */}
                <div className="pt-4 border-t border-slate-100 flex items-center justify-between gap-4">
                  <button
                    type="button"
                    onClick={() => handleDeleteCard(editingCard.id)}
                    className="p-2 bg-rose-50 hover:bg-rose-100 text-rose-600 rounded-xl font-mono text-xs transition-all flex items-center gap-1.5"
                    title="Remove custom order card entirely from tracker"
                  >
                    <Trash2 className="w-4 h-4" />
                    <span>Archive Job</span>
                  </button>

                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setEditingCard(null)}
                      className="p-2 px-4 bg-slate-100 hover:bg-slate-200 rounded-xl text-slate-600 font-mono text-xs transition-all"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={handleSaveCardEdits}
                      className="p-2 px-6 bg-gradient-to-r from-[#E5B84B] to-amber-600 text-white font-mono font-bold rounded-xl text-xs uppercase shadow-md hover:from-amber-400 hover:to-amber-500 active:scale-95 transition-all"
                    >
                      Save Specifications
                    </button>
                  </div>
                </div>

              </div>

              {/* RIGHT COLUMN: TIMELINE ACTION HISTORIES LOGS */}
              <div className="md:col-span-5 md:border-l md:border-slate-200 md:pl-6 space-y-4">
                
                <div className="flex items-center gap-1.5 text-slate-900 border-b border-slate-100 pb-2">
                  <History className="w-4 h-4 text-[#E5B84B]" />
                  <h4 className="text-xs font-black font-mono uppercase tracking-wider">
                    Timeline History Tracker
                  </h4>
                </div>

                {/* Action history logs list */}
                <div className="space-y-4 max-h-[440px] overflow-y-auto pr-1 scrollbar-thin">
                  {(!editingCard.history || editingCard.history.length === 0) ? (
                    <p className="text-[10px] text-slate-400 italic">No historical timeline audited.</p>
                  ) : (
                    editingCard.history.slice().reverse().map((log, index) => {
                      const dt = new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                      const dDate = new Date(log.timestamp).toLocaleDateString([], { month: 'short', day: 'numeric' });
                      
                      return (
                        <div key={index} className="flex gap-3 text-xs">
                          {/* Circle marker indicators */}
                          <div className="flex flex-col items-center">
                            <span className="w-2.5 h-2.5 rounded-full bg-[#E5B84B] shrink-0 outline outline-4 outline-amber-50" />
                            {index !== editingCard.history.length - 1 && (
                              <span className="w-0.5 h-16 bg-slate-100" />
                            )}
                          </div>

                          <div className="space-y-0.5 flex-1 bg-slate-50/70 p-2.5 rounded-xl border border-slate-200/50">
                            <span className="text-[10px] text-slate-400 font-mono block">
                              {dDate} at {dt}
                            </span>
                            
                            {/* Target stage status log */}
                            <span className="text-[9px] bg-amber-50 rounded px-1.5 py-0.5 border border-amber-100 font-mono font-bold text-[#E5B84B] inline-block uppercase mt-0.5">
                              {log.stage}
                            </span>

                            {/* Custom notes audit comments */}
                            <p className="text-[11px] text-slate-600 font-sans mt-1">
                              {log.note}
                            </p>

                            {/* Authentitor stamp */}
                            <span className="text-[9px] text-slate-400 font-mono block mt-1">
                              👤 User: {log.updatedBy || 'Unlogged'}
                            </span>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>

                {/* Manual append timeline note field */}
                <div className="bg-slate-150 rounded-xl p-3 border border-slate-200 space-y-2 mt-4">
                  <span className="text-[9px] font-mono uppercase font-black tracking-wide text-slate-600 block">
                    Append Timeline Audit Log
                  </span>
                  
                  <div className="flex gap-2">
                    <input
                      type="text"
                      id="append-note-input"
                      placeholder="Comment e.g. Handle splicing complete"
                      className="flex-1 bg-white border border-slate-200 rounded p-1.5 text-[11px] font-sans outline-none focus:border-amber-400"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        const elem = document.getElementById('append-note-input') as HTMLInputElement;
                        if (!elem || !elem.value) return;
                        
                        const logVal = elem.value;
                        const stamp = new Date().toISOString();
                        const userName = profile?.name || 'Authorized Craftsman';

                        const newLog = {
                          timestamp: stamp,
                          stage: editingCard.stage,
                          note: logVal,
                          updatedBy: userName
                        };

                        setEditingCard(prev => prev ? {
                          ...prev,
                          history: [...prev.history, newLog]
                        } : null);

                        elem.value = '';
                      }}
                      className="bg-neutral-900 hover:bg-neutral-800 text-white font-mono text-[10px] p-2 rounded shrink-0"
                    >
                      Post Note
                    </button>
                  </div>
                </div>

              </div>

            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
};
