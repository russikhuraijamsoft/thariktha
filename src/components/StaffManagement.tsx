import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { UserRole, ROLE_DEFINITIONS } from '../types/auth';
import { 
  ShieldAlert, 
  UserPlus, 
  Search, 
  Filter, 
  UserCheck, 
  UserX, 
  Mail, 
  Briefcase, 
  MapPin, 
  Calendar,
  AlertOctagon,
  Settings2,
  Clock,
  ChevronDown
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export const StaffManagement: React.FC = () => {
  const { 
    profile, 
    staffMembers, 
    updateUserRole, 
    toggleUserProfileStatus, 
    inviteStaffMember 
  } = useAuth();

  // Guard Clause: Staff management is accessible ONLY by Super Admin
  const isSuperAdmin = profile?.roleId === 'super_admin';

  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  // Invite Modal State
  const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);
  const [inviteName, setInviteName] = useState('');
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<UserRole>('manufacturing_staff');
  const [inviteBranch, setInviteBranch] = useState('Melbourne Closets');
  const [inviteError, setInviteError] = useState<string | null>(null);
  const [inviteSuccess, setInviteSuccess] = useState<string | null>(null);

  // Role Edit Modal state
  const [editingStaffUid, setEditingStaffUid] = useState<string | null>(null);
  const [editingNewRole, setEditingNewRole] = useState<UserRole>('manufacturing_staff');

  const handleCreateInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    setInviteError(null);
    setInviteSuccess(null);

    try {
      await inviteStaffMember(inviteName, inviteEmail, inviteRole, inviteBranch);
      setInviteSuccess(`Invitation dispatch successful! Onboarding record established.`);
      setInviteName('');
      setInviteEmail('');
      setTimeout(() => {
        setIsInviteModalOpen(false);
        setInviteSuccess(null);
      }, 2000);
    } catch (err: any) {
      setInviteError(err.message || 'Error occurred while saving invite.');
    }
  };

  const handleRoleChangeSubmit = async (uid: string) => {
    try {
      await updateUserRole(uid, editingNewRole);
      setEditingStaffUid(null);
    } catch (err: any) {
      alert(err.message || "Failed to update role model.");
    }
  };

  if (!isSuperAdmin) {
    return (
      <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-8 max-w-2xl mx-auto space-y-6 text-center font-mono" id="staff-auth-guard">
        <div className="w-16 h-16 bg-red-950/40 text-red-400 border border-red-900/40 rounded-full flex items-center justify-center mx-auto">
          <ShieldAlert className="w-8 h-8" />
        </div>
        <div className="space-y-2">
          <h3 className="text-lg font-bold uppercase tracking-tight text-white">ACCESS SENTRY GATES ENFORCED</h3>
          <p className="text-xs text-neutral-400 leading-relaxed font-sans">
            Under Firestore security specification <code className="bg-neutral-950 px-1.5 py-0.5 rounded text-red-400 border border-neutral-850">rules.users_write</code>, only users authenticated carrying the exact database index custom-claim role of <strong>Super Admin</strong> are authorized to handle staff personnel directories and alter privilege controls.
          </p>
        </div>
        <div className="bg-neutral-950 p-4 rounded-xl border border-neutral-850 text-left space-y-2">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-[#E5B84B] animate-pulse"></span>
            <span className="text-[10px] text-neutral-500 uppercase tracking-widest font-black">ACTIVE SESSION DIAGNOSTICS</span>
          </div>
          <div className="grid grid-cols-2 gap-2 text-[10px] text-neutral-400">
            <div>Current Auth User: <strong className="text-neutral-200">{profile?.name}</strong></div>
            <div>Current Role: <strong className="text-red-400 uppercase">{profile?.roleId}</strong></div>
          </div>
        </div>
      </div>
    );
  }

  // Filter staff based on user settings
  const filteredStaff = staffMembers.filter(member => {
    const matchesSearch = member.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          member.email.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesRole = roleFilter === 'all' || member.roleId === roleFilter;
    const matchesStatus = statusFilter === 'all' || member.status === statusFilter;
    return matchesSearch && matchesRole && matchesStatus;
  });

  const totalCount = staffMembers.length;
  const activeCount = staffMembers.filter(s => s.status === 'active').length;
  const invitedCount = staffMembers.filter(s => s.status === 'invited').length;
  const suspendedCount = staffMembers.filter(s => s.status === 'suspended').length;

  return (
    <div className="space-y-6 font-mono" id="staff-management-panel">
      
      {/* KPI Stats Counters */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-4.5 space-y-1">
          <span className="text-[9px] text-neutral-500 uppercase font-black">GLOBAL STAFF ENLISTED</span>
          <div className="text-2xl font-black text-white">{totalCount}</div>
        </div>
        <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-4.5 space-y-1">
          <span className="text-[9px] text-emerald-500 uppercase font-black">ACTIVE EMPLOYEES</span>
          <div className="text-2xl font-black text-emerald-400">{activeCount}</div>
        </div>
        <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-4.5 space-y-1">
          <span className="text-[9px] text-amber-500 uppercase font-black">ONBOARDING DISPATCHED</span>
          <div className="text-2xl font-black text-amber-500">{invitedCount}</div>
        </div>
        <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-4.5 space-y-1">
          <span className="text-[9px] text-red-500 uppercase font-black">HOLD SUSPENSIONS</span>
          <div className="text-2xl font-black text-red-500">{suspendedCount}</div>
        </div>
      </div>

      {/* Control Actions and Search filters */}
      <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-5 space-y-4">
        
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-2.5 w-4 h-4 text-neutral-500" />
            <input 
              type="text" 
              placeholder="Search employee names, business emails..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-neutral-950 border border-neutral-800 rounded-lg p-2.5 pl-10 text-xs text-white focus:outline-none placeholder-neutral-700"
            />
          </div>

          <div className="flex flex-wrap items-center gap-3">
            
            {/* Filter by Role */}
            <div className="flex items-center gap-1 bg-neutral-950 border border-neutral-800 rounded-lg px-2 py-1">
              <Filter className="w-3 h-3 text-neutral-500" />
              <select 
                value={roleFilter}
                onChange={(e) => setRoleFilter(e.target.value)}
                className="bg-transparent text-[11px] text-neutral-300 focus:outline-none cursor-pointer"
              >
                <option value="all">Every Role</option>
                <option value="super_admin">Super Admin</option>
                <option value="manager">Branch Manager</option>
                <option value="manufacturing_staff">Manufacturing Staff</option>
                <option value="printing_staff">Printing Staff</option>
                <option value="cashier">Cashier</option>
                <option value="inventory_manager">Inventory Manager</option>
              </select>
            </div>

            {/* Filter by Status */}
            <div className="flex items-center gap-1 bg-neutral-950 border border-neutral-800 rounded-lg px-2 py-1">
              <Filter className="w-3 h-3 text-neutral-500" />
              <select 
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="bg-transparent text-[11px] text-neutral-300 focus:outline-none cursor-pointer"
              >
                <option value="all">Every Status</option>
                <option value="active">Active</option>
                <option value="invited">Invited</option>
                <option value="suspended">Suspended</option>
              </select>
            </div>

            {/* Invite Button */}
            <button 
              onClick={() => setIsInviteModalOpen(true)}
              className="bg-gradient-to-r from-amber-500 to-yellow-650 hover:from-amber-400 hover:to-yellow-550 text-neutral-950 font-bold px-4 py-2 rounded-lg text-xs tracking-wider uppercase flex items-center gap-1.5 transition-all cursor-pointer"
            >
              <UserPlus className="w-4 h-4" />
              <span>Enlist Employee</span>
            </button>

          </div>
        </div>

        {/* Staff Table Matrix */}
        <div className="border border-neutral-800 rounded-xl overflow-hidden bg-neutral-950/80">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-neutral-950 text-neutral-500 border-b border-neutral-800">
                <tr>
                  <th className="px-4 py-3">Employee Details</th>
                  <th className="px-4 py-3">Role Authorization</th>
                  <th className="px-4 py-3">Main Branch</th>
                  <th className="px-4 py-3">Last Active Check</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3 text-right">Adjustment Gates</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-850/60">
                {filteredStaff.map(member => (
                  <tr key={member.uid} className="hover:bg-neutral-900/40 text-neutral-300">
                    
                    {/* User info */}
                    <td className="px-4 py-3.5">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-full bg-neutral-900 border border-neutral-800 flex items-center justify-center font-bold text-white text-xs">
                          {member.name.charAt(0)}
                        </div>
                        <div className="space-y-0.5">
                          <h5 className="font-bold text-white leading-snug">{member.name}</h5>
                          <span className="text-[10px] text-[#E5B84B] font-mono leading-none block">{member.email}</span>
                        </div>
                      </div>
                    </td>

                    {/* Role edit interface */}
                    <td className="px-4 py-3.5">
                      {editingStaffUid === member.uid ? (
                        <div className="flex items-center gap-1.5">
                          <select 
                            value={editingNewRole}
                            onChange={(e) => setEditingNewRole(e.target.value as UserRole)}
                            className="bg-neutral-900 border border-neutral-700 rounded p-1 text-[11px] text-white focus:outline-none"
                          >
                            <option value="super_admin">Super Admin</option>
                            <option value="manager">Manager</option>
                            <option value="manufacturing_staff">Manufacturing Staff</option>
                            <option value="printing_staff">Printing Staff</option>
                            <option value="cashier">Cashier</option>
                            <option value="inventory_manager">Inventory Manager</option>
                          </select>
                          <button 
                            onClick={() => handleRoleChangeSubmit(member.uid)}
                            className="bg-emerald-500 text-neutral-950 font-bold px-2 py-1 rounded text-[10px] uppercase hover:bg-emerald-400"
                          >
                            Save
                          </button>
                          <button 
                            onClick={() => setEditingStaffUid(null)}
                            className="bg-neutral-800 text-neutral-400 px-2 py-1 rounded text-[10px] hover:text-white"
                          >
                            Cancel
                          </button>
                        </div>
                      ) : (
                        <div className="flex items-center gap-1.5 group">
                          <span className="bg-neutral-900 text-neutral-300 border border-neutral-850 px-2.5 py-1 rounded text-[10px] tracking-wide uppercase font-bold">
                            {ROLE_DEFINITIONS[member.roleId]?.name || member.roleId}
                          </span>
                          <button 
                            onClick={() => {
                              setEditingStaffUid(member.uid);
                              setEditingNewRole(member.roleId);
                            }}
                            className="text-neutral-500 group-hover:text-amber-500 hover:underline text-[10px] p-1 rounded hover:bg-neutral-900 cursor-pointer flex items-center gap-0.5"
                          >
                            <Settings2 className="w-3.5 h-3.5" />
                            <span>Modify</span>
                          </button>
                        </div>
                      )}
                    </td>

                    {/* Branch */}
                    <td className="px-4 py-3.5 text-neutral-400">
                      <div className="flex items-center gap-1 text-[11px]">
                        <MapPin className="w-3.5 h-3.5 text-neutral-500 font-bold" />
                        <span>{member.branchId}</span>
                      </div>
                    </td>

                    {/* Last Login timestamps */}
                    <td className="px-4 py-3.5 text-neutral-400 font-mono text-[10.5px]">
                      {member.lastLoginAt ? (
                        <div className="flex items-center gap-1 font-mono">
                          <Clock className="w-3.5 h-3.5 text-neutral-500" />
                          <span>{new Date(member.lastLoginAt).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
                        </div>
                      ) : (
                        <span className="text-neutral-600 block italic">Never active</span>
                      )}
                    </td>

                    {/* Status badge */}
                    <td className="px-4 py-3.5">
                      <span className={`px-2 py-0.5 rounded text-[9.5px] font-black uppercase tracking-wider ${
                        member.status === 'active' 
                          ? 'bg-emerald-950/40 text-emerald-400 border border-emerald-900/35' 
                          : member.status === 'invited'
                            ? 'bg-amber-950/40 text-amber-500 border border-amber-900/35 animate-pulse'
                            : 'bg-red-950/40 text-red-400 border border-red-900/35'
                      }`}>
                        {member.status}
                      </span>
                    </td>

                    {/* Status Toggle gates */}
                    <td className="px-4 py-3.5 text-right">
                      {member.uid === profile.uid ? (
                        <span className="text-neutral-600 text-[10px] font-mono leading-none">Self Record Locked</span>
                      ) : (
                        <div className="flex items-center justify-end gap-1.5">
                          {member.status === 'suspended' ? (
                            <button 
                              onClick={() => toggleUserProfileStatus(member.uid, 'active')}
                              className="text-emerald-400 hover:bg-emerald-950/20 border border-emerald-900/30 px-2 py-1 rounded text-[10px] uppercase font-bold cursor-pointer transition-all flex items-center gap-1"
                            >
                              <UserCheck className="w-3.5 h-3.5" />
                              <span>Reactivate</span>
                            </button>
                          ) : (
                            <button 
                              onClick={() => toggleUserProfileStatus(member.uid, 'suspended')}
                              className="text-red-400 hover:bg-red-950/20 border border-red-900/30 px-2 py-1 rounded text-[10px] uppercase font-bold cursor-pointer transition-all flex items-center gap-1"
                            >
                              <UserX className="w-3.5 h-3.5" />
                              <span>Suspend</span>
                            </button>
                          )}
                        </div>
                      )}
                    </td>

                  </tr>
                ))}

                {filteredStaff.length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-4 py-12 text-center text-neutral-500">
                      No staff records matched the specified filter criteria.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

      </div>

      {/* MODAL: DISPATCH NEW STAFF INVITATION RECORD */}
      {isInviteModalOpen && (
        <div className="fixed inset-0 z-50 bg-neutral-950/85 backdrop-blur-xs flex items-center justify-center p-4">
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-neutral-900 border border-neutral-800 rounded-2xl w-full max-w-md overflow-hidden font-mono shadow-2xl"
          >
            {/* Header */}
            <div className="px-6 py-4.5 bg-neutral-950 border-b border-neutral-800 flex items-center justify-between">
              <h4 className="text-xs font-black tracking-widest text-[#E5B84B] uppercase flex items-center gap-1.5">
                <UserPlus className="w-4 h-4 text-amber-500" />
                <span>Onboard employee record</span>
              </h4>
              <button 
                onClick={() => setIsInviteModalOpen(false)}
                className="text-neutral-400 hover:text-white"
              >
                ✕ Close
              </button>
            </div>

            {/* Form client body */}
            <form onSubmit={handleCreateInvite} className="p-6 space-y-4 text-xs text-neutral-200">
              
              {inviteError && (
                <div className="bg-red-950/30 border border-red-900/40 p-3 rounded-lg text-red-400 leading-tight">
                  {inviteError}
                </div>
              )}
              {inviteSuccess && (
                <div className="bg-emerald-950/30 border border-emerald-900/40 p-3 rounded-lg text-emerald-400 leading-tight">
                  {inviteSuccess}
                </div>
              )}

              <div className="space-y-1">
                <label className="text-[9px] text-neutral-400 font-black uppercase">Staff Member Name</label>
                <input 
                  type="text"
                  required
                  placeholder="e.g. Sunil Gavaskar"
                  value={inviteName}
                  onChange={(e) => setInviteName(e.target.value)}
                  className="w-full bg-neutral-950 border border-neutral-800 rounded p-2.5 text-xs text-white placeholder-neutral-700 focus:outline-none focus:ring-1 focus:ring-amber-500"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[9px] text-neutral-400 font-black uppercase">Business Email</label>
                <input 
                  type="email"
                  required
                  placeholder="email@cricketcloset.com"
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  className="w-full bg-neutral-950 border border-neutral-800 rounded p-2.5 text-xs text-white placeholder-neutral-700 focus:outline-none focus:ring-1 focus:ring-amber-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[9px] text-neutral-400 font-black uppercase">Role Authorization</label>
                  <select 
                    value={inviteRole}
                    onChange={(e) => setInviteRole(e.target.value as UserRole)}
                    className="w-full bg-neutral-950 border border-neutral-800 rounded p-2.5 text-xs text-white focus:outline-none"
                  >
                    <option value="super_admin">Super Admin</option>
                    <option value="manager">Branch Manager</option>
                    <option value="manufacturing_staff">Manufacturing Staff</option>
                    <option value="printing_staff">Printing Staff</option>
                    <option value="cashier">Cashier</option>
                    <option value="inventory_manager">Inventory Manager</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-[9px] text-neutral-400 font-black uppercase">Allocated Branch</label>
                  <select 
                    value={inviteBranch}
                    onChange={(e) => setInviteBranch(e.target.value)}
                    className="w-full bg-neutral-950 border border-neutral-800 rounded p-2.5 text-xs text-white focus:outline-none"
                  >
                    <option value="Melbourne Closets">Melbourne Closet</option>
                    <option value="London Closets">London Closet</option>
                  </select>
                </div>
              </div>

              <button 
                type="submit"
                className="w-full py-3 bg-gradient-to-r from-amber-500 to-yellow-650 hover:from-amber-400 hover:to-yellow-550 text-neutral-950 tracking-wider font-bold uppercase rounded"
              >
                Onboard Personnel Registry Record
              </button>

            </form>
          </motion.div>
        </div>
      )}

    </div>
  );
};
