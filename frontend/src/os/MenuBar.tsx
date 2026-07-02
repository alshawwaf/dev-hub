import React, { useEffect, useRef, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { Search, ChevronDown, Plus, Shield, BookOpen, LogOut, Github, LayoutGrid, Info, Bell, Trash2, SlidersHorizontal, Sun, Moon, X } from 'lucide-react';
import { useWindows } from './WindowManager';
import { useLayout } from './LayoutContext';
import { useContextMenu } from './ContextMenu';
import { buildCustomizeItems } from './widgets/customizeMenu';
import { getSystemApp } from './systemApps';
import api from '../services/api';

// Build stamp baked in at build time (vite define) — lets you see at a glance
// whether the latest deploy is live. Prod has no git SHA, so it shows the build time.
const BUILD_SHA = typeof __BUILD_SHA__ !== 'undefined' ? __BUILD_SHA__ : '';
const BUILD_TIME = typeof __BUILD_TIME__ !== 'undefined' ? __BUILD_TIME__ : '';
const buildStampLabel = (() => {
  if (BUILD_SHA) return BUILD_SHA;
  if (BUILD_TIME) { try { return new Date(BUILD_TIME).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }); } catch { /* ignore */ } }
  return 'dev';
})();
const buildStampTitle = `Deployed build${BUILD_SHA ? ' · ' + BUILD_SHA : ''}${BUILD_TIME ? ' · built ' + (() => { try { return new Date(BUILD_TIME).toLocaleString(); } catch { return BUILD_TIME; } })() : ''}`;

interface Notif { id: number; kind: string; text: string; read: boolean; created_at: string; }
const notifTime = (s: string) => new Date(/[Z+]/.test(s) ? s : s + 'Z').toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
const ago = (s: string) => {
  const d = Math.max(0, Math.floor((Date.now() - new Date(/[Z+]/.test(s) ? s : s + 'Z').getTime()) / 1000));
  if (d < 60) return `${d}s ago`;
  if (d < 3600) return `${Math.floor(d / 60)}m ago`;
  if (d < 86400) return `${Math.floor(d / 3600)}h ago`;
  return `${Math.floor(d / 86400)}d ago`;
};

interface MenuBarProps {
  onAddApp: () => void;
  onOpenLaunchpad: () => void;
  onOpenSpotlight: () => void;
}

const useClock = () => {
  const [now, setNow] = useState(new Date());
  useEffect(() => {
    let timer: number;
    // Re-tick exactly at each minute boundary so the displayed minute is never stale
    // (a fixed 30s interval could lag the minute by up to ~30s).
    const schedule = () => {
      timer = window.setTimeout(() => { setNow(new Date()); schedule(); }, 60_000 - (Date.now() % 60_000) + 50);
    };
    schedule();
    return () => window.clearTimeout(timer);
  }, []);
  return now;
};

const MenuBar: React.FC<MenuBarProps> = ({ onAddApp, onOpenLaunchpad, onOpenSpotlight }) => {
  const { user, logout } = useAuth();
  const { openApp } = useWindows();
  const { widgets, toggleWidget, theme, toggleTheme } = useLayout();
  const { openAt } = useContextMenu();
  const now = useClock();

  const openCustomize = (e: React.MouseEvent) => {
    const r = (e.currentTarget as HTMLElement).getBoundingClientRect();
    openAt(r.right - 210, r.bottom + 6, buildCustomizeItems({
      widgets,
      toggleWidget,
      railHidden: window.matchMedia('(max-width:1040px)').matches,
      onOpenLaunchpad,
    }));
  };
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const brandRef = useRef<HTMLButtonElement>(null);
  const [notifs, setNotifs] = useState<{ items: Notif[]; unread: number } | null>(null);
  const [bellOpen, setBellOpen] = useState(false);
  const bellRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpen(false);
      if (bellRef.current && !bellRef.current.contains(e.target as Node)) setBellOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { if (menuOpen) { setMenuOpen(false); brandRef.current?.focus(); } setBellOpen(false); }
    };
    document.addEventListener('mousedown', onClick);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onClick);
      document.removeEventListener('keydown', onKey);
    };
  }, [menuOpen]);

  // Poll notifications while signed in.
  useEffect(() => {
    if (!user) { setNotifs(null); return; }
    let cancelled = false;
    const load = () => api.get('notifications/').then(r => { if (!cancelled) setNotifs(r.data); }).catch(() => {});
    load();
    const t = window.setInterval(load, 30_000);
    return () => { cancelled = true; window.clearInterval(t); };
  }, [user]);

  const reloadNotifs = () => api.get('notifications/').then(r => setNotifs(r.data)).catch(() => {});
  const toggleBell = () => {
    setBellOpen(o => {
      const next = !o;
      if (next && notifs?.unread) api.post('notifications/read', {}).then(reloadNotifs).catch(() => {});
      return next;
    });
  };
  const clearNotifs = () => api.delete('notifications/').then(() => setNotifs({ items: [], unread: 0 })).catch(() => {});
  const deleteNotif = (id: number) => api.delete(`notifications/${id}`)
    .then(() => setNotifs(n => (n ? { items: n.items.filter(i => i.id !== id), unread: n.unread } : n)))
    .catch(() => {});

  // Keyboard navigation for the app menu (WAI-ARIA menu pattern): arrows roam,
  // Home/End jump. Focus the first item when the menu opens.
  useEffect(() => { if (menuOpen) menuRef.current?.querySelector<HTMLElement>('.os-menu .os-menu-item')?.focus(); }, [menuOpen]);
  const onMenuKeyDown = (e: React.KeyboardEvent) => {
    const items = [...(menuRef.current?.querySelectorAll<HTMLElement>('.os-menu .os-menu-item') || [])];
    if (!items.length) return;
    const cur = items.indexOf(document.activeElement as HTMLElement);
    if (e.key === 'ArrowDown') { e.preventDefault(); items[(cur + 1) % items.length].focus(); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); items[(cur - 1 + items.length) % items.length].focus(); }
    else if (e.key === 'Home') { e.preventDefault(); items[0].focus(); }
    else if (e.key === 'End') { e.preventDefault(); items[items.length - 1].focus(); }
  };

  const time = now.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
  const day = now.toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' });

  const openSystem = (key: string) => {
    const app = getSystemApp(key);
    if (app) openApp(app);
    setMenuOpen(false);
  };

  return (
    <div className="os-menubar">
      <div className="os-menubar-left" ref={menuRef}>
        <button
          ref={brandRef}
          className="os-brand"
          onClick={() => setMenuOpen(o => !o)}
          aria-haspopup="menu"
          aria-expanded={menuOpen}
        >
          <span className="os-brand-mark" />
          DevHub
          <ChevronDown size={13} />
        </button>

        {menuOpen && (
          <div className="os-menu" role="menu" aria-label="DevHub menu" onKeyDown={onMenuKeyDown}>
            <button role="menuitem" className="os-menu-item" onClick={() => { onOpenLaunchpad(); setMenuOpen(false); }}>
              <LayoutGrid size={15} /> Launchpad
            </button>
            {user && (
              <button role="menuitem" className="os-menu-item" onClick={() => { onAddApp(); setMenuOpen(false); }}>
                <Plus size={15} /> Add application
              </button>
            )}
            {user?.is_admin && (
              <a role="menuitem" className="os-menu-item" href="/admin">
                <Shield size={15} /> Admin dashboard
              </a>
            )}
            <button role="menuitem" className="os-menu-item" onClick={() => openSystem('guide')}>
              <BookOpen size={15} /> Guide
            </button>
            <button role="menuitem" className="os-menu-item" onClick={() => openSystem('about')}>
              <Info size={15} /> About DevHub
            </button>
            <a role="menuitem" className="os-menu-item" href="https://github.com/alshawwaf/dev-hub" target="_blank" rel="noopener noreferrer">
              <Github size={15} /> Source on GitHub
            </a>
            <div className="os-menu-sep" />
            {user ? (
              <button role="menuitem" className="os-menu-item danger" onClick={logout}>
                <LogOut size={15} /> Sign out
              </button>
            ) : (
              <a role="menuitem" className="os-menu-item" href="/login">
                <LogOut size={15} /> Sign in
              </a>
            )}
          </div>
        )}

        {user?.is_admin && <a className="os-menu-link" href="/admin">Admin</a>}
      </div>

      <div className="os-menubar-right">
        <span className="os-build" title={buildStampTitle}>{buildStampLabel}</span>
        {user && <span className="os-user">{user.email.split('@')[0]}</span>}
        {user && (
          <div className="os-bell-wrap" ref={bellRef}>
            <button className="os-menubar-btn" onClick={toggleBell} aria-label="Notifications" aria-expanded={bellOpen}>
              <Bell size={15} />
              {notifs && notifs.unread > 0 && <span className="os-bell-badge">{notifs.unread > 9 ? '9+' : notifs.unread}</span>}
            </button>
            {bellOpen && (
              <div className="os-bell-menu">
                <div className="os-bell-head">
                  <span>Notifications</span>
                  {notifs && notifs.items.length > 0 && (
                    <button className="os-bell-clear" onClick={clearNotifs} title="Clear all"><Trash2 size={13} /></button>
                  )}
                </div>
                {!notifs || notifs.items.length === 0 ? (
                  <p className="os-bell-empty">No notifications.</p>
                ) : (
                  notifs.items.map(n => (
                    <div key={n.id} className={`os-bell-item k-${n.kind}`}>
                      <div className="os-bell-body">
                        <span>{n.text}</span>
                        <time title={notifTime(n.created_at)}>{ago(n.created_at)}</time>
                      </div>
                      <button className="os-bell-x" onClick={() => deleteNotif(n.id)} aria-label="Dismiss notification"><X size={13} /></button>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>
        )}
        <button className="os-menubar-btn" onClick={toggleTheme} title={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'} aria-label="Toggle light or dark mode">
          {theme === 'dark' ? <Sun size={15} /> : <Moon size={15} />}
        </button>
        <button className="os-menubar-btn" onClick={openCustomize} title="Customize desktop — widgets" aria-label="Customize desktop widgets">
          <SlidersHorizontal size={15} />
        </button>
        <button className="os-menubar-btn" onClick={onOpenSpotlight} title="Search apps (⌘K)" aria-label="Search apps">
          <Search size={15} />
        </button>
        {user
          ? <button className="os-clock os-clock-btn" onClick={toggleBell} title="Notifications" aria-label="Notifications">{day}&nbsp;&nbsp;{time}</button>
          : <span className="os-clock">{day}&nbsp;&nbsp;{time}</span>}
      </div>
    </div>
  );
};

export default MenuBar;
