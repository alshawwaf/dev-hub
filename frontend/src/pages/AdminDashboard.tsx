import React, { useState, useEffect } from 'react';
import api from '../services/api';
import { Plus, X, Trash2, ExternalLink, Github, Loader2, Package } from 'lucide-react';

interface App {
  id: number;
  name: string;
  description: string;
  url: string;
  github_url: string;
  category: string;
  icon: string;
  is_live: boolean;
}

const AdminDashboard: React.FC = () => {
  const [apps, setApps] = useState<App[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    url: "",
    github_url: "",
    category: "AI",
    icon: "🚀",
    is_live: true
  });

  const fetchApps = async () => {
    setIsLoading(true);
    try {
      const response = await api.get('apps/');
      setApps(response.data);
    } catch (err) {
      console.error("Failed to fetch apps:", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchApps();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.post('apps/', formData);
      setShowForm(false);
      setFormData({
        name: "",
        description: "",
        url: "",
        github_url: "",
        category: "AI",
        icon: "🚀",
        is_live: true
      });
      fetchApps();
    } catch (err) {
      console.error("Failed to create app:", err);
      alert("Failed to create application");
    }
  };

  const handleDelete = async (id: number) => {
    if (!window.confirm("Are you sure you want to delete this application?")) return;
    try {
      await api.delete(`apps/${id}`);
      fetchApps();
    } catch (err) {
      console.error("Failed to delete app:", err);
    }
  };

  const emojiOptions = ['🚀', '🤖', '🔒', '⚡', '🌐', '💻', '📊', '🧠', '🛡️', '🔮'];

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '2rem 1.5rem' }}>
      {/* Header */}
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-extrabold text-gradient mb-1">Admin Dashboard</h1>
          <p className="text-text-muted text-sm">Manage the applications in the AI ecosystem.</p>
        </div>
        <button 
          onClick={() => setShowForm(!showForm)}
          className="btn btn-primary"
        >
          {showForm ? <><X size={16} /> Close</> : <><Plus size={16} /> Add Application</>}
        </button>
      </div>

      {/* Create Form Modal */}
      {showForm && (
        <div className="glass-strong p-8 rounded-2xl mb-8" style={{ maxWidth: '640px', margin: '0 auto 2rem' }}>
          <h3 className="text-xl font-bold mb-6 flex items-center gap-2">
            <Package size={20} className="text-primary" />
            Create New Application
          </h3>
          <form onSubmit={handleSubmit}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
              <div>
                <label className="block text-xs font-semibold text-text-muted uppercase tracking-wide mb-2">App Name</label>
                <input 
                  className="search-input"
                  style={{ paddingLeft: '1rem' }}
                  value={formData.name}
                  onChange={e => setFormData({...formData, name: e.target.value})}
                  placeholder="e.g. My AI App"
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-text-muted uppercase tracking-wide mb-2">Category</label>
                <select 
                  className="search-input"
                  style={{ paddingLeft: '1rem' }}
                  value={formData.category}
                  onChange={e => setFormData({...formData, category: e.target.value})}
                >
                  <option>AI</option>
                  <option>AI Security</option>
                  <option>Infrastructure</option>
                  <option>Automation</option>
                  <option>Productivity</option>
                  <option>Data</option>
                </select>
              </div>
            </div>

            <div style={{ marginBottom: '1rem' }}>
              <label className="block text-xs font-semibold text-text-muted uppercase tracking-wide mb-2">Description</label>
              <textarea 
                className="search-input"
                style={{ paddingLeft: '1rem', height: '80px', resize: 'vertical' }}
                value={formData.description}
                onChange={e => setFormData({...formData, description: e.target.value})}
                placeholder="Briefly describe what this app does..."
              />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
              <div>
                <label className="block text-xs font-semibold text-text-muted uppercase tracking-wide mb-2">App URL</label>
                <input 
                  className="search-input"
                  style={{ paddingLeft: '1rem' }}
                  value={formData.url}
                  onChange={e => setFormData({...formData, url: e.target.value})}
                  placeholder="https://app.example.com"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-text-muted uppercase tracking-wide mb-2">GitHub URL</label>
                <input 
                  className="search-input"
                  style={{ paddingLeft: '1rem' }}
                  value={formData.github_url}
                  onChange={e => setFormData({...formData, github_url: e.target.value})}
                  placeholder="https://github.com/..."
                />
              </div>
            </div>

            <div style={{ marginBottom: '1.5rem' }}>
              <label className="block text-xs font-semibold text-text-muted uppercase tracking-wide mb-2">Icon</label>
              <div className="flex gap-2 flex-wrap">
                {emojiOptions.map(emoji => (
                  <button
                    key={emoji}
                    type="button"
                    onClick={() => setFormData({...formData, icon: emoji})}
                    className={`w-10 h-10 rounded-lg text-xl flex items-center justify-center transition-all ${formData.icon === emoji ? 'bg-primary text-white' : 'bg-glass-bg-strong hover:bg-glass-border'}`}
                    style={{ border: formData.icon === emoji ? '2px solid var(--primary)' : '1px solid var(--glass-border)' }}
                  >
                    {emoji}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex items-center gap-3 mb-6">
              <input 
                type="checkbox"
                checked={formData.is_live}
                onChange={e => setFormData({...formData, is_live: e.target.checked})}
                id="is_live"
                style={{ width: '18px', height: '18px', accentColor: 'var(--primary)' }}
              />
              <label htmlFor="is_live" className="text-sm text-text-secondary">Application is live and production-ready</label>
            </div>

            <button type="submit" className="btn btn-primary w-full py-3">
              <Plus size={16} />
              Save Application
            </button>
          </form>
        </div>
      )}

      {/* Apps Table */}
      {isLoading ? (
        <div className="text-center py-16">
          <Loader2 size={32} className="animate-spin mx-auto mb-4 text-primary" />
          <p className="text-text-muted">Loading applications...</p>
        </div>
      ) : apps.length === 0 ? (
        <div className="text-center py-16 glass rounded-2xl">
          <Package size={48} className="mx-auto mb-4 text-text-dim" />
          <h3 className="text-xl font-bold mb-2">No Applications Yet</h3>
          <p className="text-text-muted mb-6">Get started by adding your first application.</p>
          <button onClick={() => setShowForm(true)} className="btn btn-primary">
            <Plus size={16} />
            Add Application
          </button>
        </div>
      ) : (
        <div className="glass rounded-2xl overflow-hidden">
          <table style={{ width: '100%', textAlign: 'left', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--glass-border)' }}>
                <th style={{ padding: '1rem 1.5rem', fontSize: '0.7rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-muted)' }}>Icon</th>
                <th style={{ padding: '1rem 1.5rem', fontSize: '0.7rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-muted)' }}>App Name</th>
                <th style={{ padding: '1rem 1.5rem', fontSize: '0.7rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-muted)' }}>Category</th>
                <th style={{ padding: '1rem 1.5rem', fontSize: '0.7rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-muted)' }}>Status</th>
                <th style={{ padding: '1rem 1.5rem', fontSize: '0.7rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-muted)' }}>Links</th>
                <th style={{ padding: '1rem 1.5rem', fontSize: '0.7rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-muted)', textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {apps.map(app => (
                <tr key={app.id} style={{ borderBottom: '1px solid var(--glass-border)', transition: 'background 150ms' }} className="hover:bg-glass-bg-strong">
                  <td style={{ padding: '1rem 1.5rem', fontSize: '1.5rem' }}>{app.icon}</td>
                  <td style={{ padding: '1rem 1.5rem' }}>
                    <span style={{ fontWeight: 600 }}>{app.name}</span>
                  </td>
                  <td style={{ padding: '1rem 1.5rem' }}>
                    <span style={{ 
                      fontSize: '0.7rem', 
                      fontWeight: 600, 
                      textTransform: 'uppercase', 
                      letterSpacing: '0.05em',
                      padding: '0.25rem 0.75rem', 
                      borderRadius: '100px', 
                      background: 'var(--glass-bg-strong)',
                      color: 'var(--text-muted)'
                    }}>
                      {app.category}
                    </span>
                  </td>
                  <td style={{ padding: '1rem 1.5rem' }}>
                    <span className={`status-badge ${app.is_live ? 'live' : 'dev'}`} style={{ position: 'static' }}>
                      {app.is_live ? '● Live' : '◐ Dev'}
                    </span>
                  </td>
                  <td style={{ padding: '1rem 1.5rem' }}>
                    <div className="flex items-center gap-3">
                      {app.url && (
                        <a href={app.url} target="_blank" rel="noopener noreferrer" className="text-text-muted hover:text-primary transition-colors" title="Open App">
                          <ExternalLink size={16} />
                        </a>
                      )}
                      {app.github_url && (
                        <a href={app.github_url} target="_blank" rel="noopener noreferrer" className="text-text-muted hover:text-primary transition-colors" title="Source Code">
                          <Github size={16} />
                        </a>
                      )}
                    </div>
                  </td>
                  <td style={{ padding: '1rem 1.5rem', textAlign: 'right' }}>
                    <button 
                      onClick={() => handleDelete(app.id)}
                      className="btn btn-ghost py-2 px-3 text-xs"
                      style={{ color: 'var(--error)' }}
                    >
                      <Trash2 size={14} />
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default AdminDashboard;
