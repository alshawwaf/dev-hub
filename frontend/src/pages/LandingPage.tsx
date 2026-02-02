import React, { useState, useEffect } from 'react';
import AppCard from '../components/AppCard';
import Sidebar from '../components/Sidebar';
import api from '../services/api';

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

  return (
    <div className="flex w-full">
      <Sidebar 
        search={search}
        setSearch={setSearch}
        activeCategory={activeCategory}
        setActiveCategory={setActiveCategory}
        categories={categories}
      />
      
      <main className="main-content px-6 py-12">
        <header className="text-center mb-16">
          <h1 className="text-5xl md:text-7xl font-extrabold mb-4 text-gradient">AI Dev-Hub</h1>
          <p className="text-text-muted text-lg max-w-2xl mx-auto">
            Explore and manage our ecosystem of secure, intelligent, and scalable applications.
          </p>
        </header>

        {loading ? (
          <div className="flex flex-col items-center justify-center py-20">
            <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin mb-4"></div>
            <p className="text-text-dim">Loading AI Ecosystem...</p>
          </div>
        ) : error ? (
          <div className="text-center py-20 bg-red-500/10 rounded-3xl border border-red-500/20">
            <h3 className="text-2xl font-bold text-red-400 mb-2">Error</h3>
            <p className="text-text-muted">{error}</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
            {filteredApps.length > 0 ? (
              filteredApps.map(app => (
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
              ))
            ) : (
              <div className="col-span-full py-20 text-center">
                <div className="text-6xl mb-4">🔍</div>
                <h3 className="text-2xl font-bold mb-2">No apps found</h3>
                <p className="text-text-muted">Try adjusting your search or category filters.</p>
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
};

export default LandingPage;
