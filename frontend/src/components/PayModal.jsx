import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, CreditCard } from 'lucide-react';

const fmt = (n) =>
  '₱' + parseFloat(n || 0).toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const getToday = () => new Date().toLocaleDateString('en-CA');

const parseNaturalDate = (input) => {
  if (!input || !input.trim()) return null;
  const clean = input.trim();
  let parsedIso = null;
  
  if (/^\d{4}-\d{2}-\d{2}$/.test(clean)) {
    parsedIso = clean;
  } else {
    const direct = new Date(clean);
    if (!isNaN(direct.getTime())) {
      parsedIso = direct.toLocaleDateString('en-CA');
    } else {
      const monthNames = ['jan','feb','mar','apr','may','jun','jul','aug','sep','oct','nov','dec'];
      const m = clean.toLowerCase().replace(',', '').replace(/\s+/g, ' ').split(' ');
      if (m.length >= 3) {
        const monthIdx = monthNames.findIndex(mn => m[0].startsWith(mn));
        if (monthIdx !== -1) {
          const day = parseInt(m[1]);
          const year = parseInt(m[2]);
          if (!isNaN(day) && !isNaN(year)) {
            const d = new Date(year, monthIdx, day);
            if (!isNaN(d.getTime())) parsedIso = d.toLocaleDateString('en-CA');
          }
        }
      }
    }
  }

  if (parsedIso) {
    if (parsedIso > getToday()) return 'future_error';
    return parsedIso;
  }
  return null;
};

const formatDisplayDate = (isoDate) => {
  if (!isoDate) return '';
  const d = new Date(isoDate + 'T12:00:00');
  if (isNaN(d.getTime())) return isoDate;
  return d.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
};

export default function PayModal({ open, onClose, debtor, onPay }) {
  const [amount, setAmount] = useState('');
  const [date, setDate] = useState(getToday());
  const [dateText, setDateText] = useState(formatDisplayDate(getToday()));
  const [dateParsed, setDateParsed] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (open) {
      setAmount('');
      setDate(getToday());
      setDateText(formatDisplayDate(getToday()));
      setDateParsed(null);
      setLoading(false);
    }
  }, [open, debtor]);

  const handlePay = async () => {
    const payAmt = parseFloat(amount);
    if (!amount || payAmt <= 0 || !date) return;
    setLoading(true);
    try {
      await onPay(debtor.id, payAmt, date);
      onClose();
    } finally {
      setLoading(false);
    }
  };

  const handleDateText = (e) => {
    const val = e.target.value;
    setDateText(val);
    const parsed = parseNaturalDate(val);
    if (val.trim() === '') {
      setDateParsed(null);
      setDate('');
    } else if (parsed === 'future_error') {
      setDateParsed('future_error');
      setDate('');
    } else if (parsed) {
      if (debtor.date_borrowed && parsed < debtor.date_borrowed) {
        setDateParsed('past_error');
        setDate('');
      } else {
        setDateParsed('ok');
        setDate(parsed);
      }
    } else {
      setDateParsed('error');
      setDate('');
    }
  };

  const dateHint = (parsedState, isoVal) => {
    const baseStyle = {
      fontSize: 11,
      position: 'absolute',
      bottom: -18,
      left: 4,
      fontWeight: 600,
      whiteSpace: 'nowrap',
      zIndex: 5
    };

    if (parsedState === 'ok' && isoVal) {
      return <div style={{ ...baseStyle, color: 'var(--accent)' }}>✓ {formatDisplayDate(isoVal)}</div>;
    }
    if (parsedState === 'future_error') {
      return <div style={{ ...baseStyle, color: '#ef4444' }}>Post-dated entries are not allowed</div>;
    }
    if (parsedState === 'past_error') {
      return <div style={{ ...baseStyle, color: '#ef4444' }}>Cannot be earlier than purchase date</div>;
    }
    if (parsedState === 'error') {
      return <div style={{ ...baseStyle, color: '#ef4444' }}>Could not detect date. Try "May 3, 2026"</div>;
    }
    return null;
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
            style={{ maxWidth: 400 }}
            initial={{ opacity: 0, scale: 0.95, y: 16 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 16 }}
            transition={{ duration: 0.2 }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="modal-header">
              <h2 className="modal-title">Record Payment</h2>
              <button className="btn-icon" onClick={onClose}><X size={18} /></button>
            </div>

            <div style={{ marginBottom: 20 }}>
              <div style={{ fontSize: 14, color: 'var(--text-secondary)', marginBottom: 4 }}>
                Customer
              </div>
              <div style={{ fontWeight: 700, fontSize: 16 }}>{debtor.name}</div>
              <div style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 2 }}>
                Outstanding: <span style={{ color: '#DC2626', fontWeight: 700 }}>{fmt(debtor.balance)}</span>
              </div>
            </div>

            <div className="form-group" style={{ marginBottom: 20 }}>
              <label className="form-label">Payment Amount (₱)</label>
              <input
                className="form-input"
                type="number"
                min="0.01"
                max={debtor.balance}
                step="0.01"
                placeholder="0.00"
                onWheel={(e) => e.target.blur()}
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                onBlur={(e) => {
                  if (e.target.value) setAmount(parseFloat(e.target.value).toFixed(2));
                }}
                autoFocus
              />
            </div>
            
            <div className="form-group floating-group" style={{ marginBottom: 20 }}>
              <input
                className="form-input"
                type="text"
                placeholder=" "
                value={dateText}
                onChange={handleDateText}
              />
              <label className="floating-label">Payment Date</label>
              {dateHint(dateParsed, date)}
            </div>

            <div style={{ display: 'flex', gap: 10 }}>
              <button className="btn btn-outline" style={{ flex: 1 }} onClick={onClose}>
                Cancel
              </button>
              <button
                className="btn btn-primary"
                style={{ flex: 2 }}
                onClick={handlePay}
                disabled={loading || !amount || !date}
              >
                <CreditCard size={14} />
                {loading ? 'Recording...' : 'Record Payment'}
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
