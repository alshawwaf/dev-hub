import React, { createContext, useContext, useState, useCallback, useRef, useEffect } from 'react';
import type { AppInfo, WindowState } from './types';
import { addRecent } from './recents';

interface WindowManagerContextType {
  windows: WindowState[];
  activeId: string | null;
  openApp: (app: AppInfo) => void;
  closeWindow: (id: string) => void;
  focusWindow: (id: string) => void;
  minimizeWindow: (id: string) => void;
  toggleMaximize: (id: string) => void;
  moveWindow: (id: string, x: number, y: number) => void;
  resizeWindow: (id: string, geom: { x: number; y: number; width: number; height: number }) => void;
  isOpen: (appId: number) => boolean;
}

const WindowManagerContext = createContext<WindowManagerContextType | undefined>(undefined);

const DEFAULT_W = 880;
const DEFAULT_H = 560;

const clamp = (val: number, min: number, max: number) => Math.max(min, Math.min(max, val));

export const WindowManagerProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [windows, setWindows] = useState<WindowState[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const zTop = useRef(10);
  const seq = useRef(0);

  // Mirror of `windows` so event handlers can read committed state synchronously
  // without stale closures, keeping the setWindows updaters pure (StrictMode-safe).
  const windowsRef = useRef<WindowState[]>([]);
  useEffect(() => { windowsRef.current = windows; }, [windows]);

  const focusWindow = useCallback((id: string) => {
    zTop.current += 1;
    const z = zTop.current;
    setWindows(prev => prev.map(w => (w.id === id ? { ...w, z, minimized: false } : w)));
    setActiveId(id);
  }, []);

  const openApp = useCallback((app: AppInfo) => {
    addRecent(app.id);
    zTop.current += 1;
    const z = zTop.current;
    const known = windowsRef.current.find(w => w.app.id === app.id);
    const targetId = known ? known.id : `win-${app.id}-${++seq.current}`;

    setWindows(prev => {
      // Dedup against committed state (prev), not the effect-synced ref, so two
      // rapid opens of the same app can never append two windows.
      const existing = prev.find(w => w.app.id === app.id);
      if (existing) {
        return prev.map(w => (w.id === existing.id ? { ...w, z, minimized: false } : w));
      }
      const vw = typeof window !== 'undefined' ? window.innerWidth : 1280;
      const vh = typeof window !== 'undefined' ? window.innerHeight : 800;
      const mobile = vw < 768;
      const width = mobile ? vw : Math.min(DEFAULT_W, vw - 80);
      const height = mobile ? vh - 40 : Math.min(DEFAULT_H, vh - 140);
      const cascade = (prev.length % 6) * 28;
      const x = mobile ? 0 : clamp(140 + cascade, 0, vw - width - 20);
      const y = mobile ? 30 : clamp(70 + cascade, 30, vh - height - 90);
      const next: WindowState = {
        id: targetId, app, x, y, width, height, z,
        minimized: false,
        maximized: mobile,
      };
      return [...prev, next];
    });
    setActiveId(targetId);
  }, []);

  const closeWindow = useCallback((id: string) => {
    setWindows(prev => prev.filter(w => w.id !== id));
    setActiveId(prev => (prev === id ? null : prev));
  }, []);

  const minimizeWindow = useCallback((id: string) => {
    setWindows(prev => prev.map(w => (w.id === id ? { ...w, minimized: true } : w)));
    setActiveId(prev => (prev === id ? null : prev));
  }, []);

  const toggleMaximize = useCallback((id: string) => {
    setWindows(prev => prev.map(w => (w.id === id ? { ...w, maximized: !w.maximized } : w)));
    focusWindow(id);
  }, [focusWindow]);

  const moveWindow = useCallback((id: string, x: number, y: number) => {
    setWindows(prev => prev.map(w => (w.id === id ? { ...w, x, y } : w)));
  }, []);

  const resizeWindow = useCallback((id: string, geom: { x: number; y: number; width: number; height: number }) => {
    setWindows(prev => prev.map(w => (w.id === id ? { ...w, ...geom } : w)));
  }, []);

  // "Open" means a window exists for the app — including minimized ones, which
  // still show in the dock with a running dot (consistent with runningNotPinned).
  const isOpen = useCallback(
    (appId: number) => windows.some(w => w.app.id === appId),
    [windows],
  );

  return (
    <WindowManagerContext.Provider
      value={{ windows, activeId, openApp, closeWindow, focusWindow, minimizeWindow, toggleMaximize, moveWindow, resizeWindow, isOpen }}
    >
      {children}
    </WindowManagerContext.Provider>
  );
};

export const useWindows = () => {
  const ctx = useContext(WindowManagerContext);
  if (!ctx) throw new Error('useWindows must be used within a WindowManagerProvider');
  return ctx;
};
