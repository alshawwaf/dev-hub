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

  // Inline styles throughout — this project ships a CSS-class subset, not full
  // Tailwind, so relying on utility classes here mispositioned the close button
  // and broke spacing.
  const labelStyle: React.CSSProperties = { display: 'block', fontSize: '0.72rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text-muted)', marginBottom: '8px' };

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px', background: 'rgba(8, 10, 20, 0.34)', backdropFilter: 'blur(3px)' }} onClick={onClose}>
      <div
        style={{ position: 'relative', width: '100%', maxWidth: '420px', background: 'var(--bg-elevated)', border: '1px solid var(--glass-border-strong)', borderRadius: '18px', boxShadow: 'var(--shadow-elevated)', padding: '24px 26px' }}
        onClick={e => e.stopPropagation()}
      >
        <button onClick={onClose} aria-label="Close" style={{ position: 'absolute', top: '16px', right: '16px', width: '30px', height: '30px', borderRadius: '50%', border: 'none', background: 'var(--glass-bg-strong)', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
          <X size={16} />
        </button>

        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '18px' }}>
          <span style={{ width: '40px', height: '40px', borderRadius: '12px', flexShrink: 0, background: 'rgba(124,58,237,0.18)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Pencil size={19} color="var(--primary-light)" />
          </span>
          <div>
            <h2 style={{ fontSize: '1.05rem', fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>Rename application</h2>
            <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', margin: '2px 0 0' }}>Give “{app.name}” a new name</p>
          </div>
        </div>

        {error && <div style={{ marginBottom: '12px', padding: '10px 12px', borderRadius: '10px', background: 'rgba(239,68,68,0.12)', border: '1px solid rgba(239,68,68,0.3)', color: '#fca5a5', fontSize: '0.82rem' }}>{error}</div>}

        <form onSubmit={submit}>
          <label style={labelStyle}>Name</label>
          <input
            ref={inputRef}
            value={name}
            onChange={e => setName(e.target.value)}
            maxLength={60}
            placeholder="Application name"
            className="os-rename-input"
            style={{ width: '100%', background: 'var(--bg-surface)', border: '1px solid var(--glass-border-strong)', borderRadius: '10px', padding: '11px 13px', color: 'var(--text-primary)', fontSize: '0.9rem', outline: 'none', marginBottom: '18px' }}
          />
          <div style={{ display: 'flex', gap: '10px' }}>
            <button type="button" onClick={onClose} style={{ flex: 1, padding: '10px', borderRadius: '12px', border: '1px solid var(--glass-border)', background: 'transparent', color: 'var(--text-secondary)', fontWeight: 600, cursor: 'pointer' }}>Cancel</button>
            <button type="submit" disabled={loading} style={{ flex: 1, padding: '10px', borderRadius: '12px', border: 'none', background: 'linear-gradient(135deg, var(--primary), var(--secondary))', color: '#fff', fontWeight: 700, cursor: loading ? 'not-allowed' : 'pointer', opacity: loading ? 0.6 : 1 }}>{loading ? 'Saving…' : 'Rename'}</button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default RenameAppModal;
