import React, { useState, useEffect, useRef } from 'react';
import { X, Pencil } from 'lucide-react';
import api from '../services/api';

interface App { id: number; name: string; }
interface Props { isOpen: boolean; app: App | null; onClose: () => void; onRenamed: () => void; }

// A focused single-field modal for renaming an app — distinct from the full
// Edit dialog (which edits URL/icon/flags/etc.).
const RenameAppModal: React.FC<Props> = ({ isOpen, app, onClose, onRenamed }) => {
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => { if (app) { setName(app.name); setError(''); } }, [app]);
  useEffect(() => { if (isOpen) { const t = window.setTimeout(() => inputRef.current?.select(), 60); return () => window.clearTimeout(t); } }, [isOpen]);

  if (!isOpen || !app) return null;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) { setError('Name cannot be empty.'); return; }
    if (trimmed === app.name) { onClose(); return; }
    setLoading(true);
    setError('');
    try {
      const token = localStorage.getItem('token');
      await api.put(`apps/${app.id}`, { name: trimmed }, { headers: { Authorization: `Bearer ${token}` } });
      onRenamed();
      onClose();
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to rename application.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-6" style={{ backgroundColor: 'rgba(0,0,0,0.9)' }} onClick={onClose}>
      <div className="bg-bg-card w-full max-w-md relative rounded-2xl border border-white/10 p-8" onClick={e => e.stopPropagation()}>
        <button onClick={onClose} className="absolute top-5 right-5 text-text-muted hover:text-white p-2 rounded-full bg-white/5 hover:bg-white/10">
          <X size={18} />
        </button>

        <div className="flex items-center gap-3 mb-6">
          <div className="w-11 h-11 rounded-xl bg-primary/20 flex items-center justify-center">
            <Pencil size={20} className="text-primary-light" />
          </div>
          <div>
            <h2 className="text-lg font-bold">Rename application</h2>
            <p className="text-sm text-text-muted">Give “{app.name}” a new name</p>
          </div>
        </div>

        {error && <div className="bg-red-500/10 border border-red-500/30 text-red-400 p-3 rounded-lg mb-4 text-sm">{error}</div>}

        <form onSubmit={submit}>
          <label className="block text-xs font-semibold text-text-muted uppercase tracking-wider mb-2">Name</label>
          <input
            ref={inputRef}
            value={name}
            onChange={e => setName(e.target.value)}
            maxLength={60}
            className="w-full bg-bg-surface border border-glass-border rounded-lg p-3 text-sm mb-5"
            placeholder="Application name"
          />
          <div className="flex gap-3">
            <button type="button" onClick={onClose} className="btn btn-ghost flex-1 py-2.5 rounded-xl">Cancel</button>
            <button type="submit" disabled={loading} className="btn btn-primary flex-1 py-2.5 rounded-xl font-semibold">{loading ? 'Saving…' : 'Rename'}</button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default RenameAppModal;
