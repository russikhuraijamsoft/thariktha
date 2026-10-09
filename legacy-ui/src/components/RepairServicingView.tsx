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
  getDocs,
  where,
  orderBy,
  limit,
  Timestamp
} from 'firebase/firestore';
import { 
  Wrench, 
  Plus, 
  Search, 
  Trash2, 
  X, 
  Calendar, 
  User, 
  AlertTriangle, 
  CheckCircle2, 
  RefreshCw, 
  DollarSign, 
  Eye, 
  Edit3, 
  ChevronRight, 
  Inbox, 
  Sparkles, 
  TrendingUp, 
  Tag, 
  CheckSquare, 
  PlusCircle, 
  Timer, 
  Layers, 
  ShieldAlert, 
  FileText, 
  UploadCloud, 
  Image as ImageIcon,
  Activity,
  History,
  Info
} from 'lucide-react';
import { db, isCloudConnected } from '../firebase';

// --- TYPES ---
export type ServiceWorkflowStage = 
  | 'Received' 
  | 'Inspection' 
  | 'Repair In Progress' 
  | 'Quality Check' 
  | 'Ready' 
  | 'Delivered';

export type ServiceType = 
  | 'Bat knocking' 
  | 'Grip replacement' 
  | 'Bat crack repair' 
  | 'Handle replacement' 
  | 'Shoe repair' 
  | 'Equipment repair' 
  | 'Net repair' 
  | 'Bowling machine servicing';

export interface RepairMaterialItem {
  materialId?: string; // Links to `products` collection SKU if applicable
  name: string;
  quantityUsed: number;
  unitCost: number;
  totalCost: number;
}

export interface ServiceTicket {
  id: string; // TKT-xxxx
  customerName: string;
  customerPhone?: string;
  customerEmail?: string;
  equipmentType: string; // e.g. "SS Ton Premium English Willow" or "Bowling Machine v3"
  problemDescription: string;
  serviceType: ServiceType;
  assignedTechnician: string;
  status: ServiceWorkflowStage;
  estimatedCompletion: string;
  materialsUsed: RepairMaterialItem[];
  laborCost: number;
  totalCost: number;
  notes: string[];
  beforeImages: string[];
  afterImages: string[];
  billingStatus: 'pending' | 'invoiced' | 'paid';
  createdAt: string;
  updatedAt: string;
}

// Preset Premium/Fallback Technicians Scoped to Branch Closets
const CONSTANT_TECHNICIANS = [
  { id: "tech-1", name: "Devesh Shastri", specialty: "English Willow Bat Craftsman", rating: 4.9 },
  { id: "tech-2", name: "Sarah Alum-Prints", specialty: "Netting & Bowling Machines Specialist", rating: 4.8 },
  { id: "tech-3", name: "Vijay Merchant", specialty: "Footwear & Leather Guard Customizer", rating: 4.7 }
];

// High quality visual matching dummy image pairs for cricket bat repairs
const MOCK_BEFORE_IMAGES = [
  "https://images.unsplash.com/photo-1544033527-b192daee1f5b?w=400&auto=format&fit=crop&q=80", // cracked bat wood
  "https://images.unsplash.com/photo-1509198397868-475647b2a1e5?w=400&auto=format&fit=crop&q=80", // worn grip
  "https://images.unsplash.com/photo-1530541930197-ff16ac917b0e?w=400&auto=format&fit=crop&q=80"  // split shoe structure
];

const MOCK_AFTER_IMAGES = [
  "https://images.unsplash.com/photo-1517137879134-48acfbe3be13?w=400&auto=format&fit=crop&q=80", // glossy polished bat wood
  "https://images.unsplash.com/photo-1540747737956-37872176da6a?w=400&auto=format&fit=crop&q=80", // neon green rubber grip
  "https://images.unsplash.com/photo-1461896836934-ffe607ba8211?w=400&auto=format&fit=crop&q=80"  // stitch-reinforced shoe soles
];

// Fallback seed tickets designed to represent real Talk of the Town client services
const SEED_SERVICE_TICKETS: ServiceTicket[] = [
  {
    id: "TKT-301",
    customerName: "Nathan Lyon CC",
    customerPhone: "+61 412 345 678",
    customerEmail: "lyon.nathan@vca.com.au",
    equipmentType: "SS Platina Cricket Bat (Grade 1)",
    problemDescription: "Severe shoulder grain splitting after heavy bowling machine delivery. Needs structural gluing, sleeve wrapping, and lin-oil seal.",
    serviceType: "Bat crack repair",
    assignedTechnician: "Devesh Shastri",
    status: "Repair In Progress",
    estimatedCompletion: "2026-05-28",
    materialsUsed: [
      { name: "Marine-Grade Willow Epoxy Glue", quantityUsed: 1, unitCost: 15, totalCost: 15 },
      { name: "Fiberglass Defense Protective Cover Tape", quantityUsed: 2, unitCost: 8, totalCost: 16 }
    ],
    laborCost: 45,
    totalCost: 76,
    notes: [
      "25-May-2026: Bat checked in. Inspected under 10x lens; cracks did not reach the core blade. Safe for high tension epoxy clamp.",
      "25-May-2026: Applied epoxy. Clamped under hydraulic press for 12 hours vacuum."
    ],
    beforeImages: [MOCK_BEFORE_IMAGES[0]],
    afterImages: [MOCK_AFTER_IMAGES[0]],
    billingStatus: 'invoiced',
    createdAt: "2026-05-25T09:15:00Z",
    updatedAt: "2026-05-25T14:30:00Z"
  },
  {
    id: "TKT-302",
    customerName: "Manipur Youth Sports Development Academy",
    customerPhone: "+91 385 244 5566",
    customerEmail: "mysda.admin@manipuryouthsports.org",
    equipmentType: "BOLA Professional Bowling Machine (Blue v3)",
    problemDescription: "Main driving rotor pitch speed fluctuating above 85mph. High friction grinding noisemakers.",
    serviceType: "Bowling machine servicing",
    assignedTechnician: "Sarah Alum-Prints",
    status: "Inspection",
    estimatedCompletion: "2026-05-30",
    materialsUsed: [
      { name: "Synthetic High-Temp Gear Lubricant", quantityUsed: 1, unitCost: 20, totalCost: 20 }
    ],
    laborCost: 120,
    totalCost: 140,
    notes: [
      "24-May-2026: Checked in. Electrical isolation complete. Disassembling safety canopy wheels."
    ],
    beforeImages: [MOCK_BEFORE_IMAGES[1]],
    afterImages: [],
    billingStatus: 'pending',
    createdAt: "2026-05-24T15:20:00Z",
    updatedAt: "2026-05-24T18:00:00Z"
  },
  {
    id: "TKT-303",
    customerName: "Chungkham Singh",
    customerPhone: "+91 94360 88221",
    customerEmail: "chungkham.singh@manipurathletics.org.in",
    equipmentType: "Gray-Nicolls Kaboom! Custom",
    problemDescription: "Worn traditional binding thread. Requires specialized 12,000lb knock-in cycles (2,000 strikes matching sweet spot target profile).",
    serviceType: "Bat knocking",
    assignedTechnician: "Devesh Shastri",
    status: "Ready",
    estimatedCompletion: "2026-05-25",
    materialsUsed: [
      { name: "Neon Lime Textured Octopus Grip", quantityUsed: 1, unitCost: 12, totalCost: 12 }
    ],
    laborCost: 60,
    totalCost: 72,
    notes: [
      "23-May-2026: Starting 12,000 strikes mechanical knock schedule on heavy roller bed.",
      "24-May-2026: Mechanical knocked completed. Edge resilience validation verified at 88% bounce absorption index.",
      "25-May-2026: Added double octopus rubber grip per player custom preference."
    ],
    beforeImages: [MOCK_BEFORE_IMAGES[1]],
    afterImages: [MOCK_AFTER_IMAGES[1]],
    billingStatus: 'paid',
    createdAt: "2026-05-23T11:00:00Z",
    updatedAt: "2026-05-25T11:45:00Z"
  }
];

export const RepairServicingView: React.FC<{
  branchScope: string;
  profile: any;
}> = ({ branchScope, profile }) => {
  // Sync Status
  const [syncStatus, setSyncStatus] = useState<'synced' | 'connecting' | 'offline'>('connecting');
  const [telemetryLogs, setTelemetryLogs] = useState<string[]>([]);

  // DB States
  const [tickets, setTickets] = useState<ServiceTicket[]>([]);
  const [products, setProducts] = useState<any[]>([]); // To support inventory deduction matching
  const [selectedTicket, setSelectedTicket] = useState<ServiceTicket | null>(null);

  // Form States & Modals
  const [isNewTicketModalOpen, setIsNewTicketModalOpen] = useState(false);
  const [isAssignModalOpen, setIsAssignModalOpen] = useState(false);
  const [isAddNoteModalOpen, setIsAddNoteModalOpen] = useState(false);
  const [isUpdateProgressModalOpen, setIsUpdateProgressModalOpen] = useState(false);
  const [isEditMaterialModalOpen, setIsEditMaterialModalOpen] = useState(false);

  // Search & Filtering
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedWorkflowFilter, setSelectedWorkflowFilter] = useState<string>("All");
  const [selectedServiceTypeFilter, setSelectedServiceTypeFilter] = useState<string>("All");

  // New Ticket Form State
  const [newTicket, setNewTicket] = useState({
    customerName: "",
    customerPhone: "",
    customerEmail: "",
    equipmentType: "",
    problemDescription: "",
    serviceType: 'Bat knocking' as ServiceType,
    assignedTechnician: "Devesh Shastri",
    estimatedCompletion: "",
    laborCost: 40,
    notes: "",
    beforeUrl: "",
    afterUrl: ""
  });

  // Material Tracker Helper State for custom additions
  const [tempMaterialName, setTempMaterialName] = useState("");
  const [tempMaterialQty, setTempMaterialQty] = useState(1);
  const [tempMaterialCost, setTempMaterialCost] = useState(10);
  const [linkedProductSku, setLinkedProductSku] = useState(""); // Optionally match product in inventory for live stock deductions!

  const [tempNoteText, setTempNoteText] = useState("");
  const [tempAssignee, setTempAssignee] = useState("Devesh Shastri");
  const [tempNextStage, setTempNextStage] = useState<ServiceWorkflowStage>('Inspection');

  // Logs Telemetry helper
  const logTelemetry = (text: string) => {
    const timeStr = new Date().toISOString().split('T')[1].slice(0, 8);
    setTelemetryLogs(prev => [`[${timeStr}] ${text}`, ...prev.slice(0, 15)]);
  };

  // 1. Establish database listeners
  useEffect(() => {
    logTelemetry("Initializing telemetry streams for Repairs & Servicing modules...");
    setSyncStatus('connecting');

    // Feed products so that we can select material items and deduct them
    let unsubProducts = () => {};
    try {
      const qProd = collection(db, 'products');
      unsubProducts = onSnapshot(qProd, (snap) => {
        const prodList: any[] = [];
        snap.forEach(doc => {
          prodList.push({ id: doc.id, ...doc.data() });
        });
        setProducts(prodList);
      }, (err) => {
        console.warn("Product listener failure: ", err);
      });
    } catch (e) {
      console.warn("Products stream setup error, moving to memory fallback: ", e);
    }

    // Check Cloud Status & Sync Service tickets
    if (isCloudConnected) {
      try {
        const qTickets = collection(db, 'servicing_tickets');
        const unsubTickets = onSnapshot(qTickets, (snapshot) => {
          if (snapshot.empty) {
            // Seed cloud db
            SEED_SERVICE_TICKETS.forEach(async (t) => {
              await setDoc(doc(db, 'servicing_tickets', t.id), t);
            });
            setTickets(SEED_SERVICE_TICKETS);
          } else {
            const list: ServiceTicket[] = [];
            snapshot.forEach((doc) => {
              list.push(doc.data() as ServiceTicket);
            });
            // Sort by ID or creation epoch
            list.sort((a,b) => b.id.localeCompare(a.id));
            setTickets(list);
          }
          setSyncStatus('synced');
          logTelemetry("Cloud replication of Repairs ledger established.");
        }, (error) => {
          console.error("Firestore loading error on service tickets: ", error);
          fallbackToLocal();
        });

        return () => {
          unsubProducts();
          unsubTickets();
        };
      } catch (err) {
        console.error("Firestore listener creation crashed: ", err);
        fallbackToLocal();
      }
    } else {
      fallbackToLocal();
    }

    function fallbackToLocal() {
      const localTickets = localStorage.getItem('servicing_tickets');
      if (localTickets) {
        try {
          setTickets(JSON.parse(localTickets));
        } catch (e) {
          console.error("Failed to parse servicing_tickets, fallback to seed:", e);
          setTickets(SEED_SERVICE_TICKETS);
          localStorage.setItem('servicing_tickets', JSON.stringify(SEED_SERVICE_TICKETS));
        }
      } else {
        setTickets(SEED_SERVICE_TICKETS);
        localStorage.setItem('servicing_tickets', JSON.stringify(SEED_SERVICE_TICKETS));
      }
      setSyncStatus('offline');
      logTelemetry("Offline sandboxed mode activated. Service tickets cached locally.");
    }
  }, []);

  // Sync to local storage
  useEffect(() => {
    if (tickets.length > 0) {
      localStorage.setItem('servicing_tickets', JSON.stringify(tickets));
    }
  }, [tickets]);

  // Create Service Ticket
  const handleCreateTicket = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTicket.customerName || !newTicket.equipmentType) {
      alert("Please specify Customer Name and Equipment model.");
      return;
    }

    const nextId = `TKT-${Math.floor(304 + Math.random() * 400)}`;
    const createdTicket: ServiceTicket = {
      id: nextId,
      customerName: newTicket.customerName,
      customerPhone: newTicket.customerPhone || "+61 400 000 000",
      customerEmail: newTicket.customerEmail || "customer@cricketcloset.id",
      equipmentType: newTicket.equipmentType,
      problemDescription: newTicket.problemDescription || "Routine structural maintenance check.",
      serviceType: newTicket.serviceType,
      assignedTechnician: newTicket.assignedTechnician,
      status: 'Received',
      estimatedCompletion: newTicket.estimatedCompletion || new Date(Date.now() + 5*24*60*60*1000).toISOString().split('T')[0],
      materialsUsed: [],
      laborCost: Number(newTicket.laborCost) || 30,
      totalCost: Number(newTicket.laborCost) || 30,
      notes: [
        `${new Date().toISOString().split('T')[0]}: Ticket compiled at branch drawer. Assigned to ${newTicket.assignedTechnician} for physical workbench assessment.`
      ],
      beforeImages: [newTicket.beforeUrl || MOCK_BEFORE_IMAGES[Math.floor(Math.random() * MOCK_BEFORE_IMAGES.length)]],
      afterImages: newTicket.afterUrl ? [newTicket.afterUrl] : [],
      billingStatus: 'pending',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    const updatedList = [createdTicket, ...tickets];
    setTickets(updatedList);
    logTelemetry(`🆕 SERVICE REGISTERED: Compiled ticket ${nextId} for ${createdTicket.customerName}`);

    if (isCloudConnected) {
      try {
        await setDoc(doc(db, 'servicing_tickets', nextId), createdTicket);
      } catch (err) {
        console.error("Firestore ticket registration failure: ", err);
      }
    }

    // Reset Form
    setNewTicket({
      customerName: "",
      customerPhone: "",
      customerEmail: "",
      equipmentType: "",
      problemDescription: "",
      serviceType: 'Bat knocking' as ServiceType,
      assignedTechnician: "Devesh Shastri",
      estimatedCompletion: "",
      laborCost: 40,
      notes: "",
      beforeUrl: "",
      afterUrl: ""
    });

    setIsNewTicketModalOpen(false);
  };

  // Workflow Stage advancement + Inventory / Bookkeeping Integration
  const advanceWorkflow = async (ticketId: string, nextStage: ServiceWorkflowStage) => {
    const targetObj = tickets.find(t => t.id === ticketId);
    if (!targetObj) return;

    const notesUpdated = [
      ...targetObj.notes,
      `${new Date().toISOString().split('T')[0]}: Progressed stage state to [${nextStage.toUpperCase()}]`
    ];

    const updated: ServiceTicket = {
      ...targetObj,
      status: nextStage,
      notes: notesUpdated,
      updatedAt: new Date().toISOString()
    };

    // If progression changes to READY/DELIVERED, generate double-entry billing logs
    if (nextStage === 'Ready' && targetObj.billingStatus === 'pending') {
      updated.billingStatus = 'invoiced';
      logTelemetry(`💳 Bookkeeping Desk Synchronization: Service Invoice compiled for ${targetObj.customerName} totalling $${targetObj.totalCost}.`);
      
      // Attempt to append to shared database 'transactions' collection for Billing View to reconcile
      if (isCloudConnected) {
        try {
          const txnId = `TXN-${Math.floor(1000 + Math.random() * 9000)}`;
          await setDoc(doc(db, 'transactions', txnId), {
            id: txnId,
            invoiceId: targetObj.id,
            orderId: 'SERVICE-REPAIR',
            customerName: targetObj.customerName,
            amount: targetObj.totalCost,
            paid: 0,
            date: new Date().toISOString().split('T')[0],
            method: 'Pending Invoice Claim',
            reference: `Servicing Workshop Repair ${targetObj.id}`,
            branchId: branchScope === 'Melbourne Closets' ? 'closet_melbourne' : 'closet_london',
            createdAt: new Date().toISOString()
          });
          logTelemetry(`💸 Transaction voucher ${txnId} linked with accounting ledger ledger matching indices.`);
        } catch (e) {
          console.warn("Could not push transaction invoice to cloud bookkeeping: ", e);
        }
      }
    }

    setTickets(prev => prev.map(t => t.id === ticketId ? updated : t));
    logTelemetry(`⚙️ Ticket ${ticketId} advanced to phase: [${nextStage.toUpperCase()}]`);

    if (isCloudConnected) {
      try {
        await setDoc(doc(db, 'servicing_tickets', ticketId), updated);
      } catch (err) {
        console.error("Firestore sync error advancing stage: ", err);
      }
    }
  };

  // Re-allocate technician allocation
  const reallocateTechnician = async (ticketId: string, technician: string) => {
    const targetObj = tickets.find(t => t.id === ticketId);
    if (!targetObj) return;

    const notesUpdated = [
      ...targetObj.notes,
      `${new Date().toISOString().split('T')[0]}: Reallocated workbench seat index. New Operator: ${technician}`
    ];

    const updated: ServiceTicket = {
      ...targetObj,
      assignedTechnician: technician,
      notes: notesUpdated,
      updatedAt: new Date().toISOString()
    };

    setTickets(prev => prev.map(t => t.id === ticketId ? updated : t));
    logTelemetry(`👷 Workbench seat adjustment for Ticket ${ticketId} -> ${technician}`);

    if (isCloudConnected) {
      try {
        await setDoc(doc(db, 'servicing_tickets', ticketId), updated);
      } catch (err) {
        console.error("Firestore shift technician failure: ", err);
      }
    }
    setIsAssignModalOpen(false);
  };

  // Append Raw Production workshop note logs
  const submitWorkshopNote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTicket || !tempNoteText.trim()) return;

    const notesUpdated = [
      ...selectedTicket.notes,
      `${new Date().toISOString().split('T')[0]}: ${tempNoteText.trim()}`
    ];

    const updated: ServiceTicket = {
      ...selectedTicket,
      notes: notesUpdated,
      updatedAt: new Date().toISOString()
    };

    setTickets(prev => prev.map(t => t.id === selectedTicket.id ? updated : t));
    logTelemetry(`📝 Appended engineering bench comment: "${tempNoteText}" to ${selectedTicket.id}`);

    if (isCloudConnected) {
      try {
        await setDoc(doc(db, 'servicing_tickets', selectedTicket.id), updated);
      } catch (err) {
        console.error("Firestore note creation failure: ", err);
      }
    }

    setTempNoteText("");
    setIsAddNoteModalOpen(false);
  };

  // Materials Tracking Cost Estimation with Real-Time Stock Subtraction Deductors
  const handleAddMaterial = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTicket || !tempMaterialName.trim()) return;

    const matQty = Number(tempMaterialQty) || 1;
    const matPrice = Number(tempMaterialCost) || 0;
    const matTotal = matQty * matPrice;

    const newMatObj: RepairMaterialItem = {
      materialId: linkedProductSku || undefined,
      name: tempMaterialName,
      quantityUsed: matQty,
      unitCost: matPrice,
      totalCost: matTotal
    };

    const updatedMaterials = [...selectedTicket.materialsUsed, newMatObj];
    const totalMaterialBilling = updatedMaterials.reduce((acc, current) => acc + current.totalCost, 0);
    const updatedTotalCost = selectedTicket.laborCost + totalMaterialBilling;

    const updated: ServiceTicket = {
      ...selectedTicket,
      materialsUsed: updatedMaterials,
      totalCost: updatedTotalCost,
      notes: [
        ...selectedTicket.notes,
        `${new Date().toISOString().split('T')[0]}: Added material component formulation. SKU: ${tempMaterialName} x${matQty} ($${matTotal.toFixed(2)})`
      ],
      updatedAt: new Date().toISOString()
    };

    // Live Stock depletion deductions from Firestore 'products' collection
    if (linkedProductSku) {
      const selectedProduct = products.find(p => p.sku === linkedProductSku);
      if (selectedProduct) {
        const previousStock = selectedProduct.currentStock;
        const newStock = Math.max(0, previousStock - matQty);
        logTelemetry(`📉 SUBTRACTION TRIGGER: Decreasing SKU ${linkedProductSku} by ${matQty} items. Stock level: ${newStock}`);

        if (isCloudConnected) {
          try {
            // Edit actual product stock in Firestore
            await updateDoc(doc(db, 'products', selectedProduct.id), {
              currentStock: newStock,
              updatedAt: new Date().toISOString()
            });

            // Write matching audit log to keep global records consistent
            await addDoc(collection(db, 'inventory_logs'), {
              productId: selectedProduct.id,
              productName: selectedProduct.name,
              sku: selectedProduct.sku,
              type: 'decrease',
              amount: matQty,
              previousStock,
              newStock,
              reason: `Servicing repair extraction ledger matching ticket ID: ${selectedTicket.id}`,
              operator: profile?.name || "Craftsman Workshop",
              branchId: branchScope,
              timestamp: new Date().toISOString()
            });
            logTelemetry(`📦 Material deduct successful. Stock logging completed dynamically.`);
          } catch (e) {
            console.error("Firestore product decrement write error: ", e);
          }
        }
      }
    }

    setTickets(prev => prev.map(t => t.id === selectedTicket.id ? updated : t));
    logTelemetry(`📐 Mat cost evaluation: Material additions updated total estimate. New total: $${updatedTotalCost}`);

    if (isCloudConnected) {
      try {
        await setDoc(doc(db, 'servicing_tickets', selectedTicket.id), updated);
      } catch (err) {
        console.error("Firestore cost sync failure: ", err);
      }
    }

    // Reset Form
    setTempMaterialName("");
    setTempMaterialQty(1);
    setTempMaterialCost(10);
    setLinkedProductSku("");
    setIsEditMaterialModalOpen(false);
  };

  // Helper UI Badge for billing status colors
  const getBillingBadge = (status: 'pending' | 'invoiced' | 'paid') => {
    switch (status) {
      case 'paid':
        return <span className="bg-emerald-50 text-emerald-700 border border-emerald-200 px-2 py-0.5 rounded text-[10px] font-bold uppercase font-mono">FULLY SETTLED</span>;
      case 'invoiced':
        return <span className="bg-blue-50 text-blue-700 border border-blue-200 px-2 py-0.5 rounded text-[10px] font-bold uppercase font-mono">INVOICED BILL</span>;
      default:
        return <span className="bg-amber-50 text-amber-700 border border-amber-200 px-2 py-0.5 rounded text-[10px] font-bold uppercase font-mono">PENDING CLAIM</span>;
    }
  };

  // Filter state list
  const filteredTickets = tickets.filter(t => {
    const matchesSearch = 
      t.customerName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.equipmentType.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.assignedTechnician.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesStage = selectedWorkflowFilter === "All" || t.status === selectedWorkflowFilter;
    const matchesServiceType = selectedServiceTypeFilter === "All" || t.serviceType === selectedServiceTypeFilter;

    return matchesSearch && matchesStage && matchesServiceType;
  });

  return (
    <div className="space-y-6" id="repair-workshop-canvas">
      
      {/* SECTION 1: HEADER & TELEMETRY HUB */}
      <div className="bg-white p-6 rounded-2xl border border-neutral-200 flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-4 shadow-sm">
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-[10px] font-mono tracking-widest text-[#E5B84B] font-black uppercase bg-amber-50 px-2.5 py-1 rounded border border-amber-200">
              Department: Repairs & Bat Servicing
            </span>
            <span className={`text-[10px] font-mono px-2 py-0.5 rounded flex items-center gap-1.5 font-bold ${
              syncStatus === 'synced' ? 'bg-emerald-50 text-emerald-600 border border-emerald-200' : 'bg-amber-50 text-amber-600 border border-amber-200'
            }`}>
              <span className={`w-1.5 h-1.5 rounded-full ${syncStatus === 'synced' ? 'bg-emerald-500 animate-ping' : 'bg-amber-500 animate-pulse'}`}></span>
              <span>{syncStatus === 'synced' ? "REP-SYNC: ACTIVE CLOUD" : "SANDBOXED OFFLINE STORE"}</span>
            </span>
          </div>

          <h2 className="text-xl font-black text-neutral-900 tracking-tight mt-2 uppercase font-sans flex items-center gap-2">
            <Wrench className="w-6 h-6 text-[#E5B84B]" />
            <span>Cricket Equipment Restoration & Repair Desk</span>
          </h2>

          <p className="text-xs text-neutral-500 font-sans mt-1">
            Structural bat blade gluing, hydraulic sweetspot rollers, custom thread binding, shoe stitching, and bowling wheel laser sensor recalibration.
          </p>
        </div>

        {/* Operational buttons */}
        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={() => {
              // Simulated Seed recovery button if records are empty
              localStorage.removeItem('servicing_tickets');
              setTickets(SEED_SERVICE_TICKETS);
              logTelemetry("🔄 Restoration protocol executed: Seeding default bat craftsman contracts.");
              alert("Restored 3 default demonstration Repair Tickets to the active workspace.");
            }}
            className="bg-neutral-100 hover:bg-neutral-200 text-neutral-700 border border-neutral-300 px-3.5 py-2.5 rounded-xl text-xs font-mono font-bold tracking-tight transition-all flex items-center gap-1.5"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Restore Seeds</span>
          </button>

          <button
            type="button"
            onClick={() => setIsNewTicketModalOpen(true)}
            className="bg-[#E5B84B] hover:bg-amber-500 text-neutral-950 px-4 py-2.5 rounded-xl text-xs font-mono font-bold tracking-tight transition-all shadow-md shadow-amber-500/10 flex items-center gap-1.5"
          >
            <Plus className="w-4 h-4 stroke-[3]" />
            <span>New Repair Ticket</span>
          </button>
        </div>
      </div>

      {/* METRIC TILES BENTO ROW */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4" id="repair-metric-row">
        
        <div className="bg-white p-5 rounded-2xl border border-neutral-200 shadow-sm flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-[10px] font-mono font-black text-neutral-500 tracking-wider uppercase">ACTIVE TICKETS</span>
            <h3 className="text-2xl font-black text-neutral-950 font-mono">
              {tickets.filter(t => t.status !== 'Delivered').length} Active
            </h3>
            <span className="text-[10.5px] font-mono text-neutral-400">Total physical repairs under bench</span>
          </div>
          <div className="w-10 h-10 rounded-xl bg-amber-50 text-[#E5B84B] border border-amber-100 flex items-center justify-center shrink-0">
            <Wrench className="w-5 h-5 focus:outline-none" />
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-neutral-200 shadow-sm flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-[10px] font-mono font-black text-neutral-500 tracking-wider uppercase">BAT KNOCK PROGRESS</span>
            <h3 className="text-2xl font-black text-neutral-950 font-mono">
              {tickets.filter(t => t.serviceType === 'Bat knocking' && t.status !== 'Delivered').length} Bats
            </h3>
            <span className="text-[10.5px] font-mono text-neutral-450">Sweetspot hardening compression</span>
          </div>
          <div className="w-10 h-10 rounded-xl bg-sky-50 text-sky-500 border border-sky-150 flex items-center justify-center shrink-0">
            <Timer className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-neutral-200 shadow-sm flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-[10px] font-mono font-black text-neutral-500 tracking-wider uppercase">REPAIR INFLOW EARNINGS</span>
            <h3 className="text-2xl font-black text-neutral-950 font-mono">
              ${tickets.reduce((sum, current) => sum + current.totalCost, 0).toFixed(0)}
            </h3>
            <span className="text-[10.5px] font-mono text-neutral-450">Aggregated labor & parts billing</span>
          </div>
          <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-500 border border-emerald-150 flex items-center justify-center shrink-0">
            <TrendingUp className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-rose-200 shadow-sm flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-[10px] font-mono font-black text-rose-500 tracking-wider uppercase">OVERDUE THREAT</span>
            <h3 className="text-2xl font-black text-rose-600 font-mono">
              {tickets.filter(t => t.status !== 'Delivered' && new Date(t.estimatedCompletion).getTime() < Date.now()).length} Units
            </h3>
            <span className="text-[10.5px] font-mono text-rose-450">Estimated time limit threshold breached</span>
          </div>
          <div className="w-10 h-10 rounded-xl bg-rose-50 text-rose-500 border border-rose-150 flex items-center justify-center shrink-0">
            <ShieldAlert className="w-5 h-5" />
          </div>
        </div>

      </div>

      {/* FILTER CONTROLS GRID */}
      <div className="bg-white p-4.5 rounded-2xl border border-neutral-200 shadow-sm flex flex-col md:flex-row items-stretch md:items-center gap-4 justify-between font-mono text-xs">
        
        {/* Search */}
        <div className="relative flex-1">
          <input 
            type="text" 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search Player, Ticket ID, Technician assigned..."
            className="w-full p-2.5 pl-9 rounded-xl bg-neutral-50 border border-neutral-200 text-xs text-neutral-800"
          />
          <Search className="w-4 h-4 text-neutral-400 absolute left-3 top-3.5" />
        </div>

        {/* Workflow filters */}
        <div className="flex items-center gap-2 shrink-0">
          <span className="text-neutral-400 text-[10px] font-bold uppercase shrink-0">Stage:</span>
          <select 
            value={selectedWorkflowFilter}
            onChange={(e) => setSelectedWorkflowFilter(e.target.value)}
            className="bg-neutral-50 p-2 border border-neutral-200 rounded-xl font-bold"
          >
            <option value="All">All Stages</option>
            <option value="Received">Received</option>
            <option value="Inspection">Inspection</option>
            <option value="Repair In Progress">Repair In Progress</option>
            <option value="Quality Check">Quality Check</option>
            <option value="Ready">Ready</option>
            <option value="Delivered">Delivered</option>
          </select>
        </div>

        {/* Service Type filters */}
        <div className="flex items-center gap-2 shrink-0">
          <span className="text-neutral-400 text-[10px] font-bold uppercase shrink-0">Service Type:</span>
          <select 
            value={selectedServiceTypeFilter}
            onChange={(e) => setSelectedServiceTypeFilter(e.target.value)}
            className="bg-neutral-50 p-2 border border-neutral-200 rounded-xl font-bold"
          >
            <option value="All">All Types</option>
            <option value="Bat knocking">Bat knocking</option>
            <option value="Grip replacement">Grip replacement</option>
            <option value="Bat crack repair">Bat crack repair</option>
            <option value="Handle replacement">Handle replacement</option>
            <option value="Shoe repair">Shoe repair</option>
            <option value="Equipment repair">Equipment repair</option>
            <option value="Net repair">Net repair</option>
            <option value="Bowling machine servicing">Bowling machine servicing</option>
          </select>
        </div>

      </div>

      {/* CO-ORGANIZED MAIN GRID: Left list of tickets (Kanban styled list), Right Details view */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
        
        {/* LEFT COLUMN: ACTIVE WORKFLOW TICKETS DIRECTORY ROUTER (7 Units) */}
        <div className="xl:col-span-7 space-y-4">
          <h4 className="text-[12px] font-black font-mono text-[#E5B84B] tracking-widest uppercase px-1.5 bg-amber-50 py-1.5 self-start select-none rounded border border-amber-200/60 flex items-center justify-between">
            <span>WORKFLOW ROSTER PIPELINE ({filteredTickets.length} Active matched)</span>
            <span className="text-[10px] text-neutral-400 normal-case font-normal">Showing matching indices</span>
          </h4>

          {filteredTickets.length === 0 ? (
            <div className="bg-white rounded-2xl border border-neutral-200 p-12 text-center">
              <Inbox className="w-12 h-12 text-neutral-300 mx-auto stroke-1" />
              <h5 className="font-sans font-bold text-neutral-800 text-sm mt-3">No active repairs match criteria</h5>
              <p className="font-sans text-xs text-neutral-400 max-w-sm mx-auto mt-1 leading-normal">
                No tickets matching that filter. Register a new repair contract or click "Restore Seeds" to load sample bat services.
              </p>
            </div>
          ) : (
            <div className="space-y-3.5">
              {filteredTickets.map(t => {
                const isOverdue = t.status !== 'Delivered' && new Date(t.estimatedCompletion).getTime() < Date.now();
                const progressPercentage = 
                  t.status === 'Received' ? 15 :
                  t.status === 'Inspection' ? 35 :
                  t.status === 'Repair In Progress' ? 60 :
                  t.status === 'Quality Check' ? 80 :
                  t.status === 'Ready' ? 95 : 100;

                const isSelected = selectedTicket?.id === t.id;

                return (
                  <div 
                    key={t.id}
                    onClick={() => {
                      setSelectedTicket(t);
                      logTelemetry(`🔬 Selected Workshop Ticket ${t.id} - inspecting grain specs.`);
                    }}
                    className={`bg-white rounded-2xl border p-5 cursor-pointer hover:shadow-md transition-all flex flex-col sm:flex-row items-start justify-between gap-4 ${
                      isSelected ? 'ring-2 ring-[#E5B84B] border-transparent shadow shadow-amber-500/10' : 'border-neutral-200 shadow-sm'
                    }`}
                  >
                    {/* Basic details */}
                    <div className="space-y-2.5 flex-1">
                      <div className="flex items-center gap-2 flex-wrap font-mono text-xs">
                        <span className="font-black text-[#E5B84B] bg-amber-50 px-2 py-0.5 rounded border border-amber-200">{t.id}</span>
                        <span className="text-neutral-400">Type: <strong>{t.serviceType}</strong></span>
                        {isOverdue && (
                          <span className="bg-red-50 text-red-600 border border-red-200 rounded px-1.5 py-0.2 text-[9px] font-bold uppercase animate-bounce flex items-center gap-1">
                            <AlertTriangle className="w-2.5 h-2.5" />
                            <span>OVERDUE</span>
                          </span>
                        )}
                      </div>

                      <div>
                        <h4 className="text-sm font-bold text-neutral-900 leading-tight">
                          {t.customerName}
                        </h4>
                        <span className="text-xs text-neutral-500 font-mono block mt-0.5">
                          Equipment: <strong>{t.equipmentType}</strong>
                        </span>
                      </div>

                      {/* Technical bench details */}
                      <div className="flex items-center gap-4 text-[11px] font-mono text-neutral-400">
                        <span className="flex items-center gap-1">
                          <User className="w-3.5 h-3.5 text-neutral-400" />
                          Bench: <strong className="text-neutral-700">{t.assignedTechnician}</strong>
                        </span>
                        <span>
                          Est: <strong className="text-neutral-750">{t.estimatedCompletion}</strong>
                        </span>
                      </div>

                      {/* Micro Progress Bar overlay */}
                      <div className="space-y-1">
                        <div className="flex justify-between items-center text-[9px] font-mono text-neutral-400 font-bold">
                          <span>STAGE: {t.status.toUpperCase()}</span>
                          <span>{progressPercentage}%</span>
                        </div>
                        <div className="w-full h-1.5 bg-neutral-100 rounded-full overflow-hidden">
                          <div 
                            className={`h-full rounded-full transition-all duration-500 ${
                              t.status === 'Ready' || t.status === 'Delivered' ? 'bg-emerald-500' : 'bg-[#E5B84B]'
                            }`}
                            style={{ width: `${progressPercentage}%` }}
                          />
                        </div>
                      </div>

                    </div>

                    {/* Costing right block */}
                    <div className="flex sm:flex-col items-end justify-between sm:justify-start gap-4 w-full sm:w-auto self-stretch pt-2 sm:pt-0 border-t sm:border-t-0 border-neutral-100 shrink-0 font-mono">
                      <div className="text-right">
                        <span className="text-[9px] text-neutral-400 block tracking-widest uppercase">Bench Estimate</span>
                        <span className="text-base font-black text-neutral-900 block">${t.totalCost.toFixed(2)}</span>
                        <span className="text-[10px] text-neutral-400 block">{t.materialsUsed.length} materials loaded</span>
                      </div>

                      <div className="flex items-center gap-2">
                        {getBillingBadge(t.billingStatus)}
                        <ChevronRight className="w-4 h-4 text-neutral-400" />
                      </div>
                    </div>

                  </div>
                );
              })}
            </div>
          )}

          {/* TELEMETRY LOGGER PANEL */}
          <div className="bg-[#171717] p-4.5 rounded-2xl border border-neutral-800 text-xs font-mono space-y-3 shadow-lg shadow-black/40">
            <div className="flex items-center justify-between border-b border-neutral-850 pb-2.5">
              <span className="text-[#E5B84B] font-bold tracking-widest uppercase flex items-center gap-1.5 text-[10px]">
                <Activity className="w-4 h-4 text-[#E5B84B] animate-pulse" />
                <span>Realtime Operational Sentry Logs</span>
              </span>
              <span className="bg-neutral-800 text-[9px] text-neutral-400 px-2 py-0.5 rounded uppercase font-black">Ready</span>
            </div>

            <div className="h-28 overflow-y-auto space-y-1 block pr-1">
              {telemetryLogs.map((log, index) => (
                <div key={index} className="text-[10.5px] leading-normal font-medium text-neutral-300 font-mono">
                  {log}
                </div>
              ))}
            </div>
          </div>

        </div>

        {/* RIGHT COLUMN: WORKBENCH INSPECTION DETAIL PANEL (5 Units) */}
        <div className="xl:col-span-5 space-y-6">
          
          {selectedTicket ? (
            <div className="bg-white p-5 rounded-2xl border border-neutral-200 shadow-sm space-y-5">
              
              {/* Header Title */}
              <div className="flex items-start justify-between border-b border-neutral-100 pb-4">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="bg-neutral-900 text-white font-mono font-bold text-xs px-2.5 py-0.5 rounded">
                      {selectedTicket.id}
                    </span>
                    <span className="bg-amber-50 text-[#E5B84B] border border-amber-200 text-[10px] font-bold px-2 py-0.5 rounded font-mono uppercase">
                      {selectedTicket.serviceType}
                    </span>
                  </div>
                  <h3 className="text-base font-black text-neutral-900 mt-2 font-sans">
                    {selectedTicket.customerName}
                  </h3>
                  <span className="text-xs text-neutral-400 font-mono">Phone: {selectedTicket.customerPhone || 'Anonymous'}</span>
                </div>

                <div className="text-right">
                  <span className="text-[9.5px] text-neutral-400 uppercase tracking-wider block font-mono">Total Billing</span>
                  <span className="text-xl font-black text-neutral-950 block font-mono">${selectedTicket.totalCost.toFixed(2)}</span>
                </div>
              </div>

              {/* Status Update Quick transition row */}
              <div className="space-y-1.5 font-mono text-xs">
                <span className="text-[10px] text-neutral-400 uppercase font-black block">Advance Workshop Phase</span>
                
                <div className="grid grid-cols-3 gap-2">
                  {(['Inspection', 'Repair In Progress', 'Quality Check', 'Ready', 'Delivered'] as ServiceWorkflowStage[]).map(stage => {
                    const isPassed = 
                      (selectedTicket.status === 'Received' && stage === 'Inspection') ||
                      (selectedTicket.status === 'Inspection' && stage === 'Repair In Progress') ||
                      (selectedTicket.status === 'Repair In Progress' && stage === 'Quality Check') ||
                      (selectedTicket.status === 'Quality Check' && stage === 'Ready') ||
                      (selectedTicket.status === 'Ready' && stage === 'Delivered');
                    const isActive = selectedTicket.status === stage;

                    return (
                      <button
                        key={stage}
                        type="button"
                        onClick={() => advanceWorkflow(selectedTicket.id, stage)}
                        className={`p-2 rounded-xl text-[9px] text-center font-bold uppercase transition-all tracking-tighter col-span-1 border ${
                          isActive ? 'bg-neutral-900 border-none text-white font-black' : 
                          isPassed ? 'bg-amber-50 text-[#E5B84B] border-amber-200 hover:bg-amber-100' :
                          'bg-neutral-50 text-neutral-400 border-neutral-200 hover:bg-neutral-100'
                        }`}
                      >
                        {stage === 'Repair In Progress' ? 'Repair' : stage.split(' ')[0]}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Problem Description Callout */}
              <div className="bg-neutral-50 p-4 rounded-xl border border-neutral-200 space-y-1.5 font-sans">
                <span className="text-[9px] text-[#E5B84B] font-mono font-black uppercase tracking-widest block">Client Issue Description</span>
                <p className="text-xs text-neutral-700 leading-normal font-medium">
                  {selectedTicket.problemDescription}
                </p>
              </div>

              {/* BEFORE / AFTER VISUAL IMAGE COMPOSITE */}
              <div className="grid grid-cols-2 gap-4">
                {/* Before Image */}
                <div className="space-y-1.5">
                  <span className="text-[9.5px] font-mono text-red-500 font-bold uppercase block text-center">BEFORE ASSESSMENT</span>
                  <div className="h-32 rounded-xl overflow-hidden border border-neutral-200 bg-neutral-100 relative">
                    {selectedTicket.beforeImages?.[0] ? (
                      <img 
                        referrerPolicy="no-referrer"
                        src={selectedTicket.beforeImages[0]} 
                        alt="Before repair shape"
                        className="w-full h-full object-cover" 
                      />
                    ) : (
                      <div className="w-full h-full flex flex-col items-center justify-center text-neutral-400 text-[10px]">
                        <ImageIcon className="w-5 h-5 mb-1 text-neutral-300" />
                        <span>No Before Image</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* After Image */}
                <div className="space-y-1.5">
                  <span className="text-[9.5px] font-mono text-emerald-600 font-bold uppercase block text-center">AFTER WORKBENCH</span>
                  <div className="h-32 rounded-xl overflow-hidden border border-neutral-200 bg-neutral-100 relative group">
                    {selectedTicket.afterImages?.[0] ? (
                      <img 
                        referrerPolicy="no-referrer"
                        src={selectedTicket.afterImages[0]} 
                        alt="After polish wood"
                        className="w-full h-full object-cover" 
                      />
                    ) : (
                      <div className="w-full h-full flex flex-col items-center justify-center text-neutral-400 text-center text-[10px] p-2 leading-tight">
                        <UploadCloud className="w-5 h-5 mb-1 text-neutral-300" />
                        <span>Standard auto image proof generated on READY status transition</span>
                      </div>
                    )}

                    {/* Fast mock uploader overlay */}
                    <button 
                      type="button"
                      onClick={() => {
                        // Quick append premium mock image
                        const pairSample = MOCK_AFTER_IMAGES[Math.floor(Math.random() * MOCK_AFTER_IMAGES.length)];
                        const updated: ServiceTicket = {
                          ...selectedTicket,
                          afterImages: [pairSample]
                        };
                        setTickets(prev => prev.map(t => t.id === selectedTicket.id ? updated : t));
                        setSelectedTicket(updated);
                        logTelemetry(`📸 Automated image proof attached dynamically to Ticket ${selectedTicket.id}`);
                      }}
                      className="absolute inset-0 bg-neutral-900/60 text-white text-[9.5px] font-mono font-black uppercase opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center"
                    >
                      Attach Proof Proof
                    </button>
                  </div>
                </div>
              </div>

              {/* Technician Allocation Info */}
              <div className="bg-neutral-50 p-4.5 rounded-xl border border-neutral-200 flex items-center justify-between font-mono text-xs">
                <div>
                  <span className="text-[10px] text-neutral-400 uppercase font-black block">Assigned Technician</span>
                  <strong className="text-neutral-800 text-sm block mt-0.5">{selectedTicket.assignedTechnician}</strong>
                  <span className="text-[10px] text-[#E5B84B] font-bold uppercase block">Specialization: English Willow Craftsman</span>
                </div>

                {/* Allocate button */}
                <button
                  type="button"
                  onClick={() => setIsAssignModalOpen(true)}
                  className="bg-neutral-200 hover:bg-neutral-300 text-neutral-850 px-3 py-1.5 rounded-lg text-[10.5px] font-bold"
                >
                  Shift Bench
                </button>
              </div>

              {/* Materials Cost Tracker Estimation Table */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-mono text-neutral-400 uppercase font-black">Material Components formulations</span>
                  <button
                    type="button"
                    onClick={() => setIsEditMaterialModalOpen(true)}
                    className="text-xs text-amber-600 font-bold flex items-center gap-1 hover:underline font-mono"
                  >
                    <PlusCircle className="w-3.5 h-3.5" />
                    <span>Deduct parts stock</span>
                  </button>
                </div>

                {selectedTicket.materialsUsed.length === 0 ? (
                  <div className="bg-neutral-50 p-3 rounded-lg border border-dashed border-neutral-200 text-center text-xs font-mono text-neutral-400">
                    No custom material formulations attached. Only default labor rate configured.
                  </div>
                ) : (
                  <div className="border border-neutral-200 rounded-xl overflow-hidden text-xs font-mono">
                    <table className="w-full text-left divide-y divide-neutral-200">
                      <thead className="bg-neutral-50">
                        <tr>
                          <th className="p-2.5 text-[9.5px] text-neutral-400 font-black">COMPONENT SKU</th>
                          <th className="p-2.5 text-[9.5px] text-neutral-400 font-black text-center">QTY</th>
                          <th className="p-2.5 text-[9.5px] text-neutral-400 font-black text-right">TOTAL</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-neutral-150">
                        {selectedTicket.materialsUsed.map((m, idx) => (
                          <tr key={idx}>
                            <td className="p-2.5 font-bold text-neutral-800">{m.name}</td>
                            <td className="p-2.5 text-center text-neutral-550">x{m.quantityUsed}</td>
                            <td className="p-2.5 text-right font-bold text-neutral-900">${m.totalCost.toFixed(2)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              {/* Bench notes history thread */}
              <div className="space-y-2 font-mono text-xs">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] text-neutral-400 uppercase font-black">Engineering Workshop Audit Logs</span>
                  <button
                    type="button"
                    onClick={() => setIsAddNoteModalOpen(true)}
                    className="text-xs text-amber-600 font-bold hover:underline"
                  >
                    + Append log
                  </button>
                </div>

                <div className="bg-neutral-50 rounded-xl border border-neutral-200 p-4 max-h-48 overflow-y-auto space-y-2.5 leading-relaxed">
                  {selectedTicket.notes && selectedTicket.notes.map((note, index) => (
                    <div key={index} className="pb-2 border-b border-neutral-200/60 last:border-0 last:pb-0 font-medium">
                      <p className="text-[11px] text-neutral-700">{note}</p>
                    </div>
                  ))}
                </div>
              </div>

            </div>
          ) : (
            <div className="bg-white rounded-2xl border border-neutral-200 p-12 text-center shadow-sm h-full flex flex-col justify-center items-center">
              <Wrench className="w-12 h-12 text-neutral-200 stroke-1 mb-2" />
              <h4 className="font-sans font-bold text-neutral-800 text-sm">Workbench empty</h4>
              <p className="font-sans text-xs text-neutral-400 max-w-xs mx-auto mt-1 leading-normal">
                Click any service ticket on the left listing to view detailed material specifications, advance physical workflow stages, or append custom notes.
              </p>
            </div>
          )}

        </div>

      </div>

      {/* --- NEW SERVICE TICKET FORM MODAL --- */}
      <AnimatePresence>
        {isNewTicketModalOpen && (
          <div className="fixed inset-0 bg-neutral-950/40 backdrop-blur-xs z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-2xl border border-neutral-250 p-6 max-w-lg w-full shadow-2xl space-y-4"
            >
              <div className="flex items-center justify-between border-b border-neutral-100 pb-3">
                <h3 className="text-sm font-black font-mono text-neutral-900 uppercase tracking-wider flex items-center gap-1.5">
                  <Plus className="w-4 h-4 text-[#E5B84B]" />
                  <span>Register Custom Equipment Repair Contract</span>
                </h3>
                <button 
                  onClick={() => setIsNewTicketModalOpen(false)}
                  className="p-1 rounded-lg hover:bg-neutral-100 transition-colors"
                >
                  <X className="w-4 h-4 text-neutral-500" />
                </button>
              </div>

              <form onSubmit={handleCreateTicket} className="space-y-4 font-mono text-xs">
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-[10px] text-neutral-400 uppercase block mb-1">Customer Full Name*</label>
                    <input 
                      type="text"
                      required
                      value={newTicket.customerName}
                      onChange={(e) => setNewTicket({ ...newTicket, customerName: e.target.value })}
                      placeholder="e.g. Mitchell Starc CC"
                      className="w-full p-2 bg-neutral-50 border border-neutral-200 rounded-lg"
                    />
                  </div>

                  <div>
                    <label className="text-[10px] text-neutral-400 uppercase block mb-1">Contact Phone</label>
                    <input 
                      type="text"
                      value={newTicket.customerPhone}
                      onChange={(e) => setNewTicket({ ...newTicket, customerPhone: e.target.value })}
                      placeholder="e.g. +61 405 123 456"
                      className="w-full p-2 bg-neutral-50 border border-neutral-200 rounded-lg"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-[10px] text-neutral-400 uppercase block mb-1">Equipment Name & Spec*</label>
                    <input 
                      type="text"
                      required
                      value={newTicket.equipmentType}
                      onChange={(e) => setNewTicket({ ...newTicket, equipmentType: e.target.value })}
                      placeholder="e.g. Kookaburra Beast Volley"
                      className="w-full p-2 bg-neutral-50 border border-neutral-200 rounded-lg"
                    />
                  </div>

                  <div>
                    <label className="text-[10px] text-neutral-400 uppercase block mb-1">Service category</label>
                    <select
                      value={newTicket.serviceType}
                      onChange={(e) => setNewTicket({ ...newTicket, serviceType: e.target.value as ServiceType })}
                      className="w-full p-2 bg-neutral-50 border border-neutral-200 rounded-lg font-bold text-neutral-800"
                    >
                      <option value="Bat knocking">Bat knocking</option>
                      <option value="Grip replacement">Grip replacement</option>
                      <option value="Bat crack repair">Bat crack repair</option>
                      <option value="Handle replacement">Handle replacement</option>
                      <option value="Shoe repair">Shoe repair</option>
                      <option value="Equipment repair">Equipment repair</option>
                      <option value="Net repair">Net repair</option>
                      <option value="Bowling machine servicing">Bowling machine servicing</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="text-[10px] text-neutral-400 uppercase block mb-1">Issue / Structural Damage Description</label>
                  <textarea
                    rows={3}
                    value={newTicket.problemDescription}
                    onChange={(e) => setNewTicket({ ...newTicket, problemDescription: e.target.value })}
                    placeholder="Provide details about structural cracks, worn fibers, thread tensions, gear slippages, etc."
                    className="w-full p-2 bg-neutral-50 border border-neutral-200 rounded-lg resize-none"
                  />
                </div>

                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="text-[10px] text-neutral-400 uppercase block mb-1">Initial Labor Cost ($)</label>
                    <input 
                      type="number"
                      value={newTicket.laborCost}
                      onChange={(e) => setNewTicket({ ...newTicket, laborCost: Number(e.target.value) })}
                      className="w-full p-2 bg-neutral-50 border border-neutral-200 rounded-lg"
                    />
                  </div>

                  <div>
                    <label className="text-[10px] text-neutral-400 uppercase block mb-1">Assigned technician</label>
                    <select
                      value={newTicket.assignedTechnician}
                      onChange={(e) => setNewTicket({ ...newTicket, assignedTechnician: e.target.value })}
                      className="w-full p-2 bg-neutral-50 border border-neutral-200 rounded-lg"
                    >
                      {CONSTANT_TECHNICIANS.map(t => (
                        <option key={t.id} value={t.name}>{t.name}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="text-[10px] text-neutral-400 uppercase block mb-1">Target Due Date</label>
                    <input 
                      type="date"
                      value={newTicket.estimatedCompletion}
                      onChange={(e) => setNewTicket({ ...newTicket, estimatedCompletion: e.target.value })}
                      className="w-full p-2 bg-neutral-50 border border-neutral-200 rounded-lg"
                    />
                  </div>
                </div>

                <div className="flex items-center gap-2 pt-2 border-t border-neutral-100 justify-end">
                  <button
                    type="button"
                    onClick={() => setIsNewTicketModalOpen(false)}
                    className="bg-neutral-100 hover:bg-neutral-150 text-neutral-700 px-4 py-2 rounded-lg text-xs font-bold"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="bg-[#E5B84B] hover:bg-amber-500 text-neutral-950 px-4 py-2 rounded-lg text-xs font-bold"
                  >
                    Compile Repair Ticket
                  </button>
                </div>

              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* --- ASSIGN TECHNICIAN MODAL --- */}
      <AnimatePresence>
        {isAssignModalOpen && selectedTicket && (
          <div className="fixed inset-0 bg-neutral-950/40 backdrop-blur-xs z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-2xl border border-neutral-250 p-6 max-w-sm w-full shadow-2xl space-y-4"
            >
              <div className="flex items-center justify-between border-b border-neutral-100 pb-2">
                <h3 className="text-xs font-black font-mono text-neutral-900 uppercase tracking-wider">
                  Select Workshop Operator
                </h3>
                <button onClick={() => setIsAssignModalOpen(false)}>
                  <X className="w-4 h-4 text-neutral-400" />
                </button>
              </div>

              <div className="space-y-3 font-mono text-xs">
                {CONSTANT_TECHNICIANS.map(t => (
                  <div 
                    key={t.id}
                    onClick={() => reallocateTechnician(selectedTicket.id, t.name)}
                    className="p-3 rounded-xl border border-neutral-200 hover:bg-neutral-50 cursor-pointer flex items-center justify-between transition-colors"
                  >
                    <div>
                      <strong className="text-neutral-800 text-sm block">{t.name}</strong>
                      <span className="text-[10px] text-neutral-400">{t.specialty}</span>
                    </div>
                    <span className="text-[10.5px] bg-amber-50 text-amber-700 font-bold px-1.5 py-0.5 rounded border border-amber-200">★ {t.rating}</span>
                  </div>
                ))}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* --- ADD NOTE MODAL --- */}
      <AnimatePresence>
        {isAddNoteModalOpen && selectedTicket && (
          <div className="fixed inset-0 bg-neutral-950/40 backdrop-blur-xs z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-2xl border border-neutral-250 p-6 max-w-md w-full shadow-2xl space-y-4"
            >
              <div className="flex items-center justify-between border-b border-neutral-100 pb-2.5">
                <h3 className="text-xs font-black font-mono text-neutral-900 uppercase">Append Workshop Log</h3>
                <button onClick={() => setIsAddNoteModalOpen(false)}>
                  <X className="w-4 h-4 text-neutral-400" />
                </button>
              </div>

              <form onSubmit={submitWorkshopNote} className="space-y-4 font-mono text-xs">
                <div>
                  <label className="text-[10px] text-neutral-400 uppercase block mb-1">Add raw comments or edge/tension ratings</label>
                  <textarea
                    rows={4}
                    required
                    value={tempNoteText}
                    onChange={(e) => setTempNoteText(e.target.value)}
                    placeholder="e.g. sweetspot resilience tested successfully at 15lbs recoil index."
                    className="w-full p-2.5 bg-neutral-50 border border-neutral-200 rounded-xl resize-none"
                  />
                </div>

                <div className="flex justify-end gap-2 pt-2 border-t border-neutral-150">
                  <button 
                    type="button" 
                    onClick={() => setIsAddNoteModalOpen(false)}
                    className="bg-neutral-100 px-3 py-2 rounded-lg"
                  >
                    Cancel
                  </button>
                  <button 
                    type="submit" 
                    className="bg-[#E5B84B] hover:bg-amber-500 text-neutral-950 px-3 py-2 rounded-lg font-bold"
                  >
                    Append bench entry
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* --- PARTS EXTRACTION STOCK DEDUCT MODAL --- */}
      <AnimatePresence>
        {isEditMaterialModalOpen && selectedTicket && (
          <div className="fixed inset-0 bg-neutral-950/40 backdrop-blur-xs z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-2xl border border-neutral-250 p-6 max-w-md w-full shadow-2xl space-y-4"
            >
              <div className="flex items-center justify-between border-b border-neutral-100 pb-2.5">
                <h3 className="text-xs font-black font-mono text-neutral-900 uppercase">Extract Parts & Deduct Inventory</h3>
                <button onClick={() => setIsEditMaterialModalOpen(false)}>
                  <X className="w-4 h-4 text-neutral-400" />
                </button>
              </div>

              <form onSubmit={handleAddMaterial} className="space-y-4 font-mono text-xs">
                
                {/* Linked Active Stock selector */}
                <div>
                  <label className="text-[10px] text-neutral-400 uppercase block mb-1">Option A: Deduct Real ERP Inventory SKU</label>
                  <select
                    value={linkedProductSku}
                    onChange={(e) => {
                      const sku = e.target.value;
                      setLinkedProductSku(sku);
                      if (sku) {
                        const product = products.find(p => p.sku === sku);
                        if (product) {
                          setTempMaterialName(product.name);
                          setTempMaterialCost(product.sellingPrice || 15);
                        }
                      }
                    }}
                    className="w-full p-2 bg-neutral-50 border border-neutral-200 rounded-lg text-neutral-800 font-bold"
                  >
                    <option value="">-- No Direct Deduct (Raw Parts Only) --</option>
                    {products.map(p => (
                      <option key={p.sku} value={p.sku}>
                        {p.name} (SKU: {p.sku}) [Stock: {p.currentStock}] - ${p.sellingPrice}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-[10px] text-neutral-400 uppercase block mb-1">Component name / Material Description</label>
                  <input 
                    type="text"
                    required
                    value={tempMaterialName}
                    onChange={(e) => setTempMaterialName(e.target.value)}
                    placeholder="e.g. Heavy Duty Willow Protection Tape"
                    className="w-full p-2 bg-neutral-50 border border-neutral-200 rounded-lg"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-[10px] text-neutral-400 uppercase block mb-1">Quantity Used</label>
                    <input 
                      type="number"
                      required
                      min={1}
                      value={tempMaterialQty}
                      onChange={(e) => setTempMaterialQty(Number(e.target.value))}
                      className="w-full p-2 bg-neutral-50 border border-neutral-200 rounded-lg"
                    />
                  </div>

                  <div>
                    <label className="text-[10px] text-neutral-400 uppercase block mb-1">Unit Cost ($)</label>
                    <input 
                      type="number"
                      required
                      min={0}
                      value={tempMaterialCost}
                      onChange={(e) => setTempMaterialCost(Number(e.target.value))}
                      className="w-full p-2 bg-neutral-50 border border-neutral-200 rounded-lg"
                    />
                  </div>
                </div>

                <div className="flex justify-end gap-2 pt-2 border-t border-neutral-150">
                  <button 
                    type="button" 
                    onClick={() => setIsEditMaterialModalOpen(false)}
                    className="bg-neutral-100 px-3 py-2 rounded-lg"
                  >
                    Cancel
                  </button>
                  <button 
                    type="submit" 
                    className="bg-[#E5B84B] hover:bg-amber-500 text-neutral-950 px-3 py-2 rounded-lg font-bold"
                  >
                    Add component Formulation
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
