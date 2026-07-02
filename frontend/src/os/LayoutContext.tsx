import React, { createContext, useContext, useState, useCallback, useMemo, useEffect, useRef } from 'react';
import type { AppInfo, Placement, WinGeometry, GeometryMap, WidgetId, FolderInfo } from './types';
import { flowPositions, snapToFreeCell, rowsPerColumn, type Pos } from './iconGrid';
import api from '../services/api';

const LS_OVERRIDES = 'devhub.layout.overrides';
const LS_GEOMETRY = 'devhub.window.geometry';
const LS_WIDGETS = 'devhub.layout.widgets';
const LS_THEME = 'devhub.theme';
const LS_ICONPOS = 'devhub.icon.positions';
const LS_FOLDERS = 'devhub.desktop.folders';

type Theme = 'dark' | 'light' | 'auto';   // 'auto' follows the OS appearance

const prefersDark = () => typeof window !== 'undefined' && window.matchMedia?.('(prefers-color-scheme: dark)').matches;
const resolveTheme = (t: Theme): 'dark' | 'light' => (t === 'auto' ? (prefersDark() ? 'dark' : 'light') : t);

const DEFAULT_WIDGETS: WidgetId[] = ['clock', 'activity'];
const VALID_WIDGETS: string[] = ['clock', 'apps', 'activity', 'errors', 'latency', 'recent', 'notifications', 'lastapp', 'quick', 'system'];

type Overrides = Record<number, Placement>;

// Which persisted key a mutation touched — drives the per-key merge on initial load.
type DirtyKey = 'overrides' | 'geometry' | 'iconPositions' | 'folders' | 'widgets' | 'theme';

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
function cleanIconPos(parsed: unknown): Record<number, Pos> {
  const out: Record<number, Pos> = {};
  if (parsed && typeof parsed === 'object') {
    for (const [k, v] of Object.entries(parsed as Record<string, any>)) {
      if (Number.isFinite(Number(k)) && v && Number.isFinite(Number(v.x)) && Number.isFinite(Number(v.y))) {
        out[Number(k)] = { x: Number(v.x), y: Number(v.y) };
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
// Folders come from the server as {id, name, app_ids} (snake_case wire format,
// also what we save to localStorage). Ids must be negative and unique; an app
// can live in at most one folder (first folder wins on bad data).
function cleanFolders(parsed: unknown): FolderInfo[] {
  const out: FolderInfo[] = [];
  const seenIds = new Set<number>();
  const seenApps = new Set<number>();
  if (Array.isArray(parsed)) {
    for (const f of parsed) {
      if (!f || typeof f !== 'object') continue;
      const id = Number((f as any).id);
      if (!Number.isInteger(id) || id >= 0 || seenIds.has(id)) continue;
      const rawName = (f as any).name;
      const name = typeof rawName === 'string' && rawName.trim() ? rawName.trim().slice(0, 60) : 'Folder';
      const rawIds = (f as any).app_ids ?? (f as any).appIds;
      const appIds: number[] = [];
      if (Array.isArray(rawIds)) {
        for (const v of rawIds) {
          const n = Number(v);
          if (Number.isInteger(n) && n > 0 && !seenApps.has(n)) { seenApps.add(n); appIds.push(n); }
        }
      }
      seenIds.add(id);
      out.push({ id, name, appIds });
      if (out.length >= 64) break;
    }
  }
  return out;
}
const loadLS = <T,>(key: string, fn: (p: unknown) => T): T => {
  try { return fn(JSON.parse(localStorage.getItem(key) || '{}')); } catch { return fn({}); }
};
const saveLS = (key: string, val: unknown) => { try { localStorage.setItem(key, JSON.stringify(val)); } catch { /* unavailable */ } };

const foldersWire = (folders: FolderInfo[]) => folders.map(f => ({ id: f.id, name: f.name, app_ids: f.appIds }));

const resolve = (app: AppInfo, overrides: Overrides): Placement =>
  overrides[app.id] ?? app.placement ?? 'desktop';

interface LayoutContextType {
  getPlacement: (app: AppInfo) => Placement;
  desktopApps: AppInfo[];
  /** desktop-placed apps NOT inside a folder — what actually renders on the desktop surface */
  desktopRootApps: AppInfo[];
  dockApps: AppInfo[];
  setPlacement: (app: AppInfo, placement: Placement) => void;
  resetLayout: () => void;
  hasLocalOverrides: boolean;
  getGeometry: (appId: number) => WinGeometry | undefined;
  saveGeometry: (appId: number, g: WinGeometry) => void;
  iconPositions: Record<number, Pos>;
  setIconPos: (appId: number, pos: Pos) => void;
  widgets: WidgetId[];
  toggleWidget: (id: WidgetId) => void;
  theme: Theme;
  setTheme: (t: Theme) => void;
  toggleTheme: () => void;
  // macOS-style desktop folders
  folders: FolderInfo[];
  createFolder: (name: string, appIds: number[], pos?: Pos) => number;
  renameFolder: (folderId: number, name: string) => void;
  deleteFolder: (folderId: number) => void;
  addToFolder: (folderId: number, appId: number) => void;
  removeFromFolder: (appId: number, pos?: Pos) => void;
  folderOf: (appId: number) => FolderInfo | undefined;
  /** snap a desktop-canvas point to the nearest free grid cell (excludeId = item being placed) */
  snapFreePos: (x: number, y: number, excludeId: number) => Pos;
  // app "clipboard" for Copy → Paste into a folder (session-only)
  clipboardAppId: number | null;
  copyApp: (appId: number) => void;
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
  // Signed-in non-admin → server-persisted (follows across devices). Admin edits
  // the shared baseline (placement) but keeps geometry local. Anonymous → local.
  const isPersonalUser = !!userId && !isAdmin;

  // Personal (server-persisted) users are authoritative from the SERVER: seed their
  // layout EMPTY and let the GET below fill it in. Never seed them from the shared,
  // un-namespaced localStorage — that could be a DIFFERENT account's leftover data
  // on a shared browser (the LS keys aren't per-user and aren't cleared on logout).
  // Anonymous/admin sessions are local-only, so they still seed from LS.
  const [overrides, setOverrides] = useState<Overrides>(() => (isPersonalUser ? {} : loadLS(LS_OVERRIDES, cleanOverrides)));
  const [geometry, setGeometry] = useState<GeometryMap>(() => (isPersonalUser ? {} : loadLS(LS_GEOMETRY, cleanGeometry)));
  const [iconPositions, setIconPositions] = useState<Record<number, Pos>>(() => (isPersonalUser ? {} : loadLS(LS_ICONPOS, cleanIconPos)));
  const [folders, setFolders] = useState<FolderInfo[]>(() => (isPersonalUser ? [] : loadLS(LS_FOLDERS, cleanFolders)));
  const [clipboardAppId, setClipboardAppId] = useState<number | null>(null);
  const [widgets, setWidgets] = useState<WidgetId[]>(() => {
    if (isPersonalUser) return DEFAULT_WIDGETS;   // GET fills; a server [] is respected there
    try {
      const raw = localStorage.getItem(LS_WIDGETS);
      if (raw !== null) return cleanWidgets(JSON.parse(raw));   // [] = user disabled all
    } catch { /* ignore */ }
    return DEFAULT_WIDGETS;
  });
  // Theme is seeded from LS regardless (mirrors the pre-paint script in index.html
  // to avoid a flash); the GET corrects it for personal users.
  const [theme, setThemeState] = useState<Theme>(() => {
    try { const t = localStorage.getItem(LS_THEME); return t === 'light' || t === 'auto' ? t : 'dark'; } catch { return 'dark'; }
  });

  // Apply + persist theme locally on every change (instant, no flash). Server
  // sync (cross-device) rides the debounced writer below. In 'auto' mode the
  // resolved appearance follows the OS and re-applies live on system changes.
  useEffect(() => {
    const apply = () => document.documentElement.setAttribute('data-theme', resolveTheme(theme));
    apply();
    try { localStorage.setItem(LS_THEME, theme); } catch { /* unavailable */ }
    if (theme === 'auto' && typeof window !== 'undefined' && window.matchMedia) {
      const mq = window.matchMedia('(prefers-color-scheme: dark)');
      mq.addEventListener('change', apply);
      return () => mq.removeEventListener('change', apply);
    }
  }, [theme]);

  // Latest state, read by the debounced writer at fire time.
  const stateRef = useRef({ overrides, geometry, iconPositions, folders, widgets, theme, isPersonalUser });
  useEffect(() => { stateRef.current = { overrides, geometry, iconPositions, folders, widgets, theme, isPersonalUser }; }, [overrides, geometry, iconPositions, folders, widgets, theme, isPersonalUser]);

  // Save-race guards for personal (server-persisted) users:
  //  - serverLoaded: never PUT before the initial GET settles.
  //  - dirtyKeys: the specific keys the user changed while the GET was in flight.
  //    On resolve we take the server value ONLY for keys NOT in this set (a per-key
  //    merge), so one mutation during a slow load can't wipe the account's other
  //    prefs (folders/geometry/widgets/theme/…).
  const serverLoadedRef = useRef(false);
  const dirtyKeysRef = useRef<Set<DirtyKey>>(new Set());

  // Single debounced writer for all layout keys (avoids a save race).
  const timer = useRef<number | undefined>(undefined);
  const scheduleFlush = useCallback((...keys: DirtyKey[]) => {
    for (const k of keys) dirtyKeysRef.current.add(k);
    if (timer.current) window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => {
      const s = stateRef.current;
      if (s.isPersonalUser) {
        if (!serverLoadedRef.current) return;   // the GET's finally-block reflushes dirty state
        api.put('desktop/prefs', { overrides: s.overrides, geometry: s.geometry, widgets: s.widgets, theme: s.theme, icon_positions: s.iconPositions, folders: foldersWire(s.folders) }).catch(() => {});
      } else {
        saveLS(LS_OVERRIDES, s.overrides);
        saveLS(LS_GEOMETRY, s.geometry);
        saveLS(LS_WIDGETS, s.widgets);
        saveLS(LS_ICONPOS, s.iconPositions);
        saveLS(LS_FOLDERS, foldersWire(s.folders));
      }
    }, 450);
  }, []);

  // Load server prefs on sign-in — per-key merge: only keys the user did NOT touch
  // during the load are taken from the server (see dirtyKeysRef above).
  useEffect(() => {
    if (!isPersonalUser) return;
    let cancelled = false;
    api.get('desktop/prefs').then(r => {
      if (cancelled) return;
      const dk = dirtyKeysRef.current;
      if (!dk.has('overrides')) setOverrides(cleanOverrides(r.data?.overrides));
      if (!dk.has('geometry')) setGeometry(cleanGeometry(r.data?.geometry));
      if (!dk.has('iconPositions')) setIconPositions(cleanIconPos(r.data?.icon_positions));
      if (!dk.has('folders')) setFolders(cleanFolders(r.data?.folders));
      // null/undefined (never set) → default; [] → respected (all off).
      if (!dk.has('widgets')) setWidgets(r.data?.widgets != null ? cleanWidgets(r.data.widgets) : DEFAULT_WIDGETS);
      if (!dk.has('theme') && ['light', 'dark', 'auto'].includes(r.data?.theme)) setThemeState(r.data.theme);
    }).catch(() => { /* keep current */ }).finally(() => {
      if (cancelled) return;
      serverLoadedRef.current = true;
      if (dirtyKeysRef.current.size) scheduleFlush();   // persist changes made while loading
    });
    return () => { cancelled = true; };
  }, [isPersonalUser, scheduleFlush]);

  const getPlacement = useCallback((app: AppInfo) => resolve(app, overrides), [overrides]);

  const desktopApps = useMemo(
    () => apps.filter(a => { const p = resolve(a, overrides); return p === 'desktop' || p === 'both'; }),
    [apps, overrides],
  );
  const dockApps = useMemo(
    () => apps.filter(a => { const p = resolve(a, overrides); return p === 'dock' || p === 'both'; }),
    [apps, overrides],
  );

  const folderedIds = useMemo(() => new Set(folders.flatMap(f => f.appIds)), [folders]);
  const desktopRootApps = useMemo(
    () => desktopApps.filter(a => !folderedIds.has(a.id)),
    [desktopApps, folderedIds],
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
    scheduleFlush('overrides');
  }, [isAdmin, persistBaseline, scheduleFlush]);

  // Reset restores placements/positions/geometry but deliberately KEEPS folders —
  // they're user-built organization, not a layout tweak (delete them explicitly).
  const resetLayout = useCallback(() => {
    setOverrides({});
    setGeometry({});
    setIconPositions({});
    scheduleFlush('overrides', 'geometry', 'iconPositions');
  }, [scheduleFlush]);

  const getGeometry = useCallback((appId: number) => geometry[appId], [geometry]);
  const saveGeometry = useCallback((appId: number, g: WinGeometry) => {
    setGeometry(prev => ({ ...prev, [appId]: g }));
    scheduleFlush('geometry');
  }, [scheduleFlush]);

  const setIconPos = useCallback((appId: number, pos: Pos) => {
    setIconPositions(prev => ({ ...prev, [appId]: pos }));
    scheduleFlush('iconPositions');
  }, [scheduleFlush]);

  // ---- folders ----

  // Effective positions of everything on the desktop surface right now.
  const snapFreePos = useCallback((x: number, y: number, excludeId: number): Pos => {
    const rows = rowsPerColumn(window.innerHeight);
    const ids = [...desktopRootApps.map(a => a.id), ...folders.map(f => f.id)];
    const effective = flowPositions(ids, iconPositions, rows);
    return snapToFreeCell(x, y, excludeId, effective, rows);
  }, [desktopRootApps, folders, iconPositions]);

  const createFolder = useCallback((name: string, appIds: number[], pos?: Pos): number => {
    const id = folders.length ? Math.min(-1000, ...folders.map(f => f.id)) - 1 : -1001;
    const clean = name.trim().slice(0, 60) || 'New Folder';
    setFolders(prev => [
      // an app lives in one folder: pull the new members out of any other folder
      ...prev.map(f => (f.appIds.some(a => appIds.includes(a)) ? { ...f, appIds: f.appIds.filter(a => !appIds.includes(a)) } : f)),
      { id, name: clean, appIds: [...new Set(appIds)] },
    ]);
    setIconPositions(prev => {
      const next = { ...prev };
      for (const a of appIds) delete next[a];   // members leave the grid; forget their cells
      if (pos) next[id] = pos;
      return next;
    });
    scheduleFlush('folders', 'iconPositions');
    return id;
  }, [folders, scheduleFlush]);

  const renameFolder = useCallback((folderId: number, name: string) => {
    const clean = name.trim().slice(0, 60);
    if (!clean) return;   // macOS keeps the old name when you clear the field
    setFolders(prev => prev.map(f => (f.id === folderId ? { ...f, name: clean } : f)));
    scheduleFlush('folders');
  }, [scheduleFlush]);

  const deleteFolder = useCallback((folderId: number) => {
    setFolders(prev => prev.filter(f => f.id !== folderId));
    setIconPositions(prev => {
      if (!(folderId in prev)) return prev;
      const next = { ...prev };
      delete next[folderId];
      return next;
    });
    scheduleFlush('folders', 'iconPositions');
  }, [scheduleFlush]);

  const addToFolder = useCallback((folderId: number, appId: number) => {
    setFolders(prev => prev.map(f => {
      if (f.id === folderId) return f.appIds.includes(appId) ? f : { ...f, appIds: [...f.appIds, appId] };
      return f.appIds.includes(appId) ? { ...f, appIds: f.appIds.filter(a => a !== appId) } : f;
    }));
    setIconPositions(prev => {
      if (!(appId in prev)) return prev;
      const next = { ...prev };
      delete next[appId];
      return next;
    });
    scheduleFlush('folders', 'iconPositions');
  }, [scheduleFlush]);

  const removeFromFolder = useCallback((appId: number, pos?: Pos) => {
    setFolders(prev => prev.map(f => (f.appIds.includes(appId) ? { ...f, appIds: f.appIds.filter(a => a !== appId) } : f)));
    setIconPositions(prev => {
      const next = { ...prev };
      if (pos) next[appId] = pos;
      else delete next[appId];   // flow to the next free cell
      return next;
    });
    scheduleFlush('folders', 'iconPositions');
  }, [scheduleFlush]);

  const folderOf = useCallback((appId: number) => folders.find(f => f.appIds.includes(appId)), [folders]);

  const copyApp = useCallback((appId: number) => setClipboardAppId(appId), []);

  const toggleWidget = useCallback((id: WidgetId) => {
    setWidgets(prev => (prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]));
    scheduleFlush('widgets');
  }, [scheduleFlush]);

  const setTheme = useCallback((t: Theme) => {
    setThemeState(t);           // the [theme] effect applies + saves locally
    scheduleFlush('theme');     // sync to server for signed-in users
  }, [scheduleFlush]);
  const toggleTheme = useCallback(() => setTheme(theme === 'dark' ? 'light' : 'dark'), [theme, setTheme]);

  const value = useMemo(
    () => ({
      getPlacement, desktopApps, desktopRootApps, dockApps, setPlacement, resetLayout, getGeometry, saveGeometry,
      iconPositions, setIconPos, widgets, toggleWidget, theme, setTheme, toggleTheme,
      folders, createFolder, renameFolder, deleteFolder, addToFolder, removeFromFolder, folderOf, snapFreePos,
      clipboardAppId, copyApp,
      hasLocalOverrides: Object.keys(overrides).length > 0,
    }),
    [getPlacement, desktopApps, desktopRootApps, dockApps, setPlacement, resetLayout, getGeometry, saveGeometry,
     iconPositions, setIconPos, widgets, toggleWidget, theme, setTheme, toggleTheme,
     folders, createFolder, renameFolder, deleteFolder, addToFolder, removeFromFolder, folderOf, snapFreePos,
     clipboardAppId, copyApp, overrides],
  );

  return <LayoutContext.Provider value={value}>{children}</LayoutContext.Provider>;
};

export const useLayout = () => {
  const ctx = useContext(LayoutContext);
  if (!ctx) throw new Error('useLayout must be used within a LayoutProvider');
  return ctx;
};
