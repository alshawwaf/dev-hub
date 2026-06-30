import React, { useState, useEffect, useRef } from 'react';
import { Search } from 'lucide-react';
import type { AppInfo } from './types';
import { useWindows } from './WindowManager';
import { SYSTEM_APPS } from './systemApps';
import AppGlyph from './AppGlyph';
import { tintFor } from './iconStyle';

const Launchpad: React.FC<{ apps: AppInfo[]; onClose: () => void }> = ({ apps, onClose }) => {
  const { openApp } = useWindows();
  const [q, setQ] = useState('');
  const restoreFocus = useRef<HTMLElement | null>(null);

  useEffect(() => {
    restoreFocus.current = document.activeElement as HTMLElement;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener('keydown', onKey);
      restoreFocus.current?.focus?.();
    };
  }, [onClose]);

  const all = [...apps, ...SYSTEM_APPS];
  const filtered = all.filter(a =>
    a.name.toLowerCase().includes(q.toLowerCase()) || (a.category || '').toLowerCase().includes(q.toLowerCase()),
  );

  const launch = (app: AppInfo) => { openApp(app); onClose(); };

  return (
    <div className="os-launchpad" role="dialog" aria-modal="true" aria-label="Launchpad" onMouseDown={onClose}>
      <div className="os-launchpad-search" onMouseDown={e => e.stopPropagation()}>
        <Search size={18} />
        <input autoFocus value={q} onChange={e => setQ(e.target.value)} placeholder="Search apps" aria-label="Search apps" />
      </div>
      <div className="os-launchpad-grid" onMouseDown={e => e.stopPropagation()}>
        {filtered.map(app => (
          <button key={app.id} className="os-launchpad-item" onClick={() => launch(app)}>
            <span className="os-launchpad-icon" style={{ background: tintFor(app) }}><AppGlyph app={app} size={40} /></span>
            <span className="os-launchpad-label">{app.name}</span>
          </button>
        ))}
        {filtered.length === 0 && <p className="os-launchpad-empty">No apps match “{q}”.</p>}
      </div>
    </div>
  );
};

export default Launchpad;
