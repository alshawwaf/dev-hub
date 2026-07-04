import React, { useState } from 'react';
import { Plus, Github, ExternalLink, Tag, Type, AlignLeft, Sparkles, Image as ImageIcon, Upload, AlertTriangle } from 'lucide-react';
import api from '../../services/api';
import AppGlyph from '../AppGlyph';
import { fileToIconDataUrl } from '../../components/iconUpload';
import { useHub } from '../HubContext';
import { useWindows } from '../WindowManager';

// The "Add Application" form BODY. It renders inside a real desktop window
// (AppWindow provides the titlebar / traffic lights / drag / resize), so there
// is no overlay, backdrop, card chrome or close-X here. Styling is theme-aware
// via CSS vars + the .os-form-* classes (see index.css) so it reads correctly in
// both light and dark. All submit behavior is preserved from the old modal.
const AddAppForm: React.FC = () => {
  const { refetch } = useHub();
  const { windows, closeWindow } = useWindows();

  const [formData, setFormData] = useState({
    name: '', description: '', url: '', github_url: '', category: '', icon: '',
    is_live: true, embeddable: false, proxy_embed: false, embed_url: '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Close this form's own window (by system key) on success / Cancel. The
  // titlebar close button also works — it targets the same window.
  const closeSelf = () => {
    const self = windows.find(w => w.app.system === 'addapp');
    if (self) closeWindow(self.id);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      await api.post('apps/', formData);
      refetch();
      closeSelf();
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to add application.');
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

  const checkbox = (name: 'embeddable' | 'proxy_embed', title: string, sub: string) => (
    <label className="os-form-check">
      <input
        name={name}
        type="checkbox"
        checked={formData[name]}
        onChange={e => setFormData(prev => ({ ...prev, [name]: e.target.checked }))}
      />
      <span className="os-form-check-txt">{title}<small>{sub}</small></span>
    </label>
  );

  return (
    <div className="os-form-scroll">
      <div className="os-form">
        <div className="os-form-head">
          <span className="os-form-head-ic"><Sparkles size={20} /></span>
          <div>
            <h2>Add New Application</h2>
            <p>Connect a new service to the ecosystem</p>
          </div>
        </div>

        {error && <div className="os-form-error"><AlertTriangle size={15} /> {error}</div>}

        <form onSubmit={handleSubmit}>
          <div className="os-form-grid">
            <div className="os-form-field">
              <label className="os-form-label"><Type size={13} /> App Name</label>
              <input className="os-set-input os-form-input" name="name" type="text" required placeholder="AI Agent Pro" value={formData.name} onChange={handleChange} />
            </div>
            <div className="os-form-field">
              <label className="os-form-label"><Tag size={13} /> Category</label>
              <input className="os-set-input os-form-input" name="category" type="text" required placeholder="AI Security" value={formData.category} onChange={handleChange} />
            </div>
          </div>

          <div className="os-form-field">
            <label className="os-form-label"><AlignLeft size={13} /> Description</label>
            <textarea className="os-set-input os-form-input os-form-textarea" name="description" rows={2} required placeholder="What does this application do?" value={formData.description} onChange={handleChange} />
          </div>

          <div className="os-form-field">
            <label className="os-form-label"><ImageIcon size={13} /> Icon</label>
            <div className="os-form-iconrow">
              <div className="os-form-iconprev"><AppGlyph app={{ name: formData.name, icon: formData.icon }} size={28} /></div>
              {formData.icon.startsWith('data:') ? (
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
              <label className="os-form-label"><ExternalLink size={13} /> Live URL</label>
              <input className="os-set-input os-form-input" name="url" type="url" required placeholder="https://app.example.com" value={formData.url} onChange={handleChange} />
            </div>
            <div className="os-form-field">
              <label className="os-form-label"><Github size={13} /> GitHub Repo</label>
              <input className="os-set-input os-form-input" name="github_url" type="url" required placeholder="https://github.com/org/repo" value={formData.github_url} onChange={handleChange} />
            </div>
          </div>

          <div className="os-form-grid">
            {checkbox('embeddable', 'Open in a window', 'Leave off if the app blocks iframes — opens in its own tab.')}
            {checkbox('proxy_embed', 'Same-origin proxy', 'For apps that block framing but tolerate a path prefix. SPAs embed directly.')}
          </div>

          <div className="os-form-field">
            <label className="os-form-label"><ExternalLink size={13} /> Embed URL (optional)</label>
            <input className="os-set-input os-form-input" name="embed_url" type="url" placeholder="Token-bearing URL to frame instead of the app URL" value={formData.embed_url} onChange={handleChange} />
            <span className="os-form-hint">Stored encrypted; framed instead of the app URL when set (e.g. an OpenClaw tokenized dashboard URL).</span>
          </div>

          <div className="os-form-actions">
            <button type="button" className="btn btn-ghost os-form-cancel" onClick={closeSelf}>Cancel</button>
            <button type="submit" className="os-form-submit" disabled={loading}>
              <Plus size={17} />
              {loading ? 'Deploying…' : 'Deploy to Hub'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AddAppForm;
