export type Placement = 'desktop' | 'dock' | 'both' | 'hidden';

export interface WinGeometry { x: number; y: number; w: number; h: number; }
export type GeometryMap = Record<number, WinGeometry>;

export type SystemKey = 'launchpad' | 'settings' | 'logs' | 'guide' | 'about';

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
  /** Set on synthetic built-in apps (Settings, Logs, Guide, About). */
  system?: SystemKey;
  /** lucide-react icon name used to render system apps in the dock/desktop. */
  iconName?: string;
}

export type WidgetId = 'clock' | 'apps' | 'activity' | 'errors' | 'latency' | 'recent' | 'notifications' | 'lastapp' | 'quick' | 'system';

export interface WidgetData {
  apps: { total: number; live: number; embeddable: number };
  activity: { rate: number; spark: number[] };
  errors: { total: number; err: number; pct: number };
  latency: { avg: number };
  recent: { method: string; path: string; status: number; kind: string; at: string | null }[];
  notifications: { unread: number; latest: { text: string; kind: string; created_at: string | null } | null };
  last_app: { name: string; category: string; is_live: boolean } | null;
  system?: {
    uptime_seconds: number;
    cpus: number;
    load: number[] | null;
    mem: { used_pct: number | null; total_mb: number } | null;
    disk: { used_pct: number | null; total_gb: number } | null;
  };
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
}
