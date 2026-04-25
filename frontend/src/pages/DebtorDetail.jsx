import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowLeft, Edit2, Trash2, CreditCard } from 'lucide-react';
import axios from 'axios';
import toast from 'react-hot-toast';
import StatusBadge from '../components/StatusBadge';
import DebtorModal from '../components/DebtorModal';
import PayModal from '../components/PayModal';
import ConfirmModal from '../components/ConfirmModal';

const fmt = (n) =>
  '₱' + parseFloat(n || 0).toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const fmtDate = (d) => {
  if (!d) return '—';
  try {
    const date = new Date(d);
    if (isNaN(date.getTime())) return '—';
    return date.toLocaleDateString('en-PH', { year: 'numeric', month: 'long', day: 'numeric' });
  } catch {
    return '—';
  }
};

const initials = (name) =>
  (name || '??').split(' ').map((w) => w[0]).slice(0, 2).join('').toUpperCase();

export default function DebtorDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [debtor, setDebtor] = useState(null);
  const [loading, setLoading] = useState(true);
  const [editOpen, setEditOpen] = useState(false);
  const [payOpen, setPayOpen] = useState(false);
  const [confirmSettle, setConfirmSettle] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const API_URL = import.meta.env.VITE_API_URL || '';

  const fetchDebtor = async () => {
    try {
      const res = await axios.get(`${API_URL}/api/debtors/${id}`);
      console.log('Fetched debtor:', res.data);
      setDebtor(res.data);
    } catch {
      toast.error('Could not load debtor');
      navigate('/');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchDebtor(); }, [id]);

  const handleEdit = async (form) => {
    await toast.promise(axios.put(`${API_URL}/api/debtors/${id}`, form).then((r) => setDebtor(r.data)), {
      loading: 'Saving...', success: 'Saved!', error: 'Failed to save',
    });
  };

  const handlePay = async (_, amount) => {
    const localDate = new Date().toLocaleDateString('en-CA'); 
    await toast.promise(
      axios.post(`${API_URL}/api/debtors/${id}/pay`, { amount, date: localDate }),
      {
        loading: 'Recording...',
        success: (res) => {
          if (res.data.settled) {
            navigate('/');
            return 'Debt settled and record removed!';
          }
          setDebtor(res.data);
          return 'Payment recorded!';
        },
        error: 'Failed to record payment',
      }
    );
  };

  const handleDelete = async () => {
    await toast.promise(axios.delete(`${API_URL}/api/debtors/${id}`), {
      loading: 'Deleting...', success: 'Record deleted', error: 'Failed to delete',
    });
    navigate('/');
  };

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)' }}>
        Loading...
      </div>
    );
  }

  if (!debtor) return null;

  return (
    <div style={{ minHeight: '100vh', paddingBottom: 80 }}>
      {/* Sub-header */}
      <div style={{ background: 'var(--bg-card)', borderBottom: '1px solid var(--border)', marginBottom: 40, borderTop: '1px solid var(--border)' }}>
        <div style={{ maxWidth: 1300, margin: '0 auto', padding: '32px 24px' }}>
          <button
            className="btn btn-outline btn-sm"
            onClick={() => navigate('/')}
            style={{ marginBottom: 24 }}
          >
            <ArrowLeft size={14} /> Back to Records
          </button>

          <div className="detail-header">
            <div className="detail-avatar">{initials(debtor.name)}</div>
            <div style={{ flex: 1 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
                <h1 style={{ fontSize: 32, fontWeight: 700, letterSpacing: '-1px' }}>{debtor.name}</h1>
                <StatusBadge status={debtor.status} />
              </div>
              <div style={{ fontSize: 14, color: 'var(--text-muted)', marginTop: 6, fontWeight: 500 }}>
                Created on {fmtDate(debtor.created_at)}
              </div>
            </div>
            <div style={{ display: 'flex', gap: 10 }}>
              <button className="btn btn-outline btn-sm" onClick={() => setEditOpen(true)}>
                <Edit2 size={13} /> Edit Profile
              </button>
              <button
                className="btn btn-outline btn-sm"
                onClick={() => setPayOpen(true)}
              >
                <CreditCard size={13} /> Add Payment
              </button>
              <button
                className="btn btn-primary btn-sm"
                onClick={() => setConfirmSettle(true)}
              >
                Settle Full
              </button>
              <button className="btn btn-danger btn-sm" onClick={() => setConfirmDelete(true)}>
                <Trash2 size={13} />
              </button>
            </div>
          </div>
        </div>
      </div>

      <div style={{ maxWidth: 1300, margin: '0 auto', padding: '0 24px' }}>
        {/* Balance highlight */}
        <motion.div
          className="stat-box"
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          style={{ marginBottom: 24, padding: '32px' }}
        >
          <div className="detail-field-label">Current Outstanding Balance</div>
          <div style={{ 
            fontSize: 48, 
            fontWeight: 700, 
            letterSpacing: '-2px',
            color: 'var(--text-primary)',
            marginBottom: 8 
          }}>
            {fmt(debtor.balance)}
          </div>
          {debtor.status === 'paid' && (
            <div style={{ color: 'var(--status-paid-text)', fontWeight: 600, fontSize: 14, display: 'flex', alignItems: 'center', gap: 6 }}>
              <div className="dot paid"></div> Fully recovered
            </div>
          )}
        </motion.div>

        {/* Info grid */}
        <motion.div
          className="detail-info-grid"
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
        >
          <div className="detail-field">
            <div className="detail-field-label">Date Borrowed</div>
            <div className="detail-field-value">{fmtDate(debtor.date_borrowed)}</div>
          </div>
          <div className="detail-field">
            <div className="detail-field-label">Due Date</div>
            <div className="detail-field-value" style={{ color: debtor.due_date ? 'var(--text-primary)' : 'var(--text-muted)' }}>
              {fmtDate(debtor.due_date)}
            </div>
          </div>
          <div className="detail-field">
            <div className="detail-field-label">Advance Payment</div>
            <div className="detail-field-value" style={{ color: 'var(--status-paid-text)' }}>{fmt(debtor.advance_payment)}</div>
          </div>
          <div className="detail-field">
            <div className="detail-field-label">Advance Payment Date</div>
            <div className="detail-field-value">{fmtDate(debtor.advance_payment_date)}</div>
          </div>
          <div className="detail-field">
            <div className="detail-field-label">Last Activity</div>
            <div className="detail-field-value">{fmtDate(debtor.updated_at)}</div>
          </div>
        </motion.div>

        {/* Receipt numbers */}
        {debtor.receipt_numbers && debtor.receipt_numbers.length > 0 && (
          <motion.div
            className="detail-field"
            style={{ marginTop: 16 }}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
          >
            <div className="detail-field-label" style={{ marginBottom: 12 }}>Receipt History</div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
              {debtor.receipt_numbers.map((r, i) => (
                <span key={i} className="receipt-tag-removable" style={{ padding: '8px 16px', borderRadius: 10 }}>
                  #{r}
                </span>
              ))}
            </div>
          </motion.div>
        )}

        {/* Notes */}
        {debtor.notes && (
          <motion.div
            className="detail-field"
            style={{ marginTop: 16 }}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 }}
          >
            <div className="detail-field-label" style={{ marginBottom: 8 }}>Notes</div>
            <div style={{ fontSize: 14, color: 'var(--text-secondary)', lineHeight: 1.6 }}>{debtor.notes}</div>
          </motion.div>
        )}
      </div>

      {/* Payment History */}
      <div style={{ marginTop: 40 }}>
        <h3 style={{ fontSize: 18, fontWeight: 700, marginBottom: 20, color: 'var(--text-primary)' }}>Payment History</h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {(!debtor.payment_history || debtor.payment_history.length === 0) ? (
            <div className="detail-field" style={{ textAlign: 'center', color: 'var(--text-muted)' }}>
              No payments recorded yet.
            </div>
          ) : (
            debtor.payment_history.map((p, i) => (
              <div key={i} className="detail-field" style={{ 
                display: 'flex', 
                justifyContent: 'space-between', 
                alignItems: 'center',
                padding: '16px 24px'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                  <div style={{ 
                    width: 28, 
                    height: 28, 
                    borderRadius: '50%', 
                    background: 'var(--accent-light)', 
                    color: 'var(--accent)', 
                    display: 'flex', 
                    alignItems: 'center', 
                    justifyContent: 'center',
                    fontSize: 12,
                    fontWeight: 700
                  }}>
                    {debtor.payment_history.length - i}
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column' }}>
                    <span style={{ fontSize: 14, color: 'var(--text-primary)', fontWeight: 600 }}>
                      {fmtDate(p.date)}
                    </span>
                    <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>Payment Recorded</span>
                  </div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ color: 'var(--status-paid-text)', fontWeight: 700, fontSize: 16 }}>
                    +{fmt(p.amount)}
                  </div>
                  <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                    Bal After: {fmt(p.balance_after)}
                  </div>
                </div>
              </div>
            )).reverse()
          )}
        </div>
      </div>

      {/* Modals */}
      <DebtorModal open={editOpen} onClose={() => setEditOpen(false)} onSubmit={handleEdit} initial={debtor} />
      <PayModal open={payOpen} onClose={() => setPayOpen(false)} debtor={debtor} onPay={handlePay} />
      
      <ConfirmModal
        open={confirmSettle}
        onClose={() => setConfirmSettle(false)}
        onConfirm={() => handlePay(debtor.id, debtor.balance)}
        title="Settle Full Debt?"
        message={`This will pay the remaining ₱${debtor.balance.toLocaleString()} and permanently remove this record. Continue?`}
      />

      <ConfirmModal
        open={confirmDelete}
        onClose={() => setConfirmDelete(false)}
        onConfirm={handleDelete}
        title="Delete Record?"
        message={`Are you sure you want to permanently delete the record for ${debtor.name}? This cannot be undone.`}
      />
    </div>
  );
}
