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
  launchpad: 'linear-gradient(145deg,#ec4899,#7c3aed)',  // pink→purple
  api: 'linear-gradient(145deg,#06b6d4,#0e7490)',        // cyan (REST API)
  admin: 'linear-gradient(145deg,#6366f1,#4338ca)',      // indigo (Shield)
  apikeys: 'linear-gradient(145deg,#f59e0b,#b45309)',    // amber (KeyRound)
  mcp: 'linear-gradient(145deg,#14b8a6,#0e7490)',        // teal→cyan (Plug)
};

export function tintFor(app: AppInfo): string | undefined {
  if (app.system) return SYSTEM_TINTS[app.system] ?? 'linear-gradient(145deg,#6b7280,#374151)';
  const key = (app.name || '').trim().toLowerCase();
  return TINTS[key] ?? fallbackTint(key || 'app');
}

// macOS-tag-style color palette, shared by folders AND per-app icon tints.
// `undefined` = the app's auto tint / the default translucent folder tile.
export const FOLDER_COLORS: { key: string; label: string; hex: string }[] = [
  { key: 'blue', label: 'Blue', hex: '#3b82f6' },
  { key: 'purple', label: 'Purple', hex: '#8b5cf6' },
  { key: 'pink', label: 'Pink', hex: '#ec4899' },
  { key: 'red', label: 'Red', hex: '#ef4444' },
  { key: 'orange', label: 'Orange', hex: '#f97316' },
  { key: 'green', label: 'Green', hex: '#22c55e' },
  { key: 'graphite', label: 'Graphite', hex: '#64748b' },
];
export const FOLDER_COLOR_KEYS = FOLDER_COLORS.map(c => c.key);

const HEX_RE = /^#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/;

// A stored color is EITHER a palette key (e.g. "blue") OR a raw hex ("#3b82f6",
// from the custom picker). Resolve either to a hex; unknown/invalid → undefined.
export function resolveColorHex(val?: string): string | undefined {
  if (!val) return undefined;
  if (HEX_RE.test(val)) return val;
  return FOLDER_COLORS.find(c => c.key === val)?.hex;
}

// Lighten (pct > 0) / darken (pct < 0) a hex toward white/black by pct%.
function shade(hex: string, pct: number): string {
  const h = hex.replace('#', '');
  const full = h.length === 3 ? h.split('').map(c => c + c).join('') : h;
  const n = parseInt(full, 16);
  const t = pct < 0 ? 0 : 255;
  const p = Math.abs(pct) / 100;
  const mix = (c: number) => Math.round((t - c) * p) + c;
  const r = mix((n >> 16) & 255), g = mix((n >> 8) & 255), b = mix(n & 255);
  return `#${((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1)}`;
}

export const folderColorHex = (val?: string): string | undefined => resolveColorHex(val);
// Tile fill for a colored folder (subtle gradient of the color); undefined → CSS default.
export const folderTileBg = (val?: string): string | undefined => {
  const hex = folderColorHex(val);
  return hex ? `linear-gradient(145deg, ${hex}59, ${hex}22)` : undefined;
};
// Vibrant squircle background for an app icon the user has recolored; undefined →
// caller falls back to the auto tintFor(app).
export const appTileBg = (val?: string): string | undefined => {
  const hex = resolveColorHex(val);
  return hex ? `linear-gradient(145deg, ${shade(hex, 16)}, ${shade(hex, -24)})` : undefined;
};
