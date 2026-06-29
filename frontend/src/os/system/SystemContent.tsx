import React from 'react';
import { RotateCcw, Shield, Plus, Layers, ExternalLink, Github, AppWindow as WindowIcon, Clock } from 'lucide-react';
import type { SystemKey } from '../types';
import { useLayout } from '../LayoutContext';
import { useWindows } from '../WindowManager';
import { useHub } from '../HubContext';
import { getRecents } from '../recents';
import GuidePage from '../../pages/GuidePage';

const SettingsApp: React.FC = () => {
  const { resetLayout, hasLocalOverrides } = useLayout();
  const { isAdmin, openAddApp } = useHub();

  return (
    <div className="os-sys">
      <section className="os-sys-section">
        <h3>Layout</h3>
        <p>Drag icons between the desktop and the dock, or right-click any app to place it. Your changes are saved to this browser on top of the shared defaults.</p>
        <button className="btn btn-ghost" onClick={resetLayout} disabled={!hasLocalOverrides}>
          <RotateCcw size={15} /> Reset to default layout
        </button>
        {!hasLocalOverrides && <span className="os-sys-hint">You're using the default layout.</span>}
      </section>

      <section className="os-sys-section">
        <h3>Opening apps</h3>
        <p>Apps marked <em>embeddable</em> open inside a window. Everything else opens in its own browser tab — set this per app in the admin panel.</p>
      </section>

      {isAdmin && (
        <section className="os-sys-section">
          <h3>Manage</h3>
          <div className="os-sys-row">
            <button className="btn btn-primary" onClick={openAddApp}><Plus size={15} /> Add application</button>
            <a className="btn btn-ghost" href="/admin"><Shield size={15} /> Admin dashboard</a>
          </div>
        </section>
      )}
    </div>
  );
};

const LogsApp: React.FC = () => {
  const { windows, focusWindow } = useWindows();
  const { apps } = useHub();
  const recents = getRecents()
    .map(id => apps.find(a => a.id === id))
    .filter((a): a is NonNullable<typeof a> => Boolean(a));

  return (
    <div className="os-sys">
      <section className="os-sys-section">
        <h3><WindowIcon size={16} /> Open windows</h3>
        {windows.length === 0 ? (
          <p>No windows are open.</p>
        ) : (
          <ul className="os-sys-list">
            {windows.map(w => (
              <li key={w.id}>
                <button onClick={() => focusWindow(w.id)}>{w.app.name}{w.minimized ? ' (minimized)' : ''}</button>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="os-sys-section">
        <h3><Clock size={16} /> Recently opened</h3>
        {recents.length === 0 ? (
          <p>Nothing opened yet this session.</p>
        ) : (
          <ul className="os-sys-list">
            {recents.map(a => <li key={a.id}>{a.name}</li>)}
          </ul>
        )}
      </section>
    </div>
  );
};

const AboutApp: React.FC = () => (
  <div className="os-sys os-sys-about">
    <div className="os-sys-logo"><Layers size={34} /></div>
    <h2>DevHub</h2>
    <p>A macOS-style desktop for the AI and dev tools built for and with AI. Apps live as icons on the desktop and dock; open one to launch it in a window or its own tab.</p>
    <div className="os-sys-row">
      <a className="btn btn-ghost" href="https://hub.ai.alshawwaf.ca" target="_blank" rel="noopener noreferrer"><ExternalLink size={15} /> hub.ai.alshawwaf.ca</a>
      <a className="btn btn-ghost" href="https://github.com/alshawwaf/dev-hub" target="_blank" rel="noopener noreferrer"><Github size={15} /> Source</a>
    </div>
    <p className="os-sys-hint">© 2026 AI Dev Hub • Crafted for AI by AI</p>
  </div>
);

const SystemContent: React.FC<{ appKey: SystemKey }> = ({ appKey }) => {
  switch (appKey) {
    case 'settings': return <SettingsApp />;
    case 'logs': return <LogsApp />;
    case 'guide': return <div className="os-sys-guide"><GuidePage /></div>;
    case 'about': return <AboutApp />;
    default: return null;
  }
};

export default SystemContent;
