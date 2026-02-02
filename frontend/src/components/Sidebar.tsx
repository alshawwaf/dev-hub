import React, { useState } from 'react';
import { Search, ChevronLeft, ChevronRight, LayoutGrid, Shield, Server, Cpu, Activity, Zap, Database, Globe } from 'lucide-react';

interface SidebarProps {
  search: string;
  setSearch: (val: string) => void;
  activeCategory: string;
  setActiveCategory: (val: string) => void;
  categories: string[];
}

const Sidebar: React.FC<SidebarProps> = ({ 
  search, 
  setSearch, 
  activeCategory, 
  setActiveCategory, 
  categories 
}) => {
  const [isCollapsed, setIsCollapsed] = useState(false);

  const getIcon = (category: string) => {
    switch (category.toLowerCase()) {
      case 'all': return <LayoutGrid size={18} />;
      case 'ai security': return <Shield size={18} />;
      case 'security': return <Shield size={18} />;
      case 'infrastructure': return <Server size={18} />;
      case 'ai': return <Cpu size={18} />;
      case 'automation': return <Activity size={18} />;
      case 'productivity': return <Zap size={18} />;
      case 'data': return <Database size={18} />;
      case 'web': return <Globe size={18} />;
      default: return <LayoutGrid size={18} />;
    }
  };

  return (
    <aside className={`sidebar glass ${isCollapsed ? 'collapsed' : ''}`}>
      <button 
        className="sidebar-toggle" 
        onClick={() => setIsCollapsed(!isCollapsed)}
        aria-label={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
      >
        {isCollapsed ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
      </button>

      <div className="sidebar-content">
        {/* Search */}
        <div className="sidebar-group">
          <div className="search-container">
            <Search className="search-icon" size={16} />
            <input 
              type="text" 
              placeholder={isCollapsed ? "" : "Search apps..."}
              className="search-input"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              aria-label="Search applications"
            />
          </div>
        </div>

        {/* Categories */}
        <div className="filter-group">
          {!isCollapsed && <label className="filter-label">Categories</label>}
          <div className="flex flex-col gap-2">
            {categories.map(cat => (
              <button
                key={cat}
                onClick={() => setActiveCategory(cat)}
                className={`filter-button ${activeCategory === cat ? 'active' : ''}`}
                title={cat}
                aria-pressed={activeCategory === cat}
              >
                {getIcon(cat)}
                <span className="sidebar-hide">{cat}</span>
              </button>
            ))}
          </div>
        </div>
      </div>
    </aside>
  );
};

export default Sidebar;
