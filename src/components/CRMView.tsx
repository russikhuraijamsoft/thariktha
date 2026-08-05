import React, { useState, useEffect, useRef } from 'react';
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
  Users, 
  AlertTriangle, 
  CheckCircle2, 
  RefreshCw, 
  Tag, 
  SlidersHorizontal,
  ChevronRight,
  MapPin,
  Mail,
  Phone as PhoneIcon,
  Briefcase,
  FileText,
  UploadCloud,
  FileSpreadsheet,
  Award,
  Clock,
  Sparkles,
  Trophy,
  Filter,
  Activity,
  History,
  TrendingUp,
  CreditCard,
  UserCheck
} from 'lucide-react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  Tooltip, 
  ResponsiveContainer, 
  PieChart, 
  Pie, 
  Cell 
} from 'recharts';
import { db, isCloudConnected } from '../firebase';
import { UserProfile } from '../types/auth';

// --- STACKS & STRUCTS ---
export interface Player {
  name: string;
  jerseyNumber: string;
  jerseySize: string;
  pantsSize: string;
  notes: string;
}

export interface CRMActivityLog {
  id: string;
  type: string;
  message: string;
  timestamp: string;
  staffName: string;
}

export interface CRMCustomer {
  id: string;
  name: string;
  email: string;
  phone: string;
  address: string;
  gstDetails: string;
  type: 'individual' | 'team' | 'school';
  notes: string;
  branch: string;
  activeOrders: number;
  createdAt: string;
  updatedAt: string;
  activityLog?: CRMActivityLog[];
}

export interface CRMTeam {
  id: string;
  name: string;
  logo: string; // URL or Base64 data scheme
  coach: string;
  athletesCount: number;
  sponsor: string;
  preferredColors: string[];
  previousOrders: string[];
  customerId: string; // References CRMCustomer.id or general identifier
  players: Player[];
  branchId: string;
  createdAt: string;
  updatedAt: string;
}

interface CRMViewProps {
  branchScope: string;
  profile: UserProfile | null;
  customers: any[]; // App.tsx state reference
  setCustomers: React.Dispatch<React.SetStateAction<any[]>>;
}

// Ensure complete compliance with the Firestore error standard (firebase-integration skill)
enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
  }
}

function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: null,
      email: null,
      emailVerified: null,
    },
    operationType,
    path
  };
  console.error('Firestore CRM Module Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

// 8 mascot presets for cricket clubs to give immediate gorgeous visual results
const PRESET_MASCOTS = [
  { name: 'Royal Bengal Tigers', bg: '#F59E0B', text: '#000000', icon: '🐅' },
  { name: 'Golden Lions CC', bg: '#D97706', text: '#000000', icon: '🦁' },
  { name: 'Blue Lightning Speeds', bg: '#2563EB', text: '#FFFFFF', icon: '⚡' },
  { name: 'Green Hawks United', bg: '#16A34A', text: '#FFFFFF', icon: '🦅' },
  { name: 'Red Cranes Fortress', bg: '#DC2626', text: '#FFFFFF', icon: '🦩' },
  { name: 'Melbourne Cobras CC', bg: '#4B5563', text: '#F3F4F6', icon: '🐍' },
  { name: 'St John High Academy', bg: '#7C3AED', text: '#FFFFFF', icon: '🏫' },
  { name: 'Midnight Gladiators', bg: '#111827', text: '#E5B84B', icon: '⚔️' }
];

export function CRMView({ branchScope, profile, customers: appCustomers, setCustomers: setAppCustomers }: CRMViewProps) {
  // --- STATE SYSTEM ---
  const [customers, setLocalCustomers] = useState<CRMCustomer[]>([]);
  const [teams, setLocalTeams] = useState<CRMTeam[]>([]);
  const [selectedCustomerId, setSelectedCustomerId] = useState<string | null>(null);
  const [errorBanner, setErrorBanner] = useState<string | null>(null);
  const [activeSegmentTab, setActiveSegmentTab] = useState<'all' | 'individual' | 'team' | 'school'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [isSyncing, setIsSyncing] = useState(false);

  // Modals status
  const [isCustomerModalOpen, setIsCustomerModalOpen] = useState(false);
  const [isTeamModalOpen, setIsTeamModalOpen] = useState(false);
  const [isPlayerModalOpen, setIsPlayerModalOpen] = useState(false);

  // New Forms State
  const [newCustomerForm, setNewCustomerForm] = useState({
    name: '',
    email: '',
    phone: '',
    address: '',
    gstDetails: '',
    type: 'individual' as 'individual' | 'team' | 'school',
    notes: '',
    branch: branchScope || 'Melbourne'
  });

  const [newTeamForm, setNewTeamForm] = useState({
    name: '',
    coach: '',
    sponsor: '',
    preferredColors: ['#E5B84B', '#1E293B'], // Secondary / Primary Gold theme
    logo: PRESET_MASCOTS[0].icon + ' ' + PRESET_MASCOTS[0].name,
    athletesCount: 0
  });

  const [newPlayerForm, setNewPlayerForm] = useState({
    name: '',
    jerseyNumber: '',
    jerseySize: 'M',
    pantsSize: 'M',
    notes: ''
  });

  // drag and drop trigger
  const [isDragActive, setIsDragActive] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // --- BOOTSTRAP / FIRESTORE REALTIME SYNC ENGINE ---
  const fetchCustomersFromAzure = async () => {
    setIsSyncing(true);
    try {
      const response = await fetch('/api/customers');
      if (response.ok) {
        const fetched = await response.json();
        const mappedFetched = fetched.map((row: any) => ({
          id: row.id,
          name: row.name,
          email: row.email,
          phone: row.phone || 'N/A',
          address: row.address || 'N/A',
          gstDetails: row.gstDetails || 'Unregistered',
          type: row.type || (row.affiliation === 'Academy' ? 'school' : row.affiliation === 'Club Team' ? 'team' : 'individual'),
          notes: row.notes || 'No notes',
          branch: row.branch || row.branchId || 'Melbourne',
          activeOrders: row.activeOrders || 0,
          createdAt: row.createdAt || new Date().toISOString(),
          updatedAt: row.updatedAt || new Date().toISOString(),
          activityLog: row.activityLog || []
        }));

        setLocalCustomers(mappedFetched);
        // Synchronize with parent app's dropdown customer options
        const mappedForApp = mappedFetched.map((c: any) => ({
          id: c.id,
          name: c.name,
          email: c.email,
          phone: c.phone,
          affiliation: c.type === 'school' ? 'Academy' : c.type === 'team' ? 'Club Team' : 'Individual Athlete',
          activeOrders: c.activeOrders,
          branch: c.branch,
          address: c.address
        }));
        setAppCustomers(mappedForApp);
      } else {
        console.warn("REST Customers fetch failed, falling back to local cache.");
        loadLocalCacheFallback();
      }
    } catch (err) {
      console.error("Customers REST Fetch error:", err);
      loadLocalCacheFallback();
    } finally {
      setIsSyncing(false);
    }
  };

  useEffect(() => {
    fetchCustomersFromAzure();

    // Teams are kept in local storage fallback
    const cachedTeams = localStorage.getItem('erp_crm_teams');
    if (cachedTeams) {
      try {
        setLocalTeams(JSON.parse(cachedTeams));
      } catch (err) {
        setLocalTeams([]);
      }
    } else {
      setLocalTeams([]);
    }
  }, [branchScope]);

  // Seeding backup data to Firestore to guarantee smooth first interactions
  const seedInitialFirestoreData = async () => {
    const defaultData: CRMCustomer[] = [
      {
        id: "CUST-001",
        name: "Manipur Cricket Academy (Imphal)",
        email: "info@manipurcricketacademy.org.in",
        phone: "+91 385 244 1011",
        address: "Khuman Lampak Sports Complex, Imphal East, Manipur 795001",
        gstDetails: "GST-MNP995180",
        type: "school",
        notes: "Major academy representing junior and collegiate squads across Manipur.",
        branch: "Melbourne",
        activeOrders: 3,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        activityLog: [
          { id: 'act-1', type: 'Creation', message: 'Profile set up atomically', timestamp: new Date().toISOString(), staffName: 'System Bot' }
        ]
      },
      {
        id: "CUST-002",
        name: "Imphal Eastern Youth Sports Club",
        email: "info@imphaleasternclub.com",
        phone: "+91 385 244 2221",
        address: "Sajiwa Sports Arena, Imphal East, Manipur 795114",
        gstDetails: "GST-MNP882103",
        type: "team",
        notes: "Affiliated local club with senior and A-grade rosters.",
        branch: "Melbourne",
        activeOrders: 1,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        activityLog: [
          { id: 'act-1', type: 'Creation', message: 'Profile set up atomically', timestamp: new Date().toISOString(), staffName: 'System Bot' }
        ]
      },
      {
        id: "CUST-003",
        name: "Chungkham Singh (Refurb)",
        email: "chungkham@manipurathletics.org.in",
        phone: "+91 385 998 8111",
        address: "Singjamei Thokchom Leikai, Imphal West, Manipur 795008",
        gstDetails: "Personal Account",
        type: "individual",
        notes: "Premium level client representing elite bat configurations and sizing specifications.",
        branch: "Geelong",
        activeOrders: 1,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        activityLog: [
          { id: 'act-1', type: 'Creation', message: 'Profile set up atomically', timestamp: new Date().toISOString(), staffName: 'System Bot' }
        ]
      }
    ];

    const defaultTeams: CRMTeam[] = [
      {
        id: "TEAM-001",
        name: "Imphal Eastern Sports Division",
        logo: PRESET_MASCOTS[5].icon,
        coach: "Tomba Singh",
        athletesCount: 15,
        sponsor: "Manipur Sports Directorate",
        preferredColors: ["#1e293b", "#e5b84b", "#ffffff"],
        previousOrders: ["ORD-2026-9502"],
        customerId: "CUST-002",
        branchId: "Melbourne",
        players: [
          { name: "S. Ibomcha Singh", jerseyNumber: "13", jerseySize: "XL", pantsSize: "XL", notes: "Prefers wider sleeve cuffs on team kit" },
          { name: "Laishram Singh", jerseyNumber: "32", jerseySize: "L", pantsSize: "XL", notes: "Extra high collars" },
          { name: "N. Ranbir Singh", jerseyNumber: "30", jerseySize: "XL", pantsSize: "L", notes: "Pants custom length hem +5cm" }
        ],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      },
      {
        id: "TEAM-002",
        name: "MCA Colts Under-19",
        logo: PRESET_MASCOTS[6].icon,
        coach: "Biren Singh",
        athletesCount: 18,
        sponsor: "Imphal Municipal Council",
        preferredColors: ["#16a34a", "#f59e0b"],
        previousOrders: ["ORD-2026-9501"],
        customerId: "CUST-001",
        branchId: "Melbourne",
        players: [
          { name: "Nando Singh", jerseyNumber: "14", jerseySize: "M", pantsSize: "M", notes: "Wears standard sizing" },
          { name: "Kh. Gautam", jerseyNumber: "88", jerseySize: "S", pantsSize: "S", notes: "Sublimation name curve requested" }
        ],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      }
    ];

    try {
      for (const cust of defaultData) {
        await setDoc(doc(db, 'customers', cust.id), {
          ...cust,
          createdAt: Timestamp.fromDate(new Date(cust.createdAt)),
          updatedAt: Timestamp.fromDate(new Date(cust.updatedAt))
        });
      }
      for (const team of defaultTeams) {
        await setDoc(doc(db, 'teams', team.id), {
          ...team,
          createdAt: Timestamp.fromDate(new Date(team.createdAt)),
          updatedAt: Timestamp.fromDate(new Date(team.updatedAt))
        });
      }
      console.log("Firestore collection loaded with bootstrap values successfully");
    } catch (e) {
      console.error("Failed seeding database collections", e);
      // Fallback local cache
      setLocalCustomers(defaultData);
      setLocalTeams(defaultTeams);
    }
  };

  const loadLocalCacheFallback = () => {
    const cacheCustomers = localStorage.getItem('crm_local_customers');
    const cacheTeams = localStorage.getItem('crm_local_teams');

    const bootstrapC = [
      {
        id: "CUST-001",
        name: "Manipur Cricket Academy (Imphal)",
        email: "info@manipurcricketacademy.org.in",
        phone: "+91 385 244 1011",
        address: "Khuman Lampak Sports Complex, Imphal East, Manipur 795001",
        gstDetails: "GST-MNP995180",
        type: "school" as const,
        notes: "Major academy representing junior and collegiate squads across Manipur.",
        branch: branchScope || "Melbourne",
        activeOrders: 3,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        activityLog: [
          { id: 'act-1', type: 'Creation', message: 'Profile set up atomically', timestamp: new Date().toISOString(), staffName: 'System Handshake' }
        ]
      },
      {
        id: "CUST-002",
        name: "Imphal Eastern Youth Sports Club",
        email: "info@imphaleasternclub.com",
        phone: "+91 385 244 2221",
        address: "Sajiwa Sports Arena, Imphal East, Manipur 795114",
        gstDetails: "GST-MNP882103",
        type: "team" as const,
        notes: "Affiliated local club with senior and A-grade rosters.",
        branch: branchScope || "Melbourne",
        activeOrders: 1,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        activityLog: [
          { id: 'act-1', type: 'Creation', message: 'Profile set up atomically', timestamp: new Date().toISOString(), staffName: 'System Handshake' }
        ]
      }
    ];

    const bootstrapT = [
      {
        id: "TEAM-001",
        name: "Imphal Eastern Under-21",
        logo: "🐍",
        coach: "Tomba Singh",
        athletesCount: 15,
        sponsor: "Imphal Sports League",
        preferredColors: ["#1e293b", "#e5b84b"],
        previousOrders: ["ORD-2026-9502"],
        customerId: "CUST-002",
        branchId: branchScope || "Melbourne",
        players: [
          { name: "S. Ibomcha Singh", jerseyNumber: "13", jerseySize: "XL", pantsSize: "XL", notes: "Wider sleeve cuffs preferred" },
          { name: "Laishram Singh", jerseyNumber: "30", jerseySize: "XL", pantsSize: "L", notes: "Extra long trousers +5cm Custom" }
        ],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      }
    ];

    if (cacheCustomers && cacheTeams) {
      try {
        setLocalCustomers(JSON.parse(cacheCustomers));
        setLocalTeams(JSON.parse(cacheTeams));
      } catch (e) {
        console.error("Failed to parse cached CRM customers/teams:", e);
        setLocalCustomers(bootstrapC);
        setLocalTeams(bootstrapT);
      }
    } else {
      setLocalCustomers(bootstrapC);
      setLocalTeams(bootstrapT);
      saveToLocalCache(bootstrapC, bootstrapT);
    }
  };

  const saveToLocalCache = (cList: CRMCustomer[], tList: CRMTeam[]) => {
    localStorage.setItem('crm_local_customers', JSON.stringify(cList));
    localStorage.setItem('crm_local_teams', JSON.stringify(tList));
  };

  // --- ACTIONS SYSTEM ---

  // Helper to append action to current customer events stream (Pillar 11/Pillar 6)
  const logCustomerActivity = async (customerId: string, type: string, message: string) => {
    const staffLabel = profile?.name || 'Staff Representative';
    const newLogItem: CRMActivityLog = {
      id: `act-${Date.now()}`,
      type,
      message,
      timestamp: new Date().toISOString(),
      staffName: staffLabel
    };

    const targetCustomer = customers.find(c => c.id === customerId);
    if (!targetCustomer) return;

    const updatedLogs = [newLogItem, ...(targetCustomer.activityLog || [])].slice(0, 50); // limit to 50 entries
    
    try {
      const response = await fetch(`/api/customers/${customerId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...targetCustomer,
          activityLog: updatedLogs,
          updatedAt: new Date().toISOString()
        })
      });
      if (response.ok) {
        await fetchCustomersFromAzure();
      } else {
        const updatedList = customers.map(c => c.id === customerId ? { ...c, activityLog: updatedLogs, updatedAt: new Date().toISOString() } : c);
        setLocalCustomers(updatedList);
        saveToLocalCache(updatedList, teams);
      }
    } catch (err) {
      console.error("Failed logCustomerActivity:", err);
      const updatedList = customers.map(c => c.id === customerId ? { ...c, activityLog: updatedLogs, updatedAt: new Date().toISOString() } : c);
      setLocalCustomers(updatedList);
      saveToLocalCache(updatedList, teams);
    }
  };

  // 1. Create Customer
  const handleCreateCustomer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCustomerForm.name || !newCustomerForm.email) return;

    const newId = `CUST-${Math.floor(100 + Math.random() * 900)}`;
    const createdDateString = new Date().toISOString();
    
    const customerObj: CRMCustomer = {
      id: newId,
      name: newCustomerForm.name,
      email: newCustomerForm.email,
      phone: newCustomerForm.phone || 'N/A',
      address: newCustomerForm.address || 'N/A',
      gstDetails: newCustomerForm.gstDetails || 'Unregistered',
      type: newCustomerForm.type,
      notes: newCustomerForm.notes || 'No general summary entered',
      branch: newCustomerForm.branch,
      activeOrders: 0,
      createdAt: createdDateString,
      updatedAt: createdDateString,
      activityLog: [
        { id: `act-${Date.now()}`, type: 'Onboarding', message: `Customer profile onboarding initiated for ${newCustomerForm.name}`, timestamp: createdDateString, staffName: profile?.name || 'Authorized Staff' }
      ]
    };

    try {
      const response = await fetch('/api/customers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(customerObj)
      });
      if (response.ok) {
        await fetchCustomersFromAzure();
      } else {
        const updatedList = [customerObj, ...customers];
        setLocalCustomers(updatedList);
        saveToLocalCache(updatedList, teams);
      }
    } catch (err) {
      console.error("Error creating customer:", err);
      const updatedList = [customerObj, ...customers];
      setLocalCustomers(updatedList);
      saveToLocalCache(updatedList, teams);
    }

    // Reset Form
    setNewCustomerForm({
      name: '',
      email: '',
      phone: '',
      address: '',
      gstDetails: '',
      type: 'individual',
      notes: '',
      branch: branchScope || 'Melbourne'
    });
    setSelectedCustomerId(newId);
    setIsCustomerModalOpen(false);
  };

  // 2. Create Team under Customer
  const handleCreateTeam = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCustomerId || !newTeamForm.name) return;

    const newTeamId = `TEAM-${Math.floor(100 + Math.random() * 900)}`;
    const createdDate = new Date().toISOString();

    const teamObj: CRMTeam = {
      id: newTeamId,
      name: newTeamForm.name,
      logo: newTeamForm.logo,
      coach: newTeamForm.coach || 'N/A',
      athletesCount: 0,
      sponsor: newTeamForm.sponsor || 'None',
      preferredColors: newTeamForm.preferredColors,
      previousOrders: [],
      customerId: selectedCustomerId,
      players: [],
      branchId: branchScope || 'Melbourne',
      createdAt: createdDate,
      updatedAt: createdDate
    };

    if (isCloudConnected) {
      try {
        await setDoc(doc(db, 'teams', newTeamId), {
          ...teamObj,
          createdAt: Timestamp.now(),
          updatedAt: Timestamp.now()
        });
      } catch (err) {
        handleFirestoreError(err, OperationType.CREATE, `teams/${newTeamId}`);
      }
    } else {
      const updatedList = [teamObj, ...teams];
      setLocalTeams(updatedList);
      saveToLocalCache(customers, updatedList);
    }

    logCustomerActivity(selectedCustomerId, 'Team Registration', `Added cricket team squad '${newTeamForm.name}' to the portfolio.`);

    // Reset config
    setNewTeamForm({
      name: '',
      coach: '',
      sponsor: '',
      preferredColors: ['#E5B84B', '#1E293B'],
      logo: PRESET_MASCOTS[1].icon + ' ' + PRESET_MASCOTS[1].name,
      athletesCount: 0
    });
    setIsTeamModalOpen(false);
  };

  // 3. Player Lineup Addition (Player Management)
  const handleAddPlayer = async (teamId: string) => {
    if (!newPlayerForm.name || !newPlayerForm.jerseyNumber) return;

    const targetTeam = teams.find(t => t.id === teamId);
    if (!targetTeam) return;

    const playerObj: Player = {
      name: newPlayerForm.name,
      jerseyNumber: newPlayerForm.jerseyNumber,
      jerseySize: newPlayerForm.jerseySize,
      pantsSize: newPlayerForm.pantsSize,
      notes: newPlayerForm.notes || 'None'
    };

    const updatedPlayers = [...(targetTeam.players || []), playerObj];
    const updatedAthletesCount = updatedPlayers.length;

    if (isCloudConnected) {
      try {
        await updateDoc(doc(db, 'teams', teamId), {
          players: updatedPlayers,
          athletesCount: updatedAthletesCount,
          updatedAt: Timestamp.now()
        });
      } catch (err) {
        handleFirestoreError(err, OperationType.UPDATE, `teams/${teamId}`);
      }
    } else {
      const updatedList = teams.map(t => t.id === teamId ? { ...t, players: updatedPlayers, athletesCount: updatedAthletesCount, updatedAt: new Date().toISOString() } : t);
      setLocalTeams(updatedList);
      saveToLocalCache(customers, updatedList);
    }

    if (targetTeam.customerId) {
      logCustomerActivity(targetTeam.customerId, 'Athlete Roster', `Added athlete ${newPlayerForm.name} (Jersey #${newPlayerForm.jerseyNumber}) to team '${targetTeam.name}'`);
    }

    // Reset Player insertion Form
    setNewPlayerForm({
      name: '',
      jerseyNumber: '',
      jerseySize: 'M',
      pantsSize: 'M',
      notes: ''
    });
    setIsPlayerModalOpen(false);
  };

  // 4. Remove Player Roster
  const handleRemovePlayer = async (teamId: string, playerIndex: number) => {
    const targetTeam = teams.find(t => t.id === teamId);
    if (!targetTeam) return;

    const playerToRemove = targetTeam.players[playerIndex];
    const updatedPlayers = targetTeam.players.filter((_, idx) => idx !== playerIndex);
    const updatedAthletesCount = updatedPlayers.length;

    if (isCloudConnected) {
      try {
        await updateDoc(doc(db, 'teams', teamId), {
          players: updatedPlayers,
          athletesCount: updatedAthletesCount,
          updatedAt: Timestamp.now()
        });
      } catch (err) {
        handleFirestoreError(err, OperationType.UPDATE, `teams/${teamId}`);
      }
    } else {
      const updatedList = teams.map(t => t.id === teamId ? { ...t, players: updatedPlayers, athletesCount: updatedAthletesCount, updatedAt: new Date().toISOString() } : t);
      setLocalTeams(updatedList);
      saveToLocalCache(customers, updatedList);
    }

    if (targetTeam.customerId && playerToRemove) {
      logCustomerActivity(targetTeam.customerId, 'Athlete Roster', `De-registered athlete ${playerToRemove.name} (Jersey #${playerToRemove.jerseyNumber}) from squad '${targetTeam.name}'`);
    }
  };

  // 5. Delete Customer
  const handleDeleteCustomer = async (id: string) => {
    if (profile?.roleId !== 'super_admin' && profile?.roleId !== 'manager') {
      alert("Security Violation: You must be a Super Admin or Branch Manager to delete registered ERP customer documents.");
      return;
    }

    if (!confirm("Are you absolutely sure you want to delete this customer record and all related operations logs?")) {
      return;
    }

    try {
      const response = await fetch(`/api/customers/${id}`, {
        method: 'DELETE'
      });
      if (response.ok) {
        await fetchCustomersFromAzure();
      } else {
        const updatedList = customers.filter(c => c.id !== id);
        setLocalCustomers(updatedList);
        saveToLocalCache(updatedList, teams);
      }
    } catch (err) {
      console.error("Failed to delete customer:", err);
      const updatedList = customers.filter(c => c.id !== id);
      setLocalCustomers(updatedList);
      saveToLocalCache(updatedList, teams);
    }

    if (selectedCustomerId === id) {
      setSelectedCustomerId(null);
    }
  };

  // 6. Delete Team
  const handleDeleteTeam = async (teamId: string) => {
    if (profile?.roleId !== 'super_admin' && profile?.roleId !== 'manager') {
      alert("Unauthorized: Deleting sport squads is limited to managerial staff.");
      return;
    }

    const targetTeam = teams.find(t => t.id === teamId);
    if (!targetTeam) return;

    if (!confirm(`Remove the team roster ${targetTeam.name}?`)) {
      return;
    }

    if (isCloudConnected) {
      try {
        await deleteDoc(doc(db, 'teams', teamId));
      } catch (err) {
        handleFirestoreError(err, OperationType.DELETE, `teams/${teamId}`);
      }
    } else {
      const updatedList = teams.filter(t => t.id !== teamId);
      setLocalTeams(updatedList);
      saveToLocalCache(customers, updatedList);
    }

    if (targetTeam.customerId) {
      logCustomerActivity(targetTeam.customerId, 'Team Removal', `Unpaired team roster and deleted team record '${targetTeam.name}'`);
    }
  };

  // 7. DRAG AND DROP / FILE SELECT LOGO SIMULATOR
  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setIsDragActive(true);
    } else if (e.type === "dragleave") {
      setIsDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleUploadedFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      handleUploadedFile(e.target.files[0]);
    }
  };

  const handleUploadedFile = (file: File) => {
    const reader = new FileReader();
    reader.onload = (event) => {
      if (event.target?.result) {
        const logoBase64 = event.target.result as string;
        setNewTeamForm(prev => ({ ...prev, logo: logoBase64 }));
      }
    };
    reader.readAsDataURL(file);
  };

  const onButtonClick = () => {
    fileInputRef.current?.click();
  };

  // --- ANALYTICAL COMPUTATIONS WITH RECHARTS ---
  const activeCustomer = customers.find(c => c.id === selectedCustomerId);
  const activeCustomerTeams = teams.filter(t => t.customerId === selectedCustomerId);

  // Computing Jersey Size distribution matrices dynamically from rosters
  const getJerseySizeMetrics = () => {
    const result: Record<string, number> = { 'S': 0, 'M': 0, 'L': 0, 'XL': 0, 'XXL': 0 };
    
    // Accumulate size preference counts from active team rosters or athletes
    activeCustomerTeams.forEach(t => {
      t.players.forEach(p => {
        const sizeKey = p.jerseySize?.toUpperCase() || 'M';
        if (sizeKey in result) {
          result[sizeKey]++;
        } else {
          result[sizeKey] = (result[sizeKey] || 0) + 1;
        }
      });
    });

    return Object.entries(result).map(([size, count]) => ({
      name: `Size ${size}`,
      Count: count
    }));
  };

  // Pie chart computations for customer segments
  const getSegmentMetrics = () => {
    const typesCount = {
      individual: customers.filter(c => c.type === 'individual').length,
      team: customers.filter(c => c.type === 'team').length,
      school: customers.filter(c => c.type === 'school').length,
    };

    return [
      { name: 'Individuals', value: typesCount.individual, color: '#D97706' }, // Gold light
      { name: 'Club Teams', value: typesCount.team, color: '#2563EB' },       // Vibrant Blue
      { name: 'Schools/Labs', value: typesCount.school, color: '#16A34A' }     // Emerald
    ];
  };

  // Unified Search and Filter system
  const filteredCustomers = customers.filter(c => {
    // 1. Segment filter selection
    if (activeSegmentTab !== 'all' && c.type !== activeSegmentTab) {
      return false;
    }
    // 2. Text Search Query matching on customer fields
    const queryTerm = searchQuery.toLowerCase();
    if (!queryTerm) return true;

    return (
      c.name.toLowerCase().includes(queryTerm) ||
      c.email.toLowerCase().includes(queryTerm) ||
      c.phone.toLowerCase().includes(queryTerm) ||
      c.address.toLowerCase().includes(queryTerm) ||
      (c.gstDetails && c.gstDetails.toLowerCase().includes(queryTerm)) ||
      (c.notes && c.notes.toLowerCase().includes(queryTerm))
    );
  });

  const totalAthletesManaged = teams.reduce((acc, t) => acc + (t.players?.length || 0), 0);

  return (
    <div className="bg-slate-50 text-slate-800 p-6 rounded-3xl border border-slate-200 shadow-md font-sans space-y-6" id="crm-framework">
      
      {/* 1. BRAND AND CORE SUMMARY STATS HEADER */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 rounded-2xl p-6 text-white border border-slate-800 flex flex-col md:flex-row items-start md:items-center justify-between gap-6 relative overflow-hidden">
        <div className="absolute right-0 top-0 w-64 h-64 bg-amber-500/5 rounded-full blur-3xl pointer-events-none" />
        <div className="space-y-1 relative">
          <div className="flex items-center gap-2">
            <span className="p-1 px-2.5 bg-[#E5B84B]/20 text-[#E5B84B] border border-[#E5B84B]/30 font-bold font-mono text-[10px] rounded uppercase tracking-wider">
              CRM Workspace Hub
            </span>
            <div className="flex items-center gap-1 text-[11px] text-slate-300 font-mono">
              <span className={`w-2 h-2 rounded-full ${isCloudConnected ? 'bg-emerald-500' : 'bg-amber-500'} animate-pulse`} />
              <span>{isCloudConnected ? 'Cloud Production Active' : 'Offline Local Cache'}</span>
            </div>
          </div>
          <h2 className="text-xl font-bold font-mono text-white tracking-wider uppercase">
            Talk of the Town Cricket Closet CRM
          </h2>
          <p className="text-xs text-slate-400 font-mono">
            Roster logistics, sponsor vectors, team jerseys configurations, and verified GST business registers.
          </p>
        </div>

        <div className="flex gap-2">
          <button 
            onClick={() => setIsCustomerModalOpen(true)}
            className="bg-[#E5B84B] hover:bg-amber-500 text-slate-950 font-mono py-2.5 px-4 rounded-xl text-xs font-bold uppercase transition-all duration-200 active:scale-95 flex items-center gap-2 shadow-lg shadow-amber-500/10 shrink-0"
            id="register-customer-trigger"
          >
            <Plus className="w-4 h-4 stroke-[3]" />
            <span>Onboard Customer</span>
          </button>
        </div>
      </div>

      {errorBanner && (
        <div className="bg-rose-50 border border-rose-200 rounded-xl p-3 text-xs text-rose-700 flex items-center gap-2 font-mono">
          <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
          <span>{errorBanner}</span>
        </div>
      )}

      {/* 2. REALTIME CRM ANALYTICS WIDGETS */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4" id="crm-dashboard-widgets">
        
        {/* Total Managed Profiles */}
        <div className="bg-white border border-slate-200 p-4.5 rounded-2xl flex items-center justify-between shadow-xs">
          <div className="space-y-1">
            <span className="text-[10px] text-slate-400 uppercase font-mono font-bold block">Profiles Directory</span>
            <span className="text-3xl font-black font-mono text-slate-900">{customers.length}</span>
            <div className="text-[10px] text-slate-500 flex items-center gap-1">
              <span className="text-emerald-500 font-bold">100% verified</span>
              <span>across branch closets</span>
            </div>
          </div>
          <div className="p-3 bg-slate-100 rounded-xl text-slate-600">
            <Users className="w-6 h-6 stroke-[1.8]" />
          </div>
        </div>

        {/* Total Roster Athletes Sized */}
        <div className="bg-white border border-slate-200 p-4.5 rounded-2xl flex items-center justify-between shadow-xs">
          <div className="space-y-1">
            <span className="text-[10px] text-slate-400 uppercase font-mono font-bold block">Sized Athletes Roster</span>
            <span className="text-3xl font-black font-mono text-[#E5B84B]">{totalAthletesManaged}</span>
            <div className="text-[10px] text-slate-500">Active roster players in lineup</div>
          </div>
          <div className="p-3 bg-amber-50 rounded-xl text-[#E5B84B]">
            <Trophy className="w-6 h-6 stroke-[1.8]" />
          </div>
        </div>

        {/* Segment allocation Pie distribution summary */}
        <div className="bg-white border border-slate-200 p-3 rounded-2xl md:col-span-1 shadow-xs flex items-center justify-between gap-2">
          <div className="w-1/3 text-left pl-1">
            <span className="text-[9px] text-slate-400 uppercase font-mono font-bold block">Type Splits</span>
            <div className="space-y-1 mt-1 text-[10px] font-mono font-semibold">
              <div className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-amber-600" />Indiv: {customers.filter(c => c.type === 'individual').length}</div>
              <div className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-blue-600" />Teams: {customers.filter(c => c.type === 'team').length}</div>
              <div className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-green-600" />School: {customers.filter(c => c.type === 'school').length}</div>
            </div>
          </div>
          <div className="w-2/3 h-[75px] relative">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={getSegmentMetrics()}
                  cx="50%"
                  cy="50%"
                  innerRadius={18}
                  outerRadius={30}
                  paddingAngle={3}
                  dataKey="value"
                >
                  {getSegmentMetrics().map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip formatter={(value) => [`${value} Accounts`, 'Percentage']} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Active Corporate Sponsors */}
        <div className="bg-white border border-slate-200 p-4.5 rounded-2xl flex items-center justify-between shadow-xs">
          <div className="space-y-1">
            <span className="text-[10px] text-slate-400 uppercase font-mono font-bold block">Monitored Squads</span>
            <span className="text-3xl font-black font-mono text-slate-900">{teams.length}</span>
            <div className="text-[10px] text-slate-500 overflow-hidden text-ellipsis whitespace-nowrap">
              Sponsor jerseys & mascots logs
            </div>
          </div>
          <div className="p-3 bg-slate-100 rounded-xl text-slate-600">
            <Award className="w-6 h-6 stroke-[1.8]" />
          </div>
        </div>

      </div>

      {/* 3. SEARCH AND FILTERS PANEL */}
      <div className="bg-white border border-slate-200 p-4 rounded-2xl space-y-3.5 shadow-xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          
          {/* Tabs categorization */}
          <div className="flex flex-wrap gap-1 bg-slate-100 p-1 rounded-xl self-start">
            <button 
              onClick={() => setActiveSegmentTab('all')}
              className={`p-1.5 px-3.5 rounded-lg text-xs font-mono font-extrabold uppercase transition-all ${activeSegmentTab === 'all' ? 'bg-slate-900 text-white shadow-xs' : 'text-slate-500 hover:text-slate-800'}`}
            >
              All Customer Classifications
            </button>
            <button 
              onClick={() => setActiveSegmentTab('individual')}
              className={`p-1.5 px-3.5 rounded-lg text-xs font-mono font-extrabold uppercase transition-all flex items-center gap-1.5 ${activeSegmentTab === 'individual' ? 'bg-amber-600 text-white shadow-xs' : 'text-slate-500 hover:text-slate-800'}`}
            >
              <div className="w-1.5 h-1.5 rounded-full bg-yellow-400" />
              Individuals
            </button>
            <button 
              onClick={() => setActiveSegmentTab('team')}
              className={`p-1.5 px-3.5 rounded-lg text-xs font-mono font-extrabold uppercase transition-all flex items-center gap-1.5 ${activeSegmentTab === 'team' ? 'bg-blue-600 text-white shadow-xs' : 'text-slate-500 hover:text-slate-800'}`}
            >
              <div className="w-1.5 h-1.5 rounded-full bg-blue-400" />
              Club Teams
            </button>
            <button 
              onClick={() => setActiveSegmentTab('school')}
              className={`p-1.5 px-3.5 rounded-lg text-xs font-mono font-extrabold uppercase transition-all flex items-center gap-1.5 ${activeSegmentTab === 'school' ? 'bg-green-600 text-white shadow-xs' : 'text-slate-500 hover:text-slate-800'}`}
            >
              <div className="w-1.5 h-1.5 rounded-full bg-green-400" />
              Schools / Academies
            </button>
          </div>

          {/* Search bar input */}
          <div className="relative flex-1 max-w-md w-full">
            <Search className="absolute left-3.5 top-2.5 w-4 h-4 text-slate-400 shrink-0" />
            <input 
              type="text" 
              placeholder="Search by name, phone, email, notes, GST number..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 hover:border-slate-300 focus:border-[#E5B84B] rounded-xl pl-10 pr-4 py-2 text-xs font-mono focus:outline-none transition-all"
            />
          </div>
        </div>
      </div>

      {/* 4. CRM CORE SYSTEM SPLITS (List on Left, Dynamic Inspected Profile on Right) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6" id="crm-core-layout">
        
        {/* LEFT COLUMN: Customer Profiles List */}
        <div className="lg:col-span-5 space-y-3.5">
          <div className="flex items-center justify-between px-1">
            <span className="text-[11px] font-mono font-bold text-slate-400 uppercase tracking-widest">
              Profiles Matches ({filteredCustomers.length})
            </span>
            <div className="flex items-center gap-1 bg-slate-200 font-mono text-[9px] font-bold uppercase rounded-lg px-2 py-1 text-slate-600">
              <Filter className="w-3" />
              <span>Scope: {branchScope || 'All'}</span>
            </div>
          </div>

          <div className="space-y-3 max-h-[640px] overflow-y-auto pr-1" id="profiles-list-scrollable">
            {filteredCustomers.length === 0 ? (
              <div className="bg-white border border-slate-100 rounded-2xl p-8 text-center space-y-2 text-slate-400 shadow-xs">
                <p className="text-sm font-mono italic">No customer profiles match that criteria.</p>
                <p className="text-[11px]">Type something else or add a new customer database record.</p>
              </div>
            ) : (
              filteredCustomers.map(cust => {
                const isSelected = cust.id === selectedCustomerId;
                const custTeams = teams.filter(t => t.customerId === cust.id);
                return (
                  <div 
                    key={cust.id} 
                    onClick={() => setSelectedCustomerId(cust.id)}
                    className={`bg-white border transition-all duration-150 p-4 rounded-xl cursor-pointer text-left space-y-3 shadow-xs hover:border-amber-300 ${isSelected ? 'border-[#E5B84B] ring-2 ring-amber-100' : 'border-slate-200'}`}
                  >
                    <div className="flex items-start justify-between gap-3 font-mono">
                      <div className="space-y-0.5">
                        <div className="flex items-center gap-1.5">
                          <span className={`text-[9px] font-black px-2 py-0.5 rounded uppercase ${
                            cust.type === 'school' ? 'bg-green-100 text-green-700' : 
                            cust.type === 'team' ? 'bg-blue-100 text-blue-700' : 'bg-amber-100 text-amber-700'
                          }`}>
                            {cust.type === 'school' ? 'School / Lab' : cust.type === 'team' ? 'Team Cadet' : 'Individual'}
                          </span>
                          <span className="text-[10px] text-slate-500 font-bold">Ref: {cust.id}</span>
                        </div>
                        <h4 className="font-bold text-slate-900 text-sm mt-1">{cust.name}</h4>
                      </div>
                      <div className="text-right text-[10px]">
                        <span className="text-slate-400 block font-bold uppercase">Physical Locker</span>
                        <span className="text-slate-800 font-bold">{cust.branch}</span>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-[10px] font-mono text-slate-500 pb-2.5 border-b border-slate-100">
                      <div className="truncate">
                        <span className="text-slate-400 block text-[9px] uppercase">GST Details</span>
                        <span className="text-slate-800 font-semibold">{cust.gstDetails || 'None'}</span>
                      </div>
                      <div className="truncate">
                        <span className="text-slate-400 block text-[9px] uppercase">Registered Athletes</span>
                        <span className="text-slate-800 font-semibold">{custTeams.reduce((t_acc, tm) => t_acc + (tm.players?.length || 0), 0)} players</span>
                      </div>
                    </div>

                    <div className="flex items-center justify-between text-[11px] font-mono text-slate-500">
                      <div className="flex items-center gap-1 text-slate-500 truncate max-w-[200px]" title={cust.address}>
                        <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        <span className="truncate">{cust.address}</span>
                      </div>
                      <span className="text-[10px] bg-slate-100 text-slate-600 font-extrabold rounded-md p-1 px-2 shrink-0">
                        Teams: {custTeams.length}
                      </span>
                    </div>

                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* RIGHT COLUMN: Customer Profile Full Inspector (CRM Dashboard Dynamic Panels) */}
        <div className="lg:col-span-7">
          <AnimatePresence mode="wait">
            {!activeCustomer ? (
              <motion.div 
                key="empty-inspector"
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="bg-white border border-slate-200 text-center rounded-2xl p-16 space-y-4 shadow-xs flex flex-col items-center justify-center min-h-[500px]"
              >
                <div className="p-4 bg-slate-50 rounded-full text-[#E5B84B] animate-bounce">
                  <UserCheck className="w-10 h-10 stroke-[1.5]" />
                </div>
                <div className="space-y-1.5 max-w-sm">
                  <h4 className="text-base font-bold text-slate-900 font-mono uppercase tracking-wide">No Athlete or Club Selected</h4>
                  <p className="text-xs text-slate-400 font-mono">
                    Select a customer folder from the leftmost profile list to coordinate players, sponsor designs, GST verification timelines, and order ledger history.
                  </p>
                </div>
              </motion.div>
            ) : (
              <motion.div 
                key={activeCustomer.id}
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs text-left space-y-6"
              >
                {/* Visual Header of Selected Customer File */}
                <div className="flex items-start justify-between border-b border-slate-100 pb-5 gap-4">
                  <div className="space-y-1.5">
                    <div className="flex items-center gap-2">
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded uppercase tracking-wider ${
                        activeCustomer.type === 'school' ? 'bg-green-100 text-green-700' : 
                        activeCustomer.type === 'team' ? 'bg-blue-100 text-blue-700' : 'bg-amber-100 text-amber-700'
                      }`}>
                        {activeCustomer.type === 'school' ? 'Academy Team' : activeCustomer.type === 'team' ? 'Club League Team' : 'Individual Client'}
                      </span>
                      <span className="text-xs font-mono font-bold text-slate-400">Sequence No: {activeCustomer.id}</span>
                    </div>
                    <h3 className="text-xl font-bold text-slate-900 font-mono uppercase tracking-wide">
                      {activeCustomer.name}
                    </h3>
                    <p className="text-xs text-slate-500 font-mono leading-relaxed max-w-xl">
                      {activeCustomer.notes}
                    </p>
                  </div>

                  <div className="flex items-center gap-1.5">
                    <button 
                      onClick={() => {
                        window.scrollTo({ top: 300, behavior: 'smooth' });
                        setIsTeamModalOpen(true);
                      }}
                      className="bg-slate-900 hover:bg-slate-800 text-white font-mono py-1.5 px-3 rounded-lg text-[10px] font-black uppercase transition-all duration-150 flex items-center gap-1 shrink-0"
                    >
                      <Plus className="w-3.5 h-3.5 stroke-[3]" />
                      <span>Create Team</span>
                    </button>
                    {(profile?.roleId === 'super_admin' || profile?.roleId === 'manager') && (
                      <button 
                        onClick={() => handleDeleteCustomer(activeCustomer.id)}
                        className="p-2 border border-slate-100 rounded-lg hover:bg-rose-50 hover:text-rose-600 text-slate-400 transition-all duration-150 shrink-0"
                        title="Delete customer permanently"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>

                {/* Sub grids containing profile core structures */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  
                  {/* Left contact & registration metrics cards */}
                  <div className="space-y-4">
                    <h4 className="text-xs font-black font-mono text-slate-400 uppercase tracking-widest border-l-3 border-[#E5B84B] pl-2">
                      Customer Profile Credentials
                    </h4>
                    
                    <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 space-y-3 font-mono text-xs">
                      
                      <div className="flex items-start gap-2.5">
                        <Mail className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
                        <div>
                          <span className="text-[9px] text-slate-400 block">VERIFIED PWA EMAIL</span>
                          <span className="text-slate-800 font-medium font-mono select-all bg-white p-0.5 px-1 rounded border border-slate-200/50">{activeCustomer.email}</span>
                        </div>
                      </div>

                      <div className="flex items-start gap-2.5">
                        <PhoneIcon className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
                        <div>
                          <span className="text-[9px] text-slate-400 block">COMMUNICATIONS TELEPHONE</span>
                          <span className="text-slate-800 font-medium font-mono select-all bg-white p-0.5 px-1 rounded border border-slate-200/50">{activeCustomer.phone}</span>
                        </div>
                      </div>

                      <div className="flex items-start gap-2.5">
                        <MapPin className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
                        <div>
                          <span className="text-[9px] text-slate-400 block">PHYSICAL DELIVERY ADDRESS</span>
                          <span className="text-slate-800 font-medium">{activeCustomer.address}</span>
                        </div>
                      </div>

                      <div className="flex items-start gap-2.5">
                        <Briefcase className="w-4 h-4 text-[#E5B84B] shrink-0 mt-0.5" />
                        <div>
                          <span className="text-[9px] text-[#E5B84B] block font-extrabold uppercase">GST BUSINESS CLASSIFICATION</span>
                          <span className="text-slate-700 font-bold bg-[#E5B84B]/10 p-0.5 px-1.5 rounded">{activeCustomer.gstDetails || "Not registered"}</span>
                        </div>
                      </div>

                    </div>
                  </div>

                  {/* Right sizing dashboard charts representation */}
                  <div className="space-y-4">
                    <h4 className="text-xs font-black font-mono text-slate-400 uppercase tracking-widest border-l-3 border-slate-800 pl-2">
                      Jersey Sizing Distribution
                    </h4>

                    {getJerseySizeMetrics().every(v => v.Count === 0) ? (
                      <div className="bg-slate-50 border border-slate-100 rounded-xl p-8 text-center text-slate-450 text-[11px] font-mono flex flex-col items-center justify-center min-h-[140px]">
                        <Activity className="w-6 h-6 text-slate-300 stroke-[1.5] mb-2" />
                        <span>No sized athletes registered under this profile yet.</span>
                        <span className="text-[10px] text-slate-400 mt-0.5">Add athletes to linked teams to populate sizing distributions chart.</span>
                      </div>
                    ) : (
                      <div className="bg-slate-50 p-3 rounded-xl border border-slate-100 h-[190px]">
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart data={getJerseySizeMetrics()}>
                            <XAxis dataKey="name" stroke="#94a3b8" fontSize={9} tickLine={false} />
                            <YAxis stroke="#94a3b8" fontSize={9} tickLine={false} allowDecimals={false} />
                            <Tooltip cursor={{ fill: 'rgba(229,184,75,0.05)' }} />
                            <Bar dataKey="Count" fill="#E5B84B" radius={[4, 4, 0, 0]} />
                          </BarChart>
                        </ResponsiveContainer>
                      </div>
                    )}
                  </div>

                </div>

                {/* 5. LINKED SQUADS AND TEAMS (Team feature section / Players section) */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                    <h4 className="text-xs font-black font-mono text-slate-800 uppercase tracking-widest">
                      Administered Sport Lineups ({activeCustomerTeams.length})
                    </h4>
                    <span className="text-[10px] font-mono text-slate-400">Select any team folder below to manage athletes</span>
                  </div>

                  {activeCustomerTeams.length === 0 ? (
                    <div className="bg-slate-50 rounded-xl p-8 text-center text-slate-400 border border-dashed border-slate-200">
                      <p className="text-xs font-mono font-bold uppercase">No Teams Associated</p>
                      <p className="text-[11px] font-mono mt-1 mb-4">You can set up custom playing squads, club jerseys configurations, and athletic rosters under this profile.</p>
                      <button 
                        onClick={() => setIsTeamModalOpen(true)}
                        className="bg-slate-900 text-white hover:bg-slate-800 p-2 px-4 rounded-xl text-xs font-bold uppercase font-mono tracking-wide"
                      >
                        Create First Team Squad
                      </button>
                    </div>
                  ) : (
                    <div className="space-y-6">
                      {activeCustomerTeams.map(team => (
                        <div key={team.id} className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-xs">
                          
                          {/* SQUAD BANNER HUB */}
                          <div className="bg-slate-900 text-white p-4.5 flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800">
                            <div className="flex items-center gap-3">
                              <span className="w-10 h-10 bg-slate-800 rounded-xl flex items-center justify-center text-xl shadow-inner border border-slate-700">
                                {team.logo && team.logo.length > 5 ? (
                                  <img 
                                    src={team.logo} 
                                    alt="Club Mascot" 
                                    className="w-full h-full object-cover rounded-xl"
                                    referrerPolicy="no-referrer"
                                  />
                                ) : (
                                  <span>{team.logo || '🏏'}</span>
                                )}
                              </span>
                              <div className="space-y-0.5 text-left">
                                <h5 className="font-bold font-mono text-sm tracking-wide text-white">{team.name}</h5>
                                <p className="text-[10px] text-slate-400 font-mono">
                                  Coach: <strong className="text-slate-200">{team.coach || 'Dave Hussey'}</strong> • Registered Athletes: <strong className="text-[#E5B84B]">{team.players?.length || 0}</strong>
                                </p>
                              </div>
                            </div>

                            <div className="flex items-center gap-1.5 self-end md:self-auto font-mono text-[10px]">
                              <button 
                                onClick={() => {
                                  setNewPlayerForm({
                                    name: '',
                                    jerseyNumber: '',
                                    jerseySize: 'M',
                                    pantsSize: 'M',
                                    notes: ''
                                  });
                                  setIsPlayerModalOpen(true);
                                }}
                                className="bg-[#E5B84B] hover:bg-amber-500 text-slate-950 px-3 py-1.5 font-bold uppercase rounded-lg transition-all"
                              >
                                + Add Athlete
                              </button>
                              <button 
                                onClick={() => handleDeleteTeam(team.id)}
                                className="bg-slate-800 hover:bg-rose-950 text-slate-400 hover:text-rose-400 p-1.5 border border-slate-700 rounded-lg transition-all"
                                title="Remove team"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>

                          {/* SPONSOR & SQUAD BRAND INFORMATION */}
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 bg-slate-50 border-b border-slate-250 font-mono text-[11px] text-slate-600">
                            <div>
                              <span className="text-slate-400 block text-[9px] uppercase font-bold">Registered Sponsor Info</span>
                              <strong className="text-slate-800">{team.sponsor || 'Self Sponsored / Individual'}</strong>
                            </div>
                            <div>
                              <span className="text-slate-400 block text-[9px] uppercase font-bold">Team Design Colors</span>
                              <div className="flex items-center gap-1.5 mt-1">
                                {team.preferredColors && team.preferredColors.map((col, idx) => (
                                  <div key={idx} className="flex items-center gap-1 bg-white border border-slate-200 rounded p-0.5 px-1.5">
                                    <span className="w-2.5 h-2.5 rounded-full border border-slate-350" style={{ backgroundColor: col }} />
                                    <span className="text-[8px] text-slate-500">{col}</span>
                                  </div>
                                ))}
                              </div>
                            </div>
                            <div>
                              <span className="text-slate-400 block text-[9px] uppercase font-bold">Previous Jersey Orders</span>
                              <div className="flex flex-wrap gap-1 mt-1">
                                {team.previousOrders && team.previousOrders.length > 0 ? (
                                  team.previousOrders.map((ord, idx) => (
                                    <span key={idx} className="bg-slate-200 border border-slate-300 text-slate-700 p-0.5 px-2 rounded font-black font-mono text-[8px]">{ord}</span>
                                  ))
                                ) : (
                                  <span className="text-slate-400 italic">No historical orders logged</span>
                                )}
                              </div>
                            </div>
                          </div>

                          {/* SQUAD PLAYERS ROSTER (Player Management) */}
                          <div className="p-4 bg-white">
                            <span className="text-[10px] uppercase font-mono font-bold text-slate-450 block mb-2 text-left">
                              Active Playing Squad Roster ({team.players?.length || 0} Registered Lineups)
                            </span>

                            {(!team.players || team.players.length === 0) ? (
                              <p className="text-xs text-slate-400 italic font-mono p-4 text-center bg-slate-50 rounded-lg">
                                No athlete profiles in this roster. Click "+ Add Athlete" to register playing jerseys & pants measurements.
                              </p>
                            ) : (
                              <div className="overflow-x-auto rounded-xl border border-slate-100">
                                <table className="w-full text-left font-mono text-xs border-collapse">
                                  <thead>
                                    <tr className="bg-slate-50 text-slate-450 uppercase text-[9px] font-black border-b border-slate-100">
                                      <th className="py-2.5 px-4">Player Name</th>
                                      <th className="py-2.5 px-4 text-center">Jersey No</th>
                                      <th className="py-2.5 px-4 text-center">Jersey Size</th>
                                      <th className="py-2.5 px-4 text-center">Pants Size</th>
                                      <th className="py-2.5 px-4">Roster Sizing Notes</th>
                                      <th className="py-2 text-center">Action</th>
                                    </tr>
                                  </thead>
                                  <tbody>
                                    {team.players.map((plr, index) => (
                                      <tr key={index} className="border-b border-slate-100 hover:bg-slate-50 transition-colors">
                                        <td className="py-2.5 px-4 font-bold text-slate-900">{plr.name}</td>
                                        <td className="py-2.5 px-4 text-center font-bold text-amber-600 bg-amber-500/5">{plr.jerseyNumber}</td>
                                        <td className="py-2.5 px-4 text-center font-bold text-slate-800">{plr.jerseySize}</td>
                                        <td className="py-2.5 px-4 text-center font-bold text-slate-850">{plr.pantsSize}</td>
                                        <td className="py-2.5 px-4 text-slate-500 text-[11px] italic min-w-[200px]">{plr.notes || 'No variations'}</td>
                                        <td className="py-1 text-center">
                                          <button 
                                            type="button" 
                                            onClick={() => handleRemovePlayer(team.id, index)}
                                            className="text-rose-500 hover:bg-rose-50 font-bold p-1 px-2.5 rounded transition-all"
                                            title="Remove player"
                                          >
                                            &times;
                                          </button>
                                        </td>
                                      </tr>
                                    ))}
                                  </tbody>
                                </table>
                              </div>
                            )}
                          </div>

                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* 6. VERIFIED CRM ACTIVITY LOGGING SYSTEMS TIMELINE */}
                <div className="space-y-4 pt-1 border-t border-slate-150">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-black font-mono text-slate-450 uppercase tracking-widest flex items-center gap-1.5">
                      <History className="w-4 h-4 text-[#E5B84B]" />
                      <span>CRM Activity Log Stream</span>
                    </h4>
                    <span className="text-[10px] text-slate-450 font-mono">Last updated: {new Date(activeCustomer.updatedAt).toLocaleTimeString()}</span>
                  </div>

                  <div className="bg-slate-50 border border-slate-100 p-4 rounded-xl max-h-[180px] overflow-y-auto space-y-3">
                    {(!activeCustomer.activityLog || activeCustomer.activityLog.length === 0) ? (
                      <p className="text-[11px] text-slate-400 italic font-mono text-center">No operation logs stored. Updates to custom lists dynamically capture here.</p>
                    ) : (
                      <div className="space-y-3 relative before:absolute before:left-3 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-250">
                        {activeCustomer.activityLog.map((log) => (
                          <div key={log.id} className="flex items-start gap-4 font-mono text-[11px] text-slate-600 relative pl-6">
                            <div className="absolute left-1.5 top-1.5 w-3 h-3 rounded-full bg-[#E5B84B] border border-white shrink-0 shadow-sm" />
                            <div className="flex-1 space-y-0.5">
                              <p className="text-slate-800">
                                <strong className="text-[9px] uppercase bg-slate-200 p-0.5 px-1.5 rounded mr-1.5 text-slate-700">{log.type}</strong>
                                {log.message}
                              </p>
                              <div className="flex items-center gap-2 text-[10px] text-slate-450">
                                <span>Supervisor: <strong>{log.staffName}</strong></span>
                                <span>•</span>
                                <span>{new Date(log.timestamp).toLocaleString()}</span>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

              </motion.div>
            )}
          </AnimatePresence>
        </div>

      </div>

      {/* --- MODAL 1: REGISTER CUSTOMER COMPONENT --- */}
      {isCustomerModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <motion.div 
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-white border border-slate-200 rounded-2xl w-full max-w-xl text-left overflow-hidden shadow-2xl"
          >
            <div className="bg-slate-900 text-white p-5 flex items-center justify-between border-b border-slate-800">
              <div className="space-y-0.5">
                <span className="text-[9px] uppercase font-mono font-bold text-[#E5B84B] tracking-wider">New Onboarding Portal</span>
                <h4 className="text-base font-bold font-mono uppercase text-white">Create Customer Profile</h4>
              </div>
              <button 
                onClick={() => setIsCustomerModalOpen(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg transition-all"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateCustomer} className="p-6 space-y-4 font-mono text-xs text-slate-700">
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-slate-450 uppercase font-bold tracking-wider">Full Contact Name *</label>
                  <input 
                    type="text" 
                    required
                    placeholder="e.g. Manipur Cricket Academy (Imphal)"
                    value={newCustomerForm.name}
                    onChange={(e) => setNewCustomerForm(prev => ({ ...prev, name: e.target.value }))}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 focus:outline-none focus:border-[#E5B84B]"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-slate-450 uppercase font-bold tracking-wider">Primary Email *</label>
                  <input 
                    type="email" 
                    required
                    placeholder="e.g. billing@viccricket.org"
                    value={newCustomerForm.email}
                    onChange={(e) => setNewCustomerForm(prev => ({ ...prev, email: e.target.value }))}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 focus:outline-none focus:border-[#E5B84B]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-slate-450 uppercase font-bold tracking-wider">Communications Phone</label>
                  <input 
                    type="text" 
                    placeholder="e.g. +61 3 9653 1100"
                    value={newCustomerForm.phone}
                    onChange={(e) => setNewCustomerForm(prev => ({ ...prev, phone: e.target.value }))}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 focus:outline-none focus:border-[#E5B84B]"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-slate-450 uppercase font-bold tracking-wider">Customer Category Type</label>
                  <select 
                    value={newCustomerForm.type}
                    onChange={(e) => setNewCustomerForm(prev => ({ ...prev, type: e.target.value as any }))}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 focus:outline-none focus:border-[#E5B84B] font-bold"
                  >
                    <option value="individual">🇳🇿 Individual Athlete Account</option>
                    <option value="team">🏏 League Club / Team Affiliate</option>
                    <option value="school">🏫 School or Institution Academy</option>
                  </select>
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-slate-450 uppercase font-bold tracking-wider">Business GST / Tax details</label>
                <input 
                  type="text" 
                  placeholder="e.g. GST-AU995180 or 'Personal Unregistered'"
                  value={newCustomerForm.gstDetails}
                  onChange={(e) => setNewCustomerForm(prev => ({ ...prev, gstDetails: e.target.value }))}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 focus:outline-none focus:border-[#E5B84B]"
                />
              </div>

              <div className="space-y-1">
                <label className="text-slate-450 uppercase font-bold tracking-wider">Physical Delivery/Shipping Address</label>
                <input 
                  type="text" 
                  placeholder="Street, City, State, ZIP code"
                  value={newCustomerForm.address}
                  onChange={(e) => setNewCustomerForm(prev => ({ ...prev, address: e.target.value }))}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 focus:outline-none focus:border-[#E5B84B]"
                />
              </div>

              <div className="space-y-1">
                <label className="text-slate-450 uppercase font-bold tracking-wider">CRM Footnotes & Design summary</label>
                <textarea 
                  rows={3}
                  placeholder="E.g. Prefers English Willow grade-A weight sweeps and customized jersey collars."
                  value={newCustomerForm.notes}
                  onChange={(e) => setNewCustomerForm(prev => ({ ...prev, notes: e.target.value }))}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 focus:outline-none focus:border-[#E5B84B] font-mono text-[11px]"
                ></textarea>
              </div>

              <div className="pt-4 flex justify-end gap-2 text-xs">
                <button 
                  type="button" 
                  onClick={() => setIsCustomerModalOpen(false)}
                  className="p-2.5 px-5 bg-slate-100 hover:bg-slate-200 rounded-xl font-bold transition-all"
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  className="p-2.5 px-5 bg-[#E5B84B] hover:bg-amber-500 text-slate-950 font-bold uppercase rounded-xl shadow-md transition-all active:scale-95"
                >
                  Onboard Database
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}

      {/* --- MODAL 2: REGISTER TEAM / CLUB --- */}
      {isTeamModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <motion.div 
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-white border border-slate-200 rounded-2xl w-full max-w-xl text-left overflow-hidden shadow-2xl"
          >
            <div className="bg-slate-900 text-white p-5 flex items-center justify-between border-b border-slate-800">
              <div className="space-y-0.5">
                <span className="text-[9px] uppercase font-mono font-bold text-[#E5B84B]">Linked Team Setup</span>
                <h4 className="text-base font-bold font-mono uppercase text-white">Create Sport Squad</h4>
              </div>
              <button 
                onClick={() => setIsTeamModalOpen(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg transition-all"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateTeam} className="p-6 space-y-4 font-mono text-xs text-slate-700">
              
              <div className="space-y-1">
                <label className="text-slate-450 uppercase font-bold tracking-wider">Team Name *</label>
                <input 
                  type="text" 
                  required
                  placeholder="e.g. Cobras CC Gold Division"
                  value={newTeamForm.name}
                  onChange={(e) => setNewTeamForm(prev => ({ ...prev, name: e.target.value }))}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 focus:outline-none focus:border-[#E5B84B]"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-slate-450 uppercase font-bold tracking-wider">Coach / Manager Name</label>
                  <input 
                    type="text" 
                    placeholder="e.g. Dave Hussey"
                    value={newTeamForm.coach}
                    onChange={(e) => setNewTeamForm(prev => ({ ...prev, coach: e.target.value }))}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 focus:outline-none focus:border-[#E5B84B]"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-slate-450 uppercase font-bold tracking-wider">Corporate Sponsor Name</label>
                  <input 
                    type="text" 
                    placeholder="e.g. Coca-Cola Beverages"
                    value={newTeamForm.sponsor}
                    onChange={(e) => setNewTeamForm(prev => ({ ...prev, sponsor: e.target.value }))}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 focus:outline-none focus:border-[#E5B84B]"
                  />
                </div>
              </div>

              {/* Jersey Colors Configs */}
              <div className="space-y-1.5">
                <label className="text-slate-450 uppercase font-bold tracking-wider block">Preferred Team Color Tones</label>
                <div className="flex items-center gap-4 bg-slate-50 p-2 rounded-xl border border-slate-200">
                  <div className="flex items-center gap-1">
                    <input 
                      type="color" 
                      value={newTeamForm.preferredColors[0]}
                      onChange={(e) => setNewTeamForm(prev => ({ ...prev, preferredColors: [e.target.value, prev.preferredColors[1]] }))}
                      className="w-8 h-8 rounded cursor-pointer border"
                    />
                    <span className="text-[10px] text-slate-500">Primary Color</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <input 
                      type="color" 
                      value={newTeamForm.preferredColors[1]}
                      onChange={(e) => setNewTeamForm(prev => ({ ...prev, preferredColors: [prev.preferredColors[0], e.target.value] }))}
                      className="w-8 h-8 rounded cursor-pointer border"
                    />
                    <span className="text-[10px] text-slate-500">Accent Trim</span>
                  </div>
                </div>
              </div>

              {/* SPONSOR MASCOTS / FILE LOGO UPLOAD DRAG-DROP */}
              <div className="space-y-2">
                <label className="text-slate-450 uppercase font-bold tracking-wider block">Club Mascot / Uplinked Logo Brand</label>
                
                {/* Visual Select Presets */}
                <div className="grid grid-cols-4 gap-2 mb-3">
                  {PRESET_MASCOTS.map((mascot, mIdx) => {
                    const isSelectedPreset = newTeamForm.logo === mascot.icon;
                    return (
                      <button
                        type="button"
                        key={mIdx}
                        onClick={() => setNewTeamForm(prev => ({ ...prev, logo: mascot.icon }))}
                        className={`bg-slate-50 border p-2 rounded-xl hover:bg-slate-100 flex flex-col items-center justify-center space-y-1 text-center transition-all ${isSelectedPreset ? 'border-[#E5B84B] bg-amber-500/5 ring-1 ring-amber-100' : 'border-slate-200'}`}
                      >
                        <span className="text-xl">{mascot.icon}</span>
                        <span className="text-[8px] font-mono text-slate-500 overflow-hidden text-ellipsis whitespace-nowrap w-full">{mascot.name}</span>
                      </button>
                    );
                  })}
                </div>

                {/* FILE UPLOAD DROPZONE SIMULATOR (File upload system) */}
                <div 
                  onDragEnter={handleDrag}
                  onDragOver={handleDrag}
                  onDragLeave={handleDrag}
                  onDrop={handleDrop}
                  onClick={onButtonClick}
                  className={`border-2 border-dashed rounded-xl p-4 text-center cursor-pointer transition-all flex flex-col items-center justify-center space-y-1.5 ${isDragActive ? 'border-amber-500 bg-amber-500/5' : 'border-slate-300 hover:bg-slate-100/10'}`}
                >
                  <input 
                    type="file" 
                    ref={fileInputRef}
                    onChange={handleFileChange}
                    accept="image/*"
                    className="hidden" 
                  />
                  <UploadCloud className="w-8 h-8 text-slate-400 stroke-[1.5]" />
                  <p className="text-[11px] font-semibold text-slate-800">Drag & drop squad logo image, or <span className="text-amber-600">browse file</span></p>
                  <p className="text-[9px] text-slate-400">Supports PNG, JPG, WebP. Converted to native embedded dataURL for PWA persistence.</p>
                </div>
              </div>

              <div className="pt-4 flex justify-end gap-2 text-xs">
                <button 
                  type="button" 
                  onClick={() => setIsTeamModalOpen(false)}
                  className="p-2.5 px-5 bg-slate-100 hover:bg-slate-200 rounded-xl font-bold transition-all"
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  className="p-2.5 px-5 bg-[#E5B84B] hover:bg-amber-500 text-slate-950 font-bold uppercase rounded-xl transition-all shadow-md"
                >
                  Establish Squad
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}

      {/* --- MODAL 3: ADD ATHLETE ROSTER ITEM --- */}
      {isPlayerModalOpen && activeCustomerTeams.length > 0 && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <motion.div 
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-white border border-slate-200 rounded-2xl w-full max-w-md text-left overflow-hidden shadow-2xl"
          >
            <div className="bg-slate-900 text-white p-4 flex items-center justify-between border-b border-slate-800">
              <div className="space-y-0.5">
                <span className="text-[9px] uppercase font-mono font-bold text-[#E5B84B]">Register Athlete specs</span>
                <h4 className="text-sm font-bold font-mono uppercase text-white">Add Athlete Lineup</h4>
              </div>
              <button 
                onClick={() => setIsPlayerModalOpen(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg transition-all"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 space-y-4 font-mono text-xs text-slate-750">
              
              <div className="space-y-1">
                <label className="text-slate-450 uppercase font-bold tracking-wider">Athlete Full Name *</label>
                <input 
                  type="text" 
                  placeholder="e.g. Jasprit Bumrah"
                  value={newPlayerForm.name}
                  onChange={(e) => setNewPlayerForm(prev => ({ ...prev, name: e.target.value }))}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 focus:outline-none focus:border-[#E5B84B]"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div className="space-y-1">
                  <label className="text-slate-450 uppercase font-bold tracking-wider">Jersey No *</label>
                  <input 
                    type="text" 
                    placeholder="e.g. 93"
                    value={newPlayerForm.jerseyNumber}
                    onChange={(e) => setNewPlayerForm(prev => ({ ...prev, jerseyNumber: e.target.value }))}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 focus:outline-none focus:border-[#E5B84B] text-center font-bold"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-slate-450 uppercase font-bold tracking-wider">Jersey size</label>
                  <select 
                    value={newPlayerForm.jerseySize}
                    onChange={(e) => setNewPlayerForm(prev => ({ ...prev, jerseySize: e.target.value }))}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 focus:outline-none focus:border-[#E5B84B] font-bold"
                  >
                    <option value="S">Small (S)</option>
                    <option value="M">Medium (M)</option>
                    <option value="L">Large (L)</option>
                    <option value="XL">Extra Large (XL)</option>
                    <option value="XXL">XXL</option>
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-slate-450 uppercase font-bold tracking-wider">Pants sizing</label>
                  <select 
                    value={newPlayerForm.pantsSize}
                    onChange={(e) => setNewPlayerForm(prev => ({ ...prev, pantsSize: e.target.value }))}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 focus:outline-none focus:border-[#E5B84B] font-bold"
                  >
                    <option value="S">S</option>
                    <option value="M">M</option>
                    <option value="L">L</option>
                    <option value="XL">XL</option>
                    <option value="XXL">XXL</option>
                  </select>
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-slate-450 uppercase font-bold tracking-wider">Roster Sizing Footnotes</label>
                <input 
                  type="text" 
                  placeholder="e.g. Collar tight, +5cm hem length adjustments"
                  value={newPlayerForm.notes}
                  onChange={(e) => setNewPlayerForm(prev => ({ ...prev, notes: e.target.value }))}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 focus:outline-none focus:border-[#E5B84B]"
                />
              </div>

              <div className="pt-4 flex justify-end gap-2 text-xs">
                <button 
                  type="button" 
                  onClick={() => setIsPlayerModalOpen(false)}
                  className="p-2 px-4 bg-slate-100 hover:bg-slate-200 rounded-xl font-bold transition-all"
                >
                  Cancel
                </button>
                <button 
                  type="button" 
                  onClick={() => handleAddPlayer(activeCustomerTeams[0].id)}
                  className="p-2 px-5 bg-[#E5B84B] hover:bg-amber-500 text-slate-950 font-bold uppercase rounded-xl transition-all shadow-md"
                >
                  Lock Spec
                </button>
              </div>

            </div>
          </motion.div>
        </div>
      )}

    </div>
  );
}
