import React from 'react';
import { ExternalLink, Github } from 'lucide-react';

interface AppCardProps {
  name: string;
  description: string;
  url: string;
  githubUrl: string;
  category: string;
  icon: string;
  isLive: boolean;
}

const AppCard: React.FC<AppCardProps> = ({ name, description, url, githubUrl, category, icon, isLive }) => {
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
    <div className="card group">
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
