import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Timer, Check } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../lib/api';

const PRESETS = [
  { label: '5 min', ms: 5 * 60 * 1000 },
  { label: '15 min', ms: 15 * 60 * 1000 },
  { label: '30 min', ms: 30 * 60 * 1000 },
  { label: '1 hr', ms: 60 * 60 * 1000 },
  { label: '2 hr', ms: 2 * 60 * 60 * 1000 },
  { label: 'Never', ms: 0 },
];

const msToMinutes = (ms) => ms > 0 ? Math.round(ms / 60000) : '';

const formatDisplay = (ms) => {
  if (ms === 0) return 'Never';
  const mins = Math.round(ms / 60000);
  if (mins < 60) return `${mins} minute${mins !== 1 ? 's' : ''}`;
  const hrs = Math.floor(mins / 60);
  const rem = mins % 60;
  if (rem === 0) return `${hrs} hour${hrs !== 1 ? 's' : ''}`;
  return `${hrs}h ${rem}m`;
};

export default function SessionSettingsModal({ open, onClose, onUpdate }) {
  const [current, setCurrent] = useState(30 * 60 * 1000);
  const [customValue, setCustomValue] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    const loadSetting = async () => {
      try {
        const cached = localStorage.getItem('arc_session_timeout');
        if (cached !== null) {
          const val = parseInt(cached, 10);
          setCurrent(val);
          setCustomValue(msToMinutes(val));
        }
        const res = await api.get('/api/settings/session_timeout');
        const saved = parseInt(res.data?.value, 10);
        if (!isNaN(saved)) {
          setCurrent(saved);
          setCustomValue(msToMinutes(saved));
        }
      } catch (e) {
        if (e.response?.status !== 404) console.error(e);
      }
    };
    loadSetting();
  }, [open]);

  const applyTimeout = async (ms) => {
    setSaving(true);
    try {
      await onUpdate(ms);
      setCurrent(ms);
      setCustomValue(msToMinutes(ms));
      toast.success(`Session timeout set to ${formatDisplay(ms)}`);
      onClose();
    } catch (e) {
      toast.error('Failed to save setting');
    } finally {
      setSaving(false);
    }
  };

  const handleCustomSubmit = () => {
    const mins = parseInt(customValue, 10);
    if (isNaN(mins) || mins < 1) {
      toast.error('Enter at least 1 minute');
      return;
    }
    if (mins > 1440) {
      toast.error('Maximum is 1440 minutes (24 hours)');
      return;
    }
    applyTimeout(mins * 60 * 1000);
  };

  const isCustom = current > 0 && !PRESETS.some(p => p.ms === current);

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
            style={{ maxWidth: 420, padding: 32 }}
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

            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 20 }}>
              {PRESETS.map((opt) => {
                const isSelected = current === opt.ms;
                return (
                  <button
                    key={opt.ms}
                    disabled={saving}
                    onClick={() => applyTimeout(opt.ms)}
                    style={{
                      padding: '10px 16px',
                      borderRadius: 10,
                      border: `1px solid ${isSelected ? 'var(--accent)' : 'var(--border)'}`,
                      background: isSelected ? 'var(--accent-light)' : 'transparent',
                      color: isSelected ? 'var(--accent)' : 'var(--text-primary)',
                      cursor: saving ? 'not-allowed' : 'pointer',
                      fontFamily: 'inherit',
                      fontSize: 13,
                      fontWeight: isSelected ? 700 : 500,
                      transition: 'all 0.2s ease',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 6,
                    }}
                  >
                    {opt.label}
                    {isSelected && <Check size={14} />}
                  </button>
                );
              })}
            </div>

            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              marginBottom: 8,
            }}>
              <div style={{ flex: 1, height: 1, background: 'var(--border)' }} />
              <span style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>or set custom</span>
              <div style={{ flex: 1, height: 1, background: 'var(--border)' }} />
            </div>

            <div style={{ display: 'flex', gap: 10, alignItems: 'center', marginTop: 12 }}>
              <div style={{ position: 'relative', flex: 1 }}>
                <input
                  type="number"
                  min={1}
                  max={1440}
                  value={customValue}
                  onChange={(e) => setCustomValue(e.target.value.replace(/[^0-9]/g, ''))}
                  onKeyDown={(e) => {
                    if (['e', 'E', '+', '-', '.'].includes(e.key)) e.preventDefault();
                    if (e.key === 'Enter') handleCustomSubmit();
                  }}
                  placeholder="e.g. 45"
                  style={{
                    width: '100%',
                    height: 48,
                    padding: '0 80px 0 16px',
                    borderRadius: 12,
                    border: `1px solid ${isCustom ? 'var(--accent)' : 'var(--border)'}`,
                    background: isCustom ? 'var(--accent-light)' : 'var(--glass-bg)',
                    color: 'var(--text-primary)',
                    fontFamily: 'inherit',
                    fontSize: 15,
                    fontWeight: 700,
                    outline: 'none',
                    transition: 'all 0.2s ease',
                    MozAppearance: 'textfield',
                  }}
                />
                <span style={{
                  position: 'absolute',
                  right: 16,
                  top: '50%',
                  transform: 'translateY(-50%)',
                  fontSize: 12,
                  fontWeight: 600,
                  color: 'var(--text-muted)',
                  pointerEvents: 'none',
                }}>
                  minutes
                </span>
              </div>
              <button
                className="btn btn-primary"
                disabled={saving || !customValue}
                onClick={handleCustomSubmit}
                style={{
                  height: 48,
                  padding: '0 20px',
                  borderRadius: 12,
                  fontSize: 13,
                  fontWeight: 700,
                  whiteSpace: 'nowrap',
                }}
              >
                Apply
              </button>
            </div>

            {isCustom && (
              <div style={{
                marginTop: 12,
                padding: '8px 12px',
                borderRadius: 8,
                background: 'var(--accent-light)',
                fontSize: 12,
                fontWeight: 600,
                color: 'var(--accent)',
                textAlign: 'center',
              }}>
                Current: {formatDisplay(current)}
              </div>
            )}

            <p style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 16, textAlign: 'center', lineHeight: 1.5 }}>
              This setting is saved to your account and persists across all devices and browsers.
            </p>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
