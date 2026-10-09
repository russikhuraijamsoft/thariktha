import React, { useState } from 'react';
import brandLogo from './assets/images/talk_of_the_town_logo_1780894452079.png';
import { OriginalAppShell } from './components/OriginalAppShell';
import { OriginalDashboard } from './components/OriginalDashboard';
import { DesignedEntityWorkspace } from './components/DesignedEntityWorkspace';
import { AuthProvider, erpApi, useAuth } from './context/AuthContext';
import { AuthScreen } from './components/AuthScreen';
import { SessionBoundary } from './components/SessionBoundary';
import { OdooAppsLauncher } from './components/OdooAppsLauncher';
import { EntityWorkspace } from './components/EntityWorkspace';
import { CustomersWorkspace } from './components/CustomersWorkspace';
import { OdooFormModal } from './components/OdooFormModal';
import { ERPCommandForm } from './components/ERPCommandForm';
import { MetricDashboard } from './components/MetricDashboard';
import { ENTITIES, MODULES } from './erpMetadata';
import { errorMessage, type ERPRecord } from './services/erpApi';

export default function App() { return <AuthProvider><AuthenticatedApp /></AuthProvider>; }
function AuthenticatedApp() {
  const session = useAuth();
  const { profile } = session;
  return <SessionBoundary {...session} signIn={<AuthScreen />}>
    <Workspace key={`${profile?.uid}:${profile?.companyId}:${profile?.branchId}:${profile?.role}`} />
  </SessionBoundary>;
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
  return <OriginalAppShell activeModule={module} onNavigate={navigateModule} profile={profile} brandLogo={brandLogo} onOpenApplications={() => setLauncher(true)} onLogout={() => { void logout().catch(e => setError(errorMessage(e))); }}>
    {notice && <div role="status" className="erp-panel mb-4 flex justify-between gap-3">{notice}<button className="erp-button" onClick={() => setNotice('')}>Dismiss</button></div>}
    {error && <div role="alert" className="erp-error mb-4">{error}<button className="erp-button ml-3" onClick={() => setError('')}>Dismiss</button></div>}
    {metadata.unavailable && <p className="erp-panel mb-4 text-sm text-[var(--text-sub)]">{metadata.unavailable}</p>}
    {module === 'dashboard' ? <OriginalDashboard revision={revision} onNavigate={navigateModule} /> : module === 'reports' ? <MetricDashboard revision={revision} /> : metadata.entities.length > 0 && <>
      <nav className="flex gap-2 flex-wrap mb-5" aria-label="Document types">{metadata.entities.map(id => <button key={id} onClick={() => { setEntity(id); setSelected(null); setError(''); }} className={entity === id ? 'erp-primary' : 'erp-button'}>{ENTITIES[id].label}</button>)}</nav>
      {entity === 'customers' ? <CustomersWorkspace key={entity} revision={revision} onNew={() => setCommand({ entity, action: 'create' })} onOpen={record => setSelected({ entity, record })} /> : ['orders', 'inventory'].includes(module) ? <DesignedEntityWorkspace key={entity} entity={entity} revision={revision} onNew={() => setCommand({ entity, action: 'create' })} onOpen={record => setSelected({ entity, record })} /> : <EntityWorkspace key={entity} entity={entity} revision={revision} onNew={() => setCommand({ entity, action: 'create' })} onOpen={record => setSelected({ entity, record })} />}
    </>}
    <OdooAppsLauncher isOpen={launcher} onClose={() => setLauncher(false)} activeTab={module} onSelectApp={navigateModule} />
    {selected && <OdooFormModal key={`${selected.entity}:${selected.record.id}`} {...selected} revision={revision} onClose={() => setSelected(null)} onNavigate={(target, id) => void navigateRecord(target, id)} onAction={action => setCommand({ ...selected, action })} />}
    {command && <ERPCommandForm {...command} onClose={() => setCommand(null)} onCommitted={result => {
      setNotice(`${result.replayed ? 'Previously committed command confirmed' : 'Command committed'}: ${result.record.number || result.record.id}`);
      setSelected({ entity: command.entity, record: result.record }); setCommand(null); setRevision(value => value + 1);
    }} />}
  </OriginalAppShell>;
}
