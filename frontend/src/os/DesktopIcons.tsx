import React, { useRef, useState } from 'react';
import { ExternalLink, Pin, PinOff, EyeOff, Play, Pencil, Trash2, SlidersHorizontal, Github } from 'lucide-react';
import type { AppInfo } from './types';
import { useWindows } from './WindowManager';
import { useLayout } from './LayoutContext';
import { useContextMenu, type MenuItem } from './ContextMenu';
import { useHub } from './HubContext';
import { openExternal } from './url';
import AppGlyph from './AppGlyph';
import { tintFor } from './iconStyle';
import { flowPositions, snapToFreeCell, rowsPerColumn, type Pos } from './iconGrid';

const DesktopIcon: React.FC<{ app: AppInfo; pos: Pos; onMove: (id: number, x: number, y: number) => void }> = ({ app, pos, onMove }) => {
  const { openApp, isOpen } = useWindows();
  const { getPlacement, setPlacement } = useLayout();
  const { open: openMenu, openAt } = useContextMenu();
  const { isAdmin, openEditApp, openRenameApp, openDeleteApp } = useHub();
  const placement = getPlacement(app);
  const running = isOpen(app.id);
  const [drag, setDrag] = useState<{ dx: number; dy: number } | null>(null);
  const movedRef = useRef(false);

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

  // Pointer-drag to reposition; a plain click (no movement) opens the app.
  const onPointerDown = (e: React.PointerEvent) => {
    if (e.button !== 0) return;
    const sx = e.clientX, sy = e.clientY;
    movedRef.current = false;
    const onPointerMove = (ev: PointerEvent) => {
      const dx = ev.clientX - sx, dy = ev.clientY - sy;
      if (!movedRef.current && Math.hypot(dx, dy) > 4) movedRef.current = true;
      if (movedRef.current) setDrag({ dx, dy });
    };
    const onPointerUp = (ev: PointerEvent) => {
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerup', onPointerUp);
      setDrag(null);
      if (movedRef.current) onMove(app.id, pos.x + (ev.clientX - sx), pos.y + (ev.clientY - sy));
    };
    window.addEventListener('pointermove', onPointerMove);
    window.addEventListener('pointerup', onPointerUp);
  };

  const onClick = () => {
    if (movedRef.current) { movedRef.current = false; return; }   // was a drag, not a click
    openApp(app);
  };

  return (
    <button
      className={`os-deskicon ${running ? 'running' : ''} ${drag ? 'dragging' : ''}`}
      style={{ left: pos.x, top: pos.y, transform: drag ? `translate(${drag.dx}px, ${drag.dy}px)` : undefined }}
      onPointerDown={onPointerDown}
      onClick={onClick}
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
  const { desktopApps, iconPositions, setIconPos } = useLayout();
  if (!desktopApps.length) return null;

  const rows = rowsPerColumn(window.innerHeight);
  const ids = desktopApps.map(a => a.id);
  const positions = flowPositions(ids, iconPositions, rows);
  const onMove = (id: number, x: number, y: number) => setIconPos(id, snapToFreeCell(x, y, id, positions, rows));

  return (
    <div className="os-deskicons">
      {desktopApps.map(app => (
        <DesktopIcon key={app.id} app={app} pos={positions[app.id]} onMove={onMove} />
      ))}
    </div>
  );
};

export default DesktopIcons;
