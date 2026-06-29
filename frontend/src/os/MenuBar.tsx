import React, { useEffect, useRef, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { Wifi, Search, BatteryMedium, ChevronDown, Plus, Shield, BookOpen, LogOut, Github, LayoutGrid, Info } from 'lucide-react';
import { useWindows } from './WindowManager';
import { getSystemApp } from './systemApps';

interface MenuBarProps {
  onAddApp: () => void;
  onOpenLaunchpad: () => void;
}

const useClock = () => {
  const [now, setNow] = useState(new Date());
  useEffect(() => {
    const t = window.setInterval(() => setNow(new Date()), 30_000);
    return () => window.clearInterval(t);
  }, []);
  return now;
};

const MenuBar: React.FC<MenuBarProps> = ({ onAddApp, onOpenLaunchpad }) => {
  const { user, logout } = useAuth();
  const { openApp } = useWindows();
  const now = useClock();
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const brandRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && menuOpen) { setMenuOpen(false); brandRef.current?.focus(); }
    };
    document.addEventListener('mousedown', onClick);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onClick);
      document.removeEventListener('keydown', onKey);
    };
  }, [menuOpen]);

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
          <div className="os-menu">
            <button className="os-menu-item" onClick={() => { onOpenLaunchpad(); setMenuOpen(false); }}>
              <LayoutGrid size={15} /> Launchpad
            </button>
            {user && (
              <button className="os-menu-item" onClick={() => { onAddApp(); setMenuOpen(false); }}>
                <Plus size={15} /> Add application
              </button>
            )}
            {user?.is_admin && (
              <a className="os-menu-item" href="/admin">
                <Shield size={15} /> Admin dashboard
              </a>
            )}
            <button className="os-menu-item" onClick={() => openSystem('guide')}>
              <BookOpen size={15} /> Guide
            </button>
            <button className="os-menu-item" onClick={() => openSystem('about')}>
              <Info size={15} /> About DevHub
            </button>
            <a className="os-menu-item" href="https://github.com/alshawwaf/dev-hub" target="_blank" rel="noopener noreferrer">
              <Github size={15} /> Source on GitHub
            </a>
            <div className="os-menu-sep" />
            {user ? (
              <button className="os-menu-item danger" onClick={logout}>
                <LogOut size={15} /> Sign out
              </button>
            ) : (
              <a className="os-menu-item" href="/login">
                <LogOut size={15} /> Sign in
              </a>
            )}
          </div>
        )}

        {user?.is_admin && <a className="os-menu-link" href="/admin">Admin</a>}
      </div>

      <div className="os-menubar-right">
        {user && <span className="os-user">{user.email.split('@')[0]}</span>}
        <Search size={15} />
        <Wifi size={15} />
        <BatteryMedium size={16} />
        <span className="os-clock">{day}&nbsp;&nbsp;{time}</span>
      </div>
    </div>
  );
};

export default MenuBar;
