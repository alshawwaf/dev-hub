import React, { useState } from 'react';
import { X, Plus, Github, ExternalLink, Tag, Type, AlignLeft } from 'lucide-react';
import api from '../services/api';

interface AddAppModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAppAdded: () => void;
}

const inputStyle: React.CSSProperties = {
  width: '100%',
  background: 'rgba(10, 12, 18, 0.95)',
  border: '1px solid rgba(255, 255, 255, 0.12)',
  borderRadius: '12px',
  padding: '14px 16px',
  color: '#e2e8f0',
  fontSize: '0.9375rem',
  outline: 'none',
};

const AddAppModal: React.FC<AddAppModalProps> = ({ isOpen, onClose, onAppAdded }) => {
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    url: '',
    github_url: '',
    category: '',
    icon: 'app',
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
        headers: { Authorization: `Bearer ${token}` }
      });
      onAppAdded();
      onClose();
      setFormData({ name: '', description: '', url: '', github_url: '', category: '', icon: 'app', is_live: true });
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to add application.');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));
  };

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-6"
      style={{ backgroundColor: 'rgba(0, 0, 0, 0.9)', backdropFilter: 'blur(8px)' }}
      onClick={onClose}
    >
      <div 
        className="w-full max-w-2xl relative rounded-2xl p-10"
        style={{ 
          background: 'linear-gradient(145deg, #14161e 0%, #0f1117 100%)',
          border: '1px solid rgba(255, 255, 255, 0.08)',
          boxShadow: '0 25px 80px rgba(0, 0, 0, 0.6)'
        }}
        onClick={e => e.stopPropagation()}
      >
        <button onClick={onClose} className="absolute top-6 right-6 p-2 rounded-full text-gray-400 hover:text-white hover:bg-white/10 transition-all">
          <X size={20} />
        </button>

        <div className="flex items-center gap-5 mb-8">
          <div className="w-14 h-14 rounded-2xl flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #7c3aed 0%, #ec4899 100%)' }}>
            <Plus size={28} className="text-white" />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-white">Add New Application</h2>
            <p className="text-sm text-gray-400">Connect a new service to the ecosystem</p>
          </div>
        </div>

        {error && <div className="mb-6 p-4 rounded-lg text-red-400 text-sm" style={{ background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.2)' }}>{error}</div>}

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-2 gap-6">
            <div>
              <label className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-purple-300 mb-2">
                <Type size={12} /> Application Name
              </label>
              <input name="name" type="text" required placeholder="e.g. AI Agent Pro" value={formData.name} onChange={handleChange} style={inputStyle} />
            </div>
            <div>
              <label className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-purple-300 mb-2">
                <Tag size={12} /> Category
              </label>
              <input name="category" type="text" required placeholder="e.g. AI Security" value={formData.category} onChange={handleChange} style={inputStyle} />
            </div>
          </div>

          <div>
            <label className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-purple-300 mb-2">
              <AlignLeft size={12} /> Description
            </label>
            <textarea 
              name="description" 
              rows={3} 
              required 
              placeholder="Briefly describe what this application does..." 
              value={formData.description} 
              onChange={handleChange} 
              style={{ ...inputStyle, resize: 'none' as const }} 
            />
          </div>

          <div className="grid grid-cols-2 gap-6">
            <div>
              <label className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-purple-300 mb-2">
                <ExternalLink size={12} /> Live Application URL
              </label>
              <input name="url" type="url" required placeholder="https://app.example.com" value={formData.url} onChange={handleChange} style={inputStyle} />
            </div>
            <div>
              <label className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-purple-300 mb-2">
                <Github size={12} /> GitHub Repository
              </label>
              <input name="github_url" type="url" required placeholder="https://github.com/org/repo" value={formData.github_url} onChange={handleChange} style={inputStyle} />
            </div>
          </div>

          <button 
            type="submit" 
            disabled={loading} 
            className="w-full py-4 rounded-xl font-bold uppercase tracking-wider text-white transition-all hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50" 
            style={{ background: 'linear-gradient(135deg, #7c3aed 0%, #ec4899 100%)', boxShadow: '0 10px 30px rgba(124, 58, 237, 0.3)' }}
          >
            {loading ? 'Deploying...' : '+ Deploy to Hub'}
          </button>
        </form>
      </div>
    </div>
  );
};

export default AddAppModal;
