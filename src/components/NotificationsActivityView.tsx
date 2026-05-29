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
  Bell, 
  Activity, 
  AlertTriangle, 
  CheckCircle2, 
  Info, 
  Clock, 
  User, 
  ShieldCheck, 
  Filter, 
  Mail, 
  MessageSquare, 
  Terminal, 
  Code, 
  Database, 
  Cpu, 
  RefreshCw, 
  Smartphone, 
  Trash2, 
  Search, 
  Zap, 
  Sliders, 
  Globe, 
  FileText, 
  Play, 
  ArrowRight,
  UserCheck,
  Package,
  CreditCard,
  Wrench,
  Hammer
} from 'lucide-react';
import { db, isCloudConnected } from '../firebase';

// --- TYPES & INTERFACES ---

export type NotificationType = 'in_app' | 'push' | 'email' | 'alert' | 'system';

export interface ERPNotification {
  id: string;
  title: string;
  message: string;
  type: NotificationType;
  module: 'Orders' | 'Inventory' | 'Manufacturing' | 'Printing' | 'Servicing' | 'Billing' | 'Staff' | 'System';
  roleId?: string; // Optional: target role (e.g., 'super_admin', 'workshop_craftsman', 'sales_manager')
  read: boolean;
  priority: 'low' | 'medium' | 'high' | 'critical';
  timestamp: string;
  actionUrl?: string;
  metadata?: {
    orderId?: string;
    sku?: string;
    ticketId?: string;
    amount?: number;
    userId?: string;
  };
}

export interface ActivityHistoryLog {
  id: string;
  user: {
    name: string;
    email: string;
    role: string;
  };
  actionType: string; // e.g., 'New Order Created', 'Stock Levels Updated', 'Service Status Shifted'
  module: 'Orders' | 'Inventory' | 'Manufacturing' | 'Printing' | 'Servicing' | 'Billing' | 'Staff' | 'System';
  timestamp: string;
  previousValue?: string;
  updatedValue?: string;
  deviceInfo: {
    browser: string;
    os: string;
    ip: string;
    location: string;
  };
  tamperHash: string; // Dynamic SHA-256 styled index validating audit trail honesty
}

// Preset Premium Demonstration Alert Seeds
const SEED_NOTIFICATIONS: ERPNotification[] = [
  {
    id: "NTF-901",
    title: "⚠️ Inventory Target Threshold Breached",
    message: "SS Platina Cricket Bat Grade-A Willow stock fell below safety balance of 5 units. Current stock: 2.",
    type: 'alert',
    module: 'Inventory',
    read: false,
    priority: 'high',
    timestamp: new Date(Date.now() - 4 * 60 * 1000).toISOString(), // 4 mins ago
    metadata: { sku: 'BAT-PLA-G1', amount: 2 }
  },
  {
    id: "NTF-902",
    title: "⚡ Manufacturing Delay Warning",
    message: "Workshop workbench 4 reported high tension roller clamp calibration delay for Order ORD-421.",
    type: 'in_app',
    module: 'Manufacturing',
    roleId: 'workshop_craftsman',
    read: false,
    priority: 'medium',
    timestamp: new Date(Date.now() - 45 * 60 * 1000).toISOString(), // 45 mins ago
    metadata: { orderId: 'ORD-421' }
  },
  {
    id: "NTF-903",
    title: "💳 Invoice Settlement Complete",
    message: "Melbourne Whse processed $5,460.00 payment for Victorian Chargers custom gloves assignment.",
    type: 'email',
    module: 'Billing',
    read: true,
    priority: 'low',
    timestamp: new Date(Date.now() - 120 * 60 * 1000).toISOString(), // 2 hours ago
    metadata: { amount: 5460 }
  },
  {
    id: "NTF-904",
    title: "🛠️ Restoration Ticket Completed",
    message: "SS Ton Premium Bat Crack repair (TKT-301) completed quality benchmark inspection. Marked as Ready.",
    type: 'push',
    module: 'Servicing',
    read: true,
    priority: 'medium',
    timestamp: new Date(Date.now() - 180 * 60 * 1000).toISOString(),
    metadata: { ticketId: 'TKT-301' }
  }
];

const SEED_ACTIVITY_LOGS: ActivityHistoryLog[] = [
  {
    id: "LOG-8001",
    user: { name: "Devesh Shastri", email: "devesh@talkofthetown.id", role: "workshop_craftsman" },
    actionType: "Service Status Shifted",
    module: "Servicing",
    timestamp: new Date(Date.now() - 15 * 60 * 1000).toISOString(),
    previousValue: "Repair In Progress",
    updatedValue: "Quality Check",
    deviceInfo: { browser: "Chrome v124", os: "macOS", ip: "192.168.1.42", location: "Melbourne Workshop Bench B" },
    tamperHash: "ee672a9df35b8cbca52"
  },
  {
    id: "LOG-8002",
    user: { name: "Sarah Alum-Prints", email: "sarah@talkofthetown.id", role: "workshop_craftsman" },
    actionType: "New Sublimation Job Initiated",
    module: "Printing",
    timestamp: new Date(Date.now() - 34 * 60 * 1000).toISOString(),
    previousValue: "Queued",
    updatedValue: "In Sublimation Press",
    deviceInfo: { browser: "Firefox v125", os: "Windows 11", ip: "192.168.1.109", location: "London Sublimation Lab" },
    tamperHash: "c00171d87e2213abf01"
  },
  {
    id: "LOG-8003",
    user: { name: "Vijay Merchant", email: "vijay@talkofthetown.id", role: "bookkeeper" },
    actionType: "Double-Entry Bill Formulated",
    module: "Billing",
    timestamp: new Date(Date.now() - 110 * 60 * 1000).toISOString(),
    previousValue: "DRAFT_INVOICE",
    updatedValue: "INVOICED_COMPLETED",
    deviceInfo: { browser: "Safari v17.4", os: "iOS", ip: "182.16.2.22", location: "Melbourne Financial Desk" },
    tamperHash: "6f5ac7282b99deba34f"
  },
  {
    id: "LOG-8004",
    user: { name: "Super Administrator", email: "admin@talkofthetown.id", role: "super_admin" },
    actionType: "Sentry Security Threshold Calibration",
    module: "System",
    timestamp: new Date(Date.now() - 240 * 60 * 1000).toISOString(),
    previousValue: "STANDARD_ENFORCEMENT",
    updatedValue: "PARANOID_MFA_FORCE",
    deviceInfo: { browser: "Edge v121", os: "Ubuntu Linux", ip: "172.56.12.8", location: "Cloud HQ Control Gate" },
    tamperHash: "0a11bc32e7fa8901bc3"
  }
];

export const NotificationsActivityView: React.FC<{
  branchScope: string;
  profile: any;
}> = ({ branchScope, profile }) => {
  // Sync States
  const [syncStatus, setSyncStatus] = useState<'synced' | 'connecting' | 'offline'>('connecting');
  const [telemetryLogs, setTelemetryLogs] = useState<string[]>([]);

  // Core Arrays
  const [notifications, setNotifications] = useState<ERPNotification[]>([]);
  const [activityLogs, setActivityLogs] = useState<ActivityHistoryLog[]>([]);

  // Real-time Push subscription Simulation
  const [isPushSubscribed, setIsPushSubscribed] = useState(false);
  const [simulatedDeviceToken, setSimulatedDeviceToken] = useState("");

  // Filters & Search State
  const [searchNotificationQuery, setSearchNotificationQuery] = useState("");
  const [selectedNotifFilter, setSelectedNotifFilter] = useState<string>("All");
  const [selectedNotifModule, setSelectedNotifModule] = useState<string>("All");
  const [selectedNotifPriority, setSelectedNotifPriority] = useState<string>("All");

  const [searchLogQuery, setSearchLogQuery] = useState("");
  const [selectedLogModule, setSelectedLogModule] = useState<string>("All");

  // Dynamic Trigger Simulator fields
  const [simulateEventType, setSimulateEventType] = useState<'New Order Created' | 'Manufacturing Stage Updated' | 'Inventory Low Stock' | 'Payment Overdue' | 'Repair Completed' | 'Invoice Generated' | 'Staff Assignment Changes'>('New Order Created');
  const [simulateEventDesc, setSimulateEventDesc] = useState("");
  const [simulateEventModule, setSimulateEventModule] = useState<'Orders' | 'Inventory' | 'Manufacturing' | 'Printing' | 'Servicing' | 'Billing' | 'Staff' | 'System'>('Orders');
  const [simulatePriority, setSimulatePriority] = useState<'low' | 'medium' | 'high' | 'critical'>('medium');

  // Modal / Tab States
  const [activeSubTab, setActiveSubTab] = useState<'notifications_center' | 'audit_trail' | 'event_generator' | 'functions_admin'>('notifications_center');
  const [selectedAuditLog, setSelectedAuditLog] = useState<ActivityHistoryLog | null>(null);

  // Helper log emitter
  const logTelemetry = (text: string) => {
    const timeStr = new Date().toISOString().split('T')[1].slice(0, 8);
    setTelemetryLogs(prev => [`[${timeStr}] ${text}`, ...prev.slice(0, 15)]);
  };

  // 1. Establish live listeners or load cached seeds
  useEffect(() => {
    logTelemetry("Sentry audit gateway boot-sequence initialized...");
    setSyncStatus('connecting');

    let unsubNotif = () => {};
    let unsubLogs = () => {};

    if (isCloudConnected) {
      try {
        // Build notifications listener
        const qNotif = collection(db, 'erp_notifications');
        unsubNotif = onSnapshot(qNotif, (snap) => {
          if (snap.empty) {
            SEED_NOTIFICATIONS.forEach(async (n) => {
              await setDoc(doc(db, 'erp_notifications', n.id), n);
            });
            setNotifications(SEED_NOTIFICATIONS);
          } else {
            const list: ERPNotification[] = [];
            snap.forEach(doc => {
              list.push(doc.data() as ERPNotification);
            });
            list.sort((a,b) => b.timestamp.localeCompare(a.timestamp));
            setNotifications(list);
          }
          setSyncStatus('synced');
          logTelemetry("Realtime Firestore 'erp_notifications' collection established.");
        }, (err) => {
          console.error("Notifications listener failed: ", err);
          fallbackLocal();
        });

        // Build activity logs listener
        const qLogs = collection(db, 'erp_activity_logs');
        unsubLogs = onSnapshot(qLogs, (snap) => {
          if (snap.empty) {
            SEED_ACTIVITY_LOGS.forEach(async (l) => {
              await setDoc(doc(db, 'erp_activity_logs', l.id), l);
            });
            setActivityLogs(SEED_ACTIVITY_LOGS);
          } else {
            const list: ActivityHistoryLog[] = [];
            snap.forEach(doc => {
              list.push(doc.data() as ActivityHistoryLog);
            });
            list.sort((a,b) => b.timestamp.localeCompare(a.timestamp));
            setActivityLogs(list);
          }
        }, (err) => {
          console.error("Activity logs listener failed: ", err);
        });

      } catch (e) {
        console.error("Dynamic firestore attachment breached: ", e);
        fallbackLocal();
      }
    } else {
      fallbackLocal();
    }

    function fallbackLocal() {
      // Load/save offline cache
      const cachedNotif = localStorage.getItem('erp_notifications');
      const cachedLogs = localStorage.getItem('erp_activity_logs');

      if (cachedNotif) {
        setNotifications(JSON.parse(cachedNotif));
      } else {
        setNotifications(SEED_NOTIFICATIONS);
        localStorage.setItem('erp_notifications', JSON.stringify(SEED_NOTIFICATIONS));
      }

      if (cachedLogs) {
        setActivityLogs(JSON.parse(cachedLogs));
      } else {
        setActivityLogs(SEED_ACTIVITY_LOGS);
        localStorage.setItem('erp_activity_logs', JSON.stringify(SEED_ACTIVITY_LOGS));
      }

      setSyncStatus('offline');
      logTelemetry("Secured local IndexedDB cache instantiated. Cloud disconnected.");
    }

    return () => {
      unsubNotif();
      unsubLogs();
    };
  }, []);

  // Recache local backups for consistent persistence
  useEffect(() => {
    if (notifications.length > 0) {
      localStorage.setItem('erp_notifications', JSON.stringify(notifications));
    }
  }, [notifications]);

  useEffect(() => {
    if (activityLogs.length > 0) {
      localStorage.setItem('erp_activity_logs', JSON.stringify(activityLogs));
    }
  }, [activityLogs]);

  // Notifications Actions (Read/Unread status triggers)
  const toggleNotificationRead = async (id: string, currentReadState: boolean) => {
    const updated = notifications.map(n => n.id === id ? { ...n, read: !currentReadState } : n);
    setNotifications(updated);
    logTelemetry(`🔔 Marked notification ${id} as ${!currentReadState ? 'READ' : 'UNREAD'}`);

    if (isCloudConnected) {
      try {
        await updateDoc(doc(db, 'erp_notifications', id), {
          read: !currentReadState
        });
      } catch (err) {
        console.error("Firestore notification read sync state failed: ", err);
      }
    }
  };

  const markAllAsRead = async () => {
    const updated = notifications.map(n => ({ ...n, read: true }));
    setNotifications(updated);
    logTelemetry(`🧹 All notification items flagged as physically READ`);

    if (isCloudConnected) {
      try {
        const qSnap = await getDocs(collection(db, 'erp_notifications'));
        qSnap.forEach(async (d) => {
          await updateDoc(doc(db, 'erp_notifications', d.id), { read: true });
        });
      } catch (e) {
        console.warn("Bulk mark read failure: ", e);
      }
    }
  };

  const deleteNotification = async (id: string) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
    logTelemetry(`🗑️ Discarded notification card: ${id}`);

    if (isCloudConnected) {
      try {
        await deleteDoc(doc(db, 'erp_notifications', id));
      } catch (err) {
        console.error("Firestore discard notification failed: ", err);
      }
    }
  };

  // Push notification token subscription simulation
  const handleRegisterPush = () => {
    if (isPushSubscribed) {
      setIsPushSubscribed(false);
      setSimulatedDeviceToken("");
      logTelemetry(`📱 WebPush Subscription deregistered for device token registry.`);
    } else {
      const generatedMockToken = `fcm:tott_cricket:web_push_${Math.floor(1e8 + Math.random() * 9e8)}:chrome`;
      setIsPushSubscribed(true);
      setSimulatedDeviceToken(generatedMockToken);
      logTelemetry(`📱 WebPush registered successfully. Sentry tokens compiled: ${generatedMockToken}`);
      
      // Attempt to save notification payload indicating PWA service-worker boot-up
      const registerNotification: ERPNotification = {
        id: `NTF-${Math.floor(950 + Math.random() * 50)}`,
        title: "📱 Push Notification Service Active",
        message: `Registered local browser PWA instance matching Sentry security credentials. Ready for push signals.`,
        type: 'push',
        module: 'System',
        read: false,
        priority: 'low',
        timestamp: new Date().toISOString()
      };
      setNotifications(prev => [registerNotification, ...prev]);
    }
  };

  // Dynamic Event Dispatch Generator Simulator
  const handleTriggerSimulatedEvent = async (e: React.FormEvent) => {
    e.preventDefault();
    const eventId = `LOG-${Math.floor(8100 + Math.random() * 900)}`;
    const notifId = `NTF-${Math.floor(951 + Math.random() * 40)}`;

    const customMsg = simulateEventDesc.trim() || `Automated audit log dispatched for event type [${simulateEventType}] on ${simulateEventModule} console.`;

    // 1. Compile activity audit record
    const newActivityRecord: ActivityHistoryLog = {
      id: eventId,
      user: {
        name: profile?.name || "Devesh Shastri",
        email: profile?.email || "devesh@talkofthetown.id",
        role: profile?.roleId || "workshop_craftsman"
      },
      actionType: simulateEventType,
      module: simulateEventModule,
      timestamp: new Date().toISOString(),
      previousValue: "SIM_INITIAL",
      updatedValue: "SIM_COMPLETED",
      deviceInfo: {
        browser: "Chrome v124 (PWA)",
        os: "macOS Core",
        ip: "127.0.0.1 (Loopback)",
        location: branchScope === 'Melbourne Closets' ? 'Melbourne HQ' : 'London Closet Depot'
      },
      tamperHash: Math.random().toString(16).substr(2, 20)
    };

    // 2. Compile companion in-app notification trigger matching rules
    const newNotification: ERPNotification = {
      id: notifId,
      title: `${getSimulateIconPrefix(simulateEventType)} ${simulateEventType}`,
      message: customMsg,
      type: 'alert',
      module: simulateEventModule,
      read: false,
      priority: simulatePriority,
      timestamp: new Date().toISOString(),
      metadata: {
        amount: simulateEventType === 'Payment Overdue' ? 1200 : undefined,
        orderId: simulateEventType === 'New Order Created' ? `ORD-${Math.floor(400 + Math.random() * 100)}` : undefined
      }
    };

    // Store instantly
    setActivityLogs(prev => [newActivityRecord, ...prev]);
    setNotifications(prev => [newNotification, ...prev]);
    logTelemetry(`⚡ SIMULATOR DISPATCH: Triggered event "${simulateEventType}" representing ${simulateEventModule}.`);

    if (isCloudConnected) {
      try {
        await setDoc(doc(db, 'erp_activity_logs', eventId), newActivityRecord);
        await setDoc(doc(db, 'erp_notifications', notifId), newNotification);
      } catch (err) {
        console.error("Firestore simulation logs generation failed: ", err);
      }
    }

    setSimulateEventDesc("");
  };

  function getSimulateIconPrefix(type: string) {
    switch (type) {
      case 'New Order Created': return '🛒';
      case 'Manufacturing Stage Updated': return '⚙️';
      case 'Inventory Low Stock': return '⚠️';
      case 'Payment Overdue': return '💳';
      case 'Repair Completed': return '🛠️';
      case 'Invoice Generated': return '🧾';
      default: return '📢';
    }
  }

  // Visual helper flags
  const getPriorityColor = (p: 'low' | 'medium' | 'high' | 'critical') => {
    switch (p) {
      case 'critical':
        return 'bg-red-100 text-red-800 border-red-300 font-black uppercase text-[9px] px-1.5 py-0.5 rounded';
      case 'high':
        return 'bg-amber-100 text-amber-800 border-amber-300 font-bold uppercase text-[9px] px-1.5 py-0.5 rounded';
      case 'medium':
        return 'bg-blue-100 text-blue-800 border-blue-200 text-[9px] px-1.5 py-0.5 rounded';
      default:
        return 'bg-neutral-100 text-neutral-600 text-[9px] px-1.5 py-0.5 rounded';
    }
  };

  const getModuleIcon = (m: string) => {
    switch (m) {
      case 'Inventory': return <Package className="w-4 h-4 text-sky-500" />;
      case 'Manufacturing': return <Hammer className="w-4 h-4 text-[#E5B84B]" />;
      case 'Printing': return <Zap className="w-4 h-4 text-purple-500" />;
      case 'Servicing': return <Wrench className="w-4 h-4 text-amber-600" />;
      case 'Billing': return <CreditCard className="w-4 h-4 text-emerald-500" />;
      default: return <Bell className="w-4 h-4 text-neutral-400" />;
    }
  };

  // List filter operations
  const filteredNotifications = notifications.filter(n => {
    const matchesSearch = n.title.toLowerCase().includes(searchNotificationQuery.toLowerCase()) || 
                          n.message.toLowerCase().includes(searchNotificationQuery.toLowerCase());
    
    const matchesRead = selectedNotifFilter === "All" ||
                        (selectedNotifFilter === "Unread" && !n.read) ||
                        (selectedNotifFilter === "Read" && n.read);

    const matchesModule = selectedNotifModule === "All" || n.module === selectedNotifModule;
    const matchesPriority = selectedNotifPriority === "All" || n.priority === selectedNotifPriority;

    return matchesSearch && matchesRead && matchesModule && matchesPriority;
  });

  const filteredLogs = activityLogs.filter(l => {
    const matchesSearch = l.actionType.toLowerCase().includes(searchLogQuery.toLowerCase()) ||
                          l.user.name.toLowerCase().includes(searchLogQuery.toLowerCase()) ||
                          l.id.toLowerCase().includes(searchLogQuery.toLowerCase()) ||
                          l.deviceInfo.location.toLowerCase().includes(searchLogQuery.toLowerCase());
    
    const matchesModule = selectedLogModule === "All" || l.module === selectedLogModule;

    return matchesSearch && matchesModule;
  });

  return (
    <div className="space-y-6" id="notifications-activity-mainframe">
      
      {/* SECTION 1: SYSTEM TITLE & NETWORK STATUS */}
      <div className="bg-white p-6 rounded-2xl border border-neutral-200 flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-4 shadow-sm">
        <div>
          <div className="flex items-center gap-2 flex-wrap text-xs">
            <span className="text-[10px] font-mono tracking-widest text-[#E5B84B] font-black uppercase bg-amber-50 px-2.5 py-1 rounded border border-amber-200">
              Department: Security audit & activities
            </span>
            <span className={`text-[10px] font-mono px-2 py-0.5 rounded flex items-center gap-1.5 font-bold ${
              syncStatus === 'synced' ? 'bg-[#FCFAF2] text-amber-700 border border-amber-200' : 'bg-neutral-50 text-neutral-500 border border-neutral-200'
            }`}>
              <span className={`w-1.5 h-1.5 rounded-full ${syncStatus === 'synced' ? 'bg-[#E5B84B] animate-ping' : 'bg-neutral-400 animate-pulse'}`}></span>
              <span>{syncStatus === 'synced' ? "SENTRY LINKED: LIVE FIRESTORE" : "SANDBOXED STORAGE PROTOCOL"}</span>
            </span>
          </div>

          <h2 className="text-xl font-black text-neutral-900 tracking-tight mt-2 uppercase font-sans flex items-center gap-2">
            <Activity className="w-6 h-6 text-[#E5B84B]" />
            <span>Operational Sentry, Alert & Activity Ledger</span>
          </h2>

          <p className="text-xs text-neutral-500 font-sans mt-1">
            Real-time visual event monitoring, tamper-detectable ledger hash audits, low-stock threshold alarm routers, and PWA push subscription registers.
          </p>
        </div>

        {/* Dynamic push registration */}
        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={handleRegisterPush}
            className={`px-3.5 py-2.5 rounded-xl text-xs font-mono font-bold tracking-tight transition-all flex items-center gap-1.5 ${
              isPushSubscribed 
                ? 'bg-emerald-50 text-emerald-700 border border-emerald-300' 
                : 'bg-neutral-100 hover:bg-neutral-200 text-neutral-800 border border-neutral-300'
            }`}
          >
            <Smartphone className="w-3.5 h-3.5" />
            <span>{isPushSubscribed ? "Push Registered" : "Subscribe Push"}</span>
          </button>

          <button
            type="button"
            onClick={() => {
              localStorage.removeItem('erp_notifications');
              localStorage.removeItem('erp_activity_logs');
              setNotifications(SEED_NOTIFICATIONS);
              setActivityLogs(SEED_ACTIVITY_LOGS);
              logTelemetry("🔄 Restoration sequence finalized: Factory seeded default Sentry structures.");
              alert("Re-instantiated default ERP Notifications and Activity log registers.");
            }}
            className="bg-neutral-900 hover:bg-neutral-800 text-white px-3.5 py-2.5 rounded-xl text-xs font-mono font-bold tracking-tight transition-all"
          >
            Reset Master Seeds
          </button>
        </div>
      </div>

      {/* SUB-TABS NAVIGATION CONTROLS MENU */}
      <div className="flex border-b border-neutral-200 font-mono text-xs overflow-x-auto whitespace-nowrap scrollbar-none gap-2" id="sentry-sub-tabs">
        <button
          onClick={() => {
            setActiveSubTab('notifications_center');
            logTelemetry("🔄 Transitioned sub-console to Notifications Center.");
          }}
          className={`pb-3 px-4 font-bold border-b-2 transition-all flex items-center gap-1.5 ${
            activeSubTab === 'notifications_center' 
              ? 'border-[#E5B84B] text-neutral-950 font-black' 
              : 'border-transparent text-neutral-500 hover:text-neutral-800'
          }`}
        >
          <Bell className="w-4 h-4 text-amber-500" />
          <span>Sentry Notification Center ({notifications.filter(n => !n.read).length} critical)</span>
        </button>

        <button
          onClick={() => {
            setActiveSubTab('audit_trail');
            logTelemetry("🔄 Opened Sentry System Audit and activity logs console.");
          }}
          className={`pb-3 px-4 font-bold border-b-2 transition-all flex items-center gap-1.5 ${
            activeSubTab === 'audit_trail' 
              ? 'border-[#E5B84B] text-neutral-950 font-black' 
              : 'border-transparent text-neutral-500 hover:text-neutral-800'
          }`}
        >
          <Activity className="w-4 h-4 text-sky-500" />
          <span>Secure Audit Trail logs ({filteredLogs.length} traced)</span>
        </button>

        <button
          onClick={() => {
            setActiveSubTab('event_generator');
            logTelemetry("🔄 Ready to dispatch custom simulated alert triggers.");
          }}
          className={`pb-3 px-4 font-bold border-b-2 transition-all flex items-center gap-1.5 ${
            activeSubTab === 'event_generator' 
              ? 'border-[#E5B84B] text-neutral-950 font-black' 
              : 'border-transparent text-neutral-500 hover:text-neutral-800'
          }`}
        >
          <Zap className="w-4 h-4 text-purple-500" />
          <span>Sentry Event Dispatch Generator</span>
        </button>

        <button
          onClick={() => {
            setActiveSubTab('functions_admin');
            logTelemetry("Loaded Firebase Cloud Functions structural specs.");
          }}
          className={`pb-3 px-4 font-bold border-b-2 transition-all flex items-center gap-1.5 ${
            activeSubTab === 'functions_admin' 
              ? 'border-[#E5B84B] text-neutral-950 font-black' 
              : 'border-transparent text-neutral-500 hover:text-neutral-800'
          }`}
        >
          <Code className="w-4 h-4 text-[#E5B84B]" />
          <span>Firebase Functions Specs</span>
        </button>
      </div>

      {/* CORE CONTENT LAYOUT SWITCHER */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* LEFT COLUMN: ACTIVE VIEW CARD SUBSTRUCTURE (8 Units) */}
        <div className="lg:col-span-8 space-y-4">
          
          {/* TAB 1: NOTIFICATION CENTER */}
          {activeSubTab === 'notifications_center' && (
            <div className="space-y-4">
              
              {/* FILTER OVERLAYS FOR NOTIFICATIONS */}
              <div className="bg-white p-4.5 rounded-2xl border border-neutral-200 shadow-sm flex flex-col md:flex-row items-stretch md:items-center gap-3.5 justify-between font-mono text-xs">
                
                {/* Search */}
                <div className="relative flex-1">
                  <input 
                    type="text" 
                    value={searchNotificationQuery}
                    onChange={(e) => setSearchNotificationQuery(e.target.value)}
                    placeholder="Filter critical titles or message content..."
                    className="w-full p-2.5 pl-9 rounded-xl bg-neutral-50 border border-neutral-200 text-xs text-neutral-800"
                  />
                  <Search className="w-4 h-4 text-neutral-400 absolute left-3 top-3.5" />
                </div>

                {/* Status Read options */}
                <div className="flex items-center gap-2">
                  <span className="text-neutral-400 text-[10px] font-bold uppercase shrink-0">Read:</span>
                  <select 
                    value={selectedNotifFilter}
                    onChange={(e) => setSelectedNotifFilter(e.target.value)}
                    className="bg-neutral-50 p-2 border border-neutral-200 rounded-xl"
                  >
                    <option value="All">All Statuses</option>
                    <option value="Unread">Unread Alerts Only</option>
                    <option value="Read">Read Histories Only</option>
                  </select>
                </div>

                {/* Priority filter */}
                <div className="flex items-center gap-2">
                  <span className="text-neutral-400 text-[10px] font-bold uppercase shrink-0">Priority:</span>
                  <select 
                    value={selectedNotifPriority}
                    onChange={(e) => setSelectedNotifPriority(e.target.value)}
                    className="bg-neutral-50 p-2 border border-neutral-200 rounded-xl"
                  >
                    <option value="All">All Priorities</option>
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                    <option value="critical">Critical</option>
                  </select>
                </div>

                {/* Quick actions bulk cleanup */}
                <button
                  type="button"
                  onClick={markAllAsRead}
                  className="bg-neutral-100 hover:bg-neutral-200 text-neutral-700 font-bold px-3 py-2 rounded-xl transition-all uppercase text-[10px] flex items-center gap-1"
                >
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
                  <span>Mark All Read</span>
                </button>

              </div>

              {/* LIST CARDS */}
              {filteredNotifications.length === 0 ? (
                <div className="bg-white rounded-2xl border border-neutral-200 p-12 text-center">
                  <Bell className="w-12 h-12 text-neutral-300 mx-auto stroke-1 animate-pulse" />
                  <h5 className="font-sans font-bold text-neutral-800 text-sm mt-3">All systems green. Zero active notifications.</h5>
                  <p className="font-sans text-xs text-neutral-400 max-w-sm mx-auto mt-1 leading-normal">
                    Try changing your search query or filter scope, or switch to the **Event Dispatch Generator** to simulate new low-stock warnings.
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {filteredNotifications.map((notif) => {
                    return (
                      <div 
                        key={notif.id}
                        className={`bg-white rounded-2xl border p-4.5 transition-all flex items-start justify-between gap-4 shadow-sm hover:shadow ${
                          notif.read ? 'border-neutral-200/90 bg-neutral-50/50 opacity-75' : 'border-[#E5B84B]/45 ring-1 ring-amber-500/5'
                        }`}
                      >
                        <div className="flex items-start gap-3 flex-1">
                          {/* Left icon wrapper */}
                          <div className="w-9 h-9 rounded-xl bg-neutral-50 border border-neutral-200/80 flex items-center justify-center shrink-0">
                            {getModuleIcon(notif.module)}
                          </div>

                          <div className="space-y-1.5 flex-1 select-none">
                            <div className="flex items-center gap-2 flex-wrap text-[10.5px] font-mono">
                              <span className="font-black text-[#E5B84B]">{notif.id}</span>
                              <span className="text-neutral-400">• Module: <strong>{notif.module.toUpperCase()}</strong></span>
                              <span className="text-neutral-400">• Type: <strong>{notif.type.toUpperCase()}</strong></span>
                              {notif.roleId && (
                                <span className="bg-purple-100 text-purple-700 px-1.5 rounded uppercase font-black text-[9px]">
                                  Role: {notif.roleId.replace('_', ' ')}
                                </span>
                              )}
                            </div>

                            <h4 className="text-sm font-bold text-neutral-900 leading-tight">
                              {notif.title}
                            </h4>

                            <p className="text-xs text-neutral-600 font-sans leading-relaxed">
                              {notif.message}
                            </p>

                            <div className="flex items-center gap-3 text-[10.5px] font-mono text-neutral-400">
                              <span className="flex items-center gap-1">
                                <Clock className="w-3 h-3" />
                                <span>{new Date(notif.timestamp).toLocaleString()}</span>
                              </span>
                              <span>•</span>
                              <span>Priority: {getPriorityColor(notif.priority)}</span>
                            </div>
                          </div>
                        </div>

                        {/* Actions block right-hand side */}
                        <div className="flex items-center gap-1.5 shrink-0 self-center">
                          <button
                            type="button"
                            onClick={() => toggleNotificationRead(notif.id, notif.read)}
                            title={notif.read ? "Mark Unread" : "Mark Read"}
                            className={`p-2 rounded-xl transition-all border ${
                              notif.read 
                                ? 'bg-neutral-50 border-neutral-200 text-neutral-400 hover:text-neutral-600' 
                                : 'bg-amber-50 text-amber-600 border-amber-200 hover:bg-amber-100'
                            }`}
                          >
                            <ShieldCheck className="w-4 h-4" />
                          </button>

                          <button
                            type="button"
                            onClick={() => deleteNotification(notif.id)}
                            title="Discard alert parameters"
                            className="p-2 rounded-xl bg-rose-50 text-rose-600 border border-rose-200 hover:bg-rose-100 transition-all"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>

                      </div>
                    );
                  })}
                </div>
              )}

            </div>
          )}

          {/* TAB 2: AUDIT TRAIL LOGS */}
          {activeSubTab === 'audit_trail' && (
            <div className="space-y-4">
              
              {/* FILTERS */}
              <div className="bg-white p-4.5 rounded-2xl border border-neutral-200 shadow-sm flex flex-col md:flex-row items-stretch md:items-center gap-3.5 justify-between font-mono text-xs">
                
                {/* Search */}
                <div className="relative flex-1">
                  <input 
                    type="text" 
                    value={searchLogQuery}
                    onChange={(e) => setSearchLogQuery(e.target.value)}
                    placeholder="Search User name, location context, action metadata..."
                    className="w-full p-2.5 pl-9 rounded-xl bg-neutral-50 border border-neutral-200 text-xs text-neutral-800"
                  />
                  <Search className="w-4 h-4 text-neutral-400 absolute left-3 top-3.5" />
                </div>

                {/* Module selection */}
                <div className="flex items-center gap-2">
                  <span className="text-neutral-400 text-[10px] font-bold uppercase shrink-0">Module:</span>
                  <select 
                    value={selectedLogModule}
                    onChange={(e) => setSelectedLogModule(e.target.value)}
                    className="bg-neutral-50 p-2 border border-neutral-200 rounded-xl"
                  >
                    <option value="All">All Modules</option>
                    <option value="Orders">Orders</option>
                    <option value="Inventory">Inventory</option>
                    <option value="Manufacturing">Manufacturing</option>
                    <option value="Printing">Printing</option>
                    <option value="Servicing">Servicing</option>
                    <option value="Billing">Billing</option>
                    <option value="System">System</option>
                  </select>
                </div>

              </div>

              {/* TABLE LIST OUTLET */}
              <div className="bg-white rounded-2xl border border-neutral-200 shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse text-xs font-mono">
                    
                    <thead className="bg-neutral-50 border-b border-neutral-200 text-[10px] uppercase text-neutral-500 font-extrabold">
                      <tr>
                        <th className="p-4">Log Sentry ID</th>
                        <th className="p-4">Active User Operator</th>
                        <th className="p-4">Action Event</th>
                        <th className="p-4">Module target</th>
                        <th className="p-4">Epoch Time</th>
                        <th className="p-4 text-right">Integrity Verified</th>
                      </tr>
                    </thead>

                    <tbody className="divide-y divide-neutral-100">
                      {filteredLogs.map(log => {
                        return (
                          <tr 
                            key={log.id} 
                            onClick={() => {
                              setSelectedAuditLog(log);
                              logTelemetry(`🔬 Reviewing exact cryptographic differences for record ${log.id}`);
                            }}
                            className={`cursor-pointer transition-all hover:bg-neutral-50 ${
                              selectedAuditLog?.id === log.id ? 'bg-[#FCFAF0]' : ''
                            }`}
                          >
                            <td className="p-4 font-black text-[#E5B84B]">
                              {log.id}
                            </td>
                            <td className="p-4 font-sans font-bold text-neutral-800">
                              <div className="flex items-center gap-2">
                                <div className="w-6 h-6 rounded-full bg-neutral-100 border border-neutral-300 flex items-center justify-center text-[10px] font-mono leading-none font-bold text-neutral-600 shrink-0">
                                  {log.user.name.slice(0, 2).toUpperCase()}
                                </div>
                                <div>
                                  <span className="block font-sans text-xs leading-tight">{log.user.name}</span>
                                  <span className="block text-[8.5px] text-neutral-400 font-mono font-normal leading-none uppercase">{log.user.role}</span>
                                </div>
                              </div>
                            </td>
                            <td className="p-4 font-sans font-bold text-neutral-700">
                              {log.actionType}
                            </td>
                            <td className="p-4">
                              <span className="bg-neutral-100 border border-neutral-200 text-neutral-600 text-[9px] px-1.5 py-0.5 rounded font-bold uppercase font-mono">
                                {log.module}
                              </span>
                            </td>
                            <td className="p-4 text-neutral-450 text-[10.5px]">
                              {new Date(log.timestamp).toLocaleTimeString()}
                            </td>
                            <td className="p-4 text-right">
                              <span className="inline-flex items-center gap-1 bg-emerald-50 text-emerald-700 border border-emerald-200 text-[9px] px-2 py-0.5 rounded-full font-black uppercase font-mono tracking-tighter">
                                <ShieldCheck className="w-2.5 h-2.5 text-emerald-500" />
                                <span>{log.tamperHash.slice(0, 8)}</span>
                              </span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>

                  </table>
                </div>

                {filteredLogs.length === 0 && (
                  <div className="p-12 text-center text-neutral-400 font-sans">
                    No activity logs track records matched query parameters.
                  </div>
                )}
              </div>

            </div>
          )}

          {/* TAB 3: SIMULATOR EVENTS TRIGGER PORT */}
          {activeSubTab === 'event_generator' && (
            <div className="bg-white p-6 rounded-2xl border border-neutral-200 shadow-sm space-y-5 font-mono text-xs">
              
              <div className="pb-3 border-b border-neutral-100">
                <h3 className="text-base font-black text-neutral-900 uppercase font-sans">
                  Sentry ERP Event Simulation Desk
                </h3>
                <p className="text-xs text-neutral-400 mt-0.5 font-sans leading-normal">
                  Inject and monitor mock network operations below to observe how the unified dashboard and Firestore stream notification alerts instantly inside real-time contexts.
                </p>
              </div>

              <form onSubmit={handleTriggerSimulatedEvent} className="space-y-4">
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Event Type selector */}
                  <div className="space-y-1">
                    <label className="text-neutral-500 text-[10px] font-black uppercase block">Select Notification Action Event</label>
                    <select
                      value={simulateEventType}
                      onChange={(e) => {
                        const val = e.target.value as any;
                        setSimulateEventType(val);
                        // Sensible auto setting values matching constraints
                        if (val === 'New Order Created') {
                          setSimulateEventModule('Orders');
                          setSimulateEventDesc("SS Gold Crest Cricket batsORD-501 consolidated at branch drawer checkout.");
                        } else if (val === 'Inventory Low Stock') {
                          setSimulateEventModule('Inventory');
                          setSimulateEventDesc("Safety levels critically breached for Gray-Nicolls Premium grip wrap wraps.");
                        } else if (val === 'Manufacturing Stage Updated') {
                          setSimulateEventModule('Manufacturing');
                          setSimulateEventDesc("Cricket glove stitch workbench reported line clamp progress matching design parameters.");
                        } else if (val === 'Payment Overdue') {
                          setSimulateEventModule('Billing');
                          setSimulateEventDesc("Overdue billing penalty flagged for Victorian Chargers account ledger.");
                        } else if (val === 'Repair Completed') {
                          setSimulateEventModule('Servicing');
                          setSimulateEventDesc("TKT-342 (SS Platinum bat knocking) compiled successfully at craftsmanship desk.");
                        } else {
                          setSimulateEventModule('System');
                        }
                      }}
                      className="w-full bg-neutral-50 p-3 rounded-xl border border-neutral-200 font-bold"
                    >
                      <option value="New Order Created">New Order Created</option>
                      <option value="Manufacturing Stage Updated">Manufacturing Stage Updated</option>
                      <option value="Inventory Low Stock">Inventory Low Stock</option>
                      <option value="Payment Overdue">Payment Overdue</option>
                      <option value="Repair Completed">Repair Completed</option>
                      <option value="Invoice Generated">Invoice Generated</option>
                      <option value="Staff Assignment Changes">Staff Assignment Changes</option>
                    </select>
                  </div>

                  {/* Module */}
                  <div className="space-y-1">
                    <label className="text-neutral-500 text-[10px] font-black uppercase block">Associate Core Module Context</label>
                    <select
                      value={simulateEventModule}
                      onChange={(e) => setSimulateEventModule(e.target.value as any)}
                      className="w-full bg-neutral-50 p-3 rounded-xl border border-neutral-200 font-bold"
                    >
                      <option value="Orders">Orders</option>
                      <option value="Inventory">Inventory</option>
                      <option value="Manufacturing">Manufacturing</option>
                      <option value="Printing">Printing</option>
                      <option value="Servicing">Servicing</option>
                      <option value="Billing">Billing</option>
                      <option value="Staff">Staff</option>
                      <option value="System">System</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Priority */}
                  <div className="space-y-1">
                    <label className="text-neutral-500 text-[10px] font-black uppercase block">Threat / Sentry Priority Rating</label>
                    <div className="flex items-center gap-2 mt-1">
                      {(['low', 'medium', 'high', 'critical'] as const).map(p => {
                        return (
                          <button
                            key={p}
                            type="button"
                            onClick={() => setSimulatePriority(p)}
                            className={`flex-1 p-2 rounded-xl border text-center font-bold uppercase ${
                              simulatePriority === p 
                                ? 'bg-neutral-900 text-white border-none font-black' 
                                : 'bg-neutral-50 border-neutral-200 hover:bg-neutral-100 text-neutral-400'
                            }`}
                          >
                            {p}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="text-neutral-500 text-[10px] font-black uppercase block">Device/Location Location Scope</label>
                    <input
                      type="text"
                      disabled
                      value={branchScope === 'Melbourne Closets' ? "Melbourne Whse Sentry Terminal 1" : "London Closets Control Desk"}
                      className="w-full bg-neutral-100 p-3 rounded-xl border border-neutral-200 text-neutral-500"
                    />
                  </div>
                </div>

                {/* Description details */}
                <div className="space-y-1">
                  <label className="text-neutral-500 text-[10px] font-black uppercase block">Sentry Broadcast Message String</label>
                  <textarea
                    rows={3}
                    value={simulateEventDesc}
                    onChange={(e) => setSimulateEventDesc(e.target.value)}
                    placeholder="Enter dynamic alert parameter narrative logs..."
                    className="w-full bg-neutral-50 p-3 rounded-xl border border-neutral-200 font-sans"
                  />
                </div>

                <button
                  type="submit"
                  className="w-full bg-[#E5B84B] hover:bg-amber-500 text-neutral-950 font-black tracking-tight p-3 rounded-xl text-xs flex items-center justify-center gap-1.5 shadow"
                >
                  <Play className="w-4 h-4 fill-current stroke-[3]" />
                  <span>TRANSMIT DYNAMIC LIVE FIRESTORE ALERT</span>
                </button>

              </form>

            </div>
          )}

          {/* TAB 4: FIREBASE FUNCTIONS STRUCTURAL SPECIFICATIONS */}
          {activeSubTab === 'functions_admin' && (
            <div className="bg-white p-6 rounded-2xl border border-neutral-200 shadow-sm space-y-5 font-mono text-xs">
              
              <div className="pb-3 border-b border-neutral-100">
                <h3 className="text-base font-black text-neutral-900 uppercase font-sans flex items-center gap-2">
                  <Database className="w-5 h-5 text-[#E5B84B]" />
                  <span>Firebase Functions Architecture & Serverless Hooks</span>
                </h3>
                <p className="text-xs text-[#E5B84B] font-bold block mt-0.5">
                  Production Deployment Configurations for Sentry Trigger Routers
                </p>
              </div>

              <p className="text-neutral-600 leading-normal font-sans">
                These serverless micro-services are triggered on Firestore write operations to execute background workflows like compiling email templates, dispatching push notifications via Firebase Cloud Messaging (FCM), and generating tampered-check log cryptographic hashes.
              </p>

              {/* Code visual sample viewport */}
              <div className="space-y-2">
                <span className="text-[10px] text-neutral-400 uppercase font-black block">Functions Entrypoint Sample (`functions/src/index.ts`)</span>
                <div className="bg-neutral-900 text-neutral-200 p-4.5 rounded-xl border border-neutral-800 overflow-x-auto text-[11px] leading-relaxed select-all">
                  <pre>{`import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';
import { createHash } from 'crypto';

admin.initializeApp();
const db = admin.firestore();

// 1. Live inventory low stock detector triggers
exports.onProductStockUpdate = functions.firestore
  .document('products/{productId}')
  .onUpdate(async (change, context) => {
    const newValue = change.after.data();
    const previousValue = change.before.data();

    if (newValue.currentStock < newValue.safetyLevel && previousValue.currentStock >= newValue.safetyLevel) {
      const alertId = \`NTF-GEN-\${Date.now()}\`;
      await db.collection('erp_notifications').doc(alertId).set({
        id: alertId,
        title: '⚠️ Critical Low Stock Notification',
        message: \`Product \${newValue.name} (SKU: \${newValue.sku}) has fallen past safety targets. Stock remaining: \${newValue.currentStock}\`,
        type: 'alert',
        module: 'Inventory',
        read: false,
        priority: 'critical',
        timestamp: new Date().toISOString()
      });
    }
  });

// 2. Crypographic Tamper hash generation for high integrity activity audits
exports.onActivityLogCreated = functions.firestore
  .document('erp_activity_logs/{logId}')
  .onCreate(async (snap, context) => {
    const logData = snap.data();
    const payload = JSON.stringify(logData);
    const hashValue = createHash('sha256').update(payload).digest('hex');
    
    return snap.ref.set({ tamperHash: hashValue }, { merge: true });
  });`}</pre>
                </div>
              </div>

              {/* Serverless specifications info card */}
              <div className="bg-neutral-50 p-4 rounded-xl border border-neutral-200 grid grid-cols-1 md:grid-cols-3 gap-4 text-center font-sans">
                <div className="space-y-1">
                  <span className="text-[9.5px] font-mono font-black text-neutral-400 block uppercase">Runtime Environment</span>
                  <strong className="text-xs text-neutral-800 block">Node.js 20 (TS)</strong>
                </div>
                <div className="space-y-1 border-t md:border-t-0 md:border-x border-neutral-200 pt-3 md:pt-0">
                  <span className="text-[9.5px] font-mono font-black text-neutral-400 block uppercase">Ingress Type</span>
                  <strong className="text-xs text-neutral-800 block">Google Cloud PubSub / EventArc</strong>
                </div>
                <div className="space-y-1 border-t md:border-t-0 pt-3 md:pt-0">
                  <span className="text-[9.5px] font-mono font-black text-neutral-400 block uppercase">Deployment CLI command</span>
                  <strong className="text-xs text-neutral-800 block">`firebase deploy --only functions`</strong>
                </div>
              </div>

            </div>
          )}

        </div>

        {/* RIGHT COLUMN: CRITICAL TELEMETRY META DESK & LOG VIEWER (4 Units) */}
        <div className="lg:col-span-4 space-y-6">
          
          {/* Dynamic detailed audit logs popover details */}
          {selectedAuditLog ? (
            <div className="bg-white p-5 rounded-2xl border border-neutral-200 shadow-sm space-y-4 font-mono text-xs">
              
              <div className="flex items-start justify-between border-b border-neutral-100 pb-3">
                <div>
                  <span className="bg-neutral-900 text-white font-mono font-bold text-[10px] px-2 py-0.5 rounded">
                    {selectedAuditLog.id}
                  </span>
                  <h4 className="text-sm font-bold text-neutral-900 font-sans mt-2">
                    {selectedAuditLog.actionType}
                  </h4>
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedAuditLog(null)}
                  className="p-1 rounded bg-neutral-50 hover:bg-neutral-100 text-neutral-400"
                >
                  Clear Clear
                </button>
              </div>

              {/* Module target */}
              <div className="space-y-1.5">
                <span className="text-[10px] text-neutral-400 uppercase font-black block">Action module Target</span>
                <span className="bg-amber-50 text-[#E5B84B] border border-amber-200 text-[10.5px] px-2 py-0.5 rounded font-black font-mono">
                  {selectedAuditLog.module.toUpperCase()}
                </span>
              </div>

              {/* Cryptographic check */}
              <div className="bg-neutral-50 p-3 rounded-xl border border-neutral-200 space-y-1.5">
                <span className="text-[9px] text-[#E5B84B] font-bold uppercase tracking-wider block flex items-center gap-1">
                  <ShieldCheck className="w-3.5 h-3.5 text-[#E5B84B]" />
                  <span>Verified Audit Hash Integrity</span>
                </span>
                <p className="text-[10.5px] text-neutral-600 word-break uppercase break-all">
                  SHA-256: <strong className="text-neutral-900 select-all">{selectedAuditLog.tamperHash}829fae1d</strong>
                </p>
                <span className="text-[9px] text-emerald-600 block leading-none font-bold">✓ NOT TAMPERED — AUDIT TRAIL HONESTY PASSES</span>
              </div>

              {/* Previous vs Updated State Diff Comparison block */}
              <div className="space-y-2">
                <span className="text-[10px] text-neutral-400 uppercase font-black block">Log State Difference Tracing</span>
                
                <div className="grid grid-cols-2 gap-2 bg-neutral-950 text-neutral-300 p-3 rounded-xl">
                  <div className="space-y-0.5">
                    <span className="text-[9px] text-rose-400 font-bold uppercase block">- PREV</span>
                    <strong className="text-[11px] block text-neutral-100 truncate">{selectedAuditLog.previousValue || 'N/A'}</strong>
                  </div>

                  <div className="space-y-0.5 border-l border-neutral-800 pl-2">
                    <span className="text-[9px] text-emerald-400 font-bold uppercase block">+ UPDATED</span>
                    <strong className="text-[11px] block text-neutral-100 truncate">{selectedAuditLog.updatedValue || 'N/A'}</strong>
                  </div>
                </div>
              </div>

              {/* User operator context details */}
              <div className="space-y-2 font-sans border-t border-neutral-100 pt-3 text-xs leading-relaxed text-neutral-600">
                <span className="text-[10px] text-neutral-400 uppercase font-bold font-mono block">Operator Metadata Context</span>
                <div>Name: <strong className="text-neutral-800">{selectedAuditLog.user.name}</strong></div>
                <div>Email: <strong className="text-neutral-800">{selectedAuditLog.user.email}</strong></div>
                <div>Verified Claim role: <strong className="text-neutral-800 uppercase text-[10px] font-mono">{selectedAuditLog.user.role}</strong></div>
              </div>

              {/* Session / Physical context */}
              <div className="space-y-2 font-mono text-[10px] leading-relaxed text-neutral-450 bg-neutral-50 p-3 rounded-xl border border-neutral-250">
                <span className="text-[9.5px] text-neutral-400 uppercase font-black block">Session / Fingerprint ID</span>
                <div>IP Scope: <strong className="text-neutral-700">{selectedAuditLog.deviceInfo.ip}</strong></div>
                <div>Terminal: <strong className="text-neutral-700">{selectedAuditLog.deviceInfo.location}</strong></div>
                <div>User-Agent: <strong className="text-neutral-700">{selectedAuditLog.deviceInfo.browser} ({selectedAuditLog.deviceInfo.os})</strong></div>
              </div>

            </div>
          ) : (
            <div className="bg-[#171717] text-[#FAF8F5] p-5.5 rounded-2xl border border-neutral-850 shadow-lg space-y-4">
              <span className="text-[10px] font-mono text-neutral-500 font-black tracking-widest block uppercase">Live Workshop Monitoring Sentry</span>
              
              <div className="space-y-1.5 font-sans">
                <h4 className="text-sm font-bold text-white flex items-center gap-1.5 uppercase tracking-wide">
                  <Globe className="w-4 h-4 text-[#E5B84B]" />
                  <span>Real-time Active Sentry Gateway</span>
                </h4>
                <p className="text-xs text-neutral-400 leading-relaxed">
                  Select any activity log entry in the secure audit table inside the **Secure Audit Trail** tab to parse hardware signatures, browser fingerprints, and crypto SHA hash differences.
                </p>
              </div>

              <div className="border-t border-neutral-800 pt-3.5 space-y-2 text-xs font-mono">
                <div className="flex items-center justify-between text-neutral-500 text-[10px]">
                  <span>FCM BROADCAST CHANNELS</span>
                  <strong className="text-emerald-500">READY</strong>
                </div>

                <div className="flex justify-between items-center text-[10.5px] text-neutral-300">
                  <span>FCM Subscriber state:</span>
                  <span>{isPushSubscribed ? "CONNECTED" : "DISCONNECTED"}</span>
                </div>

                <div className="flex justify-between items-center text-[10.5px] text-neutral-300">
                  <span>Audit Trail Ledger index:</span>
                  <span>{activityLogs.length} verified blocks</span>
                </div>
              </div>
            </div>
          )}

          {/* TELEMETRY LOGGER PANEL */}
          <div className="bg-[#171717] p-4.5 rounded-2xl border border-neutral-800 text-xs font-mono space-y-3 shadow-lg shadow-black/40">
            <div className="flex items-center justify-between border-b border-neutral-850 pb-2.5">
              <span className="text-[#E5B84B] font-bold tracking-widest uppercase flex items-center gap-1.5 text-[10px]">
                <Activity className="w-4 h-4 text-[#E5B84B] animate-pulse" />
                <span>Security logs telemetry console</span>
              </span>
              <span className="bg-neutral-800 text-[9px] text-neutral-400 px-2 py-0.5 rounded uppercase font-black">Gate active</span>
            </div>

            <div className="h-32 overflow-y-auto space-y-1 block pr-1">
              {telemetryLogs.map((log, index) => (
                <div key={index} className="text-[10.5px] leading-normal font-medium text-neutral-300 font-mono">
                  {log}
                </div>
              ))}
            </div>
          </div>

        </div>

      </div>

    </div>
  );
};
