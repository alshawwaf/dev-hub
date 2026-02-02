import React, { useState, useEffect } from 'react';
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
      const response = await api.get('/apps/');
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
      await api.post('/apps/', formData);
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
      await api.delete(`/apps/${id}`);
      fetchApps();
    } catch (err) {
      console.error("Failed to delete app:", err);
    }
  };

  return (
    <div className="container mx-auto px-6 py-12">
      <div className="flex justify-between items-center mb-12">
        <div>
          <h1 className="text-4xl font-extrabold text-gradient mb-2">Admin Dashboard</h1>
          <p className="text-text-muted">Manage the applications in the ecosystem.</p>
        </div>
        <button 
          onClick={() => setShowForm(!showForm)}
          className="btn btn-primary"
        >
          {showForm ? 'Close Form' : 'Add New Application'}
        </button>
      </div>

      {showForm && (
        <div className="glass p-8 rounded-2xl mb-12 max-w-2xl mx-auto border border-primary/20">
          <h3 className="text-xl font-bold mb-6">Create New Application</h3>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-text-dim uppercase mb-2">App Name</label>
                <input 
                  className="w-full bg-bg-dark border border-glass-border rounded-xl py-3 px-4 text-text-main focus:outline-none focus:border-primary"
                  value={formData.name}
                  onChange={e => setFormData({...formData, name: e.target.value})}
                  placeholder="e.g. My New AI App"
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-text-dim uppercase mb-2">Category</label>
                <select 
                  className="w-full bg-bg-dark border border-glass-border rounded-xl py-3 px-4 text-text-main focus:outline-none focus:border-primary"
                  value={formData.category}
                  onChange={e => setFormData({...formData, category: e.target.value})}
                >
                  <option>AI</option>
                  <option>AI Security</option>
                  <option>Infrastructure</option>
                  <option>Automation</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-text-dim uppercase mb-2">Description</label>
              <textarea 
                className="w-full bg-bg-dark border border-glass-border rounded-xl py-3 px-4 text-text-main focus:outline-none focus:border-primary h-24"
                value={formData.description}
                onChange={e => setFormData({...formData, description: e.target.value})}
                placeholder="Briefly describe what this app does..."
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-text-dim uppercase mb-2">App URL</label>
                <input 
                  className="w-full bg-bg-dark border border-glass-border rounded-xl py-3 px-4 text-text-main focus:outline-none focus:border-primary"
                  value={formData.url}
                  onChange={e => setFormData({...formData, url: e.target.value})}
                  placeholder="https://app.example.com"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-text-dim uppercase mb-2">GitHub URL</label>
                <input 
                  className="w-full bg-bg-dark border border-glass-border rounded-xl py-3 px-4 text-text-main focus:outline-none focus:border-primary"
                  value={formData.github_url}
                  onChange={e => setFormData({...formData, github_url: e.target.value})}
                  placeholder="https://github.com/..."
                />
              </div>
            </div>

            <div className="flex items-center gap-2 pt-2">
              <input 
                type="checkbox"
                checked={formData.is_live}
                onChange={e => setFormData({...formData, is_live: e.target.checked})}
                id="is_live"
                className="w-4 h-4 rounded border-glass-border bg-bg-dark text-primary"
              />
              <label htmlFor="is_live" className="text-sm text-text-muted">Is this application live?</label>
            </div>

            <button type="submit" className="btn btn-primary w-full mt-4">Save Application</button>
          </form>
        </div>
      )}

      {isLoading ? (
        <div className="text-center py-12">Loading applications...</div>
      ) : (
        <div className="glass rounded-2xl overflow-hidden">
          <table className="w-full text-left">
            <thead className="bg-bg-card border-b border-glass-border">
              <tr>
                <th className="px-6 py-4 text-xs font-bold text-text-dim uppercase">App Name</th>
                <th className="px-6 py-4 text-xs font-bold text-text-dim uppercase">Category</th>
                <th className="px-6 py-4 text-xs font-bold text-text-dim uppercase">Status</th>
                <th className="px-6 py-4 text-xs font-bold text-text-dim uppercase text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-glass-border">
              {apps.map(app => (
                <tr key={app.id} className="hover:bg-bg-card-hover transition-colors">
                  <td className="px-6 py-4 font-bold">{app.name}</td>
                  <td className="px-6 py-4"><span className="text-xs bg-glass-border px-2 py-1 rounded-md text-text-muted">{app.category}</span></td>
                  <td className="px-6 py-4">
                    <span className={`text-[10px] font-bold uppercase px-2 py-1 rounded-full ${app.is_live ? 'bg-green-500/20 text-green-400' : 'bg-yellow-500/20 text-yellow-400'}`}>
                      {app.is_live ? 'Live' : 'Dev'}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <button className="text-red-400 hover:text-red-300 text-sm font-bold" onClick={() => handleDelete(app.id)}>Delete</button>
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
