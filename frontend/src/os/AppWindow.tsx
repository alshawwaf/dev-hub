import React, { useEffect, useRef, useState } from 'react';
import { ExternalLink, RotateCw } from 'lucide-react';
import type { WindowState } from './types';
import { useWindows } from './WindowManager';
import Launcher from './Launcher';
import SystemContent from './system/SystemContent';
import { safeHttpUrl } from './url';

const TITLEBAR_H = 40;
const EMBED_TIMEOUT_MS = 10000;

const AppWindow: React.FC<{ win: WindowState }> = ({ win }) => {
  const { activeId, closeWindow, focusWindow, minimizeWindow, toggleMaximize, moveWindow } = useWindows();
  const { app } = win;
  const active = activeId === win.id;

  const dragStart = useRef<{ mx: number; my: number; wx: number; wy: number } | null>(null);
  const [embedPhase, setEmbedPhase] = useState<'loading' | 'loaded' | 'blocked'>('loading');
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    if (!app.embeddable) return;
    setEmbedPhase('loading');
    const t = window.setTimeout(() => {
      setEmbedPhase(phase => (phase === 'loading' ? 'blocked' : phase));
    }, EMBED_TIMEOUT_MS);
    return () => window.clearTimeout(t);
  }, [app.embeddable, app.url, reloadKey]);

  const onHeaderPointerDown = (e: React.PointerEvent) => {
    focusWindow(win.id);
    if (win.maximized) return;
    if ((e.target as HTMLElement).closest('.os-traffic')) return;
    dragStart.current = { mx: e.clientX, my: e.clientY, wx: win.x, wy: win.y };

    const onMove = (ev: PointerEvent) => {
      if (!dragStart.current) return;
      const vw = window.innerWidth;
      const vh = window.innerHeight;
      const nx = Math.max(0, Math.min(dragStart.current.wx + (ev.clientX - dragStart.current.mx), vw - 120));
      const ny = Math.max(28, Math.min(dragStart.current.wy + (ev.clientY - dragStart.current.my), vh - 60));
      moveWindow(win.id, nx, ny);
    };
    const onUp = () => {
      dragStart.current = null;
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
    };
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
  };

  const style: React.CSSProperties = win.maximized
    ? { left: 0, top: 28, width: '100%', height: 'calc(100% - 28px)', zIndex: win.z }
    : { left: win.x, top: win.y, width: win.width, height: win.height, zIndex: win.z };

  if (win.minimized) return null;

  const safeUrl = safeHttpUrl(app.url);
  const showEmbed = !!app.embeddable && !!safeUrl && embedPhase !== 'blocked';

  return (
    <div
      className={`os-window ${active ? 'active' : ''}`}
      style={style}
      onPointerDown={() => focusWindow(win.id)}
    >
      <div className="os-titlebar" onPointerDown={onHeaderPointerDown} onDoubleClick={() => toggleMaximize(win.id)}>
        <div className="os-traffic">
          <button className="tl tl-close" aria-label="Close" onClick={() => closeWindow(win.id)} />
          <button className="tl tl-min" aria-label="Minimize" onClick={() => minimizeWindow(win.id)} />
          <button className="tl tl-max" aria-label="Maximize" onClick={() => toggleMaximize(win.id)} />
        </div>
        <span className="os-title">{app.name}{app.category ? ` — ${app.category}` : ''}</span>
        <div className="os-titlebar-right">
          {safeUrl && (
            <a href={safeUrl} target="_blank" rel="noopener noreferrer" title="Open in new tab" onPointerDown={e => e.stopPropagation()}>
              <ExternalLink size={14} />
            </a>
          )}
        </div>
      </div>

      <div className="os-window-body" style={{ height: `calc(100% - ${TITLEBAR_H}px)` }}>
        {app.system ? (
          <SystemContent appKey={app.system} />
        ) : showEmbed ? (
          <>
            <iframe
              key={reloadKey}
              src={safeUrl ?? undefined}
              title={app.name}
              className="os-iframe"
              onLoad={() => setEmbedPhase(p => (p === 'loading' ? 'loaded' : p))}
              referrerPolicy="no-referrer-when-downgrade"
              sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-popups-to-escape-sandbox allow-downloads"
              allow="clipboard-read; clipboard-write; fullscreen"
            />
            {embedPhase === 'loading' && (
              <div className="os-embed-loading">
                <div className="spinner" />
                <p>Loading {app.name}…</p>
                <button className="btn btn-ghost os-embed-reload" onClick={() => setReloadKey(k => k + 1)}>
                  <RotateCw size={14} /> Reload
                </button>
              </div>
            )}
          </>
        ) : (
          <Launcher app={app} embedBlocked={app.embeddable && embedPhase === 'blocked'} />
        )}
      </div>
    </div>
  );
};

export default AppWindow;
