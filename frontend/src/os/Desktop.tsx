import React, { useEffect, useState, useCallback } from 'react';
import { AlertTriangle, MousePointerClick, Plus, LayoutGrid, RotateCcw } from 'lucide-react';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import AddAppModal from '../components/AddAppModal';
import EditAppModal from '../components/EditAppModal';
import DeleteConfirmModal from '../components/DeleteConfirmModal';
import { WindowManagerProvider, useWindows } from './WindowManager';
import { LayoutProvider, useLayout } from './LayoutContext';
import { HubProvider } from './HubContext';
import { ContextMenuProvider, useContextMenu } from './ContextMenu';
import MenuBar from './MenuBar';
import Dock from './Dock';
import DesktopIcons from './DesktopIcons';
import AppWindow from './AppWindow';
import Launchpad from './Launchpad';
import { readDrag } from './drag';
import type { AppInfo, Placement } from './types';

const DesktopSurface: React.FC<{
  apps: AppInfo[];
  loading: boolean;
  error: string;
  isAdmin: boolean;
  onAddApp: () => void;
  onOpenLaunchpad: () => void;
}> = ({ apps, loading, error, isAdmin, onAddApp, onOpenLaunchpad }) => {
  const { windows } = useWindows();
  const { setPlacement, desktopApps, dockApps, resetLayout, hasLocalOverrides } = useLayout();
  const { open: openMenu } = useContextMenu();

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const payload = readDrag(e);
    if (!payload || payload.source !== 'dock') return;
    const app = apps.find(a => a.id === payload.id);
    if (app) setPlacement(app, 'desktop');
  };

  const onDesktopContextMenu = (e: React.MouseEvent) => {
    const items = [];
    if (isAdmin) items.push({ label: 'Add application', icon: <Plus size={15} />, onClick: onAddApp });
    items.push({ label: 'Open Launchpad', icon: <LayoutGrid size={15} />, onClick: onOpenLaunchpad });
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

const Desktop: React.FC = () => {
  const { user } = useAuth();
  const isAdmin = !!user?.is_admin;
  const [apps, setApps] = useState<AppInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [addOpen, setAddOpen] = useState(false);
  const [editingApp, setEditingApp] = useState<AppInfo | null>(null);
  const [deletingApp, setDeletingApp] = useState<AppInfo | null>(null);
  const [launchpadOpen, setLaunchpadOpen] = useState(false);

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
    <WindowManagerProvider>
      <LayoutProvider apps={apps} isAdmin={isAdmin} userId={user?.id ?? null} persistBaseline={persistBaseline}>
        <HubProvider
          apps={apps}
          isAdmin={isAdmin}
          openAddApp={() => setAddOpen(true)}
          openEditApp={app => setEditingApp(app)}
          openDeleteApp={app => setDeletingApp(app)}
          openLaunchpad={() => setLaunchpadOpen(true)}
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
            <AddAppModal isOpen={addOpen} onClose={() => setAddOpen(false)} onAppAdded={fetchApps} />
            <EditAppModal isOpen={!!editingApp} app={editingApp} onClose={() => setEditingApp(null)} onAppUpdated={fetchApps} />
            <DeleteConfirmModal
              isOpen={!!deletingApp}
              appId={deletingApp?.id ?? null}
              appName={deletingApp?.name ?? ''}
              onClose={() => setDeletingApp(null)}
              onDeleted={fetchApps}
            />
          </ContextMenuProvider>
        </HubProvider>
      </LayoutProvider>
    </WindowManagerProvider>
  );
};

export default Desktop;
