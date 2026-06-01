import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Settings, Eye, EyeOff, KeyRound } from 'lucide-react';
import { changePassword } from '../utils/auth';
import toast from 'react-hot-toast';

// ── Defined OUTSIDE the component so React never recreates it on re-render ──
function PwField({ label, value, onChange, show, onToggle, onClearError }) {
  return (
    <div className="form-group floating-group" style={{ position: 'relative' }}>
      <input
        className="form-input"
        type={show ? 'text' : 'password'}
        placeholder=" "
        value={value}
        onChange={e => { onChange(e.target.value); onClearError(); }}
        style={{ paddingRight: 44 }}
        required
        autoComplete="off"
      />
      <label className="floating-label">{label}</label>
      <button
        type="button"
        tabIndex={-1}
        onClick={onToggle}
        style={{
          position: 'absolute', right: 12, top: '50%',
          transform: 'translateY(-50%)',
          background: 'none', border: 'none',
          cursor: 'pointer', color: 'var(--text-muted)', padding: 4
        }}
      >
        {show ? <EyeOff size={16} /> : <Eye size={16} />}
      </button>
    </div>
  );
}

export default function SettingsModal({ open, onClose }) {
  const [currentPw, setCurrentPw] = useState('');
  const [newPw,     setNewPw]     = useState('');
  const [confirmPw, setConfirmPw] = useState('');
  const [showCur,   setShowCur]   = useState(false);
  const [showNew,   setShowNew]   = useState(false);
  const [showConf,  setShowConf]  = useState(false);
  const [error,     setError]     = useState('');
  const [loading,   setLoading]   = useState(false);

  const clearError = () => setError('');

  const reset = () => {
    setCurrentPw(''); setNewPw(''); setConfirmPw('');
    setShowCur(false); setShowNew(false); setShowConf(false);
    setError('');
  };

  const handleClose = () => { reset(); onClose(); };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (newPw.length < 6) {
      setError('New password must be at least 6 characters.'); return;
    }
    if (newPw !== confirmPw) {
      setError('New passwords do not match.'); return;
    }
    if (newPw === currentPw) {
      setError('New password must be different from the current one.'); return;
    }

    setLoading(true);
    const result = await changePassword(currentPw, newPw);
    setLoading(false);

    if (result.success) {
      toast.success('Password updated successfully!');
      reset();
      onClose();
    } else if (result.locked) {
      setError(`Too many failed attempts. Try again in ${result.remaining}s.`);
    } else {
      setError('Current password is incorrect.');
    }
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="modal-overlay"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={handleClose}
          style={{ zIndex: 10000 }}
        >
          <motion.div
            className="modal"
            initial={{ opacity: 0, scale: 0.95, y: 16 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 16 }}
            transition={{ duration: 0.2 }}
            onClick={e => e.stopPropagation()}
            style={{ maxWidth: 440, width: '100%' }}
          >
            {/* Header */}
            <div className="modal-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{
                  width: 36, height: 36, borderRadius: 10,
                  background: 'var(--accent-light)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center'
                }}>
                  <Settings size={18} color="var(--accent)" />
                </div>
                <h2 className="modal-title">Settings</h2>
              </div>
              <button className="btn-icon" onClick={handleClose}><X size={18} /></button>
            </div>

            {/* Section label */}
            <div style={{
              display: 'flex', alignItems: 'center', gap: 8,
              fontSize: 11, fontWeight: 700, color: 'var(--text-muted)',
              textTransform: 'uppercase', letterSpacing: '0.08em',
              marginBottom: 20, paddingBottom: 12,
              borderBottom: '1px solid var(--border)'
            }}>
              <KeyRound size={13} />
              Change Password
            </div>

            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <PwField
                label="Current Password"
                value={currentPw}
                onChange={setCurrentPw}
                show={showCur}
                onToggle={() => setShowCur(v => !v)}
                onClearError={clearError}
              />
              <PwField
                label="New Password (min. 6 characters)"
                value={newPw}
                onChange={setNewPw}
                show={showNew}
                onToggle={() => setShowNew(v => !v)}
                onClearError={clearError}
              />
              <PwField
                label="Confirm New Password"
                value={confirmPw}
                onChange={setConfirmPw}
                show={showConf}
                onToggle={() => setShowConf(v => !v)}
                onClearError={clearError}
              />

              <AnimatePresence>
                {error && (
                  <motion.div
                    initial={{ opacity: 0, y: -4 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    style={{ fontSize: 13, color: '#ef4444', fontWeight: 600 }}
                  >
                    {error}
                  </motion.div>
                )}
              </AnimatePresence>

              <div style={{ display: 'flex', gap: 10, marginTop: 4 }}>
                <button type="button" className="btn btn-outline" style={{ flex: 1 }} onClick={handleClose}>
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  style={{ flex: 2 }}
                  disabled={loading || !currentPw || !newPw || !confirmPw}
                >
                  {loading ? 'Updating…' : 'Update Password'}
                </button>
              </div>
            </form>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
