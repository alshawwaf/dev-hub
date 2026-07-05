export type Placement = 'desktop' | 'dock' | 'both' | 'hidden';

export interface WinGeometry { x: number; y: number; w: number; h: number; max?: boolean; }
export type GeometryMap = Record<number, WinGeometry>;

export type SystemKey = 'launchpad' | 'settings' | 'logs' | 'guide' | 'api' | 'admin' | 'apikeys' | 'mcp' | 'addapp' | 'editapp';

export interface AppInfo {
  id: number;
  name: string;
  description: string;
  url: string;
  github_url: string;
  category: string;
  icon: string;
  is_live: boolean;
  embeddable?: boolean;
  /** route the in-window iframe through the same-origin /embed reverse proxy */
  proxy_embed?: boolean;
  /** an encrypted override URL exists; fetch it from GET /apps/{id}/embed to frame (carries a token) */
  has_embed_url?: boolean;
  placement?: Placement;
  /** Set on synthetic built-in apps (Settings, Logs, Guide, Admin, …). */
  system?: SystemKey;
  /** lucide-react icon name used to render system apps in the dock/desktop. */
  iconName?: string;
  /** system apps visible to admins only (filtered by systemAppsFor) */
  adminOnly?: boolean;
  /** transient system windows (Add/Edit app forms) that must never surface in
   *  launchers (Launchpad / Dock / Spotlight). Filtered by systemAppsFor + Dock. */
  hidden?: boolean;
  /** Dokploy lifecycle mapping (admin-set in Edit app): which Dokploy target this app deploys as */
  deploy_kind?: 'application' | 'compose' | null;
  deploy_id?: string | null;
}

/** A macOS-style desktop folder grouping catalog apps. Ids are negative
 *  (allocated from -1001 down) so they share the numeric icon-grid key space
 *  with app ids (positive) without colliding with system apps (-1..-8). */
export interface FolderInfo {
  id: number;
  name: string;
  appIds: number[];
  /** optional folder tint (one of the FOLDER_COLORS keys); undefined = default */
  color?: string;
}

export type WidgetId = 'apps' | 'activity' | 'errors' | 'recent' | 'system' | 'health';

export interface WidgetData {
  apps: { total: number; live: number; embeddable: number };
  activity: { rate: number; spark: number[] };
  errors: { total: number; err: number; pct: number };
  recent: { method: string; path: string; status: number; kind: string; at: string | null }[];
  system?: {
    uptime_seconds: number;
    cpus: number;
    load: number[] | null;
    mem: { used_pct: number | null; total_mb: number } | null;
    disk: { used_pct: number | null; total_gb: number } | null;
  };
  health?: { items: { id: number; name: string; state: string }[]; up: number; down: number; unknown: number; total: number };
}

export interface WindowState {
  id: string;
  app: AppInfo;
  x: number;
  y: number;
  width: number;
  height: number;
  z: number;
  minimized: boolean;
  maximized: boolean;
  /** set briefly during the close-out animation, before the window is removed */
  closing?: boolean;
}
