import React, { createContext, useContext, useState, useCallback, useMemo } from 'react';
import type { AppInfo, Placement } from './types';

const LS_KEY = 'devhub.layout.overrides';

type Overrides = Record<number, Placement>;

const PLACEMENTS: Placement[] = ['desktop', 'dock', 'both', 'hidden'];
const isPlacement = (v: unknown): v is Placement => typeof v === 'string' && (PLACEMENTS as string[]).includes(v);

function loadOverrides(): Overrides {
  try {
    const parsed = JSON.parse(localStorage.getItem(LS_KEY) || '{}');
    const clean: Overrides = {};
    if (parsed && typeof parsed === 'object') {
      for (const [k, v] of Object.entries(parsed)) {
        if (isPlacement(v) && Number.isFinite(Number(k))) clean[Number(k)] = v;
      }
    }
    return clean;
  } catch {
    return {};
  }
}
function saveOverrides(o: Overrides) {
  try {
    localStorage.setItem(LS_KEY, JSON.stringify(o));
  } catch { /* storage unavailable */ }
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
  /** Persist the shared baseline to the DB (admin only). */
  persistBaseline: (appId: number, placement: Placement) => void;
  children: React.ReactNode;
}

export const LayoutProvider: React.FC<ProviderProps> = ({ apps, isAdmin, persistBaseline, children }) => {
  const [overrides, setOverrides] = useState<Overrides>(loadOverrides);

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
      // Admin edits the shared baseline; drop any local override for this app
      // so the admin always sees the true default.
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
        // If the chosen placement equals the shared baseline, drop the override
        // so the app keeps tracking future admin changes instead of shadowing them.
        if (placement === (app.placement ?? 'desktop')) {
          if (!(app.id in next)) return prev;
          delete next[app.id];
        } else {
          next[app.id] = placement;
        }
        saveOverrides(next);
        return next;
      });
    }
  }, [isAdmin, persistBaseline]);

  const resetLayout = useCallback(() => {
    setOverrides({});
    saveOverrides({});
  }, []);

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
