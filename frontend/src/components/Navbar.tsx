import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { LogOut, Shield, Plus, LayoutGrid } from 'lucide-react';
import AddAppModal from './AddAppModal';

// Slim header for the full-page routes (Guide / Admin). The desktop itself uses
// the macOS MenuBar; these sub-pages just need a way home + the essentials.
const Navbar: React.FC = () => {
  const { user, logout } = useAuth();
  const [isModalOpen, setIsModalOpen] = useState(false);

  return (
    <>
      <nav className="glass sticky top-4 z-100 mx-4 mt-4 px-6 py-3 rounded-2xl flex items-center justify-between">
        {/* Brand → back to the desktop */}
        <a href="/" className="flex items-center gap-3 hover:opacity-80 transition-opacity" title="Back to desktop">
          <div className="logo-icon w-9 h-9 overflow-hidden">
            <img
              src="/logo.svg"
              alt=""
              className="w-full h-full object-cover"
              onError={(e) => {
                const target = e.currentTarget;
                target.style.display = 'none';
                const span = target.parentElement?.querySelector('span');
                if (span) (span as HTMLElement).style.display = 'flex';
              }}
            />
            <span style={{ fontFamily: 'Outfit, sans-serif', display: 'none' }}>A</span>
          </div>
          <span style={{ fontFamily: 'Outfit, sans-serif', fontSize: '1.25rem', fontWeight: 800, letterSpacing: '-0.03em' }}>
            AI <span className="text-text-muted font-semibold">Dev Hub</span>
          </span>
        </a>

        <div className="flex items-center gap-3">
          {/* Clear way back to the macOS desktop */}
          <a
            href="/"
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 hover:border-primary-light/30 text-sm font-semibold text-text-secondary hover:text-text-primary transition-all"
          >
            <LayoutGrid size={16} /> <span className="hidden sm:inline">Desktop</span>
          </a>

          {user?.is_admin && (
            <a
              href="/admin"
              className="hidden md:flex items-center gap-2 px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 hover:border-primary-light/30 text-sm font-semibold text-text-secondary hover:text-text-primary transition-all"
            >
              <Shield size={16} /> Admin
            </a>
          )}
          {user?.is_admin && (
            <button
              onClick={() => setIsModalOpen(true)}
              className="btn btn-primary px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-widest flex items-center gap-2 shadow-lg shadow-primary-glow/20"
            >
              <Plus size={15} /> <span className="hidden sm:inline">Add App</span>
            </button>
          )}

          {user && <div className="h-8 w-px bg-glass-border hidden sm:block" />}

          {user ? (
            <div className="flex items-center gap-3">
              <div className="text-right hidden sm:block leading-tight">
                <p className="text-sm font-bold text-text-primary tracking-tight">{user.email.split('@')[0]}</p>
                <p className="text-[10px] text-primary-light font-bold uppercase tracking-[0.2em] opacity-80">
                  {user.is_admin ? 'Administrator' : 'Developer'}
                </p>
              </div>
              <button
                onClick={logout}
                title="Sign out"
                className="w-9 h-9 rounded-xl bg-glass-bg-strong border border-glass-border flex items-center justify-center text-text-muted hover:text-error hover:border-error/30 hover:bg-error/5 transition-all"
              >
                <LogOut size={17} />
              </button>
            </div>
          ) : (
            <a href="/login" className="btn btn-primary text-xs py-2.5 px-6 rounded-xl font-bold uppercase tracking-widest">
              Sign In
            </a>
          )}
        </div>
      </nav>

      <AddAppModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} onAppAdded={() => window.location.reload()} />
    </>
  );
};

export default Navbar;
