import { useEffect, useState } from 'react';
import { Activity, ArrowDownToLine, ArrowRight, Bell, Braces, Check, ChevronRight, CircleHelp, Code2, Copy, Database, GitBranch, HardDrive, Layers3, Menu, Moon, MoreHorizontal, RotateCcw, ShieldCheck, Sparkles, Terminal, X, Zap } from 'lucide-react';
import StoreInspector from './components/StoreInspector';
import ActionTimeline from './components/ActionTimeline';
import StorageManager from './components/StorageManager';
import type { ActionEntry, JsonValue, StoreState } from './types';
import { baseState, cloneState, createInitialHistory, getAtPath, setAtPath, stateSize, timeLabel } from './utils/state';

type View = 'store' | 'timeline' | 'storage' | 'migrations';

const navigation = [
  { id: 'store', label: 'Global Store Tree', icon: Layers3 },
  { id: 'timeline', label: 'Action Timeline', icon: Activity },
  { id: 'storage', label: 'Storage Inspector', icon: Database },
  { id: 'migrations', label: 'State Migrations', icon: GitBranch },
] as const;

function getCategory(type: string): ActionEntry['category'] {
  if (type.startsWith('AUTH')) return 'auth';
  if (type.startsWith('CART')) return 'cart';
  if (type.startsWith('SETTINGS') || type.startsWith('NOTIFICATIONS')) return 'settings';
  return 'system';
}

function getNextState(state: StoreState, type: string): { state: StoreState; payload: JsonValue } {
  if (type === 'CART_ADD_ITEM') {
    const items = getAtPath(state, ['cart', 'items']) as JsonValue[];
    const item = { id: `prod_${String(items.length + 1).padStart(3, '0')}`, name: 'Wireless Charger', quantity: 1, price: 49 };
    const next = setAtPath(state, ['cart', 'items'], [...items, item]);
    return { state: setAtPath(next, ['cart', 'total'], Number(getAtPath(state, ['cart', 'total'])) + 49), payload: { item, quantity: 1 } };
  }
  if (type === 'SETTINGS_TOGGLE_DARK_MODE') {
    const theme = getAtPath(state, ['settings', 'theme']) === 'dark' ? 'light' : 'dark';
    return { state: setAtPath(state, ['settings', 'theme'], theme), payload: { theme } };
  }
  if (type === 'NOTIFICATIONS_TOGGLE') {
    const enabled = !getAtPath(state, ['settings', 'notifications']);
    return { state: setAtPath(state, ['settings', 'notifications'], enabled), payload: { enabled } };
  }
  if (type === 'AUTH_LOGOUT') return { state: setAtPath(state, ['user', 'isAuthenticated'], false), payload: { userId: getAtPath(state, ['user', 'id']) } };
  return { state, payload: {} };
}

export default function App() {
  const [view, setView] = useState<View>('store');
  const [history, setHistory] = useState<ActionEntry[]>(createInitialHistory);
  const [cursor, setCursor] = useState(3);
  const [selectedPath, setSelectedPath] = useState<string[]>(['user', 'role']);
  const [toast, setToast] = useState('');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [version, setVersion] = useState(2);
  const state = history[cursor].state;
  const selectedValue = (() => { try { return getAtPath(state, selectedPath); } catch { return null; } })();
  const selectedType = selectedValue === null ? 'null' : Array.isArray(selectedValue) ? 'array' : typeof selectedValue;

  useEffect(() => { if (!toast) return; const timer = window.setTimeout(() => setToast(''), 3500); return () => window.clearTimeout(timer); }, [toast]);

  const notify = (message: string) => setToast(message);
  const commit = (type: string, payload: JsonValue, nextState: StoreState) => {
    const nextHistory = history.slice(0, cursor + 1);
    nextHistory.push({ id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`, type, timestamp: Date.now(), payload, state: nextState, category: getCategory(type) });
    setHistory(nextHistory); setCursor(nextHistory.length - 1);
  };
  const editValue = (path: string[], value: JsonValue) => { commit('STATE_VALUE_UPDATED', { path: path.join('.'), value }, setAtPath(state, path, value)); notify(`${path.join('.')} updated successfully`); };
  const dispatch = (type: string) => { const next = getNextState(state, type); commit(type, next.payload, next.state); notify(`${type} dispatched`); };
  const reset = () => { if (!window.confirm('Reset store state and clear action history?')) return; const fresh = cloneState(baseState); setHistory([{ id: `reset-${Date.now()}`, type: 'STORE_RESET', timestamp: Date.now(), payload: { source: 'manual' }, state: fresh, category: 'system' }]); setCursor(0); setVersion(2); setSelectedPath(['user', 'role']); notify('Store reset to initial state'); };
  const exportSnapshot = () => { const blob = new Blob([JSON.stringify({ app: 'StatePulse', schemaVersion: version, exportedAt: new Date().toISOString(), state }, null, 2)], { type: 'application/json' }); const url = URL.createObjectURL(blob); const link = document.createElement('a'); link.href = url; link.download = `statepulse-snapshot-${new Date().toISOString().slice(0, 10)}.json`; link.click(); URL.revokeObjectURL(url); notify('Store snapshot exported'); };
  const switchView = (next: View) => { setView(next); setSidebarOpen(false); };
  const runMigration = () => {
    if (version >= 4) return;
    const next = cloneState(state);
    if (version === 2) { (next.settings as Record<string, JsonValue>).reducedMotion = false; ((next.user as Record<string, JsonValue>).preferences as Record<string, JsonValue>).dateFormat = 'MM/DD/YYYY'; }
    else { (next.settings as Record<string, JsonValue>).compactMode = false; (next.cart as Record<string, JsonValue>).lastUpdated = new Date().toISOString(); }
    commit(`SCHEMA_MIGRATED_V${version + 1}`, { from: version, to: version + 1 }, next);
    setVersion(version + 1); notify(`Schema migrated to v${version + 1}`);
  };
  const rollbackMigration = () => {
    if (version <= 2) return;
    const next = cloneState(state);
    if (version === 4) { delete (next.settings as Record<string, JsonValue>).compactMode; delete (next.cart as Record<string, JsonValue>).lastUpdated; }
    else { delete (next.settings as Record<string, JsonValue>).reducedMotion; delete ((next.user as Record<string, JsonValue>).preferences as Record<string, JsonValue>).dateFormat; }
    commit(`SCHEMA_ROLLBACK_V${version - 1}`, { from: version, to: version - 1 }, next);
    setVersion(version - 1); notify(`Rolled back to schema v${version - 1}`);
  };

  return <div className="app-shell">
    <aside className={`sidebar ${sidebarOpen ? 'sidebar-open' : ''}`}>
      <div className="sidebar-brand"><div className="brand-mark"><Activity size={24} strokeWidth={2.5} /></div><div><div className="brand-name">State<span>Pulse</span></div><div className="brand-subtitle">DEVELOPER WORKSPACE</div></div><button className="mobile-close" onClick={() => setSidebarOpen(false)}><X size={18} /></button></div>
      <div className="sidebar-section-label">WORKSPACE</div>
      <nav className="side-nav" aria-label="Main navigation">{navigation.map(item => <button key={item.id} className={`nav-item ${view === item.id ? 'nav-item-active' : ''}`} onClick={() => switchView(item.id)}><item.icon size={18} strokeWidth={1.9} /><span>{item.label}</span>{item.id === 'timeline' && <span className="nav-count">{history.length}</span>}{view === item.id && <span className="nav-active-line" />}</button>)}</nav>
      <div className="sidebar-section-label tools-label">TOOLS</div><div className="side-nav"><button className="nav-item" onClick={exportSnapshot}><ArrowDownToLine size={18} /><span>Export Snapshot</span></button><button className="nav-item" onClick={reset}><RotateCcw size={18} /><span>Reset Store State</span></button></div>
      <div className="sidebar-spacer" />
      <div className="sidebar-connection"><div className="connection-top"><span className="connection-icon"><Zap size={17} fill="currentColor" /></span><span className="connected-pip" /></div><strong>Store connected</strong><p>Listening for state changes in real time.</p><div className="connection-bottom"><span className="live-dot" /> LIVE CONNECTION <span className="connection-bars"><i /><i /><i /></span></div></div>
      <div className="sidebar-footer"><div className="avatar">AM</div><div><strong>Alex Morgan</strong><span>Development workspace</span></div><MoreHorizontal size={17} /></div>
    </aside>
    {sidebarOpen && <div className="sidebar-scrim" onClick={() => setSidebarOpen(false)} />}
    <div className="main-area"><header className="topbar"><div className="topbar-left"><button className="mobile-menu icon-button" onClick={() => setSidebarOpen(true)} aria-label="Open menu"><Menu size={20} /></button><span className="breadcrumb-main">Workspace</span><ChevronRight size={15} /><span className="breadcrumb-current">{navigation.find(item => item.id === view)?.label}</span></div><div className="topbar-right"><div className="top-status"><span className="live-dot" /><span>Store: <strong>Active</strong></span><span className="status-connected">(Connected)</span></div><span className="top-divider" /><button className="top-icon-button" title="Help: double-click a state value to edit" onClick={() => notify('Tip: Double-click a state value to edit it')}><CircleHelp size={18} /></button><button className="top-icon-button" title="Notifications" onClick={() => notify('You are all caught up')}><Bell size={18} /></button><span className="top-divider" /><div className="top-avatar">AM</div></div></header>
      <main className="content">
        {view === 'store' && <div className="page-stack">
          <div className="page-intro"><div><div className="eyebrow">STATE EXPLORER <span className="eyebrow-line" /></div><h1>Global Store Tree<span className="heading-spark"><Sparkles size={20} /></span></h1><p>A live, interactive view of your application's entire state.</p></div><div className="intro-actions"><button className="outline-button reset-button" onClick={reset}><RotateCcw size={15} /> Reset store</button><button className="primary-button" onClick={exportSnapshot}><ArrowDownToLine size={16} /> Export snapshot</button></div></div>
          <div className="overview-grid"><div className="overview-item"><span className="overview-icon purple"><Layers3 size={19} /></span><div><span className="overview-label">STATE SLICES</span><div className="overview-value">{String(Object.keys(state).length).padStart(2, '0')} <span>active slices</span></div></div><span className="overview-arrow"><ArrowRight size={17} /></span></div><div className="overview-item"><span className="overview-icon green"><Activity size={19} /></span><div><span className="overview-label">DISPATCHED ACTIONS</span><div className="overview-value">{String(history.length).padStart(2, '0')} <span>in timeline</span></div></div><span className="overview-arrow"><ArrowRight size={17} /></span></div><div className="overview-item"><span className="overview-icon blue"><HardDrive size={19} /></span><div><span className="overview-label">STORE SIZE</span><div className="overview-value">{stateSize(state)} <span>in memory</span></div></div><span className="overview-arrow"><ArrowRight size={17} /></span></div></div>
          <div className="inspector-grid"><StoreInspector state={state} selectedPath={selectedPath} onSelect={setSelectedPath} onEdit={editValue} onNotify={notify} /><div className="side-stack"><section className="panel selected-panel"><div className="panel-heading"><div className="panel-title"><span className="title-icon indigo"><Code2 size={17} /></span> Selected node</div><button className="icon-button" onClick={() => { navigator.clipboard.writeText(selectedPath.join('.')).then(() => notify('State path copied')).catch(() => notify('Could not copy path')); }} title="Copy path"><Copy size={15} /></button></div><div className="selected-body"><div className="detail-overline">STATE PATH</div><div className="state-path mono"><span>root</span>{selectedPath.map(part => <span key={part}><ChevronRight size={13} />{part}</span>)}</div><div className="selected-divider" /><div className="detail-overline">CURRENT VALUE <span className="value-type">{selectedType}</span></div><div className={`selected-value mono ${typeof selectedValue === 'string' ? 'value-string' : ''}`}>{typeof selectedValue === 'string' ? `"${selectedValue}"` : JSON.stringify(selectedValue, null, 2)}</div><div className="selection-tip"><span className="tip-icon"><Sparkles size={15} /></span><span>Double-click a value in the tree to edit it inline. Changes are recorded as actions.</span></div></div></section><section className="panel quick-panel"><div className="panel-heading"><div className="panel-title"><span className="title-icon violet"><Zap size={17} /></span> Quick dispatch</div><button className="text-link" onClick={() => switchView('timeline')}>View timeline <ArrowRight size={14} /></button></div><div className="quick-actions"><button onClick={() => dispatch('CART_ADD_ITEM')}><span className="quick-action-icon"><Braces size={16} /></span><span><strong className="mono">CART_ADD_ITEM</strong><small>Add a product to cart</small></span><PlusIcon /></button><button onClick={() => dispatch('SETTINGS_TOGGLE_DARK_MODE')}><span className="quick-action-icon"><Moon size={16} /></span><span><strong className="mono">TOGGLE_DARK_MODE</strong><small>Switch display preference</small></span><PlusIcon /></button></div></section></div></div>
          <section className="recent-section"><div className="recent-heading"><div><h2>Recent activity</h2><p>The latest changes to your store</p></div><button className="text-link" onClick={() => switchView('timeline')}>All actions <ArrowRight size={15} /></button></div><div className="recent-list">{history.slice(-3).reverse().map(action => <div className="recent-row" key={action.id}><span className={`recent-icon event-${action.category}`}><Zap size={15} /></span><span className="mono recent-name">{action.type}</span><span className="recent-payload mono">{JSON.stringify(action.payload)}</span><span className="recent-time mono">{timeLabel(action.timestamp)}</span></div>)}</div></section>
        </div>}
        {view === 'timeline' && <ActionTimeline history={history} cursor={cursor} onJump={index => { setCursor(index); notify(`Viewing snapshot ${index + 1} of ${history.length}`); }} onDispatch={dispatch} />}
        {view === 'storage' && <StorageManager onNotify={notify} />}
        {view === 'migrations' && <div className="page-stack"><div className="page-intro"><div><div className="eyebrow">SCHEMA CONTROL <span className="eyebrow-line" /></div><h1>State Migrations</h1><p>Evolve your store structure safely with versioned schema changes.</p></div><span className="schema-badge"><GitBranch size={15} /> Schema v{version}.0</span></div><div className="migration-hero panel"><div><span className="detail-overline">CURRENT SCHEMA VERSION</span><div className="migration-version">v{version}<span>.0</span></div><p>{version === 4 ? 'Your store is on the latest schema version.' : `${4 - version} migration${4 - version > 1 ? 's' : ''} available to apply.`}</p></div><div className="migration-hero-actions"><button className="outline-button" disabled={version <= 2} onClick={rollbackMigration}><RotateCcw size={15} /> Roll back</button><button className="primary-button" disabled={version >= 4} onClick={runMigration}><Zap size={16} /> Run next migration</button></div></div><div className="migration-grid"><section className="panel migration-list"><div className="panel-heading"><div><div className="panel-title"><span className="title-icon violet"><GitBranch size={17} /></span> Migration history</div><p className="panel-subtitle">Versioned changes to your state shape.</p></div></div><div className="migration-rows"><div className="migration-row"><span className="migration-step complete"><Check size={16} /></span><div><strong>Initial schema</strong><p>Base store with user, cart, settings, and UI slices.</p><span className="mono">v1.0 → v2.0</span></div><span className="migration-status done">Applied</span></div><div className="migration-row"><span className={`migration-step ${version >= 3 ? 'complete' : 'pending'}`}>{version >= 3 ? <Check size={16} /> : '02'}</span><div><strong>Preference normalization</strong><p>Add reduced motion and date format preferences.</p><span className="mono">v2.0 → v3.0</span></div><span className={`migration-status ${version >= 3 ? 'done' : ''}`}>{version >= 3 ? 'Applied' : 'Pending'}</span></div><div className="migration-row"><span className={`migration-step ${version >= 4 ? 'complete' : 'pending'}`}>{version >= 4 ? <Check size={16} /> : '03'}</span><div><strong>Cart metadata</strong><p>Introduce compact mode and cart update timestamp.</p><span className="mono">v3.0 → v4.0</span></div><span className={`migration-status ${version >= 4 ? 'done' : ''}`}>{version >= 4 ? 'Applied' : 'Pending'}</span></div></div></section><section className="panel migration-preview"><div className="panel-heading"><div className="panel-title"><span className="title-icon indigo"><Terminal size={17} /></span> Next migration preview</div></div><div className="preview-content">{version < 4 ? <><div className="detail-overline">V{version}.0 → V{version + 1}.0</div><h3>{version === 2 ? 'Preference normalization' : 'Cart metadata'}</h3><p className="preview-description">{version === 2 ? 'Extend existing preferences without changing current values.' : 'Track cart changes and enable a denser interface option.'}</p><div className="code-header"><span>SCHEMA DIFF</span><span className="mono">JSON</span></div><pre className="code-block migration-code">{version === 2 ? `+ settings.reducedMotion: false\n+ user.preferences.dateFormat: "MM/DD/YYYY"` : `+ settings.compactMode: false\n+ cart.lastUpdated: ISO timestamp`}</pre><div className="migration-safe"><ShieldCheck size={17} /> Non-destructive migration</div></> : <div className="all-done"><span><Check size={22} /></span><h3>You're up to date</h3><p>All available migrations have been applied.</p></div>}</div></section></div></div>}
      </main><footer className="app-footer"><span>StatePulse <span className="footer-version">v1.0.0</span></span><span><span className="live-dot" /> All systems operational</span><span className="footer-right">Built for the way you debug.</span></footer>
    </div>
    {toast && <div className="toast"><span><Check size={15} /></span>{toast}<button onClick={() => setToast('')} aria-label="Dismiss notification"><X size={14} /></button></div>}
  </div>;
}

function PlusIcon() { return <span className="quick-plus">+</span>; }