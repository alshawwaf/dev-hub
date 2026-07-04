import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Plus, RefreshCw, Pencil, Trash2, ExternalLink, Github, Play, Square, RotateCw, Rocket, Power, Shield, Package } from 'lucide-react';
import api from '../../services/api';
import { useHub } from '../HubContext';
import { useLayout } from '../LayoutContext';
import { useContextMenu } from '../ContextMenu';
import { hasDeployMapping, powerApp, type PowerAction } from '../power';
import { openExternal } from '../url';
import { useWindows } from '../WindowManager';
import { getSystemApp } from '../systemApps';
import { requestSettingsSection } from './SystemContent';
import AppGlyph from '../AppGlyph';
import type { AppInfo } from '../types';

interface DokployInfo { configured: boolean; url?: string; ok?: boolean; error?: string; }
interface AppStatus { mapped: boolean; state: 'running' | 'stopped' | 'error' | 'unknown'; detail?: string; }

// The windowed admin dashboard (replaces the old /admin page). Create/edit/delete
// go through the shared Desktop modals via useHub; lifecycle controls run through
// the Dokploy-backed /apps/{id}/power endpoints.
const AdminApp: React.FC = () => {
  const { apps, isAdmin, openAddApp, openEditApp, openDeleteApp, refetch } = useHub();
  const { iconTileBg } = useLayout();
  const { openAt } = useContextMenu();
  const { openApp } = useWindows();
  const catalog = apps.filter(a => a.id > 0);

  // Jump to Settings → Integrations (where Dokploy is connected).
  const openIntegrations = () => { requestSettingsSection('integrations'); const s = getSystemApp('settings'); if (s) openApp(s); };

  const [dokploy, setDokploy] = useState<DokployInfo | null>(null);
  const [statuses, setStatuses] = useState<Record<number, AppStatus | 'loading'>>({});
  const [busy, setBusy] = useState<Record<number, PowerAction | null>>({});
  const [msg, setMsg] = useState<Record<number, { ok: boolean; text: string } | null>>({});
  // apps we've already asked about — one status fetch per row, no polling
  const fetchedRef = useRef<Set<number>>(new Set());

  const fetchStatus = useCallback((app: AppInfo) => {
    fetchedRef.current.add(app.id);
    setStatuses(s => ({ ...s, [app.id]: 'loading' }));
    api.get(`apps/${app.id}/status`)
      .then(r => setStatuses(s => ({ ...s, [app.id]: r.data })))
      .catch(() => setStatuses(s => ({ ...s, [app.id]: { mapped: true, state: 'unknown' } })));
  }, []);

  const loadDokploy = useCallback(() => {
    api.get('infra/dokploy')
      .then(r => setDokploy(r.data))
      .catch(() => setDokploy({ configured: false }));
  }, []);

  useEffect(() => { loadDokploy(); }, [loadDokploy]);

  // Lazy per-row status: fetch once per mapped app when Dokploy is connected
  // (covers mount, late-arriving apps, and the post-refresh reload).
  useEffect(() => {
    if (!dokploy?.configured) return;
    catalog.filter(a => hasDeployMapping(a) && !fetchedRef.current.has(a.id)).forEach(fetchStatus);
  }, [dokploy, catalog, fetchStatus]);

  const refresh = () => {
    refetch();
    fetchedRef.current.clear();
    setStatuses({});
    setMsg({});
    loadDokploy();   // new dokploy object retriggers the status effect above
  };

  const doPower = async (app: AppInfo, action: PowerAction) => {
    setMsg(m => ({ ...m, [app.id]: null }));
    setBusy(b => ({ ...b, [app.id]: action }));
    try {
      const res = await powerApp(app, action);   // null = admin backed out of the confirm
      if (res) {
        setMsg(m => ({ ...m, [app.id]: { ok: res.ok !== false, text: res.message || `${action} requested` } }));
        fetchStatus(app);
      }
    } catch (err: any) {
      setMsg(m => ({ ...m, [app.id]: { ok: false, text: err?.response?.data?.detail || `Failed to ${action} ${app.name}.` } }));
    } finally {
      setBusy(b => ({ ...b, [app.id]: null }));
    }
  };

  const powerMenu = (app: AppInfo) => (e: React.MouseEvent) => {
    const r = (e.currentTarget as HTMLElement).getBoundingClientRect();
    const items = [
      { label: 'Start', icon: <Play size={15} />, onClick: () => doPower(app, 'start') },
      { label: 'Stop', icon: <Square size={15} />, onClick: () => doPower(app, 'stop') },
      // Compose services have no restart in Dokploy — redeploy is the equivalent.
      ...(app.deploy_kind === 'compose'
        ? []
        : [{ label: 'Restart', icon: <RotateCw size={15} />, onClick: () => doPower(app, 'restart') }]),
      { separator: true, label: '' },
      { label: 'Redeploy', icon: <Rocket size={15} />, onClick: () => doPower(app, 'redeploy') },
    ];
    openAt(r.right - 210, r.bottom + 6, items);
  };

  const deployCell = (app: AppInfo) => {
    if (!hasDeployMapping(app)) return <span className="os-admin-state none" title="No Dokploy target linked — set one in Edit app">—</span>;
    if (!dokploy) return <span className="os-admin-state dim">…</span>;
    if (!dokploy.configured) return <span className="os-admin-state dim" title="Connect Dokploy in Settings → Integrations">off</span>;
    const st = statuses[app.id];
    if (!st || st === 'loading') return <span className="os-admin-state dim">…</span>;
    const state = st.mapped ? st.state : 'unknown';
    return <span className={`os-admin-state ${state}`} title={st.detail || ''}>{state}</span>;
  };

  // Belt-and-braces: the app is filtered out of every launcher for non-admins,
  // but a stale deep link shouldn't render admin tooling either.
  if (!isAdmin) {
    return (
      <div className="os-sys">
        <section className="os-sys-section">
          <h3>Admin</h3>
          <p>The admin dashboard is available to administrators only.</p>
        </section>
      </div>
    );
  }

  return (
    <div className="os-admin">
      <div className="os-admin-head">
        <Shield size={16} />
        <h2>Applications</h2>
        <span className="os-admin-count">{catalog.length}</span>
        {dokploy && (
          <button
            className={`os-admin-dok ${dokploy.configured ? (dokploy.ok === false ? 'err' : 'ok') : ''}`}
            title={dokploy.configured ? (dokploy.error || dokploy.url || 'Manage the Dokploy connection') : 'Click to connect Dokploy in Settings → Integrations'}
            onClick={openIntegrations}
          >
            {dokploy.configured ? (dokploy.ok === false ? 'Dokploy: error' : 'Dokploy: connected') : 'Dokploy: not configured'}
          </button>
        )}
        <span className="os-admin-spacer" />
        <button className="btn btn-ghost os-admin-btn" onClick={refresh} title="Refresh apps and deploy states"><RefreshCw size={14} /> Refresh</button>
        <button className="btn btn-primary os-admin-btn" onClick={openAddApp}><Plus size={14} /> Add Application</button>
      </div>

      <div className="os-admin-list">
        {catalog.length === 0 && (
          <div className="os-admin-empty">
            <Package size={34} />
            <p>No applications yet.</p>
            <button className="btn btn-primary os-admin-btn" onClick={openAddApp}><Plus size={14} /> Add Application</button>
          </div>
        )}
        {catalog.map(app => (
          <div className="os-admin-row" key={app.id}>
            <span className="os-admin-icon" style={{ background: iconTileBg(app) }}><AppGlyph app={app} size={20} /></span>
            <div className="os-admin-name">
              <span>{app.name}</span>
              <small>{app.description}</small>
            </div>
            <span className="os-admin-chip" title={app.category}>{app.category || '—'}</span>
            <span className={`os-admin-live ${app.is_live ? 'on' : ''}`}>{app.is_live ? 'Live' : 'Dev'}</span>
            {deployCell(app)}
            <span className="os-admin-links">
              {app.url && (
                <button className="os-admin-iconbtn" title="Open app" onClick={() => openExternal(app.url)}><ExternalLink size={14} /></button>
              )}
              {app.github_url && (
                <button className="os-admin-iconbtn" title="Source on GitHub" onClick={() => openExternal(app.github_url)}><Github size={14} /></button>
              )}
            </span>
            <span className="os-admin-actions">
              {(() => {
                // Power controls are ALWAYS shown (this window is admin-only), but
                // greyed with a guiding tooltip until the app can actually be
                // controlled: click routes to whatever's missing (connect Dokploy,
                // or link the app to a service).
                const mapped = hasDeployMapping(app);
                const dokOk = !!dokploy?.configured;
                const actionable = mapped && dokOk;
                const title = actionable ? `Power — ${app.name}`
                  : !dokOk ? 'Dokploy isn’t connected — click to set it up in Settings → Integrations'
                    : 'Not linked to a Dokploy service — click to link it in Edit → Deployment';
                const onClick = actionable ? powerMenu(app)
                  : !dokOk ? () => openIntegrations()
                    : () => openEditApp(app);
                return (
                  <button
                    className={`os-admin-iconbtn power ${actionable ? '' : 'is-off'}`}
                    title={title}
                    aria-label={title}
                    aria-disabled={actionable ? undefined : true}
                    disabled={actionable && !!busy[app.id]}
                    onClick={onClick}
                  >
                    {busy[app.id] ? <span className="os-admin-minispin" /> : <Power size={14} />}
                  </button>
                );
              })()}
              <button className="os-admin-iconbtn" title="Edit app" onClick={() => openEditApp(app)}><Pencil size={14} /></button>
              <button className="os-admin-iconbtn danger" title="Delete app" onClick={() => openDeleteApp(app)}><Trash2 size={14} /></button>
            </span>
            {msg[app.id] && <div className={`os-admin-msg ${msg[app.id]!.ok ? 'ok' : 'err'}`}>{msg[app.id]!.text}</div>}
          </div>
        ))}
      </div>
    </div>
  );
};

export default AdminApp;
