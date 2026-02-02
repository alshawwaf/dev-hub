import React, { useState } from 'react';
import AppCard from '../components/AppCard';

const MOCK_APPS = [
  {
    id: 1,
    name: "Training Portal",
    description: "Enterprise blueprint for virtualized hands-on learning and class orchestration.",
    url: "https://training.alshawwaf.ca",
    githubUrl: "https://github.com/alshawwaf/training-portal",
    category: "Infrastructure",
    icon: "🏗️",
    isLive: true
  },
  {
    id: 2,
    name: "Lakera Demo",
    description: "Interactive playground for testing LLM guardrails and prompt injection security.",
    url: "https://lakera.alshawwaf.ca",
    githubUrl: "https://github.com/alshawwaf/Lakera-Demo",
    category: "AI Security",
    icon: "🛡️",
    isLive: true
  },
  {
    id: 3,
    name: "n8n Automation",
    description: "Self-hosted workflow automation tool for connecting apps and APIs.",
    url: "https://n8n.alshawwaf.ca",
    githubUrl: "https://github.com/alshawwaf/cp-agentic-mcp-playground",
    category: "Automation",
    icon: "⚙️",
    isLive: true
  },
  {
    id: 4,
    name: "Open WebUI",
    description: "Full-featured chat interface for Ollama and other LLM backends.",
    url: "https://chat.alshawwaf.ca",
    githubUrl: "https://github.com/alshawwaf/cp-agentic-mcp-playground",
    category: "AI",
    icon: "💬",
    isLive: true
  }
];

const LandingPage: React.FC = () => {
  const [search, setSearch] = useState("");
  const [activeCategory, setActiveCategory] = useState("All");

  const categories = ["All", ...new Set(MOCK_APPS.map(app => app.category))];

  const filteredApps = MOCK_APPS.filter(app => {
    const matchesSearch = app.name.toLowerCase().includes(search.toLowerCase()) || 
                          app.description.toLowerCase().includes(search.toLowerCase());
    const matchesCategory = activeCategory === "All" || app.category === activeCategory;
    return matchesSearch && matchesCategory;
  });

  return (
    <div className="container mx-auto px-6 py-12">
      <header className="text-center mb-16">
        <h1 className="text-5xl md:text-7xl font-extrabold mb-4 text-gradient">Dev-Hub</h1>
        <p className="text-text-muted text-lg max-w-2xl mx-auto">
          Explore and manage our ecosystem of secure, intelligent, and scalable applications.
        </p>
      </header>

      <section className="mb-12">
        <div className="flex flex-col md:flex-row gap-6 items-center justify-between glass p-4 rounded-2xl">
          <div className="relative w-full md:w-96">
            <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-text-dim">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </span>
            <input 
              type="text" 
              placeholder="Search applications..." 
              className="w-full bg-bg-dark border border-glass-border rounded-xl py-3 pl-10 pr-4 text-text-main focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          <div className="flex gap-2 overflow-x-auto w-full md:w-auto pb-2 md:pb-0">
            {categories.map(cat => (
              <button
                key={cat}
                onClick={() => setActiveCategory(cat)}
                className={`btn text-xs py-2 px-4 ${activeCategory === cat ? 'btn-primary' : 'btn-ghost'}`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>
      </section>

      <main className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
        {filteredApps.length > 0 ? (
          filteredApps.map(app => (
            <AppCard key={app.id} {...app} />
          ))
        ) : (
          <div className="col-span-full py-20 text-center">
            <div className="text-6xl mb-4">🔍</div>
            <h3 className="text-2xl font-bold mb-2">No apps found</h3>
            <p className="text-text-muted">Try adjusting your search or category filters.</p>
          </div>
        )}
      </main>
    </div>
  );
};

export default LandingPage;
