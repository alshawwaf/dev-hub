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

  if (!isOpen || !app) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const token = localStorage.getItem('token');
      await api.put(`apps/${app.id}`, formData, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });
      onAppUpdated();
      onClose();
    } catch (err: any) {
      console.error('Failed to update app:', err);
      setError(err.response?.data?.detail || 'Failed to update application. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    setFormData(prev => ({ 
      ...prev, 
      [name]: type === 'checkbox' ? (e.target as HTMLInputElement).checked : value 
    }));
  };

  return (
    <div className="fixed inset-0 z-modal flex items-center justify-center p-6 bg-bg-deep/95 backdrop-blur-xl">
      <div className="login-card w-full max-w-2xl relative animate-in fade-in zoom-in duration-500 border-white/5 shadow-[0_0_80px_rgba(0,0,0,0.6)] !p-10">
        <button 
          onClick={onClose}
          className="absolute top-8 right-8 text-text-muted hover:text-white hover:scale-110 transition-all duration-300 bg-white/5 p-2 rounded-full"
        >
          <X size={20} />
        </button>

        <div className="flex items-center gap-5 mb-10">
          <div className="logo-icon w-14 h-14 text-2xl shadow-xl shadow-primary/20">
            <Save size={32} />
          </div>
          <div>
            <h2 className="text-2xl font-bold mb-1 text-left tracking-tight">Edit Application</h2>
            <p className="text-sm text-text-muted font-medium">Update {app.name} details</p>
          </div>
        </div>

        {error && (
          <div className="error-message mb-8 animate-shake">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="space-y-2.5">
              <label htmlFor="name" className="flex items-center gap-2.5 text-[0.7rem] font-bold uppercase tracking-widest text-primary-light/80 ml-1">
                <Type size={14} /> Application Name
              </label>
              <input
                id="name"
                name="name"
                type="text"
                required
                value={formData.name}
                onChange={handleChange}
                className="!mb-0"
              />
            </div>
            <div className="space-y-2.5">
              <label htmlFor="category" className="flex items-center gap-2.5 text-[0.7rem] font-bold uppercase tracking-widest text-primary-light/80 ml-1">
                <Tag size={14} /> Category
              </label>
              <input
                id="category"
                name="category"
                type="text"
                required
                value={formData.category}
                onChange={handleChange}
                className="!mb-0"
              />
            </div>
          </div>

          <div className="space-y-2.5">
            <label htmlFor="description" className="flex items-center gap-2.5 text-[0.7rem] font-bold uppercase tracking-widest text-primary-light/80 ml-1">
              <AlignLeft size={14} /> Description
            </label>
            <textarea
              id="description"
              name="description"
              rows={3}
              required
              className="w-full bg-bg-surface border border-glass-border rounded-xl p-4 text-text-primary text-sm focus:outline-none focus:border-primary focus:ring-4 focus:ring-primary/10 transition-all placeholder:text-text-dim/50 resize-none"
              value={formData.description}
              onChange={handleChange}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="space-y-2.5">
              <label htmlFor="url" className="flex items-center gap-2.5 text-[0.7rem] font-bold uppercase tracking-widest text-primary-light/80 ml-1">
                <ExternalLink size={14} /> Live Application URL
              </label>
              <input
                id="url"
                name="url"
                type="url"
                required
                value={formData.url}
                onChange={handleChange}
                className="!mb-0"
              />
            </div>
            <div className="space-y-2.5">
              <label htmlFor="github_url" className="flex items-center gap-2.5 text-[0.7rem] font-bold uppercase tracking-widest text-primary-light/80 ml-1">
                <Github size={14} /> GitHub Repository
              </label>
              <input
                id="github_url"
                name="github_url"
                type="url"
                required
                value={formData.github_url}
                onChange={handleChange}
                className="!mb-0"
              />
            </div>
          </div>

          <div className="flex items-center gap-3 pt-2">
            <input
              id="is_live"
              name="is_live"
              type="checkbox"
              checked={formData.is_live}
              onChange={handleChange}
              className="w-5 h-5 rounded bg-bg-surface border-glass-border text-primary focus:ring-primary/20"
            />
            <label htmlFor="is_live" className="text-sm text-text-secondary cursor-pointer">
              Application is live and deployed
            </label>
          </div>

          <div className="pt-4">
            <button 
              type="submit" 
              className="btn btn-primary w-full py-4 text-base rounded-xl font-bold uppercase tracking-[0.15em] shadow-xl shadow-primary/20 hover:shadow-primary/40 active:scale-[0.98] transition-all"
              disabled={loading}
            >
              {loading ? (
                <>
                  <div className="spinner w-5 h-5 border-3 mr-3 !border-t-white"></div>
                  Saving...
                </>
              ) : (
                <>
                  <Save size={20} />
                  Save Changes
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default EditAppModal;
