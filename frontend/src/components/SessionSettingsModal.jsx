import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Timer, Check } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../lib/api';

const OPTIONS = [
  { label: '5 minutes', ms: 5 * 60 * 1000 },
  { label: '15 minutes', ms: 15 * 60 * 1000 },
  { label: '30 minutes', ms: 30 * 60 * 1000 },
  { label: '1 hour', ms: 60 * 60 * 1000 },
  { label: '2 hours', ms: 2 * 60 * 60 * 1000 },
  { label: 'Never', ms: 0 },
];

export default function SessionSettingsModal({ open, onClose, onUpdate }) {
  const [current, setCurrent] = useState(30 * 60 * 1000);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    const loadSetting = async () => {
      try {
        const cached = localStorage.getItem('arc_session_timeout');
        if (cached !== null) setCurrent(parseInt(cached, 10));
        const res = await api.get('/api/settings/session_timeout');
        const saved = parseInt(res.data?.value, 10);
        if (!isNaN(saved)) setCurrent(saved);
      } catch (e) {
        if (e.response?.status !== 404) console.error(e);
      }
    };
    loadSetting();
  }, [open]);

  const handleSelect = async (ms) => {
    setSaving(true);
    try {
      await onUpdate(ms);
      setCurrent(ms);
      const label = OPTIONS.find(o => o.ms === ms)?.label || 'Never';
      toast.success(`Session timeout set to ${label}`);
      onClose();
    } catch (e) {
      toast.error('Failed to save setting');
    } finally {
      setSaving(false);
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
          onClick={onClose}
          style={{ zIndex: 1000 }}
        >
          <motion.div
            className="modal"
            style={{ maxWidth: 400, padding: 32 }}
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{
                  width: 44, height: 44, borderRadius: 12,
                  background: 'var(--accent-light)', color: 'var(--accent)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  <Timer size={22} />
                </div>
                <div>
                  <h2 style={{ fontSize: 18, fontWeight: 800, margin: 0 }}>Session Timeout</h2>
                  <p style={{ fontSize: 12, color: 'var(--text-muted)', margin: 0, marginTop: 2 }}>Auto-logout after inactivity</p>
                </div>
              </div>
              <button
                onClick={onClose}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', padding: 4, borderRadius: 8 }}
              >
                <X size={18} />
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {OPTIONS.map((opt) => {
                const isSelected = current === opt.ms;
                return (
                  <button
                    key={opt.ms}
                    disabled={saving}
                    onClick={() => handleSelect(opt.ms)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '14px 16px',
                      borderRadius: 12,
                      border: `1px solid ${isSelected ? 'var(--accent)' : 'var(--border)'}`,
                      background: isSelected ? 'var(--accent-light)' : 'transparent',
                      color: isSelected ? 'var(--accent)' : 'var(--text-primary)',
                      cursor: saving ? 'not-allowed' : 'pointer',
                      fontFamily: 'inherit',
                      fontSize: 14,
                      fontWeight: isSelected ? 700 : 500,
                      transition: 'all 0.2s ease',
                    }}
                  >
                    <span>{opt.label}</span>
                    {isSelected && <Check size={16} />}
                  </button>
                );
              })}
            </div>

            <p style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 16, textAlign: 'center', lineHeight: 1.5 }}>
              This setting is saved to your account and will apply on all devices and browsers.
            </p>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
