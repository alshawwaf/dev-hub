import React, { useState, useEffect } from 'react';
import AppCard from '../components/AppCard';
import Sidebar from '../components/Sidebar';
import api from '../services/api';
import { Sparkles, AlertTriangle, SearchX, Layers } from 'lucide-react';

interface App {
  id: number;
  name: string;
  description: string;
  url: string;
  github_url: string;
  category: string;
  icon: string;
  is_live: boolean;
}

const AGENTIC_REPO = 'cp-agentic-mcp-playground';

const LandingPage: React.FC = () => {
  const [apps, setApps] = useState<App[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [activeCategory, setActiveCategory] = useState("All");


  useEffect(() => {
    const fetchApps = async () => {
      try {
        const response = await api.get('apps/');
        setApps(response.data);
      } catch (err) {
        console.error("Failed to fetch apps:", err);
        setError("Unable to load applications. Please try again later.");
      } finally {
        setLoading(false);
      }
    };

    fetchApps();
  }, []);

  const categories = ["All", ...new Set(apps.map(app => app.category))];

  const filteredApps = apps.filter(app => {
    const matchesSearch = app.name.toLowerCase().includes(search.toLowerCase()) || 
                          app.description.toLowerCase().includes(search.toLowerCase());
    const matchesCategory = activeCategory === "All" || app.category === activeCategory;
    return matchesSearch && matchesCategory;
  });

  // Separate apps into standalone and agentic project apps
  const standaloneApps = filteredApps.filter(app => !app.github_url.includes(AGENTIC_REPO));
  const agenticApps = filteredApps.filter(app => app.github_url.includes(AGENTIC_REPO));

  return (
    <div className="flex w-full">
      <Sidebar 
        search={search}
        setSearch={setSearch}
        activeCategory={activeCategory}
        setActiveCategory={setActiveCategory}
        categories={categories}
      />
      
      <main className="main-content px-6 lg:px-8">
        {/* Hero Section */}
        <header className="hero pt-12 pb-8">
          <div className="flex justify-center mb-6">
            <span className="glass px-4 py-1.5 rounded-full text-xs font-bold uppercase tracking-widest text-primary-light border-primary-glow/30 flex items-center gap-2">
              <Sparkles size={14} />
              The Future of Development
            </span>
          </div>
          <h1 className="text-gradient mb-4" style={{ fontSize: 'clamp(2.5rem, 6vw, 4rem)', lineHeight: 1.1 }}>
            AI <span className="text-white">Dev Hub</span>
          </h1>
          <p className="subtitle text-base md:text-lg max-w-2xl mx-auto opacity-80 mb-10 px-4">
            A premium ecosystem for secure, intelligent, and scalable AI applications. 
            Accelerate your workflow with our curated collection of tools.
          </p>
        </header>

        {/* Content */}
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20">
            <div className="spinner mb-6"></div>
            <p className="text-text-muted flex items-center gap-2">
              <Sparkles size={16} className="text-primary" />
              Loading AI Ecosystem...
            </p>
          </div>
        ) : error ? (
          <div className="text-center py-16 px-8 glass rounded-2xl max-w-lg mx-auto">
            <div className="w-16 h-16 rounded-full bg-error/10 flex items-center justify-center mx-auto mb-4">
              <AlertTriangle size={28} className="text-error" />
            </div>
            <h3 className="text-xl font-bold mb-2">Connection Error</h3>
            <p className="text-text-muted">{error}</p>
          </div>
        ) : filteredApps.length === 0 ? (
          <div className="col-span-full py-20 text-center">
            <div className="w-20 h-20 rounded-full bg-glass-bg-strong flex items-center justify-center mx-auto mb-6">
              <SearchX size={36} className="text-text-dim" />
            </div>
            <h3 className="text-2xl font-bold mb-2">No apps found</h3>
            <p className="text-text-muted">Try adjusting your search or category filters.</p>
          </div>
        ) : (
          <>
            {/* Standalone Applications */}
            {standaloneApps.length > 0 && (
              <section className="mb-12">
                <h2 className="text-xl font-bold mb-6 text-text-secondary flex items-center gap-2">
                  <Sparkles size={20} className="text-primary-light" />
                  Standalone Applications
                </h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                  {standaloneApps.map(app => (
                    <AppCard 
                      key={app.id} 
                      name={app.name}
                      description={app.description}
                      url={app.url}
                      githubUrl={app.github_url}
                      category={app.category}
                      icon={app.icon}
                      isLive={app.is_live}
                    />
                  ))}
                </div>
              </section>
            )}

            {/* Agentic MCP Playground Applications */}
            {agenticApps.length > 0 && (
              <section className="mb-12">
                <h2 className="text-xl font-bold mb-2 text-text-secondary flex items-center gap-2">
                  <Layers size={20} className="text-cyan-400" />
                  Agentic MCP Playground
                </h2>
                <p className="text-sm text-text-muted mb-6">
                  Part of the <a href="https://github.com/alshawwaf/cp-agentic-mcp-playground" target="_blank" rel="noopener noreferrer" className="text-primary-light hover:underline">cp-agentic-mcp-playground</a> project
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                  {agenticApps.map(app => (
                    <AppCard 
                      key={app.id} 
                      name={app.name}
                      description={app.description}
                      url={app.url}
                      githubUrl={app.github_url}
                      category={app.category}
                      icon={app.icon}
                      isLive={app.is_live}
                    />
                  ))}
                </div>
              </section>
            )}
          </>
        )}
      </main>
    </div>
  );
};

export default LandingPage;
