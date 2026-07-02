import React, { useState, useEffect, useCallback } from 'react';
import { RotateCcw, Shield, Plus, Layers, ExternalLink, Github, Trash2, Search, X, Palette, LayoutGrid, LayoutDashboard, ChevronRight } from 'lucide-react';
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

const Group: React.FC<{ children: React.ReactNode }> = ({ children }) => <div className="os-set-grp">{children}</div>;
const Row: React.FC<{ label: string; help?: string; children: React.ReactNode }> = ({ label, help, children }) => (
  <div className="os-set-row">
    <span className="os-set-label">{label}{help && <small>{help}</small>}</span>
    <span className="os-set-ctrl">{children}</span>
  </div>
);
const Toggle: React.FC<{ checked: boolean; onChange: (v: boolean) => void; label?: string }> = ({ checked, onChange, label }) => (
  <label className="os-sw">
    <input type="checkbox" checked={checked} onChange={e => onChange(e.target.checked)} aria-label={label} />
    <span />
  </label>
);

const SECTIONS = [
  { key: 'overview', label: 'Overview', Icon: LayoutDashboard, color: 'linear-gradient(135deg,#06b6d4,#0e7490)' },
  { key: 'appearance', label: 'Appearance', Icon: Palette, color: 'linear-gradient(135deg,#ec4899,#be185d)' },
  { key: 'apps', label: 'Apps & Layout', Icon: LayoutGrid, color: 'linear-gradient(135deg,#7c3aed,#6d28d9)' },
];

const SettingsApp: React.FC = () => {
  const { resetLayout, hasLocalOverrides, getPlacement, setPlacement, theme, setTheme, desktopApps, dockApps } = useLayout();
  const { isAdmin, openAddApp, apps } = useHub();
  const catalog = apps.filter(a => a.id > 0);
  const [active, setActive] = useState('overview');
  const [q, setQ] = useState('');
  const [reduceMotion, setReduceMotion] = useState(() => { try { return localStorage.getItem('devhub.reduce-motion') === '1'; } catch { return false; } });

  useEffect(() => {
    document.documentElement.setAttribute('data-reduce-motion', reduceMotion ? '1' : '0');
    try { localStorage.setItem('devhub.reduce-motion', reduceMotion ? '1' : '0'); } catch { /* unavailable */ }
  }, [reduceMotion]);

  const sections = isAdmin
    ? [...SECTIONS, { key: 'manage', label: 'Manage', Icon: Shield, color: 'linear-gradient(135deg,#3b82f6,#1d4ed8)' }]
    : SECTIONS;
  const visible = sections.filter(s => s.label.toLowerCase().includes(q.trim().toLowerCase()));

  return (
    <div className="os-set-wrap">
      <aside className="os-set-side">
        <div className="os-set-search"><Search size={14} /><input value={q} onChange={e => setQ(e.target.value)} placeholder="Search" aria-label="Search settings" /></div>
        {visible.map(s => (
          <button key={s.key} className={`os-set-item ${active === s.key ? 'act' : ''}`} onClick={() => setActive(s.key)}>
            <span className="os-set-tile" style={{ background: s.color }}><s.Icon size={13} color="#fff" /></span>
            {s.label}
          </button>
        ))}
        {visible.length === 0 && <p className="os-sys-hint" style={{ padding: '0 6px' }}>No settings match “{q}”.</p>}
      </aside>

      <div className="os-set-main" key={active}>
        {active === 'overview' && (
          <>
            <div className="os-set-head"><h1>Overview</h1><p>Your desktop at a glance.</p></div>
            <Group>
              <Row label="Desktop layout" help="One click to place every app.">
                <div className="os-set-ladder">
                  {([['dock', 'Minimal'], ['desktop', 'Balanced'], ['both', 'Everything']] as const).map(([val, lbl]) => (
                    <button key={val} className="os-set-seg" onClick={() => catalog.forEach(a => setPlacement(a, val))}>{lbl}</button>
                  ))}
                </div>
              </Row>
            </Group>
            <Group>
              <button className="os-set-jump" onClick={() => setActive('appearance')}>
                <span>Appearance</span><small>{theme === 'dark' ? 'Dark' : theme === 'light' ? 'Light' : 'Auto'}{reduceMotion ? ' · Reduced motion' : ''}</small><ChevronRight size={15} />
              </button>
              <button className="os-set-jump" onClick={() => setActive('apps')}>
                <span>Apps &amp; Layout</span><small>{desktopApps.filter(a => a.id > 0).length} on desktop · {dockApps.filter(a => a.id > 0).length} in dock</small><ChevronRight size={15} />
              </button>
              {isAdmin && (
                <button className="os-set-jump" onClick={() => setActive('manage')}>
                  <span>Manage</span><small>Admin tools</small><ChevronRight size={15} />
                </button>
              )}
            </Group>
          </>
        )}

        {active === 'appearance' && (
          <>
            <div className="os-set-head"><h1>Appearance</h1><p>Theme and how the desktop looks.</p></div>
            <Group>
              <Row label="Theme" help="Dark, light, or Auto — Auto follows your system appearance.">
                <div className="os-place-seg" role="radiogroup" aria-label="Theme">
                  {(['auto', 'dark', 'light'] as const).map(t => (
                    <button key={t} role="radio" aria-checked={theme === t} className={`os-place-opt ${theme === t ? 'on' : ''}`} onClick={() => setTheme(t)}>{t === 'dark' ? 'Dark' : t === 'light' ? 'Light' : 'Auto'}</button>
                  ))}
                </div>
              </Row>
              <Row label="Reduce motion" help="Minimize animations across the desktop.">
                <Toggle checked={reduceMotion} onChange={setReduceMotion} label="Reduce motion" />
              </Row>
            </Group>
            <p className="os-set-note">Your theme is remembered on this device instantly, and follows you across devices when you're signed in.</p>
          </>
        )}

        {active === 'apps' && (
          <>
            <div className="os-set-head"><h1>Apps &amp; Layout</h1><p>Where each app appears. Drag an icon between desktop and dock, or right-click any app.{isAdmin && ' As an admin, your choices set the shared default for everyone.'}</p></div>
            <div className="os-place-list">
              {catalog.map(app => {
                const current = getPlacement(app);
                return (
                  <div key={app.id} className="os-place-row">
                    <span className="os-place-icon" style={{ background: tintFor(app) }}><AppGlyph app={app} size={18} /></span>
                    <span className="os-place-name">{app.name}</span>
                    <div className="os-place-seg" role="radiogroup" aria-label={`Placement for ${app.name}`}>
                      {PLACEMENTS.map(p => (
                        <button key={p.value} className={`os-place-opt ${current === p.value ? 'on' : ''}`} role="radio" aria-checked={current === p.value} onClick={() => setPlacement(app, p.value)}>{p.label}</button>
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
            <p className="os-set-note">Apps marked <em>embeddable</em> open inside a window; single-page apps frame their real URL directly. Set this per app in the Edit dialog (right-click → Rename / Edit).</p>
          </>
        )}

        {active === 'manage' && isAdmin && (
          <>
            <div className="os-set-head"><h1>Manage</h1><p>Administrator tools.</p></div>
            <div className="os-sys-row">
              <button className="btn btn-primary" onClick={openAddApp}><Plus size={15} /> Add application</button>
              <a className="btn btn-ghost" href="/admin"><Shield size={15} /> Admin dashboard</a>
            </div>
          </>
        )}
      </div>
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
