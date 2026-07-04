import api from '../services/api';
import type { AppInfo } from './types';

export type PowerAction = 'start' | 'stop' | 'restart' | 'redeploy';

const VERB: Record<PowerAction, string> = { start: 'Start', stop: 'Stop', restart: 'Restart', redeploy: 'Redeploy' };

/** Whether an app is linked to a Dokploy target (lifecycle controls apply). */
export const hasDeployMapping = (app: AppInfo): boolean => !!app.deploy_kind && !!app.deploy_id;

// Fire a lifecycle action against the backend. Anything disruptive (everything
// but start) confirms first; returns null only when the admin backs out.
// Errors are NORMALIZED to {ok:false, message} rather than thrown: the endpoint
// answers 400 {detail} for caller mistakes and 502 {ok:false, message} when
// Dokploy itself fails (both make axios reject), and the backend only emits a
// success notification — so every caller must get the reason back here, not a
// swallowed rejection.
export async function powerApp(app: AppInfo, action: PowerAction): Promise<{ ok: boolean; message: string } | null> {
  if (action !== 'start' && !window.confirm(`${VERB[action]} ${app.name}?`)) return null;
  try {
    const r = await api.post(`apps/${app.id}/power`, { action });
    return { ok: r.data?.ok !== false, message: r.data?.message || `${VERB[action]} requested` };
  } catch (err: any) {
    const d = err?.response?.data;
    return { ok: false, message: d?.message || d?.detail || `Failed to ${action.toLowerCase()} ${app.name}.` };
  }
}
