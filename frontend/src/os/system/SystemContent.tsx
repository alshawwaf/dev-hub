import React, { useState, useEffect, useCallback } from 'react';
import { RotateCcw, Shield, Plus, Layers, ExternalLink, Github, Trash2, Search, X } from 'lucide-react';
import type { SystemKey, Placement } from '../types';
import { useLayout } from '../LayoutContext';
import { useHub } from '../HubContext';
import api from '../../services/api';
import GuidePage from '../../pages/GuidePage';
import AppGlyph from '../AppGlyph';
import { tintFor } from '../iconStyle';

const PLACEMENTS: { value: Placement; label: string }[] = [
  { value: 'desktop', label: 'Desktop' },
  { value: 'dock', label: 'Dock' },
  { value: 'both', label: 'Both' },
  { value: 'hidden', label: 'Hidden' },
];

const SettingsApp: React.FC = () => {
  const { resetLayout, hasLocalOverrides, getPlacement, setPlacement } = useLayout();
  const { isAdmin, openAddApp, apps } = useHub();
  const catalog = apps.filter(a => a.id > 0);

  return (
    <div className="os-sys">
      <section className="os-sys-section">
        <h3>App placement</h3>
        <p>Choose where each app appears. You can also drag an icon between the desktop and dock, or right-click any app.{isAdmin && ' As an admin, your choices set the shared default for everyone.'}</p>
        <div className="os-place-list">
          {catalog.map(app => {
            const current = getPlacement(app);
            return (
              <div key={app.id} className="os-place-row">
                <span className="os-place-icon" style={{ background: tintFor(app) }}><AppGlyph app={app} size={18} /></span>
                <span className="os-place-name">{app.name}</span>
                <div className="os-place-seg" role="radiogroup" aria-label={`Placement for ${app.name}`}>
                  {PLACEMENTS.map(p => (
                    <button
                      key={p.value}
                      className={`os-place-opt ${current === p.value ? 'on' : ''}`}
                      role="radio"
                      aria-checked={current === p.value}
                      onClick={() => setPlacement(app, p.value)}
                    >
                      {p.label}
                    </button>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
        <button className="btn btn-ghost" onClick={resetLayout} disabled={!hasLocalOverrides} style={{ marginTop: '1rem' }}>
          <RotateCcw size={15} /> Reset to default layout
        </button>
        {!hasLocalOverrides && <span className="os-sys-hint">You're using the default layout.</span>}
      </section>

      <section className="os-sys-section">
        <h3>Opening apps</h3>
        <p>Apps marked <em>embeddable</em> open inside a window; apps that block framing can be routed through the proxy. Everything else opens in its own tab — set this per app in the Edit dialog (right-click → Edit app).</p>
      </section>

      {isAdmin && (
        <section className="os-sys-section">
          <h3>Manage</h3>
          <div className="os-sys-row">
            <button className="btn btn-primary" onClick={openAddApp}><Plus size={15} /> Add application</button>
            <a className="btn btn-ghost" href="/admin"><Shield size={15} /> Admin dashboard</a>
          </div>
        </section>
      )}
    </div>
  );
};

interface ActRow { id: number; at: string; kind: string; method: string; path: string; source_ip: string; actor: string; status: number; duration_ms: number; summary: string; detail?: unknown; }
interface ActData { items: ActRow[]; total: number; errors: number; avg_ms: number; sources: number; }

const KINDS = ['all', 'api', 'auth', 'admin', 'embed'];
const fmtTime = (at: string) => new Date(/[Z+]/.test(at) ? at : at + 'Z').toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
const statusClass = (s: number) => (s >= 500 ? 'err' : s >= 400 ? 'warn' : 'ok');

const ActivityFeed: React.FC = () => {
  const { isAdmin } = useHub();
  const [data, setData] = useState<ActData | null>(null);
  const [kind, setKind] = useState('all');
  const [errorsOnly, setErrorsOnly] = useState(false);
  const [q, setQ] = useState('');
  const [forbidden, setForbidden] = useState(false);
  const [detail, setDetail] = useState<ActRow | null>(null);

  const load = useCallback(async () => {
    try {
      const params: Record<string, string> = {};
      if (kind !== 'all') params.kind = kind;
      if (errorsOnly) params.only = 'errors';
      if (q.trim()) params.q = q.trim();
      const res = await api.get('activity/', { params });
      setData(res.data);
      setForbidden(false);
    } catch (e: any) {
      if (e?.response?.status === 401 || e?.response?.status === 403) setForbidden(true);
    }
  }, [kind, errorsOnly, q]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => {
    const t = window.setInterval(load, 5000);
    return () => window.clearInterval(t);
  }, [load]);

  if (forbidden) {
    return (
      <div className="os-sys">
        <section className="os-sys-section">
          <h3>Activity</h3>
          <p>Activity logs are available to administrators. Sign in as an admin to view them.</p>
        </section>
      </div>
    );
  }

  const openDetail = async (id: number) => {
    try { const r = await api.get(`activity/${id}`); setDetail(r.data); } catch { /* ignore */ }
  };
  const clear = async () => {
    if (!confirm('Clear all activity logs?')) return;
    try { await api.delete('activity/'); setDetail(null); load(); } catch { /* ignore */ }
  };

  return (
    <div className="os-activity">
      <div className="os-act-stats">
        <div className="os-act-stat"><span>{data?.total ?? '–'}</span><label>events</label></div>
        <div className="os-act-stat"><span className={data && data.errors ? 'err' : ''}>{data?.errors ?? '–'}</span><label>errors</label></div>
        <div className="os-act-stat"><span>{data?.avg_ms ?? '–'}<small>ms</small></span><label>avg</label></div>
        <div className="os-act-stat"><span>{data?.sources ?? '–'}</span><label>sources</label></div>
      </div>

      <div className="os-act-toolbar">
        {KINDS.map(k => (
          <button key={k} className={`os-act-chip ${kind === k ? 'on' : ''}`} onClick={() => setKind(k)}>{k}</button>
        ))}
        <button className={`os-act-chip ${errorsOnly ? 'on' : ''}`} onClick={() => setErrorsOnly(v => !v)}>errors only</button>
        <div className="os-act-search"><Search size={13} /><input value={q} onChange={e => setQ(e.target.value)} placeholder="Search path, ip, user" /></div>
        {isAdmin && <button className="os-act-clear" onClick={clear} title="Clear all"><Trash2 size={14} /></button>}
      </div>

      <div className="os-act-list">
        {data?.items.length === 0 && <p className="os-sys-hint">No activity yet.</p>}
        {data?.items.map(r => (
          <button key={r.id} className="os-act-row" onClick={() => openDetail(r.id)}>
            <span className={`os-act-method m-${r.method.toLowerCase()}`}>{r.method}</span>
            <span className={`os-act-status s-${statusClass(r.status)}`}>{r.status}</span>
            <span className="os-act-path">{r.path}</span>
            <span className="os-act-kind">{r.kind}</span>
            <span className="os-act-actor">{r.actor}</span>
            <span className="os-act-dur">{r.duration_ms}ms</span>
            <span className="os-act-time">{fmtTime(r.at)}</span>
          </button>
        ))}
      </div>

      {detail && (
        <div className="os-act-drawer" onClick={() => setDetail(null)}>
          <div className="os-act-drawer-card" onClick={e => e.stopPropagation()}>
            <button className="os-act-drawer-x" onClick={() => setDetail(null)}><X size={16} /></button>
            <h3>{detail.method} {detail.path}</h3>
            <pre>{JSON.stringify(detail, null, 2)}</pre>
          </div>
        </div>
      )}
    </div>
  );
};

const AboutApp: React.FC = () => (
  <div className="os-sys os-sys-about">
    <div className="os-sys-logo"><Layers size={34} /></div>
    <h2>DevHub</h2>
    <p>A macOS-style desktop for the AI and dev tools built for and with AI. Apps live as icons on the desktop and dock; open one to launch it in a window or its own tab.</p>
    <div className="os-sys-row">
      <a className="btn btn-ghost" href="https://hub.ai.alshawwaf.ca" target="_blank" rel="noopener noreferrer"><ExternalLink size={15} /> hub.ai.alshawwaf.ca</a>
      <a className="btn btn-ghost" href="https://github.com/alshawwaf/dev-hub" target="_blank" rel="noopener noreferrer"><Github size={15} /> Source</a>
    </div>
    <p className="os-sys-hint">© 2026 AI Dev Hub • Crafted for AI by AI</p>
  </div>
);

const SystemContent: React.FC<{ appKey: SystemKey }> = ({ appKey }) => {
  switch (appKey) {
    case 'settings': return <SettingsApp />;
    case 'logs': return <ActivityFeed />;
    case 'guide': return <div className="os-sys-guide"><GuidePage /></div>;
    case 'about': return <AboutApp />;
    default: return null;
  }
};

export default SystemContent;
