import React from 'react';
import type { WidgetData, WidgetId } from '../types';

// Order the rail renders enabled widgets in, and the order shown in the
// customize checklist.
export const WIDGET_ORDER: WidgetId[] = [
  'system', 'health', 'activity', 'errors', 'recent',
];

export const WIDGET_LABEL: Record<WidgetId, string> = {
  system: 'System',
  health: 'App health',
  apps: 'Applications',
  activity: 'API activity',
  errors: 'Errors today',
  recent: 'Recent activity',
};

const ago = (iso: string | null): string => {
  if (!iso) return '';
  const t = new Date(/[Z+]/.test(iso) ? iso : iso + 'Z').getTime();
  const s = Math.max(0, Math.floor((Date.now() - t) / 1000));
  if (s < 60) return `${s}s ago`;
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  return `${Math.floor(s / 86400)}d ago`;
};

const statusColor = (s: number) => (s >= 500 ? 'var(--error)' : s >= 400 ? 'var(--warning)' : 'var(--success)');

const Sparkline: React.FC<{ data: number[] }> = ({ data }) => {
  const w = 248, h = 38;
  const max = Math.max(1, ...data);
  const n = Math.max(2, data.length);
  const line = data.map((v, i) => `${((i / (n - 1)) * w).toFixed(1)},${(h - (v / max) * (h - 4) - 2).toFixed(1)}`).join(' ');
  return (
    <svg className="os-pw-spark" viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none" aria-hidden="true">
      <defs>
        <linearGradient id="os-pw-spark-grad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="var(--primary-light)" stopOpacity="0.45" />
          <stop offset="100%" stopColor="var(--primary-light)" stopOpacity="0" />
        </linearGradient>
      </defs>
      <polygon points={`0,${h} ${line} ${w},${h}`} fill="url(#os-pw-spark-grad)" />
      <polyline points={line} fill="none" stroke="var(--primary-light)" strokeWidth="1.6" strokeLinejoin="round" strokeLinecap="round" />
    </svg>
  );
};

const dim = (msg = 'Loading…') => <div className="os-pw-dim">{msg}</div>;

const fmtUptime = (s: number): string => {
  const d = Math.floor(s / 86400), h = Math.floor((s % 86400) / 3600), m = Math.floor((s % 3600) / 60);
  if (d) return `${d}d ${h}h`;
  if (h) return `${h}h ${m}m`;
  if (m) return `${m}m`;
  return `${Math.floor(s)}s`;
};

const Meter: React.FC<{ label: string; pct: number }> = ({ label, pct }) => {
  const p = Math.max(0, Math.min(100, Math.round(pct)));
  const color = p >= 90 ? 'var(--error)' : p >= 75 ? 'var(--warning)' : 'var(--success)';
  return (
    <div className="os-pw-meter">
      <span className="l">{label}</span>
      <span className="b"><i style={{ width: `${Math.max(2, p)}%`, background: color }} /></span>
      <span className="v">{p}%</span>
    </div>
  );
};

interface WidgetDef {
  label: string;
  open?: string;   // system app key / 'launchpad' to open when the card is clicked
  render: (d: WidgetData | null, onOpen: (key: string) => void) => React.ReactNode;
}

export const WIDGETS: Record<WidgetId, WidgetDef> = {
  apps: {
    label: WIDGET_LABEL.apps,
    open: 'launchpad',
    render: (d) => !d ? dim() : (
      <>
        <div className="os-pw-h">Applications</div>
        <div className="os-pw-chips">
          <span className="os-pw-chip"><b>{d.apps.total}</b>Total</span>
          <span className="os-pw-chip"><b>{d.apps.live}</b>Live</span>
          <span className="os-pw-chip"><b>{d.apps.embeddable}</b>In‑window</span>
        </div>
      </>
    ),
  },
  activity: {
    label: WIDGET_LABEL.activity,
    open: 'logs',
    render: (d) => !d ? dim() : (
      <>
        <div className="os-pw-h">API activity</div>
        <div className="os-pw-big">{d.activity.rate}<small>/min</small></div>
        <Sparkline data={d.activity.spark} />
      </>
    ),
  },
  errors: {
    label: WIDGET_LABEL.errors,
    open: 'logs',
    render: (d) => !d ? dim() : (
      <>
        <div className="os-pw-h">Errors today</div>
        <div className="os-pw-big" style={{ color: d.errors.err ? 'var(--error)' : 'var(--success)' }}>{d.errors.pct}<small>%</small></div>
        <div className="os-pw-sub">{d.errors.err} of {d.errors.total} requests</div>
      </>
    ),
  },
  recent: {
    label: WIDGET_LABEL.recent,
    open: 'logs',
    render: (d) => !d ? dim() : (
      <>
        <div className="os-pw-h">Recent activity</div>
        <div className="os-pw-rows">
          {d.recent.length === 0 && <div className="os-pw-dim">No activity yet.</div>}
          {d.recent.slice(0, 5).map((r, i) => (
            <div key={i} className="os-pw-row" title={`${r.method} ${r.path} · ${ago(r.at)}`}>
              <span className="m">{r.method}</span>
              <span className="p">{r.path}</span>
              <span className="s" style={{ color: statusColor(r.status) }}>{r.status}</span>
            </div>
          ))}
        </div>
      </>
    ),
  },
  health: {
    label: WIDGET_LABEL.health,
    open: 'launchpad',
    render: (d) => {
      const h = d?.health;
      if (!h) return dim();
      if (h.total === 0) return (
        <>
          <div className="os-pw-h">App health</div>
          <div className="os-pw-dim">No apps to check.</div>
        </>
      );
      return (
        <>
          <div className="os-pw-h">App health</div>
          <div className="os-pw-big" style={{ color: h.down ? 'var(--error)' : 'var(--success)' }}>
            {h.up}<small>/ {h.total} up</small>
          </div>
          <div className="os-pw-health">
            {h.items.map(it => (
              <span key={it.id} className={`os-pw-hdot ${it.state}`} title={`${it.name} — ${it.state}`} />
            ))}
          </div>
        </>
      );
    },
  },
  system: {
    label: WIDGET_LABEL.system,
    open: 'logs',
    render: (d) => {
      const s = d?.system;
      if (!s) return dim();
      const load1 = s.load ? s.load[0] : null;
      const cpuPct = (load1 != null && s.cpus) ? (100 * load1) / s.cpus : null;
      return (
        <>
          <div className="os-pw-h">System</div>
          <div className="os-pw-big">{fmtUptime(s.uptime_seconds)}<small>uptime</small></div>
          <div className="os-pw-meters">
            {cpuPct != null && <Meter label="CPU" pct={cpuPct} />}
            {s.mem?.used_pct != null && <Meter label="MEM" pct={s.mem.used_pct} />}
            {s.disk?.used_pct != null && <Meter label="DISK" pct={s.disk.used_pct} />}
            {cpuPct == null && !s.mem && !s.disk && <div className="os-pw-dim">No stats available.</div>}
          </div>
        </>
      );
    },
  },
};
