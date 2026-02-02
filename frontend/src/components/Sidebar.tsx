import React, { useState } from 'react';
import { Search, ChevronLeft, ChevronRight, LayoutGrid, Shield, Server, Cpu, Activity } from 'lucide-react';

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
      case 'all': return <LayoutGrid size={20} />;
      case 'ai security': return <Shield size={20} />;
      case 'infrastructure': return <Server size={20} />;
      case 'ai': return <Cpu size={20} />;
      case 'automation': return <Activity size={20} />;
      default: return <LayoutGrid size={20} />;
    }
  };

  return (
    <aside className={`sidebar glass ${isCollapsed ? 'collapsed' : ''}`}>
      <button 
        className="sidebar-toggle" 
        onClick={() => setIsCollapsed(!isCollapsed)}
      >
        {isCollapsed ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
      </button>

      <div className="sidebar-content">
        <div className="sidebar-group">
          <div className="search-container">
            <Search className="search-icon" size={18} />
            <input 
              type="text" 
              placeholder={isCollapsed ? "" : "Search..."}
              className="search-input"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </div>

        <div className="filter-group">
          {!isCollapsed && <label className="filter-label">Categories</label>}
          <div className="flex flex-col gap-2">
            {categories.map(cat => (
              <button
                key={cat}
                onClick={() => setActiveCategory(cat)}
                className={`filter-button ${activeCategory === cat ? 'active' : ''}`}
                title={cat}
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
