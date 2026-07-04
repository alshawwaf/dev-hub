import React, { useState } from 'react';
import { LayoutGrid, ExternalLink, PinOff, Pin, Monitor, EyeOff, Play, Pencil, Trash2, SlidersHorizontal, Github, Copy } from 'lucide-react';
import type { AppInfo } from './types';
import { useWindows } from './WindowManager';
import { useLayout } from './LayoutContext';
import { useContextMenu } from './ContextMenu';
import type { MenuItem } from './ContextMenu';
import { useHub } from './HubContext';
import { systemAppsFor } from './systemApps';
import { DRAG_MIME } from './drag';
import { openExternal } from './url';
import AppGlyph from './AppGlyph';
import ColorSwatches from './ColorSwatches';

const DockTile: React.FC<{ app: AppInfo; draggable?: boolean; onMenu?: (e: React.MouseEvent) => void }> = ({ app, draggable, onMenu }) => {
  const { openApp, isOpen } = useWindows();
  const { iconTileBg } = useLayout();
  const running = isOpen(app.id);
  const [bouncing, setBouncing] = useState(false);

  const onDragStart = (e: React.DragEvent) => {
    e.dataTransfer.setData(DRAG_MIME, JSON.stringify({ id: app.id, source: 'dock' }));
    e.dataTransfer.effectAllowed = 'move';
  };

  return (
    <button
      className="os-dock-item"
      onClick={() => { setBouncing(true); openApp(app); }}
      onContextMenu={onMenu}
      draggable={draggable}
      onDragStart={draggable ? onDragStart : undefined}
      title={app.name}
      aria-label={`Open ${app.name}`}
    >
      <span className="os-dock-tooltip">{app.name}</span>
      <span
        className={`os-dock-icon ${app.system ? 'system' : ''} ${bouncing ? 'bouncing' : ''}`}
        style={{ background: iconTileBg(app) }}
        onAnimationEnd={() => setBouncing(false)}
      >
        <AppGlyph app={app} size={26} emojiClass="os-dock-emoji" />
      </span>
      <span className={`os-dock-dot ${running ? 'on' : ''}`} aria-hidden="true" />
    </button>
  );
};

interface DockProps {
  apps: AppInfo[];
  onOpenLaunchpad: () => void;
}

const Dock: React.FC<DockProps> = ({ apps, onOpenLaunchpad }) => {
  const { windows, openApp } = useWindows();
  const { dockApps, getPlacement, setPlacement, copyApp, iconColorOf, setIconColor } = useLayout();
  const { open: openMenu, close: closeMenu } = useContextMenu();
  const { isAdmin, openEditApp, openRenameApp, openDeleteApp } = useHub();

  const pinnedIds = new Set(dockApps.map(a => a.id));
  const openCatalogIds = new Set(windows.map(w => w.app.id).filter(id => id > 0));
  const runningNotPinned = apps.filter(a => openCatalogIds.has(a.id) && !pinnedIds.has(a.id));
  const leftApps = [...dockApps, ...runningNotPinned];

  const catalogMenu = (app: AppInfo, isPinned: boolean) => (e: React.MouseEvent) => {
    const placement = getPlacement(app);
    const items: MenuItem[] = [
      { label: 'Open', icon: <Play size={15} />, onClick: () => openApp(app) },
      { separator: true, label: '' },
    ];
    if (isPinned) {
      items.push(
        placement === 'both'
          ? { label: 'Remove from Desktop', icon: <EyeOff size={15} />, onClick: () => setPlacement(app, 'dock') }
          : { label: 'Show on Desktop', icon: <Monitor size={15} />, onClick: () => setPlacement(app, 'both') },
        { label: 'Remove from Dock', icon: <PinOff size={15} />, onClick: () => setPlacement(app, placement === 'both' ? 'desktop' : 'hidden') },
      );
    } else {
      // running but not pinned — the only sensible action is to pin it
      items.push({ label: 'Keep in Dock', icon: <Pin size={15} />, onClick: () => setPlacement(app, placement === 'desktop' ? 'both' : 'dock') });
    }
    items.push(
      { separator: true, label: '' },
      { heading: 'Icon Color', label: '' },
      { content: <ColorSwatches current={iconColorOf(app.id)} onPick={c => setIconColor(app.id, c)} onClose={closeMenu} allowCustom />, label: '' },
      { separator: true, label: '' },
      { label: 'Copy', icon: <Copy size={15} />, onClick: () => copyApp(app.id) },
      { label: 'Open in new tab', icon: <ExternalLink size={15} />, onClick: () => openExternal(app.url) },
    );
    if (app.github_url) {
      items.push({ label: 'View source on GitHub', icon: <Github size={15} />, onClick: () => openExternal(app.github_url) });
    }
    if (isAdmin) {
      items.push(
        { separator: true, label: '' },
        { label: 'Rename…', icon: <Pencil size={15} />, onClick: () => openRenameApp(app) },
        { label: 'Edit app…', icon: <SlidersHorizontal size={15} />, onClick: () => openEditApp(app) },
        { label: 'Delete app…', icon: <Trash2 size={15} />, danger: true, onClick: () => openDeleteApp(app) },
      );
    }
    openMenu(e, items);
  };

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    try {
      const raw = e.dataTransfer.getData(DRAG_MIME);
      const payload = raw ? JSON.parse(raw) : null;
      if (!payload || payload.source !== 'desktop') return;
      const app = apps.find(a => a.id === payload.id);
      if (app) setPlacement(app, 'dock');
    } catch { /* ignore malformed drag */ }
  };

  return (
    <div className="os-dock-wrap">
      <div
        className="os-dock"
        onDragOver={e => { e.preventDefault(); e.dataTransfer.dropEffect = 'move'; }}
        onDrop={onDrop}
      >
        <button className="os-dock-item" onClick={onOpenLaunchpad} title="Launchpad" aria-label="Open Launchpad">
          <span className="os-dock-tooltip">Launchpad</span>
          <span className="os-dock-icon system launchpad"><LayoutGrid size={24} /></span>
          <span className="os-dock-dot" aria-hidden="true" />
        </button>

        {leftApps.length > 0 && <span className="os-dock-sep" />}
        {leftApps.map(app => (
          <DockTile key={app.id} app={app} draggable={pinnedIds.has(app.id)} onMenu={catalogMenu(app, pinnedIds.has(app.id))} />
        ))}

        <span className="os-dock-sep" />
        {systemAppsFor(isAdmin).map(app => (
          <DockTile key={app.id} app={app} />
        ))}
      </div>
    </div>
  );
};

export default Dock;
