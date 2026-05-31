import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Trash2, Calendar as CalendarIcon } from 'lucide-react';
import toast from 'react-hot-toast';

import { getToday, parseNaturalDate, formatDisplayDate } from '../utils/dateUtils';

const EMPTY_FORM = {
  name: '',
  balance: '',
  advance_payment: '',
  advance_payment_date: '',
  advance_payment_date_text: '',
  current_balance: '',
  receipt_numbers: '',
  date_borrowed: getToday(),
  date_borrowed_text: formatDisplayDate(getToday()),
  status: 'active',
};

// Parse stored notes back into an items array
function parseItems(notes) {
  if (!notes) return [];
  try {
    const parsed = JSON.parse(notes);
    if (Array.isArray(parsed)) return parsed;
  } catch (_) { /* not JSON — legacy plain text */ }
  // Legacy: treat each non-empty line as an item
  return notes.split('\n').map(l => l.replace(/^\d+\.\s*/, '').trim()).filter(Boolean);
}

export default function DebtorModal({ open, onClose, onSubmit, initial = null }) {
  const [form, setForm] = useState(EMPTY_FORM);
  const [items, setItems] = useState([]);
  const [itemInput, setItemInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [dateParsed, setDateParsed] = useState(null);
  const [advDateParsed, setAdvDateParsed] = useState(null);

  useEffect(() => {
    if (open) {
      setError(null);
      setDateParsed(null);
      setAdvDateParsed(null);
      setItemInput('');
      if (initial) {
        setForm({
          name: initial.name || '',
          balance: initial.original_debt || initial.balance || '',
          advance_payment: initial.advance_payment || '',
          advance_payment_date: initial.advance_payment_date || '',
          advance_payment_date_text: initial.advance_payment_date ? formatDisplayDate(initial.advance_payment_date) : '',
          current_balance: initial.balance || '',
          receipt_numbers: (initial.receipt_numbers && initial.receipt_numbers[0]) || '',
          date_borrowed: initial.date_borrowed || '',
          date_borrowed_text: formatDisplayDate(initial.date_borrowed),
          status: initial.status || 'active',
        });
        setItems(parseItems(initial.notes));
      } else {
        const today = getToday();
        setForm({ ...EMPTY_FORM, date_borrowed: today, date_borrowed_text: formatDisplayDate(today) });
        setItems([]);
      }
    }
  }, [open, initial]);

  const set = (key, val) => {
    setError(null);
    setForm((f) => ({ ...f, [key]: val }));
  };

  const handleDateText = (fieldText, fieldIso, setParsedState) => (e) => {
    const val = e.target.value;
    set(fieldText, val);
    const parsed = parseNaturalDate(val);
    if (val.trim() === '') {
      setParsedState(null);
      set(fieldIso, '');
    } else if (parsed) {
      if (fieldIso === 'advance_payment_date' && form.date_borrowed && parsed < form.date_borrowed) {
        setParsedState('past_error');
        set(fieldIso, '');
      } else if (fieldIso === 'date_borrowed' && form.advance_payment_date && parsed > form.advance_payment_date) {
        setParsedState('limit_error');
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

  // Items Purchased — Enter to add
  const handleItemKeyDown = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      const trimmed = itemInput.trim();
      if (!trimmed) return;
      setItems(prev => [...prev, trimmed]);
      setItemInput('');
    }
  };

  const removeItem = (idx) => {
    setItems(prev => prev.filter((_, i) => i !== idx));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const rawBalance = parseFloat(form.balance || 0);
    const rawAdvance = parseFloat(form.advance_payment || 0);

    if (rawAdvance > rawBalance) {
      toast.error('Advance payment cannot be greater than the initial balance');
      return;
    }

    const pDate = parseNaturalDate(form.date_borrowed_text);
    const aDate = parseNaturalDate(form.advance_payment_date_text);

    if (!pDate) { toast.error('Invalid Date of Purchase'); return; }

    if (rawAdvance > 0) {
      if (!aDate) { toast.error('Invalid Advance Payment Date'); return; }
      if (aDate < pDate) { toast.error('Advance payment date cannot be earlier than the purchase date'); return; }
    }

    setLoading(true);
    setError(null);
    try {
      // Flush any pending item that was typed but not yet confirmed with Enter
      const finalItems = itemInput.trim() ? [...items, itemInput.trim()] : items;
      await onSubmit({
        ...form,
        date_borrowed: pDate,
        advance_payment_date: aDate,
        receipt_numbers: form.receipt_numbers ? [form.receipt_numbers] : [],
        notes: JSON.stringify(finalItems),
      });
      onClose();
    } catch (err) {
      setError(err.response?.data?.error || err.message || 'Something went wrong');
    } finally {
      setLoading(false);
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

    if (parsedState === 'ok' && isoVal)
      return <div style={{ ...baseStyle, color: 'var(--accent)' }}>✓ {formatDisplayDate(isoVal)}</div>;
    if (parsedState === 'past_error')
      return <div style={{ ...baseStyle, color: '#ef4444' }}>Cannot be earlier than purchase date</div>;
    if (parsedState === 'limit_error')
      return <div style={{ ...baseStyle, color: '#ef4444' }}>Cannot be later than advance payment date</div>;
    if (parsedState === 'error')
      return <div style={{ ...baseStyle, color: '#ef4444' }}>Could not detect date. Try "May 3, 2026"</div>;
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
                    step="1"
                    placeholder=" "
                    onWheel={(e) => e.target.blur()}
                    onKeyDown={(e) => ['e','E','+','-','.'].includes(e.key) && e.preventDefault()}
                    value={form.balance}
                    onChange={(e) => {
                      const val = e.target.value.replace(/[^0-9]/g, '');
                      setError(null);
                      setForm((f) => ({
                        ...f,
                        balance: val,
                        current_balance: Math.max(0, parseInt(val || 0) - parseInt(f.advance_payment || 0))
                      }));
                    }}
                    onBlur={(e) => { if (e.target.value) set('balance', parseInt(e.target.value)); }}
                    required
                    readOnly={initial && parseFloat(initial.advance_payment || 0) > 0}
                    style={initial && parseFloat(initial.advance_payment || 0) > 0 ? { background: 'rgba(0,0,0,0.03)', color: 'var(--text-muted)' } : {}}
                  />
                  <label className="floating-label">Initial Balance (₱) *</label>
                  {initial && parseFloat(initial.advance_payment || 0) > 0 && (
                    <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4, position: 'absolute', bottom: -18, left: 4 }}>
                      Locked because an advance payment exists
                    </div>
                  )}
                </div>

                {/* Date of Purchase */}
                <div className="form-group floating-group">
                  <div style={{ position: 'relative' }}>
                    <input
                      className="form-input"
                      type="text"
                      placeholder=" "
                      value={form.date_borrowed_text || ''}
                      onChange={handleDateText('date_borrowed_text', 'date_borrowed', setDateParsed)}
                      style={{ paddingRight: 40 }}
                      required
                    />
                    <label className="floating-label">Date of Purchase *</label>
                    <input
                      type="date"
                      value={form.date_borrowed || ''}
                      onChange={(e) => {
                        const val = e.target.value;
                        set('date_borrowed', val);
                        set('date_borrowed_text', formatDisplayDate(val));
                        setDateParsed('ok');
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
                    <CalendarIcon 
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
                  {dateHint(dateParsed, form.date_borrowed)}
                </div>

                {/* Advance Payment (ADD mode only) */}
                {!initial && (
                  <div className="form-group floating-group">
                    <input
                      className="form-input"
                      type="number"
                      min="0"
                      step="1"
                      placeholder=" "
                      onWheel={(e) => e.target.blur()}
                      onKeyDown={(e) => ['e','E','+','-','.'].includes(e.key) && e.preventDefault()}
                      value={form.advance_payment}
                      onChange={(e) => {
                        const val = e.target.value.replace(/[^0-9]/g, '');
                        setError(null);
                        setForm((f) => ({
                          ...f,
                          advance_payment: val,
                          current_balance: Math.max(0, parseInt(f.balance || 0) - parseInt(val || 0))
                        }));
                      }}
                      onBlur={(e) => { if (e.target.value) set('advance_payment', parseInt(e.target.value)); }}
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
                )}

                {/* Advance Date (ADD mode) */}
                {!initial && (
                  <div className="form-group floating-group">
                    <div style={{ position: 'relative' }}>
                      <input
                        className="form-input"
                        type="text"
                        placeholder=" "
                        value={form.advance_payment_date_text || ''}
                        onChange={handleDateText('advance_payment_date_text', 'advance_payment_date', setAdvDateParsed)}
                        style={{ paddingRight: 40 }}
                      />
                      <label className="floating-label">Advance Date</label>
                      <input
                        type="date"
                        value={form.advance_payment_date || ''}
                        onChange={(e) => {
                          const val = e.target.value;
                          set('advance_payment_date', val);
                          set('advance_payment_date_text', formatDisplayDate(val));
                          setAdvDateParsed('ok');
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
                      <CalendarIcon 
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
                    onChange={(e) => {
                      const onlyNumbers = e.target.value.replace(/\D/g, '');
                      set('receipt_numbers', onlyNumbers);
                    }}
                  />
                  <label className="floating-label">Receipt No.</label>
                </div>

                {/* Items Purchased — dynamic bullet list */}
                <div className="form-group full" style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  <label className="form-label" style={{ marginBottom: 0 }}>
                    Items Purchased
                    <span style={{ color: 'var(--text-muted)', fontWeight: 400, fontSize: 11, marginLeft: 8 }}>
                      type an item then press Enter
                    </span>
                  </label>

                  {/* Input row */}
                  <input
                    id="items-purchased-input"
                    className="form-input"
                    type="text"
                    placeholder="e.g. 1 tire"
                    value={itemInput}
                    onChange={(e) => setItemInput(e.target.value)}
                    onKeyDown={handleItemKeyDown}
                    onBlur={() => {
                      const trimmed = itemInput.trim();
                      if (trimmed) {
                        setItems(prev => [...prev, trimmed]);
                        setItemInput('');
                      }
                    }}
                    autoComplete="off"
                  />

                  {/* Bullet list */}
                  <AnimatePresence initial={false}>
                    {items.length > 0 && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        style={{
                          background: 'rgba(255,255,255,0.03)',
                          border: '1px solid var(--border)',
                          borderRadius: 12,
                          padding: '12px 16px',
                          overflow: 'hidden',
                        }}
                      >
                        <ul style={{ margin: 0, paddingLeft: 20, listStyleType: 'disc' }}>
                          <AnimatePresence initial={false}>
                            {items.map((item, idx) => (
                              <motion.li
                                key={idx}
                                initial={{ opacity: 0, x: -8 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: 8 }}
                                transition={{ duration: 0.15 }}
                                style={{
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'space-between',
                                  fontSize: 14,
                                  fontWeight: 500,
                                  color: 'var(--text-primary)',
                                  padding: '3px 0',
                                  lineHeight: 1.5,
                                }}
                              >
                                <span>{item}</span>
                                <button
                                  type="button"
                                  onClick={() => removeItem(idx)}
                                  style={{
                                    background: 'none',
                                    border: 'none',
                                    color: 'var(--text-muted)',
                                    cursor: 'pointer',
                                    padding: '2px 4px',
                                    borderRadius: 6,
                                    display: 'flex',
                                    alignItems: 'center',
                                    flexShrink: 0,
                                    transition: 'color 0.15s',
                                  }}
                                  onMouseEnter={e => e.currentTarget.style.color = '#ef4444'}
                                  onMouseLeave={e => e.currentTarget.style.color = 'var(--text-muted)'}
                                  title="Remove item"
                                >
                                  <Trash2 size={13} />
                                </button>
                              </motion.li>
                            ))}
                          </AnimatePresence>
                        </ul>
                      </motion.div>
                    )}
                  </AnimatePresence>
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
