import React, { useState } from 'react';
import { X, Trash2, AlertTriangle } from 'lucide-react';
import api from '../services/api';

interface DeleteConfirmModalProps {
  isOpen: boolean;
  appId: number | null;
  appName: string;
  onClose: () => void;
  onDeleted: () => void;
}

const DeleteConfirmModal: React.FC<DeleteConfirmModalProps> = ({ isOpen, appId, appName, onClose, onDeleted }) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Early return after hooks
  if (!isOpen || !appId) return null;

  const handleDelete = async () => {
    setLoading(true);
    setError('');

    try {
      const token = localStorage.getItem('token');
      await api.delete(`apps/${appId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      onDeleted();
      onClose();
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to delete application.');
    } finally {
      setLoading(false);
    }
  };

  // Inline styles + CSS vars (theme-aware): the project ships a CSS-class SUBSET,
  // not full Tailwind, so utility classes like text-white / bg-red-500/10 silently
  // did nothing and left the card dark-only. Scrim matches the Add/Edit dialogs.
  return (
    <div
      style={{ position: 'fixed', inset: 0, zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px', background: 'rgba(8, 10, 20, 0.34)', backdropFilter: 'blur(3px)' }}
      onClick={onClose}
    >
      <div
        style={{ position: 'relative', width: '100%', maxWidth: '440px', background: 'var(--bg-elevated)', border: '1px solid rgba(239, 68, 68, 0.28)', borderRadius: '18px', boxShadow: 'var(--shadow-elevated)', padding: '28px 30px' }}
        onClick={e => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          aria-label="Close"
          style={{ position: 'absolute', top: '16px', right: '16px', width: '30px', height: '30px', borderRadius: '50%', border: 'none', background: 'var(--glass-bg-strong)', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
        >
          <X size={16} />
        </button>

        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', marginBottom: '22px' }}>
          <div style={{ width: '56px', height: '56px', borderRadius: '50%', background: 'rgba(239, 68, 68, 0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '16px' }}>
            <AlertTriangle size={28} color="var(--error)" />
          </div>
          <h2 style={{ fontSize: '1.15rem', fontWeight: 700, color: 'var(--text-primary)', margin: '0 0 8px' }}>Delete Application</h2>
          <p style={{ fontSize: '0.86rem', color: 'var(--text-muted)', margin: 0 }}>
            Are you sure you want to delete <span style={{ color: 'var(--text-primary)', fontWeight: 600 }}>{appName}</span>?
          </p>
        </div>

        {error && <div style={{ marginBottom: '16px', padding: '10px 13px', borderRadius: '10px', background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.3)', color: 'var(--error)', fontSize: '0.83rem', textAlign: 'center' }}>{error}</div>}

        <div style={{ display: 'flex', gap: '10px' }}>
          <button onClick={onClose} disabled={loading} style={{ flex: 1, padding: '11px', borderRadius: '12px', border: '1px solid var(--glass-border)', background: 'transparent', color: 'var(--text-secondary)', fontWeight: 600, cursor: loading ? 'not-allowed' : 'pointer' }}>
            Cancel
          </button>
          <button onClick={handleDelete} disabled={loading} style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', padding: '11px', borderRadius: '12px', border: '1px solid rgba(239, 68, 68, 0.35)', background: 'rgba(239, 68, 68, 0.16)', color: 'var(--error)', fontWeight: 700, cursor: loading ? 'not-allowed' : 'pointer', opacity: loading ? 0.6 : 1 }}>
            {loading ? 'Deleting…' : <><Trash2 size={16} /> Delete</>}
          </button>
        </div>
      </div>
    </div>
  );
};

export default DeleteConfirmModal;
