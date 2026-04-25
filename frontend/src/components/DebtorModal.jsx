import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Plus } from 'lucide-react';

const getToday = () => new Date().toLocaleDateString('en-CA');

const EMPTY_FORM = {
  name: '',
  balance: '',
  advance_payment: '',
  advance_payment_date: '',
  receipt_numbers: [],
  date_borrowed: getToday(),
  due_date: '',
  notes: '',
  status: 'active',
};

export default function DebtorModal({ open, onClose, onSubmit, initial = null }) {
  const [form, setForm] = useState(EMPTY_FORM);
  const [receiptInput, setReceiptInput] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (open) {
      if (initial) {
        setForm({
          name: initial.name || '',
          balance: initial.balance || '',
          advance_payment: initial.advance_payment || '',
          advance_payment_date: initial.advance_payment_date || '',
          receipt_numbers: initial.receipt_numbers || [],
          date_borrowed: initial.date_borrowed || '',
          due_date: initial.due_date || '',
          notes: initial.notes || '',
          status: initial.status || 'active',
        });
      } else {
        setForm(EMPTY_FORM);
      }
      setReceiptInput('');
    }
  }, [open, initial]);

  const set = (key, val) => setForm((f) => ({ ...f, [key]: val }));

  const addReceipt = () => {
    const trimmed = receiptInput.trim();
    if (trimmed && !form.receipt_numbers.includes(trimmed)) {
      set('receipt_numbers', [...form.receipt_numbers, trimmed]);
      setReceiptInput('');
    }
  };

  const removeReceipt = (r) =>
    set('receipt_numbers', form.receipt_numbers.filter((x) => x !== r));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await onSubmit(form);
      onClose();
    } finally {
      setLoading(false);
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
                {initial ? 'Edit Debtor' : 'Add New Debtor'}
              </h2>
              <button className="btn-icon" onClick={onClose}>
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSubmit}>
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
                    value={form.balance}
                    onChange={(e) => set('balance', e.target.value)}
                    required
                  />
                  <label className="floating-label">Balance (₱) *</label>
                </div>

                {/* Date Borrowed */}
                <div className="form-group floating-group">
                  <input
                    className="form-input"
                    type="date"
                    placeholder=" "
                    value={form.date_borrowed}
                    onChange={(e) => set('date_borrowed', e.target.value)}
                    required
                  />
                  <label className="floating-label">Date Borrowed *</label>
                </div>

                {/* Advance Payment */}
                <div className="form-group floating-group">
                  <input
                    className="form-input"
                    type="number"
                    min="0"
                    step="0.01"
                    placeholder=" "
                    value={form.advance_payment}
                    onChange={(e) => set('advance_payment', e.target.value)}
                  />
                  <label className="floating-label">Advance Payment (₱)</label>
                </div>

                {/* Advance Payment Date */}
                <div className="form-group floating-group">
                  <input
                    className="form-input"
                    type="date"
                    placeholder=" "
                    value={form.advance_payment_date}
                    onChange={(e) => set('advance_payment_date', e.target.value)}
                  />
                  <label className="floating-label">Advance Date</label>
                </div>

                {/* Due Date */}
                <div className="form-group floating-group">
                  <input
                    className="form-input"
                    type="date"
                    placeholder=" "
                    value={form.due_date}
                    min={form.date_borrowed || new Date().toISOString().split('T')[0]}
                    onChange={(e) => set('due_date', e.target.value)}
                  />
                  <label className="floating-label">Due Date</label>
                </div>

                {/* Status (only on edit) */}
                {initial && (
                  <div className="form-group full">
                    <label className="form-label">Status</label>
                    <select
                      className="form-select"
                      value={form.status}
                      onChange={(e) => set('status', e.target.value)}
                    >
                      <option value="active">Active</option>
                      <option value="partial">Partial</option>
                      <option value="paid">Paid</option>
                    </select>
                  </div>
                )}

                {/* Receipt Numbers */}
                <div className="form-group full">
                  <label className="form-label">Receipt Numbers</label>
                  <div className="receipt-input-wrap">
                    {form.receipt_numbers.length > 0 && (
                      <div className="receipt-tags-display">
                        {form.receipt_numbers.map((r) => (
                          <span key={r} className="receipt-tag-removable">
                            #{r}
                            <button type="button" onClick={() => removeReceipt(r)}>
                              <X size={11} />
                            </button>
                          </span>
                        ))}
                      </div>
                    )}
                    <div className="receipt-add-row">
                      <input
                        className="form-input"
                        type="text"
                        placeholder="Enter receipt number, then press Add"
                        value={receiptInput}
                        onChange={(e) => setReceiptInput(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') { e.preventDefault(); addReceipt(); }
                        }}
                      />
                      <button
                        type="button"
                        className="btn btn-outline"
                        onClick={addReceipt}
                      >
                        <Plus size={14} /> Add
                      </button>
                    </div>
                  </div>
                </div>

                {/* Notes */}
                <div className="form-group full">
                  <label className="form-label">Notes (optional)</label>
                  <textarea
                    className="form-textarea"
                    placeholder="Any additional details..."
                    value={form.notes}
                    onChange={(e) => set('notes', e.target.value)}
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
                  {loading ? 'Saving...' : initial ? 'Save Changes' : 'Add Debtor'}
                </button>
              </div>
            </form>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
