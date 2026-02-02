import React from 'react';
import { useAuth } from '../context/AuthContext';
import { LogOut, Shield, Compass } from 'lucide-react';

const Navbar: React.FC = () => {
  const { user, logout } = useAuth();

  return (
    <nav className="glass sticky top-4 z-100 mx-4 mt-4 px-6 py-3 rounded-2xl flex items-center justify-between">
      {/* Logo */}
      <div className="flex items-center gap-3">
        <div className="logo-icon">
          <span style={{ fontFamily: 'Outfit, sans-serif' }}>A</span>
        </div>
        <span style={{ 
          fontFamily: 'Outfit, sans-serif', 
          fontSize: '1.25rem', 
          fontWeight: 700,
          letterSpacing: '-0.025em'
        }}>
          AI Dev-Hub
        </span>
      </div>

      {/* Navigation */}
      <div className="flex items-center gap-6">
        <div className="hidden md:flex items-center gap-6 text-sm font-medium">
          <a 
            href="/" 
            className="flex items-center gap-2 text-text-secondary hover:text-text-primary transition-colors"
          >
            <Compass size={16} />
            Explorer
          </a>
          {user?.is_admin && (
            <a 
              href="/admin" 
              className="flex items-center gap-2 text-primary-light hover:text-text-primary transition-colors"
            >
              <Shield size={16} />
              Admin
            </a>
          )}
        </div>

        {/* Divider */}
        <div className="h-6 w-px bg-glass-border hidden md:block"></div>

        {/* User Section */}
        {user ? (
          <div className="flex items-center gap-4">
            <div className="text-right hidden sm:block">
              <p className="text-sm font-semibold text-text-primary">{user.email.split('@')[0]}</p>
              <p className="text-xs text-text-dim uppercase tracking-wide">
                {user.is_admin ? 'Administrator' : 'Developer'}
              </p>
            </div>
            <button 
              onClick={logout}
              className="btn btn-ghost text-xs py-2 px-4"
            >
              <LogOut size={14} />
              Sign Out
            </button>
          </div>
        ) : (
          <a href="/login" className="btn btn-primary text-xs py-2.5 px-6">
            Sign In
          </a>
        )}
      </div>
    </nav>
  );
};

export default Navbar;
