import React, { useState, useEffect, useRef } from 'react';
import { Search, Play, ExternalLink, Pin, PinOff, Pencil, Trash2 } from 'lucide-react';
import type { AppInfo } from './types';
import { useWindows } from './WindowManager';
import { useLayout } from './LayoutContext';
import { useContextMenu, type MenuItem } from './ContextMenu';
import { useHub } from './HubContext';
import { SYSTEM_APPS } from './systemApps';
import { openExternal } from './url';
import AppGlyph from './AppGlyph';
import { tintFor } from './iconStyle';

const Launchpad: React.FC<{ apps: AppInfo[]; onClose: () => void }> = ({ apps, onClose }) => {
  const { openApp } = useWindows();
  const { getPlacement, setPlacement } = useLayout();
  const { open: openMenu } = useContextMenu();
  const { isAdmin, openEditApp, openDeleteApp } = useHub();
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

  // Per-app right-click menu (built-in system apps only get "Open").
  const onItemMenu = (app: AppInfo) => (e: React.MouseEvent) => {
    if (app.system) return;
    const placement = getPlacement(app);
    const inDock = placement === 'dock' || placement === 'both';
    const items: MenuItem[] = [
      { label: 'Open', icon: <Play size={15} />, onClick: () => launch(app) },
      { separator: true, label: '' },
      inDock
        ? { label: 'Remove from Dock', icon: <PinOff size={15} />, onClick: () => setPlacement(app, placement === 'both' ? 'desktop' : 'hidden') }
        : { label: 'Keep in Dock', icon: <Pin size={15} />, onClick: () => setPlacement(app, placement === 'desktop' ? 'both' : 'dock') },
      { label: 'Open in new tab', icon: <ExternalLink size={15} />, onClick: () => openExternal(app.url) },
    ];
    if (isAdmin) {
      items.push(
        { separator: true, label: '' },
        { label: 'Rename / Edit…', icon: <Pencil size={15} />, onClick: () => { onClose(); openEditApp(app); } },
        { label: 'Delete app…', icon: <Trash2 size={15} />, danger: true, onClick: () => { onClose(); openDeleteApp(app); } },
      );
    }
    openMenu(e, items);
  };

  return (
    <div className="os-launchpad" role="dialog" aria-modal="true" aria-label="Launchpad" onMouseDown={onClose}>
      <div className="os-launchpad-search" onMouseDown={e => e.stopPropagation()}>
        <Search size={18} />
        <input autoFocus value={q} onChange={e => setQ(e.target.value)} placeholder="Search apps" aria-label="Search apps" />
      </div>
      <div className="os-launchpad-grid" onMouseDown={e => e.stopPropagation()}>
        {filtered.map(app => (
          <button key={app.id} className="os-launchpad-item" onClick={() => launch(app)} onContextMenu={onItemMenu(app)}>
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
