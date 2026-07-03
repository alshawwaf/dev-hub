import React from 'react';
import { ExternalLink, Github, RotateCw } from 'lucide-react';
import type { AppInfo } from './types';
import { safeHttpUrl } from './url';
import AppGlyph from './AppGlyph';
import { useLayout } from './LayoutContext';

export interface EmbedStatus { ok: boolean; category: string; status: number | null; reason: string; }

interface LauncherProps {
  app: AppInfo;
  /** Shown when an embed was attempted but the app refused to load in a frame. */
  embedBlocked?: boolean;
  /** Precise reachability/framing verdict from the server-side probe (when not ok). */
  embedStatus?: EmbedStatus | null;
  /** Re-run the embed attempt (re-probe + reload the frame). */
  onRetry?: () => void;
}

const CATEGORY_LABEL: Record<string, string> = {
  notfound: 'Not deployed',
  offline: 'Offline',
  blocked: 'Can’t be framed',
  error: 'Unavailable',
};

const Launcher: React.FC<LauncherProps> = ({ app, embedBlocked, embedStatus, onRetry }) => {
  const { iconTileBg } = useLayout();
  const appUrl = safeHttpUrl(app.url);
  const repoUrl = safeHttpUrl(app.github_url);
  const probe = embedStatus && !embedStatus.ok ? embedStatus : null;

  return (
    <div className="os-launcher">
      <div className="os-launcher-icon" style={{ background: iconTileBg(app) }}>
        <AppGlyph app={app} size={48} />
      </div>

      <h2>{app.name}</h2>

      <div className="os-launcher-tags">
        {probe ? (
          <span className="status-badge dev">
            ◐ {CATEGORY_LABEL[probe.category] || 'Unavailable'}{probe.status ? ` · ${probe.status}` : ''}
          </span>
        ) : (
          <span className={`status-badge ${app.is_live ? 'live' : 'dev'}`}>
            {app.is_live ? '● Live' : '◐ Dev'}
          </span>
        )}
        {app.category && <span className="os-launcher-cat">{app.category}</span>}
      </div>

      {probe ? (
        <p className="os-launcher-note">{probe.reason}</p>
      ) : embedBlocked ? (
        <p className="os-launcher-note">
          This app can’t be embedded in a window, so it opens in its own tab.
        </p>
      ) : (!app.embeddable && !app.proxy_embed) ? (
        <p className="os-launcher-note">
          This app runs best on its own, so it opens in a new tab.
        </p>
      ) : null}

      <p className="os-launcher-desc">{app.description}</p>

      <div className="os-launcher-actions">
        {appUrl && (
          <a href={appUrl} target="_blank" rel="noopener noreferrer" className="btn btn-primary">
            <ExternalLink size={16} />
            Open app
          </a>
        )}
        {onRetry && (
          <button type="button" className="btn btn-ghost" onClick={onRetry}>
            <RotateCw size={16} />
            Try again
          </button>
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
