import React, { useEffect, useState, useCallback } from 'react';
import { LayoutGrid } from 'lucide-react';
import api from '../services/api';
import type { WidgetData } from './types';
import { useLayout } from './LayoutContext';
import { useWindows } from './WindowManager';
import { useContextMenu } from './ContextMenu';
import { getSystemApp } from './systemApps';
import { WIDGET_ORDER, WIDGETS } from './widgets/registry';
import { buildCustomizeItems } from './widgets/customizeMenu';

// The right-hand desktop widget rail (per-user, toggleable, live data).
const Widgets: React.FC<{ onOpenLaunchpad: () => void }> = ({ onOpenLaunchpad }) => {
  const { widgets, toggleWidget } = useLayout();
  const { openApp } = useWindows();
  const { openAt } = useContextMenu();
  const [data, setData] = useState<WidgetData | null>(null);
  const [now, setNow] = useState(() => new Date());

  const enabled = WIDGET_ORDER.filter(id => widgets.includes(id));
  const needsData = enabled.some(id => id !== 'clock');
  const hasClock = widgets.includes('clock');

  // Poll live data while any data-backed widget is shown.
  useEffect(() => {
    if (!needsData) { setData(null); return; }
    let cancelled = false;
    const load = () => api.get('desktop/widgets').then(r => { if (!cancelled) setData(r.data); }).catch(() => {});
    load();
    const t = window.setInterval(load, 20_000);
    return () => { cancelled = true; window.clearInterval(t); };
  }, [needsData]);

  // Clock tick (only while the clock widget is enabled).
  useEffect(() => {
    if (!hasClock) return;
    const t = window.setInterval(() => setNow(new Date()), 1000);
    return () => window.clearInterval(t);
  }, [hasClock]);

  const onOpen = useCallback((key: string) => {
    if (key === 'launchpad') { onOpenLaunchpad(); return; }
    const app = getSystemApp(key);
    if (app) openApp(app);
  }, [onOpenLaunchpad, openApp]);

  const openCustomize = (e: React.MouseEvent) => {
    const r = (e.currentTarget as HTMLElement).getBoundingClientRect();
    openAt(r.left, r.bottom + 6, buildCustomizeItems({
      widgets, toggleWidget,
      railHidden: window.matchMedia('(max-width:1040px)').matches,
      onOpenLaunchpad,
    }));
  };

  if (enabled.length === 0) {
    return (
      <div className="os-widgets" aria-label="Desktop widgets">
        <button className="os-pw-empty" onClick={openCustomize}>
          <LayoutGrid size={20} />
          <span>Add widgets</span>
          <small>Clock, activity, apps &amp; more</small>
        </button>
      </div>
    );
  }

  return (
    <div className="os-widgets" aria-label="Desktop widgets">
      {enabled.map(id => {
        const def = WIDGETS[id];
        const clickable = !!def.open;
        return (
          <div
            key={id}
            className={`os-pw-card ${clickable ? 'clk' : ''}`}
            role={clickable ? 'button' : undefined}
            tabIndex={clickable ? 0 : undefined}
            onClick={clickable ? () => onOpen(def.open!) : undefined}
            onKeyDown={clickable ? (e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onOpen(def.open!); } }) : undefined}
          >
            {def.render(data, now, onOpen)}
          </div>
        );
      })}
    </div>
  );
};

export default Widgets;
