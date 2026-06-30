import React from 'react';
import { ExternalLink, Pin, PinOff, EyeOff, Play, Pencil, Trash2, SlidersHorizontal } from 'lucide-react';
import type { AppInfo } from './types';
import { useWindows } from './WindowManager';
import { useLayout } from './LayoutContext';
import { useContextMenu, type MenuItem } from './ContextMenu';
import { useHub } from './HubContext';
import { DRAG_MIME } from './drag';
import { openExternal } from './url';
import AppGlyph from './AppGlyph';
import { tintFor } from './iconStyle';

const DesktopIcon: React.FC<{ app: AppInfo }> = ({ app }) => {
  const { openApp, isOpen } = useWindows();
  const { getPlacement, setPlacement } = useLayout();
  const { open: openMenu, openAt } = useContextMenu();
  const { isAdmin, openEditApp, openRenameApp, openDeleteApp } = useHub();
  const placement = getPlacement(app);
  const running = isOpen(app.id);

  const menuItems = (): MenuItem[] => {
    const items: MenuItem[] = [
      { label: 'Open', icon: <Play size={15} />, onClick: () => openApp(app) },
      { separator: true, label: '' },
      placement === 'both'
        ? { label: 'Remove from Dock', icon: <PinOff size={15} />, onClick: () => setPlacement(app, 'desktop') }
        : { label: 'Keep in Dock', icon: <Pin size={15} />, onClick: () => setPlacement(app, 'both') },
      { label: 'Remove from Desktop', icon: <EyeOff size={15} />, onClick: () => setPlacement(app, placement === 'both' ? 'dock' : 'hidden') },
      { separator: true, label: '' },
      { label: 'Open in new tab', icon: <ExternalLink size={15} />, onClick: () => openExternal(app.url) },
    ];
    if (isAdmin) {
      items.push(
        { separator: true, label: '' },
        { label: 'Rename…', icon: <Pencil size={15} />, onClick: () => openRenameApp(app) },
        { label: 'Edit app…', icon: <SlidersHorizontal size={15} />, onClick: () => openEditApp(app) },
        { label: 'Delete app…', icon: <Trash2 size={15} />, danger: true, onClick: () => openDeleteApp(app) },
      );
    }
    return items;
  };

  const onContextMenu = (e: React.MouseEvent) => openMenu(e, menuItems());

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ContextMenu' || (e.shiftKey && e.key === 'F10')) {
      e.preventDefault();
      const r = e.currentTarget.getBoundingClientRect();
      openAt(r.left + 8, r.bottom, menuItems());
    }
  };

  const onDragStart = (e: React.DragEvent) => {
    e.dataTransfer.setData(DRAG_MIME, JSON.stringify({ id: app.id, source: 'desktop' }));
    e.dataTransfer.effectAllowed = 'move';
  };

  return (
    <button
      className={`os-deskicon ${running ? 'running' : ''}`}
      draggable
      onDragStart={onDragStart}
      onClick={() => openApp(app)}
      onContextMenu={onContextMenu}
      onKeyDown={onKeyDown}
      title={app.description || app.name}
    >
      <span className="os-deskicon-tile" style={{ background: tintFor(app) }}><AppGlyph app={app} size={30} /></span>
      <span className="os-deskicon-label">{app.name}</span>
    </button>
  );
};

const DesktopIcons: React.FC = () => {
  const { desktopApps } = useLayout();
  if (!desktopApps.length) return null;
  return (
    <div className="os-deskicons">
      {desktopApps.map(app => (
        <DesktopIcon key={app.id} app={app} />
      ))}
    </div>
  );
};

export default DesktopIcons;
