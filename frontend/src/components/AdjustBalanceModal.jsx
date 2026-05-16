import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Settings2 } from 'lucide-react';

const fmt = (n) =>
  '₱' + parseFloat(n || 0).toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export default function AdjustBalanceModal({ open, onClose, debtor, onAdjust }) {
  const [newBalance, setNewBalance] = useState('');
  const [reason, setReason] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (open && debtor) {
      setNewBalance(debtor.balance || '');
      setReason('');
      setLoading(false);
    }
  }, [open, debtor]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!newBalance || !reason.trim()) return;
    setLoading(true);
    try {
      await onAdjust(debtor.id, parseFloat(newBalance), reason.trim());
      onClose();
    } finally {
      setLoading(false);
    }
  };

  return (
    <AnimatePresence>
      {open && debtor && (
        <motion.div
          className="modal-overlay"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
        >
          <motion.div
            className="modal"
            style={{ maxWidth: 450 }}
            initial={{ opacity: 0, scale: 0.95, y: 16 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 16 }}
            transition={{ duration: 0.2 }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="modal-header" style={{ marginBottom: 24 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{ background: 'var(--accent-light)', color: 'var(--accent)', padding: 10, borderRadius: 12 }}>
                  <Settings2 size={24} />
                </div>
                <div>
                  <h2 style={{ fontSize: 20, margin: 0, fontWeight: 800 }}>Adjust Balance</h2>
                  <p style={{ margin: 0, fontSize: 13, color: 'var(--text-muted)' }}>Manual ledger correction</p>
                </div>
              </div>
              <button className="btn-icon-sm" onClick={onClose}>
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSubmit}>
              <div className="form-grid" style={{ gridTemplateColumns: '1fr', gap: 24 }}>
                
                <div className="form-group floating-group">
                  <input
                    className="form-input"
                    type="text"
                    value={fmt(debtor.balance)}
                    readOnly
                    disabled
                    style={{ background: 'rgba(0,0,0,0.02)', color: 'var(--text-muted)' }}
                  />
                  <label className="floating-label">Current Balance (Read-Only)</label>
                </div>

                <div className="form-group floating-group">
                  <input
                    className="form-input"
                    type="number"
                    min="0"
                    step="0.01"
                    placeholder=" "
                    required
                    onWheel={(e) => e.target.blur()}
                    value={newBalance}
                    onChange={(e) => setNewBalance(e.target.value)}
                  />
                  <label className="floating-label">New Corrected Balance (₱) *</label>
                </div>

                <div className="form-group full floating-group">
                  <textarea
                    className="form-input form-textarea"
                    placeholder=" "
                    rows={3}
                    required
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    style={{ resize: 'none' }}
                  />
                  <label className="floating-label">Reason for Adjustment *</label>
                </div>
                
              </div>

              <div className="modal-actions" style={{ marginTop: 32 }}>
                <button type="button" className="btn btn-outline" onClick={onClose} disabled={loading}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary" disabled={loading || !newBalance || !reason.trim() || parseFloat(newBalance) === debtor.balance}>
                  {loading ? 'Saving...' : 'Apply Adjustment'}
                </button>
              </div>
            </form>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
