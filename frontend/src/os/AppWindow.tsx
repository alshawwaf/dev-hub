import React, { useEffect, useRef, useState } from 'react';
import { ExternalLink, RotateCw } from 'lucide-react';
import type { WindowState } from './types';
import { useWindows } from './WindowManager';
import { useLayout } from './LayoutContext';
import Launcher from './Launcher';
import SystemContent from './system/SystemContent';
import { safeHttpUrl } from './url';
import AppGlyph from './AppGlyph';

const TITLEBAR_H = 40;
const EMBED_TIMEOUT_MS = 18000;
const MIN_W = 360;
const MIN_H = 240;
const RESIZE_DIRS = ['n', 's', 'e', 'w', 'ne', 'nw', 'se', 'sw'] as const;

const AppWindow: React.FC<{ win: WindowState }> = ({ win }) => {
  const { activeId, closeWindow, focusWindow, minimizeWindow, toggleMaximize, moveWindow, resizeWindow } = useWindows();
  const { saveGeometry } = useLayout();
  const { app } = win;
  const active = activeId === win.id;

  const dragStart = useRef<{ mx: number; my: number; wx: number; wy: number } | null>(null);
  const geomRef = useRef<{ x: number; y: number; w: number; h: number } | null>(null);
  const [interacting, setInteracting] = useState(false);
  const [embedPhase, setEmbedPhase] = useState<'loading' | 'loaded' | 'blocked'>('loading');
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    if (!app.embeddable && !app.proxy_embed) return;
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
    setInteracting(true);

    const onMove = (ev: PointerEvent) => {
      if (!dragStart.current) return;
      const vw = window.innerWidth;
      const vh = window.innerHeight;
      const nx = Math.max(0, Math.min(dragStart.current.wx + (ev.clientX - dragStart.current.mx), vw - 120));
      const ny = Math.max(28, Math.min(dragStart.current.wy + (ev.clientY - dragStart.current.my), vh - 60));
      geomRef.current = { x: nx, y: ny, w: win.width, h: win.height };
      moveWindow(win.id, nx, ny);
    };
    const onUp = () => {
      dragStart.current = null;
      setInteracting(false);
      if (geomRef.current) saveGeometry(win.app.id, geomRef.current);
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
    };
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
  };

  const startResize = (dir: string) => (e: React.PointerEvent) => {
    e.stopPropagation();
    focusWindow(win.id);
    if (win.maximized) return;
    const start = { mx: e.clientX, my: e.clientY, x: win.x, y: win.y, w: win.width, h: win.height };
    setInteracting(true);

    const onMove = (ev: PointerEvent) => {
      const dx = ev.clientX - start.mx;
      const dy = ev.clientY - start.my;
      let { x, y, w, h } = start;
      if (dir.includes('e')) w = Math.max(MIN_W, start.w + dx);
      if (dir.includes('s')) h = Math.max(MIN_H, start.h + dy);
      if (dir.includes('w')) { const right = start.x + start.w; w = Math.max(MIN_W, start.w - dx); x = right - w; }
      if (dir.includes('n')) { const bottom = start.y + start.h; h = Math.max(MIN_H, start.h - dy); y = bottom - h; }
      x = Math.max(0, x);
      y = Math.max(28, y);
      geomRef.current = { x, y, w, h };
      resizeWindow(win.id, { x, y, width: w, height: h });
    };
    const onUp = () => {
      setInteracting(false);
      if (geomRef.current) saveGeometry(win.app.id, geomRef.current);
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
  const proxied = !!app.proxy_embed && !!safeUrl;
  const embedSrc = proxied ? `/embed/${app.id}/` : safeUrl;
  const showEmbed = (!!app.embeddable || proxied) && !!embedSrc && embedPhase !== 'blocked';

  return (
    <div
      className={`os-window ${active ? 'active' : ''} ${interacting ? 'interacting' : ''}`}
      style={style}
      onPointerDown={() => focusWindow(win.id)}
    >
      <div className="os-titlebar" onPointerDown={onHeaderPointerDown} onDoubleClick={() => toggleMaximize(win.id)}>
        <div className="os-traffic">
          <button className="tl tl-close" aria-label="Close" onClick={() => closeWindow(win.id)} />
          <button className="tl tl-min" aria-label="Minimize" onClick={() => minimizeWindow(win.id)} />
          <button className="tl tl-max" aria-label="Maximize" onClick={() => toggleMaximize(win.id)} />
        </div>
        <span className="os-title"><span className="os-title-ic"><AppGlyph app={app} size={14} /></span>{app.name}{app.category ? ` — ${app.category}` : ''}</span>
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
              src={embedSrc ?? undefined}
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

      {!win.maximized && RESIZE_DIRS.map(dir => (
        <div key={dir} className={`os-rz os-rz-${dir}`} onPointerDown={startResize(dir)} />
      ))}
    </div>
  );
};

export default AppWindow;
