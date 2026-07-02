import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Search, CornerDownLeft } from 'lucide-react';
import type { AppInfo } from './types';
import { useWindows } from './WindowManager';
import { useHub } from './HubContext';
import { SYSTEM_APPS } from './systemApps';
import AppGlyph from './AppGlyph';
import { tintFor } from './iconStyle';

const MAX_RESULTS = 8;

// Spotlight-style command palette: Cmd/Ctrl+K opens it; type to filter apps,
// ↑/↓ to move, Enter launches the selection, Esc closes.
const Spotlight: React.FC<{ onClose: () => void }> = ({ onClose }) => {
  const { openApp } = useWindows();
  const { apps } = useHub();
  const [q, setQ] = useState('');
  const [sel, setSel] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  const all = useMemo(() => [...apps, ...SYSTEM_APPS], [apps]);

  const results = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return all.slice(0, MAX_RESULTS);
    return all
      .map(a => {
        const name = a.name.toLowerCase();
        const cat = (a.category || '').toLowerCase();
        let score = -1;
        if (name.startsWith(s)) score = 0;
        else if (name.includes(s)) score = 1;
        else if (cat.includes(s)) score = 2;
        return { a, score };
      })
      .filter(x => x.score >= 0)
      .sort((x, y) => x.score - y.score)
      .slice(0, MAX_RESULTS)
      .map(x => x.a);
  }, [q, all]);

  useEffect(() => { inputRef.current?.focus(); }, []);
  useEffect(() => { setSel(0); }, [q]);
  useEffect(() => {
    listRef.current?.querySelector('.os-spot-item.sel')?.scrollIntoView({ block: 'nearest' });
  }, [sel]);

  const launch = (app?: AppInfo) => { if (app) { openApp(app); onClose(); } };

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') { e.preventDefault(); setSel(i => Math.min(i + 1, results.length - 1)); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setSel(i => Math.max(i - 1, 0)); }
    else if (e.key === 'Enter') { e.preventDefault(); launch(results[sel]); }
    else if (e.key === 'Escape') { e.preventDefault(); onClose(); }
  };

  return (
    <div className="os-spotlight" onMouseDown={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="os-spot-panel" onKeyDown={onKeyDown}>
        <div className="os-spot-search">
          <Search size={20} />
          <input
            ref={inputRef}
            value={q}
            onChange={e => setQ(e.target.value)}
            placeholder="Search apps…"
            aria-label="Search apps"
            autoComplete="off"
            spellCheck={false}
          />
          <kbd className="os-spot-kbd">esc</kbd>
        </div>
        {results.length > 0 && (
          <div className="os-spot-list" ref={listRef} role="listbox" aria-label="Results">
            {results.map((a, i) => (
              <button
                key={a.id}
                type="button"
                role="option"
                aria-selected={i === sel}
                className={`os-spot-item ${i === sel ? 'sel' : ''}`}
                onMouseMove={() => setSel(i)}
                onClick={() => launch(a)}
              >
                <span className="os-spot-ic" style={{ background: tintFor(a) }}><AppGlyph app={a} size={18} /></span>
                <span className="os-spot-name">{a.name}</span>
                {a.category && <span className="os-spot-cat">{a.category}</span>}
                {i === sel && <CornerDownLeft size={14} className="os-spot-enter" aria-hidden="true" />}
              </button>
            ))}
          </div>
        )}
        {q.trim() && results.length === 0 && (
          <div className="os-spot-empty">No apps match “{q.trim()}”.</div>
        )}
      </div>
    </div>
  );
};

export default Spotlight;
