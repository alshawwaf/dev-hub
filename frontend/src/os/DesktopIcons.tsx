import React, { useEffect, useRef, useState } from 'react';
import { ExternalLink, Pin, PinOff, EyeOff, Play, Pencil, Trash2, SlidersHorizontal, Github, Copy, FolderPlus, FolderOpen, ClipboardPaste, Folder as FolderGlyph, RotateCw, Rocket } from 'lucide-react';
import type { AppInfo, FolderInfo } from './types';
import { useWindows } from './WindowManager';
import { useLayout } from './LayoutContext';
import { useContextMenu, type MenuItem } from './ContextMenu';
import { useHub } from './HubContext';
import { openExternal } from './url';
import { hasDeployMapping, powerApp } from './power';
import AppGlyph from './AppGlyph';
import ColorSwatches from './ColorSwatches';
import { folderTileBg } from './iconStyle';
import { flowPositions, snapToFreeCell, rowsPerColumn, type Pos } from './iconGrid';

// Tile hit box (matches .os-deskicon CSS).
const TILE_W = 92;
const TILE_H = 108;

// Shared pointer-drag for desktop items (apps + folders). Reports the dragged
// tile's CENTER while moving (for drop-target detection) and both the raw
// top-left and the center on release. A plain click (<4px movement) is left to
// the button's onClick (movedRef suppresses the click that follows a drag).
function useIconDrag(
  id: number,
  pos: Pos,
  onDragMove: (id: number, cx: number, cy: number) => void,
  onRelease: (id: number, x: number, y: number, cx: number, cy: number) => void,
) {
  const [drag, setDrag] = useState<{ dx: number; dy: number } | null>(null);
  const movedRef = useRef(false);

  const onPointerDown = (e: React.PointerEvent) => {
    if (e.button !== 0) return;
    const sx = e.clientX, sy = e.clientY;
    movedRef.current = false;
    const onPointerMove = (ev: PointerEvent) => {
      const dx = ev.clientX - sx, dy = ev.clientY - sy;
      if (!movedRef.current && Math.hypot(dx, dy) > 4) movedRef.current = true;
      if (movedRef.current) {
        setDrag({ dx, dy });
        onDragMove(id, pos.x + dx + TILE_W / 2, pos.y + dy + TILE_H / 2);
      }
    };
    const onPointerUp = (ev: PointerEvent) => {
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerup', onPointerUp);
      setDrag(null);
      if (movedRef.current) {
        const dx = ev.clientX - sx, dy = ev.clientY - sy;
        onRelease(id, pos.x + dx, pos.y + dy, pos.x + dx + TILE_W / 2, pos.y + dy + TILE_H / 2);
      }
    };
    window.addEventListener('pointermove', onPointerMove);
    window.addEventListener('pointerup', onPointerUp);
  };

  return { drag, movedRef, onPointerDown };
}

interface ItemDragProps {
  pos: Pos;
  isDropTarget: boolean;
  onDragMove: (id: number, cx: number, cy: number) => void;
  onRelease: (id: number, x: number, y: number, cx: number, cy: number) => void;
}

const DesktopIcon: React.FC<{ app: AppInfo } & ItemDragProps> = ({ app, pos, isDropTarget, onDragMove, onRelease }) => {
  const { openApp, isOpen } = useWindows();
  const { getPlacement, setPlacement, copyApp, createFolder, iconColorOf, setIconColor, iconTileBg } = useLayout();
  const { open: openMenu, openAt, close: closeMenu } = useContextMenu();
  const { isAdmin, openEditApp, openRenameApp, openDeleteApp } = useHub();
  const placement = getPlacement(app);
  const running = isOpen(app.id);
  const { drag, movedRef, onPointerDown } = useIconDrag(app.id, pos, onDragMove, onRelease);

  const menuItems = (): MenuItem[] => {
    const items: MenuItem[] = [
      { label: 'Open', icon: <Play size={15} />, onClick: () => openApp(app) },
      { separator: true, label: '' },
      placement === 'both'
        ? { label: 'Remove from Dock', icon: <PinOff size={15} />, onClick: () => setPlacement(app, 'desktop') }
        : { label: 'Keep in Dock', icon: <Pin size={15} />, onClick: () => setPlacement(app, 'both') },
      { label: 'Remove from Desktop', icon: <EyeOff size={15} />, onClick: () => setPlacement(app, placement === 'both' ? 'dock' : 'hidden') },
      { separator: true, label: '' },
      { heading: 'Icon Color', label: '' },
      { content: <ColorSwatches current={iconColorOf(app.id)} onPick={c => setIconColor(app.id, c)} onClose={closeMenu} allowCustom />, label: '' },
      { separator: true, label: '' },
      { label: 'Copy', icon: <Copy size={15} />, onClick: () => copyApp(app.id) },
      { label: `New Folder with “${app.name}”`, icon: <FolderPlus size={15} />, onClick: () => createFolder(app.category || 'New Folder', [app.id], pos) },
      { separator: true, label: '' },
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
    } else if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'c') {
      e.preventDefault();
      copyApp(app.id);
    }
  };

  const onClick = () => {
    if (movedRef.current) { movedRef.current = false; return; }   // was a drag, not a click
    openApp(app);
  };

  return (
    <button
      className={`os-deskicon ${running ? 'running' : ''} ${drag ? 'dragging' : ''} ${isDropTarget ? 'drop-hover' : ''}`}
      style={{ left: pos.x, top: pos.y, transform: drag ? `translate(${drag.dx}px, ${drag.dy}px)` : undefined }}
      onPointerDown={onPointerDown}
      onClick={onClick}
      onContextMenu={onContextMenu}
      onKeyDown={onKeyDown}
      title={app.description || app.name}
    >
      <span className="os-deskicon-tile" style={{ background: iconTileBg(app) }}><AppGlyph app={app} size={30} /></span>
      <span className="os-deskicon-label">{app.name}</span>
    </button>
  );
};

const FolderIcon: React.FC<{ folder: FolderInfo } & ItemDragProps> = ({ folder, pos, isDropTarget, onDragMove, onRelease }) => {
  const { deleteFolder, addToFolder, clipboardAppId, renameFolder, setFolderColor, iconTileBg } = useLayout();
  const { open: openMenu, openAt, close: closeMenu } = useContextMenu();
  const { apps, openFolderView, renamingFolderId, setRenamingFolder } = useHub();
  const { drag, movedRef, onPointerDown } = useIconDrag(folder.id, pos, onDragMove, onRelease);

  const members = folder.appIds.map(id => apps.find(a => a.id === id)).filter((a): a is AppInfo => !!a);
  const clipApp = clipboardAppId != null ? apps.find(a => a.id === clipboardAppId) : undefined;

  // Inline rename (macOS "New Folder" flow + Rename…): the label becomes an input.
  const renaming = renamingFolderId === folder.id;
  const [nameDraft, setNameDraft] = useState(folder.name);
  const inputRef = useRef<HTMLInputElement>(null);
  useEffect(() => {
    if (!renaming) return;
    setNameDraft(folder.name);
    // Focus now AND again on the next tick — the context menu that triggered this
    // restores focus to the body synchronously as it closes, so a one-shot focus can
    // be stolen. The delayed pass wins.
    const focusIt = () => { const el = inputRef.current; if (el) { el.focus(); el.select(); } };
    focusIt();
    const t = window.setTimeout(focusIt, 0);
    return () => window.clearTimeout(t);
  }, [renaming, folder.name]);
  const commitRename = () => { if (nameDraft.trim()) renameFolder(folder.id, nameDraft); setRenamingFolder(null); };

  const menuItems = (): MenuItem[] => {
    const items: MenuItem[] = [
      { label: 'Open', icon: <FolderOpen size={15} />, onClick: () => openFolderView(folder.id) },
      { separator: true, label: '' },
      { label: 'Rename', icon: <Pencil size={15} />, onClick: () => setRenamingFolder(folder.id) },
      { heading: 'Color', label: '' },
      { content: <ColorSwatches current={folder.color} onPick={c => setFolderColor(folder.id, c)} onClose={closeMenu} allowCustom />, label: '' },
    ];
    if (clipApp && !folder.appIds.includes(clipApp.id)) {
      items.push({ separator: true, label: '' }, { label: `Paste “${clipApp.name}”`, icon: <ClipboardPaste size={15} />, onClick: () => addToFolder(folder.id, clipApp.id) });
    }
    items.push(
      { separator: true, label: '' },
      { label: 'Remove Folder', icon: <Trash2 size={15} />, danger: true, onClick: () => deleteFolder(folder.id) },
      { note: 'Apps go back to the desktop', label: '' },
    );
    return items;
  };

  const onContextMenu = (e: React.MouseEvent) => openMenu(e, menuItems());

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ContextMenu' || (e.shiftKey && e.key === 'F10')) {
      e.preventDefault();
      const r = e.currentTarget.getBoundingClientRect();
      openAt(r.left + 8, r.bottom, menuItems());
    } else if (e.key === 'Enter' || e.key === 'F2') {
      e.preventDefault();
      setRenamingFolder(folder.id);
    } else if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'v' && clipApp && !folder.appIds.includes(clipApp.id)) {
      e.preventDefault();
      addToFolder(folder.id, clipApp.id);
    }
  };

  const onClick = () => {
    if (movedRef.current) { movedRef.current = false; return; }
    if (renaming) return;
    openFolderView(folder.id);
  };

  return (
    <button
      className={`os-deskicon os-folder ${drag ? 'dragging' : ''} ${isDropTarget ? 'drop-hover' : ''} ${renaming ? 'renaming' : ''}`}
      style={{ left: pos.x, top: pos.y, transform: drag ? `translate(${drag.dx}px, ${drag.dy}px)` : undefined }}
      onPointerDown={renaming ? undefined : onPointerDown}
      onClick={onClick}
      onContextMenu={onContextMenu}
      onKeyDown={onKeyDown}
      title={`${folder.name} — ${members.length} app${members.length === 1 ? '' : 's'}`}
    >
      <span className="os-deskicon-tile os-folder-tile" style={{ background: folderTileBg(folder.color) }}>
        {members.length === 0 ? (
          <FolderGlyph size={24} className="os-folder-empty-glyph" />
        ) : (
          <span className="os-folder-grid">
            {members.slice(0, 9).map(a => (
              <span key={a.id} className="os-folder-mini" style={{ background: iconTileBg(a) }}>
                <AppGlyph app={a} size={12} />
              </span>
            ))}
          </span>
        )}
      </span>
      {renaming ? (
        <input
          ref={inputRef}
          className="os-folder-rename"
          value={nameDraft}
          maxLength={60}
          aria-label="Folder name"
          onChange={e => setNameDraft(e.target.value)}
          onBlur={commitRename}
          onPointerDown={e => e.stopPropagation()}
          onClick={e => e.stopPropagation()}
          onKeyDown={e => {
            e.stopPropagation();
            if (e.key === 'Enter') { e.preventDefault(); commitRename(); }
            else if (e.key === 'Escape') { e.preventDefault(); setRenamingFolder(null); }
          }}
        />
      ) : (
        <span className="os-deskicon-label">{folder.name}</span>
      )}
    </button>
  );
};

const DesktopIcons: React.FC = () => {
  const { desktopRootApps, folders, iconPositions, setIconPos, addToFolder, createFolder } = useLayout();
  const [dropTarget, setDropTarget] = useState<number | null>(null);

  const ids = [...desktopRootApps.map(a => a.id), ...folders.map(f => f.id)];
  const rows = rowsPerColumn(window.innerHeight);
  const positions = flowPositions(ids, iconPositions, rows);

  // Which item (app or folder) the dragged tile's center is currently over.
  const hitTest = (draggedId: number, cx: number, cy: number): number | null => {
    for (const id of ids) {
      if (id === draggedId) continue;
      const p = positions[id];
      if (p && cx >= p.x + 6 && cx <= p.x + TILE_W - 6 && cy >= p.y + 6 && cy <= p.y + TILE_H - 6) return id;
    }
    return null;
  };

  // Folders only reposition (no folder-in-folder, same as macOS); apps can land
  // on a folder (add) or on another app (create a folder holding both).
  const onDragMove = (id: number, cx: number, cy: number) => {
    setDropTarget(id > 0 ? hitTest(id, cx, cy) : null);
  };

  const onRelease = (id: number, x: number, y: number, cx: number, cy: number) => {
    setDropTarget(null);
    if (id > 0) {
      const target = hitTest(id, cx, cy);
      if (target != null) {
        if (target < 0) {
          addToFolder(target, id);
          return;
        }
        // app dropped onto app → new folder at the target's cell, auto-named from
        // the shared category (macOS Launchpad behavior)
        const a = desktopRootApps.find(ap => ap.id === id);
        const b = desktopRootApps.find(ap => ap.id === target);
        const name = a?.category && a.category === b?.category ? a.category : 'New Folder';
        createFolder(name, [id, target], positions[target]);
        return;
      }
    }
    setIconPos(id, snapToFreeCell(x, y, id, positions, rows));
  };

  return (
    <div className="os-deskicons">
      {desktopRootApps.map(app => (
        <DesktopIcon
          key={app.id}
          app={app}
          pos={positions[app.id]}
          isDropTarget={dropTarget === app.id}
          onDragMove={onDragMove}
          onRelease={onRelease}
        />
      ))}
      {folders.map(folder => (
        <FolderIcon
          key={folder.id}
          folder={folder}
          pos={positions[folder.id]}
          isDropTarget={dropTarget === folder.id}
          onDragMove={onDragMove}
          onRelease={onRelease}
        />
      ))}
    </div>
  );
};

export default DesktopIcons;
