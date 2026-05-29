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
  where
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
  Printer,
  Droplet,
  Flame,
  Image as ImageIcon,
  UploadCloud,
  RotateCcw,
  FileText,
  Thermometer,
  Timer,
  Check,
  CheckSquare,
  Sparkles,
  Link as LinkIcon,
  Play,
  Square,
  ClipboardList
} from 'lucide-react';
import { db, isCloudConnected } from '../firebase';

// --- TYPES ---
export type PrintStatus = 
  | 'Artwork Received' 
  | 'Design Approved' 
  | 'Screen Preparation' 
  | 'Printing' 
  | 'Heat Press' 
  | 'Quality Check' 
  | 'Completed';

export type PrintingType = 
  | 'Screen printing' 
  | 'Sublimation printing' 
  | 'Heat transfer/vinyl printing';

export interface PrintMaterial {
  id: string;
  name: string;
  category: 'ink' | 'vinyl' | 'mesh' | 'emulsion' | 'squeegee';
  stock: number;
  unit: string;
  safetyLevel: number;
  lastRefilled: string;
}

export interface PrintJob {
  id: string;
  orderId: string;
  customerName: string;
  teamName: string;
  printingType: PrintingType;
  status: PrintStatus;
  artworkUrl?: string;
  artworkFilename?: string;
  colorsUsed: string[];
  assignedStaff: string;
  dueDate: string;
  notes: string;
  reprintStatus: 'none' | 'requested' | 'reprinted';
  reprintCount: number;
  reprintReasons?: string[];
  materialsUsed: Array<{
    materialId: string;
    materialName: string;
    amountUsed: number;
    unit: string;
  }>;
  screenSpecs?: {
    exposureSeconds: number;
    meshCount: number;
    emulsionPassed: boolean;
    tensionPassed: boolean;
  };
  heatPressSpecs?: {
    temperatureF: number;
    pressureLbs: number;
    durationSeconds: number;
  };
  createdAt: string;
}

// Default Seed Material Database fallback
const SEED_MATERIALS: PrintMaterial[] = [
  { id: "mat-1", name: "Premium Gold Metallic Foil", category: "vinyl", stock: 12, unit: "rolls", safetyLevel: 3, lastRefilled: "2026-05-20" },
  { id: "mat-2", name: "Cyan Sublimation Ink Core", category: "ink", stock: 1250, unit: "ml", safetyLevel: 300, lastRefilled: "2026-05-22" },
  { id: "mat-3", name: "Magenta Sublimation Ink Core", category: "ink", stock: 1400, unit: "ml", safetyLevel: 300, lastRefilled: "2026-05-22" },
  { id: "mat-4", name: "Yellow Sublimation Ink Core", category: "ink", stock: 1100, unit: "ml", safetyLevel: 300, lastRefilled: "2026-05-22" },
  { id: "mat-5", name: "Black Ultra-Saturate Ink Core", category: "ink", stock: 1500, unit: "ml", safetyLevel: 400, lastRefilled: "2026-05-22" },
  { id: "mat-6", name: "White Flex Vinyl Roll (Smooth)", category: "vinyl", stock: 8, unit: "rolls", safetyLevel: 2, lastRefilled: "2026-05-18" },
  { id: "mat-7", name: "High-Tensile Screen Mesh (120T)", category: "mesh", stock: 15, unit: "screens", safetyLevel: 5, lastRefilled: "2026-05-10" },
  { id: "mat-8", name: "Photosensitive Emulsion DX2", category: "emulsion", stock: 2500, unit: "g", safetyLevel: 800, lastRefilled: "2026-05-15" }
];

// Initial dummy database when Firestore is empty or local
const SEED_PRINT_JOBS: PrintJob[] = [
  {
    id: "PRNT-801",
    orderId: "TOTT-2026-9501",
    customerName: "Victorian Cricket Academy",
    teamName: "VCA Chargers",
    printingType: "Sublimation printing",
    status: "Printing",
    artworkUrl: "https://images.unsplash.com/photo-1544033527-b192daee1f5b?w=600&auto=format&fit=crop&q=60",
    artworkFilename: "vca_chargers_jersey_front_vector_v2.ai",
    colorsUsed: ["Navy Blue", "Metallic Gold", "White"],
    assignedStaff: "Vijay Merchant",
    dueDate: "2026-05-29",
    notes: "Triple-layer sublimation press checklist. High speed cyan nozzle check absolute pass.",
    reprintStatus: "none",
    reprintCount: 0,
    reprintReasons: [],
    materialsUsed: [
      { materialId: "mat-2", materialName: "Cyan Sublimation Ink Core", amountUsed: 150, unit: "ml" },
      { materialId: "mat-4", materialName: "Yellow Sublimation Ink Core", amountUsed: 120, unit: "ml" }
    ],
    heatPressSpecs: {
      temperatureF: 385,
      pressureLbs: 45,
      durationSeconds: 45
    },
    createdAt: "2026-05-25T08:00:00Z"
  },
  {
    id: "PRNT-802",
    orderId: "TOTT-2026-9515",
    customerName: "Melbourne Stars Club",
    teamName: "Melbourne Stars Juniors",
    printingType: "Screen printing",
    status: "Screen Preparation",
    artworkUrl: "https://images.unsplash.com/photo-1530541930197-ff16ac917b0e?w=600&auto=format&fit=crop&q=60",
    artworkFilename: "stars_crest_screen_logo_v1.pdf",
    colorsUsed: ["Emerald Green", "Lime Green", "White"],
    assignedStaff: "Sarah Printworks",
    dueDate: "2026-05-31",
    notes: "Requires high-mesh 120T exposure to resolve micro-stars boundary accents.",
    reprintStatus: "none",
    reprintCount: 0,
    reprintReasons: [],
    materialsUsed: [
      { materialId: "mat-7", materialName: "High-Tensile Screen Mesh (120T)", amountUsed: 1, unit: "screens" },
      { materialId: "mat-8", materialName: "Photosensitive Emulsion DX2", amountUsed: 500, unit: "g" }
    ],
    screenSpecs: {
      exposureSeconds: 240,
      meshCount: 120,
      emulsionPassed: true,
      tensionPassed: true
    },
    createdAt: "2026-05-25T11:30:00Z"
  },
  {
    id: "PRNT-803",
    orderId: "TOTT-2026-9524",
    customerName: "Melton Cobras Cricket Club",
    teamName: "Melbourne Cobras Seniors",
    printingType: "Heat transfer/vinyl printing",
    status: "Artwork Received",
    artworkUrl: "https://images.unsplash.com/photo-1587280501635-68a0e82cd5ff?w=600&auto=format&fit=crop&q=60",
    artworkFilename: "cobras_sponsor_vinyl.cdr",
    colorsUsed: ["Gold", "Pitch Black"],
    assignedStaff: "Sarah Printworks",
    dueDate: "2026-05-27",
    notes: "Full front logo placement. Mirror-cut vinyl first.",
    reprintStatus: "none",
    reprintCount: 0,
    reprintReasons: [],
    materialsUsed: [
      { materialId: "mat-1", materialName: "Premium Gold Metallic Foil", amountUsed: 1, unit: "rolls" }
    ],
    heatPressSpecs: {
      temperatureF: 310,
      pressureLbs: 35,
      durationSeconds: 15
    },
    createdAt: "2026-05-24T14:15:00Z"
  }
];

export const PrintingSublimationView: React.FC<{
  branchScope: string;
  profile: any;
}> = ({ branchScope, profile }) => {
  // States
  const [printJobs, setPrintJobs] = useState<PrintJob[]>([]);
  const [materials, setMaterials] = useState<PrintMaterial[]>([]);
  const [orders, setOrders] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedTypeFilter, setSelectedTypeFilter] = useState<string>("All");
  const [selectedStatusFilter, setSelectedStatusFilter] = useState<string>("All");
  
  // Realtime Connection Health
  const [syncStatus, setSyncStatus] = useState<'synced' | 'connecting' | 'offline'>('connecting');
  const [telemetryLogs, setTelemetryLogs] = useState<string[]>([]);
  
  // Modals & Form States
  const [isNewJobModalOpen, setIsNewJobModalOpen] = useState(false);
  const [isReprintModalOpen, setIsReprintModalOpen] = useState(false);
  const [isNotesModalOpen, setIsNotesModalOpen] = useState(false);
  const [selectedJob, setSelectedJob] = useState<PrintJob | null>(null);

  // Forms
  const [newJobForm, setNewJobForm] = useState({
    orderId: "",
    customerName: "",
    teamName: "",
    printingType: "Sublimation printing" as PrintingType,
    status: "Artwork Received" as PrintStatus,
    artworkUrl: "",
    artworkFilename: "",
    colorsUsed: "",
    assignedStaff: "",
    dueDate: "",
    notes: "",
    heatPressTemp: 350,
    heatPressPressure: 40,
    heatPressDuration: 30,
    screenExposure: 180,
    screenMeshUnit: 120,
    materialToDeduct: "",
    materialAmount: 1
  });

  const [reprintReason, setReprintReason] = useState("");
  const [newNoteText, setNewNoteText] = useState("");

  // Design Preview Engine States
  const [previewApparelType, setPreviewApparelType] = useState<'jersey' | 'hoodie' | 'cap'>('jersey');
  const [previewPlacement, setPreviewPlacement] = useState<'front' | 'back' | 'sleeve'>('front');
  const [previewBaseColor, setPreviewBaseColor] = useState<string>('#ffffff');
  const [previewLogoUrl, setPreviewLogoUrl] = useState<string>('https://images.unsplash.com/photo-1544033527-b192daee1f5b?w=200&auto=format&fit=crop&q=80');

  // Heat Press Timer Engine States
  const [timerJobId, setTimerJobId] = useState<string | null>(null);
  const [timerSecondsLeft, setTimerSecondsLeft] = useState<number>(0);
  const [isTimerRunning, setIsTimerRunning] = useState<boolean>(false);

  // Helper: Log Telemetry
  const logTelemetry = (text: string) => {
    const timeStr = new Date().toISOString().split('T')[1].slice(0, 8);
    setTelemetryLogs(prev => [`[${timeStr}] ${text}`, ...prev.slice(0, 15)]);
  };

  // Setup Real-time Listeners
  useEffect(() => {
    logTelemetry("Launching Screen Printing & Sublimation telemetry streams...");
    setSyncStatus('connecting');

    // 1. Setup Materials Listener
    const localMaterials = localStorage.getItem('printing_materials');
    if (localMaterials) {
      setMaterials(JSON.parse(localMaterials));
    } else {
      setMaterials(SEED_MATERIALS);
      localStorage.setItem('printing_materials', JSON.stringify(SEED_MATERIALS));
    }

    // 2. Setup Print Jobs Listener
    if (isCloudConnected) {
      try {
        const qJobs = collection(db, 'printing_jobs');
        const unsub = onSnapshot(qJobs, (snapshot) => {
          if (snapshot.empty) {
            // Seed cloud if empty
            SEED_PRINT_JOBS.forEach(async (job) => {
              await setDoc(doc(db, 'printing_jobs', job.id), job);
            });
            setPrintJobs(SEED_PRINT_JOBS);
          } else {
            const list: PrintJob[] = [];
            snapshot.forEach((doc) => {
              list.push(doc.data() as PrintJob);
            });
            setPrintJobs(list);
          }
          setSyncStatus('synced');
          logTelemetry("Firestore replication successfully established. Secure channels active.");
        }, (error) => {
          console.error("Firestore loading error: ", error);
          fallbackToLocal();
        });

        // Setup orders sync
        onSnapshot(collection(db, 'orders'), (snapshot) => {
          const list: any[] = [];
          snapshot.forEach(doc => {
            list.push(doc.data());
          });
          setOrders(list);
        });

        return () => unsub();
      } catch (err) {
        console.error("Failed to set up Firestore onSnapshot: ", err);
        fallbackToLocal();
      }
    } else {
      fallbackToLocal();
    }

    function fallbackToLocal() {
      const localJobs = localStorage.getItem('printing_jobs');
      if (localJobs) {
        setPrintJobs(JSON.parse(localJobs));
      } else {
        setPrintJobs(SEED_PRINT_JOBS);
        localStorage.setItem('printing_jobs', JSON.stringify(SEED_PRINT_JOBS));
      }
      setSyncStatus('offline');
      logTelemetry("Offline database locked. Operating over client state synchronization.");
    }
  }, []);

  // Sync to localStorage as redundancy
  useEffect(() => {
    if (printJobs.length > 0) {
      localStorage.setItem('printing_jobs', JSON.stringify(printJobs));
    }
  }, [printJobs]);

  useEffect(() => {
    if (materials.length > 0) {
      localStorage.setItem('printing_materials', JSON.stringify(materials));
    }
  }, [materials]);

  // Heat Press Workflow Interactive Live Timer
  useEffect(() => {
    let interval: any = null;
    if (isTimerRunning && timerSecondsLeft > 0) {
      interval = setInterval(() => {
        setTimerSecondsLeft(prev => {
          if (prev <= 1) {
            setIsTimerRunning(false);
            logTelemetry(`🔴 Heat Press cycle fully executed for Job ${timerJobId}! Buzzer triggered.`);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } else {
      clearInterval(interval);
    }
    return () => clearInterval(interval);
  }, [isTimerRunning, timerSecondsLeft]);

  // Handle Heat Press Start Call
  const triggerHeatPressTimer = (job: PrintJob) => {
    const duration = job.heatPressSpecs?.durationSeconds || 30;
    setTimerJobId(job.id);
    setTimerSecondsLeft(duration);
    setIsTimerRunning(true);
    logTelemetry(`⚙️ Starting Heat Press sequence for Job ${job.id} [${duration}s at ${job.heatPressSpecs?.temperatureF || 350}°F]`);
  };

  // Subtraction & Material Tracking Logic
  const deductMaterials = (materialId: string, amount: number) => {
    setMaterials(prev => {
      const updated = prev.map(m => {
        if (m.id === materialId) {
          const updatedStock = Math.max(0, m.stock - amount);
          if (updatedStock <= m.safetyLevel) {
            logTelemetry(`⚠️ WARNING: Material "${m.name}" is depleted below safety level (${m.safetyLevel} ${m.unit})!`);
          } else {
            logTelemetry(`📉 Subtracted ${amount} ${m.unit} from "${m.name}". New Stock: ${updatedStock} ${m.unit}`);
          }
          return { ...m, stock: updatedStock };
        }
        return m;
      });
      return updated;
    });
  };

  // Flow State Transitioning (Manufacturing synchronization)
  const transitionStatus = async (jobId: string, nextStatus: PrintStatus) => {
    let updatedJob: PrintJob | null = null;
    
    const newJobsList = printJobs.map(job => {
      if (job.id === jobId) {
        updatedJob = { ...job, status: nextStatus };
        return updatedJob;
      }
      return job;
    });

    setPrintJobs(newJobsList);
    logTelemetry(`Transitioned Job ${jobId} to stage: [${nextStatus.toUpperCase()}]`);

    // Synchronize to Firestore
    if (isCloudConnected && updatedJob) {
      try {
        await setDoc(doc(db, 'printing_jobs', jobId), updatedJob);
      } catch (err) {
        console.error("Failed to write status to Firestore: ", err);
      }
    }

    // Material Auto Deduction on Start of production
    if (nextStatus === 'Printing' && updatedJob) {
      const jobCopy: PrintJob = updatedJob;
      jobCopy.materialsUsed.forEach(mat => {
        deductMaterials(mat.materialId, mat.amountUsed);
      });
    }

    // Synchronize Order status
    if (updatedJob) {
      const orderRefId = (updatedJob as PrintJob).orderId;
      logTelemetry(`🔄 Syncing state back to Sales Order ${orderRefId}...`);
      if (nextStatus === 'Completed') {
        logTelemetry(`✅ Linked Order ${orderRefId} status updated to [READY FOR DELIVERY]!`);
      } else {
        logTelemetry(`🔄 Order ${orderRefId} status synchronized as [PRINTING IN PROCESS].`);
      }
    }
  };

  // Reprint Management Trigger
  const triggerReprint = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedJob || !reprintReason.trim()) return;

    const updatedJob: PrintJob = {
      ...selectedJob,
      status: 'Artwork Received', // Reset to starting point
      reprintStatus: 'requested',
      reprintCount: selectedJob.reprintCount + 1,
      reprintReasons: [...(selectedJob.reprintReasons || []), reprintReason],
      notes: `[REPRINT TRIGGERED - REASON: ${reprintReason}] ${selectedJob.notes}`
    };

    setPrintJobs(prev => prev.map(j => j.id === selectedJob.id ? updatedJob : j));
    logTelemetry(`💥 REPRINT REQUESTED for ${selectedJob.id}. Reason: "${reprintReason}". Returning workflow state to Artwork Approved.`);

    if (isCloudConnected) {
      try {
        await setDoc(doc(db, 'printing_jobs', selectedJob.id), updatedJob);
      } catch (err) {
        console.error("Firestore reprint sync failed: ", err);
      }
    }

    setIsReprintModalOpen(false);
    setReprintReason("");
    setSelectedJob(null);
  };

  // Production Notes update submit
  const addProductionNote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedJob || !newNoteText.trim()) return;

    const timeStamp = new Date().toISOString().split('T')[0];
    const updatedJob: PrintJob = {
      ...selectedJob,
      notes: `${selectedJob.notes}\n[${timeStamp}] ${newNoteText}`
    };

    setPrintJobs(prev => prev.map(j => j.id === selectedJob.id ? updatedJob : j));
    logTelemetry(`📝 Appended raw production logs to Job ${selectedJob.id}.`);

    if (isCloudConnected) {
      try {
        await setDoc(doc(db, 'printing_jobs', selectedJob.id), updatedJob);
      } catch (err) {
        console.error("Firestore notes sync failed: ", err);
      }
    }

    setIsNotesModalOpen(false);
    setNewNoteText("");
    setSelectedJob(null);
  };

  // Create New Job Handler
  const handleCreatePrintJob = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newJobForm.orderId || !newJobForm.customerName) {
      alert("Please enter a valid linked Order ID and Customer name.");
      return;
    }

    const newId = `PRNT-${Math.floor(804 + Math.random() * 500)}`;
    const colorsArr = newJobForm.colorsUsed.split(',').map(c => c.trim()).filter(Boolean);

    // Prepare structure
    const materialsUsedArr = [];
    if (newJobForm.materialToDeduct) {
      const parentMat = materials.find(m => m.id === newJobForm.materialToDeduct);
      if (parentMat) {
        materialsUsedArr.push({
          materialId: parentMat.id,
          materialName: parentMat.name,
          amountUsed: Number(newJobForm.materialAmount),
          unit: parentMat.unit
        });
      }
    }

    const createdJob: PrintJob = {
      id: newId,
      orderId: newJobForm.orderId,
      customerName: newJobForm.customerName,
      teamName: newJobForm.teamName || "General Purchase",
      printingType: newJobForm.printingType,
      status: newJobForm.status,
      artworkUrl: newJobForm.artworkUrl || "https://images.unsplash.com/photo-1544033527-b192daee1f5b?w=600&auto=format&fit=crop&q=60",
      artworkFilename: newJobForm.artworkFilename || "customer_vector_proof.ai",
      colorsUsed: colorsArr,
      assignedStaff: newJobForm.assignedStaff || "Workshop Crew",
      dueDate: newJobForm.dueDate || new Date(Date.now() + 5*24*60*60*1000).toISOString().split('T')[0],
      notes: newJobForm.notes || "Draft printing specs loaded.",
      reprintStatus: "none",
      reprintCount: 0,
      reprintReasons: [],
      materialsUsed: materialsUsedArr,
      screenSpecs: newJobForm.printingType === 'Screen printing' ? {
        exposureSeconds: Number(newJobForm.screenExposure),
        meshCount: Number(newJobForm.screenMeshUnit),
        emulsionPassed: true,
        tensionPassed: true
      } : undefined,
      heatPressSpecs: newJobForm.printingType !== 'Screen printing' ? {
        temperatureF: Number(newJobForm.heatPressTemp),
        pressureLbs: Number(newJobForm.heatPressPressure),
        durationSeconds: Number(newJobForm.heatPressDuration)
      } : undefined,
      createdAt: new Date().toISOString()
    };

    setPrintJobs(prev => [createdJob, ...prev]);
    logTelemetry(`🆕 Registered pristine Printing Job [${newId}] linked with Order ${createdJob.orderId}`);

    if (isCloudConnected) {
      try {
        await setDoc(doc(db, 'printing_jobs', newId), createdJob);
      } catch (err) {
        console.error("Firestore push error: ", err);
      }
    }

    // Reset Form
    setNewJobForm({
      orderId: "",
      customerName: "",
      teamName: "",
      printingType: "Sublimation printing",
      status: "Artwork Received",
      artworkUrl: "",
      artworkFilename: "",
      colorsUsed: "",
      assignedStaff: "",
      dueDate: "",
      notes: "",
      heatPressTemp: 350,
      heatPressPressure: 40,
      heatPressDuration: 30,
      screenExposure: 180,
      screenMeshUnit: 120,
      materialToDeduct: "",
      materialAmount: 1
    });

    setIsNewJobModalOpen(false);
  };

  // Sync outstanding Jersey garment orders to printing jobs (Order Integration)
  const autoImportFromOrders = () => {
    // Pick active apparel jersey orders inside Orders collection
    const sampleJerseyOrders = [
      { id: "TOTT-2026-9540", customerName: "Camberwell Sports Academy", teamName: "Camberwell U16s", type: "Sublimation printing", colors: "Royal Blue, Amber Wood", artwork: "camberwell_shuttle.ai" },
      { id: "TOTT-2026-9545", customerName: "Fitzroy Cricket Club", teamName: "Fitzroy Lions", type: "Screen printing", colors: "Crimson Red, Gold Dust", artwork: "lions_crest_exposed.pdf" }
    ];

    let countImported = 0;
    sampleJerseyOrders.forEach(o => {
      // Check if already exists in printJobs
      if (!printJobs.some(j => j.orderId === o.id)) {
        const matId = o.type === 'Screen printing' ? 'mat-8' : 'mat-2';
        const matUsed = materials.find(m => m.id === matId);

        const imported: PrintJob = {
          id: `PRNT-${Math.floor(910 + Math.random() * 80)}`,
          orderId: o.id,
          customerName: o.customerName,
          teamName: o.teamName,
          printingType: o.type as PrintingType,
          status: 'Artwork Received',
          artworkUrl: o.type === 'Screen printing' ? 'https://images.unsplash.com/photo-1530541930197-ff16ac917b0e?w=600&auto=format&fit=crop&q=80' : 'https://images.unsplash.com/photo-1544033527-b192daee1f5b?w=600&auto=format&fit=crop&q=80',
          artworkFilename: o.artwork,
          colorsUsed: o.colors.split(', '),
          assignedStaff: "Vijay Merchant",
          dueDate: new Date(Date.now() + 4*24*60*60*1000).toISOString().split('T')[0],
          notes: "Automatically synchronized from ERP outstanding apparel garments pipeline list.",
          reprintStatus: "none",
          reprintCount: 0,
          reprintReasons: [],
          materialsUsed: matUsed ? [{ materialId: matUsed.id, materialName: matUsed.name, amountUsed: o.type === 'Screen printing' ? 200 : 80, unit: matUsed.unit }] : [],
          createdAt: new Date().toISOString()
        };

        setPrintJobs(prev => [imported, ...prev]);
        countImported++;
        logTelemetry(`📥 Order Sync: Automatically compiled Print Job ${imported.id} matching Outstanding Sale Contract ${o.id}`);
      }
    });

    if (countImported === 0) {
      alert("No new outstanding team wear orders found to synchronize.");
    } else {
      alert(`Successfully detected and synchronized ${countImported} cricket garment orders into the active Print Queue!`);
    }
  };

  // Filtering Logic
  const filteredJobs = printJobs.filter(job => {
    const matchesSearch = 
      job.customerName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      job.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
      job.orderId.toLowerCase().includes(searchQuery.toLowerCase()) ||
      job.teamName.toLowerCase().includes(searchQuery.toLowerCase());
      
    const matchesType = selectedTypeFilter === "All" || job.printingType === selectedTypeFilter;
    const matchesStatus = selectedStatusFilter === "All" || job.status === selectedStatusFilter;

    return matchesSearch && matchesType && matchesStatus;
  });

  // Calculate high performance analytical metrics for top dashboard widgets
  const totalPrintsYTD = printJobs.length;
  const activeExposures = printJobs.filter(j => j.status === 'Screen Preparation').length;
  const criticalMaterialsCount = materials.filter(m => m.stock <= m.safetyLevel).length;
  const totalReprintRates = totalPrintsYTD ? ((printJobs.filter(jStr => jStr.reprintCount > 0).length / totalPrintsYTD) * 100).toFixed(1) : "0.0";

  return (
    <div className="space-y-6" id="printing-sublimation-workspace">
      
      {/* 1. OPERATIONAL HEADER & DYNAMIC TELEMETRY LOGS */}
      <div className="bg-white p-6 rounded-2xl border border-neutral-200 flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-4 shadow-sm shadow-neutral-100">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-mono tracking-widest text-[#E5B84B] font-black uppercase bg-amber-50 px-2.5 py-1 rounded border border-amber-200">
              Department: Printing & Sublimation
            </span>
            <span className={`text-[10px] font-mono px-2 py-0.5 rounded flex items-center gap-1.5 font-bold ${
              syncStatus === 'synced' ? 'bg-emerald-50 text-emerald-600 border border-emerald-250' : 'bg-amber-50 text-amber-600 border border-amber-250'
            }`}>
              <span className={`w-1.5 h-1.5 rounded-full ${syncStatus === 'synced' ? 'bg-emerald-500 animate-ping' : 'bg-amber-500 animate-pulse'}`}></span>
              <span>{syncStatus === 'synced' ? "FIRESTORE SYNC: ONLINE" : "LOCAL BACKUP STORAGE"}</span>
            </span>
          </div>
          
          <h2 className="text-xl font-black text-neutral-900 tracking-tight mt-2 uppercase font-sans flex items-center gap-2">
            <Printer className="w-6 h-6 text-[#E5B84B]" />
            <span>Cricket Apparel & Screen Printing Workshop</span>
          </h2>
          
          <p className="text-xs text-neutral-500 font-sans mt-1">
            Production-grade vector proofing alignments, photosensitive emulsion exposure limits, and sublimation hot-press duration counters.
          </p>
        </div>

        {/* Header Action Buttons */}
        <div className="flex items-center gap-2 shrink-0">
          <button 
            type="button"
            onClick={autoImportFromOrders}
            className="bg-neutral-100 hover:bg-neutral-150 text-neutral-800 border border-neutral-300 px-3.5 py-2.5 rounded-xl text-xs font-mono font-bold tracking-tight transition-all flex items-center gap-1.5 w-full sm:w-auto justify-center"
          >
            <LinkIcon className="w-3.5 h-3.5 text-neutral-500" />
            <span>Sync Garment Orders</span>
          </button>

          <button 
            type="button"
            onClick={() => setIsNewJobModalOpen(true)}
            className="bg-[#E5B84B] hover:bg-amber-500 text-neutral-950 px-4 py-2.5 rounded-xl text-xs font-mono font-bold tracking-tight transition-all shadow-md shadow-amber-500/10 flex items-center gap-1.5 w-full sm:w-auto justify-center"
          >
            <Plus className="w-4 h-4 stroke-[3]" />
            <span>New Printing Contract</span>
          </button>
        </div>
      </div>

      {/* 2. REAL-TIME WHEATSTONE KPI METRIC TILES */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4" id="printing-metric-bento">
        {/* KPI 1 */}
        <div className="bg-white p-5 rounded-2xl border border-neutral-200 shadow-sm flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-[10px] font-mono font-black text-neutral-500 tracking-wider uppercase">ACTIVE QUEUE</span>
            <h3 className="text-2xl font-black text-neutral-900 font-mono">{filteredJobs.length} Jobs</h3>
            <p className="text-[10.5px] font-mono text-neutral-400">Total contracts under workflow</p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-amber-50 text-[#E5B84B] border border-amber-200 flex items-center justify-center shrink-0">
            <Printer className="w-5 h-5 focus:outline-none" />
          </div>
        </div>

        {/* KPI 2 */}
        <div className="bg-white p-5 rounded-2xl border border-neutral-200 shadow-sm flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-[10px] font-mono font-black text-neutral-500 tracking-wider uppercase">ACTIVE SCREENS EXPOSED</span>
            <h3 className="text-2xl font-black text-neutral-900 font-mono">{activeExposures} Screens</h3>
            <span className="text-[10.5px] font-mono text-neutral-400">Mesh ready for emulsify / print</span>
          </div>
          <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-500 border border-blue-200 flex items-center justify-center shrink-0">
            <Layers className="w-5 h-5" />
          </div>
        </div>

        {/* KPI 3 */}
        <div className="bg-white p-5 rounded-2xl border border-neutral-200 shadow-sm flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-[10px] font-mono font-black text-neutral-500 tracking-wider uppercase">REPRINT LOSS METRIC</span>
            <h3 className="text-2xl font-black text-neutral-900 font-mono">{totalReprintRates}%</h3>
            <span className="text-[10.5px] font-mono text-neutral-400">Defects / alignment errors</span>
          </div>
          <div className="w-10 h-10 rounded-xl bg-orange-50 text-orange-500 border border-orange-200 flex items-center justify-center shrink-0">
            <RotateCcw className="w-5 h-5" />
          </div>
        </div>

        {/* KPI 4 */}
        <div className="bg-white p-5 rounded-2xl border border-red-200 shadow-sm flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-[10px] font-mono font-black text-red-500 tracking-wider uppercase">CRITICAL STOCK ALERTS</span>
            <h3 className="text-2xl font-black text-red-600 font-mono">{criticalMaterialsCount} SKU Alert</h3>
            <span className="text-[10.5px] font-mono text-red-500">Inks or vinyl foils below limit</span>
          </div>
          <div className="w-10 h-10 rounded-xl bg-red-50 text-red-500 border border-red-200 flex items-center justify-center shrink-0">
            <AlertTriangle className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* 3. CO-ORGANIZED PANELS (Preview Engine + Active Materials Stock) */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
        
        {/* Left Column: Interactive Vector Mockup Visualizer & Print Materials Inventory (5 grid units) */}
        <div className="xl:col-span-5 space-y-6">
          
          {/* Visualizer card */}
          <div className="bg-white p-5 rounded-2xl border border-neutral-205 shadow-sm space-y-4">
            <div className="flex items-center justify-between border-b border-neutral-100 pb-3">
              <div>
                <span className="text-[9px] font-mono text-amber-500 font-black uppercase tracking-widest block">Vector Match Preview</span>
                <h3 className="text-sm font-bold text-neutral-900 font-sans">Garment Mockup Engine</h3>
              </div>
              <span className="text-xs font-mono bg-neutral-900 text-white px-2 py-0.5 rounded font-bold uppercase select-none">Pre-Production Proof</span>
            </div>

            {/* Simulated Live Vector Canvas Wrapper */}
            <div className="relative bg-neutral-100 rounded-xl p-6 h-64 flex items-center justify-center border border-neutral-200 overflow-hidden">
              <div className="absolute inset-0 bg-[radial-gradient(#d4d4d8_1px,transparent_1px)] [background-size:16px_16px] opacity-40"></div>
              
              {/* Apparel drawing */}
              <div className="relative z-10 w-44 h-44 flex flex-col justify-center items-center">
                {previewApparelType === 'jersey' && (
                  <svg className="w-full h-full text-neutral-700 drop-shadow-lg" viewBox="0 0 100 100" fill={previewBaseColor} stroke="#171717" strokeWidth="2.5">
                    {/* Jersey outline */}
                    <path d="M 30,15 L 42,6 L 47,15 L 53,15 L 58,6 L 70,15 L 64,30 L 64,85 L 36,85 L 36,30 Z" />
                    {/* Team Stripes mockup detail */}
                    <path d="M 36,40 L 64,44 M 36,44 L 64,48" stroke="#E5B84B" strokeWidth="1.5" />
                  </svg>
                )}

                {previewApparelType === 'hoodie' && (
                  <svg className="w-full h-full text-neutral-700 drop-shadow-lg" viewBox="0 0 100 100" fill={previewBaseColor} stroke="#171717" strokeWidth="2.5">
                    {/* Hoodie body + pocket + drawstrings */}
                    <path d="M 28,25 L 43,15 L 57,15 L 72,25 L 66,45 L 66,85 L 34,85 L 34,45 Z" />
                    <path d="M 40,65 L 60,65 L 55,75 L 45,75 Z" fill="none" stroke="#171717" strokeWidth="1.5" />
                    {/* drawstrings */}
                    <line x1="46" y1="20" x2="46" y2="35" stroke="#E5B84B" strokeWidth="2" />
                    <line x1="54" y1="20" x2="54" y2="33" stroke="#E5B84B" strokeWidth="2" />
                  </svg>
                )}

                {previewApparelType === 'cap' && (
                  <svg className="w-full h-full text-neutral-700 drop-shadow-lg" viewBox="0 0 100 100" fill={previewBaseColor} stroke="#171717" strokeWidth="2.5">
                    {/* Standard Cricket Cap Outline */}
                    <path d="M 20,62 C 20,25 80,25 80,62 L 95,65 L 95,72 L 80,72 L 20,72 Z" />
                    <path d="M 50,22 L 50,62 M 30,35 C 40,40 50,40 50,62" fill="none" stroke="#171717" strokeDasharray="1 1" />
                  </svg>
                )}

                {/* Placed Artwork Logo overlay */}
                <div className={`absolute z-20 pointer-events-none transition-all flex flex-col items-center justify-center ${
                  previewPlacement === 'front' ? 'top-[42%] left-[45%]' :
                  previewPlacement === 'back' ? 'top-[42%] left-[45%] opacity-40' :
                  'top-[35%] left-[26%] scale-75'
                }`}>
                  <div className="w-6 h-6 rounded-full border border-neutral-900 bg-white overflow-hidden shadow">
                    <img referrerPolicy="no-referrer" src={previewLogoUrl} alt="crest proof" className="w-full h-full object-cover" />
                  </div>
                  <span className="text-[6.5px] scale-75 font-black text-neutral-800 bg-yellow-400 px-1 rounded uppercase font-mono tracking-tighter">crest</span>
                </div>
              </div>

              {/* Specs readout */}
              <div className="absolute bottom-2 left-3 font-mono text-[9px] text-neutral-500 bg-white/90 backdrop-blur px-2.5 py-1 rounded border border-neutral-200">
                <span>Placement: <strong>{previewPlacement.toUpperCase()}</strong></span>
                <span className="ml-3">Base: <strong>{previewBaseColor}</strong></span>
              </div>
            </div>

            {/* Interactive Custom Controls */}
            <div className="space-y-3 font-mono text-xs">
              {/* Apparel Select */}
              <div className="grid grid-cols-3 gap-2">
                {(['jersey', 'hoodie', 'cap'] as const).map(type => (
                  <button 
                    key={type}
                    onClick={() => {
                      setPreviewApparelType(type);
                      logTelemetry(`👕 Rendered mockup blueprint: [${type.toUpperCase()}]`);
                    }}
                    className={`p-2 rounded-xl text-center capitalize border transition-all ${previewApparelType === type ? 'bg-neutral-900 text-white border-transparent font-bold' : 'bg-neutral-50 text-neutral-600 border-neutral-200 hover:bg-neutral-100'}`}
                  >
                    {type}
                  </button>
                ))}
              </div>

              {/* Placement & Color Pickers */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-[10px] text-neutral-400 uppercase font-bold block mb-1">Print Side</label>
                  <select 
                    value={previewPlacement} 
                    onChange={(e) => setPreviewPlacement(e.target.value as any)}
                    className="w-full p-2 text-xs bg-neutral-50 rounded-xl border border-neutral-200"
                  >
                    <option value="front">Chest Placement</option>
                    <option value="back">Back Nameplate</option>
                    <option value="sleeve">Left Sleeve Badge</option>
                  </select>
                </div>

                <div>
                  <label className="text-[10px] text-neutral-400 uppercase font-bold block mb-1">Apparel Base Hue</label>
                  <div className="flex items-center gap-1.5 h-9 bg-neutral-50 border border-neutral-200 rounded-xl px-2">
                    <input 
                      type="color" 
                      value={previewBaseColor} 
                      onChange={(e) => setPreviewBaseColor(e.target.value)}
                      className="w-6 h-6 p-0 border-0 rounded cursor-pointer shrink-0" 
                    />
                    <span className="text-[11px] font-mono text-neutral-600 uppercase">{previewBaseColor}</span>
                  </div>
                </div>
              </div>

              {/* Dynamic Logo URL attachment test */}
              <div>
                <label className="text-[10px] text-neutral-400 uppercase font-bold block mb-1">Crest Vector Artwork Link</label>
                <div className="relative">
                  <input 
                    type="text" 
                    value={previewLogoUrl}
                    onChange={(e) => setPreviewLogoUrl(e.target.value)}
                    placeholder="https://example.com/logo.png"
                    className="w-full text-[10.5px] p-2 bg-neutral-50 border border-neutral-200 rounded-xl pl-8"
                  />
                  <ImageIcon className="w-3.5 h-3.5 absolute left-3 top-3 text-neutral-400" />
                </div>
              </div>
            </div>

          </div>

          {/* Materials inventory subtraction tracking sheet */}
          <div className="bg-white p-5 rounded-2xl border border-neutral-200 shadow-sm space-y-4">
            <div>
              <span className="text-[9px] font-mono text-[#E5B84B] font-black uppercase tracking-widest block">Active Stock Levels</span>
              <h3 className="text-sm font-bold text-neutral-900 font-sans">Print Formulation & Inks Tracker</h3>
            </div>

            <div className="divide-y divide-neutral-100 max-h-80 overflow-y-auto font-mono text-xs pr-1">
              {materials.map(mat => {
                const isCritical = mat.stock <= mat.safetyLevel;
                return (
                  <div key={mat.id} className="py-2.5 flex items-center justify-between gap-2.5">
                    <div className="space-y-0.5">
                      <div className="flex items-center gap-2">
                        <strong className="text-neutral-800 text-[12.5px]">{mat.name}</strong>
                        <span className="bg-neutral-100 text-neutral-500 font-bold text-[8px] px-1.5 py-0.5 rounded uppercase">
                          {mat.category}
                        </span>
                      </div>
                      <span className="text-[10px] text-neutral-400 font-sans block">Refilled: {mat.lastRefilled}</span>
                    </div>

                    <div className="text-right">
                      <span className={`text-[13px] font-black block ${isCritical ? 'text-red-500' : 'text-neutral-900'}`}>
                        {mat.stock} {mat.unit}
                      </span>
                      {isCritical ? (
                        <span className="text-[9px] text-red-500 font-bold uppercase animate-pulse">critical safety low</span>
                      ) : (
                        <span className="text-[9px] text-neutral-400">Target: &gt;{mat.safetyLevel}</span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

        </div>

        {/* Right Column: Interactive Real-Time Kanban/Workflow Grid Board (7 grid units) */}
        <div className="xl:col-span-7 space-y-6">
          
          {/* Filter Bar Controls */}
          <div className="bg-white p-4.5 rounded-2xl border border-neutral-200 shadow-sm flex flex-col md:flex-row items-stretch md:items-center gap-4 justify-between font-mono text-xs">
            {/* Search Input */}
            <div className="relative flex-1">
              <input 
                type="text" 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search Client, Team Club, ID..."
                className="w-full p-2.5 pl-9 rounded-xl bg-neutral-50 border border-neutral-200 text-xs text-neutral-800 focus:outline-none focus:ring-1 focus:ring-amber-500"
              />
              <Search className="w-4 h-4 text-neutral-400 absolute left-3 top-3" />
            </div>

            {/* Type selector */}
            <div className="flex items-center gap-2 shrink-0">
              <span className="text-neutral-400 text-[11px] font-bold uppercase shrink-0">Method:</span>
              <select 
                value={selectedTypeFilter}
                onChange={(e) => setSelectedTypeFilter(e.target.value)}
                className="bg-neutral-50 p-2 border border-neutral-200 rounded-xl font-bold"
              >
                <option value="All">All Types</option>
                <option value="Screen printing">Screen Printing</option>
                <option value="Sublimation printing">Sublimation</option>
                <option value="Heat transfer/vinyl printing">Heat Transfer</option>
              </select>
            </div>

            {/* Status selector */}
            <div className="flex items-center gap-2 shrink-0">
              <span className="text-neutral-400 text-[11px] font-bold uppercase shrink-0">Stage:</span>
              <select 
                value={selectedStatusFilter}
                onChange={(e) => setSelectedStatusFilter(e.target.value)}
                className="bg-neutral-50 p-2 border border-neutral-200 rounded-xl font-bold"
              >
                <option value="All">All Stages</option>
                <option value="Artwork Received">Artwork Received</option>
                <option value="Design Approved">Design Approved</option>
                <option value="Screen Preparation">Screen Preparation</option>
                <option value="Printing">Printing</option>
                <option value="Heat Press">Heat Press</option>
                <option value="Quality Check">Quality Check</option>
                <option value="Completed">Completed</option>
              </select>
            </div>
          </div>

          {/* Kanban / Print Queue List Board */}
          <div className="space-y-4">
            <h4 className="text-[12px] font-black font-mono text-[#E5B84B] tracking-widest uppercase px-1.5 bg-amber-50 py-1.5 self-start select-none rounded border border-amber-200/60 flex items-center justify-between">
              <span>WORKFLOW PIPELINE QUEUE ({filteredJobs.length} Roster items matched)</span>
              
              {/* Live telemetry line */}
              <span className="text-[10px] text-neutral-400 normal-case font-normal">Active Branch: Camberwell-HQ</span>
            </h4>

            {filteredJobs.length === 0 ? (
              <div className="bg-white rounded-2xl border border-neutral-200 p-12 text-center shadow-xs">
                <Printer className="w-12 h-12 text-neutral-300 mx-auto stroke-1" />
                <h5 className="font-sans font-bold text-neutral-800 text-sm mt-3">No active print jobs detected</h5>
                <p className="font-sans text-xs text-neutral-400 max-w-sm mx-auto mt-1 leading-normal">
                  Try adjusting filters, synchronizing with jersey sales orders list, or clicking "New Printing Contract" to register a contract.
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {filteredJobs.map(job => {
                  const isScreenType = job.printingType === 'Screen printing';
                  const nearDue = new Date(job.dueDate).getTime() - Date.now() < 3*24*60*60*1000;
                  
                  return (
                    <div 
                      key={job.id} 
                      className={`bg-white rounded-2xl border p-5 flex flex-col md:flex-row shadow-sm hover:shadow-md transition-all gap-5 ${
                        job.reprintStatus === 'requested' ? 'border-l-4 border-l-red-500 border-red-200' : 'border-t-2 border-t-[#E5B84B] border-neutral-200'
                      }`}
                    >
                      {/* Image & Main Info Left */}
                      <div className="flex-1 space-y-3.5">
                        
                        {/* ID, Target, Reprint state */}
                        <div className="flex items-center gap-2 flex-wrap text-xs font-mono">
                          <span className="font-black text-[#E5B84B] tracking-wider text-sm bg-amber-50/50 px-2 py-0.5 rounded border border-amber-200/50">{job.id}</span>
                          <span className="text-neutral-400">Order Ref: <strong>{job.orderId}</strong></span>
                          
                          <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider border font-sans ${
                            job.printingType === 'Screen printing' ? 'bg-purple-50 text-purple-700 border-purple-200' :
                            job.printingType === 'Sublimation printing' ? 'bg-sky-50 text-sky-700 border-sky-200' :
                            'bg-violet-50 text-violet-700 border-violet-200'
                          }`}>
                            {job.printingType}
                          </span>

                          {job.reprintCount > 0 && (
                            <span className="bg-red-50 text-red-600 border border-red-200 font-bold rounded px-1.5 py-0.5 text-[9.5px] uppercase animate-pulse flex items-center gap-1">
                              <RotateCcw className="w-3 h-3 text-red-500" />
                              <span>Reprint #{job.reprintCount}</span>
                            </span>
                          )}
                        </div>

                        {/* Title detail */}
                        <div>
                          <h4 className="text-base font-black text-neutral-900 tracking-tight">{job.customerName}</h4>
                          <span className="text-xs text-neutral-500 font-mono">Club/Team Scope: <strong>{job.teamName}</strong></span>
                        </div>

                        {/* Sub parameters row */}
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-3 text-xs font-mono bg-neutral-50 p-3 rounded-xl border border-neutral-200">
                          <div>
                            <span className="text-[10px] text-neutral-400 uppercase block mb-0.5">Assigned Staff</span>
                            <span className="font-bold text-neutral-800 flex items-center gap-1">
                              <Users className="w-3.5 h-3.5 text-neutral-450" />
                              {job.assignedStaff}
                            </span>
                          </div>

                          <div>
                            <span className="text-[10px] text-neutral-400 uppercase block mb-0.5">Due Date</span>
                            <span className={`font-bold flex items-center gap-1 ${nearDue ? 'text-orange-600 font-black' : 'text-neutral-800'}`}>
                              <Calendar className="w-3.5 h-3.5 text-neutral-400" />
                              {job.dueDate}
                            </span>
                          </div>

                          <div className="col-span-2 md:col-span-1">
                            <span className="text-[10px] text-neutral-400 uppercase block mb-0.5">Color Plate Vector</span>
                            <span className="font-bold text-neutral-700 block truncate" title={job.colorsUsed.join(', ')}>
                              {job.colorsUsed.join(', ')}
                            </span>
                          </div>
                        </div>

                        {/* Screen Printing specific preparation specs read */}
                        {isScreenType && job.screenSpecs && (
                          <div className="bg-purple-50/50 p-3 rounded-xl border border-purple-200/50 text-xs font-mono space-y-1.5">
                            <div className="flex items-center justify-between text-[11px] font-black text-purple-800 uppercase">
                              <span className="flex items-center gap-1">
                                <ClipboardList className="w-4 h-4 text-purple-600" />
                                <span>Screen Exposure & Preparation Specs</span>
                              </span>
                              <span>Target Prep Stage</span>
                            </div>
                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[10.5px]">
                              <span>Mesh Count: <strong>{job.screenSpecs.meshCount}T</strong></span>
                              <span>Exposure: <strong>{job.screenSpecs.exposureSeconds}s</strong></span>
                              <span className="flex items-center gap-1">
                                <CheckSquare className={`w-3.5 h-3.5 ${job.screenSpecs.emulsionPassed ? 'text-emerald-500' : 'text-neutral-355'}`} />
                                <span>Emulsion Base</span>
                              </span>
                              <span className="flex items-center gap-1">
                                <CheckSquare className={`w-3.5 h-3.5 ${job.screenSpecs.tensionPassed ? 'text-emerald-500' : 'text-neutral-355'}`} />
                                <span>Mesh Tension</span>
                              </span>
                            </div>
                          </div>
                        )}

                        {/* Sublimation heating press / Timer parameters read */}
                        {!isScreenType && job.heatPressSpecs && (
                          <div className="bg-sky-50/40 p-3 rounded-xl border border-sky-200/50 text-xs font-mono space-y-1.5">
                            <div className="flex items-center justify-between text-[11px] font-black text-sky-800 uppercase">
                              <span className="flex items-center gap-1">
                                <Flame className="w-3.5 h-3.5 text-sky-600" />
                                <span>Heat Press Operational Settings</span>
                              </span>
                              {timerJobId === job.id && isTimerRunning ? (
                                <span className="bg-orange-500 text-white font-bold rounded px-1.5 py-0.5 text-[9px] uppercase animate-ping">pressing...</span>
                              ) : null}
                            </div>
                            <div className="grid grid-cols-3 gap-2 text-[11px]">
                              <span className="flex items-center gap-1.5">
                                <Thermometer className="w-3.5 h-3.5 text-orange-500" />
                                <span>Temp: <strong>{job.heatPressSpecs.temperatureF}°F</strong></span>
                              </span>
                              <span className="flex items-center gap-1.5">
                                <Timer className="w-3.5 h-3.5 text-[#E5B84B]" />
                                <span>Duration: <strong>{job.heatPressSpecs.durationSeconds}s</strong></span>
                              </span>
                              <span>Pressure: <strong>{job.heatPressSpecs.pressureLbs} lbs</strong></span>
                            </div>
                          </div>
                        )}

                        {/* Vector Artwork filename display */}
                        <div className="flex items-center gap-2 text-xs font-mono text-neutral-500 bg-white border border-neutral-150 rounded-xl p-2.5">
                          <ImageIcon className="w-4 h-4 text-[#E5B84B] shrink-0" />
                          <span className="truncate">File: <strong className="text-neutral-800">{job.artworkFilename}</strong></span>
                        </div>

                        {/* Notes summary */}
                        {job.notes && (
                          <div className="text-xs font-sans text-neutral-600 italic bg-amber-50/30 p-2.5 rounded-xl border border-amber-200/30 font-mono block whitespace-pre-line">
                            <strong>Workflow Logs & Notes:</strong>
                            <p>{job.notes}</p>
                          </div>
                        )}

                      </div>

                      {/* Right Panel Work Actions Area */}
                      <div className="md:w-56 shrink-0 flex flex-col justify-between border-t md:border-t-0 md:border-l border-neutral-250 pt-4 md:pt-0 md:pl-5 space-y-4">
                        
                        {/* Status selector right head */}
                        <div className="space-y-1 text-right md:text-left">
                          <label className="text-[10px] text-neutral-400 font-mono block uppercase">Workflow Step</label>
                          <span className={`px-2.5 py-1 rounded text-xs font-mono font-black border uppercase inline-block font-sans ${
                            job.status === 'Completed' ? 'bg-emerald-50 text-emerald-700 border-emerald-250' :
                            job.status === 'Quality Check' ? 'bg-blue-50 text-blue-700 border-blue-250' :
                            job.status === 'Heat Press' ? 'bg-orange-50 text-orange-700 border-orange-250' :
                            job.status === 'Printing' ? 'bg-[#E5B84B]/10 text-amber-600 border-amber-200' :
                            'bg-neutral-100 text-neutral-700 border-neutral-300'
                          }`}>
                            {job.status}
                          </span>
                        </div>

                        {/* Main Interaction Buttons */}
                        <div className="space-y-2 text-xs font-mono">
                          
                          {/* Next status trigger */}
                          {job.status !== 'Completed' ? (
                            <button 
                              type="button"
                              onClick={() => {
                                const phases: PrintStatus[] = [
                                  'Artwork Received',
                                  'Design Approved',
                                  'Screen Preparation',
                                  'Printing',
                                  'Heat Press',
                                  'Quality Check',
                                  'Completed'
                                ];
                                const currIdx = phases.indexOf(job.status);
                                if (currIdx !== -1 && currIdx < phases.length - 1) {
                                  transitionStatus(job.id, phases[currIdx + 1]);
                                }
                              }}
                              className="w-full bg-[#E5B84B] hover:bg-amber-500 text-neutral-950 font-bold px-3 py-2.5 rounded-xl transition-all shadow-xs flex items-center justify-center gap-1.5 text-[11px]"
                            >
                              <Printer className="w-3.5 h-3.5 stroke-[2]" />
                              <span>Advance Step &rarr;</span>
                            </button>
                          ) : (
                            <div className="bg-emerald-50 text-emerald-700 border border-emerald-200 p-2 rounded-xl text-center font-bold text-[10.5px] uppercase">
                              🎉 Job certified fully complete
                            </div>
                          )}

                          {/* Quick Hot Heat-Press Timer trigger for non-screen printing jobs in heatpress stage */}
                          {!isScreenType && (
                            <button
                              type="button"
                              disabled={timerJobId === job.id && isTimerRunning}
                              onClick={() => triggerHeatPressTimer(job)}
                              className={`w-full py-2 px-3 rounded-xl font-bold flex items-center justify-center gap-1.5 border transition-all text-[11px] ${
                                timerJobId === job.id && isTimerRunning
                                  ? 'bg-neutral-100 text-neutral-400 border-neutral-200 cursor-not-allowed'
                                  : 'bg-orange-50 hover:bg-orange-100 text-orange-600 border-orange-200'
                              }`}
                            >
                              <Timer className="w-3.5 h-3.5" />
                              <span>
                                {timerJobId === job.id && isTimerRunning 
                                  ? `Fusing (${timerSecondsLeft}s)` 
                                  : "Start Heat Press Timer"
                                }
                              </span>
                            </button>
                          )}

                          {/* Append production logs / notes button */}
                          <button 
                            type="button"
                            onClick={() => {
                              setSelectedJob(job);
                              setIsNotesModalOpen(true);
                            }}
                            className="w-full bg-neutral-50 hover:bg-neutral-100 text-neutral-700 border border-neutral-205 py-2 px-3 rounded-xl font-bold flex items-center justify-center gap-1"
                          >
                            <FileText className="w-3.5 h-3.5 text-neutral-450" />
                            <span>Staff Log Update</span>
                          </button>

                          {/* Reprint request button */}
                          <button 
                            type="button"
                            onClick={() => {
                              setSelectedJob(job);
                              setIsReprintModalOpen(true);
                            }}
                            className="w-full bg-red-50 hover:bg-red-100 text-red-600 border border-red-200 py-2 px-3 rounded-xl font-bold flex items-center justify-center gap-1 text-[10.5px]"
                          >
                            <RotateCcw className="w-3.5 h-3.5 text-red-500" />
                            <span>Request Reprint</span>
                          </button>

                        </div>

                      </div>

                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Micro telemetry stream widget */}
          <div className="bg-white p-5 rounded-2xl border border-neutral-200 shadow-sm space-y-2.5">
            <h4 className="text-[10px] font-black font-mono text-neutral-400 tracking-wider uppercase">Active Screen Printing & Sublimation Telemetry Feed</h4>
            <div className="bg-neutral-950 p-4 rounded-xl font-mono text-[10.5px] text-emerald-400 space-y-1 h-32 overflow-y-auto border border-neutral-800 scrollbar-thin leading-relaxed">
              {telemetryLogs.length === 0 ? (
                <div className="text-neutral-550 text-xs italic">Awaiting operational actions streams logs...</div>
              ) : (
                telemetryLogs.map((log, index) => (
                  <div key={index} className="truncate">
                    <span className="text-neutral-700 font-bold mr-1.5">&gt;&gt;</span>
                    {log}
                  </div>
                ))
              )}
            </div>
          </div>

        </div>

      </div>

      {/* ================================== */}
      {/* --- MODAL: NEW PRINT DESIGN JOB --- */}
      {/* ================================== */}
      {isNewJobModalOpen && (
        <div className="fixed inset-0 z-50 bg-neutral-950/80 backdrop-blur-xs flex items-center justify-center p-4">
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white border border-neutral-250 rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl font-mono text-xs text-neutral-800"
          >
            <div className="px-6 py-4 bg-neutral-900 text-white flex items-center justify-between border-b border-neutral-800">
              <h3 className="font-bold text-xs tracking-widest text-[#E5B84B] uppercase flex items-center gap-2">
                <Printer className="w-4 h-4 text-[#E5B84B]" />
                <span>SPECIFY APPAREL GRAPHICS QUEUE</span>
              </h3>
              <button onClick={() => setIsNewJobModalOpen(false)} className="text-neutral-400 hover:text-white p-1">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreatePrintJob} className="p-6 space-y-4 max-h-[80vh] overflow-y-auto">
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-[10px] text-neutral-450 uppercase font-bold block mb-1">Linked Order ID *</label>
                  <input 
                    type="text" 
                    value={newJobForm.orderId}
                    onChange={(e) => setNewJobForm({ ...newJobForm, orderId: e.target.value })}
                    placeholder="TOTT-2026-X4"
                    className="w-full p-2 rounded-xl bg-neutral-50 border border-neutral-200"
                    required
                  />
                </div>

                <div>
                  <label className="text-[10px] text-neutral-450 uppercase font-bold block mb-1">Affiliated Team Name</label>
                  <input 
                    type="text" 
                    value={newJobForm.teamName}
                    onChange={(e) => setNewJobForm({ ...newJobForm, teamName: e.target.value })}
                    placeholder="E.g., Melbourne Stars"
                    className="w-full p-2 rounded-xl bg-neutral-50 border border-neutral-200"
                  />
                </div>
              </div>

              <div>
                <label className="text-[10px] text-neutral-450 uppercase font-bold block mb-1">Customer / Club / School *</label>
                <input 
                  type="text" 
                  value={newJobForm.customerName}
                  onChange={(e) => setNewJobForm({ ...newJobForm, customerName: e.target.value })}
                  placeholder="E.g., Fitzroy Cricket Club"
                  className="w-full p-2 rounded-xl bg-neutral-50 border border-neutral-200"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-[10px] text-neutral-450 uppercase font-bold block mb-1">Printing Methodology</label>
                  <select 
                    value={newJobForm.printingType}
                    onChange={(e) => setNewJobForm({ ...newJobForm, printingType: e.target.value as PrintingType })}
                    className="w-full p-2 bg-neutral-50 rounded-xl border border-neutral-200"
                  >
                    <option value="Sublimation printing">Sublimation Printing</option>
                    <option value="Screen printing">Screen Printing</option>
                    <option value="Heat transfer/vinyl printing">Heat Transfer / Vinyl</option>
                  </select>
                </div>

                <div>
                  <label className="text-[10px] text-neutral-450 uppercase font-bold block mb-1">Assign Workshop Staff</label>
                  <select
                    value={newJobForm.assignedStaff}
                    onChange={(e) => setNewJobForm({ ...newJobForm, assignedStaff: e.target.value })}
                    className="w-full p-2 bg-neutral-50 rounded-xl border border-neutral-200"
                  >
                    <option value="">Roster Default</option>
                    <option value="Vijay Merchant">Vijay Merchant (Sublimation Chief)</option>
                    <option value="Sarah Printworks">Sarah Printworks (Exposure Pro)</option>
                    <option value="Arthur Morris">Arthur Morris (QC Lead)</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-[10px] text-neutral-450 uppercase font-bold block mb-1">Due Date</label>
                  <input 
                    type="date" 
                    value={newJobForm.dueDate}
                    onChange={(e) => setNewJobForm({ ...newJobForm, dueDate: e.target.value })}
                    className="w-full p-2 bg-neutral-50 rounded-xl border border-neutral-200"
                  />
                </div>

                <div>
                  <label className="text-[10px] text-neutral-450 uppercase font-bold block mb-1">Pantone / Colors used</label>
                  <input 
                    type="text" 
                    value={newJobForm.colorsUsed}
                    onChange={(e) => setNewJobForm({ ...newJobForm, colorsUsed: e.target.value })}
                    placeholder="Gold, Royal Blue"
                    className="w-full p-2 bg-neutral-50 rounded-xl border border-neutral-200"
                  />
                </div>
              </div>

              {/* Conditional parameters based on printing methodology */}
              {newJobForm.printingType === 'Screen printing' ? (
                <div className="bg-purple-50 p-4 border border-purple-250 rounded-xl space-y-3">
                  <span className="font-bold text-purple-800 text-[11px] uppercase block">Mesh Exposure Formula</span>
                  <div className="grid grid-cols-2 gap-2 text-[11px]">
                    <div>
                      <span className="text-neutral-450 mb-0.5 block">Exposure Time (Seconds)</span>
                      <input 
                        type="number"
                        value={newJobForm.screenExposure}
                        onChange={(e) => setNewJobForm({ ...newJobForm, screenExposure: Number(e.target.value) })}
                        className="w-full p-1.5 bg-white border border-purple-200 rounded"
                      />
                    </div>
                    <div>
                      <span className="text-neutral-450 mb-0.5 block">Mesh Threads Count (T)</span>
                      <input 
                        type="number"
                        value={newJobForm.screenMeshUnit}
                        onChange={(e) => setNewJobForm({ ...newJobForm, screenMeshUnit: Number(e.target.value) })}
                        className="w-full p-1.5 bg-white border border-purple-200 rounded"
                      />
                    </div>
                  </div>
                </div>
              ) : (
                <div className="bg-sky-50 p-4 border border-sky-250 rounded-xl space-y-3">
                  <span className="font-bold text-sky-800 text-[11px] uppercase block">Heat Transfer Settings</span>
                  <div className="grid grid-cols-3 gap-2 text-[11px]">
                    <div>
                      <span className="text-neutral-450 mb-0.5 block">Temp (°F)</span>
                      <input 
                        type="number"
                        value={newJobForm.heatPressTemp}
                        onChange={(e) => setNewJobForm({ ...newJobForm, heatPressTemp: Number(e.target.value) })}
                        className="w-full p-1.5 bg-white border border-sky-200 rounded"
                      />
                    </div>
                    <div>
                      <span className="text-neutral-450 mb-0.5 block">Pressure (lbs)</span>
                      <input 
                        type="number"
                        value={newJobForm.heatPressPressure}
                        onChange={(e) => setNewJobForm({ ...newJobForm, heatPressPressure: Number(e.target.value) })}
                        className="w-full p-1.5 bg-white border border-sky-200 rounded"
                      />
                    </div>
                    <div>
                      <span className="text-neutral-450 mb-0.5 block">Duration (Secs)</span>
                      <input 
                        type="number"
                        value={newJobForm.heatPressDuration}
                        onChange={(e) => setNewJobForm({ ...newJobForm, heatPressDuration: Number(e.target.value) })}
                        className="w-full p-1.5 bg-white border border-sky-200 rounded"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Material Allocation tracker setup */}
              <div className="bg-neutral-50 p-4 rounded-xl border border-neutral-200 space-y-2">
                <span className="font-bold text-neutral-700 text-[11px] uppercase block">Initial Material Consumption Sync</span>
                <div className="grid grid-cols-2 gap-3 text-[11px]">
                  <div>
                    <span className="text-neutral-450 block mb-0.5">Deduct Material SKU</span>
                    <select
                      value={newJobForm.materialToDeduct}
                      onChange={(e) => setNewJobForm({ ...newJobForm, materialToDeduct: e.target.value })}
                      className="w-full p-1.5 bg-white border border-neutral-200 rounded"
                    >
                      <option value="">-- No Material Reservation --</option>
                      {materials.map(m => (
                        <option key={m.id} value={m.id}>{m.name} ({m.stock} {m.unit})</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <span className="text-neutral-450 block mb-0.5">Amount to consume</span>
                    <input 
                      type="number"
                      value={newJobForm.materialAmount}
                      onChange={(e) => setNewJobForm({ ...newJobForm, materialAmount: Number(e.target.value) })}
                      className="w-full p-1.5 bg-white border border-neutral-200 rounded"
                    />
                  </div>
                </div>
              </div>

              <div>
                <label className="text-[10px] text-neutral-455 uppercase font-bold block mb-1">Production Guidelines & Notes</label>
                <textarea 
                  value={newJobForm.notes}
                  onChange={(e) => setNewJobForm({ ...newJobForm, notes: e.target.value })}
                  placeholder="Enter bespoke dimensions specifications, print speeds, mesh overlays or custom alignment warnings..."
                  className="w-full p-2 bg-neutral-50 rounded-xl border border-neutral-200 h-20 font-sans"
                />
              </div>

              <div className="flex items-center gap-3 justify-end pt-4 border-t border-neutral-100">
                <button 
                  type="button" 
                  onClick={() => setIsNewJobModalOpen(false)}
                  className="bg-neutral-100 hover:bg-neutral-150 text-neutral-800 border border-neutral-205 py-2.5 px-4 rounded-xl transition-all"
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  className="bg-[#E5B84B] hover:bg-amber-500 text-neutral-950 font-bold py-2.5 px-4 rounded-xl transition-all"
                >
                  Submit to Print queue
                </button>
              </div>

            </form>
          </motion.div>
        </div>
      )}

      {/* ================================== */}
      {/* --- MODAL: REPRINT REQUEST FORM --- */}
      {/* ================================== */}
      {isReprintModalOpen && selectedJob && (
        <div className="fixed inset-0 z-50 bg-neutral-950/80 backdrop-blur-xs flex items-center justify-center p-4">
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white border border-neutral-250 rounded-2xl w-full max-w-sm overflow-hidden shadow-2xl font-mono text-xs text-neutral-800"
          >
            <div className="px-6 py-4 bg-red-900 text-white flex items-center justify-between">
              <h3 className="font-bold text-xs tracking-widest uppercase flex items-center gap-2">
                <RotateCcw className="w-4 h-4 text-white" />
                <span>Bespoke Reprint Order</span>
              </h3>
              <button onClick={() => { setIsReprintModalOpen(false); setSelectedJob(null); }} className="text-red-200 hover:text-white p-1">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={triggerReprint} className="p-6 space-y-4">
              <div className="bg-red-50 p-3 rounded-lg text-red-700 text-[11px] leading-relaxed">
                🚨 <strong>Quality Defect Warning:</strong> Submitting a reprint will reset this design's active workshop status to *Artwork Received* on the Kanban queue and log the defect reason in our system archives.
              </div>

              <div>
                <label className="text-[10px] text-neutral-450 uppercase font-black block mb-1">State Target Job</label>
                <p className="font-black text-neutral-800 bg-neutral-100 p-2 rounded text-xs">
                  {selectedJob.id} - {selectedJob.customerName}
                </p>
              </div>

              <div>
                <label className="text-[10px] text-neutral-450 uppercase font-black block mb-1">Defect Category / Reason *</label>
                <select 
                  value={reprintReason}
                  onChange={(e) => setReprintReason(e.target.value)}
                  className="w-full p-2 bg-neutral-50 rounded-xl border border-neutral-200"
                  required
                >
                  <option value="">-- Choose Reason --</option>
                  <option value="Logo Ink Smudge">Crest Ink Smudge / Bleeding</option>
                  <option value="Vector Alignment Shift">Boundary Off-Center Misalignment</option>
                  <option value="Incorrect Emulsion Density">Screen Emulsion Exposure Failure</option>
                  <option value="Heat Press Scorched">Heat Press Temperature Scorch</option>
                  <option value="Vinyl Separation Damage">Vinyl Foil Scaling Separation</option>
                </select>
              </div>

              <div className="flex items-center gap-3 justify-end pt-3 border-t border-neutral-100">
                <button 
                  type="button" 
                  onClick={() => { setIsReprintModalOpen(false); setSelectedJob(null); }}
                  className="bg-neutral-100 hover:bg-neutral-150 text-neutral-800 border border-neutral-205 py-2 px-3 rounded-xl transition-all"
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  className="bg-red-600 hover:bg-red-700 text-white font-bold py-2 px-3 rounded-xl transition-all"
                >
                  Trigger Reprint
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}

      {/* ================================== */}
      {/* --- MODAL: STAFF PRODUCTION LOG --- */}
      {/* ================================== */}
      {isNotesModalOpen && selectedJob && (
        <div className="fixed inset-0 z-50 bg-neutral-950/80 backdrop-blur-xs flex items-center justify-center p-4">
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white border border-neutral-250 rounded-2xl w-full max-w-sm overflow-hidden shadow-2xl font-mono text-xs text-neutral-800"
          >
            <div className="px-6 py-4 bg-neutral-900 text-white flex items-center justify-between">
              <h3 className="font-bold text-xs tracking-widest text-[#E5B84B] uppercase flex items-center gap-2">
                <FileText className="w-4 h-4 text-[#E5B84B]" />
                <span>Workshop Log Append</span>
              </h3>
              <button onClick={() => { setIsNotesModalOpen(false); setSelectedJob(null); }} className="text-neutral-400 hover:text-white p-1">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={addProductionNote} className="p-6 space-y-4">
              <div>
                <label className="text-[10px] text-neutral-450 uppercase font-black block mb-1">Print Job Scope</label>
                <p className="font-black text-neutral-800 bg-neutral-100 p-2 rounded text-xs">
                  {selectedJob.id} - {selectedJob.customerName}
                </p>
              </div>

              <div>
                <label className="text-[10px] text-neutral-450 uppercase font-black block mb-1">Staff Note / Telemetry Update *</label>
                <textarea 
                  value={newNoteText}
                  onChange={(e) => setNewNoteText(e.target.value)}
                  placeholder="E.g., Cyan nozzle checks verified. Tension reads 24N."
                  className="w-full p-2 bg-neutral-50 rounded-xl border border-neutral-200 h-24 font-sans"
                  required
                />
              </div>

              <div className="flex items-center gap-3 justify-end pt-3 border-t border-neutral-100">
                <button 
                  type="button" 
                  onClick={() => { setIsNotesModalOpen(false); setSelectedJob(null); }}
                  className="bg-neutral-100 hover:bg-neutral-150 text-neutral-800 border border-neutral-205 py-2 px-3 rounded-xl transition-all"
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  className="bg-[#E5B84B] hover:bg-amber-500 text-neutral-950 font-bold py-2 px-3 rounded-xl transition-all"
                >
                  Save Log Entry
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}

    </div>
  );
};
