import React, { useEffect, useRef, useState } from 'react';
import {
  BookOpen, Cloud, LayoutGrid, Rocket, ShieldCheck, Terminal, Copy, Check, ExternalLink,
  AppWindow, FolderClosed, Gauge, SunMoon, Command, Info, Lightbulb, AlertTriangle,
} from 'lucide-react';

const REPO = 'https://github.com/alshawwaf/ubuntu-dokploy-ai';

// ---- small building blocks ---------------------------------------------------

const Code: React.FC<{ children: string }> = ({ children }) => {
  const [copied, setCopied] = useState(false);
  return (
    <div className="os-guide-code">
      <pre><code>{children}</code></pre>
      <button className="cp" onClick={() => { navigator.clipboard?.writeText(children); setCopied(true); setTimeout(() => setCopied(false), 1600); }}>
        {copied ? <Check size={13} /> : <Copy size={13} />}{copied ? 'Copied' : 'Copy'}
      </button>
    </div>
  );
};

const Kbd: React.FC<{ children: React.ReactNode }> = ({ children }) => <span className="os-kbd">{children}</span>;

const CALLOUT_ICON = { info: Info, tip: Lightbulb, warn: AlertTriangle };
const Callout: React.FC<{ kind?: 'info' | 'tip' | 'warn'; children: React.ReactNode }> = ({ kind = 'info', children }) => {
  const Icon = CALLOUT_ICON[kind];
  return <div className={`os-callout ${kind}`}><Icon size={17} /><div>{children}</div></div>;
};

const Feature: React.FC<{ icon: React.ReactNode; title: React.ReactNode; children: React.ReactNode }> = ({ icon, title, children }) => (
  <div className="os-guide-feature">
    <div className="fic">{icon}</div>
    <h4>{title}</h4>
    <p>{children}</p>
  </div>
);

// ---- content model -----------------------------------------------------------

const SECTIONS = [
  { id: 'overview', label: 'Overview', icon: LayoutGrid },
  { id: 'desktop', label: 'Using the desktop', icon: AppWindow },
  { id: 'deploy', label: 'Deploying', icon: Rocket },
  { id: 'admin', label: 'Administration', icon: ShieldCheck },
  { id: 'api', label: 'API & integration', icon: Terminal },
] as const;

const GuidePage: React.FC = () => {
  const [active, setActive] = useState<string>('overview');
  const contentRef = useRef<HTMLDivElement>(null);

  // Scroll-spy — highlight the section nearest the top of whatever is scrolling.
  // Container-aware so it works both on the /guide route (window scrolls) and in a
  // desktop window (the .os-window-body scrolls) — measures each section's top
  // relative to the actual scroll container, not the viewport.
  useEffect(() => {
    let el = contentRef.current?.parentElement;
    let container: HTMLElement | null = null;
    while (el) { const oy = getComputedStyle(el).overflowY; if (oy === 'auto' || oy === 'scroll') { container = el; break; } el = el.parentElement; }
    const target: HTMLElement | Window = container || window;
    const compute = () => {
      const cTop = container ? container.getBoundingClientRect().top : 0;
      let cur: string = SECTIONS[0].id;
      for (const s of SECTIONS) {
        const node = document.getElementById(s.id);
        if (node && node.getBoundingClientRect().top - cTop <= 120) cur = s.id;
      }
      setActive(cur);
    };
    let raf = 0;
    const onScroll = () => { cancelAnimationFrame(raf); raf = requestAnimationFrame(compute); };
    compute();
    target.addEventListener('scroll', onScroll, { passive: true });
    return () => { target.removeEventListener('scroll', onScroll); cancelAnimationFrame(raf); };
  }, []);

  const jump = (id: string) => (e: React.MouseEvent) => {
    e.preventDefault();
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    setActive(id);
  };

  return (
    <div className="os-guide">
      <div className="os-guide-hero">
        <span className="os-guide-eyebrow"><BookOpen size={14} /> Documentation</span>
        <h1>AI Dev Hub <span className="text-gradient">Handbook</span></h1>
        <p>Everything about the hub — what it is, how to drive the desktop, how to deploy it on your own domain, and how to run and extend it as an admin.</p>
      </div>

      <div className="os-guide-shell">
        <nav className="os-guide-toc" aria-label="On this page">
          <span className="os-guide-toc-label">On this page</span>
          {SECTIONS.map(s => (
            <a key={s.id} href={`#${s.id}`} onClick={jump(s.id)} className={active === s.id ? 'active' : ''}>
              <s.icon size={15} /> {s.label}
            </a>
          ))}
        </nav>

        <div className="os-guide-content" ref={contentRef}>
          {/* ---------------- Overview ---------------- */}
          <section id="overview" className="os-guide-section">
            <h2><Cloud size={22} /> Overview</h2>
            <p className="os-guide-lede">
              AI Dev Hub is the front door to your whole AI &amp; security stack. Instead of a link list, it's a
              <strong> macOS-style desktop</strong>: every tool is an icon on the desktop and in the dock, and each opens
              in a draggable, resizable window (framed in place) or its own tab. It runs as <code>hub.&lt;domain&gt;</code> inside
              the <a className="inline" href={REPO} target="_blank" rel="noopener noreferrer">ubuntu-dokploy-ai</a> stack.
            </p>
            <div className="os-guide-grid">
              <Feature icon={<Cloud size={18} />} title="Infrastructure">Any Ubuntu 20.04/22.04 host — bare-metal or a cloud VM — with a public IP and wildcard DNS.</Feature>
              <Feature icon={<LayoutGrid size={18} />} title="Container platform">Dokploy orchestration with a Traefik reverse proxy and automatic Let's Encrypt SSL.</Feature>
              <Feature icon={<Rocket size={18} />} title="Apps &amp; AI">Open WebUI + Ollama, n8n, Langflow, Flowise, the Dev Hub, and the security demos — all on your domain.</Feature>
            </div>
            <p>Under the hood it's a React 19 + Vite single-page app served by nginx, backed by a FastAPI + PostgreSQL API. Each signed-in user gets their own desktop layout; admins curate the shared catalog.</p>
          </section>

          {/* ---------------- Using the desktop ---------------- */}
          <section id="desktop" className="os-guide-section">
            <h2><AppWindow size={22} /> Using the desktop</h2>
            <p className="os-guide-lede">The hub behaves like a real desktop OS — the interactions you already know from macOS work here.</p>
            <div className="os-guide-grid">
              <Feature icon={<AppWindow size={18} />} title="Windows">Open an app to launch it in a window with real traffic-light controls. Drag, resize, maximize, minimize — each window remembers its size, position, and maximized state per user.</Feature>
              <Feature icon={<Command size={18} />} title={<>Spotlight <Kbd>⌘K</Kbd></>}>Press <Kbd>⌘K</Kbd> (or <Kbd>Ctrl K</Kbd>) for a command palette — type to filter, <Kbd>↑</Kbd>/<Kbd>↓</Kbd> to move, <Kbd>Enter</Kbd> to launch.</Feature>
              <Feature icon={<FolderClosed size={18} />} title="Folders">Right-click the desktop → New Folder (name it inline), drag apps in, give it a color, and open a Launchpad-style panel.</Feature>
              <Feature icon={<LayoutGrid size={18} />} title="Dock & icons">Pin favorites to the dock, drag icons to arrange them, and right-click anything for its actions (open, pin, source on GitHub, …).</Feature>
              <Feature icon={<Gauge size={18} />} title="Widgets">A live rail with clock, system, activity, errors, latency and more — toggle and arrange it to taste.</Feature>
              <Feature icon={<SunMoon size={18} />} title="Themes">Dark, light, or <strong>Auto</strong> (follows your OS appearance) — set it in Settings; it follows you across devices.</Feature>
            </div>
            <Callout kind="tip">Your entire layout — icon positions, folders, dock/desktop placement, widgets, and theme — is saved per user and follows you to any device you sign in from.</Callout>
          </section>

          {/* ---------------- Deploying ---------------- */}
          <section id="deploy" className="os-guide-section">
            <h2><Rocket size={22} /> Deploying your own</h2>
            <p className="os-guide-lede">Stand up the whole stack on a plain Ubuntu server with Dokploy — one automation script deploys every app to your domain. No Azure, no Terraform.</p>
            <ol className="os-guide-steps">
              <li>
                <h3>Prerequisites</h3>
                <p>A fresh Ubuntu 20.04/22.04 host (public IP, root/sudo), a domain with DNS access, an SSH key pair (e.g. <code>~/.ssh/id_rsa</code>), and Python 3 on your local machine (the automation runs locally and configures the server over SSH).</p>
              </li>
              <li>
                <h3>Point your DNS</h3>
                <p>Add one wildcard <strong>A record</strong> so every app subdomain resolves to the server:</p>
                <div className="os-guide-kv"><span className="k">Type</span><span className="v">A</span><span className="k">Name</span><span className="v">*</span><span className="k">Value</span><span className="v">YOUR_SERVER_IP</span></div>
              </li>
              <li>
                <h3>Install Docker &amp; Dokploy</h3>
                <p>On the server (or let the automation do it if missing):</p>
                <Code>{`ssh user@YOUR_SERVER_IP
curl -fsSL https://get.docker.com | sh
curl -sSL https://dokploy.com/install.sh | sudo sh`}</Code>
              </li>
              <li>
                <h3>Clone the automation</h3>
                <p>On your local machine:</p>
                <Code>{`git clone ${REPO}.git
cd ubuntu-dokploy-ai`}</Code>
                <p>It contains <code>automation/dokploy_automate.py</code> (the deploy script), <code>dokploy_config.json</code> (the app catalog), the per-app compose stacks, and <code>automation/envs/</code>.</p>
              </li>
              <li>
                <h3>Run the deploy script</h3>
                <p>It connects over SSH, creates your Dokploy admin, and deploys every app from the catalog:</p>
                <Code>{`python3 automation/dokploy_automate.py \\
  --url "http://YOUR_SERVER_IP:3000" \\
  --email "admin@yourdomain.com" \\
  --password "a-strong-password" \\
  --domain "yourdomain.com" \\
  --ssh-user "your-ssh-user" \\
  --ssh-private "~/.ssh/id_rsa" \\
  --ssh-public "~/.ssh/id_rsa.pub"`}</Code>
                <Callout kind="warn">The SSH user needs passwordless <code>sudo</code>, and your public key must be in the server's <code>~/.ssh/authorized_keys</code>. See <code>docs/manual_setup_guide.md</code> in the repo.</Callout>
              </li>
              <li>
                <h3>Manage &amp; verify</h3>
                <p>Open Dokploy at <code>http://YOUR_SERVER_IP:3000</code> to watch stacks deploy and SSL issue. Once DNS propagates, visit <code>https://hub.yourdomain.com</code> — every app is on your domain and framed in the hub.</p>
              </li>
            </ol>
          </section>

          {/* ---------------- Administration ---------------- */}
          <section id="admin" className="os-guide-section">
            <h2><ShieldCheck size={22} /> Administration</h2>
            <p className="os-guide-lede">Admins curate the catalog and the shared default layout. Everyone else gets a personal desktop on top of it.</p>
            <h3>Managing apps</h3>
            <p>As an admin, use <strong>Add Application</strong> (top bar or the desktop menu) to register an app — name, URL, category, icon, and how it embeds. Right-click any app to rename, edit, or remove it. Non-admins don't see these actions.</p>
            <h3>How apps embed in a window</h3>
            <div className="os-guide-grid">
              <Feature icon={<AppWindow size={18} />} title="Direct frame">The app's real URL is framed. A server-side probe checks reachability/framing first and shows a clean launcher card if it can't be framed.</Feature>
              <Feature icon={<LayoutGrid size={18} />} title="Same-origin proxy">Optional — routes the app through <code>/embed</code> so it's same-origin with the hub (for apps that need it).</Feature>
              <Feature icon={<ShieldCheck size={18} />} title="Tokenized URL">An encrypted, token-bearing embed URL (AES-256-GCM at rest) served only to signed-in users — for dashboards that need a key in the URL.</Feature>
            </div>
            <h3>Default layout</h3>
            <p>Arrange the desktop, then right-click → <strong>Set as everyone's default</strong> to snapshot the shared baseline. Each user's personal changes (placement, folders, widgets, theme) layer on top and follow them across devices.</p>
            <Callout kind="info">The desktop is login-required. Creating, editing, and deleting apps — and setting the default layout — are admin-only, enforced on the backend.</Callout>
          </section>

          {/* ---------------- API ---------------- */}
          <section id="api" className="os-guide-section">
            <h2><Terminal size={22} /> API &amp; integration</h2>
            <p className="os-guide-lede">The hub is a normal FastAPI service — everything the UI does runs through a documented REST API.</p>
            <p>Interactive API docs (Swagger UI) are served at:</p>
            <Code>https://hub.yourdomain.com/api/docs</Code>
            <p>Auth is JWT (Bearer). A few of the endpoints:</p>
            <div className="os-guide-pills">
              <span className="os-guide-pill"><code>POST /api/auth/login</code></span>
              <span className="os-guide-pill"><code>GET /api/apps/</code></span>
              <span className="os-guide-pill"><code>GET /api/desktop/prefs</code></span>
              <span className="os-guide-pill"><code>GET /api/desktop/widgets</code></span>
            </div>
            <Callout kind="tip">Read endpoints like the app catalog are open; anything that mutates apps or writes prefs requires a valid token (and admin scope for catalog changes).</Callout>

            <h3>Resources</h3>
            <div className="os-guide-resources">
              <a href={REPO} target="_blank" rel="noopener noreferrer"><ExternalLink size={15} /> ubuntu-dokploy-ai (automation)</a>
              <a href="https://github.com/alshawwaf/dev-hub" target="_blank" rel="noopener noreferrer"><ExternalLink size={15} /> dev-hub (this portal)</a>
              <a href="https://docs.dokploy.com" target="_blank" rel="noopener noreferrer"><ExternalLink size={15} /> Dokploy docs</a>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
};

export default GuidePage;
