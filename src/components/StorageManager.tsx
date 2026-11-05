import { useEffect, useMemo, useState } from 'react';
import { Braces, Check, ChevronRight, Clock3, Copy, Database, HardDrive, Plus, RefreshCw, Search, Trash2, X } from 'lucide-react';
import type { StorageKind, StorageRecord } from '../types';
import { formatBytes } from '../utils/state';

type Props = { onNotify: (message: string) => void };
const INDEX_KEY = '__statepulse_indexed_mock__';
const EXP_KEY = '__statepulse_expirations__';
const SEED_KEY = '__statepulse_seeded__';

function readRecords(kind: StorageKind): StorageRecord[] {
  try {
    const expirations = JSON.parse(localStorage.getItem(EXP_KEY) || '{}') as Record<string, string>;
    if (kind === 'indexed') return JSON.parse(localStorage.getItem(INDEX_KEY) || '[]') as StorageRecord[];
    const storage = kind === 'local' ? localStorage : sessionStorage;
    return Object.keys(storage).filter(key => ![INDEX_KEY, EXP_KEY, SEED_KEY].includes(key)).map(key => ({ key, value: storage.getItem(key) || '', expires: expirations[`${kind}:${key}`] || null }));
  } catch { return []; }
}

function initializeStorage() {
  if (localStorage.getItem(SEED_KEY)) return;
  if (!localStorage.getItem('statepulse:user_preferences')) localStorage.setItem('statepulse:user_preferences', JSON.stringify({ theme: 'dark', density: 'comfortable', language: 'en' }));
  if (!localStorage.getItem('statepulse:auth_token')) localStorage.setItem('statepulse:auth_token', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.demo');
  if (!localStorage.getItem('statepulse:cart_draft')) localStorage.setItem('statepulse:cart_draft', JSON.stringify({ items: 2, lastUpdated: '2025-06-12' }));
  if (!sessionStorage.getItem('statepulse:active_tab')) sessionStorage.setItem('statepulse:active_tab', 'global-store');
  if (!sessionStorage.getItem('statepulse:session_id')) sessionStorage.setItem('statepulse:session_id', 'sess_93b8e2a7');
  if (!localStorage.getItem(INDEX_KEY)) localStorage.setItem(INDEX_KEY, JSON.stringify([{ key: 'offline_queue', value: JSON.stringify([{ event: 'SYNC_CART', pending: true }]), expires: null }, { key: 'cached_products', value: JSON.stringify({ count: 24, version: 3 }), expires: null }]));
  localStorage.setItem(EXP_KEY, JSON.stringify({ 'local:statepulse:auth_token': new Date(Date.now() + 86400000).toISOString(), 'session:statepulse:session_id': new Date(Date.now() + 3600000).toISOString() }));
  localStorage.setItem(SEED_KEY, 'true');
}

export default function StorageManager({ onNotify }: Props) {
  const [kind, setKind] = useState<StorageKind>('local');
  const [records, setRecords] = useState<StorageRecord[]>([]);
  const [selectedKey, setSelectedKey] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const [adding, setAdding] = useState(false);
  const [newKey, setNewKey] = useState('');
  const [newValue, setNewValue] = useState('');
  const [expiresIn, setExpiresIn] = useState('never');
  const [error, setError] = useState('');

  const refresh = (nextKind: StorageKind = kind) => setRecords(readRecords(nextKind));
  useEffect(() => { try { initializeStorage(); refresh(); } catch { /* Storage can be disabled by the browser. */ } }, []);
  const current = records.find(record => record.key === selectedKey) || records[0];
  const filtered = records.filter(record => record.key.toLowerCase().includes(query.toLowerCase()) || record.value.toLowerCase().includes(query.toLowerCase()));
  const totalSize = useMemo(() => `${(new Blob([records.map(record => record.key + record.value).join('')]).size / 1024).toFixed(2)} KB`, [records]);
  const switchKind = (next: StorageKind) => { setKind(next); setSelectedKey(null); setQuery(''); setAdding(false); refresh(next); };

  const remove = (key: string) => {
    try {
      if (kind === 'indexed') localStorage.setItem(INDEX_KEY, JSON.stringify(readRecords('indexed').filter(record => record.key !== key)));
      else (kind === 'local' ? localStorage : sessionStorage).removeItem(key);
      const expirations = JSON.parse(localStorage.getItem(EXP_KEY) || '{}');
      delete expirations[`${kind}:${key}`];
      localStorage.setItem(EXP_KEY, JSON.stringify(expirations));
      if (selectedKey === key) setSelectedKey(null);
      refresh(); onNotify(`Deleted ${key}`);
    } catch { onNotify('Unable to delete storage item'); }
  };

  const clearAll = () => {
    if (!records.length || !window.confirm(`Delete all ${records.length} visible ${kind === 'indexed' ? 'IndexedDB' : kind + 'Storage'} entries?`)) return;
    try {
      records.forEach(record => {
        if (kind !== 'indexed') (kind === 'local' ? localStorage : sessionStorage).removeItem(record.key);
      });
      if (kind === 'indexed') localStorage.setItem(INDEX_KEY, '[]');
      setSelectedKey(null); refresh(); onNotify('Storage entries cleared');
    } catch { onNotify('Unable to clear storage'); }
  };

  const addItem = () => {
    const key = newKey.trim();
    if (!key || !newValue.trim()) { setError('Key and value are required'); return; }
    if (records.some(record => record.key === key)) { setError('This key already exists'); return; }
    try {
      const expires = expiresIn === 'never' ? null : new Date(Date.now() + Number(expiresIn) * 3600000).toISOString();
      if (kind === 'indexed') localStorage.setItem(INDEX_KEY, JSON.stringify([...readRecords('indexed'), { key, value: newValue, expires }]));
      else {
        (kind === 'local' ? localStorage : sessionStorage).setItem(key, newValue);
        if (expires) {
          const expirations = JSON.parse(localStorage.getItem(EXP_KEY) || '{}');
          expirations[`${kind}:${key}`] = expires;
          localStorage.setItem(EXP_KEY, JSON.stringify(expirations));
        }
      }
      setSelectedKey(key); setNewKey(''); setNewValue(''); setExpiresIn('never'); setAdding(false); setError(''); refresh(); onNotify('Storage entry added');
    } catch { setError('Storage is unavailable or full'); }
  };

  const formattedValue = (value: string) => { try { return JSON.stringify(JSON.parse(value), null, 2); } catch { return value; } };

  return <div className="page-stack">
    <div className="page-intro"><div><div className="eyebrow">PERSISTENCE LAYER <span className="eyebrow-line" /></div><h1>Storage Inspector</h1><p>Inspect, edit, and manage browser persistence in one place.</p></div><button className="outline-button" onClick={() => { refresh(); onNotify('Storage refreshed'); }}><RefreshCw size={15} /> Refresh storage</button></div>
    <div className="storage-tabs panel">{([{ id: 'local', label: 'LocalStorage', icon: HardDrive }, { id: 'session', label: 'SessionStorage', icon: Clock3 }, { id: 'indexed', label: 'IndexedDB', icon: Database }] as const).map(tab => <button key={tab.id} onClick={() => switchKind(tab.id)} className={`storage-tab ${kind === tab.id ? 'storage-tab-active' : ''}`}><tab.icon size={17} /><span>{tab.label}</span><span className="tab-count">{kind === tab.id ? records.length : readRecords(tab.id).length}</span></button>)}</div>
    <div className="storage-summary"><div><span className="summary-label">CURRENT DATABASE</span><strong>{kind === 'local' ? 'LocalStorage' : kind === 'session' ? 'SessionStorage' : 'IndexedDB'} <span className="summary-accent">/ entries</span></strong></div><div className="summary-right"><div><span>KEYS</span><strong className="mono">{String(records.length).padStart(2, '0')}</strong></div><div><span>STORAGE USED</span><strong className="mono">{totalSize}</strong></div><button className="primary-button" onClick={() => setAdding(true)}><Plus size={16} /> Add entry</button></div></div>
    <div className="storage-grid"><section className="panel storage-list-panel"><div className="storage-list-toolbar"><label className="search-field"><Search size={16} /><input value={query} onChange={event => setQuery(event.target.value)} placeholder="Filter by key or value..." aria-label="Filter storage" /></label><button className="danger-text-button" onClick={clearAll} disabled={!records.length}><Trash2 size={15} /> Clear all</button></div><div className="storage-table-head"><span>KEY</span><span>SIZE</span><span>EXPIRES</span><span /></div><div className="storage-rows">{filtered.length ? filtered.map(record => <div key={record.key} className={`storage-row ${current?.key === record.key ? 'storage-row-active' : ''}`}><button className="storage-row-main" onClick={() => setSelectedKey(record.key)}><span className="storage-key"><Braces size={15} /> <span className="mono">{record.key}</span></span><span className="mono storage-cell-muted">{formatBytes(record.value)}</span><span className="storage-cell-muted">{record.expires ? new Date(record.expires).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : 'Never'}</span><ChevronRight size={15} /></button><button className="storage-delete" title={`Delete ${record.key}`} onClick={() => remove(record.key)}><Trash2 size={14} /></button></div>) : <div className="empty-search">{query ? 'No entries match your search.' : 'No entries yet. Add one to get started.'}</div>}</div><div className="panel-bottom-note"><span><span className="footer-dot" /> Browser storage connected</span><span>{records.length} entries</span></div></section>
    <section className="panel storage-preview"><div className="panel-heading"><div className="panel-title"><span className="title-icon indigo"><Braces size={17} /></span> Value preview</div>{current && <button className="icon-button" title="Copy value" onClick={() => navigator.clipboard.writeText(current.value).then(() => onNotify('Value copied to clipboard')).catch(() => onNotify('Could not copy value'))}><Copy size={15} /></button>}</div>{current ? <div className="preview-content"><div className="detail-overline">SELECTED KEY</div><div className="preview-key mono">{current.key}</div><div className="preview-meta"><span>Size <strong>{formatBytes(current.value)}</strong></span><span>Expires <strong>{current.expires ? new Date(current.expires).toLocaleString() : 'Never'}</strong></span></div><div className="code-header"><span>STORED VALUE</span><span className="mono">{(() => { try { JSON.parse(current.value); return 'JSON'; } catch { return 'TEXT'; } })()}</span></div><pre className="code-block preview-code">{formattedValue(current.value)}</pre><button className="secondary-button full-button" onClick={() => { navigator.clipboard.writeText(current.value).then(() => onNotify('Value copied to clipboard')).catch(() => onNotify('Could not copy value')); }}><Copy size={15} /> Copy value</button></div> : <div className="preview-empty">Select an entry to inspect its value.</div>}</section></div>
    {adding && <div className="modal-backdrop" onMouseDown={event => { if (event.target === event.currentTarget) setAdding(false); }}><div className="modal panel" role="dialog" aria-modal="true" aria-label="Add storage entry"><div className="modal-header"><div><h2>Add storage entry</h2><p>Create a new key-value pair in {kind === 'indexed' ? 'IndexedDB' : kind + 'Storage'}.</p></div><button className="icon-button" onClick={() => setAdding(false)} title="Close"><X size={18} /></button></div><div className="modal-fields"><label>KEY<input value={newKey} onChange={event => { setNewKey(event.target.value); setError(''); }} placeholder="my_app:setting" autoFocus /></label><label>VALUE<textarea value={newValue} onChange={event => { setNewValue(event.target.value); setError(''); }} placeholder='{"enabled": true}' rows={4} /></label><label>EXPIRES IN<select value={expiresIn} onChange={event => setExpiresIn(event.target.value)}><option value="never">Never</option><option value="1">1 hour</option><option value="24">24 hours</option><option value="168">7 days</option></select></label>{error && <div className="form-error">{error}</div>}</div><div className="modal-actions"><button className="secondary-button" onClick={() => setAdding(false)}>Cancel</button><button className="primary-button" onClick={addItem}><Check size={16} /> Save entry</button></div></div></div>}
  </div>;
}