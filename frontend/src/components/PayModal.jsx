import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, CreditCard, Calendar } from 'lucide-react';
import toast from 'react-hot-toast';
import { getToday, parseNaturalDate as parseNaturalDateUtil, formatDisplayDate } from '../utils/dateUtils';

const fmt = (n) =>
  '₱' + parseFloat(n || 0).toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

// Wrap shared parseNaturalDate to add future-date validation
const parseNaturalDate = (input) => {
  const parsed = parseNaturalDateUtil(input);
  if (!parsed) return input?.trim() ? null : null;
  if (parsed > getToday()) return 'future_error';
  return parsed;
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
    if (!amount || isNaN(payAmt) || payAmt <= 0) {
      toast.error('Payment amount must be greater than ₱0');
      return;
    }
    const currentBalance = parseFloat(debtor.balance || 0);
    if (payAmt > currentBalance) {
      toast.error('Payment cannot exceed remaining balance (' + fmt(currentBalance) + ')');
      return;
    }
    if (!date) {
      toast.error('Please enter a valid payment date');
      return;
    }
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
                min="1"
                max={debtor.balance}
                step="1"
                placeholder="0"
                onWheel={(e) => e.target.blur()}
                onKeyDown={(e) => ['e','E','+','-','.'].includes(e.key) && e.preventDefault()}
                value={amount}
                onChange={(e) => setAmount(e.target.value.replace(/[^0-9]/g, ''))}
                onBlur={(e) => {
                  if (e.target.value) setAmount(parseInt(e.target.value));
                }}
                autoFocus
              />
            </div>
            
            <div className="form-group floating-group" style={{ marginBottom: 20 }}>
              <div style={{ position: 'relative' }}>
                <input
                  className="form-input"
                  type="text"
                  placeholder=" "
                  value={dateText}
                  onChange={handleDateText}
                  style={{ paddingRight: 40 }}
                />
                <label className="floating-label">Payment Date</label>
                <input
                  type="date"
                  value={date || ''}
                  onChange={(e) => {
                    const val = e.target.value;
                    if (val > getToday()) {
                      setDateParsed('future_error');
                      setDate('');
                    } else if (debtor.date_borrowed && val < debtor.date_borrowed) {
                      setDateParsed('past_error');
                      setDate('');
                    } else {
                      setDate(val);
                      setDateText(formatDisplayDate(val));
                      setDateParsed('ok');
                    }
                  }}
                  style={{
                    position: 'absolute',
                    right: 12,
                    top: '50%',
                    transform: 'translateY(-50%)',
                    opacity: 0,
                    width: 24,
                    height: 24,
                    cursor: 'pointer',
                    zIndex: 10
                  }}
                />
                <Calendar 
                  size={18} 
                  color="var(--text-muted)" 
                  style={{
                    position: 'absolute',
                    right: 15,
                    top: '50%',
                    transform: 'translateY(-50%)',
                    pointerEvents: 'none'
                  }}
                />
              </div>
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
