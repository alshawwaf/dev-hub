import React, { useEffect, useState, useCallback } from 'react';
import { AlertTriangle, ClipboardPaste, FolderPlus, MousePointerClick, Plus, RotateCcw, SlidersHorizontal, Star } from 'lucide-react';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import AddAppModal from '../components/AddAppModal';
import EditAppModal from '../components/EditAppModal';
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
import { buildCustomizeItems } from './widgets/customizeMenu';
import { readDrag } from './drag';
import { getSystemApp } from './systemApps';
import type { AppInfo, Placement } from './types';

const DesktopSurface: React.FC<{
  apps: AppInfo[];
  loading: boolean;
  error: string;
  isAdmin: boolean;
  onAddApp: () => void;
  onOpenLaunchpad: () => void;
}> = ({ apps, loading, error, isAdmin, onAddApp, onOpenLaunchpad }) => {
  const { windows, openApp } = useWindows();
  const {
    setPlacement, getPlacement, desktopApps, dockApps, resetLayout, hasLocalOverrides, widgets, toggleWidget,
    createFolder, snapFreePos, clipboardAppId, folderOf, removeFromFolder,
  } = useLayout();
  const { openFolderView } = useHub();
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
        const id = createFolder('New Folder', [], snapFreePos(cx, cy, 0));
        openFolderView(id, true);
      } },
    ];
    // Pasting on the desktop moves a foldered app back out, at the click point.
    const clipApp = clipboardAppId != null ? apps.find(a => a.id === clipboardAppId) : undefined;
    if (clipApp && folderOf(clipApp.id)) {
      items.push({ label: `Paste “${clipApp.name}” here`, icon: <ClipboardPaste size={15} />, onClick: () => removeFromFolder(clipApp.id, snapFreePos(cx, cy, clipApp.id)) });
    }
    items.push({ separator: true, label: '' });
    items.push(...buildCustomizeItems({
      widgets,
      toggleWidget,
      railHidden: window.matchMedia('(max-width:1040px)').matches,
      onOpenLaunchpad,
    }));
    items.push({ separator: true, label: '' });
    if (isAdmin) items.push({ label: 'Add application', icon: <Plus size={15} />, onClick: onAddApp });
    items.push({ label: 'App placement…', icon: <SlidersHorizontal size={15} />, onClick: () => { const s = getSystemApp('settings'); if (s) openApp(s); } });
    if (isAdmin) {
      items.push({ label: 'Set as everyone’s default', icon: <Star size={15} />, onClick: async () => {
        if (!window.confirm('Make the current app layout the default for everyone?')) return;
        const placements = Object.fromEntries(apps.filter(a => a.id > 0).map(a => [a.id, getPlacement(a)]));
        try { await api.post('desktop/default', { placements }); } catch (err) { console.error('Failed to set default layout:', err); }
      } });
    }
    if (hasLocalOverrides) {
      items.push({ separator: true, label: '' });
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
      <MenuBar onAddApp={onAddApp} onOpenLaunchpad={onOpenLaunchpad} />

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

const Desktop: React.FC = () => {
  const { user } = useAuth();
  const isAdmin = !!user?.is_admin;
  const [apps, setApps] = useState<AppInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [addOpen, setAddOpen] = useState(false);
  const [editingApp, setEditingApp] = useState<AppInfo | null>(null);
  const [renamingApp, setRenamingApp] = useState<AppInfo | null>(null);
  const [deletingApp, setDeletingApp] = useState<AppInfo | null>(null);
  const [launchpadOpen, setLaunchpadOpen] = useState(false);
  const [viewingFolder, setViewingFolder] = useState<{ id: number; focusTitle: boolean } | null>(null);

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
        <HubProvider
          apps={apps}
          isAdmin={isAdmin}
          openAddApp={() => setAddOpen(true)}
          openEditApp={app => setEditingApp(app)}
          openRenameApp={app => setRenamingApp(app)}
          openDeleteApp={app => setDeletingApp(app)}
          openLaunchpad={() => setLaunchpadOpen(true)}
          openFolderView={(id, focusTitle = false) => setViewingFolder({ id, focusTitle })}
          refetch={fetchApps}
        >
          <ContextMenuProvider>
            <DesktopSurface
              apps={apps}
              loading={loading}
              error={error}
              isAdmin={isAdmin}
              onAddApp={() => setAddOpen(true)}
              onOpenLaunchpad={() => setLaunchpadOpen(true)}
            />
            {launchpadOpen && <Launchpad apps={apps} onClose={() => setLaunchpadOpen(false)} />}
            {viewingFolder && (
              <FolderViewHost viewing={viewingFolder} apps={apps} onClose={() => setViewingFolder(null)} />
            )}
            <AddAppModal isOpen={addOpen} onClose={() => setAddOpen(false)} onAppAdded={fetchApps} />
            <EditAppModal isOpen={!!editingApp} app={editingApp} onClose={() => setEditingApp(null)} onAppUpdated={fetchApps} />
            <RenameAppModal isOpen={!!renamingApp} app={renamingApp} onClose={() => setRenamingApp(null)} onRenamed={fetchApps} />
            <DeleteConfirmModal
              isOpen={!!deletingApp}
              appId={deletingApp?.id ?? null}
              appName={deletingApp?.name ?? ''}
              onClose={() => setDeletingApp(null)}
              onDeleted={fetchApps}
            />
          </ContextMenuProvider>
        </HubProvider>
      </WindowManagerProvider>
    </LayoutProvider>
  );
};

export default Desktop;
