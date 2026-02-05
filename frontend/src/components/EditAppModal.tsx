import React, { useState, useEffect } from 'react';
import { X, Save, Github, ExternalLink, Tag, Type, AlignLeft } from 'lucide-react';
import api from '../services/api';

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

interface EditAppModalProps {
  isOpen: boolean;
  app: App | null;
  onClose: () => void;
  onAppUpdated: () => void;
}

const EditAppModal: React.FC<EditAppModalProps> = ({ isOpen, app, onClose, onAppUpdated }) => {
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    url: '',
    github_url: '',
    category: '',
    icon: '',
    is_live: true
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (app) {
      setFormData({
        name: app.name,
        description: app.description,
        url: app.url,
        github_url: app.github_url,
        category: app.category,
        icon: app.icon,
        is_live: app.is_live
      });
    }
  }, [app]);

  // Early return MUST be after all hooks
  if (!isOpen || !app) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const token = localStorage.getItem('token');
      await api.put(`apps/${app.id}`, formData, {
        headers: { Authorization: `Bearer ${token}` }
      });
      onAppUpdated();
      onClose();
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to update application.');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target;
    setFormData(prev => ({ 
      ...prev, 
      [name]: type === 'checkbox' ? (e.target as HTMLInputElement).checked : value 
    }));
  };

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-6"
      style={{ backgroundColor: 'rgba(0,0,0,0.9)' }}
      onClick={onClose}
    >
      <div 
        className="bg-bg-card w-full max-w-2xl relative rounded-2xl border border-white/10 p-10"
        onClick={e => e.stopPropagation()}
      >
        <button 
          onClick={onClose}
          className="absolute top-6 right-6 text-text-muted hover:text-white p-2 rounded-full bg-white/5 hover:bg-white/10"
        >
          <X size={20} />
        </button>

        <div className="flex items-center gap-4 mb-8">
          <div className="w-12 h-12 rounded-xl bg-primary/20 flex items-center justify-center">
            <Save size={24} className="text-primary-light" />
          </div>
          <div>
            <h2 className="text-xl font-bold">Edit Application</h2>
            <p className="text-sm text-text-muted">Update {app.name}</p>
          </div>
        </div>

        {error && <div className="bg-red-500/10 border border-red-500/30 text-red-400 p-3 rounded-lg mb-6 text-sm">{error}</div>}

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-2 gap-6">
            <div>
              <label className="block text-xs font-semibold text-text-muted uppercase tracking-wider mb-2">Name</label>
              <input name="name" type="text" required value={formData.name} onChange={handleChange} className="w-full bg-bg-surface border border-glass-border rounded-lg p-3 text-sm" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-text-muted uppercase tracking-wider mb-2">Category</label>
              <input name="category" type="text" required value={formData.category} onChange={handleChange} className="w-full bg-bg-surface border border-glass-border rounded-lg p-3 text-sm" />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-text-muted uppercase tracking-wider mb-2">Description</label>
            <textarea name="description" rows={2} required value={formData.description} onChange={handleChange} className="w-full bg-bg-surface border border-glass-border rounded-lg p-3 text-sm resize-none" />
          </div>

          <div className="grid grid-cols-2 gap-6">
            <div>
              <label className="block text-xs font-semibold text-text-muted uppercase tracking-wider mb-2">URL</label>
              <input name="url" type="url" required value={formData.url} onChange={handleChange} className="w-full bg-bg-surface border border-glass-border rounded-lg p-3 text-sm" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-text-muted uppercase tracking-wider mb-2">GitHub URL</label>
              <input name="github_url" type="url" required value={formData.github_url} onChange={handleChange} className="w-full bg-bg-surface border border-glass-border rounded-lg p-3 text-sm" />
            </div>
          </div>

          <div className="flex items-center gap-3">
            <input id="is_live" name="is_live" type="checkbox" checked={formData.is_live} onChange={handleChange} className="w-4 h-4" />
            <label htmlFor="is_live" className="text-sm text-text-secondary">Application is live</label>
          </div>

          <button type="submit" disabled={loading} className="w-full btn btn-primary py-3 rounded-xl font-semibold">
            {loading ? 'Saving...' : 'Save Changes'}
          </button>
        </form>
      </div>
    </div>
  );
};

export default EditAppModal;
