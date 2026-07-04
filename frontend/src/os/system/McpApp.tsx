import React, { useMemo, useState } from 'react';
import { Plug, Wifi, FileText, Wrench, Shield, Copy, Check, KeyRound, Zap, AlertTriangle } from 'lucide-react';
import api from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { useWindows } from '../WindowManager';
import { getSystemApp } from '../systemApps';

// ------------------------------------------------------------------ tools ----
// Mirrors backend/routers/mcp_server.py TOOLS (name / description / scope).
type Scope = 'read' | 'admin';
interface ToolDef { name: string; desc: string; scope: Scope; }
const TOOLS: ToolDef[] = [
  { name: 'list_apps', desc: 'List every registered app with its public fields.', scope: 'read' },
  { name: 'get_app', desc: 'Get one app by id or name.', scope: 'read' },
  { name: 'probe_app', desc: "Server-side reachability + framing probe of an app's URL.", scope: 'read' },
  { name: 'app_status', desc: 'Live Dokploy deploy state for a mapped app.', scope: 'read' },
  { name: 'create_app', desc: 'Register a new app on the hub.', scope: 'admin' },
  { name: 'update_app', desc: 'Update fields on an existing app.', scope: 'admin' },
  { name: 'delete_app', desc: 'Delete an app from the hub.', scope: 'admin' },
  { name: 'power_action', desc: 'Start / stop / restart / redeploy the Dokploy service mapped to an app.', scope: 'admin' },
];

// The suggested agent system prompt (dev-hub specific).
const SYSTEM_PROMPT = `You are the dev-hub agent. You manage the dev-hub app catalog and its Dokploy deployments through MCP tools — nothing else. You have eight tools: list_apps, get_app, probe_app, app_status (read-only), and create_app, update_app, delete_app, power_action (admin, mutating).

HOW TO WORK
1. Always resolve an app before acting on it. If the user names an app, call get_app (it accepts an id or a case-insensitive name); if the name is unclear or missing, call list_apps once and pick or ask. Never guess an app id, name, or URL.
2. The read tools are safe — use them freely to answer questions (what apps exist, is an app reachable/embeddable via probe_app, is it running via app_status).
3. create_app, update_app, delete_app, and power_action MUTATE real state and require an admin-scope key. Before any stop, restart, redeploy, or delete, state exactly which app and action you will run and wait for the user's explicit yes. A read-scope key can only call the read tools; if a mutating call is refused, say so and stop — do not retry.
4. Report tool results verbatim: the app names, urls, deploy states, and probe outcomes the tools return. Never fabricate an app, url, status, or result, and never claim a change succeeded unless the tool said so.
5. The hub refuses to power itself off — if power_action targets the hub's own service it will be rejected; report that plainly rather than working around it.

Be concise. Do one clear thing per turn, confirm before mutating, and prefer a read tool to a guess.`;

// ------------------------------------------------------------------ config ---
type ClientKey = 'claude' | 'cursor' | 'vscode' | 'n8n';
const CLIENTS: { key: ClientKey; label: string }[] = [
  { key: 'claude', label: 'Claude Desktop' },
  { key: 'cursor', label: 'Cursor' },
  { key: 'vscode', label: 'VS Code' },
  { key: 'n8n', label: 'n8n' },
];

interface CfgField { label: string; value: string; mono?: boolean; }
interface CfgBlock { fields: CfgField[]; hint: React.ReactNode; }

function buildConfig(client: ClientKey, url: string, key: string): CfgBlock {
  const auth = `Bearer ${key}`;
  switch (client) {
    case 'claude':
      return {
        fields: [{
          label: 'claude_desktop_config.json',
          value: JSON.stringify({ mcpServers: { devhub: {
            command: 'npx', args: ['mcp-remote', url, '--header', `Authorization: ${auth}`],
          } } }, null, 2),
        }],
        hint: <>Claude Desktop speaks stdio, so it bridges to our HTTP server via <code>mcp-remote</code>. Paste this into <code>claude_desktop_config.json</code>, then restart Claude Desktop.</>,
      };
    case 'cursor':
      return {
        fields: [{
          label: '~/.cursor/mcp.json',
          value: JSON.stringify({ mcpServers: { devhub: {
            url, headers: { Authorization: auth },
          } } }, null, 2),
        }],
        hint: <>Paste this into <code>~/.cursor/mcp.json</code> (or the project&apos;s <code>.cursor/mcp.json</code>).</>,
      };
    case 'vscode':
      return {
        fields: [{
          label: '.vscode/mcp.json',
          value: JSON.stringify({ servers: { devhub: {
            type: 'http', url, headers: { Authorization: auth },
          } } }, null, 2),
        }],
        hint: <>Paste this into <code>.vscode/mcp.json</code> (GitHub Copilot Chat → MCP).</>,
      };
    case 'n8n':
      return {
        fields: [
          { label: 'HTTP Streamable URL', value: url, mono: true },
          { label: 'Bearer token', value: key, mono: true },
        ],
        hint: <>Use n8n&apos;s built-in <b>MCP Client Tool</b> node: <b>Server Transport = HTTP Streamable</b>, the URL above, <b>Authentication = Bearer Auth</b>, and paste the token above as the credential. Set <b>Tools to Include = All</b> so the agent gets every dev-hub tool.</>,
      };
  }
}

// --------------------------------------------------------------- copy button -
const CopyButton: React.FC<{ text: string; label?: string; className?: string }> = ({ text, label = 'Copy', className }) => {
  const [done, setDone] = useState(false);
  const copy = () => {
    navigator.clipboard?.writeText(text);
    setDone(true);
    window.setTimeout(() => setDone(false), 1400);
  };
  return (
    <button type="button" className={`os-mcp-copy ${done ? 'copied' : ''} ${className || ''}`} onClick={copy}>
      {done ? <><Check size={13} /> Copied</> : <><Copy size={13} /> {label}</>}
    </button>
  );
};

// ------------------------------------------------------------------- app ------
const PLACEHOLDER = '<your-devhub-key>';

const McpApp: React.FC = () => {
  const { user } = useAuth();
  const { openApp } = useWindows();
  const url = `${location.origin}/api/mcp`;

  const [tok, setTok] = useState('');
  const [client, setClient] = useState<ClientKey>('claude');
  const [wantAdmin, setWantAdmin] = useState(false);
  const [creating, setCreating] = useState(false);
  const [createMsg, setCreateMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [showPrompt, setShowPrompt] = useState(false);
  const [toolsOpen, setToolsOpen] = useState<Record<string, boolean>>({});

  const keyForCfg = tok.trim() || PLACEHOLDER;
  const cfg = useMemo(() => buildConfig(client, url, keyForCfg), [client, url, keyForCfg]);

  const openApiKeys = () => { const a = getSystemApp('apikeys'); if (a) openApp(a); };

  const createKey = async () => {
    setCreating(true);
    setCreateMsg(null);
    const scopes = wantAdmin && user?.is_admin ? ['read', 'admin'] : ['read'];
    try {
      const r = await api.post('keys/', { name: 'mcp-agent', scopes });
      const key = r.data?.key || '';
      if (!key) throw new Error('no key returned');
      setTok(key);
      setCreateMsg({ ok: true, text: 'Key created and dropped into the config below — it is shown once, so copy the config now.' });
    } catch (err: any) {
      setCreateMsg({ ok: false, text: err?.response?.data?.detail || 'Could not create a key.' });
    } finally {
      setCreating(false);
    }
  };

  const allOpen = TOOLS.every(t => toolsOpen[t.name]);
  const toggleAll = () => {
    const next = !allOpen;
    setToolsOpen(Object.fromEntries(TOOLS.map(t => [t.name, next])));
  };

  return (
    <div className="os-mcp">
      <header className="os-mcp-hero">
        <span className="os-mcp-hero-chip"><Plug size={20} /></span>
        <div>
          <h1>MCP for agents</h1>
          <p>Connect an LLM agent — Claude Desktop, Cursor, VS Code, or n8n — to the dev-hub over the Model Context
            Protocol. The agent gets typed tools to read the app catalog and (with an admin key) manage apps and their
            Dokploy deployments.</p>
        </div>
      </header>

      {/* Connect a client -------------------------------------------------- */}
      <section className="os-mcp-card">
        <div className="os-mcp-cardhead"><span className="os-mcp-ic"><Wifi size={15} /></span><h3>Connect a client</h3></div>

        <div className="os-mcp-field">
          <label className="os-mcp-lab">Endpoint</label>
          <div className="os-mcp-endpoint">
            <code>{url}</code>
            <CopyButton text={url} label="Copy" />
          </div>
        </div>

        <div className="os-mcp-field">
          <label className="os-mcp-lab">API key</label>
          <div className="os-mcp-tokrow">
            <input
              className="os-mcp-input"
              value={tok}
              onChange={e => setTok(e.target.value)}
              placeholder="paste a devhub_ key, or create one →"
              autoComplete="off"
              spellCheck={false}
            />
            <button className="btn btn-primary os-mcp-btn" type="button" onClick={createKey} disabled={creating}>
              <Zap size={14} /> {creating ? 'Creating…' : 'Create key'}
            </button>
            <button className="btn btn-ghost os-mcp-btn" type="button" onClick={openApiKeys}>
              <KeyRound size={14} /> Manage keys
            </button>
          </div>
          <div className="os-mcp-scoperow">
            <span className="os-mcp-scopehint">New key scope: <b>read</b> (calls the read tools).</span>
            {user?.is_admin && (
              <label className="os-mcp-adminopt">
                <input type="checkbox" checked={wantAdmin} onChange={e => setWantAdmin(e.target.checked)} />
                also grant <b>admin</b> — unlocks create / update / delete / power tools
              </label>
            )}
          </div>
          {createMsg && (
            <div className={`os-mcp-msg ${createMsg.ok ? 'ok' : 'err'}`}>
              {createMsg.ok ? <Check size={13} /> : <AlertTriangle size={13} />} {createMsg.text}
            </div>
          )}
        </div>

        <div className="os-mcp-tabs" role="tablist" aria-label="MCP client">
          {CLIENTS.map(c => (
            <button
              key={c.key}
              role="tab"
              aria-selected={client === c.key}
              className={`os-mcp-tab ${client === c.key ? 'on' : ''}`}
              onClick={() => setClient(c.key)}
            >{c.label}</button>
          ))}
        </div>

        {cfg.fields.map(f => (
          <div className="os-mcp-field" key={f.label}>
            <label className="os-mcp-lab">{f.label}</label>
            <div className="os-mcp-code">
              <CopyButton text={f.value} className="os-mcp-code-copy" />
              <pre className={f.mono ? 'one' : ''}>{f.value}</pre>
            </div>
          </div>
        ))}
        <p className="os-mcp-note">{cfg.hint}</p>
        {tok.trim() === '' && (
          <p className="os-mcp-note dim">The snippet shows <code>{PLACEHOLDER}</code> until you paste or create a key.</p>
        )}
      </section>

      {/* Suggested system prompt ------------------------------------------ */}
      <section className="os-mcp-card">
        <div className="os-mcp-cardhead"><span className="os-mcp-ic"><FileText size={15} /></span><h3>Suggested agent system prompt</h3></div>
        <p className="os-mcp-note">Paste this into your agent&apos;s <b>system message</b>. It teaches the order —
          resolve the app first, read freely, confirm before mutating — so a smaller model doesn&apos;t guess or loop.</p>
        <div className="os-mcp-actions">
          <button type="button" className="os-mcp-copy" onClick={() => setShowPrompt(s => !s)} aria-expanded={showPrompt}>
            {showPrompt ? 'Hide prompt' : 'Show prompt'}
          </button>
          <CopyButton text={SYSTEM_PROMPT} />
        </div>
        {showPrompt && (
          <div className="os-mcp-code" style={{ marginTop: 10 }}>
            <pre className="wrap">{SYSTEM_PROMPT}</pre>
          </div>
        )}
      </section>

      {/* Tools ------------------------------------------------------------- */}
      <section className="os-mcp-card">
        <div className="os-mcp-cardhead">
          <span className="os-mcp-ic"><Wrench size={15} /></span>
          <h3>Tools the agent gets ({TOOLS.length})</h3>
          <button type="button" className="os-mcp-expand" onClick={toggleAll}>{allOpen ? 'Collapse all' : 'Expand all'}</button>
        </div>
        <p className="os-mcp-note">Four read tools answer questions safely; four admin tools mutate real state and need
          an admin-scope key.</p>
        <div className="os-mcp-tools">
          {TOOLS.map(t => (
            <details key={t.name} className="os-mcp-tool" open={!!toolsOpen[t.name]}
              onToggle={e => setToolsOpen(s => ({ ...s, [t.name]: (e.target as HTMLDetailsElement).open }))}>
              <summary>
                <code>{t.name}</code>
                <span className={`os-mcp-chip s-${t.scope}`}>{t.scope}</span>
              </summary>
              <p>{t.desc}</p>
            </details>
          ))}
        </div>
      </section>

      {/* Safety ------------------------------------------------------------ */}
      <section className="os-mcp-card">
        <div className="os-mcp-cardhead"><span className="os-mcp-ic"><Shield size={15} /></span><h3>Safety</h3></div>
        <p className="os-mcp-note">
          Every call needs <code>Authorization: Bearer &lt;key&gt;</code> — a dev-hub API key. Keys are per-user,
          scoped, SHA-256-hashed at rest, and revocable anytime in the <b>API Keys</b> app with no redeploy. A missing
          or invalid key returns a <b>401</b>. A <b>read</b>-scope key can call the read tools (list_apps, get_app,
          probe_app, app_status); the mutating tools — <b>create_app, update_app, delete_app, power_action</b> — require
          an <b>admin</b>-scope key. The hub also refuses to power off its own service.
        </p>
      </section>
    </div>
  );
};

export default McpApp;
