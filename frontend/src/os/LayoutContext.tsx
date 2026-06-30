import React, { createContext, useContext, useState, useCallback, useMemo, useEffect, useRef } from 'react';
import type { AppInfo, Placement, WinGeometry, GeometryMap, WidgetId } from './types';
import api from '../services/api';

const LS_OVERRIDES = 'devhub.layout.overrides';
const LS_GEOMETRY = 'devhub.window.geometry';
const LS_WIDGETS = 'devhub.layout.widgets';

const DEFAULT_WIDGETS: WidgetId[] = ['clock', 'activity'];
const VALID_WIDGETS: string[] = ['clock', 'apps', 'activity', 'errors', 'latency', 'recent', 'notifications', 'lastapp', 'quick'];

type Overrides = Record<number, Placement>;

const PLACEMENTS: Placement[] = ['desktop', 'dock', 'both', 'hidden'];
const isPlacement = (v: unknown): v is Placement => typeof v === 'string' && (PLACEMENTS as string[]).includes(v);

function cleanOverrides(parsed: unknown): Overrides {
  const out: Overrides = {};
  if (parsed && typeof parsed === 'object') {
    for (const [k, v] of Object.entries(parsed as Record<string, unknown>)) {
      if (isPlacement(v) && Number.isFinite(Number(k))) out[Number(k)] = v;
    }
  }
  return out;
}
function cleanGeometry(parsed: unknown): GeometryMap {
  const out: GeometryMap = {};
  if (parsed && typeof parsed === 'object') {
    for (const [k, v] of Object.entries(parsed as Record<string, any>)) {
      if (Number.isFinite(Number(k)) && v && ['x', 'y', 'w', 'h'].every(p => Number.isFinite(Number(v[p])))) {
        out[Number(k)] = { x: Number(v.x), y: Number(v.y), w: Number(v.w), h: Number(v.h) };
      }
    }
  }
  return out;
}
function cleanWidgets(parsed: unknown): WidgetId[] {
  const out: WidgetId[] = [];
  if (Array.isArray(parsed)) {
    for (const v of parsed) {
      if (typeof v === 'string' && VALID_WIDGETS.includes(v) && !out.includes(v as WidgetId)) out.push(v as WidgetId);
    }
  }
  return out;
}
const loadLS = <T,>(key: string, fn: (p: unknown) => T): T => {
  try { return fn(JSON.parse(localStorage.getItem(key) || '{}')); } catch { return fn({}); }
};
const saveLS = (key: string, val: unknown) => { try { localStorage.setItem(key, JSON.stringify(val)); } catch { /* unavailable */ } };

const resolve = (app: AppInfo, overrides: Overrides): Placement =>
  overrides[app.id] ?? app.placement ?? 'desktop';

interface LayoutContextType {
  getPlacement: (app: AppInfo) => Placement;
  desktopApps: AppInfo[];
  dockApps: AppInfo[];
  setPlacement: (app: AppInfo, placement: Placement) => void;
  resetLayout: () => void;
  hasLocalOverrides: boolean;
  getGeometry: (appId: number) => WinGeometry | undefined;
  saveGeometry: (appId: number, g: WinGeometry) => void;
  widgets: WidgetId[];
  toggleWidget: (id: WidgetId) => void;
}

const LayoutContext = createContext<LayoutContextType | undefined>(undefined);

interface ProviderProps {
  apps: AppInfo[];
  isAdmin: boolean;
  userId: number | null;
  persistBaseline: (appId: number, placement: Placement) => void;
  children: React.ReactNode;
}

export const LayoutProvider: React.FC<ProviderProps> = ({ apps, isAdmin, userId, persistBaseline, children }) => {
  const [overrides, setOverrides] = useState<Overrides>(() => loadLS(LS_OVERRIDES, cleanOverrides));
  const [geometry, setGeometry] = useState<GeometryMap>(() => loadLS(LS_GEOMETRY, cleanGeometry));
  const [widgets, setWidgets] = useState<WidgetId[]>(() => {
    try {
      const raw = localStorage.getItem(LS_WIDGETS);
      if (raw !== null) return cleanWidgets(JSON.parse(raw));   // [] = user disabled all
    } catch { /* ignore */ }
    return DEFAULT_WIDGETS;
  });

  // Signed-in non-admin → server-persisted (follows across devices). Admin edits
  // the shared baseline (placement) but keeps geometry local. Anonymous → local.
  const isPersonalUser = !!userId && !isAdmin;

  // Latest state, read by the debounced writer at fire time.
  const stateRef = useRef({ overrides, geometry, widgets, isPersonalUser });
  useEffect(() => { stateRef.current = { overrides, geometry, widgets, isPersonalUser }; }, [overrides, geometry, widgets, isPersonalUser]);

  // Load server prefs on sign-in.
  useEffect(() => {
    if (!isPersonalUser) return;
    let cancelled = false;
    api.get('desktop/prefs').then(r => {
      if (cancelled) return;
      setOverrides(cleanOverrides(r.data?.overrides));
      setGeometry(cleanGeometry(r.data?.geometry));
      // null/undefined (never set) → default; [] → respected (all off).
      setWidgets(r.data?.widgets != null ? cleanWidgets(r.data.widgets) : DEFAULT_WIDGETS);
    }).catch(() => { /* keep current */ });
    return () => { cancelled = true; };
  }, [isPersonalUser]);

  // Single debounced writer for overrides + geometry + widgets (avoids a save race).
  const timer = useRef<number | undefined>(undefined);
  const scheduleFlush = useCallback(() => {
    if (timer.current) window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => {
      const s = stateRef.current;
      if (s.isPersonalUser) {
        api.put('desktop/prefs', { overrides: s.overrides, geometry: s.geometry, widgets: s.widgets }).catch(() => {});
      } else {
        saveLS(LS_OVERRIDES, s.overrides);
        saveLS(LS_GEOMETRY, s.geometry);
        saveLS(LS_WIDGETS, s.widgets);
      }
    }, 450);
  }, []);

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
      persistBaseline(app.id, placement);
      setOverrides(prev => {
        if (!(app.id in prev)) return prev;
        const next = { ...prev };
        delete next[app.id];
        return next;
      });
      return;
    }
    setOverrides(prev => {
      const next = { ...prev };
      if (placement === (app.placement ?? 'desktop')) delete next[app.id];
      else next[app.id] = placement;
      return next;
    });
    scheduleFlush();
  }, [isAdmin, persistBaseline, scheduleFlush]);

  const resetLayout = useCallback(() => {
    setOverrides({});
    setGeometry({});
    scheduleFlush();
  }, [scheduleFlush]);

  const getGeometry = useCallback((appId: number) => geometry[appId], [geometry]);
  const saveGeometry = useCallback((appId: number, g: WinGeometry) => {
    setGeometry(prev => ({ ...prev, [appId]: g }));
    scheduleFlush();
  }, [scheduleFlush]);

  const toggleWidget = useCallback((id: WidgetId) => {
    setWidgets(prev => (prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]));
    scheduleFlush();
  }, [scheduleFlush]);

  const value = useMemo(
    () => ({ getPlacement, desktopApps, dockApps, setPlacement, resetLayout, getGeometry, saveGeometry, widgets, toggleWidget, hasLocalOverrides: Object.keys(overrides).length > 0 }),
    [getPlacement, desktopApps, dockApps, setPlacement, resetLayout, getGeometry, saveGeometry, widgets, toggleWidget, overrides],
  );

  return <LayoutContext.Provider value={value}>{children}</LayoutContext.Provider>;
};

export const useLayout = () => {
  const ctx = useContext(LayoutContext);
  if (!ctx) throw new Error('useLayout must be used within a LayoutProvider');
  return ctx;
};
