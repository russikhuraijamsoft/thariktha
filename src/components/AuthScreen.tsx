import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { UserRole, ROLE_DEFINITIONS } from '../types/auth';
import { 
  Trophy, 
  Mail, 
  Lock, 
  User, 
  ArrowRight, 
  RefreshCw, 
  AlertTriangle,
  Github,
  Globe,
  Sparkles,
  Award,
  Users2,
  LockKeyhole,
  Building,
  CheckCircle2,
  ShieldCheck
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export const AuthScreen: React.FC = () => {
  const { login, register, resetPassword, loginWithGoogle, isSandboxMode } = useAuth();
  
  const [isLoginView, setIsLoginView] = useState<boolean>(true);
  const [isResetView, setIsResetView] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [localLoading, setLocalLoading] = useState<boolean>(false);

  // Form States
  const [email, setEmail] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [name, setName] = useState<string>('');
  const [selectedRole, setSelectedRole] = useState<UserRole>('manufacturing_staff');
  const [branch, setBranch] = useState<string>('Melbourne Closets');

  // Interactive quick test logins shortcuts
  const CREDENTIAL_PRESETS = [
    { email: 'super_admin_guru@cricketcloset.com', role: 'Super Admin', pass: 'admin123', label: 'Super Admin' },
    { email: 'melbourne_mgr@cricketcloset.com', role: 'Branch Manager', pass: 'manager123', label: 'Branch Manager' },
    { email: 'craftsman_sharma@cricketcloset.com', role: 'Craftsman Group', pass: 'craftsman123', label: 'Manufacturing Staff' },
    { email: 'printer_sarah@cricketcloset.com', role: 'Silkscreen Pro', pass: 'printer123', label: 'Printing Staff' },
    { email: 'cashier_clara@cricketcloset.com', role: 'Audit Ledger', pass: 'cashier123', label: 'Cashier' },
    { email: 'inventory_kane@cricketcloset.com', role: 'Stock Manager', pass: 'inventory123', label: 'Inventory Manager' }
  ];

  const handleApplyPreset = (emailVal: string, passVal: string) => {
    setEmail(emailVal);
    setPassword(passVal);
    setErrorMsg(null);
    setSuccessMsg(`Preset credentials copied. Click 'Authenticate Securely' below.`);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);
    setLocalLoading(true);

    try {
      if (isResetView) {
        if (!email) throw new Error("Please specify your registered account email first.");
        await resetPassword(email);
        setSuccessMsg(`Failsafe: Password reset dispatch sequence completed! Check instructions.`);
        setIsResetView(false);
      } else if (isLoginView) {
        await login(email, password);
      } else {
        await register(email, password, name, selectedRole, branch);
      }
    } catch (e: any) {
      setErrorMsg(e.message || "An authentication error occurred.");
    } finally {
      setLocalLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-neutral-950 flex flex-col md:flex-row items-center justify-center p-4 lg:p-8 font-sans antialiased text-neutral-100 selection:bg-amber-500 selection:text-neutral-900" id="auth-grid-split">
      
      {/* Dynamic left branding card */}
      <div className="w-full md:w-1/2 p-6 lg:p-12 space-y-6 flex flex-col justify-between self-stretch bg-gradient-to-br from-neutral-900 via-neutral-950 to-neutral-950 border border-neutral-800 rounded-2xl md:rounded-r-none md:border-r-0 md:rounded-l-2xl shadow-xl md:shadow-none min-h-[400px] md:min-h-0">
        
        {/* Dynamic Header */}
        <div className="flex items-center gap-4">
          <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-amber-400 to-yellow-600 flex items-center justify-center text-neutral-950">
            <Trophy className="w-5.5 h-5.5 stroke-[2.5]" />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="text-[9px] font-mono tracking-widest text-amber-500 font-bold uppercase bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20">Production ERP</span>
            </div>
            <h1 className="text-md font-black tracking-tight text-white uppercase font-mono">Talk of the Town</h1>
          </div>
        </div>

        {/* Features Carousel Display */}
        <div className="space-y-4">
          <span className="text-[#E5B84B] text-[10px] font-mono tracking-widest font-black uppercase bg-[#E5B84B]/10 px-2.5 py-1 rounded-full border border-[#E5B84B]/20">
            🔐 Secure RBAC Authentication
          </span>
          <h2 className="text-2xl lg:text-3xl font-black text-white tracking-tight leading-tight uppercase font-mono">
            CRICKET CLOSET SECURED PORTAL
          </h2>
          <p className="text-xs text-neutral-400 font-mono leading-relaxed max-w-lg">
            Authorized staff login for custom English Willow hand-mill queue parameters, multi-branch bookkeeping accounts, jersey sublimations vectors, and real-time stock alerts.
          </p>

          <div className="grid grid-cols-2 gap-3 pt-3">
            <div className="bg-neutral-900/40 p-3 rounded-xl border border-neutral-850 space-y-1">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              <span className="text-[10px] font-bold block text-neutral-350 font-mono uppercase">Firestore rules</span>
              <span className="text-[9px] text-neutral-500 font-mono">Pillar hardened ABAC model</span>
            </div>
            <div className="bg-neutral-900/40 p-3 rounded-xl border border-neutral-850 space-y-1">
              <Users2 className="w-4 h-4 text-amber-400" />
              <span className="text-[10px] font-bold block text-neutral-350 font-mono uppercase">Role-Bound Gates</span>
              <span className="text-[9px] text-neutral-500 font-mono">6 distinct operational mappings</span>
            </div>
          </div>
        </div>

        {/* Status indicator bottom */}
        <div className="bg-neutral-950 p-3 rounded-xl border border-neutral-850 text-[10px] font-mono flex items-center justify-between text-neutral-500">
          <span className="flex items-center gap-1.5 leading-none">
            <Globe className="w-3.5 h-3.5 text-neutral-500" />
            <span>Connection State:</span>
          </span>
          <span className={`font-bold flex items-center gap-1 ${isSandboxMode ? 'text-amber-500' : 'text-emerald-500 animate-pulse'}`}>
            <span className={`w-1.5 h-1.5 rounded-full ${isSandboxMode ? 'bg-amber-500' : 'bg-emerald-500'}`}></span>
            {isSandboxMode ? 'LOCAL SECURE SANDBOX' : 'LIVE FIREBASE CLOUD'}
          </span>
        </div>

      </div>

      {/* Auth visual panel right */}
      <div className="w-full md:w-1/2 p-6 lg:p-12 self-stretch flex flex-col justify-center bg-neutral-900 border border-neutral-800 rounded-2xl md:rounded-l-none md:rounded-r-2xl shadow-xl max-w-lg md:max-w-none">
        
        <div className="space-y-6">
          
          <div className="space-y-1">
            <h3 className="text-xl font-bold font-mono tracking-tight uppercase text-white">
              {isResetView ? 'Password Recovery' : isLoginView ? 'Authenticate Credentials' : 'Staff Onboarding'}
            </h3>
            <p className="text-[11px] text-neutral-400 font-mono leading-none">
              {isResetView 
                ? 'Enter your email to dispatch reset credentials instructions.' 
                : isLoginView 
                  ? 'Access sports ERP database ledger coordinates.' 
                  : 'Establish active employee records securely.'}
            </p>
          </div>

          {/* Feedback Blocks */}
          <AnimatePresence mode="wait">
            {errorMsg && (
              <motion.div 
                initial={{ opacity: 0, y: -5 }} 
                animate={{ opacity: 1, y: 0 }} 
                exit={{ opacity: 0 }}
                className="bg-red-950/20 border border-red-900/40 p-3 rounded-lg flex items-start gap-2.5 text-[11px] text-red-400 font-mono"
              >
                <AlertTriangle className="w-4.5 h-4.5 shrink-0 text-red-400" />
                <span className="leading-tight">{errorMsg}</span>
              </motion.div>
            )}
            {successMsg && (
              <motion.div 
                initial={{ opacity: 0, y: -5 }} 
                animate={{ opacity: 1, y: 0 }} 
                exit={{ opacity: 0 }}
                className="bg-emerald-950/20 border border-emerald-900/40 p-3 rounded-lg flex items-start gap-2.5 text-[11px] text-emerald-400 font-mono"
              >
                <CheckCircle2 className="w-4.5 h-4.5 shrink-0 text-emerald-400" />
                <span className="leading-tight">{successMsg}</span>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Core Input Form */}
          <form onSubmit={handleSubmit} className="space-y-4 text-xs font-mono">
            
            <AnimatePresence mode="wait">
              {!isResetView && !isLoginView && (
                <motion.div 
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="space-y-4 overflow-hidden"
                >
                  {/* Name field */}
                  <div className="space-y-1">
                    <label className="text-[10px] text-neutral-500 font-black uppercase">Full Employee Name</label>
                    <div className="relative">
                      <User className="absolute left-3 top-2.5 w-4 h-4 text-neutral-600" />
                      <input 
                        type="text" 
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder="e.g. Kapil Dev"
                        className="w-full bg-neutral-950 border border-neutral-800 rounded-lg p-2.5 pl-10 text-xs text-white focus:ring-1 focus:ring-amber-500 focus:outline-none placeholder-neutral-700"
                        required={!isLoginView && !isResetView}
                      />
                    </div>
                  </div>

                  {/* Branch & Role selection during registration */}
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="text-[10px] text-neutral-500 font-black uppercase">Initial ERP Role</label>
                      <div className="relative">
                        <Building className="absolute left-3 top-2.5 w-4 h-4 text-neutral-600" />
                        <select 
                          value={selectedRole}
                          onChange={(e) => setSelectedRole(e.target.value as UserRole)}
                          className="w-full bg-neutral-950 border border-neutral-800 rounded-lg p-2.5 pl-10 text-xs text-white focus:outline-none"
                        >
                          <option value="super_admin">Super Admin</option>
                          <option value="manager">Branch Manager</option>
                          <option value="manufacturing_staff">Manufacturing Staff</option>
                          <option value="printing_staff">Printing Staff</option>
                          <option value="cashier">Cashier</option>
                          <option value="inventory_manager">Inventory Manager</option>
                        </select>
                      </div>
                    </div>

                    <div className="space-y-1">
                      <label className="text-[10px] text-neutral-500 font-black uppercase">Primary Branch Location</label>
                      <div className="relative">
                        <Building className="absolute left-3 top-2.5 w-4 h-4 text-neutral-600" />
                        <select 
                          value={branch}
                          onChange={(e) => setBranch(e.target.value)}
                          className="w-full bg-neutral-950 border border-neutral-800 rounded-lg p-2.5 pl-10 text-xs text-white focus:outline-none"
                        >
                          <option value="Melbourne Closets">Melbourne Closet</option>
                          <option value="London Closets">London Closet</option>
                        </select>
                      </div>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Email field */}
            <div className="space-y-1">
              <label className="text-[10px] text-neutral-500 font-black uppercase">Business Email</label>
              <div className="relative">
                <Mail className="absolute left-3 top-2.5 w-4 h-4 text-neutral-600" />
                <input 
                  type="email" 
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@cricketcloset.com"
                  className="w-full bg-neutral-950 border border-neutral-800 rounded-lg p-2.5 pl-10 text-xs text-white focus:ring-1 focus:ring-amber-500 focus:outline-none placeholder-neutral-700"
                  required
                />
              </div>
            </div>

            {/* Password field */}
            <AnimatePresence mode="wait">
              {!isResetView && (
                <motion.div 
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="space-y-1 overflow-hidden"
                >
                  <div className="flex justify-between items-center">
                    <label className="text-[10px] text-neutral-500 font-black uppercase">Secret Password</label>
                    {isLoginView && (
                      <button 
                        type="button" 
                        onClick={() => setIsResetView(true)}
                        className="text-[9px] text-[#E5B84B] hover:underline"
                      >
                        Forgot password?
                      </button>
                    )}
                  </div>
                  <div className="relative">
                    <Lock className="absolute left-3 top-2.5 w-4 h-4 text-neutral-600" />
                    <input 
                      type="password" 
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••"
                      className="w-full bg-neutral-950 border border-neutral-800 rounded-lg p-2.5 pl-10 text-xs text-white focus:ring-1 focus:ring-amber-500 focus:outline-none placeholder-neutral-700"
                      required={!isResetView}
                    />
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Submit authenticators check */}
            <button 
              type="submit"
              disabled={localLoading}
              className="w-full py-3 bg-gradient-to-r from-amber-500 to-yellow-650 hover:from-amber-400 hover:to-yellow-550 disabled:opacity-50 text-neutral-950 font-bold tracking-widest uppercase rounded-xl transition-all cursor-pointer flex items-center justify-center gap-2 text-xs"
            >
              {localLoading ? (
                <RefreshCw className="w-4 h-4 animate-spin" />
              ) : (
                <>
                  <span>{isResetView ? 'DISPATCH RESET EMAIL' : isLoginView ? 'AUTHENTICATE SECURELY' : 'ONBOARD STAFF MEMBER'}</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>

          </form>

          {/* Google Sign In Gateway */}
          <div className="relative py-2 flex items-center justify-center font-mono">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-neutral-800/80"></div>
            </div>
            <span className="relative bg-neutral-900 px-3 text-[9px] text-neutral-500 uppercase tracking-widest">or federated auth</span>
          </div>

          <button 
            type="button" 
            onClick={loginWithGoogle}
            className="w-full py-2.5 bg-neutral-950 hover:bg-neutral-850 border border-neutral-800 rounded-xl font-mono text-xs text-neutral-300 font-bold transition-all flex items-center justify-center gap-2 cursor-pointer uppercase"
          >
            <Building className="w-4 h-4 text-amber-500" />
            <span>Identity with Google Workspace</span>
          </button>

          {/* Toggle form scope trigger */}
          <div className="pt-2 text-center text-[10px] font-mono text-neutral-500 select-none">
            {isResetView ? (
              <button onClick={() => setIsResetView(false)} className="text-[#E5B84B] hover:underline">
                &larr; Return to traditional Login credentials
              </button>
            ) : isLoginView ? (
              <span>
                New team member?{' '}
                <button onClick={() => { setIsLoginView(false); setErrorMsg(null); }} className="text-[#E5B84B] hover:underline font-bold">
                  Self-Register Profile
                </button>
              </span>
            ) : (
              <span>
                Existing team account?{' '}
                <button onClick={() => { setIsLoginView(true); setErrorMsg(null); }} className="text-[#E5B84B] hover:underline font-bold">
                  Credentials Login
                </button>
              </span>
            )}
          </div>

          {/* Quick Preset Accounts shortcuts for sandbox review */}
          <div className="bg-neutral-950/60 p-4 rounded-xl border border-neutral-850 space-y-3.5">
            <div className="flex items-center justify-between">
              <span className="text-[9px] text-amber-500 font-black tracking-widest uppercase block">
                🏎️ Rapid Simulation Keypad
              </span>
              <span className="text-[8px] bg-neutral-900 text-neutral-500 border border-neutral-850 px-1.5 py-0.5 rounded uppercase font-bold">
                sandbox active
              </span>
            </div>
            <p className="text-[9.5px] font-sans text-neutral-450 leading-relaxed font-mono">
               ERP roles requested. Click any credential below to pre-fill and evaluate immediate access controls.
            </p>

            <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
              {CREDENTIAL_PRESETS.map(preset => (
                <button
                  key={preset.email}
                  type="button"
                  onClick={() => handleApplyPreset(preset.email, preset.pass)}
                  className="bg-neutral-900 hover:bg-neutral-800 border border-neutral-800 hover:border-amber-500/50 p-2 text-left rounded-lg transition-all focus:outline-none"
                >
                  <strong className="text-white text-[9.5px] block font-mono truncate leading-tight uppercase">{preset.label}</strong>
                  <span className="text-[8.5px] text-neutral-500 block truncate font-mono mt-0.5">{preset.email}</span>
                </button>
              ))}
            </div>
          </div>

        </div>

      </div>

    </div>
  );
};
