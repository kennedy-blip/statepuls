import { useState } from 'react';
import { ArrowLeft, ArrowRight, ChevronDown, Clock3, CornerDownRight, FastForward, Filter, Play, Plus, RotateCcw, Search, Zap } from 'lucide-react';
import type { ActionEntry } from '../types';
import { timeLabel } from '../utils/state';

type Props = {
  history: ActionEntry[];
  cursor: number;
  onJump: (index: number) => void;
  onDispatch: (type: string) => void;
};

const quickActions = ['CART_ADD_ITEM', 'SETTINGS_TOGGLE_DARK_MODE', 'NOTIFICATIONS_TOGGLE', 'AUTH_LOGOUT'];

export default function ActionTimeline({ history, cursor, onJump, onDispatch }: Props) {
  const [filter, setFilter] = useState('all');
  const [query, setQuery] = useState('');
  const [selected, setSelected] = useState<number | null>(null);
  const [dispatchType, setDispatchType] = useState(quickActions[0]);
  const activeIndex = selected === null ? cursor : Math.min(selected, history.length - 1);
  const active = history[activeIndex];
  const filtered = history.map((action, index) => ({ action, index })).reverse().filter(({ action }) => (filter === 'all' || action.category === filter) && (action.type.toLowerCase().includes(query.toLowerCase()) || JSON.stringify(action.payload).toLowerCase().includes(query.toLowerCase())));

  return (
    <div className="page-stack">
      <div className="page-intro"><div><div className="eyebrow">EVENT STREAM <span className="eyebrow-line" /></div><h1>Action Timeline</h1><p>Trace every mutation. Rewind, replay, and understand exactly what changed.</p></div><span className="intro-count"><span className="live-dot" /> {history.length} events recorded</span></div>
      <div className="timeline-controls panel">
        <div className="control-left"><span className="control-icon"><Clock3 size={19} /></span><div><strong>Time travel debugger</strong><span>Viewing snapshot {cursor + 1} of {history.length}{cursor < history.length - 1 ? ' · Past state' : ' · Latest state'}</span></div></div>
        <div className="travel-actions"><button className="travel-button" disabled={cursor === 0} onClick={() => onJump(0)} title="Jump to initial state"><RotateCcw size={16} /></button><button className="travel-button" disabled={cursor === 0} onClick={() => onJump(cursor - 1)} title="Step backward"><ArrowLeft size={17} /></button><span className="travel-position mono">{String(cursor + 1).padStart(2, '0')} / {String(history.length).padStart(2, '0')}</span><button className="travel-button" disabled={cursor === history.length - 1} onClick={() => onJump(cursor + 1)} title="Step forward"><ArrowRight size={17} /></button><button className="travel-button" disabled={cursor === history.length - 1} onClick={() => onJump(history.length - 1)} title="Jump to latest state"><FastForward size={17} /></button></div>
      </div>
      <div className="timeline-grid">
        <section className="panel events-panel">
          <div className="panel-heading"><div><div className="panel-title"><span className="title-icon violet"><Zap size={17} /></span> Dispatched actions</div><p className="panel-subtitle">Select an action to inspect its payload and snapshot.</p></div><span className="count-badge">{filtered.length}</span></div>
          <div className="events-toolbar"><label className="search-field"><Search size={16} /><input value={query} onChange={event => setQuery(event.target.value)} placeholder="Search actions..." aria-label="Search actions" /></label><div className="filter-wrap"><Filter size={14} /><select value={filter} onChange={event => setFilter(event.target.value)} aria-label="Filter actions"><option value="all">All types</option><option value="auth">Auth</option><option value="cart">Cart</option><option value="settings">Settings</option><option value="system">System</option></select><ChevronDown size={13} /></div></div>
          <div className="events-list">{filtered.length ? filtered.map(({ action, index }) => <button key={action.id} className={`event-row ${activeIndex === index ? 'event-selected' : ''}`} onClick={() => setSelected(index)}><span className={`event-marker event-${action.category}`}><span /></span><span className="event-content"><span className="event-title mono">{action.type}</span><span className="event-payload mono">{JSON.stringify(action.payload)}</span></span><span className="event-meta"><span className="mono">{timeLabel(action.timestamp)}</span>{index === cursor && <span className="current-tag">CURRENT</span>}</span></button>) : <div className="empty-search">No actions match your filters.</div>}</div>
          <div className="panel-bottom-note"><span><span className="footer-dot" /> Recording actions in real time</span><span className="mono">{history.length} total</span></div>
        </section>
        <div className="side-stack">
          <section className="panel detail-panel"><div className="panel-heading"><div className="panel-title"><span className="title-icon indigo"><CornerDownRight size={17} /></span> Action details</div></div><div className="detail-body"><div className="detail-overline">SELECTED ACTION</div><div className="action-name mono">{active.type}</div><div className="detail-info-grid"><div><span>Timestamp</span><strong className="mono">{timeLabel(active.timestamp)}</strong></div><div><span>Sequence</span><strong className="mono">#{String(activeIndex + 1).padStart(3, '0')}</strong></div><div><span>Category</span><strong className="capitalize">{active.category}</strong></div><div><span>Status</span><strong className={activeIndex === cursor ? 'text-emerald-400' : 'text-slate-300'}>{activeIndex === cursor ? 'Current' : activeIndex < cursor ? 'Applied' : 'Future'}</strong></div></div><div className="code-header"><span>PAYLOAD</span><span className="mono">JSON</span></div><pre className="code-block">{JSON.stringify(active.payload, null, 2)}</pre><button className="secondary-button full-button" onClick={() => onJump(activeIndex)}><Play size={15} /> Jump to state snapshot</button></div></section>
          <section className="panel dispatch-panel"><div className="panel-heading"><div className="panel-title"><span className="title-icon emerald"><Plus size={17} /></span> Dispatch an action</div></div><div className="dispatch-body"><p>Trigger a mutation and see it appear in the timeline instantly.</p><label className="field-label" htmlFor="action-select">ACTION TYPE</label><div className="select-shell"><select id="action-select" value={dispatchType} onChange={event => setDispatchType(event.target.value)}>{quickActions.map(action => <option key={action} value={action}>{action}</option>)}</select><ChevronDown size={15} /></div><button className="primary-button full-button" onClick={() => { onDispatch(dispatchType); setSelected(null); }}><Zap size={16} /> Dispatch action</button></div></section>
        </div>
      </div>
    </div>
  );
}