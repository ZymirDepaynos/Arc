import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';
import toast from 'react-hot-toast';

import { getToday, parseNaturalDate, formatDisplayDate } from '../utils/dateUtils';

const EMPTY_FORM = {
  name: '',
  balance: '',
  advance_payment: '',
  advance_payment_date: getToday(),
  advance_payment_date_text: formatDisplayDate(getToday()),
  current_balance: '',
  receipt_numbers: '',
  date_borrowed: getToday(),
  date_borrowed_text: formatDisplayDate(getToday()),
  notes: '',
  status: 'active',
};

export default function DebtorModal({ open, onClose, onSubmit, initial = null }) {
  const [form, setForm] = useState(EMPTY_FORM);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [dateParsed, setDateParsed] = useState(null); // null | 'ok' | 'error'
  const [advDateParsed, setAdvDateParsed] = useState(null);
  const notesRef = useRef(null);

  useEffect(() => {
    if (open) {
      setError(null);
      setDateParsed(null);
      setAdvDateParsed(null);
      if (initial) {
        setForm({
          name: initial.name || '',
          balance: initial.original_debt || initial.balance || '',
          advance_payment: initial.advance_payment || '',
          advance_payment_date: initial.advance_payment_date || getToday(),
          advance_payment_date_text: formatDisplayDate(initial.advance_payment_date || getToday()),
          current_balance: initial.balance || '',
          receipt_numbers: (initial.receipt_numbers && initial.receipt_numbers[0]) || '',
          date_borrowed: initial.date_borrowed || '',
          date_borrowed_text: formatDisplayDate(initial.date_borrowed),
          notes: initial.notes || '',
          status: initial.status || 'active',
        });
      } else {
        const today = getToday();
        setForm({ ...EMPTY_FORM, date_borrowed: today, date_borrowed_text: formatDisplayDate(today), advance_payment_date: today, advance_payment_date_text: formatDisplayDate(today) });
      }
    }
  }, [open, initial]);

  const set = (key, val) => {
    setError(null);
    setForm((f) => ({ ...f, [key]: val }));
  };

  // Smart date field change handler
  const handleDateText = (fieldText, fieldIso, setParsedState) => (e) => {
    const val = e.target.value;
    set(fieldText, val);
    const parsed = parseNaturalDate(val);
    if (val.trim() === '') {
      setParsedState(null);
      set(fieldIso, '');
    } else if (parsed === 'future_error') {
      setParsedState('future_error');
      set(fieldIso, '');
    } else if (parsed) {
      // Check if advance payment is before purchase date
      if (fieldIso === 'advance_payment_date' && form.date_borrowed && parsed < form.date_borrowed) {
        setParsedState('past_error');
        set(fieldIso, '');
      } else {
        setParsedState('ok');
        set(fieldIso, parsed);
      }
    } else {
      setParsedState('error');
      set(fieldIso, '');
    }
  };



  // Notes: auto-number list
  const handleNotesKeyDown = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      const textarea = notesRef.current;
      const { selectionStart, value } = textarea;
      // Determine next number
      const lines = value.substring(0, selectionStart).split('\n');
      const lastLine = lines[lines.length - 1];
      const match = lastLine.match(/^(\d+)\./);
      const nextNum = match ? parseInt(match[1]) + 1 : null;

      if (nextNum !== null) {
        const newValue = value.substring(0, selectionStart) + `\n${nextNum}. ` + value.substring(selectionStart);
        set('notes', newValue);
        setTimeout(() => {
          const newPos = selectionStart + `\n${nextNum}. `.length;
          textarea.setSelectionRange(newPos, newPos);
        }, 0);
      } else {
        const newValue = value.substring(0, selectionStart) + '\n' + value.substring(selectionStart);
        set('notes', newValue);
        setTimeout(() => {
          textarea.setSelectionRange(selectionStart + 1, selectionStart + 1);
        }, 0);
      }
    }
  };

  // Auto-start numbering when user types in empty notes
  const handleNotesChange = (e) => {
    let val = e.target.value;
    // If notes was empty and user starts typing, auto-prefix "1. "
    if (form.notes === '' && val.length > 0 && !val.startsWith('1.')) {
      val = '1. ' + val;
    }
    set('notes', val);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const rawBalance = parseFloat(form.balance || 0);
    const rawAdvance = parseFloat(form.advance_payment || 0);

    if (rawAdvance > rawBalance) {
      toast.error('Advance payment cannot be greater than the initial balance');
      return;
    }

    if (!initial && rawAdvance > 0 && !form.advance_payment_date) {
      toast.error('Please provide a valid date for the advance payment');
      return;
    }

    if (!form.date_borrowed) {
      toast.error('Please enter a valid Date of Purchase');
      return;
    }

    setLoading(true);
    setError(null);
    try {
      await onSubmit({
        ...form,
        receipt_numbers: form.receipt_numbers ? [form.receipt_numbers] : []
      });
      onClose();
    } catch (err) {
      console.error('Submission Error:', err);
      setError(err.response?.data?.error || err.message || 'Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  const dateHint = (parsedState, isoVal) => {
    if (parsedState === 'ok' && isoVal) {
      return <div style={{ fontSize: 11, color: 'var(--accent)', marginTop: 4, fontWeight: 600 }}>✓ {formatDisplayDate(isoVal)}</div>;
    }
    if (parsedState === 'future_error') {
      return <div style={{ fontSize: 11, color: '#ef4444', marginTop: 4 }}>Post-dated entries are not allowed</div>;
    }
    if (parsedState === 'past_error') {
      return <div style={{ fontSize: 11, color: '#ef4444', marginTop: 4 }}>Cannot be earlier than purchase date</div>;
    }
    if (parsedState === 'error') {
      return <div style={{ fontSize: 11, color: '#ef4444', marginTop: 4 }}>Could not detect date. Try "May 3, 2026"</div>;
    }
    return null;
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
        >
          <motion.div
            className="modal"
            initial={{ opacity: 0, scale: 0.95, y: 16 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 16 }}
            transition={{ duration: 0.2 }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="modal-header">
              <h2 className="modal-title">
                {initial ? 'Edit Customer' : 'Add New Customer'}
              </h2>
              <button className="btn-icon" onClick={onClose}>
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSubmit}>
              {error && (
                <div style={{ 
                  background: 'rgba(239, 68, 68, 0.1)', 
                  color: '#ef4444', 
                  padding: '12px', 
                  borderRadius: '8px', 
                  marginBottom: '16px',
                  fontSize: '14px',
                  border: '1px solid rgba(239, 68, 68, 0.2)'
                }}>
                  Error: {error}
                </div>
              )}
              <div className="form-grid">
                {/* Name */}
                <div className="form-group full floating-group">
                  <input
                    className="form-input"
                    type="text"
                    placeholder=" "
                    value={form.name}
                    onChange={(e) => set('name', e.target.value)}
                    required
                  />
                  <label className="floating-label">Full Name *</label>
                </div>

                {/* Balance */}
                <div className="form-group floating-group">
                  <input
                    className="form-input"
                    type="number"
                    min="0"
                    step="0.01"
                    placeholder=" "
                    onWheel={(e) => e.target.blur()}
                    value={form.balance}
                    onChange={(e) => {
                      const val = e.target.value;
                      setError(null);
                      setForm((f) => ({
                        ...f,
                        balance: val,
                        current_balance: Math.max(0, parseFloat(val || 0) - parseFloat(f.advance_payment || 0)).toFixed(2)
                      }));
                    }}
                    onBlur={(e) => {
                      if (e.target.value) set('balance', parseFloat(e.target.value).toFixed(2));
                    }}
                    required
                  />
                  <label className="floating-label">Initial Balance (₱) *</label>
                </div>

                {/* Date of Purchase — smart text input */}
                <div className="form-group floating-group">
                  <input
                    className="form-input"
                    type="text"
                    placeholder=" "
                    value={form.date_borrowed_text || ''}
                    onChange={handleDateText('date_borrowed_text', 'date_borrowed', setDateParsed)}
                    required
                  />
                  <label className="floating-label">Date of Purchase *</label>
                  {dateHint(dateParsed, form.date_borrowed)}
                </div>

                {/* Advance Payment */}
                <div className="form-group floating-group">
                  <input
                    className="form-input"
                    type="number"
                    min="0"
                    step="0.01"
                    placeholder=" "
                    onWheel={(e) => e.target.blur()}
                    value={form.advance_payment}
                    onChange={(e) => {
                      const val = e.target.value;
                      setError(null);
                      setForm((f) => ({
                        ...f,
                        advance_payment: val,
                        current_balance: Math.max(0, parseFloat(f.balance || 0) - parseFloat(val || 0)).toFixed(2)
                      }));
                    }}
                    onBlur={(e) => {
                      if (e.target.value) set('advance_payment', parseFloat(e.target.value).toFixed(2));
                    }}
                  />
                  <label className="floating-label">Advance Payment (₱)</label>
                  {parseFloat(form.advance_payment || 0) > 0 && (
                    <div style={{ 
                      fontSize: 12, 
                      color: 'var(--accent)', 
                      position: 'absolute',
                      bottom: -18,
                      left: 4,
                      fontWeight: 600,
                      whiteSpace: 'nowrap'
                    }}>
                      Balance: ₱{Math.max(0, parseFloat(form.balance || 0) - parseFloat(form.advance_payment || 0)).toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </div>
                  )}
                </div>

                {/* Advance Payment Date (ADD mode) — smart text input */}
                {!initial && (
                  <div className="form-group floating-group">
                    <input
                      className="form-input"
                      type="text"
                      placeholder=" "
                      value={form.advance_payment_date_text || ''}
                      onChange={handleDateText('advance_payment_date_text', 'advance_payment_date', setAdvDateParsed)}
                    />
                    <label className="floating-label">Advance Date</label>
                    {dateHint(advDateParsed, form.advance_payment_date)}
                  </div>
                )}

                {/* Current Balance (EDIT mode only) */}
                {initial && (
                  <div className="form-group floating-group">
                    <input
                      className="form-input"
                      type="number"
                      min="0"
                      step="0.01"
                      placeholder=" "
                      onWheel={(e) => e.target.blur()}
                      value={form.current_balance}
                      onChange={(e) => {
                        const val = e.target.value;
                        setError(null);
                        setForm((f) => ({
                          ...f,
                          current_balance: val,
                          advance_payment: Math.max(0, parseFloat(f.balance || 0) - parseFloat(val || 0)).toFixed(2)
                        }));
                      }}
                      onBlur={(e) => {
                        if (e.target.value) set('current_balance', parseFloat(e.target.value).toFixed(2));
                      }}
                    />
                    <label className="floating-label">Current Balance (₱)</label>
                  </div>
                )}

                {/* Advance Date (EDIT mode) — smart text input */}
                {initial && (
                  <div className="form-group floating-group">
                    <input
                      className="form-input"
                      type="text"
                      placeholder=" "
                      value={form.advance_payment_date_text || ''}
                      onChange={handleDateText('advance_payment_date_text', 'advance_payment_date', setAdvDateParsed)}
                    />
                    <label className="floating-label">Advance Date</label>
                    {dateHint(advDateParsed, form.advance_payment_date)}
                  </div>
                )}

                {/* Receipt Number */}
                <div className="form-group full floating-group">
                  <input
                    className="form-input"
                    type="text"
                    placeholder=" "
                    value={form.receipt_numbers}
                    onChange={(e) => set('receipt_numbers', e.target.value)}
                  />
                  <label className="floating-label">Receipt No.</label>
                </div>

                {/* Items Purchased — numbered list */}
                <div className="form-group full">
                  <label className="form-label">Items Purchased <span style={{ color: 'var(--text-muted)', fontWeight: 400 }}>(numbered list — press Enter for next item)</span></label>
                  <textarea
                    ref={notesRef}
                    className="form-textarea"
                    placeholder="1. Type your first item here..."
                    value={form.notes}
                    onChange={handleNotesChange}
                    onKeyDown={handleNotesKeyDown}
                    style={{ fontFamily: 'inherit', lineHeight: 1.7, minHeight: 100 }}
                  />
                </div>
              </div>

              {/* Footer */}
              <div style={{ display: 'flex', gap: 10, marginTop: 24 }}>
                <button
                  type="button"
                  className="btn btn-outline"
                  style={{ flex: 1 }}
                  onClick={onClose}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  style={{ flex: 2 }}
                  disabled={loading}
                >
                  {loading ? 'Saving...' : initial ? 'Save Changes' : 'Add Customer'}
                </button>
              </div>
            </form>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
