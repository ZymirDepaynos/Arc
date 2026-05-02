import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { 
  ArrowLeft, 
  Edit2, 
  Trash2, 
  CreditCard, 
  History, 
  Search as SearchIcon 
} from 'lucide-react';
import axios from 'axios';
import toast from 'react-hot-toast';
import StatusBadge from '../components/StatusBadge';
import DebtorModal from '../components/DebtorModal';
import PayModal from '../components/PayModal';
import ConfirmModal from '../components/ConfirmModal';
import MobileNav from '../components/MobileNav';
import SearchOverlay from '../components/SearchOverlay';

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
  const [searchOpen, setSearchOpen] = useState(false);
  const [allDebtors, setAllDebtors] = useState([]);

  const API_URL = import.meta.env.VITE_API_URL || '';

  const fetchDebtor = async () => {
    try {
      const res = await axios.get(`${API_URL}/api/debtors/${id}`);
      setDebtor(res.data);
      // Also fetch all for global search
      const allRes = await axios.get(`${API_URL}/api/debtors`);
      setAllDebtors(allRes.data);
    } catch {
      toast.error('Could not load debtor');
      navigate('/');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const handleSearchTrigger = () => setSearchOpen(true);
    window.addEventListener('trigger-search-focus', handleSearchTrigger);
    return () => window.removeEventListener('trigger-search-focus', handleSearchTrigger);
  }, []);

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
      <div style={{ 
        background: 'var(--bg-page)', 
        marginBottom: 24,
        padding: '12px 0'
      }}>
        <div className="content-container" style={{ padding: '32px 0' }}>
          <button
            className="btn btn-outline btn-sm"
            onClick={() => navigate('/')}
            style={{ marginBottom: 24 }}
          >
            <ArrowLeft size={14} /> Back to Records
          </button>

          <div className="stat-box" style={{ padding: '24px 32px' }}>
            <div className="detail-header">
              <div className="detail-avatar">{initials(debtor.name)}</div>
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                <h1 style={{ fontSize: 'clamp(24px, 5vw, 32px)', fontWeight: 900, margin: 0, color: 'var(--text-primary)', letterSpacing: '-1px' }}>
                  {debtor.name}
                </h1>
                <div style={{ fontSize: 13, color: 'var(--text-muted)', fontWeight: 600, marginTop: 4 }}>
                  Customer since {fmtDate(debtor.created_at)}
                </div>
              </div>
              </div>
              <div className="detail-actions">
                <button className="btn btn-outline btn-sm" onClick={() => setEditOpen(true)} title="Edit Profile">
                  <Edit2 size={13} /> <span>Edit Profile</span>
                </button>
                {(debtor.status !== 'paid' && parseFloat(debtor.balance) > 0) && (
                  <>
                    <button
                      className="btn btn-outline btn-sm"
                      onClick={() => setPayOpen(true)}
                      title="Add Payment"
                    >
                      <CreditCard size={13} /> <span>Add Payment</span>
                    </button>
                    <button
                      className="btn btn-primary btn-sm"
                      onClick={() => setConfirmSettle(true)}
                    >
                      Settle Full
                    </button>
                  </>
                )}
                <button 
                  className="btn btn-outline btn-sm" 
                  onClick={() => setConfirmDelete(true)} 
                  title="Delete"
                  style={{ 
                    borderColor: 'rgba(255, 77, 77, 0.3)', 
                    color: '#FF4D4D',
                    background: 'rgba(255, 77, 77, 0.05)',
                    padding: '0 12px',
                    height: 38
                  }}
                >
                  <Trash2 size={14} />
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="content-container" style={{ padding: '0' }}>
        {/* Balance highlight */}
        <div className="stat-box" style={{ marginBottom: 24, padding: '32px' }}>
          {debtor.original_debt > 0 && debtor.original_debt !== debtor.balance && (
            <div style={{ marginBottom: 6 }}>
              <span style={{ fontSize: 12, color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em' }}>Original Debt</span>
              <span style={{ fontSize: 16, color: 'var(--text-muted)', fontWeight: 600, marginLeft: 10, textDecoration: 'line-through' }}>{fmt(debtor.original_debt)}</span>
            </div>
          )}
          <div className="detail-field-label">Current Outstanding Balance</div>
          <div style={{ 
            fontSize: 'clamp(32px, 8vw, 48px)', 
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
        </div>

        {/* Info grid */}
        <motion.div
          className="detail-info-grid"
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
        >
          <div className="detail-field">
            <div className="detail-field-label">Date of Purchase</div>
            <div className="detail-field-value">{fmtDate(debtor.date_borrowed)}</div>
          </div>
          <div className="detail-field">
            <div className="detail-field-label">Customer ID</div>
            <div className="detail-field-value" style={{ color: 'var(--text-muted)' }}>#ARC-{debtor.id.toString().padStart(4, '0')}</div>
          </div>
          {debtor.original_debt > 0 && (
            <div className="detail-field">
              <div className="detail-field-label">Original Debt</div>
              <div className="detail-field-value" style={{ color: 'var(--status-active-text)' }}>{fmt(debtor.original_debt)}</div>
            </div>
          )}
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

      {/* Timeline Audit Log */}
      <div className="timeline-section">
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24 }}>
          <div className="row-avatar" style={{ background: 'var(--accent-light)', color: 'var(--accent)' }}>
            <History size={20} />
          </div>
          <h2 style={{ fontSize: 20, fontWeight: 800, margin: 0, color: 'var(--text-primary)' }}>Timeline Audit Log</h2>
        </div>

        <div className="timeline-container">
          {/* Created Event */}
          <div className="timeline-item">
            <div className="timeline-dot created"></div>
            <div className="timeline-content">
              <div className="timeline-time">{new Date(debtor.created_at).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</div>
              <div className="timeline-title">Record Created</div>
              <div className="timeline-desc">Initial debt of {fmt(debtor.balance + (debtor.payment_history?.reduce((acc, p) => acc + p.amount, 0) || 0))} was recorded.</div>
            </div>
          </div>

          {/* Payment Events */}
          {debtor.payment_history?.map((payment, idx) => (
            <div key={idx} className="timeline-item">
              <div className="timeline-dot payment"></div>
              <div className="timeline-content">
                <div className="timeline-time">{new Date(payment.date).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</div>
                <div className="timeline-title">Payment Received</div>
                <div className="timeline-desc">A payment of {fmt(payment.amount)} was made. Remaining balance: {fmt(payment.balance_after)}.</div>
              </div>
            </div>
          )).reverse()}
          
          {debtor.status === 'paid' && (
            <div className="timeline-item">
              <div className="timeline-dot status"></div>
              <div className="timeline-content">
                <div className="timeline-time">{new Date(debtor.updated_at).toLocaleString('en-US', { month: 'short', day: 'numeric' })}</div>
                <div className="timeline-title">Account Settled</div>
                <div className="timeline-desc">Debt has been fully paid and closed.</div>
              </div>
            </div>
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

      <div className="hide-desktop" style={{ position: 'fixed', bottom: 100, left: 24, right: 24, zIndex: 900 }}>
        <button 
          className="btn btn-primary" 
          style={{ width: '100%', height: 56, borderRadius: 16, fontSize: 16, fontWeight: 700 }}
          onClick={() => setConfirmSettle(true)}
        >
          Settle Full Debt
        </button>
      </div>

      <MobileNav />

      <SearchOverlay 
        open={searchOpen} 
        onClose={() => setSearchOpen(false)} 
        debtors={allDebtors} 
      />
    </div>
  );
}
