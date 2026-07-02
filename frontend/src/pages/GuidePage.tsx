import React, { useState } from 'react';
import { BookOpen, Server, Cloud, Rocket, Terminal, CheckCircle2, Copy, ExternalLink, ChevronDown, ChevronRight } from 'lucide-react';

interface StepProps {
  number: number;
  title: string;
  children: React.ReactNode;
  isOpen: boolean;
  onToggle: () => void;
}

const Step: React.FC<StepProps> = ({ number, title, children, isOpen, onToggle }) => (
  <div className="glass rounded-2xl overflow-hidden mb-4">
    <button
      onClick={onToggle}
      className="w-full px-6 py-4 flex items-center gap-4 hover:bg-white/10 transition-colors bg-white/5"
    >
      <div className="w-10 h-10 rounded-xl bg-primary/20 border border-primary/30 flex items-center justify-center text-primary-light font-bold">
        {number}
      </div>
      <h3 className="flex-1 text-left text-lg font-semibold text-white">{title}</h3>
      {isOpen ? <ChevronDown size={20} className="text-text-muted" /> : <ChevronRight size={20} className="text-text-muted" />}
    </button>
    {isOpen && (
      <div className="px-6 pb-6 pt-2 border-t border-glass-border">
        {children}
      </div>
    )}
  </div>
);

// A clean bullet list — an explicit dot per row (list markers are reset in the
// hand-rolled CSS, so a native <ul> disc would either double up or vanish).
const Bullets: React.FC<{ items: React.ReactNode[] }> = ({ items }) => (
  <ul className="space-y-1" style={{ listStyle: 'none', padding: 0, margin: 0 }}>
    {items.map((it, i) => (
      <li key={i} className="flex items-start gap-2">
        <span className="text-primary-light mt-0.5 leading-none">•</span>
        <span>{it}</span>
      </li>
    ))}
  </ul>
);

const CodeBlock: React.FC<{ code: string; language?: string }> = ({ code }) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="relative group my-4">
      <pre className="bg-black/40 border border-glass-border rounded-xl p-4 overflow-x-auto text-sm">
        <code className="text-green-400 font-mono">{code}</code>
      </pre>
      <button
        onClick={handleCopy}
        className="absolute top-3 right-3 p-2 rounded-lg bg-white/10 hover:bg-white/20 transition-colors opacity-0 group-hover:opacity-100"
        title="Copy to clipboard"
      >
        {copied ? <CheckCircle2 size={16} className="text-green-400" /> : <Copy size={16} className="text-text-muted" />}
      </button>
    </div>
  );
};

const REPO = 'https://github.com/alshawwaf/ubuntu-dokploy-ai';

const GuidePage: React.FC = () => {
  const [openStep, setOpenStep] = useState<number>(1);

  return (
    <div className="max-w-4xl mx-auto px-6 py-12">
      {/* Header */}
      <div className="text-center mb-12">
        <div className="inline-flex items-center gap-3 px-4 py-2 rounded-full bg-primary/10 border border-primary/20 mb-6">
          <BookOpen size={18} className="text-primary-light" />
          <span className="text-sm font-semibold text-primary-light uppercase tracking-wider">Deployment Guide</span>
        </div>
        <h1 className="text-4xl font-bold text-text-primary mb-4">
          Deploy Your Own <span className="text-gradient">AI Dev Hub</span>
        </h1>
        <p className="text-text-secondary text-lg max-w-2xl mx-auto">
          Stand up this whole AI &amp; security playground on a plain Ubuntu server with Dokploy — one
          automation script deploys every app to your own domain.
        </p>
      </div>

      {/* Architecture Overview */}
      <div className="glass rounded-2xl p-6 mb-8">
        <h2 className="text-xl font-bold text-text-primary mb-4 flex items-center gap-3">
          <Cloud size={24} className="text-primary-light" />
          Architecture Overview
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
          <div className="bg-black/20 rounded-xl p-4 border border-glass-border">
            <h4 className="font-semibold text-primary-light mb-2">Infrastructure</h4>
            <div className="text-text-secondary">
              <Bullets items={['Ubuntu 20.04 / 22.04 server', 'Any host — bare-metal or cloud VM', 'Public IP + wildcard DNS']} />
            </div>
          </div>
          <div className="bg-black/20 rounded-xl p-4 border border-glass-border">
            <h4 className="font-semibold text-primary-light mb-2">Container Platform</h4>
            <div className="text-text-secondary">
              <Bullets items={['Dokploy orchestration', 'Traefik reverse proxy', "Let's Encrypt SSL (auto)"]} />
            </div>
          </div>
          <div className="bg-black/20 rounded-xl p-4 border border-glass-border">
            <h4 className="font-semibold text-primary-light mb-2">Apps &amp; AI</h4>
            <div className="text-text-secondary">
              <Bullets items={['Open WebUI + Ollama', 'n8n · Langflow · Flowise', 'Dev Hub + security demos']} />
            </div>
          </div>
        </div>
      </div>

      {/* Steps */}
      <div className="space-y-2">
        <Step number={1} title="Prerequisites" isOpen={openStep === 1} onToggle={() => setOpenStep(openStep === 1 ? 0 : 1)}>
          <p className="text-text-secondary mb-4">Before you begin, make sure you have:</p>
          <ul className="space-y-3 text-text-secondary" style={{ listStyle: 'none', padding: 0 }}>
            <li className="flex items-start gap-3">
              <CheckCircle2 size={18} className="text-green-400 mt-0.5 flex-shrink-0" />
              <span><strong className="text-text-primary">An Ubuntu server</strong> — a fresh 20.04 / 22.04 LTS host (any provider) with a public IP and root/sudo access</span>
            </li>
            <li className="flex items-start gap-3">
              <CheckCircle2 size={18} className="text-green-400 mt-0.5 flex-shrink-0" />
              <span><strong className="text-text-primary">A domain</strong> — with DNS access so you can add a wildcard record for subdomains</span>
            </li>
            <li className="flex items-start gap-3">
              <CheckCircle2 size={18} className="text-green-400 mt-0.5 flex-shrink-0" />
              <span><strong className="text-text-primary">An SSH key pair</strong> — e.g. <code className="text-primary-light">~/.ssh/id_rsa</code>, with the public key in the server's <code className="text-primary-light">authorized_keys</code></span>
            </li>
            <li className="flex items-start gap-3">
              <CheckCircle2 size={18} className="text-green-400 mt-0.5 flex-shrink-0" />
              <span><strong className="text-text-primary">Python 3 locally</strong> — the automation runs on your machine and configures the server over SSH</span>
            </li>
          </ul>
        </Step>

        <Step number={2} title="Point your DNS" isOpen={openStep === 2} onToggle={() => setOpenStep(openStep === 2 ? 0 : 2)}>
          <p className="text-text-secondary mb-4">
            Add a single <strong className="text-text-primary">wildcard A record</strong> so every app subdomain resolves to your server:
          </p>
          <div className="bg-black/20 rounded-xl p-4 border border-glass-border font-mono text-sm">
            <div className="grid grid-cols-[auto_1fr] gap-x-6 gap-y-1 text-text-secondary">
              <span className="text-text-muted">Type</span><span>A</span>
              <span className="text-text-muted">Name</span><span>*</span>
              <span className="text-text-muted">Value</span><span className="text-green-400">YOUR_SERVER_IP</span>
            </div>
          </div>
          <p className="text-text-secondary mt-4">
            With <code className="text-primary-light">*.yourdomain.com</code> pointed at the server, Traefik + Let's Encrypt
            issue certificates for each app automatically (<code className="text-primary-light">hub.</code>, <code className="text-primary-light">chat.</code>,
            <code className="text-primary-light"> n8n.</code>, …).
          </p>
        </Step>

        <Step number={3} title="Install Docker & Dokploy" isOpen={openStep === 3} onToggle={() => setOpenStep(openStep === 3 ? 0 : 3)}>
          <p className="text-text-secondary mb-4">
            SSH into the server and install Docker and Dokploy. (You can skip this — the automation script installs them if
            they're missing.)
          </p>
          <CodeBlock code={`ssh user@YOUR_SERVER_IP

# Docker
curl -fsSL https://get.docker.com | sh

# Dokploy
curl -sSL https://dokploy.com/install.sh | sudo sh`} />
          <p className="text-text-secondary mt-4">
            Dokploy comes up on <code className="text-primary-light">http://YOUR_SERVER_IP:3000</code> with Traefik as the ingress.
          </p>
        </Step>

        <Step number={4} title="Clone the automation repo" isOpen={openStep === 4} onToggle={() => setOpenStep(openStep === 4 ? 0 : 4)}>
          <p className="text-text-secondary mb-4">On your local machine, clone the deployment automation:</p>
          <CodeBlock code={`git clone ${REPO}.git
cd ubuntu-dokploy-ai`} />
          <p className="text-text-secondary mt-4">The repository contains:</p>
          <div className="text-text-secondary mt-2">
            <Bullets items={[
              <><code className="text-primary-light">automation/dokploy_automate.py</code> — the one-shot deploy script</>,
              <><code className="text-primary-light">automation/dokploy_config.json</code> — the app catalog (services, domains, ports)</>,
              <><code className="text-primary-light">automation/*-compose.yml</code> — the per-app Docker Compose stacks</>,
              <><code className="text-primary-light">automation/envs/</code> — per-app environment files (copy the <code className="text-primary-light">.example</code>s and fill in secrets)</>,
            ]} />
          </div>
        </Step>

        <Step number={5} title="Run the deploy script" isOpen={openStep === 5} onToggle={() => setOpenStep(openStep === 5 ? 0 : 5)}>
          <p className="text-text-secondary mb-4">
            From your local machine, run the automation. It connects to the server over SSH, sets up your Dokploy admin
            account, and deploys every app from <code className="text-primary-light">dokploy_config.json</code>:
          </p>
          <CodeBlock code={`python3 automation/dokploy_automate.py \\
  --url "http://YOUR_SERVER_IP:3000" \\
  --email "admin@yourdomain.com" \\
  --password "a-strong-password" \\
  --domain "yourdomain.com" \\
  --ssh-user "your-ssh-user" \\
  --ssh-private "~/.ssh/id_rsa" \\
  --ssh-public "~/.ssh/id_rsa.pub"`} />
          <div className="mt-4 p-4 bg-yellow-500/10 border border-yellow-500/30 rounded-xl">
            <p className="text-yellow-400 text-sm">
              <strong>Tip:</strong> the SSH user needs passwordless <code>sudo</code>, and your public key must be in the
              server's <code>~/.ssh/authorized_keys</code>. See the repo's <code>docs/manual_setup_guide.md</code> for details.
            </p>
          </div>
        </Step>

        <Step number={6} title="Manage from Dokploy" isOpen={openStep === 6} onToggle={() => setOpenStep(openStep === 6 ? 0 : 6)}>
          <p className="text-text-secondary mb-4">Open Dokploy to manage the stack:</p>
          <CodeBlock code="http://YOUR_SERVER_IP:3000" />
          <p className="text-text-secondary mt-4">From Dokploy you can:</p>
          <div className="text-text-secondary mt-2">
            <Bullets items={[
              'Redeploy or rebuild any Compose stack',
              "Watch SSL certificates issue via Traefik / Let's Encrypt",
              'Tail container logs and check resource usage',
              'Edit environment variables and re-deploy',
            ]} />
          </div>
        </Step>

        <Step number={7} title="Verify" isOpen={openStep === 7} onToggle={() => setOpenStep(openStep === 7 ? 0 : 7)}>
          <p className="text-text-secondary mb-4">Once DNS has propagated and the stacks are up, open:</p>
          <ul className="space-y-3 text-text-secondary" style={{ listStyle: 'none', padding: 0 }}>
            <li className="flex items-center gap-3">
              <Rocket size={18} className="text-primary-light flex-shrink-0" />
              <span><strong className="text-text-primary">Dev Hub</strong> — <code className="text-primary-light">https://hub.yourdomain.com</code> (this portal)</span>
            </li>
            <li className="flex items-center gap-3">
              <Terminal size={18} className="text-primary-light flex-shrink-0" />
              <span><strong className="text-text-primary">Open WebUI</strong> — <code className="text-primary-light">https://chat.yourdomain.com</code></span>
            </li>
            <li className="flex items-center gap-3">
              <Server size={18} className="text-primary-light flex-shrink-0" />
              <span><strong className="text-text-primary">n8n</strong> — <code className="text-primary-light">https://n8n.yourdomain.com</code></span>
            </li>
          </ul>
          <div className="mt-6 p-4 bg-green-500/10 border border-green-500/30 rounded-xl">
            <p className="text-green-400 text-sm">
              <strong>🎉 You're live.</strong> Every app in the catalog is now on your domain and framed right here in the Dev Hub.
            </p>
          </div>
        </Step>
      </div>

      {/* Resources */}
      <div className="glass rounded-2xl p-6 mt-8">
        <h2 className="text-xl font-bold text-text-primary mb-4">Resources</h2>
        <div className="flex flex-wrap gap-4">
          <a
            href={REPO}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 px-4 py-2 bg-white/5 hover:bg-white/10 border border-glass-border rounded-xl transition-colors"
          >
            <ExternalLink size={16} className="text-primary-light" />
            <span className="text-text-secondary">ubuntu-dokploy-ai (automation)</span>
          </a>
          <a
            href="https://github.com/alshawwaf/dev-hub"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 px-4 py-2 bg-white/5 hover:bg-white/10 border border-glass-border rounded-xl transition-colors"
          >
            <ExternalLink size={16} className="text-primary-light" />
            <span className="text-text-secondary">dev-hub (this portal)</span>
          </a>
          <a
            href="https://docs.dokploy.com"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 px-4 py-2 bg-white/5 hover:bg-white/10 border border-glass-border rounded-xl transition-colors"
          >
            <ExternalLink size={16} className="text-primary-light" />
            <span className="text-text-secondary">Dokploy Docs</span>
          </a>
        </div>
      </div>
    </div>
  );
};

export default GuidePage;
