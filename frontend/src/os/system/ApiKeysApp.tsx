import React, { useCallback, useEffect, useState } from 'react';
import { KeyRound, Plus, Copy, Check, AlertTriangle, RefreshCw } from 'lucide-react';
import api from '../../services/api';
import { useHub } from '../HubContext';

interface ApiKey {
  id: number;
  name: string;
  prefix: string;
  scopes: string[];
  created_at: string;
  expires_at: string | null;
  last_used_at: string | null;
  revoked: boolean;
  /** admin listing (?all=1) only */
  owner_email?: string;
}

const SCOPES = ['read', 'write', 'admin'] as const;

const fmtDate = (s: string | null) =>
  s ? new Date(/[Z+]/.test(s) ? s : s + 'Z').toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' }) : '—';

// Programmatic access tokens: list / mint / revoke. The full secret is shown
// exactly once (the POST response) — after that only the prefix survives.
const ApiKeysApp: React.FC = () => {
  const { isAdmin } = useHub();
  const [keys, setKeys] = useState<ApiKey[] | null>(null);
  const [error, setError] = useState('');
  const [showAll, setShowAll] = useState(false);
  // create flow
  const [creating, setCreating] = useState(false);
  const [name, setName] = useState('');
  const [scopes, setScopes] = useState<string[]>(['read']);
  const [expires, setExpires] = useState('');   // days; blank = never
  const [busy, setBusy] = useState(false);
  // one-time reveal + inline revoke confirm
  const [minted, setMinted] = useState<{ name: string; key: string } | null>(null);
  const [copied, setCopied] = useState(false);
  const [armed, setArmed] = useState<number | null>(null);

  const load = useCallback(async () => {
    try {
      const r = await api.get('keys/', { params: showAll ? { all: 1 } : undefined });
      setKeys(r.data);
      setError('');
    } catch {
      setError('Could not load your API keys.');
    }
  }, [showAll]);
  useEffect(() => { load(); }, [load]);

  const toggleScope = (s: string) =>
    setScopes(prev => (prev.includes(s) ? prev.filter(x => x !== s) : [...prev, s]));

  const create = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      const r = await api.post('keys/', { name: name.trim(), scopes, expires_days: expires ? Number(expires) : null });
      setMinted({ name: name.trim(), key: r.data?.key || '' });
      setCreating(false);
      setName('');
      setScopes(['read']);
      setExpires('');
      setError('');
      load();
    } catch (err: any) {
      setError(err?.response?.data?.detail || 'Could not create the key.');
    } finally {
      setBusy(false);
    }
  };

  const revoke = async (id: number) => {
    setArmed(null);
    try { await api.delete(`keys/${id}`); load(); } catch { setError('Could not revoke the key.'); }
  };

  const copyKey = () => {
    if (!minted) return;
    navigator.clipboard?.writeText(minted.key);
    setCopied(true);
    setTimeout(() => setCopied(false), 1600);
  };

  return (
    <div className="os-keys">
      <div className="os-keys-head">
        <KeyRound size={16} />
        <h2>API Keys</h2>
        {isAdmin && (
          <label className="os-keys-all">
            <input type="checkbox" checked={showAll} onChange={e => setShowAll(e.target.checked)} /> All users&rsquo; keys
          </label>
        )}
        <span className="os-keys-spacer" />
        <button className="btn btn-ghost os-keys-btn" onClick={load} title="Refresh"><RefreshCw size={14} /></button>
        <button className="btn btn-primary os-keys-btn" onClick={() => { setCreating(c => !c); setMinted(null); }}>
          <Plus size={14} /> New key
        </button>
      </div>

      <div className="os-keys-body">
        {minted && (
          <div className="os-keys-reveal">
            <div className="os-keys-reveal-h"><Check size={14} /> &ldquo;{minted.name}&rdquo; created</div>
            <div className="os-keys-secret">
              <code>{minted.key}</code>
              <button className="os-admin-iconbtn" title="Copy key" onClick={copyKey}>
                {copied ? <Check size={14} /> : <Copy size={14} />}
              </button>
            </div>
            <p className="os-keys-warn"><AlertTriangle size={13} /> Copy it now — you won&rsquo;t see this key again.</p>
            <button className="btn btn-ghost os-keys-btn os-keys-done" onClick={() => setMinted(null)}>Done</button>
          </div>
        )}

        {creating && (
          <form className="os-keys-form" onSubmit={create}>
            <div className="os-keys-form-row">
              <input className="os-set-input" value={name} onChange={e => setName(e.target.value)} placeholder="Key name (e.g. n8n agent)" maxLength={60} required autoFocus />
              <input className="os-set-input" type="number" min={1} max={3650} value={expires} onChange={e => setExpires(e.target.value)} placeholder="Expiry (days, blank = never)" />
            </div>
            <div className="os-keys-scopes">
              {SCOPES.filter(s => s !== 'admin' || isAdmin).map(s => (
                <label key={s} className="os-keys-scopelbl">
                  <input type="checkbox" checked={scopes.includes(s)} onChange={() => toggleScope(s)} /> {s}
                </label>
              ))}
            </div>
            <div className="os-keys-form-actions">
              <button className="btn btn-primary os-keys-btn" type="submit" disabled={busy || !name.trim() || scopes.length === 0}>
                {busy ? 'Creating…' : 'Create key'}
              </button>
              <button className="btn btn-ghost os-keys-btn" type="button" onClick={() => setCreating(false)}>Cancel</button>
            </div>
          </form>
        )}

        {error && <div className="os-keys-error"><AlertTriangle size={14} /> {error}</div>}

        {keys && keys.length === 0 && (
          <p className="os-keys-empty">No API keys yet. Create one to call the hub from scripts and agents.</p>
        )}
        {keys?.map(k => (
          <div key={k.id} className={`os-keys-row ${k.revoked ? 'revoked' : ''}`}>
            <div className="os-keys-main">
              <span className="os-keys-name">{k.name}</span>
              <code className="os-keys-prefix">{k.prefix}…</code>
              {k.scopes.map(s => <span key={s} className={`os-keys-scope s-${s}`}>{s}</span>)}
              {k.revoked && <span className="os-keys-scope s-revoked">revoked</span>}
              {showAll && k.owner_email && <span className="os-keys-owner">{k.owner_email}</span>}
            </div>
            <div className="os-keys-meta">
              <span>Created {fmtDate(k.created_at)}</span>
              <span>Last used {fmtDate(k.last_used_at)}</span>
              <span>{k.expires_at ? `Expires ${fmtDate(k.expires_at)}` : 'No expiry'}</span>
            </div>
            {!k.revoked && (
              armed === k.id ? (
                <span className="os-keys-confirm">
                  Revoke &ldquo;{k.name}&rdquo;?
                  <button onClick={() => revoke(k.id)}>Revoke</button>
                  <button onClick={() => setArmed(null)}>Cancel</button>
                </span>
              ) : (
                <button className="os-keys-revoke" onClick={() => setArmed(k.id)}>Revoke</button>
              )
            )}
          </div>
        ))}

        <p className="os-keys-note">
          Keys work on the REST API and the MCP server at <code>/api/mcp</code> — send{' '}
          <code>Authorization: Bearer &lt;key&gt;</code>.
        </p>
      </div>
    </div>
  );
};

export default ApiKeysApp;
