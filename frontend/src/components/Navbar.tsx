import React from 'react';
import { useAuth } from '../context/AuthContext';

const Navbar: React.FC = () => {
  const { user, logout } = useAuth();

  return (
    <nav className="glass sticky top-6 z-50 mx-6 mt-6 px-8 py-4 rounded-2xl flex items-center justify-between border-b border-glass-border">
      <div className="flex items-center gap-2">
        <div className="w-8 h-8 bg-gradient-to-br from-primary to-secondary rounded-lg flex items-center justify-center font-bold text-white shadow-lg">
          D
        </div>
        <span className="text-xl font-bold tracking-tight outfit">Dev-Hub</span>
      </div>

      <div className="flex items-center gap-6">
        <div className="hidden md:flex items-center gap-6 text-sm font-medium text-text-muted">
          <a href="/" className="hover:text-text-main transition-colors">Explorer</a>
          {user?.is_admin && (
            <a href="/admin" className="text-secondary hover:text-white transition-colors">Admin Portal</a>
          )}
        </div>

        <div className="h-4 w-px bg-glass-border hidden md:block"></div>

        {user ? (
          <div className="flex items-center gap-4">
            <div className="text-right hidden sm:block">
              <p className="text-xs font-bold text-text-main">{user.email.split('@')[0]}</p>
              <p className="text-[10px] text-text-dim uppercase tracking-widest">{user.is_admin ? 'Administrator' : 'Developer'}</p>
            </div>
            <button 
              onClick={logout}
              className="btn btn-ghost text-xs py-2 px-4"
            >
              Sign Out
            </button>
          </div>
        ) : (
          <a href="/login" className="btn btn-primary text-xs py-2 px-6">
            Sign In
          </a>
        )}
      </div>
    </nav>
  );
};

export default Navbar;
