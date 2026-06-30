import React from 'react';
import { ExternalLink, Github } from 'lucide-react';
import type { AppInfo } from './types';
import { safeHttpUrl } from './url';
import AppGlyph from './AppGlyph';

interface LauncherProps {
  app: AppInfo;
  /** Shown when an embed was attempted but the app refused to load in a frame. */
  embedBlocked?: boolean;
}

const Launcher: React.FC<LauncherProps> = ({ app, embedBlocked }) => {
  const appUrl = safeHttpUrl(app.url);
  const repoUrl = safeHttpUrl(app.github_url);

  return (
    <div className="os-launcher">
      <div className="os-launcher-icon">
        <AppGlyph app={app} size={48} />
      </div>

      <h2>{app.name}</h2>

      <div className="os-launcher-tags">
        <span className={`status-badge ${app.is_live ? 'live' : 'dev'}`}>
          {app.is_live ? '● Live' : '◐ Dev'}
        </span>
        {app.category && <span className="os-launcher-cat">{app.category}</span>}
      </div>

      {embedBlocked && (
        <p className="os-launcher-note">
          This app can’t be embedded in a window, so it opens in its own tab.
        </p>
      )}

      <p className="os-launcher-desc">{app.description}</p>

      <div className="os-launcher-actions">
        {appUrl && (
          <a href={appUrl} target="_blank" rel="noopener noreferrer" className="btn btn-primary">
            <ExternalLink size={16} />
            Open app
          </a>
        )}
        {repoUrl && (
          <a href={repoUrl} target="_blank" rel="noopener noreferrer" className="btn btn-ghost">
            <Github size={16} />
            Source
          </a>
        )}
      </div>
    </div>
  );
};

export default Launcher;
