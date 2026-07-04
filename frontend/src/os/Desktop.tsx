import React, { useEffect, useState, useCallback } from 'react';
import { AlertTriangle, ClipboardPaste, FolderPlus, LayoutDashboard, LayoutGrid, MousePointerClick, Plus, RotateCcw, SlidersHorizontal, Star } from 'lucide-react';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import RenameAppModal from '../components/RenameAppModal';
import DeleteConfirmModal from '../components/DeleteConfirmModal';
import { WindowManagerProvider, useWindows } from './WindowManager';
import { LayoutProvider, useLayout } from './LayoutContext';
import { HubProvider, useHub } from './HubContext';
import { ContextMenuProvider, useContextMenu, type MenuItem } from './ContextMenu';
import MenuBar from './MenuBar';
import Dock from './Dock';
import DesktopIcons from './DesktopIcons';
import Widgets from './Widgets';
import AppWindow from './AppWindow';
import Launchpad from './Launchpad';
import FolderView from './FolderView';
import Spotlight from './Spotlight';
import { buildWidgetItems } from './widgets/customizeMenu';
import { readDrag } from './drag';
import { getSystemApp, systemAppsFor } from './systemApps';
import type { AppInfo, Placement } from './types';

const DesktopSurface: React.FC<{
  apps: AppInfo[];
  loading: boolean;
  error: string;
  isAdmin: boolean;
  onAddApp: () => void;
  onOpenLaunchpad: () => void;
  onOpenSpotlight: () => void;
}> = ({ apps, loading, error, isAdmin, onAddApp, onOpenLaunchpad, onOpenSpotlight }) => {
  const { windows, openApp } = useWindows();

  // Deep link: /?open=<systemKey> (the retired /admin and /guide routes redirect
  // here) opens that system window once, gated to what this user may see, then
  // strips the param so refresh/back don't re-trigger it. Runs once on mount —
  // auth is already resolved (ProtectedRoute gates the desktop).
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const key = params.get('open');
    if (key == null) return;
    const app = systemAppsFor(isAdmin).find(a => a.system === key);
    if (app) openApp(app);
    params.delete('open');
    const qs = params.toString();
    window.history.replaceState(null, '', window.location.pathname + (qs ? `?${qs}` : ''));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Global Cmd/Ctrl+K opens the Spotlight command palette. (Cmd+W/Cmd+M can't be
  // used — browsers reserve them for close-tab / minimize-window.)
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && !e.shiftKey && !e.altKey && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        onOpenSpotlight();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onOpenSpotlight]);
  const {
    setPlacement, getPlacement, desktopApps, dockApps, resetLayout, hasLocalOverrides, widgets, toggleWidget,
    createFolder, snapFreePos, clipboardAppId, folderOf, removeFromFolder,
  } = useLayout();
  const { setRenamingFolder } = useHub();
  const { open: openMenu } = useContextMenu();

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const payload = readDrag(e);
    if (!payload || payload.source !== 'dock') return;
    const app = apps.find(a => a.id === payload.id);
    if (app) setPlacement(app, 'desktop');
  };

  const onDesktopContextMenu = (e: React.MouseEvent) => {
    // Where on the icon canvas the user clicked (centered on a would-be tile),
    // so New Folder / Paste land under the cursor like macOS.
    const canvas = document.querySelector('.os-deskicons')?.getBoundingClientRect();
    const cx = canvas ? e.clientX - canvas.left - 46 : 0;
    const cy = canvas ? e.clientY - canvas.top - 54 : 0;

    const items: MenuItem[] = [
      { label: 'New Folder', icon: <FolderPlus size={15} />, onClick: () => {
        // macOS: a folder appears on the desktop with its name highlighted for editing
        // (inline on the icon) — not an opened panel.
        const id = createFolder('untitled folder', [], snapFreePos(cx, cy, 0));
        setRenamingFolder(id);
      } },
    ];
    // Pasting on the desktop moves a foldered app back out, at the click point.
    const clipApp = clipboardAppId != null ? apps.find(a => a.id === clipboardAppId) : undefined;
    if (clipApp && folderOf(clipApp.id)) {
      items.push({ label: `Paste “${clipApp.name}” here`, icon: <ClipboardPaste size={15} />, onClick: () => removeFromFolder(clipApp.id, snapFreePos(cx, cy, clipApp.id)) });
    }
    // Desktop widgets live in a macOS-style submenu — the checklist was too long
    // to inline. It stays open while you toggle several (keepOpen), closing only
    // on click-away.
    items.push({ separator: true, label: '' });
    items.push({
      label: 'Desktop Widgets',
      icon: <LayoutDashboard size={15} />,
      children: buildWidgetItems({
        widgets,
        toggleWidget,
        railHidden: window.matchMedia('(max-width:1040px)').matches,
      }),
    });

    // Apps group.
    items.push({ separator: true, label: '' });
    if (isAdmin) items.push({ label: 'Add Application', icon: <Plus size={15} />, onClick: onAddApp });
    items.push({ label: 'Add apps to Dock or Desktop…', icon: <LayoutGrid size={15} />, onClick: onOpenLaunchpad });
    items.push({ label: 'App placement…', icon: <SlidersHorizontal size={15} />, onClick: () => { const s = getSystemApp('settings'); if (s) openApp(s); } });

    // Layout group (admin default + reset).
    if (isAdmin || hasLocalOverrides) items.push({ separator: true, label: '' });
    if (isAdmin) {
      items.push({ label: 'Set as everyone’s default', icon: <Star size={15} />, onClick: async () => {
        if (!window.confirm('Make the current app layout the default for everyone?')) return;
        const placements = Object.fromEntries(apps.filter(a => a.id > 0).map(a => [a.id, getPlacement(a)]));
        try { await api.post('desktop/default', { placements }); } catch (err) { console.error('Failed to set default layout:', err); }
      } });
    }
    if (hasLocalOverrides) {
      items.push({ label: 'Reset layout', icon: <RotateCcw size={15} />, onClick: resetLayout });
    }
    openMenu(e, items);
  };

  const nothingPlaced = !loading && !error && desktopApps.length === 0 && dockApps.length === 0 && windows.length === 0;

  return (
    <div className="os-root">
      <div className="os-wallpaper">
        <span className="os-mesh-blob m1" />
        <span className="os-mesh-blob m2" />
        <span className="os-mesh-blob m3" />
      </div>
      <MenuBar onAddApp={onAddApp} onOpenLaunchpad={onOpenLaunchpad} onOpenSpotlight={onOpenSpotlight} />

      <div
        className="os-desktop"
        onDragOver={e => { e.preventDefault(); e.dataTransfer.dropEffect = 'move'; }}
        onDrop={onDrop}
        onContextMenu={onDesktopContextMenu}
      >
        <DesktopIcons />
        <Widgets onOpenLaunchpad={onOpenLaunchpad} />

        {loading && (
          <div className="os-center"><div className="spinner" /><p>Starting DevHub…</p></div>
        )}
        {error && (
          <div className="os-center"><AlertTriangle size={28} className="text-error" /><p>{error}</p></div>
        )}
        {nothingPlaced && (
          <div className="os-center os-hint"><MousePointerClick size={26} /><p>Open Launchpad from the dock to find your apps</p></div>
        )}

        {windows.map(win => (
          <AppWindow key={win.id} win={win} />
        ))}
      </div>

      <Dock apps={apps} onOpenLaunchpad={onOpenLaunchpad} />
    </div>
  );
};

// Resolves the open folder from live layout state so the panel tracks renames /
// membership changes, and closes itself if the folder is deleted while open.
const FolderViewHost: React.FC<{
  viewing: { id: number; focusTitle: boolean };
  apps: AppInfo[];
  onClose: () => void;
}> = ({ viewing, apps, onClose }) => {
  const { folders } = useLayout();
  const folder = folders.find(f => f.id === viewing.id);
  useEffect(() => { if (!folder) onClose(); }, [folder, onClose]);
  if (!folder) return null;
  return <FolderView key={folder.id} folder={folder} apps={apps} focusTitle={viewing.focusTitle} onClose={onClose} />;
};

// The Hub value + everything that renders inside the window system. Split out of
// `Desktop` so it can call useWindows() (it lives INSIDE WindowManagerProvider):
// Add/Edit are now real windows, so openAddApp/openEditApp route through openApp()
// instead of toggling modal state. `editingApp` state stays here — the windowed
// Edit form reads it from HubContext to know which app it's editing.
const HubHost: React.FC<{
  apps: AppInfo[];
  loading: boolean;
  error: string;
  isAdmin: boolean;
  refetch: () => void;
  renamingFolderId: number | null;
  setRenamingFolder: (id: number | null) => void;
}> = ({ apps, loading, error, isAdmin, refetch, renamingFolderId, setRenamingFolder }) => {
  const { openApp } = useWindows();
  const [editingApp, setEditingApp] = useState<AppInfo | null>(null);
  const [renamingApp, setRenamingApp] = useState<AppInfo | null>(null);
  const [deletingApp, setDeletingApp] = useState<AppInfo | null>(null);
  const [launchpadOpen, setLaunchpadOpen] = useState(false);
  const [spotlightOpen, setSpotlightOpen] = useState(false);
  const [viewingFolder, setViewingFolder] = useState<{ id: number; focusTitle: boolean } | null>(null);

  const openAddApp = () => { const a = getSystemApp('addapp'); if (a) openApp(a); };
  const openEditApp = (app: AppInfo) => { setEditingApp(app); const a = getSystemApp('editapp'); if (a) openApp(a); };

  return (
    <HubProvider
      apps={apps}
      isAdmin={isAdmin}
      openAddApp={openAddApp}
      openEditApp={openEditApp}
      editingApp={editingApp}
      openRenameApp={app => setRenamingApp(app)}
      openDeleteApp={app => setDeletingApp(app)}
      openLaunchpad={() => setLaunchpadOpen(true)}
      openFolderView={(id, focusTitle = false) => setViewingFolder({ id, focusTitle })}
      renamingFolderId={renamingFolderId}
      setRenamingFolder={setRenamingFolder}
      refetch={refetch}
    >
      <ContextMenuProvider>
        <DesktopSurface
          apps={apps}
          loading={loading}
          error={error}
          isAdmin={isAdmin}
          onAddApp={openAddApp}
          onOpenLaunchpad={() => setLaunchpadOpen(true)}
          onOpenSpotlight={() => setSpotlightOpen(true)}
        />
        {launchpadOpen && <Launchpad apps={apps} onClose={() => setLaunchpadOpen(false)} />}
        {spotlightOpen && <Spotlight onClose={() => setSpotlightOpen(false)} />}
        {viewingFolder && (
          <FolderViewHost viewing={viewingFolder} apps={apps} onClose={() => setViewingFolder(null)} />
        )}
        <RenameAppModal isOpen={!!renamingApp} app={renamingApp} onClose={() => setRenamingApp(null)} onRenamed={refetch} />
        <DeleteConfirmModal
          isOpen={!!deletingApp}
          appId={deletingApp?.id ?? null}
          appName={deletingApp?.name ?? ''}
          onClose={() => setDeletingApp(null)}
          onDeleted={refetch}
        />
      </ContextMenuProvider>
    </HubProvider>
  );
};

const Desktop: React.FC = () => {
  const { user } = useAuth();
  const isAdmin = !!user?.is_admin;
  const [apps, setApps] = useState<AppInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [renamingFolderId, setRenamingFolderId] = useState<number | null>(null);

  const fetchApps = useCallback(async () => {
    try {
      const res = await api.get('apps/');
      setApps(res.data);
      setError('');
    } catch (err) {
      console.error('Failed to fetch apps:', err);
      setError('Unable to load applications. Please try again later.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchApps(); }, [fetchApps]);

  // Admin-only: persist the shared placement baseline to the DB.
  const persistBaseline = useCallback((appId: number, placement: Placement) => {
    setApps(prev => prev.map(a => (a.id === appId ? { ...a, placement } : a)));
    api.put(`apps/${appId}`, { placement }).catch(err => console.error('Failed to save placement:', err));
  }, []);

  return (
    <LayoutProvider apps={apps} isAdmin={isAdmin} userId={user?.id ?? null} persistBaseline={persistBaseline}>
      <WindowManagerProvider>
        <HubHost
          apps={apps}
          loading={loading}
          error={error}
          isAdmin={isAdmin}
          refetch={fetchApps}
          renamingFolderId={renamingFolderId}
          setRenamingFolder={setRenamingFolderId}
        />
      </WindowManagerProvider>
    </LayoutProvider>
  );
};

export default Desktop;
