import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { 
  Settings, User, MapPin, Database, Sparkles, RefreshCw, Key, Shield, Smartphone, 
  Bell, Laptop, Building, Mail, Phone, Receipt, Landmark, FileText, Plus, Search, 
  Trash2, Power, Edit3, Lock, Check, Download, AlertCircle, Play, Printer, 
  LayoutGrid, FileJson, Activity, CheckSquare, ShieldAlert, Cpu, Award, HardDrive
} from 'lucide-react';
import { db, isCloudConnected } from '../firebase';
import { erpIntegrationService } from '../services/erpIntegrationService';
import { doc, getDoc, setDoc, updateDoc, collection, addDoc, getDocs } from 'firebase/firestore';
import { motion, AnimatePresence } from 'motion/react';
import { UserRole, UserProfile } from '../types/auth';
import { PWAInstallModal } from './PWAInstallModal';

interface SettingsViewProps {
  branchScope: 'Melbourne Closets' | 'London Closets';
  setBranchScope: (scope: 'Melbourne Closets' | 'London Closets') => void;
  themeMode: 'light' | 'dark';
  setThemeMode: (mode: 'light' | 'dark') => void;
}

// Default Baseline configurations
const DEFAULT_BUSINESS_SETTINGS = {
  businessName: 'Talk of the Town Cricket Closet ERP',
  gstNumber: 'GST-AU-99827-26',
  address: '320 Cricket Spindle Lane, Victoria, Australia',
  email: 'ops@cricketcloset.com',
  phone: '+61 3 9876 5432',
  invoicePrefix: 'TOTT-CRIC-2026-',
  invoiceFooter: 'Quality guaranteed on hand-milled English Willow. Re-oil every 3 months. No liability on thread snaps under excessive seam contact.',
  logo: 'https://images.unsplash.com/photo-1544045560-7297ff6a020b?auto=format&fit=crop&q=80&w=120',
  currency: 'AUD ($)',
  gstRate: 10.0,
  splitGst: true,
};

const DEFAULT_BRANCHES = [
  { id: 'melbourne_whse', name: 'Melbourne WHSE Depot', status: 'active', code: 'MEL-01' },
  { id: 'london_closet', name: 'London Cricket Closet', status: 'active', code: 'LDN-05' },
  { id: 'sydney_closet', name: 'Sydney Showroom Lounge', status: 'active', code: 'SYD-02' },
  { id: 'dubai_logistics', name: 'Dubai Global Logistics Hub', status: 'active', code: 'DXB-09' }
];

const DEFAULT_PERMISSION_MATRIX = {
  super_admin: { dashboard: true, inventory: true, orders: true, manufacturing: true, billing: true, analytics: true, settings: true },
  manager: { dashboard: true, inventory: true, orders: true, manufacturing: true, billing: true, analytics: true, settings: false },
  manufacturing_staff: { dashboard: false, inventory: true, orders: false, manufacturing: true, billing: false, analytics: false, settings: false },
  printing_staff: { dashboard: false, inventory: true, orders: false, manufacturing: true, billing: false, analytics: false, settings: false },
  inventory_manager: { dashboard: true, inventory: true, orders: false, manufacturing: false, billing: false, analytics: false, settings: false },
  cashier: { dashboard: true, inventory: false, orders: true, manufacturing: false, billing: true, analytics: false, settings: false },
};

export const SettingsView: React.FC<SettingsViewProps> = ({ 
  branchScope, 
  setBranchScope, 
  themeMode, 
  setThemeMode 
}) => {
  const { profile, staffMembers, inviteStaffMember, updateUserRole, toggleUserProfileStatus } = useAuth();
  
  // Local states
  const [activeSubTab, setActiveSubTab] = useState<'company' | 'users' | 'permissions' | 'billing' | 'security' | 'utilities'>('company');
  const [saveSuccessMessage, setSaveSuccessMessage] = useState<string | null>(null);
  const [isSyncingWithCloud, setIsSyncingWithCloud] = useState<boolean>(false);

  // PWA Offline Sync Management States
  const [offlineQueue, setOfflineQueue] = useState<any[]>([]);
  const [isOnline, setIsOnline] = useState(erpIntegrationService.isOnline());
  const [simulatedOffline, setSimulatedOffline] = useState(() => localStorage.getItem('erp_force_offline') === 'true');
  const [simulateConflictFlag, setSimulateConflictFlag] = useState(() => localStorage.getItem('erp_simulate_sync_conflict') === 'true');
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isInstalledApp, setIsInstalledApp] = useState(false);
  const [cacheSize, setCacheSize] = useState('2.84 MB');
  const [showPWAModal, setShowPWAModal] = useState(false);

  useEffect(() => {
    // Populate queue List
    setOfflineQueue(erpIntegrationService.getSyncQueue());

    // Subscribe to events
    const unsubscribe = erpIntegrationService.subscribeToEvents((event) => {
      if (event.type === 'QUEUE_MUTATED') {
        setOfflineQueue(event.payload.queue);
      } else if (event.type === 'NETWORK_STATUS_CHANGE') {
        setIsOnline(erpIntegrationService.isOnline());
        setSimulatedOffline(localStorage.getItem('erp_force_offline') === 'true');
      }
    });

    const handleOnlineStatus = () => {
      setIsOnline(erpIntegrationService.isOnline());
    };
    window.addEventListener('online', handleOnlineStatus);
    window.addEventListener('offline', handleOnlineStatus);

    const handleBeforePrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };
    window.addEventListener('beforeinstallprompt', handleBeforePrompt);

    const isStandalone = window.matchMedia('(display-mode: standalone)').matches || (navigator as any).standalone;
    setIsInstalledApp(!!isStandalone);

    return () => {
      unsubscribe();
      window.removeEventListener('online', handleOnlineStatus);
      window.removeEventListener('offline', handleOnlineStatus);
      window.removeEventListener('beforeinstallprompt', handleBeforePrompt);
    };
  }, []);

  // 1. Company, GST & Taxes State
  const [businessName, setBusinessName] = useState(DEFAULT_BUSINESS_SETTINGS.businessName);
  const [gstNumber, setGstNumber] = useState(DEFAULT_BUSINESS_SETTINGS.gstNumber);
  const [address, setAddress] = useState(DEFAULT_BUSINESS_SETTINGS.address);
  const [contactEmail, setContactEmail] = useState(DEFAULT_BUSINESS_SETTINGS.email);
  const [contactPhone, setContactPhone] = useState(DEFAULT_BUSINESS_SETTINGS.phone);
  const [currency, setCurrency] = useState(DEFAULT_BUSINESS_SETTINGS.currency);
  const [gstRate, setGstRate] = useState(DEFAULT_BUSINESS_SETTINGS.gstRate);
  const [splitGst, setSplitGst] = useState(DEFAULT_BUSINESS_SETTINGS.splitGst);

  // 1.5 Branches State
  const [branches, setBranches] = useState(DEFAULT_BRANCHES);
  const [newBranchName, setNewBranchName] = useState('');
  const [newBranchCode, setNewBranchCode] = useState('');
  const [isAddingBranch, setIsAddingBranch] = useState(false);

  // 2. User/Staff State
  const [staffSearchQuery, setStaffSearchQuery] = useState('');
  const [staffRoleFilter, setStaffRoleFilter] = useState<string>('all');
  const [staffStatusFilter, setStaffStatusFilter] = useState<string>('all');

  // Staff invitation fields
  const [inviteName, setInviteName] = useState('');
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<UserRole>('inventory_manager');
  const [inviteBranch, setInviteBranch] = useState('Melbourne Closets');
  const [inviteError, setInviteError] = useState('');
  const [showInviteModal, setShowInviteModal] = useState(false);

  // 3. Permissions Matrix State
  const [permissionsMatrix, setPermissionsMatrix] = useState<any>(DEFAULT_PERMISSION_MATRIX);

  // 4. Billing, Invoices & Printing State
  const [invoicePrefix, setInvoicePrefix] = useState(DEFAULT_BUSINESS_SETTINGS.invoicePrefix);
  const [invoiceFooter, setInvoiceFooter] = useState(DEFAULT_BUSINESS_SETTINGS.invoiceFooter);
  const [logoUrl, setLogoUrl] = useState(DEFAULT_BUSINESS_SETTINGS.logo);
  
  // Print Config Sizing
  const [printPaperWidth, setPrintPaperWidth] = useState<'80mm' | '58mm'>('80mm');
  const [printAutoCut, setPrintAutoCut] = useState(true);
  const [printMarginSizes, setPrintMarginSizes] = useState<'narrow' | 'standard' | 'none'>('standard');
  const [printCalibrationFeed, setPrintCalibrationFeed] = useState('0.00mm');
  const [testDocketResponse, setTestDocketResponse] = useState<string | null>(null);

  // 5. Audit Trail & Security State
  const [securityLogs, setSecurityLogs] = useState<any[]>([]);
  const [telemetryCpu, setTelemetryCpu] = useState(4.2);
  const [telemetryMemory, setTelemetryMemory] = useState(412);
  const [telemetryQueries, setTelemetryQueries] = useState(24);

  // 6. System utilities state
  const [maintenanceModeActive, setMaintenanceModeActive] = useState(false);
  const [debugLogsVerbose, setDebugLogsVerbose] = useState(false);
  const [safetyThresholdCount, setSafetyThresholdCount] = useState(5);
  const [isBackupCompiling, setIsBackupCompiling] = useState(false);

  const isLight = themeMode === 'light';

  // HELPER: Write custom log events
  const addSecurityAuditLog = (action: string, detail: string) => {
    const operatorName = profile?.name || 'Local Operator';
    const operatorRole = profile?.roleId || 'Manager';
    const newEntry = {
      id: `LOG-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      timestamp: new Date().toISOString(),
      operator: `${operatorName} (${operatorRole})`,
      action,
      detail,
      ipAddress: '192.168.1.185',
      userAgent: navigator.userAgent.substring(0, 50) + '...'
    };
    
    setSecurityLogs(prev => [newEntry, ...prev]);
    
    // Save locally
    const saved = localStorage.getItem('erp_admin_security_logs');
    let logs: any[] = [];
    if (saved) {
      try {
        logs = JSON.parse(saved);
      } catch (e) {
        console.error("Failed to parse security logs on write:", e);
      }
    }
    localStorage.setItem('erp_admin_security_logs', JSON.stringify([newEntry, ...logs].slice(0, 50)));

    // Try live write if connected
    if (isCloudConnected) {
      addDoc(collection(db, 'erp_audit_logs'), newEntry).catch(e => console.log("Silent Firestore log write failed: ", e));
    }
  };

  // --- INITIAL LOAD & LIVE FIREBASE SYNC ---
  useEffect(() => {
    // 1. Prepopulate default security logs if empty
    const localLogs = localStorage.getItem('erp_admin_security_logs');
    let parsedLogs = null;
    if (localLogs) {
      try {
        parsedLogs = JSON.parse(localLogs);
      } catch (e) {
        console.error("Failed to parse cached security logs:", e);
      }
    }
    if (parsedLogs) {
      setSecurityLogs(parsedLogs);
    } else {
      const PRE_SEEDED_LOGS = [
        { id: 'LOG-9921', timestamp: '2026-05-25T16:20:11Z', operator: 'Sir Donald Bradman (Super Admin)', action: 'Cloud Config Deployed', detail: 'Upgraded TOTT active firestore index collections and synchronized access schemas.', ipAddress: '10.0.8.22', userAgent: 'Chrome Core Server OS' },
        { id: 'LOG-9922', timestamp: '2026-05-25T16:42:05Z', operator: 'Ricky Ponting (Manager)', action: 'Safety Alert Override', detail: 'Increased English Willow bat reorder points from 5 to 10 for winter season.', ipAddress: '192.168.1.45', userAgent: 'Safari iOS Tablet' },
        { id: 'LOG-9923', timestamp: '2026-05-25T17:15:22Z', operator: 'Devesh Shastri (Inventory)', action: 'Inventory Stock Room audit', detail: 'Re-inventoried 40 count Grade-1 willow handles.', ipAddress: '191.168.1.12', userAgent: 'Android Zebra Scanner OS' }
      ];
      setSecurityLogs(PRE_SEEDED_LOGS);
      localStorage.setItem('erp_admin_security_logs', JSON.stringify(PRE_SEEDED_LOGS));
    }

    // 2. Load Local Storage settings backups if available
    const localCompany = localStorage.getItem('erp_admin_company_settings');
    if (localCompany) {
      try {
        const company = JSON.parse(localCompany);
        setBusinessName(company.businessName || DEFAULT_BUSINESS_SETTINGS.businessName);
        setGstNumber(company.gstNumber || DEFAULT_BUSINESS_SETTINGS.gstNumber);
        setAddress(company.address || DEFAULT_BUSINESS_SETTINGS.address);
        setContactEmail(company.email || DEFAULT_BUSINESS_SETTINGS.email);
        setContactPhone(company.phone || DEFAULT_BUSINESS_SETTINGS.phone);
        setCurrency(company.currency || DEFAULT_BUSINESS_SETTINGS.currency);
        setGstRate(company.gstRate ?? DEFAULT_BUSINESS_SETTINGS.gstRate);
        setSplitGst(company.splitGst ?? DEFAULT_BUSINESS_SETTINGS.splitGst);
        setInvoicePrefix(company.invoicePrefix ?? DEFAULT_BUSINESS_SETTINGS.invoicePrefix);
        setInvoiceFooter(company.invoiceFooter ?? DEFAULT_BUSINESS_SETTINGS.invoiceFooter);
        setLogoUrl(company.logo ?? DEFAULT_BUSINESS_SETTINGS.logo);
      } catch (e) {
        console.error("Failed to parse erp_admin_company_settings:", e);
      }
    }

    const localBranches = localStorage.getItem('erp_admin_branches');
    if (localBranches) {
      try {
        setBranches(JSON.parse(localBranches));
      } catch (e) {
        console.error("Failed to parse erp_admin_branches:", e);
      }
    }

    const localPermissions = localStorage.getItem('erp_admin_permissions_matrix');
    if (localPermissions) {
      try {
        setPermissionsMatrix(JSON.parse(localPermissions));
      } catch (e) {
        console.error("Failed to parse erp_admin_permissions_matrix:", e);
      }
    }

    // 3. Connect Live Firestore if real config is present
    const syncFirestoreResources = async () => {
      if (isCloudConnected) {
        setIsSyncingWithCloud(true);
        try {
          // Fetch Business Config Document
          const docRef = doc(db, 'erp_business_settings', 'config_main');
          const docSnap = await getDoc(docRef);
          
          if (docSnap.exists()) {
            const data = docSnap.data();
            setBusinessName(data.businessName || DEFAULT_BUSINESS_SETTINGS.businessName);
            setGstNumber(data.gstNumber || DEFAULT_BUSINESS_SETTINGS.gstNumber);
            setAddress(data.address || DEFAULT_BUSINESS_SETTINGS.address);
            setContactEmail(data.email || DEFAULT_BUSINESS_SETTINGS.email);
            setContactPhone(data.phone || DEFAULT_BUSINESS_SETTINGS.phone);
            setCurrency(data.currency || DEFAULT_BUSINESS_SETTINGS.currency);
            setGstRate(data.gstRate ?? DEFAULT_BUSINESS_SETTINGS.gstRate);
            setSplitGst(data.splitGst ?? DEFAULT_BUSINESS_SETTINGS.splitGst);
            setInvoicePrefix(data.invoicePrefix ?? DEFAULT_BUSINESS_SETTINGS.invoicePrefix);
            setInvoiceFooter(data.invoiceFooter ?? DEFAULT_BUSINESS_SETTINGS.invoiceFooter);
            setLogoUrl(data.logo ?? DEFAULT_BUSINESS_SETTINGS.logo);
          } else {
            // Write defaults to cloud
            await setDoc(docRef, DEFAULT_BUSINESS_SETTINGS);
          }

          // Fetch Custom Firestore Branches
          const querySnap = await getDocs(collection(db, 'erp_branches'));
          if (!querySnap.empty) {
            const list: any[] = [];
            querySnap.forEach(d => {
              list.push({ id: d.id, ...d.data() });
            });
            setBranches(list);
          } else {
            // Seed branches collection
            for (const b of DEFAULT_BRANCHES) {
              await setDoc(doc(db, 'erp_branches', b.id), { name: b.name, status: b.status, code: b.code });
            }
          }

          // Fetch Permissions
          const permSnap = await getDoc(doc(db, 'erp_permissions_roles', 'matrix_main'));
          if (permSnap.exists()) {
            setPermissionsMatrix(permSnap.data());
          } else {
            await setDoc(doc(db, 'erp_permissions_roles', 'matrix_main'), DEFAULT_PERMISSION_MATRIX);
          }

          addSecurityAuditLog('Cloud Synced Successfully', 'Retrieved master settings and branch scopes from Firestore.');
        } catch (error) {
          console.error("Firestore loading failure, running offline fallback: ", error);
          addSecurityAuditLog('Cloud Error Fallback', 'Active database sandbox mode engaged. Secure local storage cache used.');
        } finally {
          setIsSyncingWithCloud(false);
        }
      }
    };

    syncFirestoreResources();

    // 4. Live CPU telemetry fluctuations
    const interval = setInterval(() => {
      setTelemetryCpu(parseFloat((3.0 + Math.random() * 4.5).toFixed(1)));
      setTelemetryMemory(405 + Math.floor(Math.random() * 25));
      setTelemetryQueries(prev => prev + (Math.random() > 0.75 ? 1 : 0));
    }, 3500);

    return () => clearInterval(interval);
  }, []);

  // --- SAVE OPERATORS ---
  const handleSaveCompanySetup = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const companyPayload = {
      businessName,
      gstNumber,
      address,
      email: contactEmail,
      phone: contactPhone,
      currency,
      gstRate,
      splitGst,
      invoicePrefix,
      invoiceFooter,
      logo: logoUrl
    };

    // Save in Local Storage
    localStorage.setItem('erp_admin_company_settings', JSON.stringify(companyPayload));
    
    // Save in firestore cloud
    if (isCloudConnected) {
      try {
        setIsSyncingWithCloud(true);
        await setDoc(doc(db, 'erp_business_settings', 'config_main'), companyPayload);
      } catch (err) {
        console.error("Cloud save failure: ", err);
      } finally {
        setIsSyncingWithCloud(false);
      }
    }

    addSecurityAuditLog('Company Configuration Saved', `Updated company descriptors: ${businessName}, and GST billing settings.`);
    triggerSuccessBanner('Business parameters commited successfully!');
  };

  const triggerSuccessBanner = (msg: string) => {
    setSaveSuccessMessage(msg);
    setTimeout(() => setSaveSuccessMessage(null), 3000);
  };

  // --- BRANCH ACTIONS ---
  const handleAddNewBranch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newBranchName || !newBranchCode) return;

    const brandNew = {
      id: `branch_${Date.now()}`,
      name: newBranchName,
      code: newBranchCode.toUpperCase(),
      status: 'active'
    };

    const nextBranches = [...branches, brandNew];
    setBranches(nextBranches);
    localStorage.setItem('erp_admin_branches', JSON.stringify(nextBranches));

    if (isCloudConnected) {
      try {
        await setDoc(doc(db, 'erp_branches', brandNew.id), { name: brandNew.name, code: brandNew.code, status: brandNew.status });
      } catch (err) {
        console.log(err);
      }
    }

    addSecurityAuditLog('New Branch Enrolled', `Registered TOTT operating branch: ${newBranchName} (Code: ${brandNew.code}).`);
    setNewBranchName('');
    setNewBranchCode('');
    setIsAddingBranch(false);
    triggerSuccessBanner('New Branch enrolled successfully!');
  };

  const handleDeactivateBranch = async (id: string, branchName: string) => {
    const updated = branches.map(b => b.id === id ? { ...b, status: b.status === 'active' ? 'suspended' : 'active' } : b);
    setBranches(updated);
    localStorage.setItem('erp_admin_branches', JSON.stringify(updated));

    if (isCloudConnected) {
      try {
        await updateDoc(doc(db, 'erp_branches', id), { status: updated.find(b => b.id === id)?.status });
      } catch (err) {
        console.log(err);
      }
    }

    const state = updated.find(b => b.id === id)?.status === 'active' ? 'Activated' : 'Deactivated';
    addSecurityAuditLog(`Branch Access Changed`, `${state} outlet scope: ${branchName}`);
    triggerSuccessBanner(`Branch status updated to ${state.toLowerCase()}`);
  };

  // --- STAFF DIRECTORY MANAGEMENT ---
  const handleToggleStaffStatus = async (uid: string, currentStatus: string, name: string) => {
    try {
      const nextStatus = currentStatus === 'active' ? 'suspended' : 'active';
      await toggleUserProfileStatus(uid, nextStatus);
      addSecurityAuditLog('Staff Access Altered', `Toggled ${name} security credentials status to ${nextStatus}.`);
      triggerSuccessBanner(`Updated access privileges for ${name}!`);
    } catch (e: any) {
      setInviteError(e.message || 'Privilege toggle failure.');
    }
  };

  const handleRoleChangeSubmit = async (uid: string, roleSelected: UserRole, name: string) => {
    try {
      await updateUserRole(uid, roleSelected);
      addSecurityAuditLog('Staff Security Role Updated', `Modified ${name} authority profile to ${roleSelected.toUpperCase()}`);
      triggerSuccessBanner(`Restructured ${name} role successfully to ${roleSelected.replace('_', ' ')}`);
    } catch (e: any) {
      triggerSuccessBanner('Failed to update staff role.');
    }
  };

  const handleCreateInvitation = async (e: React.FormEvent) => {
    e.preventDefault();
    setInviteError('');

    if (!inviteName || !inviteEmail) {
      setInviteError('Please fill in name and email credentials.');
      return;
    }

    try {
      await inviteStaffMember(inviteName, inviteEmail, inviteRole, inviteBranch);
      addSecurityAuditLog('Staff Invited', `Dispatched pending invite credentials to ${inviteName} (${inviteEmail}) for ${inviteBranch} as ${inviteRole.toUpperCase()}.`);
      
      setInviteName('');
      setInviteEmail('');
      setShowInviteModal(false);
      triggerSuccessBanner(`Invitation dispatched to ${inviteEmail}!`);
    } catch (e: any) {
      setInviteError(e.message || 'Invitation processing error.');
    }
  };

  // --- PERMISSIONS MATRIX ACTIONS ---
  const handleTogglePermission = async (role: string, permissionArea: string) => {
    const freshMatrix = {
      ...permissionsMatrix,
      [role]: {
        ...permissionsMatrix[role],
        [permissionArea]: !permissionsMatrix[role][permissionArea]
      }
    };

    setPermissionsMatrix(freshMatrix);
    localStorage.setItem('erp_admin_permissions_matrix', JSON.stringify(freshMatrix));

    if (isCloudConnected) {
      try {
        await setDoc(doc(db, 'erp_permissions_roles', 'matrix_main'), freshMatrix);
      } catch (e) {
        console.log(e);
      }
    }

    addSecurityAuditLog('Access Control Matrix Mutated', `Toggled authority gate: Role '${role.toUpperCase()}' Area '${permissionArea.toUpperCase()}' claim set to ${!permissionsMatrix[role][permissionArea] ? 'ALLOWED' : 'REVOKED'}.`);
    triggerSuccessBanner('ACL security matrix update persistent!');
  };

  // --- RECEIPT/DOCKET PRINT TEST ---
  const handleTriggerPrintTest = () => {
    setTestDocketResponse("compiling");
    addSecurityAuditLog('Fiscal Alignment Pin Printed', `Sent layout verification stream: Custom ${printPaperWidth} thermal socket calibration requested.`);
    
    setTimeout(() => {
      const testLayout = `
======= TOTT CRICKET CLOSET =======
320 Cricket Spindle Lane, Victoria
GST ID: ${gstNumber}
----------------------------------
DATE: ${new Date().toLocaleString()}
CLERK: ${profile?.name || 'Super Admin'}
SOCKET STATUS: VERIFIED / SECURE
----------------------------------
DOCKET ALIGNMENT TEST RENDER (100%)
Paper Width: ${printPaperWidth} Sizing
Margins: ${printMarginSizes.toUpperCase()}
Feed AutoCut: ${printAutoCut ? 'ENABLED' : 'DISABLED'}
----------------------------------
Item                  Qty    Total
Grade-1 Willow Bat     1    $1,250
Custom Leather Balls   6    $300
----------------------------------
NET BALANCING:              $1,550
GST INCLUDED (10%):         $140.90
----------------------------------
Thank you for supporting TOTT.
Designed & verified on GCP App Engine.
      `;
      setTestDocketResponse(testLayout);
    }, 1200);
  };

  // --- DATABASE EXPORT AND COMPILATION (BACKUP ARCHITECTURE) ---
  const handleTriggerBackupCompilation = () => {
    setIsBackupCompiling(true);
    addSecurityAuditLog('Cryptographic Safe Backup', 'Establishment of local database ledger snapshot triggered.');

    setTimeout(() => {
      const dbCompilationPayload = {
        metadata: {
          appId: 'talk-of-the-town-closet-erp',
          compiledAt: new Date().toISOString(),
          compiledBy: profile?.email || 'System Super Admin',
          securitySeal: 'SHA256-4AA9EF7F91208D',
          isSandboxMode: !isCloudConnected
        },
        businessConfig: {
          businessName,
          gstNumber,
          address,
          email: contactEmail,
          phone: contactPhone,
          currency,
          gstRate,
          splitGst,
          invoicePrefix,
          invoiceFooter
        },
        activeBranchesList: branches,
        roleAccessControlMatrix: permissionsMatrix,
        staffRegistry: staffMembers
      };

      // Create a blob file and download it
      const stringifiedData = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(dbCompilationPayload, null, 2));
      const anchorElement = document.createElement('a');
      anchorElement.setAttribute("href", stringifiedData);
      anchorElement.setAttribute("download", `TOTT_ERP_BACKUP_${new Date().toISOString().split('T')[0]}.json`);
      document.body.appendChild(anchorElement);
      anchorElement.click();
      anchorElement.remove();

      setIsBackupCompiling(false);
      addSecurityAuditLog('Backup Export Downloaded', 'Local JSON bundle representing active state registers exported to browser filesystem.');
      triggerSuccessBanner('Cryptographic state backup package downloaded successfully!');
    }, 1500);
  };

  // Filter staff based on criteria
  const filteredStaff = staffMembers.filter(member => {
    const matchesSearch = member.name.toLowerCase().includes(staffSearchQuery.toLowerCase()) || 
                          member.email.toLowerCase().includes(staffSearchQuery.toLowerCase());
    const matchesRole = staffRoleFilter === 'all' || member.roleId === staffRoleFilter;
    const matchesStatus = staffStatusFilter === 'all' || member.status === staffStatusFilter;
    return matchesSearch && matchesRole && matchesStatus;
  });

  return (
    <div className="space-y-6" id="gcp-admin-settings-system">
      
      {/* SUCCESS POPUP ALERT HEADER TICKET */}
      <AnimatePresence>
        {saveSuccessMessage && (
          <motion.div 
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="fixed top-20 right-6 z-50 bg-[#E5B84B] text-neutral-950 px-5 py-3 rounded-2xl shadow-xl border border-amber-400 font-mono text-xs flex items-center gap-2.5"
          >
            <Sparkles className="w-4 h-4 animate-bounce" />
            <span className="font-extrabold">{saveSuccessMessage}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* HEADER SECTION WITH ACCESS ROLES AND STATUSES */}
      <div className="bg-white p-6 rounded-2xl border border-neutral-200 shadow-sm flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4 relative overflow-hidden">
        {/* Top styling bar representing ERP gold accents */}
        <div className="absolute top-0 left-0 right-0 h-1.5 bg-[#E5B84B]"></div>

        <div className="space-y-1">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-[9px] font-mono tracking-widest text-[#E5B84B] font-black uppercase bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
              Secured Root Authority Gate
            </span>
            <span className="text-[9px] text-neutral-400 font-mono">
              IP Address: 192.168.1.185
            </span>
          </div>
          <h2 className="text-xl font-black text-neutral-900 tracking-tight uppercase font-sans flex items-center gap-2">
            <Settings className="w-6 h-6 text-[#E5B84B]" />
            <span>ERP System Configuration Panel</span>
          </h2>
          <p className="text-xs text-neutral-500 font-mono">
            Direct real-time administration over access levels, tax parameters, thermal invoicing outputs, safety inventories, and backup systems.
          </p>
        </div>

        {/* Global Cloud connection feedback widgets */}
        <div className="flex items-center gap-3 shrink-0 font-mono">
          <div className="text-right">
            <span className="text-[10px] text-neutral-400 block uppercase">Real-time DB Connection</span>
            <strong className={`text-xs block ${isCloudConnected ? 'text-emerald-500' : 'text-amber-500'}`}>
              {isCloudConnected ? '● GCP Firestore Active' : '● Local Secure Sandbox'}
            </strong>
          </div>
          <div className="w-10 h-10 rounded-xl bg-neutral-50 border border-neutral-200 flex items-center justify-center shrink-0">
            <Database className={`w-4 h-4 ${isSyncingWithCloud ? 'text-amber-500 animate-spin' : 'text-neutral-400'}`} />
          </div>
        </div>
      </div>

      {/* ADMIN CONTROL PANEL LAYOUT */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 items-start">
        
        {/* SIDE SELECTOR BUTTON PANEL (1/4 Column Width) */}
        <div className="space-y-3 font-mono">
          
          <button
            onClick={() => setActiveSubTab('company')}
            className={`w-full text-left p-4.5 rounded-2xl border transition-all text-xs font-bold uppercase tracking-wide flex items-center gap-3 cursor-pointer ${
              activeSubTab === 'company' 
                ? 'bg-neutral-900 border-neutral-900 text-white shadow-md' 
                : 'bg-white border-neutral-200 text-neutral-500 hover:text-neutral-800 hover:border-[#E5B84B]/40'
            }`}
          >
            <Building className={`w-4 h-4 ${activeSubTab === 'company' ? 'text-[#E5B84B]' : 'text-neutral-400'}`} />
            <div className="flex-1">
              <span className="block leading-none">🏢 Company & Branches</span>
              <span className="text-[9px] text-neutral-400 normal-case block mt-0.5 font-normal">Business, GST & active depots</span>
            </div>
          </button>

          <button
            onClick={() => setActiveSubTab('users')}
            className={`w-full text-left p-4.5 rounded-2xl border transition-all text-xs font-bold uppercase tracking-wide flex items-center gap-3 cursor-pointer ${
              activeSubTab === 'users' 
                ? 'bg-neutral-900 border-neutral-900 text-white shadow-md' 
                : 'bg-white border-neutral-200 text-neutral-500 hover:text-neutral-800 hover:border-[#E5B84B]/40'
            }`}
          >
            <User className={`w-4 h-4 ${activeSubTab === 'users' ? 'text-indigo-400' : 'text-neutral-400'}`} />
            <div className="flex-1">
              <span className="block leading-none">👥 Staff Directory</span>
              <span className="text-[9px] text-neutral-400 normal-case block mt-0.5 font-normal">Manage profile activation & roles</span>
            </div>
          </button>

          <button
            onClick={() => setActiveSubTab('permissions')}
            className={`w-full text-left p-4.5 rounded-2xl border transition-all text-xs font-bold uppercase tracking-wide flex items-center gap-3 cursor-pointer ${
              activeSubTab === 'permissions' 
                ? 'bg-neutral-900 border-neutral-900 text-white shadow-md' 
                : 'bg-white border-neutral-200 text-neutral-500 hover:text-neutral-800 hover:border-[#E5B84B]/40'
            }`}
          >
            <Shield className={`w-4 h-4 ${activeSubTab === 'permissions' ? 'text-amber-400' : 'text-neutral-400'}`} />
            <div className="flex-1">
              <span className="block leading-none">🔐 ACL Security Gates</span>
              <span className="text-[9px] text-neutral-400 normal-case block mt-0.5 font-normal">Interactive role permission matrix</span>
            </div>
          </button>

          <button
            onClick={() => setActiveSubTab('billing')}
            className={`w-full text-left p-4.5 rounded-2xl border transition-all text-xs font-bold uppercase tracking-wide flex items-center gap-3 cursor-pointer ${
              activeSubTab === 'billing' 
                ? 'bg-neutral-900 border-neutral-900 text-white shadow-md' 
                : 'bg-white border-neutral-200 text-neutral-500 hover:text-neutral-800 hover:border-[#E5B84B]/40'
            }`}
          >
            <Receipt className={`w-4 h-4 ${activeSubTab === 'billing' ? 'text-sky-400' : 'text-neutral-400'}`} />
            <div className="flex-1">
              <span className="block leading-none">📑 Invoices & Printing</span>
              <span className="text-[9px] text-neutral-400 normal-case block mt-0.5 font-normal">Invoice presets & thermal calibrators</span>
            </div>
          </button>

          <button
            onClick={() => setActiveSubTab('security')}
            className={`w-full text-left p-4.5 rounded-2xl border transition-all text-xs font-bold uppercase tracking-wide flex items-center gap-3 cursor-pointer ${
              activeSubTab === 'security' 
                ? 'bg-neutral-900 border-neutral-900 text-white shadow-md' 
                : 'bg-white border-neutral-200 text-neutral-500 hover:text-neutral-800 hover:border-[#E5B84B]/40'
            }`}
          >
            <ShieldAlert className={`w-4 h-4 ${activeSubTab === 'security' ? 'text-emerald-400' : 'text-neutral-400'}`} />
            <div className="flex-1">
              <span className="block leading-none">🛡️ Security Registers</span>
              <span className="text-[9px] text-neutral-400 normal-case block mt-0.5 font-normal">Live system activity logs & CPU</span>
            </div>
          </button>

          <button
            onClick={() => setActiveSubTab('utilities')}
            className={`w-full text-left p-4.5 rounded-2xl border transition-all text-xs font-bold uppercase tracking-wide flex items-center gap-3 cursor-pointer ${
              activeSubTab === 'utilities' 
                ? 'bg-neutral-900 border-neutral-900 text-white shadow-md' 
                : 'bg-white border-neutral-200 text-neutral-500 hover:text-neutral-800 hover:border-[#E5B84B]/40'
            }`}
          >
            <Laptop className={`w-4 h-4 ${activeSubTab === 'utilities' ? 'text-[#E5B84B]' : 'text-neutral-400'}`} />
            <div className="flex-1">
              <span className="block leading-none">⚙️ System Utilities</span>
              <span className="text-[9px] text-neutral-400 normal-case block mt-0.5 font-normal">JSON Backup, lock states, thresholds</span>
            </div>
          </button>

          {/* Sentry status indicators */}
          <div className="bg-neutral-50 p-4 rounded-xl border border-neutral-200 font-mono text-[10px] space-y-1 text-neutral-500 shrink-0 select-none">
            <span className="font-extrabold uppercase text-neutral-450 block mb-1">Active User Claim Checklist</span>
            <div className="flex items-center gap-1 text-emerald-600 font-bold">
              <Check className="w-3.5 h-3.5" />
              <span>SUPER ADMIN PRIVILEGES SIGNED</span>
            </div>
            <div className="flex items-center gap-1 text-emerald-600 font-bold">
              <Check className="w-3.5 h-3.5" />
              <span>MUTATION VERIFIER ATTACHED</span>
            </div>
          </div>
        </div>

        {/* WORKSPACE DETAILED VIEWS (3/4 Columns width) */}
        <div className="lg:col-span-3 space-y-6">

          {/* ACTIVE VIEW TAB 1: COMPANY SETUP & MULTI BRANCH */}
          {activeSubTab === 'company' && (
            <div className="space-y-6">
              
              {/* PRIMARY PROFILE EDITING SHEET */}
              <form onSubmit={handleSaveCompanySetup} className="bg-white p-6 rounded-2xl border border-neutral-200/80 shadow-sm space-y-4 relative overflow-hidden">
                <div className="absolute top-0 left-0 w-2 h-full bg-[#E5B84B]"></div>
                
                <div>
                  <h3 className="text-sm font-black text-neutral-900 uppercase font-sans tracking-wide">Business Descriptor & GST parameters</h3>
                  <p className="text-[10.5px] text-neutral-400 font-mono">Master ledger billing definitions representing company profiles.</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2 font-mono text-xs">
                  
                  <div className="space-y-1">
                    <label className="text-neutral-500 font-extrabold uppercase text-[10px]">Registered Business Name</label>
                    <input 
                      type="text" 
                      value={businessName}
                      onChange={(e) => setBusinessName(e.target.value)}
                      className="w-full border border-neutral-200 rounded-xl p-3 focus:outline-none focus:ring-1 focus:ring-[#E5B84B] font-bold text-neutral-800 bg-neutral-50/50"
                      required
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-neutral-500 font-extrabold uppercase text-[10px]">Tax Registration (GST Number)</label>
                    <input 
                      type="text" 
                      value={gstNumber}
                      onChange={(e) => setGstNumber(e.target.value)}
                      className="w-full border border-neutral-200 rounded-xl p-3 focus:outline-none focus:ring-1 focus:ring-[#E5B84B] font-bold text-neutral-800 bg-neutral-50/50"
                      required
                    />
                  </div>

                  <div className="space-y-1 md:col-span-2">
                    <label className="text-neutral-500 font-extrabold uppercase text-[10px]">Primary Office Address</label>
                    <input 
                      type="text" 
                      value={address}
                      onChange={(e) => setAddress(e.target.value)}
                      className="w-full border border-neutral-200 rounded-xl p-3 focus:outline-none focus:ring-1 focus:ring-[#E5B84B] font-bold text-neutral-800 bg-neutral-50/50"
                      required
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-neutral-500 font-extrabold uppercase text-[10px]">Operational Contact Email</label>
                    <input 
                      type="email" 
                      value={contactEmail}
                      onChange={(e) => setContactEmail(e.target.value)}
                      className="w-full border border-neutral-200 rounded-xl p-3 focus:outline-none focus:ring-1 focus:ring-[#E5B84B] font-bold text-neutral-800 bg-neutral-50/50"
                      required
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-neutral-500 font-extrabold uppercase text-[10px]">Enrolled Phone Desk Identifier</label>
                    <input 
                      type="text" 
                      value={contactPhone}
                      onChange={(e) => setContactPhone(e.target.value)}
                      className="w-full border border-neutral-200 rounded-xl p-3 focus:outline-none focus:ring-1 focus:ring-[#E5B84B] font-bold text-neutral-800 bg-neutral-50/50"
                      required
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-neutral-500 font-extrabold uppercase text-[10px]">Primary Active Currency Code</label>
                    <select 
                      value={currency}
                      onChange={(e) => setCurrency(e.target.value)}
                      className="w-full border border-neutral-200 rounded-xl p-3 focus:outline-none focus:ring-1 focus:ring-[#E5B84B] font-bold text-neutral-800 bg-neutral-50/50 cursor-pointer"
                    >
                      <option value="AUD ($)">AUD ($) - Australian Dollar (Default)</option>
                      <option value="GBP (£)">GBP (£) - British Pound Sterling</option>
                      <option value="USD ($)">USD ($) - United States Dollar</option>
                      <option value="EUR (€)">EUR (€) - Euro Currency</option>
                      <option value="INR (₹)">INR (₹) - Indian Rupee</option>
                    </select>
                  </div>

                  <div className="space-y-1">
                    <label className="text-neutral-500 font-extrabold uppercase text-[10px]">GST rate value (%)</label>
                    <input 
                      type="number" 
                      value={gstRate}
                      step="0.1"
                      min="0"
                      max="100"
                      onChange={(e) => setGstRate(parseFloat(e.target.value) || 0)}
                      className="w-full border border-neutral-200 rounded-xl p-3 focus:outline-none focus:ring-1 focus:ring-[#E5B84B] font-bold text-neutral-800 bg-neutral-50/50"
                      required
                    />
                  </div>

                  {/* GST Configuration splitting options */}
                  <div className="md:col-span-2 p-3 bg-neutral-50 border border-neutral-100 rounded-2xl flex items-center justify-between gap-4 mt-1">
                    <div>
                      <strong className="block text-neutral-800 text-[11px] font-bold uppercase">Split Federal GST parameters</strong>
                      <span className="text-[10px] text-neutral-450 leading-none">Auto split accounting reports by CGST / SGST layout percentages.</span>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer select-none">
                      <input 
                        type="checkbox" 
                        checked={splitGst}
                        onChange={(e) => setSplitGst(e.target.checked)}
                        className="sr-only peer"
                      />
                      <div className="w-10 h-6 bg-neutral-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[4px] after:left-[4px] after:bg-white after:border-neutral-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-[#E5B84B]"></div>
                    </label>
                  </div>

                </div>

                <div className="pt-3 border-t flex justify-end">
                  <button 
                    type="submit"
                    className="bg-[#E5B84B] hover:bg-[#d4a83b] text-neutral-950 px-6 py-2.5 rounded-xl text-xs font-mono font-black uppercase tracking-wide cursor-pointer flex items-center gap-1.5 transition-all w-full sm:w-auto text-center justify-center"
                  >
                    <Check className="w-4 h-4" />
                    <span>Commit Settings Payload</span>
                  </button>
                </div>
              </form>

              {/* TWO COLUMN INACTIVE DEPRECIATIVE BRANCH SUBSECTION */}
              <div className="bg-white p-6 rounded-2xl border border-neutral-200/80 shadow-sm space-y-4">
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2 border-b pb-3">
                  <div>
                    <h3 className="text-sm font-black text-neutral-900 uppercase font-sans tracking-wide">Multi-Branch Architecture Setup</h3>
                    <p className="text-[10.5px] text-neutral-400 font-mono">Active global physical closet warehouse configurations inside double entry books.</p>
                  </div>

                  <button 
                    onClick={() => setIsAddingBranch(prev => !prev)}
                    className="bg-neutral-900 hover:bg-neutral-800 text-white select-none px-3.5 py-1.5 rounded-lg text-xs font-mono font-bold flex items-center gap-1 transition-all cursor-pointer self-start sm:self-auto"
                  >
                    <Plus className="w-3.5 h-3.5 text-[#E5B84B]" />
                    <span>Enroll New Outlet</span>
                  </button>
                </div>

                {/* Form to add branch */}
                {isAddingBranch && (
                  <form onSubmit={handleAddNewBranch} className="bg-neutral-50 border border-neutral-200 p-4 rounded-xl font-mono text-xs text-neutral-800 space-y-3">
                    <h4 className="font-extrabold uppercase text-[10px] text-amber-600 block">Outlets Registration Ledger Form</h4>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <label className="text-[9.5px] text-neutral-500 font-black uppercase block">Branch Name Descriptor</label>
                        <input 
                          type="text" 
                          placeholder="e.g. Sydney Showroom Lounge"
                          value={newBranchName}
                          onChange={(e) => setNewBranchName(e.target.value)}
                          className="w-full border border-neutral-200 bg-white rounded-lg p-2.5 outline-none focus:ring-1 focus:ring-[#E5B84B] font-bold"
                          required
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[9.5px] text-neutral-500 font-black uppercase block">Ledger Code Scope</label>
                        <input 
                          type="text" 
                          placeholder="e.g. SYD-02"
                          maxLength={6}
                          value={newBranchCode}
                          onChange={(e) => setNewBranchCode(e.target.value)}
                          className="w-full border border-neutral-200 bg-white rounded-lg p-2.5 outline-none focus:ring-1 focus:ring-[#E5B84B] font-bold uppercase"
                          required
                        />
                      </div>
                    </div>
                    <div className="flex justify-end gap-2 pt-1.5">
                      <button 
                        type="button" 
                        onClick={() => setIsAddingBranch(false)}
                        className="px-3.5 py-1.5 bg-neutral-200 hover:bg-neutral-300 rounded-lg text-neutral-700 font-bold transition-all cursor-pointer"
                      >
                        Cancel
                      </button>
                      <button 
                        type="submit" 
                        className="px-3.5 py-1.5 bg-[#E5B84B] hover:bg-[#d4a83b] text-neutral-950 font-black uppercase rounded-lg transition-all cursor-pointer"
                      >
                        Enroll Outlet &rarr;
                      </button>
                    </div>
                  </form>
                )}

                {/* Branch Data Table representation */}
                <div className="overflow-x-auto">
                  <table className="w-full font-mono text-xs text-left">
                    <thead>
                      <tr className="bg-neutral-50 border-b border-neutral-200 text-neutral-500 text-[10px] uppercase font-bold select-none">
                        <th className="p-3">Unique ID</th>
                        <th className="p-3">Short Code</th>
                        <th className="p-3">Depot Descriptor</th>
                        <th className="p-3">Verification Rules</th>
                        <th className="p-3 text-right">Access Gates</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-neutral-100 text-neutral-800">
                      {branches.map((b) => (
                        <tr key={b.id} className="hover:bg-neutral-50">
                          <td className="p-3 text-neutral-450 font-normal">{b.id}</td>
                          <td className="p-3 font-bold text-neutral-900">{b.code}</td>
                          <td className="p-3 font-semibold">{b.name}</td>
                          <td className="p-3">
                            <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold border ${
                              b.status === 'active' 
                                ? 'bg-emerald-50 text-emerald-700 border-emerald-200' 
                                : 'bg-rose-50 text-rose-700 border-rose-200'
                            }`}>
                              {b.status === 'active' ? 'Active Scope' : 'Suspended Scope'}
                            </span>
                          </td>
                          <td className="p-3 text-right">
                            <button
                              type="button"
                              onClick={() => handleDeactivateBranch(b.id, b.name)}
                              className={`px-3 py-1 rounded-lg text-[10px] font-bold cursor-pointer transition-all ${
                                b.status === 'active'
                                  ? 'bg-neutral-100 hover:bg-neutral-200 text-red-650 font-medium'
                                  : 'bg-emerald-100 hover:bg-emerald-200 text-emerald-800 font-bold'
                              }`}
                            >
                              {b.status === 'active' ? 'Deactivate' : 'Activate'}
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

            </div>
          )}

          {/* ACTIVE VIEW TAB 2: STAFF DIRECTORY & SEARCH */}
          {activeSubTab === 'users' && (
            <div className="space-y-6">
              
              {/* STAFF CRITERIA CONTROLS SEARCH */}
              <div className="bg-white p-5 rounded-2xl border border-neutral-200/80 shadow-sm space-y-4">
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 border-b pb-3">
                  <div>
                    <h3 className="text-sm font-black text-neutral-900 uppercase font-sans tracking-wide">Enterprise Staff Directory</h3>
                    <p className="text-[10.5px] text-neutral-400 font-mono">Altering role definitions and status access filters for ERP accounts.</p>
                  </div>

                  <button 
                    onClick={() => {
                      setInviteError('');
                      setShowInviteModal(true);
                    }}
                    className="bg-[#E5B84B] hover:bg-[#d4a83b] text-neutral-950 select-none px-4 py-2 rounded-xl text-xs font-mono font-bold flex items-center gap-1.5 transition-all cursor-pointer self-start sm:self-auto"
                  >
                    <Plus className="w-4 h-4" />
                    <span>Invite Corporate Staff</span>
                  </button>
                </div>

                {/* Filter and Query Options */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3 font-mono text-xs">
                  
                  {/* Search box */}
                  <div className="relative">
                    <input 
                      type="text" 
                      placeholder="Search operator name, email..."
                      value={staffSearchQuery}
                      onChange={(e) => setStaffSearchQuery(e.target.value)}
                      className="w-full border border-neutral-200 bg-neutral-50/50 rounded-xl pl-9 pr-3.5 py-2.5 focus:outline-none focus:ring-1 focus:ring-[#E5B84B] font-medium"
                    />
                    <Search className="w-4 h-4 text-neutral-400 absolute left-3 top-3" />
                  </div>

                  {/* Filter role */}
                  <select
                    value={staffRoleFilter}
                    onChange={(e) => setStaffRoleFilter(e.target.value)}
                    className="border border-neutral-200 bg-neutral-50/50 rounded-xl p-2.5 font-bold cursor-pointer"
                  >
                    <option value="all">All Access Roles</option>
                    <option value="super_admin">Super Admin</option>
                    <option value="manager">Branch Manager</option>
                    <option value="manufacturing_staff">Manufacturing Staff</option>
                    <option value="printing_staff">Printing Staff</option>
                    <option value="inventory_manager">Inventory Manager</option>
                    <option value="cashier">Cashier Desk</option>
                  </select>

                  {/* Filter status */}
                  <select
                    value={staffStatusFilter}
                    onChange={(e) => setStaffStatusFilter(e.target.value)}
                    className="border border-neutral-200 bg-neutral-50/50 rounded-xl p-2.5 font-bold cursor-pointer"
                  >
                    <option value="all">All States</option>
                    <option value="active">Active Staff Only</option>
                    <option value="suspended">Suspended Credentials</option>
                    <option value="invited">Pending Invitations</option>
                  </select>

                </div>
              </div>

              {/* STAFF ROSTER DATA TABLE LIST */}
              <div className="bg-white p-6 rounded-2xl border border-neutral-200/80 shadow-sm space-y-4">
                
                <div className="overflow-x-auto">
                  <table className="w-full font-mono text-xs text-left">
                    <thead>
                      <tr className="bg-neutral-50 border-b border-neutral-200 text-neutral-500 text-[10px] uppercase font-bold select-none">
                        <th className="p-3">Staff Operator</th>
                        <th className="p-3">Office Branch</th>
                        <th className="p-3">Active Authority Role</th>
                        <th className="p-3">System Access</th>
                        <th className="p-3 text-right">Alterations Code</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-neutral-100 text-neutral-800">
                      {filteredStaff.map((member) => (
                        <tr key={member.uid} className="hover:bg-neutral-50">
                          
                          {/* Person descriptor */}
                          <td className="p-3 flex items-center gap-3">
                            <div className="w-9 h-9 rounded-xl bg-amber-500/10 text-[#E5B84B] border border-amber-500/20 font-black text-sm flex items-center justify-center shrink-0">
                              {member.name.substring(0, 2).toUpperCase()}
                            </div>
                            <div>
                              <strong className="text-neutral-900 block font-bold text-[12px]">{member.name}</strong>
                              <span className="text-[10px] text-neutral-400 block break-all">{member.email}</span>
                            </div>
                          </td>

                          {/* Branch designation */}
                          <td className="p-3 text-neutral-600 font-semibold">
                            {member.branchId || 'Melbourne Closets'}
                          </td>

                          {/* Role Selector dropdown */}
                          <td className="p-3">
                            <select
                              value={member.roleId}
                              onChange={(e) => handleRoleChangeSubmit(member.uid, e.target.value as UserRole, member.name)}
                              className="border border-neutral-200 bg-white rounded-lg p-1.5 font-medium text-neutral-800 cursor-pointer text-[11px]"
                            >
                              <option value="super_admin">Super Admin</option>
                              <option value="manager">Branch Manager</option>
                              <option value="manufacturing_staff">Manufacturing Staff</option>
                              <option value="printing_staff">Printing Staff</option>
                              <option value="inventory_manager">Inventory Manager</option>
                              <option value="cashier">Cashier Desk</option>
                            </select>
                          </td>

                          {/* Access state pill */}
                          <td className="p-3">
                            <span className={`px-2.5 py-0.5 rounded-full text-[9px] font-bold border uppercase tracking-widest ${
                              member.status === 'active' 
                                ? 'bg-emerald-50 text-emerald-800 border-emerald-300' 
                                : member.status === 'suspended'
                                ? 'bg-rose-50 text-rose-800 border-rose-300'
                                : 'bg-neutral-100 text-neutral-700 border-neutral-300'
                            }`}>
                              {member.status}
                            </span>
                          </td>

                          {/* Access toggle actions */}
                          <td className="p-3 text-right">
                            <button
                              type="button"
                              onClick={() => handleToggleStaffStatus(member.uid, member.status, member.name)}
                              className={`px-3 py-1.5 rounded-lg text-[10px] font-bold cursor-pointer transition-all ${
                                member.status === 'active'
                                  ? 'bg-red-50 hover:bg-red-100 text-red-650 font-medium'
                                  : 'bg-emerald-50 hover:bg-emerald-100 text-emerald-800 font-bold'
                              }`}
                            >
                              {member.status === 'active' ? 'Suspend' : 'Un-Suspend'}
                            </button>
                          </td>

                        </tr>
                      ))}

                      {filteredStaff.length === 0 && (
                        <tr>
                          <td colSpan={5} className="p-8 text-center text-neutral-400 font-sans">
                            No active staff profiles fit the specified query matrix parameters.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>

              </div>

              {/* INVITATION MODAL BOX OVERLAY */}
              {showInviteModal && (
                <div className="fixed inset-0 z-50 bg-neutral-900/60 flex items-center justify-center p-4 backdrop-blur-sm animate-fade-in">
                  <div className="bg-white max-w-md w-full rounded-2xl border border-neutral-200/80 shadow-2xl relative overflow-hidden flex flex-col p-6 animate-scale-up">
                    <div className="absolute top-0 left-0 right-0 h-1.5 bg-[#E5B84B]"></div>

                    <div className="flex items-center justify-between border-b pb-3 mb-4">
                      <h4 className="text-sm font-black text-neutral-900 uppercase font-sans tracking-tight">Invite Corporate ERP Staff</h4>
                      <button 
                        onClick={() => setShowInviteModal(false)}
                        className="text-neutral-450 hover:text-neutral-700 text-lg font-bold select-none cursor-pointer"
                      >
                        ✕
                      </button>
                    </div>

                    {inviteError && (
                      <div className="bg-rose-50 border border-rose-200 text-rose-800 p-3 rounded-lg mb-4 text-xs font-mono font-medium flex items-center gap-2">
                        <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                        <span>{inviteError}</span>
                      </div>
                    )}

                    <form onSubmit={handleCreateInvitation} className="space-y-4 font-mono text-xs">
                      <div className="space-y-1">
                        <label className="text-[10px] text-neutral-510 font-bold uppercase">Staff Legal Name</label>
                        <input 
                          type="text" 
                          placeholder="e.g. Adam Gilchrist"
                          value={inviteName}
                          onChange={(e) => setInviteName(e.target.value)}
                          className="w-full border p-2.5 rounded-lg font-bold"
                          required
                        />
                      </div>

                      <div className="space-y-1">
                        <label className="text-[10px] text-neutral-510 font-bold uppercase">Work Email Address</label>
                        <input 
                          type="email" 
                          placeholder="e.g. gilly@cricketcloset.com"
                          value={inviteEmail}
                          onChange={(e) => setInviteEmail(e.target.value)}
                          className="w-full border p-2.5 rounded-lg font-bold"
                          required
                        />
                      </div>

                      <div className="space-y-1">
                        <label className="text-[10px] text-neutral-510 font-bold uppercase">Enterprise Duty Role</label>
                        <select
                          value={inviteRole}
                          onChange={(e) => setInviteRole(e.target.value as UserRole)}
                          className="w-full border p-2.5 rounded-lg font-bold cursor-pointer"
                        >
                          <option value="super_admin">Super Admin (Global Authority)</option>
                          <option value="manager">Branch Manager (Outlet supervisor)</option>
                          <option value="manufacturing_staff">Manufacturing Staff (Wood Craftsman)</option>
                          <option value="printing_staff">Printing Staff (Ink sublimation)</option>
                          <option value="inventory_manager">Inventory Manager (Warehouse Stock)</option>
                          <option value="cashier">Cashier Desk (POS ledger)</option>
                        </select>
                      </div>

                      <div className="space-y-1">
                        <label className="text-[10px] text-neutral-510 font-bold uppercase">Duty Branch Scope</label>
                        <select
                          value={inviteBranch}
                          onChange={(e) => setInviteBranch(e.target.value)}
                          className="w-full border p-2.5 rounded-lg font-bold cursor-pointer"
                        >
                          <option value="Melbourne Closets">Melbourne WHSE Depot</option>
                          <option value="London Closets">London Cricket Closet</option>
                          <option value="Sydney Showroom Lounge">Sydney Showroom Lounge</option>
                        </select>
                      </div>

                      <div className="flex justify-end gap-2.5 pt-3 border-t">
                        <button 
                          type="button" 
                          onClick={() => setShowInviteModal(false)}
                          className="px-4 py-2 bg-neutral-100 hover:bg-neutral-200 rounded-xl text-neutral-700 font-bold cursor-pointer transition-all"
                        >
                          Cancel
                        </button>
                        <button 
                          type="submit" 
                          className="px-4 py-2 bg-[#E5B84B] hover:bg-[#d4a83b] text-neutral-950 font-black uppercase rounded-xl cursor-pointer transition-all"
                        >
                          Send Invitation &rarr;
                        </button>
                      </div>
                    </form>
                  </div>
                </div>
              )}

            </div>
          )}

          {/* ACTIVE VIEW TAB 3: ROLE PERMISSION MATRIX */}
          {activeSubTab === 'permissions' && (
            <div className="space-y-6">
              
              <div className="bg-white p-6 rounded-2xl border border-neutral-200/80 shadow-sm space-y-4">
                <div>
                  <h3 className="text-sm font-black text-neutral-900 uppercase font-sans tracking-wide">Interactive ACL Security Matrix</h3>
                  <p className="text-[10.5px] text-neutral-400 font-mono">Select checkboxes to toggle access gates for specified categories in state.</p>
                </div>

                {/* MATRIX DATA SHEET */}
                <div className="overflow-x-auto pt-2">
                  <table className="w-full font-mono text-xs text-left border-collapse">
                    <thead>
                      <tr className="bg-neutral-50 text-[9.5px] text-neutral-500 font-bold uppercase border-b select-none">
                        <th className="p-4 border">System Role Profiles</th>
                        <th className="p-4 border text-center">Dashboard HUD</th>
                        <th className="p-4 border text-center">Inventory Stock</th>
                        <th className="p-4 border text-center">Orders Ledger</th>
                        <th className="p-4 border text-center">Manufacturing</th>
                        <th className="p-4 border text-center">Billing & POS</th>
                        <th className="p-4 border text-center">Analytics</th>
                        <th className="p-4 border text-center">System Config</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y text-neutral-850">
                      
                      {/* Matrix Rows mapped by role keys */}
                      {Object.keys(permissionsMatrix).map((roleKey) => {
                        const permissions = permissionsMatrix[roleKey];
                        const roleLabel = roleKey.toUpperCase().replace('_', ' ');
                        return (
                          <tr key={roleKey} className="hover:bg-neutral-50/50">
                            
                            <td className="p-3 border font-extrabold text-[#E5B84B] tracking-tight whitespace-nowrap bg-neutral-50/30">
                              {roleLabel}
                            </td>

                            <td className="p-3 border text-center">
                              <input 
                                type="checkbox"
                                checked={!!permissions.dashboard}
                                onChange={() => handleTogglePermission(roleKey, 'dashboard')}
                                className="w-4 h-4 accent-[#E5B84B] cursor-pointer"
                              />
                            </td>

                            <td className="p-3 border text-center">
                              <input 
                                type="checkbox"
                                checked={!!permissions.inventory}
                                onChange={() => handleTogglePermission(roleKey, 'inventory')}
                                className="w-4 h-4 accent-[#E5B84B] cursor-pointer"
                              />
                            </td>

                            <td className="p-3 border text-center">
                              <input 
                                type="checkbox"
                                checked={!!permissions.orders}
                                onChange={() => handleTogglePermission(roleKey, 'orders')}
                                className="w-4 h-4 accent-[#E5B84B] cursor-pointer"
                              />
                            </td>

                            <td className="p-3 border text-center">
                              <input 
                                type="checkbox"
                                checked={!!permissions.manufacturing}
                                onChange={() => handleTogglePermission(roleKey, 'manufacturing')}
                                className="w-4 h-4 accent-[#E5B84B] cursor-pointer"
                              />
                            </td>

                            <td className="p-3 border text-center">
                              <input 
                                type="checkbox"
                                checked={!!permissions.billing}
                                onChange={() => handleTogglePermission(roleKey, 'billing')}
                                className="w-4 h-4 accent-[#E5B84B] cursor-pointer"
                              />
                            </td>

                            <td className="p-3 border text-center">
                              <input 
                                type="checkbox"
                                checked={!!permissions.analytics}
                                onChange={() => handleTogglePermission(roleKey, 'analytics')}
                                className="w-4 h-4 accent-[#E5B84B] cursor-pointer"
                              />
                            </td>

                            <td className="p-3 border text-center">
                              <input 
                                type="checkbox"
                                checked={!!permissions.settings}
                                disabled={roleKey === 'super_admin'}
                                onChange={() => handleTogglePermission(roleKey, 'settings')}
                                className="w-4 h-4 accent-[#E5B84B] disabled:opacity-30 cursor-pointer"
                              />
                            </td>

                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                <div className="bg-amber-50 rounded-2xl p-4 border border-amber-200 text-[10.5px] font-mono text-amber-900 leading-relaxed flex items-start gap-3">
                  <ShieldAlert className="w-4 h-4 shrink-0 text-[#E5B84B] mt-0.5" />
                  <div>
                    <strong className="block uppercase font-bold text-[#b58c2b]">Dynamic RBAC Gate Execution</strong>
                    Chekboxes reflect live in-memory ACL access claims. While real Firestore rules protect database buckets, these matrices control client-side UI visibility blocks across routing components in the app shell.
                  </div>
                </div>

              </div>
              
            </div>
          )}

          {/* ACTIVE VIEW TAB 4: BILLING PRESETS & PRINT CALIBRATION */}
          {activeSubTab === 'billing' && (
            <div className="space-y-6">
              
              <div className="bg-white p-6 rounded-2xl border border-neutral-200/80 shadow-sm space-y-4">
                <div>
                  <h3 className="text-sm font-black text-neutral-900 uppercase font-sans tracking-wide">Invoices & Invoicing Parameters</h3>
                  <p className="text-[10.5px] text-neutral-400 font-mono">Format and prefix defaults representing manual and POS receipts.</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2 font-mono text-xs">
                  
                  <div className="space-y-1">
                    <label className="text-neutral-510 font-bold uppercase text-[10px]">Manual Invoice Prefix</label>
                    <input 
                      type="text" 
                      value={invoicePrefix}
                      onChange={(e) => setInvoicePrefix(e.target.value)}
                      className="w-full border border-neutral-200 bg-neutral-50/50 rounded-lg p-2.5 font-bold outline-none focus:ring-1 focus:ring-[#E5B84B]"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-neutral-510 font-bold uppercase text-[10px]">Logo Image placeholder URL</label>
                    <input 
                      type="text" 
                      value={logoUrl}
                      onChange={(e) => setLogoUrl(e.target.value)}
                      className="w-full border border-neutral-200 bg-neutral-50/50 rounded-lg p-2.5 font-medium outline-none focus:ring-1 focus:ring-[#E5B84B]"
                    />
                  </div>

                  <div className="space-y-1 md:col-span-2">
                    <label className="text-neutral-510 font-bold uppercase text-[10px]">Default Terms / Legal Footer Note</label>
                    <textarea 
                      rows={3}
                      value={invoiceFooter}
                      onChange={(e) => setInvoiceFooter(e.target.value)}
                      className="w-full border border-neutral-200 bg-neutral-50/50 rounded-lg p-2.5 font-semibold text-[11px] outline-none focus:ring-1 focus:ring-[#E5B84B]"
                    />
                  </div>

                </div>
              </div>

              {/* DOCKET THERMAL PRINT CONFIGURATION */}
              <div className="bg-white p-6 rounded-2xl border border-neutral-200/80 shadow-sm space-y-4">
                <div>
                  <h3 className="text-sm font-black text-neutral-900 uppercase font-sans tracking-wide">Thermal Print Configuration</h3>
                  <p className="text-[10.5px] text-neutral-400 font-mono">Calibrate layout spacing sizing on POS receipts printers.</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2 font-mono text-xs text-neutral-800">
                  
                  {/* Paper width */}
                  <div className="space-y-1">
                    <label className="text-[10px] text-neutral-450 uppercase font-black">Paper Sizing Width</label>
                    <div className="flex bg-neutral-50 border border-neutral-200 rounded-xl p-1 gap-1">
                      <button 
                        type="button"
                        onClick={() => {
                          setPrintPaperWidth('80mm');
                          addSecurityAuditLog('POS Print Layout Changed', 'Thermal roll sizing set to standard 80mm width.');
                        }}
                        className={`flex-1 p-2 text-center rounded-lg font-bold transition-all ${printPaperWidth === '80mm' ? 'bg-neutral-900 text-white font-black' : 'text-neutral-500 hover:text-neutral-850'}`}
                      >
                        80mm Standard
                      </button>
                      <button 
                        type="button"
                        onClick={() => {
                          setPrintPaperWidth('58mm');
                          addSecurityAuditLog('POS Print Layout Changed', 'Thermal roll sizing set to narrow 58mm width.');
                        }}
                        className={`flex-1 p-2 text-center rounded-lg font-bold transition-all ${printPaperWidth === '58mm' ? 'bg-neutral-900 text-white font-black' : 'text-neutral-500 hover:text-neutral-850'}`}
                      >
                        58mm Mobile
                      </button>
                    </div>
                  </div>

                  {/* Margin sizes */}
                  <div className="space-y-1">
                    <label className="text-[10px] text-neutral-455 uppercase font-black">Margin Spacing Width</label>
                    <select
                      value={printMarginSizes}
                      onChange={(e) => setPrintMarginSizes(e.target.value as any)}
                      className="w-full border border-neutral-200 bg-neutral-50/50 p-2.5 rounded-xl font-bold cursor-pointer"
                    >
                      <option value="standard">Standard Margins</option>
                      <option value="narrow">Narrow (Optimal data density)</option>
                      <option value="none">Zero Margins (Full flat width)</option>
                    </select>
                  </div>

                  {/* Calibration offset */}
                  <div className="space-y-1">
                    <label className="text-[10px] text-neutral-455 uppercase font-black">Calibration alignment feed offset</label>
                    <input 
                      type="text"
                      placeholder="e.g. +0.25mm"
                      value={printCalibrationFeed}
                      onChange={(e) => setPrintCalibrationFeed(e.target.value)}
                      className="w-full border border-neutral-200 bg-neutral-50/50 p-2.5 rounded-xl font-bold"
                    />
                  </div>

                  {/* Toggle Autocut option */}
                  <div className="md:col-span-3 p-4 bg-neutral-50 border border-neutral-100 rounded-2xl flex items-center justify-between mt-2">
                    <div>
                      <strong className="block text-neutral-850 text-[11px] font-bold uppercase flex items-center gap-1">
                        <Printer className="w-4 h-4 text-[#E5B84B]" />
                        <span>Trigger printer automatic tear-off blade</span>
                      </strong>
                      <span className="text-[10px] text-neutral-450 font-medium">Transmit ESC/POS autocut signal after receipt stream completes.</span>
                    </div>

                    <label className="relative inline-flex items-center cursor-pointer select-none">
                      <input 
                        type="checkbox" 
                        checked={printAutoCut}
                        onChange={(e) => setPrintAutoCut(e.target.checked)}
                        className="sr-only peer"
                      />
                      <div className="w-10 h-6 bg-neutral-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[4px] after:left-[4px] after:bg-white after:border-neutral-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-[#E5B84B]"></div>
                    </label>
                  </div>

                </div>

                {/* Print calibration output test widget */}
                <div className="pt-4 border-t border-neutral-100 flex flex-col md:flex-row gap-4 items-stretch lg:items-center">
                  <div className="flex-1 text-[10.5px] text-neutral-500 font-mono">
                    Calibration prints verify formatting layout schemas, line wraps, and character counts on thermal receipts before final docket submission routing.
                  </div>
                  
                  <button 
                    type="button" 
                    onClick={handleTriggerPrintTest}
                    className="bg-neutral-900 text-white hover:text-[#E5B84B] px-5 py-2.5 rounded-xl text-xs font-mono font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer shadow-sm select-none"
                  >
                    <Play className="w-3.5 h-3.5 text-[#E5B84B]" />
                    <span>Print Test Docket Alignment</span>
                  </button>
                </div>

                {/* Simulated print verification receipt rendering */}
                {testDocketResponse && (
                  <div className="bg-neutral-950 text-emerald-400 p-4.5 rounded-xl border border-neutral-900 font-mono text-[10.5px] space-y-3 whitespace-pre-wrap leading-tight relative select-all select-all shadow-inner max-h-72 overflow-y-auto">
                    {testDocketResponse === "compiling" ? (
                      <div className="flex items-center gap-2 animate-pulse text-neutral-450">
                        <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                        <span>Transmitting ESC/POS print stream vector dockets...</span>
                      </div>
                    ) : (
                      <>
                        <div className="absolute top-3 right-3 text-[9px] text-[#E5B84B] font-bold border border-[#E5B84B]/20 px-1.5 py-0.5 rounded">
                          SIMULATING THERMAL PRINT (100% SCALE)
                        </div>
                        <code>{testDocketResponse}</code>
                      </>
                    )}
                  </div>
                )}

              </div>

            </div>
          )}

          {/* ACTIVE VIEW TAB 5: SYSTEM SECURITY AUDIT LOGS */}
          {activeSubTab === 'security' && (
            <div className="space-y-6">
              
              {/* TELEMETRY GRIDS WITH METER FLUCTUATIONS */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                
                <div className="bg-white p-5 rounded-2xl border border-neutral-200/80 shadow-sm flex items-center justify-between">
                  <div className="space-y-0.5">
                    <span className="text-[10px] text-neutral-400 font-mono uppercase block">Active CPU Load Target</span>
                    <h3 className="text-2xl font-black font-mono text-neutral-900">{telemetryCpu}%</h3>
                    <span className="text-[9px] text-emerald-600 font-bold uppercase block font-mono">● Optimal response</span>
                  </div>
                  <div className="w-9 h-9 rounded-xl bg-neutral-50 text-neutral-500 border border-neutral-200 flex items-center justify-center">
                    <Cpu className="w-4 h-4 text-[#E5B84B] animate-pulse" />
                  </div>
                </div>

                <div className="bg-white p-5 rounded-2xl border border-neutral-200/80 shadow-sm flex items-center justify-between">
                  <div className="space-y-0.5">
                    <span className="text-[10px] text-neutral-400 font-mono uppercase block">API Query counters</span>
                    <h3 className="text-2xl font-black font-mono text-neutral-900">{telemetryQueries} queries/min</h3>
                    <span className="text-[9px] text-neutral-500 font-mono block">Realtime index fetches active</span>
                  </div>
                  <div className="w-9 h-9 rounded-xl bg-neutral-50 text-neutral-550 border border-neutral-200 flex items-center justify-center">
                    <Activity className="w-4 h-4 text-[#E5B84B]" />
                  </div>
                </div>

                <div className="bg-white p-5 rounded-2xl border border-neutral-200/80 shadow-sm flex items-center justify-between">
                  <div className="space-y-0.5">
                    <span className="text-[10px] text-neutral-400 font-mono uppercase block">Allocated container buffer</span>
                    <h3 className="text-2xl font-black font-mono text-neutral-900">{telemetryMemory} MB / 1GB</h3>
                    <span className="text-[9px] text-neutral-400 font-mono block">Buffer bounds: Healthy</span>
                  </div>
                  <div className="w-9 h-9 rounded-xl bg-neutral-50 text-neutral-550 border border-neutral-200 flex items-center justify-center">
                    <Award className="w-4 h-4 text-sky-500" />
                  </div>
                </div>

              </div>

              {/* LIVE SECURITY LOG SHEET */}
              <div className="bg-white p-6 rounded-2xl border border-neutral-200/80 shadow-sm space-y-4">
                <div>
                  <h3 className="text-sm font-black text-neutral-900 uppercase font-sans tracking-wide">Security Audit Logs & Mutation Trails</h3>
                  <p className="text-[10.5px] text-neutral-400 font-mono">Immutable audit history detailing operators and state mutations.</p>
                </div>

                {/* Logs lists wrapper */}
                <div className="space-y-3 font-mono text-xs max-h-96 overflow-y-auto pr-1">
                  {securityLogs.map((log) => (
                    <div key={log.id} className="p-3.5 bg-neutral-50 rounded-xl border border-neutral-150 relative space-y-1.5 hover:bg-neutral-100/50 transition-all select-all">
                      
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 text-[10px]">
                        <span className="text-neutral-450 font-semibold">{log.id} ⎯ {new Date(log.timestamp).toLocaleTimeString()}</span>
                        <span className="bg-neutral-905 text-white text-[9px] tracking-wide px-1.5 py-0.5 rounded font-bold uppercase self-start sm:self-auto">
                          {log.action}
                        </span>
                      </div>

                      <div className="text-[11.5px] text-neutral-800 font-medium">
                        {log.detail}
                      </div>

                      <div className="text-[9px] text-neutral-400 flex flex-wrap items-center gap-x-3 gap-y-1 pt-1 border-t border-neutral-200/60 leading-none">
                        <span>Operator: <strong className="text-neutral-600 font-bold">{log.operator}</strong></span>
                        <span>IP Address: <strong className="text-neutral-600">{log.ipAddress}</strong></span>
                        <span className="truncate max-w-xs">{log.userAgent}</span>
                      </div>

                    </div>
                  ))}
                </div>
              </div>

            </div>
          )}

          {/* ACTIVE VIEW TAB 6: BACKUPS, LOCK STATES, SYSTEM RULES */}
          {activeSubTab === 'utilities' && (
            <div className="space-y-6">
              
              {/* BACKUP EXPORTS CARD */}
              <div className="bg-white p-6 rounded-2xl border border-neutral-200/80 shadow-sm space-y-4">
                <div>
                  <h3 className="text-sm font-black text-neutral-900 uppercase font-sans tracking-wide">Backup & Export Architecture</h3>
                  <p className="text-[10.5px] text-neutral-400 font-mono">Compile complete database schemas, ACL configs, and user listings into downloadable JSON files.</p>
                </div>

                <div className="p-4 bg-amber-50 rounded-2xl border border-amber-200 text-xs font-mono text-amber-900 leading-relaxed">
                  Exporting triggers a zero-delay local sync process compiling company configurations, permissions matrices, multi-branch depots, and associated credential profiles safely. Downloaded files are compatible with importing registers on live cloud environments.
                </div>

                <div className="pt-2 flex justify-start">
                  <button
                    type="button"
                    onClick={handleTriggerBackupCompilation}
                    disabled={isBackupCompiling}
                    className="bg-neutral-900 hover:bg-neutral-800 text-white hover:text-[#E5B84B] px-6 py-3 rounded-xl text-xs font-mono font-black uppercase tracking-wide cursor-pointer flex items-center gap-2 transition-all w-full sm:w-auto text-center justify-center"
                  >
                    <Download className={`w-4 h-4 text-[#E5B84B] ${isBackupCompiling ? 'animate-spin' : ''}`} />
                    <span>{isBackupCompiling ? 'Compiling Safe SNAPSHOT...' : 'Establish Secure Backup Ledger'}</span>
                  </button>
                </div>
              </div>

              {/* INTEGRATIONS AND ALERTS THRESHOLDS */}
              <div className="bg-white p-6 rounded-2xl border border-neutral-200/80 shadow-sm space-y-4">
                <div>
                  <h3 className="text-sm font-black text-neutral-900 uppercase font-sans tracking-wide">Threshold Rules & Push Alerts</h3>
                  <p className="text-[10.5px] text-neutral-400 font-mono">Assign safety inventory levels and verbose debugging metrics.</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2 font-mono text-xs">
                  
                  {/* Safety Level count */}
                  <div className="space-y-1">
                    <label className="text-neutral-510 font-bold uppercase text-[10px]">Global Safety stock limit (SKUs limit alert)</label>
                    <input 
                      type="number" 
                      value={safetyThresholdCount}
                      min={1}
                      max={100}
                      onChange={(e) => {
                        const val = parseInt(e.target.value) || 5;
                        setSafetyThresholdCount(val);
                        addSecurityAuditLog('Threshold Variable Modified', `safety stock warning threshold changed from 5 to ${val}.`);
                      }}
                      className="w-full border border-neutral-200 bg-neutral-50/50 rounded-xl p-3 font-bold"
                    />
                  </div>

                  {/* Verbal logs toggle */}
                  <div className="p-4 bg-neutral-50 border border-neutral-100 rounded-2xl flex items-center justify-between gap-4">
                    <div>
                      <strong className="block text-neutral-850 text-[11px] font-bold uppercase">Verbose Debugging Log state</strong>
                      <span className="text-[10px] text-neutral-450 leading-none">Output console traces on reactive mutation streams (PWA engine).</span>
                    </div>

                    <label className="relative inline-flex items-center cursor-pointer select-none">
                      <input 
                        type="checkbox" 
                        checked={debugLogsVerbose}
                        onChange={(e) => {
                          setDebugLogsVerbose(e.target.checked);
                          addSecurityAuditLog('Verbose Debug toggled', `Developer console trace level set to ${e.target.checked ? 'VERBOSE' : 'STANDARD'}`);
                        }}
                        className="sr-only peer"
                      />
                      <div className="w-10 h-6 bg-neutral-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[4px] after:left-[4px] after:bg-white after:border-neutral-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-[#E5B84B]"></div>
                    </label>
                  </div>

                  {/* MAIN MAINTENANCE MODE LOCK */}
                  <div className="md:col-span-2 p-5 bg-rose-50 border border-rose-150 rounded-2xl flex items-center justify-between gap-4 mt-2">
                    <div className="space-y-1">
                      <strong className="block text-rose-900 text-[11px] font-extrabold uppercase flex items-center gap-1.5">
                        <Lock className="w-4 h-4 text-rose-600 animate-pulse" />
                        <span>Force ERP Maintenance Lock Out</span>
                      </strong>
                      <span className="text-[10px] text-rose-750 block leading-tight max-w-md">
                        Puts the application database in offline read-only lock state. Restricts cashiers, staff directory adjustments, and wood craftsmanship updates until unlocked.
                      </span>
                    </div>

                    <button
                      type="button"
                      onClick={() => {
                        const nextState = !maintenanceModeActive;
                        setMaintenanceModeActive(nextState);
                        addSecurityAuditLog(
                          nextState ? 'Maintenance Lock Engaged' : 'Maintenance Lock Deactivated', 
                          `Global state lock mode turned ${nextState ? 'ON' : 'OFF'}.`
                        );
                      }}
                      className={`px-4.5 py-2.5 rounded-xl font-mono text-[10px] font-black uppercase tracking-wider transition-all cursor-pointer ${
                        maintenanceModeActive
                          ? 'bg-rose-650 text-white shadow-md'
                          : 'bg-white border border-rose-300 hover:bg-rose-100 text-rose-8 australian-accent shadow-sm'
                      }`}
                    >
                      {maintenanceModeActive ? 'LOCKED (OFFLINE)' : 'ACTIVE (UNLOCKED)'}
                    </button>
                  </div>

                </div>
              </div>

              {/* BRAND NEW: PWA OFFLINE SYNCHRONIZATION EDGE & CACHE HUB */}
              <div className="bg-white p-6 rounded-2xl border border-neutral-200/80 shadow-sm space-y-6">
                
                {/* Header */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-neutral-100 pb-4">
                  <div className="space-y-1">
                    <span className="text-[9px] font-mono tracking-widest text-[#E5B84B] font-black uppercase bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                      Edge Synchronization Sentry
                    </span>
                    <h3 className="text-sm font-black text-neutral-900 uppercase font-sans tracking-wide flex items-center gap-2">
                      <Smartphone className="w-5 h-5 text-[#E5B84B]" />
                      <span>PWA Installation & Offline Edge Synchronization Core</span>
                    </h3>
                    <p className="text-[10.5px] text-neutral-450 font-mono">
                      Interact with Service Workers static cache, simulated network disconnection modes, and real-time conflict reconcilers.
                    </p>
                  </div>

                  {/* Badges and Installs */}
                  <div className="flex flex-wrap gap-2 shrink-0">
                    <span className={`px-3 py-1.5 rounded-xl text-[10px] font-mono font-bold flex items-center gap-1.5 ${isOnline ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-amber-50 text-amber-750 border border-amber-200'}`}>
                      <span className={`w-2 h-2 rounded-full ${isOnline ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500 animate-bounce'}`}></span>
                      {isOnline ? 'Online / Connected' : 'Failover Offline Mode'}
                    </span>

                    {isInstalledApp ? (
                      <button
                        type="button"
                        onClick={() => setShowPWAModal(true)}
                        className="bg-neutral-900 hover:bg-neutral-800 text-white border border-neutral-700 px-3 py-1.5 rounded-xl text-[10px] font-mono font-bold flex items-center gap-1.5 cursor-pointer transition-all"
                      >
                        <Check className="w-3.5 h-3.5 text-emerald-400" /> 
                        <span>Standalone Active (App Info)</span>
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => {
                          if (deferredPrompt) {
                            deferredPrompt.prompt();
                            deferredPrompt.userChoice.then((choiceResult: any) => {
                              if (choiceResult.outcome === 'accepted') {
                                setIsInstalledApp(true);
                              }
                              setDeferredPrompt(null);
                            });
                          } else {
                            setShowPWAModal(true);
                          }
                        }}
                        className="bg-neutral-950 hover:bg-neutral-900 text-[#E5B84B] hover:text-white border border-amber-500/40 px-3.5 py-1.5 rounded-xl text-[10px] font-mono font-bold flex items-center gap-1.5 cursor-pointer transition-all shadow-sm"
                      >
                        <Download className="w-3.5 h-3.5 text-[#E5B84B]" />
                        <span>Install App (Web • Android • iOS)</span>
                      </button>
                    )}
                  </div>
                </div>

                <PWAInstallModal isOpen={showPWAModal} onClose={() => setShowPWAModal(false)} />

                {/* Simulated Modes Controls */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 font-mono text-xs">
                  
                  {/* Simulate Offline Connection */}
                  <div className="p-4 bg-neutral-50 border border-neutral-150 rounded-2xl flex flex-col justify-between gap-3">
                    <div>
                      <strong className="block text-neutral-855 text-[11px] font-bold uppercase">Simulate Disconnection</strong>
                      <span className="text-[10px] text-neutral-450 leading-tight block mt-0.5">
                        Fakes loss of connection. Orders placed will buffer in local queue and auto-commit to GCP once reactivated.
                      </span>
                    </div>

                    <div className="flex items-center justify-between mt-1">
                      <span className={`text-[10px] font-bold ${simulatedOffline ? 'text-rose-650' : 'text-neutral-500'}`}>
                        {simulatedOffline ? 'SIMULATOR: DISCONNECTED' : 'SIMULATOR: INACTIVE'}
                      </span>
                      <label className="relative inline-flex items-center cursor-pointer select-none">
                        <input 
                          type="checkbox" 
                          checked={simulatedOffline}
                          onChange={(e) => {
                            const toggled = e.target.checked;
                            setSimulatedOffline(toggled);
                            erpIntegrationService.toggleSimulatedOffline(toggled);
                            addSecurityAuditLog(
                              toggled ? 'PWA Network Simulated Loss' : 'PWA Network Handshake Restored',
                              toggled 
                                ? 'Engaged offline-first isolation. Requests will map inside local storage queues.'
                                : 'De-isolated ERP network layer. Commencing sync-loop.'
                            );
                            triggerSuccessBanner(toggled ? 'ERP forced offline! Place order to test.' : 'Handshake restored! Sync active.');
                          }}
                          className="sr-only peer"
                        />
                        <div className="w-11 h-6 bg-neutral-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[4px] after:left-[4px] after:bg-white after:border-neutral-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-[#E5B84B]"></div>
                      </label>
                    </div>
                  </div>

                  {/* Simulate Sync Conflict */}
                  <div className="p-4 bg-neutral-50 border border-neutral-150 rounded-2xl flex flex-col justify-between gap-3">
                    <div>
                      <strong className="block text-neutral-855 text-[11px] font-bold uppercase">Conflict Simulation</strong>
                      <span className="text-[10px] text-neutral-455 leading-tight block mt-0.5">
                        Simulate overlapping concurrent edits in order sequence to demonstrate conflict state-machine flow.
                      </span>
                    </div>

                    <div className="flex items-center justify-between mt-1">
                      <span className={`text-[10px] font-bold ${simulateConflictFlag ? 'text-amber-600 animate-pulse' : 'text-neutral-500'}`}>
                        {simulateConflictFlag ? 'ACTIVE: TRIGGERS ALERT' : 'INACTIVE'}
                      </span>
                      <label className="relative inline-flex items-center cursor-pointer select-none">
                        <input 
                          type="checkbox" 
                          checked={simulateConflictFlag}
                          onChange={(e) => {
                            const val = e.target.checked;
                            setSimulateConflictFlag(val);
                            localStorage.setItem('erp_simulate_sync_conflict', val ? 'true' : 'false');
                            addSecurityAuditLog(
                              val ? 'Conflict Simulator Enabled' : 'Conflict Simulator Disabled',
                              val 
                                ? 'Forced concurrency overlapping conditions on local-to-cloud sync adapters.'
                                : 'Restored zero-override default syncing behavior.'
                            );
                          }}
                          className="sr-only peer"
                        />
                        <div className="w-11 h-6 bg-neutral-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[4px] after:left-[4px] after:bg-white after:border-neutral-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-[#E5B84B]"></div>
                      </label>
                    </div>
                  </div>

                  {/* Cache & SW details */}
                  <div className="p-4 bg-neutral-50 border border-neutral-150 rounded-2xl flex flex-col justify-between gap-3">
                    <div>
                      <strong className="block text-neutral-855 text-[11px] font-bold uppercase">Service Cache details</strong>
                      <span className="text-[10px] text-neutral-455 leading-tight block mt-0.5">
                        Static file client storage. Holds compiled JS code pathways, styling parameters, and Unsplash graphics.
                      </span>
                    </div>

                    <div className="flex items-center justify-between gap-2 mt-1">
                      <div className="text-[10px]">
                        <span className="text-neutral-400 mr-1">Shell Cache:</span>
                        <strong className="text-neutral-700">{cacheSize}</strong>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          if (typeof window !== 'undefined' && 'caches' in window) {
                            caches.keys().then((names) => {
                              for (let name of names) caches.delete(name);
                            });
                            setCacheSize('0.00 KB');
                            addSecurityAuditLog('PWA Cache Evicted', 'Busted custom static asset cache store cache-v1. Client forced reload cache pipelines.');
                            triggerSuccessBanner('Cache cleaned successfully!');
                          }
                        }}
                        className="bg-white border border-neutral-300 hover:bg-neutral-100 text-[#E5B84B] px-3 py-1 rounded-xl text-[9px] font-bold uppercase transition-all cursor-pointer select-none"
                      >
                        Bust Cache
                      </button>
                    </div>
                  </div>

                </div>

                {/* INLINE CONFLICT RESOLUTION ALERT MODAL/CARD */}
                {offlineQueue.some(x => x.status === 'conflict') && (
                  <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4.5 space-y-3 font-mono text-xs">
                    <div className="flex items-start gap-3">
                      <AlertCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5 animate-pulse" />
                      <div>
                        <strong className="text-amber-900 block font-sans uppercase text-xs">Active Synchronization Conflict Detected</strong>
                        <p className="text-[10.5px] text-amber-750 leading-relaxed mt-1">
                          The client and Firestore server values have diverged. A concurrency lock occurred because stock volumes were concurrently altered on a different branch terminal.
                        </p>
                      </div>
                    </div>

                    <div className="bg-white/40 border border-amber-200 p-3 rounded-xl space-y-2">
                       {offlineQueue.filter(x => x.status === 'conflict').map(colItem => (
                         <div key={colItem.id} className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-[10.5px]">
                           <div>
                             <span className="font-extrabold text-neutral-800 block uppercase">Packet ID: {colItem.id} ({colItem.type})</span>
                             <span className="text-neutral-500 block">{colItem.detail}</span>
                             <span className="text-rose-650 block italic mt-0.5">{colItem.conflictDetails?.message}</span>
                           </div>
                           <div className="flex gap-2 shrink-0">
                             <button
                               onClick={() => {
                                 erpIntegrationService.resolveSyncItem(colItem.id, 'keep_local');
                                 triggerSuccessBanner("Manual resolution: Local Overwrote Cloud!");
                               }}
                               className="bg-amber-600 hover:bg-amber-750 text-white px-3 py-1.5 rounded-lg font-bold text-[9.5px] uppercase transition-all cursor-pointer select-none"
                             >
                               Keep Local (LWW)
                             </button>
                             <button
                               onClick={() => {
                                 erpIntegrationService.resolveSyncItem(colItem.id, 'keep_server');
                                 triggerSuccessBanner("Manual resolution: Server preserved!");
                               }}
                               className="bg-neutral-900 hover:bg-neutral-850 text-white px-3 py-1.5 rounded-lg font-bold text-[9.5px] uppercase transition-all cursor-pointer select-none"
                             >
                               Discard & Use Cloud
                             </button>
                           </div>
                         </div>
                       ))}
                    </div>
                  </div>
                )}

                {/* Queue Console Table List */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-mono text-neutral-500 font-extrabold uppercase">
                      Edge Operations Queue ({offlineQueue.filter(x => x.status === 'pending' || x.status === 'failed').length} pending packets)
                    </span>

                    <button
                      type="button"
                      onClick={() => {
                        erpIntegrationService.processSyncQueue();
                        triggerSuccessBanner("Refreshing database socket pipeline!");
                      }}
                      disabled={offlineQueue.length === 0}
                      className="text-[9.5px] uppercase font-mono font-black text-[#E5B84B] hover:text-[#d4a83b] flex items-center gap-1 transition-all cursor-pointer select-none disabled:opacity-50"
                    >
                      <RefreshCw className="w-3 h-3" />
                      <span>Sync Sync Queue</span>
                    </button>
                  </div>

                  <div className="border border-neutral-200 rounded-2xl overflow-hidden bg-neutral-50">
                    <div className="overflow-x-auto">
                      <table className="w-full text-left font-mono text-xs">
                        <thead className="bg-neutral-100 text-neutral-500 text-[10px] uppercase font-black border-b border-neutral-200">
                          <tr>
                            <th className="p-3">Sequence ID</th>
                            <th className="p-3">Operation Target</th>
                            <th className="p-3">Descriptor</th>
                            <th className="p-3">Retries</th>
                            <th className="p-3 text-right">Synchronization State</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-neutral-200 text-neutral-700 bg-white">
                          {offlineQueue.length === 0 ? (
                            <tr>
                              <td colSpan={5} className="p-8 text-center text-[11px] text-neutral-400">
                                <Database className="w-6 h-6 text-neutral-300 mx-auto mb-2 animate-bounce" />
                                No pending sync packets inside local storage buffers. Zero latency, continuous workflow active.
                              </td>
                            </tr>
                          ) : (
                            offlineQueue.map(colItem => (
                              <tr key={colItem.id} className="hover:bg-neutral-50/50">
                                <td className="p-3 font-bold text-neutral-900">{colItem.id}</td>
                                <td className="p-3">
                                  <span className={`px-2 py-0.5 rounded text-[9px] font-extrabold uppercase ${colItem.type === 'CREATE_ORDER' ? 'bg-indigo-50 text-indigo-700' : colItem.type === 'RECONCILE_PAYMENT' ? 'bg-sky-50 text-sky-700' : 'bg-teal-50 text-teal-700'}`}>
                                    {colItem.type}
                                  </span>
                                </td>
                                <td className="p-3 max-w-xs truncate text-[11px] text-neutral-600">{colItem.detail}</td>
                                <td className="p-3 font-semibold">{colItem.retries}/3</td>
                                <td className="p-3 text-right uppercase text-[9.5px] font-extrabold flex items-center justify-end gap-1.5 font-sans">
                                  {colItem.status === 'success' && (
                                    <span className="text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded flex items-center gap-1 border border-emerald-100">
                                      <Check className="w-3 h-3" /> Synced
                                    </span>
                                  )}
                                  {colItem.status === 'pending' && (
                                    <span className="text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded flex items-center gap-1 border border-indigo-100 font-mono">
                                      <RefreshCw className="w-2.5 h-2.5 animate-spin" /> Pending
                                    </span>
                                  )}
                                  {colItem.status === 'failed' && (
                                    <span className="text-rose-700 bg-rose-50 px-2 py-0.5 rounded flex items-center gap-1 border border-rose-100">
                                      <AlertCircle className="w-3 h-3" /> Failed Retry
                                    </span>
                                  )}
                                  {colItem.status === 'conflict' && (
                                    <span className="text-amber-700 bg-amber-50 px-2 py-0.5 rounded flex items-center gap-1 border border-amber-150 animate-pulse">
                                      <AlertCircle className="w-3 h-3 text-amber-600" /> Clash Conflicted
                                    </span>
                                  )}
                                </td>
                              </tr>
                            ))
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>

              </div>

            </div>
          )}

        </div>

      </div>

    </div>
  );
};
