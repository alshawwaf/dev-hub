import React, { createContext, useContext, useState, useCallback, useMemo, useEffect } from 'react';
import type { AppInfo, Placement } from './types';
import api from '../services/api';

const LS_KEY = 'devhub.layout.overrides';

type Overrides = Record<number, Placement>;

const PLACEMENTS: Placement[] = ['desktop', 'dock', 'both', 'hidden'];
const isPlacement = (v: unknown): v is Placement => typeof v === 'string' && (PLACEMENTS as string[]).includes(v);

function clean(parsed: unknown): Overrides {
  const out: Overrides = {};
  if (parsed && typeof parsed === 'object') {
    for (const [k, v] of Object.entries(parsed as Record<string, unknown>)) {
      if (isPlacement(v) && Number.isFinite(Number(k))) out[Number(k)] = v;
    }
  }
  return out;
}
function loadOverrides(): Overrides {
  try { return clean(JSON.parse(localStorage.getItem(LS_KEY) || '{}')); } catch { return {}; }
}
function saveOverrides(o: Overrides) {
  try { localStorage.setItem(LS_KEY, JSON.stringify(o)); } catch { /* storage unavailable */ }
}

const resolve = (app: AppInfo, overrides: Overrides): Placement =>
  overrides[app.id] ?? app.placement ?? 'desktop';

interface LayoutContextType {
  getPlacement: (app: AppInfo) => Placement;
  desktopApps: AppInfo[];
  dockApps: AppInfo[];
  setPlacement: (app: AppInfo, placement: Placement) => void;
  resetLayout: () => void;
  hasLocalOverrides: boolean;
}

const LayoutContext = createContext<LayoutContextType | undefined>(undefined);

interface ProviderProps {
  apps: AppInfo[];
  isAdmin: boolean;
  /** Signed-in user id (null when anonymous). */
  userId: number | null;
  /** Persist the shared baseline to the DB (admin only). */
  persistBaseline: (appId: number, placement: Placement) => void;
  children: React.ReactNode;
}

export const LayoutProvider: React.FC<ProviderProps> = ({ apps, isAdmin, userId, persistBaseline, children }) => {
  const [overrides, setOverrides] = useState<Overrides>(loadOverrides);

  // A signed-in non-admin gets server-persisted personal placement (follows them
  // across devices). Admins edit the shared baseline; anonymous uses localStorage.
  const isPersonalUser = !!userId && !isAdmin;

  useEffect(() => {
    if (!isPersonalUser) return;
    let cancelled = false;
    api.get('desktop/prefs')
      .then(r => { if (!cancelled) setOverrides(clean(r.data?.overrides)); })
      .catch(() => { /* keep current */ });
    return () => { cancelled = true; };
  }, [isPersonalUser]);

  const persist = useCallback((next: Overrides) => {
    if (isPersonalUser) {
      api.put('desktop/prefs', { overrides: next }).catch(() => { /* best-effort */ });
    } else {
      saveOverrides(next);
    }
  }, [isPersonalUser]);

  const getPlacement = useCallback((app: AppInfo) => resolve(app, overrides), [overrides]);

  const desktopApps = useMemo(
    () => apps.filter(a => { const p = resolve(a, overrides); return p === 'desktop' || p === 'both'; }),
    [apps, overrides],
  );
  const dockApps = useMemo(
    () => apps.filter(a => { const p = resolve(a, overrides); return p === 'dock' || p === 'both'; }),
    [apps, overrides],
  );

  const setPlacement = useCallback((app: AppInfo, placement: Placement) => {
    if (isAdmin) {
      // Admin edits the shared baseline; drop any local override for this app.
      persistBaseline(app.id, placement);
      setOverrides(prev => {
        if (!(app.id in prev)) return prev;
        const next = { ...prev };
        delete next[app.id];
        saveOverrides(next);
        return next;
      });
    } else {
      setOverrides(prev => {
        const next = { ...prev };
        // If the chosen placement equals the baseline, drop the override so the
        // app keeps tracking future admin changes instead of shadowing them.
        if (placement === (app.placement ?? 'desktop')) {
          if (!(app.id in next)) return prev;
          delete next[app.id];
        } else {
          next[app.id] = placement;
        }
        persist(next);
        return next;
      });
    }
  }, [isAdmin, persistBaseline, persist]);

  const resetLayout = useCallback(() => {
    setOverrides({});
    persist({});
  }, [persist]);

  const value = useMemo(
    () => ({ getPlacement, desktopApps, dockApps, setPlacement, resetLayout, hasLocalOverrides: Object.keys(overrides).length > 0 }),
    [getPlacement, desktopApps, dockApps, setPlacement, resetLayout, overrides],
  );

  return <LayoutContext.Provider value={value}>{children}</LayoutContext.Provider>;
};

export const useLayout = () => {
  const ctx = useContext(LayoutContext);
  if (!ctx) throw new Error('useLayout must be used within a LayoutProvider');
  return ctx;
};
