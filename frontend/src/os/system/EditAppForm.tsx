import React, { useState, useEffect } from 'react';
import { Save, Upload, Image as ImageIcon, Type, Tag, AlignLeft, ExternalLink, Github, Rocket, AlertTriangle } from 'lucide-react';
import api from '../../services/api';
import AppGlyph from '../AppGlyph';
import { fileToIconDataUrl } from '../../components/iconUpload';
import { useHub } from '../HubContext';
import { useWindows } from '../WindowManager';

interface DokployTarget { kind: 'application' | 'compose'; id: string; name: string; project: string; }

// <select> option value for a target — kind + id packed into one string ('' = not linked).
const targetValue = (kind: string, id: string) => `${kind}|${id}`;

// The "Edit Application" form BODY. Rendered inside a real desktop window
// (AppWindow supplies titlebar / drag / resize), so no overlay / card chrome /
// close-X here. Reads the app being edited from HubContext.editingApp. Theme-aware
// via CSS vars + the shared .os-form-* classes. Preserves ALL prior behavior:
// the encrypted embed_url prefetch and the Dokploy deployment picker.
const EditAppForm: React.FC = () => {
  const { editingApp, refetch } = useHub();
  const { windows, closeWindow } = useWindows();
  const app = editingApp;

  const [formData, setFormData] = useState({
    name: '', description: '', url: '', github_url: '', category: '', icon: '',
    is_live: true, embeddable: false, proxy_embed: false,
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  // embed_url is sensitive (carries a token), so it's never in the public app
  // payload. Fetch it from the authenticated endpoint to prefill; only send it
  // back if the admin actually edits it (so a failed prefetch can't wipe it).
  const [embedUrl, setEmbedUrl] = useState('');
  const [embedDirty, setEmbedDirty] = useState(false);
  // Dokploy deployment mapping: the picker only appears when Dokploy is connected
  // (null = still checking); targets come from the admin-only listing endpoint.
  const [dokployConfigured, setDokployConfigured] = useState<boolean | null>(null);
  const [deployTargets, setDeployTargets] = useState<DokployTarget[]>([]);
  const [deploySel, setDeploySel] = useState('');

  useEffect(() => {
    if (!app) return;
    setFormData({
      name: app.name, description: app.description, url: app.url, github_url: app.github_url,
      category: app.category, icon: app.icon, is_live: app.is_live,
      embeddable: app.embeddable ?? false, proxy_embed: app.proxy_embed ?? false,
    });
    setEmbedUrl('');
    setEmbedDirty(false);
    api.get(`apps/${app.id}/embed`).then(r => setEmbedUrl(r.data?.embed_url || '')).catch(() => {});
    setDeploySel(app.deploy_kind && app.deploy_id ? targetValue(app.deploy_kind, app.deploy_id) : '');
    setDokployConfigured(null);
    setDeployTargets([]);
    api.get('infra/dokploy')
      .then(r => {
        setDokployConfigured(!!r.data?.configured);
        if (r.data?.configured) {
          api.get('infra/dokploy/targets')
            .then(t => setDeployTargets(Array.isArray(t.data) ? t.data : []))
            .catch(() => setDeployTargets([]));
        }
      })
      .catch(() => setDokployConfigured(false));
  }, [app]);

  // Close this form's own window (by system key) on success / Cancel.
  const closeSelf = () => {
    const self = windows.find(w => w.app.system === 'editapp');
    if (self) closeWindow(self.id);
  };

  // No app to edit (window opened without a selection) — shouldn't normally happen.
  if (!app) {
    return (
      <div className="os-form-scroll">
        <div className="os-form">
          <p className="os-form-hint">No application selected to edit.</p>
        </div>
      </div>
    );
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const payload: Record<string, unknown> = { ...formData };
      if (embedDirty) payload.embed_url = embedUrl;
      // Deployment mapping rides along on every save ('' = unlink → nulls).
      const sep = deploySel.indexOf('|');
      payload.deploy_kind = sep > 0 ? deploySel.slice(0, sep) : null;
      payload.deploy_id = sep > 0 ? deploySel.slice(sep + 1) : null;
      await api.put(`apps/${app.id}`, payload);
      refetch();
      closeSelf();
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to update application.');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const onPickIcon = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    e.target.value = '';
    if (!f) return;
    try { const url = await fileToIconDataUrl(f); setFormData(prev => ({ ...prev, icon: url })); } catch { /* ignore */ }
  };

  const checkbox = (name: 'is_live' | 'embeddable' | 'proxy_embed', title: string, sub?: string) => (
    <label className="os-form-check">
      <input
        name={name}
        type="checkbox"
        checked={formData[name]}
        onChange={e => setFormData(prev => ({ ...prev, [name]: e.target.checked }))}
      />
      <span className="os-form-check-txt">{title}{sub && <small>{sub}</small>}</span>
    </label>
  );

  return (
    <div className="os-form-scroll">
      <div className="os-form">
        <div className="os-form-head">
          <span className="os-form-head-ic"><Save size={20} /></span>
          <div>
            <h2>Edit Application</h2>
            <p>Update {app.name}</p>
          </div>
        </div>

        {error && <div className="os-form-error"><AlertTriangle size={15} /> {error}</div>}

        <form onSubmit={handleSubmit}>
          <div className="os-form-grid">
            <div className="os-form-field">
              <label className="os-form-label"><Type size={13} /> Name</label>
              <input className="os-set-input os-form-input" name="name" type="text" required value={formData.name} onChange={handleChange} />
            </div>
            <div className="os-form-field">
              <label className="os-form-label"><Tag size={13} /> Category</label>
              <input className="os-set-input os-form-input" name="category" type="text" required value={formData.category} onChange={handleChange} />
            </div>
          </div>

          <div className="os-form-field">
            <label className="os-form-label"><AlignLeft size={13} /> Description</label>
            <textarea className="os-set-input os-form-input os-form-textarea" name="description" rows={2} required value={formData.description} onChange={handleChange} />
          </div>

          <div className="os-form-field">
            <label className="os-form-label"><ImageIcon size={13} /> Icon</label>
            <div className="os-form-iconrow">
              <div className="os-form-iconprev"><AppGlyph app={{ name: formData.name, icon: formData.icon }} size={28} /></div>
              {(formData.icon || '').startsWith('data:') ? (
                <div className="os-form-iconchip">
                  <ImageIcon size={15} /> Uploaded image
                  <button type="button" className="os-form-iconclear" onClick={() => setFormData(prev => ({ ...prev, icon: '' }))}>Clear</button>
                </div>
              ) : (
                <input className="os-set-input os-form-input os-form-iconinput" name="icon" type="text" placeholder="URL, /logos/x.png, emoji, or lucide:Name" value={formData.icon} onChange={handleChange} />
              )}
              <label className="os-form-upload">
                <Upload size={15} /> Upload
                <input type="file" accept="image/*" hidden onChange={onPickIcon} />
              </label>
            </div>
          </div>

          <div className="os-form-grid">
            <div className="os-form-field">
              <label className="os-form-label"><ExternalLink size={13} /> URL</label>
              <input className="os-set-input os-form-input" name="url" type="url" required value={formData.url} onChange={handleChange} />
            </div>
            <div className="os-form-field">
              <label className="os-form-label"><Github size={13} /> GitHub URL</label>
              <input className="os-set-input os-form-input" name="github_url" type="url" required value={formData.github_url} onChange={handleChange} />
            </div>
          </div>

          <div className="os-form-grid os-form-grid-checks">
            {checkbox('is_live', 'Application is live')}
            {checkbox('embeddable', 'Open in a window', 'Off if the app blocks iframes.')}
            {checkbox('proxy_embed', 'Same-origin proxy', 'For apps that block framing but tolerate a path prefix. SPAs embed directly.')}
          </div>

          <div className="os-form-field">
            <label className="os-form-label"><ExternalLink size={13} /> Embed URL (optional)</label>
            <input className="os-set-input os-form-input" name="embed_url" type="url" value={embedUrl} onChange={e => { setEmbedUrl(e.target.value); setEmbedDirty(true); }} placeholder="Token-bearing URL to frame instead of the app URL" />
            <span className="os-form-hint">Stored encrypted; framed instead of the app URL when set (e.g. an OpenClaw tokenized dashboard URL).</span>
          </div>

          <div className="os-form-field">
            <label className="os-form-label"><Rocket size={13} /> Deployment (Dokploy)</label>
            {dokployConfigured ? (
              <>
                <select className="os-set-input os-form-input os-form-select" value={deploySel} onChange={e => setDeploySel(e.target.value)}>
                  <option value="">Not linked</option>
                  {deploySel && !deployTargets.some(t => targetValue(t.kind, t.id) === deploySel) && (
                    <option value={deploySel}>Currently linked ({deploySel.replace('|', ' ')}) — not in Dokploy list</option>
                  )}
                  {(['application', 'compose'] as const).map(kind => {
                    const group = deployTargets.filter(t => t.kind === kind);
                    if (!group.length) return null;
                    return (
                      <optgroup key={kind} label={kind === 'application' ? 'Applications' : 'Compose'}>
                        {group.map(t => (
                          <option key={targetValue(t.kind, t.id)} value={targetValue(t.kind, t.id)}>
                            {t.name} — {t.project}
                          </option>
                        ))}
                      </optgroup>
                    );
                  })}
                </select>
                <span className="os-form-hint">Only services deployed through Dokploy are listed here — standalone containers won’t appear. Linking enables Start / Stop / Restart / Redeploy in the Admin window.</span>
              </>
            ) : (
              <span className="os-form-note">
                {dokployConfigured === null ? 'Checking Dokploy…' : 'Connect Dokploy in Settings → Integrations to link this app to a deployment.'}
              </span>
            )}
          </div>

          <div className="os-form-actions">
            <button type="button" className="btn btn-ghost os-form-cancel" onClick={closeSelf}>Cancel</button>
            <button type="submit" className="os-form-submit" disabled={loading}>
              <Save size={17} />
              {loading ? 'Saving…' : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default EditAppForm;
