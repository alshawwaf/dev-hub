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

// Deterministic dark, hue-varied gradient for any app not in TINTS (custom or
// renamed apps), so every tile reads as a cohesive colored squircle instead of a
// blank/grey square on the dark desktop.
function fallbackTint(key: string): string {
  let h = 0;
  for (let i = 0; i < key.length; i++) h = (h * 31 + key.charCodeAt(i)) >>> 0;
  const hue = h % 360;
  return `linear-gradient(145deg, hsl(${hue} 45% 22%), hsl(${hue} 55% 12%))`;
}

// macOS-style colored tiles for the built-in system apps (were rendering grey).
const SYSTEM_TINTS: Record<string, string> = {
  settings: 'linear-gradient(145deg,#64748b,#334155)',   // slate
  logs: 'linear-gradient(145deg,#10b981,#047857)',       // emerald (Activity)
  guide: 'linear-gradient(145deg,#3b82f6,#1d4ed8)',      // blue
  about: 'linear-gradient(145deg,#a78bfa,#7c3aed)',      // purple
  launchpad: 'linear-gradient(145deg,#ec4899,#7c3aed)',  // pink→purple
  api: 'linear-gradient(145deg,#06b6d4,#0e7490)',        // cyan (REST API)
};

export function tintFor(app: AppInfo): string | undefined {
  if (app.system) return SYSTEM_TINTS[app.system] ?? 'linear-gradient(145deg,#6b7280,#374151)';
  const key = (app.name || '').trim().toLowerCase();
  return TINTS[key] ?? fallbackTint(key || 'app');
}

// macOS-tag-style folder colors. `undefined` color = the default translucent tile.
export const FOLDER_COLORS: { key: string; label: string; hex: string }[] = [
  { key: 'blue', label: 'Blue', hex: '#3b82f6' },
  { key: 'purple', label: 'Purple', hex: '#8b5cf6' },
  { key: 'pink', label: 'Pink', hex: '#ec4899' },
  { key: 'red', label: 'Red', hex: '#ef4444' },
  { key: 'orange', label: 'Orange', hex: '#f97316' },
  { key: 'green', label: 'Green', hex: '#22c55e' },
  { key: 'graphite', label: 'Graphite', hex: '#64748b' },
];
export const folderColorHex = (key?: string): string | undefined => FOLDER_COLORS.find(c => c.key === key)?.hex;
// Tile fill for a colored folder (subtle gradient of the color); undefined → CSS default.
export const folderTileBg = (key?: string): string | undefined => {
  const hex = folderColorHex(key);
  return hex ? `linear-gradient(145deg, ${hex}59, ${hex}22)` : undefined;
};
