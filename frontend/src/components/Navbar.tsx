import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { LogOut, Shield, Plus, Github, ExternalLink, Code2 } from 'lucide-react';
import AddAppModal from './AddAppModal';

const Navbar: React.FC = () => {
  const { user, logout } = useAuth();
  const [isModalOpen, setIsModalOpen] = useState(false);

  return (
    <>
      <nav className="sticky top-0 z-50 backdrop-blur-xl bg-[#0d0d1a]/80 border-b border-white/5">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            
            {/* Logo Section */}
            <div className="flex items-center gap-3">
              <div className="relative">
                <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-pink-500 to-violet-600 flex items-center justify-center shadow-lg shadow-pink-500/25">
                  <Code2 size={18} className="text-white" />
                </div>
                <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full bg-emerald-400 border-2 border-[#0d0d1a]"></div>
              </div>
              <div className="flex flex-col">
                <span className="text-lg font-bold tracking-tight bg-gradient-to-r from-white to-white/70 bg-clip-text text-transparent">
                  AI Dev Hub
                </span>
                <span className="text-[10px] text-white/40 font-medium tracking-wider uppercase hidden sm:block">
                  Developer Ecosystem
                </span>
              </div>
            </div>

            {/* Center Navigation */}
            <div className="hidden md:flex items-center gap-1">
              <a 
                href="https://github.com/alshawwaf/dev-hub" 
                target="_blank"
                rel="noopener noreferrer"
                className="group flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium text-white/60 hover:text-white hover:bg-white/5 transition-all duration-200"
              >
                <Github size={16} className="group-hover:scale-110 transition-transform" />
                <span>Source</span>
                <ExternalLink size={12} className="opacity-0 group-hover:opacity-100 transition-opacity" />
              </a>
              
              {user?.is_admin && (
                <a 
                  href="/admin" 
                  className="group flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium text-white/60 hover:text-white hover:bg-white/5 transition-all duration-200"
                >
                  <Shield size={16} />
                  <span>Admin</span>
                </a>
              )}
            </div>

            {/* Right Section */}
            <div className="flex items-center gap-3">
              {/* GitHub Button - Always Visible */}
              <a 
                href="https://github.com/alshawwaf/dev-hub" 
                target="_blank"
                rel="noopener noreferrer"
                className="md:hidden flex items-center justify-center w-9 h-9 rounded-lg bg-white/5 border border-white/10 text-white/70 hover:text-white hover:bg-white/10 hover:border-white/20 transition-all duration-200"
                title="View Source on GitHub"
              >
                <Github size={18} />
              </a>

              {user && (
                <button 
                  onClick={() => setIsModalOpen(true)}
                  className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold bg-gradient-to-r from-pink-500 to-violet-600 text-white shadow-lg shadow-pink-500/25 hover:shadow-pink-500/40 hover:scale-[1.02] active:scale-[0.98] transition-all duration-200"
                >
                  <Plus size={16} />
                  <span className="hidden sm:inline">Add App</span>
                </button>
              )}

              {user ? (
                <div className="flex items-center gap-3">
                  <div className="hidden sm:flex flex-col items-end">
                    <span className="text-sm font-semibold text-white/90">{user.email.split('@')[0]}</span>
                    <span className="text-[10px] font-medium text-pink-400/80 uppercase tracking-wider">
                      {user.is_admin ? 'Admin' : 'User'}
                    </span>
                  </div>
                  <button 
                    onClick={logout}
                    className="flex items-center justify-center w-9 h-9 rounded-lg bg-white/5 border border-white/10 text-white/50 hover:text-red-400 hover:bg-red-500/10 hover:border-red-500/30 transition-all duration-200"
                    title="Sign Out"
                  >
                    <LogOut size={16} />
                  </button>
                </div>
              ) : (
                <a 
                  href="/login" 
                  className="flex items-center gap-2 px-5 py-2 rounded-lg text-sm font-semibold bg-white text-[#0d0d1a] hover:bg-white/90 transition-all duration-200"
                >
                  Sign In
                </a>
              )}
            </div>
          </div>
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

