import type { AppInfo } from './types';

// Per-app squircle tile background. Bespoke apps get a vibrant brand gradient
// (paired with a white lucide glyph via icon = "lucide:Name"); real-logo apps
// get a deep brand-tinted tile so the logo reads cohesively on the dark desktop.
const TINTS: Record<string, string> = {
  // bespoke (gradient + glyph)
  'demo server': 'linear-gradient(145deg,#64748b,#334155)',
  'script builder': 'linear-gradient(145deg,#3b82f6,#4f46e5)',
  'saml idp simulator': 'linear-gradient(145deg,#f59e0b,#d97706)',
  'training portal': 'linear-gradient(145deg,#3b82f6,#1d4ed8)',
  'ai basic training': 'linear-gradient(145deg,#ec4899,#db2777)',
  // real logos on tinted tiles
  'n8n workflow': 'linear-gradient(145deg,#2b2733,#15131c)',
  'open webui': 'linear-gradient(145deg,#202024,#0b0b0e)',
  'flowise': 'linear-gradient(145deg,#211d3f,#12102a)',
  'langflow': 'linear-gradient(145deg,#10231f,#0a1512)',
  'openclaw': 'linear-gradient(145deg,#2a1518,#180b0d)',
  'lakera guard demo': 'linear-gradient(145deg,#8b5cf6,#6d28d9)',
  'docs to swagger': 'linear-gradient(145deg,#12241f,#0a1813)',
};

export function tintFor(app: AppInfo): string | undefined {
  if (app.system) return undefined;
  return TINTS[(app.name || '').trim().toLowerCase()];
}
