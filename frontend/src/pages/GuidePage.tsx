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
          Learn how to deploy this complete AI development environment on Azure using Terraform and Dokploy.
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
            <ul className="text-text-secondary space-y-1">
              <li>• Azure VM (Ubuntu 22.04)</li>
              <li>• Terraform IaC</li>
              <li>• Auto-shutdown scheduling</li>
            </ul>
          </div>
          <div className="bg-black/20 rounded-xl p-4 border border-glass-border">
            <h4 className="font-semibold text-primary-light mb-2">Container Platform</h4>
            <ul className="text-text-secondary space-y-1">
              <li>• Dokploy orchestration</li>
              <li>• Traefik reverse proxy</li>
              <li>• Let's Encrypt SSL</li>
            </ul>
          </div>
          <div className="bg-black/20 rounded-xl p-4 border border-glass-border">
            <h4 className="font-semibold text-primary-light mb-2">AI Services</h4>
            <ul className="text-text-secondary space-y-1">
              <li>• Open WebUI + Ollama</li>
              <li>• n8n Workflows</li>
              <li>• Dev Hub Portal</li>
            </ul>
          </div>
        </div>
      </div>
      
      {/* Steps */}
      <div className="space-y-2">
        <Step number={1} title="Prerequisites" isOpen={openStep === 1} onToggle={() => setOpenStep(openStep === 1 ? 0 : 1)}>
          <p className="text-text-secondary mb-4">Before you begin, ensure you have the following:</p>
          <ul className="space-y-3 text-text-secondary">
            <li className="flex items-start gap-3">
              <CheckCircle2 size={18} className="text-green-400 mt-0.5 flex-shrink-0" />
              <span><strong className="text-text-primary">Azure Subscription</strong> - with a Service Principal for Terraform</span>
            </li>
            <li className="flex items-start gap-3">
              <CheckCircle2 size={18} className="text-green-400 mt-0.5 flex-shrink-0" />
              <span><strong className="text-text-primary">Terraform</strong> - installed locally (v1.0+)</span>
            </li>
            <li className="flex items-start gap-3">
              <CheckCircle2 size={18} className="text-green-400 mt-0.5 flex-shrink-0" />
              <span><strong className="text-text-primary">SSH Key Pair</strong> - for VM access (~/.ssh/id_rsa)</span>
            </li>
            <li className="flex items-start gap-3">
              <CheckCircle2 size={18} className="text-green-400 mt-0.5 flex-shrink-0" />
              <span><strong className="text-text-primary">Domain Name</strong> - with DNS access for subdomains</span>
            </li>
          </ul>
        </Step>
        
        <Step number={2} title="Clone the Repository" isOpen={openStep === 2} onToggle={() => setOpenStep(openStep === 2 ? 0 : 2)}>
          <p className="text-text-secondary mb-4">Clone the Azure-Dockploy repository to get started:</p>
          <CodeBlock code={`git clone https://github.com/alshawwaf/Azure-Dockploy.git
cd Azure-Dockploy`} />
          <p className="text-text-secondary mt-4">The repository contains:</p>
          <ul className="text-text-secondary mt-2 space-y-1">
            <li>• <code className="text-primary-light">main.tf</code> - Terraform infrastructure definition</li>
            <li>• <code className="text-primary-light">variables.tf</code> - Variable declarations</li>
            <li>• <code className="text-primary-light">terraform.tfvars.example</code> - Example configuration</li>
            <li>• <code className="text-primary-light">automation/</code> - Deployment automation scripts</li>
          </ul>
        </Step>
        
        <Step number={3} title="Configure Azure Credentials" isOpen={openStep === 3} onToggle={() => setOpenStep(openStep === 3 ? 0 : 3)}>
          <p className="text-text-secondary mb-4">Create your terraform.tfvars file from the example:</p>
          <CodeBlock code="cp terraform.tfvars.example terraform.tfvars" />
          <p className="text-text-secondary my-4">Edit terraform.tfvars with your Azure Service Principal credentials:</p>
          <CodeBlock code={`subscription_id = "your-subscription-id"
client_id       = "your-client-id"
client_secret   = "your-client-secret"
tenant_id       = "your-tenant-id"

admin_username  = "adminuser"
admin_password  = "YourSecurePassword123!"
naming_suffix   = "myproject-20260205"`} />
        </Step>
        
        <Step number={4} title="Deploy Infrastructure" isOpen={openStep === 4} onToggle={() => setOpenStep(openStep === 4 ? 0 : 4)}>
          <p className="text-text-secondary mb-4">Initialize Terraform and deploy:</p>
          <CodeBlock code={`# Initialize Terraform
terraform init

# Preview changes
terraform plan

# Deploy infrastructure
terraform apply`} />
          <p className="text-text-secondary mt-4">
            This will create an Azure VM with Dokploy pre-installed. The output will show your VM's public IP address.
          </p>
          <div className="mt-4 p-4 bg-yellow-500/10 border border-yellow-500/30 rounded-xl">
            <p className="text-yellow-400 text-sm">
              <strong>Note:</strong> The VM includes auto-shutdown at 7 PM EST by default to save costs. You can disable this in the Azure portal.
            </p>
          </div>
        </Step>
        
        <Step number={5} title="Configure DNS" isOpen={openStep === 5} onToggle={() => setOpenStep(openStep === 5 ? 0 : 5)}>
          <p className="text-text-secondary mb-4">Point your domain's DNS to the VM's public IP address. Create A records for:</p>
          <div className="bg-black/20 rounded-xl p-4 border border-glass-border font-mono text-sm">
            <div className="grid grid-cols-2 gap-2 text-text-secondary">
              <span>yourdomain.com</span><span className="text-green-400">→ VM_PUBLIC_IP</span>
              <span>hub.yourdomain.com</span><span className="text-green-400">→ VM_PUBLIC_IP</span>
              <span>chat.yourdomain.com</span><span className="text-green-400">→ VM_PUBLIC_IP</span>
              <span>n8n.yourdomain.com</span><span className="text-green-400">→ VM_PUBLIC_IP</span>
            </div>
          </div>
        </Step>
        
        <Step number={6} title="Access Dokploy" isOpen={openStep === 6} onToggle={() => setOpenStep(openStep === 6 ? 0 : 6)}>
          <p className="text-text-secondary mb-4">Access Dokploy to manage your applications:</p>
          <CodeBlock code="https://YOUR_VM_IP:3000" />
          <p className="text-text-secondary mt-4">Default credentials are set during Terraform deployment. From Dokploy you can:</p>
          <ul className="text-text-secondary mt-2 space-y-1">
            <li>• Deploy Docker Compose stacks</li>
            <li>• Manage SSL certificates via Traefik</li>
            <li>• Monitor container logs and resources</li>
            <li>• Configure environment variables</li>
          </ul>
        </Step>
        
        <Step number={7} title="Deploy Applications" isOpen={openStep === 7} onToggle={() => setOpenStep(openStep === 7 ? 0 : 7)}>
          <p className="text-text-secondary mb-4">Configure environment files for each application:</p>
          <CodeBlock code={`cd automation/envs
cp .env_agentic.example .env_agentic
cp .env_dev-hub.example .env_dev-hub
# Edit each file with your values`} />
          <p className="text-text-secondary mt-4">Key applications included:</p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
            <div className="bg-black/20 rounded-xl p-4 border border-glass-border">
              <h4 className="font-semibold text-primary-light">Open WebUI + Ollama</h4>
              <p className="text-text-secondary text-sm mt-1">Chat interface with local LLMs</p>
            </div>
            <div className="bg-black/20 rounded-xl p-4 border border-glass-border">
              <h4 className="font-semibold text-primary-light">n8n</h4>
              <p className="text-text-secondary text-sm mt-1">Workflow automation platform</p>
            </div>
            <div className="bg-black/20 rounded-xl p-4 border border-glass-border">
              <h4 className="font-semibold text-primary-light">Dev Hub</h4>
              <p className="text-text-secondary text-sm mt-1">This portal - your AI app launcher</p>
            </div>
            <div className="bg-black/20 rounded-xl p-4 border border-glass-border">
              <h4 className="font-semibold text-primary-light">Langflow / Flowise</h4>
              <p className="text-text-secondary text-sm mt-1">Visual AI workflow builders</p>
            </div>
          </div>
        </Step>
        
        <Step number={8} title="Verify Deployment" isOpen={openStep === 8} onToggle={() => setOpenStep(openStep === 8 ? 0 : 8)}>
          <p className="text-text-secondary mb-4">Test your deployment by accessing:</p>
          <ul className="space-y-3 text-text-secondary">
            <li className="flex items-center gap-3">
              <Rocket size={18} className="text-primary-light" />
              <span><strong className="text-text-primary">Dev Hub</strong> - https://hub.yourdomain.com</span>
            </li>
            <li className="flex items-center gap-3">
              <Terminal size={18} className="text-primary-light" />
              <span><strong className="text-text-primary">Open WebUI</strong> - https://chat.yourdomain.com</span>
            </li>
            <li className="flex items-center gap-3">
              <Server size={18} className="text-primary-light" />
              <span><strong className="text-text-primary">n8n</strong> - https://n8n.yourdomain.com</span>
            </li>
          </ul>
          <div className="mt-6 p-4 bg-green-500/10 border border-green-500/30 rounded-xl">
            <p className="text-green-400 text-sm">
              <strong>🎉 Congratulations!</strong> Your AI Dev Hub is now live. Start adding your AI applications to the hub!
            </p>
          </div>
        </Step>
      </div>
      
      {/* Resources */}
      <div className="glass rounded-2xl p-6 mt-8">
        <h2 className="text-xl font-bold text-text-primary mb-4">Resources</h2>
        <div className="flex flex-wrap gap-4">
          <a 
            href="https://github.com/alshawwaf/Azure-Dockploy" 
            target="_blank" 
            rel="noopener noreferrer"
            className="flex items-center gap-2 px-4 py-2 bg-white/5 hover:bg-white/10 border border-glass-border rounded-xl transition-colors"
          >
            <ExternalLink size={16} className="text-primary-light" />
            <span className="text-text-secondary">Azure-Dockploy Repo</span>
          </a>
          <a 
            href="https://github.com/alshawwaf/dev-hub" 
            target="_blank" 
            rel="noopener noreferrer"
            className="flex items-center gap-2 px-4 py-2 bg-white/5 hover:bg-white/10 border border-glass-border rounded-xl transition-colors"
          >
            <ExternalLink size={16} className="text-primary-light" />
            <span className="text-text-secondary">Dev Hub Repo</span>
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
