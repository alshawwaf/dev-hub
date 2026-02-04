import React, { useState } from 'react';
import { X, Plus, Github, ExternalLink, Tag, Type, AlignLeft } from 'lucide-react';
import api from '../services/api';

interface AddAppModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAppAdded: () => void;
}

const AddAppModal: React.FC<AddAppModalProps> = ({ isOpen, onClose, onAppAdded }) => {
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    url: '',
    github_url: '',
    category: '',
    icon: 'https://cdn.jsdelivr.net/gh/walkxcode/dashboard-icons/png/custom.png',
    is_live: true
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const token = localStorage.getItem('token');
      await api.post('apps/', formData, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });
      onAppAdded();
      onClose();
      setFormData({
        name: '',
        description: '',
        url: '',
        github_url: '',
        category: '',
        icon: 'https://cdn.jsdelivr.net/gh/walkxcode/dashboard-icons/png/custom.png',
        is_live: true
      });
    } catch (err: any) {
      console.error('Failed to add app:', err);
      setError(err.response?.data?.detail || 'Failed to add application. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
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
            <Plus size={32} />
          </div>
          <div>
            <h2 className="text-2xl font-bold mb-1 text-left tracking-tight">Add New Application</h2>
            <p className="text-sm text-text-muted font-medium">Connect a new service to the ecosystem</p>
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
                placeholder="e.g. AI Agent Pro"
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
                placeholder="e.g. AI Security, Workflow"
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
              placeholder="Briefly describe what this application does and its primary value proposition."
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
                placeholder="https://app.example.com"
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
                placeholder="https://github.com/org/repo"
                value={formData.github_url}
                onChange={handleChange}
                className="!mb-0"
              />
            </div>
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
                  Registering...
                </>
              ) : (
                <>
                  <Plus size={20} />
                  Deploy to Hub
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );

};

export default AddAppModal;
