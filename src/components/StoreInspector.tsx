import { useEffect, useMemo, useRef, useState } from 'react';
import { Check, ChevronDown, ChevronRight, ChevronsDownUp, ChevronsUpDown, Copy, Pencil, Search, X } from 'lucide-react';
import type { JsonValue, StoreState } from '../types';

type Props = {
  state: StoreState;
  selectedPath: string[];
  onSelect: (path: string[]) => void;
  onEdit: (path: string[], value: JsonValue) => void;
  onNotify: (message: string) => void;
};

const isBranch = (value: JsonValue): value is JsonValue[] | { [key: string]: JsonValue } => typeof value === 'object' && value !== null;
const typeOf = (value: JsonValue) => value === null ? 'null' : Array.isArray(value) ? 'array' : typeof value === 'object' ? 'object' : typeof value;

export default function StoreInspector({ state, selectedPath, onSelect, onEdit, onNotify }: Props) {
  const [expanded, setExpanded] = useState<Set<string>>(new Set(['root', 'user', 'cart', 'settings', 'ui', 'user.preferences']));
  const [query, setQuery] = useState('');
  const [editing, setEditing] = useState<string | null>(null);
  const [draft, setDraft] = useState('');
  const [error, setError] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => { if (editing) inputRef.current?.focus(); }, [editing]);

  const branchPaths = useMemo(() => {
    const paths = ['root'];
    const walk = (value: JsonValue, path: string) => {
      if (!isBranch(value)) return;
      paths.push(path);
      Object.entries(value).forEach(([key, child]) => walk(child, path ? `${path}.${key}` : key));
    };
    Object.entries(state).forEach(([key, value]) => walk(value, key));
    return paths;
  }, [state]);

  const toggle = (path: string) => setExpanded(previous => {
    const next = new Set(previous);
    if (next.has(path)) next.delete(path); else next.add(path);
    return next;
  });

  const matches = (value: JsonValue, path: string): boolean => {
    if (!query.trim()) return true;
    const needle = query.toLowerCase();
    if (path.toLowerCase().includes(needle)) return true;
    if (isBranch(value)) return Object.entries(value).some(([key, child]) => matches(child, `${path}.${key}`));
    return String(value).toLowerCase().includes(needle);
  };

  const beginEdit = (path: string[], value: JsonValue) => {
    if (isBranch(value)) return;
    onSelect(path);
    setEditing(path.join('.'));
    setDraft(typeof value === 'string' ? value : JSON.stringify(value));
    setError('');
  };

  const saveEdit = (path: string[], original: JsonValue) => {
    let parsed: JsonValue;
    if (typeof original === 'string') parsed = draft;
    else {
      try {
        parsed = JSON.parse(draft) as JsonValue;
        if (typeof parsed !== typeof original && !(original === null && parsed === null)) {
          setError(`Expected a ${typeOf(original)} value`);
          return;
        }
      } catch {
        setError('Enter valid JSON for this value');
        return;
      }
    }
    onEdit(path, parsed);
    setEditing(null);
  };

  const renderNode = (key: string, value: JsonValue, path: string[], depth: number): React.ReactNode => {
    const pathKey = path.join('.');
    if (!matches(value, pathKey)) return null;
    const branch = isBranch(value);
    const open = query.trim() ? true : expanded.has(pathKey);
    const selected = selectedPath.join('.') === pathKey;
    const entries = branch ? Object.entries(value) : [];
    const kind = typeOf(value);
    return (
      <div key={pathKey}>
        <div
          className={`tree-row group ${selected ? 'tree-row-selected' : ''}`}
          style={{ paddingLeft: `${depth * 23 + 18}px` }}
          onClick={() => { onSelect(path); if (branch) toggle(pathKey); }}
          onDoubleClick={() => beginEdit(path, value)}
        >
          <span className="tree-chevron">{branch ? (open ? <ChevronDown size={14} /> : <ChevronRight size={14} />) : <span className="tree-dot" />}</span>
          <span className={`tree-key ${depth === 0 ? 'text-violet-300' : ''}`}>{key}</span>
          <span className="text-slate-500">:</span>
          {branch ? (
            <span className="tree-bracket">{Array.isArray(value) ? '[' : '{'} <span className="tree-count">{entries.length} {Array.isArray(value) ? 'items' : 'keys'}</span> {open ? '' : (Array.isArray(value) ? ']' : '}')}</span>
          ) : editing === pathKey ? (
            <span className="tree-edit" onClick={event => event.stopPropagation()}>
              <input ref={inputRef} value={draft} onChange={event => { setDraft(event.target.value); setError(''); }} onKeyDown={event => { if (event.key === 'Enter') saveEdit(path, value); if (event.key === 'Escape') setEditing(null); }} aria-label={`Edit ${pathKey}`} />
              <button onClick={() => saveEdit(path, value)} title="Save value"><Check size={14} /></button>
              <button onClick={() => setEditing(null)} title="Cancel editing"><X size={14} /></button>
              {error && <span className="tree-error">{error}</span>}
            </span>
          ) : (
            <span className={`tree-value value-${kind}`}>{typeof value === 'string' ? `"${value}"` : String(value)}</span>
          )}
          {!branch && editing !== pathKey && <button className="tree-pencil" onClick={event => { event.stopPropagation(); beginEdit(path, value); }} title={`Edit ${pathKey}`}><Pencil size={13} /></button>}
        </div>
        {branch && open && entries.map(([childKey, child]) => renderNode(childKey, child, [...path, childKey], depth + 1))}
        {branch && open && <div className="tree-row tree-closing" style={{ paddingLeft: `${depth * 23 + 53}px` }}>{Array.isArray(value) ? ']' : '}'}</div>}
      </div>
    );
  };

  return (
    <section className="panel tree-panel">
      <div className="panel-heading tree-heading">
        <div>
          <div className="panel-title"><span className="title-icon violet"><span className="code-braces">{'{}'}</span></span> Store state <span className="heading-subtle">/ root</span></div>
          <p className="panel-subtitle">Explore and edit your live application state.</p>
        </div>
        <div className="tree-heading-actions">
          <span className="live-chip"><span className="live-dot" /> LIVE</span>
          <button className="icon-button" title="Copy state as JSON" onClick={() => { navigator.clipboard.writeText(JSON.stringify(state, null, 2)).then(() => onNotify('State JSON copied to clipboard')).catch(() => onNotify('Could not copy state')); }}><Copy size={15} /></button>
        </div>
      </div>
      <div className="tree-toolbar">
        <label className="search-field"><Search size={16} /><input value={query} onChange={event => setQuery(event.target.value)} placeholder="Search state keys or values..." aria-label="Search state" /><span className="search-shortcut">/</span></label>
        <button className="toolbar-button" onClick={() => setExpanded(new Set(branchPaths))} title="Expand all"><ChevronsUpDown size={15} /><span>Expand</span></button>
        <button className="toolbar-button" onClick={() => setExpanded(new Set(['root']))} title="Collapse all"><ChevronsDownUp size={15} /><span>Collapse</span></button>
      </div>
      <div className="tree-scroll">
        <div className="tree-root" onClick={() => toggle('root')}><ChevronDown size={14} className={expanded.has('root') ? '' : '-rotate-90'} /><span className="text-violet-300">root</span><span className="text-slate-500">:</span><span className="tree-bracket">{'{'} <span className="tree-count">{Object.keys(state).length} slices</span></span></div>
        {(expanded.has('root') || query) && Object.entries(state).map(([key, value]) => renderNode(key, value, [key], 0))}
        {(expanded.has('root') || query) && <div className="tree-row tree-closing" style={{ paddingLeft: 34 }}>{'}'}</div>}
        {query && !Object.entries(state).some(([key, value]) => matches(value, key)) && <div className="empty-search">No state values match "{query}"</div>}
      </div>
      <div className="tree-footer"><span><span className="footer-dot" /> State is up to date</span><span>Click any value to select, double-click to edit</span></div>
    </section>
  );
}