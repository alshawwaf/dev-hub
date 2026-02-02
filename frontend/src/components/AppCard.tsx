import React from 'react';
import { ExternalLink, Github, ArrowUpRight } from 'lucide-react';

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
  return (
    <div className="card group">
      {/* Status Badge */}
      <span className={`status-badge ${isLive ? 'live' : 'dev'}`}>
        {isLive ? '● Live' : '◐ Dev'}
      </span>
      
      {/* Icon Container */}
      <div className="icon-container">
        {icon}
      </div>
      
      {/* Content */}
      <h3>{name}</h3>
      <p className="description">{description}</p>
      
      {/* Actions */}
      <div className="actions">
        <a 
          href={url} 
          target="_blank" 
          rel="noopener noreferrer"
          className="btn btn-primary text-sm py-2 px-5"
        >
          <ExternalLink size={14} />
          Open App
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
