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

const DeleteConfirmModal: React.FC<DeleteConfirmModalProps> = ({ 
  isOpen, 
  appId, 
  appName, 
  onClose, 
  onDeleted 
}) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  if (!isOpen || !appId) return null;

  const handleDelete = async () => {
    setLoading(true);
    setError('');

    try {
      const token = localStorage.getItem('token');
      await api.delete(`apps/${appId}`, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });
      onDeleted();
      onClose();
    } catch (err: any) {
      console.error('Failed to delete app:', err);
      setError(err.response?.data?.detail || 'Failed to delete application. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-modal flex items-center justify-center p-6 bg-bg-deep/95 backdrop-blur-xl">
      <div className="login-card w-full max-w-md relative animate-in fade-in zoom-in duration-500 border-red-500/20 shadow-[0_0_80px_rgba(239,68,68,0.2)] !p-10">
        <button 
          onClick={onClose}
          className="absolute top-6 right-6 text-text-muted hover:text-white hover:scale-110 transition-all duration-300 bg-white/5 p-2 rounded-full"
        >
          <X size={20} />
        </button>

        <div className="flex flex-col items-center text-center mb-8">
          <div className="w-16 h-16 rounded-full bg-red-500/10 flex items-center justify-center mb-5">
            <AlertTriangle size={32} className="text-red-400" />
          </div>
          <h2 className="text-2xl font-bold mb-2 tracking-tight">Delete Application</h2>
          <p className="text-text-muted">
            Are you sure you want to delete <span className="text-white font-semibold">{appName}</span>? This action cannot be undone.
          </p>
        </div>

        {error && (
          <div className="error-message mb-6 animate-shake">
            {error}
          </div>
        )}

        <div className="flex gap-4">
          <button 
            onClick={onClose}
            className="flex-1 py-3 px-6 rounded-xl font-semibold text-sm uppercase tracking-wider bg-white/5 hover:bg-white/10 border border-glass-border transition-all"
            disabled={loading}
          >
            Cancel
          </button>
          <button 
            onClick={handleDelete}
            className="flex-1 py-3 px-6 rounded-xl font-semibold text-sm uppercase tracking-wider bg-red-500/20 hover:bg-red-500/30 text-red-400 border border-red-500/30 transition-all flex items-center justify-center gap-2"
            disabled={loading}
          >
            {loading ? (
              <>
                <div className="spinner w-4 h-4 border-2 !border-t-red-400"></div>
                Deleting...
              </>
            ) : (
              <>
                <Trash2 size={16} />
                Delete
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default DeleteConfirmModal;
