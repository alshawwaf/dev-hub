import React, { useEffect, useRef, useState } from 'react';
import { ExternalLink, Play, Copy, FolderMinus, ClipboardPaste, FolderOpen } from 'lucide-react';
import type { AppInfo, FolderInfo } from './types';
import { useLayout } from './LayoutContext';
import { useWindows } from './WindowManager';
import { useContextMenu, type MenuItem } from './ContextMenu';
import { openExternal } from './url';
import AppGlyph from './AppGlyph';
import ColorSwatches from './ColorSwatches';

const TILE_W = 92;
const TILE_H = 108;

// One app tile inside the open folder. Click opens the app; pointer-drag lets
// you pull it OUT of the folder onto the desktop (macOS Launchpad) — the parent
// decides what a release outside the panel means.
const FolderItem: React.FC<{
  app: AppInfo;
  onOpen: (app: AppInfo) => void;
  onMenu: (e: React.MouseEvent, app: AppInfo) => void;
  onMenuKey: (x: number, y: number, app: AppInfo) => void;
  onDragState: (dragging: boolean) => void;
  onDragOut: (app: AppInfo, clientX: number, clientY: number) => boolean;
}> = ({ app, onOpen, onMenu, onMenuKey, onDragState, onDragOut }) => {
  const { copyApp, iconTileBg } = useLayout();
  const [drag, setDrag] = useState<{ dx: number; dy: number } | null>(null);
  const movedRef = useRef(false);

  // Keyboard parity with the desktop icons: context-menu key / Shift+F10 opens the
  // menu at the tile; Cmd/Ctrl+C copies.
  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ContextMenu' || (e.shiftKey && e.key === 'F10')) {
      e.preventDefault();
      const r = e.currentTarget.getBoundingClientRect();
      onMenuKey(r.left + 8, r.bottom, app);
    } else if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'c') {
      e.preventDefault();
      copyApp(app.id);
    }
  };

  const onPointerDown = (e: React.PointerEvent) => {
    if (e.button !== 0) return;
    const sx = e.clientX, sy = e.clientY;
    movedRef.current = false;
    const onPointerMove = (ev: PointerEvent) => {
      const dx = ev.clientX - sx, dy = ev.clientY - sy;
      if (!movedRef.current && Math.hypot(dx, dy) > 4) { movedRef.current = true; onDragState(true); }
      if (movedRef.current) setDrag({ dx, dy });
    };
    const onPointerUp = (ev: PointerEvent) => {
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerup', onPointerUp);
      setDrag(null);
      onDragState(false);
      if (movedRef.current) onDragOut(app, ev.clientX, ev.clientY);
    };
    window.addEventListener('pointermove', onPointerMove);
    window.addEventListener('pointerup', onPointerUp);
  };

  const onClick = () => {
    if (movedRef.current) { movedRef.current = false; return; }
    onOpen(app);
  };

  return (
    <button
      className={`os-fv-item ${drag ? 'dragging' : ''}`}
      style={{ transform: drag ? `translate(${drag.dx}px, ${drag.dy}px)` : undefined }}
      onPointerDown={onPointerDown}
      onClick={onClick}
      onContextMenu={e => onMenu(e, app)}
      onKeyDown={onKeyDown}
      title={app.description || app.name}
    >
      <span className="os-deskicon-tile" style={{ background: iconTileBg(app) }}><AppGlyph app={app} size={30} /></span>
      <span className="os-fv-label">{app.name}</span>
    </button>
  );
};

const FolderView: React.FC<{
  folder: FolderInfo;
  apps: AppInfo[];
  focusTitle?: boolean;
  onClose: () => void;
}> = ({ folder, apps, focusTitle, onClose }) => {
  const { getPlacement, renameFolder, removeFromFolder, addToFolder, snapFreePos, clipboardAppId, copyApp, iconColorOf, setIconColor } = useLayout();
  const { openApp } = useWindows();
  const { open: openMenu, openAt, close: closeMenu } = useContextMenu();
  const panelRef = useRef<HTMLDivElement>(null);
  const titleRef = useRef<HTMLInputElement>(null);
  const [name, setName] = useState(folder.name);
  const [draggingOut, setDraggingOut] = useState(false);

  // Members in folder order; hidden apps stay hidden everywhere.
  const members = folder.appIds
    .map(id => apps.find(a => a.id === id))
    .filter((a): a is AppInfo => !!a && getPlacement(a) !== 'hidden');

  const clipApp = clipboardAppId != null && !folder.appIds.includes(clipboardAppId)
    ? apps.find(a => a.id === clipboardAppId)
    : undefined;

  useEffect(() => {
    if (focusTitle) { titleRef.current?.focus(); titleRef.current?.select(); }
  }, [focusTitle]);

  const commitName = () => {
    if (name.trim()) renameFolder(folder.id, name);
    else setName(folder.name);   // empty → revert, like macOS
  };

  const paste = () => { if (clipApp) addToFolder(folder.id, clipApp.id); };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      // A context menu is a higher layer: let its own handler take Escape first, so
      // one press dismisses only the menu (not the whole folder underneath it).
      if (document.querySelector('.os-ctxmenu')) return;
      if (e.key === 'Escape') {
        if (document.activeElement === titleRef.current) titleRef.current?.blur();
        else onClose();
      } else if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'v' && document.activeElement !== titleRef.current) {
        paste();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  const launch = (app: AppInfo) => { openApp(app); onClose(); };

  const buildItemMenu = (app: AppInfo): MenuItem[] => [
    { label: 'Open', icon: <Play size={15} />, onClick: () => launch(app) },
    { label: 'Open in new tab', icon: <ExternalLink size={15} />, onClick: () => openExternal(app.url) },
    { separator: true, label: '' },
    { heading: 'Icon Color', label: '' },
    { content: <ColorSwatches current={iconColorOf(app.id)} onPick={c => setIconColor(app.id, c)} onClose={closeMenu} allowCustom />, label: '' },
    { separator: true, label: '' },
    { label: 'Copy', icon: <Copy size={15} />, onClick: () => copyApp(app.id) },
    { label: 'Move out of folder', icon: <FolderMinus size={15} />, onClick: () => removeFromFolder(app.id) },
  ];
  const itemMenu = (e: React.MouseEvent, app: AppInfo) => openMenu(e, buildItemMenu(app));
  const itemMenuKey = (x: number, y: number, app: AppInfo) => openAt(x, y, buildItemMenu(app));

  const backdropMenu = (e: React.MouseEvent) => {
    const items: MenuItem[] = clipApp
      ? [{ label: `Paste “${clipApp.name}”`, icon: <ClipboardPaste size={15} />, onClick: paste }]
      : [{ note: 'Copy an app, then paste it here', label: '' }];
    openMenu(e, items);
  };

  // Release outside the panel = pull the app out onto the desktop at that spot
  // (converted into the icon canvas' coordinate space, snapped to a free cell).
  const dragOut = (app: AppInfo, clientX: number, clientY: number): boolean => {
    const panel = panelRef.current?.getBoundingClientRect();
    if (panel && clientX >= panel.left && clientX <= panel.right && clientY >= panel.top && clientY <= panel.bottom) {
      return false;   // dropped back inside — nothing changes
    }
    const canvas = document.querySelector('.os-deskicons')?.getBoundingClientRect();
    if (!canvas) return false;
    const x = clientX - canvas.left - TILE_W / 2;
    const y = clientY - canvas.top - TILE_H / 2;
    removeFromFolder(app.id, snapFreePos(x, y, app.id));
    return true;
  };

  return (
    <div className="os-folderview" onMouseDown={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div ref={panelRef} className={`os-folderview-panel ${draggingOut ? 'dragging-out' : ''}`} onContextMenu={backdropMenu}>
        <input
          ref={titleRef}
          className="os-folderview-title"
          value={name}
          maxLength={60}
          aria-label="Folder name"
          onChange={e => setName(e.target.value)}
          onBlur={commitName}
          onKeyDown={e => { if (e.key === 'Enter') (e.currentTarget as HTMLInputElement).blur(); }}
        />
        {members.length === 0 ? (
          <div className="os-fv-empty">
            <FolderOpen size={26} />
            <p>This folder is empty.<br />Drag apps onto it, or copy an app and paste it here.</p>
          </div>
        ) : (
          <div className="os-fv-grid">
            {members.map(app => (
              <FolderItem
                key={app.id}
                app={app}
                onOpen={launch}
                onMenu={itemMenu}
                onMenuKey={itemMenuKey}
                onDragState={setDraggingOut}
                onDragOut={dragOut}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default FolderView;
