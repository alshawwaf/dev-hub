import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { LogOut, Shield, Plus, Github, BookOpen } from 'lucide-react';
import AddAppModal from './AddAppModal';

const Navbar: React.FC = () => {
  const { user, logout } = useAuth();
  const [isModalOpen, setIsModalOpen] = useState(false);

  return (
    <>
      <nav className="glass sticky top-4 z-100 mx-4 mt-4 px-8 py-4 rounded-2xl flex items-center justify-between">
        {/* Logo and GitHub */}
        <div className="flex items-center gap-4">
          <a href="/" className="flex items-center gap-4 hover:opacity-80 transition-opacity">
            <div className="logo-icon w-10 h-10 overflow-hidden">
              <img 
                src="/logo.svg" 
                alt="Logo" 
                className="w-full h-full object-cover" 
                onError={(e) => {
                  const target = e.currentTarget;
                  target.style.display = 'none';
                  const parent = target.parentElement;
                  if (parent) {
                    const span = parent.querySelector('span');
                    if (span) span.style.display = 'flex';
                  }
                }}
              />
              <span style={{ fontFamily: 'Outfit, sans-serif', display: 'none' }}>A</span>
            </div>
            <span style={{ 
              fontFamily: 'Outfit, sans-serif', 
              fontSize: '1.4rem', 
              fontWeight: 800,
              letterSpacing: '-0.03em'
            }}>
              AI <span className="text-text-muted font-semibold">Dev Hub</span>
            </span>
          </a>
          <a 
            href="https://github.com/alshawwaf/dev-hub" 
            target="_blank"
            rel="noopener noreferrer"
            className="ml-2 p-2 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 hover:border-primary-light/30 transition-all duration-300 group"
            title="View on GitHub"
          >
            <Github size={18} className="text-text-muted group-hover:text-primary-light transition-colors" />
          </a>
        </div>

        {/* Navigation */}
        <div className="flex items-center gap-4 sm:gap-10">
          <div className="flex items-center gap-6">
            {/* Guide Link - Always visible */}
            <a 
              href="/guide" 
              className="flex items-center gap-2 text-text-secondary hover:text-primary-light transition-all duration-300 text-sm font-semibold tracking-wide"
            >
              <BookOpen size={18} />
              <span className="hidden sm:inline">Guide</span>
            </a>

            {user && (
              <button 
                onClick={() => setIsModalOpen(true)}
                className="btn btn-primary px-5 py-2.5 rounded-xl text-xs font-bold uppercase tracking-widest flex items-center gap-2.5 shadow-lg shadow-primary-glow/20"
              >
                <Plus size={16} />
                <span className="hidden sm:inline">Add Application</span>
                <span className="sm:hidden">Add</span>
              </button>
            )}

            {user?.is_admin && (
              <div className="hidden lg:flex items-center gap-8 text-sm font-semibold tracking-wide">
                <a 
                  href="/admin" 
                  className="flex items-center gap-2 text-text-secondary hover:text-primary-light transition-all duration-300"
                >
                  <Shield size={18} />
                  Admin
                </a>
              </div>
            )}
          </div>

          {/* Divider */}
          {user && <div className="h-8 w-px bg-glass-border hidden lg:block"></div>}

          {/* User Section */}
          {user ? (
            <div className="flex items-center gap-6">
              <div className="text-right hidden sm:block">
                <p className="text-sm font-bold text-text-primary tracking-tight">{user.email.split('@')[0]}</p>
                <p className="text-[10px] text-primary-light font-bold uppercase tracking-[0.2em] opacity-80">
                  {user.is_admin ? 'Administrator' : 'Developer'}
                </p>
              </div>
              <button 
                onClick={logout}
                className="w-10 h-10 rounded-xl bg-glass-bg-strong border border-glass-border flex items-center justify-center text-text-muted hover:text-error hover:border-error/30 hover:bg-error/5 transition-all duration-300 group"
                title="Sign Out"
              >
                <LogOut size={18} className="group-hover:scale-110 transition-transform" />
              </button>
            </div>
          ) : (
            <a href="/login" className="btn btn-primary text-xs py-3 px-8 rounded-xl font-bold uppercase tracking-widest">
              Sign In
            </a>
          )}
        </div>
      </nav>

      <AddAppModal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
        onAppAdded={() => window.location.reload()} 
      />
    </>
  );
};

export default Navbar;
