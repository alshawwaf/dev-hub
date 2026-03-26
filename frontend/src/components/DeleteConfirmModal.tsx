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

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-6"
      style={{ backgroundColor: 'rgba(0,0,0,0.9)' }}
      onClick={onClose}
    >
      <div 
        className="bg-bg-card w-full max-w-md relative rounded-2xl border border-red-500/20 p-8"
        onClick={e => e.stopPropagation()}
      >
        <button 
          onClick={onClose}
          className="absolute top-4 right-4 text-text-muted hover:text-white p-2 rounded-full bg-white/5"
        >
          <X size={18} />
        </button>

        <div className="flex flex-col items-center text-center mb-6">
          <div className="w-14 h-14 rounded-full bg-red-500/10 flex items-center justify-center mb-4">
            <AlertTriangle size={28} className="text-red-400" />
          </div>
          <h2 className="text-xl font-bold mb-2">Delete Application</h2>
          <p className="text-text-muted text-sm">
            Are you sure you want to delete <span className="text-white font-semibold">{appName}</span>?
          </p>
        </div>

        {error && <div className="bg-red-500/10 border border-red-500/30 text-red-400 p-3 rounded-lg mb-4 text-sm text-center">{error}</div>}

        <div className="flex gap-3">
          <button onClick={onClose} disabled={loading} className="flex-1 py-3 px-4 rounded-xl font-semibold bg-white/5 hover:bg-white/10 border border-glass-border">
            Cancel
          </button>
          <button onClick={handleDelete} disabled={loading} className="flex-1 py-3 px-4 rounded-xl font-semibold bg-red-500/20 hover:bg-red-500/30 text-red-400 border border-red-500/30 flex items-center justify-center gap-2">
            {loading ? 'Deleting...' : <><Trash2 size={16} /> Delete</>}
          </button>
        </div>
      </div>
    </div>
  );
};

export default DeleteConfirmModal;
