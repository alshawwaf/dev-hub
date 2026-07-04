import React, { useState, useEffect, useCallback } from 'react';
import { RotateCcw, Shield, Plus, Trash2, Search, X, Palette, LayoutGrid, LayoutDashboard, ChevronRight, UserRound, PlugZap, Check, AlertTriangle, LogOut } from 'lucide-react';
import type { SystemKey, Placement } from '../types';
import { useLayout } from '../LayoutContext';
import { useHub } from '../HubContext';
import { useWindows } from '../WindowManager';
import { useAuth } from '../../context/AuthContext';
import { getSystemApp } from '../systemApps';
import api from '../../services/api';
import GuidePage from '../../pages/GuidePage';
import ApiReference from '../../pages/ApiReference';
import AdminApp from './AdminApp';
import ApiKeysApp from './ApiKeysApp';
import McpApp from './McpApp';
import AddAppForm from './AddAppForm';
import EditAppForm from './EditAppForm';
import AppGlyph from '../AppGlyph';

// ---- Settings deep link --------------------------------------------------------
// Other surfaces (the menu-bar user menu) open Settings at a specific section via
// requestSettingsSection: it works with the window closed (module var consumed on
// mount) AND already open (CustomEvent picked up while mounted).
const SETTINGS_SECTION_EVENT = 'devhub:settings-section';
let pendingSettingsSection: string | null = null;
export function requestSettingsSection(key: string) {
  pendingSettingsSection = key;
  window.dispatchEvent(new CustomEvent(SETTINGS_SECTION_EVENT, { detail: key }));
}

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
  { key: 'account', label: 'Account', Icon: UserRound, color: 'linear-gradient(135deg,#10b981,#047857)' },
];
const ADMIN_SECTIONS = [
  { key: 'integrations', label: 'Integrations', Icon: PlugZap, color: 'linear-gradient(135deg,#f59e0b,#d97706)' },
  { key: 'manage', label: 'Manage', Icon: Shield, color: 'linear-gradient(135deg,#3b82f6,#1d4ed8)' },
];

// Account (all users): identity + change-password + sign out.
const AccountSection: React.FC = () => {
  const { user, logout } = useAuth();
  const [pw, setPw] = useState({ current: '', next: '', confirm: '' });
  const [pwMsg, setPwMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [pwBusy, setPwBusy] = useState(false);

  const changePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (pw.next !== pw.confirm) { setPwMsg({ ok: false, text: 'New passwords do not match.' }); return; }
    setPwBusy(true);
    setPwMsg(null);
    try {
      await api.post('auth/change-password', { current_password: pw.current, new_password: pw.next });
      setPw({ current: '', next: '', confirm: '' });
      setPwMsg({ ok: true, text: 'Password updated.' });
    } catch (err: any) {
      setPwMsg({ ok: false, text: err?.response?.data?.detail || 'Could not change the password.' });
    } finally {
      setPwBusy(false);
    }
  };

  const memberSince = user?.created_at
    ? new Date(/[Z+]/.test(user.created_at) ? user.created_at : user.created_at + 'Z').toLocaleDateString([], { month: 'long', day: 'numeric', year: 'numeric' })
    : null;

  return (
    <>
      <div className="os-set-head"><h1>Account</h1><p>Your sign-in details and security.</p></div>
      <Group>
        <Row label="Email"><span>{user?.email}</span></Row>
        <Row label="Role"><span>{user?.is_admin ? 'Administrator' : 'Developer'}</span></Row>
        {memberSince && <Row label="Member since"><span>{memberSince}</span></Row>}
      </Group>
      <Group>
        <form className="os-set-formwrap" onSubmit={changePassword}>
          <h3>Change password</h3>
          <input className="os-set-input" type="password" value={pw.current} onChange={e => setPw(p => ({ ...p, current: e.target.value }))} placeholder="Current password" autoComplete="current-password" required />
          <input className="os-set-input" type="password" value={pw.next} onChange={e => setPw(p => ({ ...p, next: e.target.value }))} placeholder="New password" autoComplete="new-password" required />
          <input className="os-set-input" type="password" value={pw.confirm} onChange={e => setPw(p => ({ ...p, confirm: e.target.value }))} placeholder="Confirm new password" autoComplete="new-password" required />
          <div className="os-set-form-actions">
            <button className="btn btn-primary" type="submit" disabled={pwBusy}>{pwBusy ? 'Updating…' : 'Update password'}</button>
            {pwMsg && (
              <span className={`os-set-status ${pwMsg.ok ? 'ok' : 'err'}`}>
                {pwMsg.ok ? <Check size={14} /> : <AlertTriangle size={14} />} {pwMsg.text}
              </span>
            )}
          </div>
        </form>
      </Group>
      <Group>
        <div className="os-set-formwrap">
          <button className="btn btn-ghost os-set-signout" onClick={logout}><LogOut size={15} /> Sign out</button>
        </div>
      </Group>
    </>
  );
};

// Integrations (admin): the Dokploy connection behind the lifecycle controls.
const IntegrationsSection: React.FC = () => {
  const [info, setInfo] = useState<{ configured: boolean; url?: string; ok?: boolean; error?: string } | null>(null);
  const [url, setUrl] = useState('');
  const [token, setToken] = useState('');
  const [busy, setBusy] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    let cancelled = false;
    api.get('infra/dokploy')
      .then(r => { if (!cancelled) { setInfo(r.data); setUrl(r.data?.url || ''); } })
      .catch(() => { if (!cancelled) setInfo({ configured: false }); });
    return () => { cancelled = true; };
  }, []);

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setSaved(false);
    try {
      // Blank token = keep the stored one (it's never sent back to the browser).
      const payload: { url: string; token?: string } = { url: url.trim() };
      if (token) payload.token = token;
      const r = await api.put('infra/dokploy', payload);
      setInfo(r.data);
      setToken('');
      setSaved(true);
    } catch (err: any) {
      setInfo(i => ({ configured: i?.configured ?? false, url, ok: false, error: err?.response?.data?.detail || 'Could not save the Dokploy settings.' }));
    } finally {
      setBusy(false);
    }
  };

  const status = !info
    ? <span className="os-set-status">Checking…</span>
    : info.configured
      ? (info.ok === false
        ? <span className="os-set-status err"><AlertTriangle size={14} /> {info.error || 'Connection failed'}</span>
        : <span className="os-set-status ok"><Check size={14} /> Connected{saved ? ' — saved' : ''}</span>)
      : <span className="os-set-status">Not configured</span>;

  return (
    <>
      <div className="os-set-head"><h1>Integrations</h1><p>Connect the hub to the platforms it manages.</p></div>
      <Group>
        <form className="os-set-formwrap" onSubmit={save}>
          <h3>Dokploy</h3>
          <p className="os-set-formnote">Powers the lifecycle controls (start / stop / restart / redeploy) in the Admin window. The token is stored server-side and never returned to the browser.</p>
          <input className="os-set-input" type="url" value={url} onChange={e => setUrl(e.target.value)} placeholder="https://dokploy.example.com" aria-label="Dokploy URL" required />
          <input className="os-set-input" type="password" value={token} onChange={e => setToken(e.target.value)} placeholder={info?.configured ? '••••••••  (unchanged)' : 'API token'} aria-label="Dokploy API token" autoComplete="off" />
          <div className="os-set-form-actions">
            <button className="btn btn-primary" type="submit" disabled={busy || !url.trim()}>{busy ? 'Testing…' : 'Save & Test'}</button>
            {status}
          </div>
        </form>
      </Group>
    </>
  );
};

const SettingsApp: React.FC = () => {
  const { resetLayout, hasLocalOverrides, getPlacement, setPlacement, theme, setTheme, desktopApps, dockApps, iconTileBg } = useLayout();
  const { isAdmin, openAddApp, apps } = useHub();
  const { openApp } = useWindows();
  const catalog = apps.filter(a => a.id > 0);
  const [active, setActive] = useState('overview');
  const [q, setQ] = useState('');
  const [reduceMotion, setReduceMotion] = useState(() => { try { return localStorage.getItem('devhub.reduce-motion') === '1'; } catch { return false; } });

  useEffect(() => {
    document.documentElement.setAttribute('data-reduce-motion', reduceMotion ? '1' : '0');
    try { localStorage.setItem('devhub.reduce-motion', reduceMotion ? '1' : '0'); } catch { /* unavailable */ }
  }, [reduceMotion]);

  const sections = isAdmin ? [...SECTIONS, ...ADMIN_SECTIONS] : SECTIONS;
  const visible = sections.filter(s => s.label.toLowerCase().includes(q.trim().toLowerCase()));

  // Deep-link consumption (see requestSettingsSection above): a pending request is
  // honored on mount; further requests arrive as events while the window is open.
  // Keys the user can't see (admin sections for non-admins) are ignored.
  useEffect(() => {
    const consume = (key: string | null) => {
      if (key && sections.some(s => s.key === key)) setActive(key);
      pendingSettingsSection = null;
    };
    consume(pendingSettingsSection);
    const onEvent = (e: Event) => consume((e as CustomEvent<string>).detail);
    window.addEventListener(SETTINGS_SECTION_EVENT, onEvent);
    return () => window.removeEventListener(SETTINGS_SECTION_EVENT, onEvent);
    // sections is stable per mount (isAdmin doesn't change mid-session)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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
                    <span className="os-place-icon" style={{ background: iconTileBg(app) }}><AppGlyph app={app} size={18} /></span>
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

        {active === 'account' && <AccountSection />}

        {active === 'integrations' && isAdmin && <IntegrationsSection />}

        {active === 'manage' && isAdmin && (
          <>
            <div className="os-set-head"><h1>Manage</h1><p>Administrator tools.</p></div>
            <div className="os-sys-row">
              <button className="btn btn-primary" onClick={openAddApp}><Plus size={15} /> Add application</button>
              <button className="btn btn-ghost" onClick={() => { const a = getSystemApp('admin'); if (a) openApp(a); }}>
                <Shield size={15} /> Admin dashboard
              </button>
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

const SystemContent: React.FC<{ appKey: SystemKey }> = ({ appKey }) => {
  switch (appKey) {
    case 'settings': return <SettingsApp />;
    case 'logs': return <ActivityFeed />;
    case 'guide': return <div className="os-sys-guide"><GuidePage /></div>;
    case 'api': return <ApiReference />;
    case 'admin': return <AdminApp />;
    case 'apikeys': return <ApiKeysApp />;
    case 'mcp': return <McpApp />;
    case 'addapp': return <AddAppForm />;
    case 'editapp': return <EditAppForm />;
    default: return null;
  }
};

export default SystemContent;
