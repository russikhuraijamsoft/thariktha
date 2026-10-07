import React, { useState } from 'react';
import { Grid3X3, LogOut } from 'lucide-react';
import { AuthProvider, erpApi, useAuth } from './context/AuthContext';
import { AuthScreen } from './components/AuthScreen';
import { OdooAppsLauncher } from './components/OdooAppsLauncher';
import { EntityWorkspace } from './components/EntityWorkspace';
import { OdooFormModal } from './components/OdooFormModal';
import { ERPCommandForm } from './components/ERPCommandForm';
import { MetricDashboard } from './components/MetricDashboard';
import { ENTITIES, MODULES } from './erpMetadata';
import { errorMessage, type ERPRecord } from './services/erpApi';

export default function App() { return <AuthProvider><AuthenticatedApp /></AuthProvider>; }
function AuthenticatedApp() {
  const { user, profile, loading } = useAuth();
  if (loading) return <div className="min-h-screen bg-[#171b22] text-white grid place-items-center" role="status">Loading authenticated ERP session…</div>;
  if (!user || !profile) return <AuthScreen />;
  return <Workspace key={`${profile.uid}:${profile.companyId}:${profile.branchId}:${profile.role}`} />;
}
function Workspace() {
  const { profile, logout } = useAuth();
  const [module, setModule] = useState('dashboard');
  const [entity, setEntity] = useState('orders');
  const [launcher, setLauncher] = useState(false);
  const [revision, setRevision] = useState(0);
  const [selected, setSelected] = useState<{ entity: string; record: ERPRecord } | null>(null);
  const [command, setCommand] = useState<{ entity: string; action: string; record?: ERPRecord } | null>(null);
  const [notice, setNotice] = useState('');
  const [error, setError] = useState('');
  const metadata = MODULES[module];
  function navigateModule(id: string) { setModule(id); setEntity(MODULES[id].entities[0] || 'orders'); setSelected(null); setError(''); }
  async function navigateRecord(target: string, id: string) {
    setError('');
    try {
      const rows = await erpApi.list(target);
      const record = rows.find(row => row.id === id);
      if (!record) throw new Error('Related document is unavailable in your authorized scope.');
      setSelected({ entity: target, record });
    } catch (e) { setError(errorMessage(e)); }
  }
  return <div className="min-h-screen bg-[#171b22] text-neutral-100 font-sans">
    <header className="bg-[#714B67] p-3 sm:px-6 flex gap-4 items-center flex-wrap">
      <button className="erp-button" onClick={() => setLauncher(true)} aria-label="Open applications"><Grid3X3 size={18} /> Applications</button>
      <strong className="flex-1">Talk of the Town · Cricket Closet ERP</strong>
      <span className="text-xs">{profile?.name || profile?.uid} · {profile?.role}</span>
      <button className="erp-button" onClick={() => { void logout().catch(e => setError(errorMessage(e))); }}><LogOut size={15} /> Sign out</button>
    </header>
    <div className="px-4 sm:px-6 py-2 border-b border-neutral-700 text-xs text-neutral-400">Company {profile?.companyId} · Branch {profile?.branchId} · Server-authorized scope · INR</div>
    <main className="p-4 sm:p-6 max-w-[1600px] mx-auto">
      <nav className="flex flex-wrap gap-2 mb-5" aria-label="Modules">{Object.entries(MODULES).map(([id, item]) => <button key={id} onClick={() => navigateModule(id)} className={module === id ? 'erp-primary' : 'erp-button'}>{item.title}</button>)}</nav>
      {notice && <div role="status" className="erp-panel mb-4 flex justify-between gap-3">{notice}<button onClick={() => setNotice('')}>Dismiss</button></div>}
      {error && <div role="alert" className="erp-error mb-4">{error}<button className="erp-button ml-3" onClick={() => setError('')}>Dismiss</button></div>}
      {metadata.unavailable && <p className="erp-panel mb-4 text-sm text-neutral-300">{metadata.unavailable}</p>}
      {['dashboard', 'reports'].includes(module) ? <MetricDashboard revision={revision} /> : metadata.entities.length > 0 && <>
        <nav className="flex gap-2 flex-wrap mb-5" aria-label="Document types">{metadata.entities.map(id => <button key={id} onClick={() => setEntity(id)} className={entity === id ? 'erp-primary' : 'erp-button'}>{ENTITIES[id].label}</button>)}</nav>
        <EntityWorkspace key={entity} entity={entity} revision={revision} onNew={() => setCommand({ entity, action: 'create' })} onOpen={record => setSelected({ entity, record })} />
      </>}
    </main>
    <OdooAppsLauncher isOpen={launcher} onClose={() => setLauncher(false)} activeTab={module} onSelectApp={navigateModule} />
    {selected && <OdooFormModal key={`${selected.entity}:${selected.record.id}`} {...selected} revision={revision} onClose={() => setSelected(null)} onNavigate={(target, id) => void navigateRecord(target, id)} onAction={action => setCommand({ ...selected, action })} />}
    {command && <ERPCommandForm {...command} onClose={() => setCommand(null)} onCommitted={result => {
      setNotice(`${result.replayed ? 'Previously committed command confirmed' : 'Command committed'}: ${result.record.number || result.record.id}`);
      setSelected({ entity: command.entity, record: result.record }); setCommand(null); setRevision(value => value + 1);
    }} />}
  </div>;
}
