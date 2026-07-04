import React, { useState, useEffect, useRef } from 'react';
import { Search, Play, ExternalLink, Pencil, Trash2, MoreHorizontal, SlidersHorizontal, Github, Copy, RotateCw, Rocket } from 'lucide-react';
import type { AppInfo } from './types';
import { useWindows } from './WindowManager';
import { useLayout } from './LayoutContext';
import { useContextMenu, type MenuItem } from './ContextMenu';
import { useHub } from './HubContext';
import { systemAppsFor } from './systemApps';
import { hasDeployMapping, powerApp } from './power';
import { openExternal } from './url';
import AppGlyph from './AppGlyph';
import ColorSwatches from './ColorSwatches';

const Launchpad: React.FC<{ apps: AppInfo[]; onClose: () => void }> = ({ apps, onClose }) => {
  const { openApp } = useWindows();
  const { getPlacement, setPlacement, copyApp, iconColorOf, setIconColor, iconTileBg } = useLayout();
  const { open: openMenu, openAt, close: closeMenu } = useContextMenu();
  const { isAdmin, openEditApp, openRenameApp, openDeleteApp } = useHub();
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

  const all = [...apps, ...systemAppsFor(isAdmin)];
  const filtered = all.filter(a =>
    a.name.toLowerCase().includes(q.toLowerCase()) || (a.category || '').toLowerCase().includes(q.toLowerCase()),
  );

  const launch = (app: AppInfo) => { openApp(app); onClose(); };

  // Shared per-app menu: live In-Dock / On-Desktop toggles (independent, mapped
  // onto the Placement enum) + open/edit. Built-in system apps get no menu.
  const buildItems = (app: AppInfo): MenuItem[] => {
    const p = getPlacement(app);
    const inDock = p === 'dock' || p === 'both';
    const onDesk = p === 'desktop' || p === 'both';
    const items: MenuItem[] = [
      { label: 'Open', icon: <Play size={15} />, onClick: () => launch(app) },
      { separator: true, label: '' },
      { label: 'In Dock', checked: inDock, keepOpen: true, onClick: () => setPlacement(app, inDock ? (onDesk ? 'desktop' : 'hidden') : (onDesk ? 'both' : 'dock')) },
      { label: 'On Desktop', checked: onDesk, keepOpen: true, onClick: () => setPlacement(app, onDesk ? (inDock ? 'dock' : 'hidden') : (inDock ? 'both' : 'desktop')) },
      { separator: true, label: '' },
      { heading: 'Icon Color', label: '' },
      { content: <ColorSwatches current={iconColorOf(app.id)} onPick={c => setIconColor(app.id, c)} onClose={closeMenu} allowCustom />, label: '' },
      { separator: true, label: '' },
      { label: 'Copy', icon: <Copy size={15} />, onClick: () => copyApp(app.id) },
      { label: 'Open in new tab', icon: <ExternalLink size={15} />, onClick: () => openExternal(app.url) },
    ];
    if (app.github_url) {
      items.push({ label: 'View source on GitHub', icon: <Github size={15} />, onClick: () => openExternal(app.github_url) });
    }
    if (isAdmin) {
      // Quick lifecycle ops for Dokploy-mapped apps — full controls live in the Admin window.
      if (hasDeployMapping(app)) {
        const runPower = async (action: 'restart' | 'redeploy') => {
          const r = await powerApp(app, action);
          if (r && !r.ok) window.alert(r.message);
        };
        items.push({ separator: true, label: '' });
        // Compose services have no restart in Dokploy — offer redeploy only.
        if (app.deploy_kind !== 'compose') {
          items.push({ label: 'Restart', icon: <RotateCw size={15} />, onClick: () => { void runPower('restart'); } });
        }
        items.push({ label: 'Redeploy', icon: <Rocket size={15} />, onClick: () => { void runPower('redeploy'); } });
      }
      items.push(
        { separator: true, label: '' },
        { label: 'Rename…', icon: <Pencil size={15} />, onClick: () => { onClose(); openRenameApp(app); } },
        { label: 'Edit app…', icon: <SlidersHorizontal size={15} />, onClick: () => { onClose(); openEditApp(app); } },
        { label: 'Delete app…', icon: <Trash2 size={15} />, danger: true, onClick: () => { onClose(); openDeleteApp(app); } },
      );
    }
    return items;
  };

  const onItemMenu = (app: AppInfo) => (e: React.MouseEvent) => {
    if (app.system) return;
    openMenu(e, buildItems(app));
  };
  const onMore = (app: AppInfo) => (e: React.MouseEvent) => {
    e.stopPropagation();
    const r = (e.currentTarget as HTMLElement).getBoundingClientRect();
    openAt(r.right - 210, r.bottom + 6, buildItems(app));
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
            <span className="os-launchpad-icon" style={{ background: iconTileBg(app) }}>
              <AppGlyph app={app} size={40} />
              {!app.system && (
                <span className="os-launchpad-more" role="button" tabIndex={-1} aria-label={`Options for ${app.name}`} onClick={onMore(app)}>
                  <MoreHorizontal size={14} />
                </span>
              )}
            </span>
            <span className="os-launchpad-label">{app.name}</span>
          </button>
        ))}
        {filtered.length === 0 && <p className="os-launchpad-empty">No apps match “{q}”.</p>}
      </div>
    </div>
  );
};

export default Launchpad;
