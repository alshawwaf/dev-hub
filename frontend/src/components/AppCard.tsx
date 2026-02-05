import React from 'react';
import { ExternalLink, Github, Pencil, Trash2 } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

interface AppCardProps {
  id: number;
  name: string;
  description: string;
  url: string;
  githubUrl: string;
  category: string;
  icon: string;
  isLive: boolean;
  onEdit?: (id: number) => void;
  onDelete?: (id: number) => void;
}

const AppCard: React.FC<AppCardProps> = ({ 
  id, 
  name, 
  description, 
  url, 
  githubUrl, 
  category, 
  icon, 
  isLive,
  onEdit,
  onDelete 
}) => {
  const { user } = useAuth();
  
  const isCurrentApp = React.useMemo(() => {
    if (typeof window === 'undefined') return false;
    try {
      const currentHostname = window.location.hostname;
      const appHostname = new URL(url).hostname;
      return currentHostname === appHostname;
    } catch (e) {
      return false;
    }
  }, [url]);

  return (
    <div className="card group relative">
      {/* Admin Controls */}
      {user && (
        <div className="absolute top-3 right-14 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity z-10">
          <button
            onClick={() => onEdit?.(id)}
            className="p-1.5 rounded-lg bg-white/10 hover:bg-primary/20 text-text-muted hover:text-primary-light transition-all"
            title="Edit application"
          >
            <Pencil size={14} />
          </button>
          <button
            onClick={() => onDelete?.(id)}
            className="p-1.5 rounded-lg bg-white/10 hover:bg-red-500/20 text-text-muted hover:text-red-400 transition-all"
            title="Delete application"
          >
            <Trash2 size={14} />
          </button>
        </div>
      )}

      {/* Status Badge */}
      <span className={`status-badge ${isLive ? 'live' : 'dev'}`}>
        {isLive ? '● Live' : '◐ Dev'}
      </span>
      
      {/* Icon Container */}
      <div className="icon-container flex items-center justify-center">
        {(icon.startsWith('http') || icon.startsWith('/')) ? (
          <img 
            src={icon} 
            alt={`${name} icon`} 
          />
        ) : (
          <span className="text-2xl">{icon}</span>
        )}
      </div>
      
      {/* Content */}
      <h3>{name}</h3>
      <p className="description">{description}</p>
      
      {/* Actions */}
      <div className="actions">
        <a 
          href={isCurrentApp ? "#" : url} 
          target={isCurrentApp ? undefined : "_blank"} 
          rel="noopener noreferrer"
          className={`btn btn-primary text-sm py-2 px-5 ${isCurrentApp ? 'opacity-50 pointer-events-none cursor-default' : ''}`}
          onClick={isCurrentApp ? (e) => e.preventDefault() : undefined}
        >
          <ExternalLink size={14} />
          {isCurrentApp ? 'This Application' : 'Open App'}
        </a>
        
        <a 
          href={githubUrl} 
          target="_blank" 
          rel="noopener noreferrer"
          className="btn btn-ghost text-sm py-2 px-4"
        >
          <Github size={14} />
          Source
        </a>
      </div>
      
      {/* Category Tag */}
      <div className="category-tag">{category}</div>
    </div>
  );
};

export default AppCard;
