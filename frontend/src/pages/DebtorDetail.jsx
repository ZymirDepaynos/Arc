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
    const isDateOnly = d.length === 10 || !d.includes('T');
    const date = isDateOnly ? new Date(d + 'T12:00:00') : new Date(d);
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
    const rawBalance = parseFloat(form.balance || 0);
    const currentBalance = parseFloat(form.current_balance || 0);
    const advancePayment = Math.max(0, rawBalance - currentBalance);

    // Audit changes for history
    const old = debtor;
    const changes = [];
    const fmtD = (d) => d ? new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : 'N/A';

    if (old.date_borrowed !== form.date_borrowed) {
      changes.push(`Purchase Date: ${fmtD(old.date_borrowed)} → ${fmtD(form.date_borrowed)}`);
    }
    if (old.advance_payment_date !== form.advance_payment_date) {
      changes.push(`Advance Date: ${fmtD(old.advance_payment_date)} → ${fmtD(form.advance_payment_date)}`);
    }
    if (parseFloat(old.balance) !== rawBalance) {
      changes.push(`Initial Balance: ₱${old.balance.toLocaleString()} → ₱${rawBalance.toLocaleString()}`);
    }

    let updatedHistory = [...(old.payment_history || [])];
    if (changes.length > 0) {
      updatedHistory.push({
        type: 'edit',
        date: new Date().toISOString(),
        changes: changes.join(' | '),
        note: 'Profile Updated'
      });
    }

    const payload = {
      ...form,
      balance: rawBalance,
      original_debt: rawBalance,
      advance_payment: advancePayment,
      advance_payment_date: form.advance_payment_date,
      payment_history: updatedHistory,
      // Strip UI-only display keys
      date_borrowed_text: undefined,
      advance_payment_date_text: undefined,
      current_balance: undefined,
    };

    await toast.promise(axios.put(`${API_URL}/api/debtors/${id}`, payload).then((r) => setDebtor(r.data)), {
      loading: 'Saving...', success: 'Saved!', error: 'Failed to save',
    });
  };

  const handlePay = async (_, amount, date) => {
    const payDate = date || new Date().toLocaleDateString('en-CA');
    await toast.promise(
      axios.post(`${API_URL}/api/debtors/${id}/pay`, { amount, date: payDate }),
      {
        loading: 'Recording...',
        success: (res) => {
          if (res.data.settled) {
            navigate('/');
            return 'Settled and marked as paid!';
          }
          setDebtor(res.data);
          return 'Payment recorded!';
        },
        error: 'Failed to record payment',
      }
    );
  };

  const handleDelete = async () => {
    const debtorName = debtor.name;
    const debtorBalance = debtor.balance;
    const debtorId = id;

    await toast.promise(axios.delete(`${API_URL}/api/debtors/${id}`), {
      loading: 'Deleting...', success: 'Record deleted', error: 'Failed to delete',
    });

    // Log to history
    const logs = JSON.parse(localStorage.getItem('arc_deleted_logs') || '[]');
    logs.push({
      id: `deleted-${debtorId}-${Date.now()}`,
      date: new Date().toISOString(),
      customerName: debtorName,
      type: 'deleted',
      amount: debtorBalance
    });
    localStorage.setItem('arc_deleted_logs', JSON.stringify(logs));

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
    <div style={{ minHeight: '100vh', paddingBottom: 80, padding: '40px 32px', maxWidth: '100%' }}>
      
      {/* Header Row */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 24, marginBottom: 40 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 24 }}>
          <button
            className="btn btn-outline back-btn-static"
            onClick={() => navigate('/')}
            style={{ width: 48, height: 48, padding: 0, borderRadius: 24 }}
          >
            <ArrowLeft size={20} />
          </button>
          <div style={{ width: 80, height: 80, borderRadius: 24, background: 'var(--accent-light)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 32, fontWeight: 900, color: 'var(--accent)' }}>
            {initials(debtor.name)}
          </div>
          <div>
            <h1 style={{ fontSize: 32, fontWeight: 900, color: 'var(--text-primary)', margin: '0 0 4px 0', letterSpacing: '-0.5px' }}>
              {debtor.name}
            </h1>
            <div style={{ fontSize: 14, color: 'var(--text-muted)', fontWeight: 600 }}>
              Customer since {fmtDate(debtor.created_at)}
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', gap: 12 }}>
          <button className="btn btn-outline" onClick={() => setEditOpen(true)} style={{ height: 48, padding: '0 24px', borderRadius: 24 }}>
            <Edit2 size={16} style={{ marginRight: 8 }} /> Edit Profile
          </button>
          <button className="btn btn-outline" onClick={() => setConfirmDelete(true)} style={{ height: 48, padding: '0 24px', borderRadius: 24, color: '#EF4444', borderColor: 'rgba(239, 68, 68, 0.2)', background: 'rgba(239, 68, 68, 0.05)' }}>
            <Trash2 size={16} style={{ marginRight: 8 }} /> Delete
          </button>
        </div>
      </div>

      {/* METRICS ROW (3 Columns utilizing full width) */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 24, marginBottom: 24 }}>
        
        {/* Card 1: Current Balance */}
        <div className="stat-box" style={{ padding: 24, borderRadius: 24, background: 'var(--bg-card)', display: 'flex', flexDirection: 'column', justifyContent: 'center', border: '1px solid var(--border)' }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 8 }}>
            Current Balance
          </div>
          <div style={{ fontSize: 40, fontWeight: 900, color: 'var(--text-primary)', letterSpacing: '-1px', lineHeight: 1, marginBottom: 20 }}>
            {fmt(debtor.balance)}
          </div>

          {debtor.status === 'paid' ? (
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: 'var(--status-paid-bg)', color: 'var(--status-paid-text)', padding: '6px 12px', borderRadius: 10, fontSize: 14, fontWeight: 800 }}>
              Fully Settled
            </div>
          ) : (
            <div style={{ display: 'flex', gap: 12 }}>
              <button className="btn btn-primary" onClick={() => setPayOpen(true)} style={{ flex: 1, height: 44, borderRadius: 12, fontSize: 14 }}>
                Add Payment
              </button>
              <button className="btn btn-outline" onClick={() => setConfirmSettle(true)} style={{ flex: 1, height: 44, borderRadius: 12, fontSize: 14, background: 'var(--bg-page)' }}>
                Settle Full
              </button>
            </div>
          )}
        </div>

        {/* Card 2: Initial Balance */}
        <div className="stat-box" style={{ padding: 24, borderRadius: 24, background: 'var(--bg-card)', border: '1px solid var(--border)', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 8 }}>
            Initial Balance
          </div>
          <div style={{ fontSize: 32, fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '-0.5px' }}>
            {fmt(debtor.original_debt || debtor.balance)}
          </div>
        </div>

        {/* Card 3: Receipt Information */}
        <div className="stat-box" style={{ padding: 24, borderRadius: 24, background: 'var(--bg-card)', border: '1px solid var(--border)', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 8 }}>
            Receipt Number
          </div>
          <div style={{ fontSize: 24, fontWeight: 800, color: 'var(--text-primary)', wordBreak: 'break-all' }}>
            {debtor.receipt_numbers?.length ? debtor.receipt_numbers.map(r => `#${r}`).join(', ') : '—'}
          </div>
        </div>
      </div>

      {/* BOTTOM ROW (Consolidated Details & Larger Timeline) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left: Consolidated Details & Items */}
        <div className="lg:col-span-1 flex flex-col gap-8">
          <div className="stat-box" style={{ padding: 24, borderRadius: 24, background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
            {/* Section 1: Dates */}
            <div style={{ marginBottom: 24, paddingBottom: 24, borderBottom: '1px solid var(--border)' }}>
              <h3 style={{ fontSize: 15, fontWeight: 800, color: 'var(--text-primary)', marginBottom: 16, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Key Dates</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: 13, color: 'var(--text-muted)', fontWeight: 600 }}>Purchase Date</span>
                  <span style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-secondary)' }}>{fmtDate(debtor.date_borrowed)}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: 13, color: 'var(--text-muted)', fontWeight: 600 }}>Advance Payment Date</span>
                  <span style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-secondary)' }}>{fmtDate(debtor.advance_payment_date)}</span>
                </div>
              </div>
            </div>

            {/* Section 2: Items Purchased */}
            <div>
              <h3 style={{ fontSize: 15, fontWeight: 800, color: 'var(--text-primary)', marginBottom: 12, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Items Purchased</h3>
              {(() => {
                let items = [];
                if (debtor.notes) {
                  try {
                    const parsed = JSON.parse(debtor.notes);
                    if (Array.isArray(parsed)) items = parsed;
                  } catch (_) {
                    // Legacy plain text — split by newline
                    items = debtor.notes.split('\n').map(l => l.replace(/^\d+\.\s*/, '').trim()).filter(Boolean);
                  }
                }
                return items.length > 0 ? (
                  <ul style={{ margin: 0, paddingLeft: 20, listStyleType: 'disc', display: 'flex', flexDirection: 'column', gap: 6 }}>
                    {items.map((item, idx) => (
                      <li key={idx} style={{ fontSize: 14, color: 'var(--text-secondary)', fontWeight: 500, lineHeight: 1.5 }}>
                        {item}
                      </li>
                    ))}
                  </ul>
                ) : (
                  <div style={{ fontSize: 14, color: 'var(--text-muted)', fontStyle: 'italic' }}>No items listed</div>
                );
              })()}
            </div>
          </div>
        </div>

        {/* Right: Larger Timeline (2/3 width) */}
        <div className="lg:col-span-2">
          <div className="stat-box" style={{ padding: 32, borderRadius: 24, background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24, paddingBottom: 16, borderBottom: '1px solid var(--border)' }}>
              <div className="row-avatar" style={{ background: 'var(--accent-light)', color: 'var(--accent)', width: 44, height: 44, borderRadius: 12 }}>
                <History size={20} />
              </div>
              <h2 style={{ fontSize: 20, fontWeight: 800, margin: 0, color: 'var(--text-primary)', letterSpacing: '-0.3px' }}>Timeline & History</h2>
            </div>
            <div className="timeline-container">
              {(() => {
                const isSettled = debtor.status === 'paid';
                const events = [];

                // 1. Record Started Event
                events.push({
                  id: 'created',
                  type: 'created',
                  timestamp: debtor.date_borrowed 
                    ? new Date(debtor.date_borrowed + 'T12:00:00').getTime()
                    : new Date(debtor.created_at).getTime(),
                  dateStr: debtor.date_borrowed 
                    ? new Date(debtor.date_borrowed + 'T12:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
                    : new Date(debtor.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
                });

                // 2. Payment/Edit Events
                if (debtor.payment_history) {
                  debtor.payment_history.forEach((payment, idx) => {
                    const isDateOnly = payment.date && (payment.date.length === 10 || !payment.date.includes('T'));
                    const pDate = isDateOnly 
                      ? new Date(payment.date + 'T12:00:00')
                      : new Date(payment.date);
                    
                    events.push({
                      id: `payment-${idx}`,
                      type: 'payment_or_edit',
                      timestamp: pDate.getTime(),
                      dateStr: pDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
                      payment
                    });
                  });
                }

                // 3. Settled Event
                if (isSettled) {
                  events.push({
                    id: 'settled',
                    type: 'settled',
                    timestamp: new Date(debtor.updated_at).getTime(),
                    dateStr: new Date(debtor.updated_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
                  });
                }

                // Sort events dynamically
                events.sort((a, b) => {
                  if (isSettled) {
                    // Condition B: Settled -> Ascending (oldest at top)
                    return a.timestamp - b.timestamp;
                  } else {
                    // Condition A: Unsettled -> Descending (newest at top)
                    return b.timestamp - a.timestamp;
                  }
                });

                return events.map((ev) => {
                  if (ev.type === 'created') {
                    return (
                      <div key={ev.id} className="timeline-item">
                        <div className="timeline-dot created"></div>
                        <div className="timeline-content">
                          <div className="timeline-time">{ev.dateStr}</div>
                          <div className="timeline-title">Record Started</div>
                          <div className="timeline-desc">Initial balance of <span className="timeline-money">{fmt(debtor.original_debt || (debtor.balance + (debtor.payment_history?.filter(p => p.amount).reduce((acc, p) => acc + p.amount, 0) || 0)))}</span> was recorded.</div>
                        </div>
                      </div>
                    );
                  }

                  if (ev.type === 'settled') {
                    return (
                      <div key={ev.id} className="timeline-item">
                        <div className="timeline-dot status"></div>
                        <div className="timeline-content">
                          <div className="timeline-time">{ev.dateStr}</div>
                          <div className="timeline-title">Account Settled</div>
                          <div className="timeline-desc">Has been fully paid and closed.</div>
                        </div>
                      </div>
                    );
                  }

                  const p = ev.payment;
                  return (
                    <div key={ev.id} className="timeline-item">
                      <div className={`timeline-dot ${p.type === 'edit' ? 'status' : 'payment'}`}></div>
                      <div className="timeline-content">
                        <div className="timeline-time">{ev.dateStr}</div>
                        <div className="timeline-title">{p.type === 'edit' ? 'Profile Updated' : (p.note || 'Advance Payment')}</div>
                        <div className="timeline-desc">
                          {p.type === 'edit' 
                            ? <>{p.changes}</>
                            : p.note === 'Manual Adjustment' || p.amount < 0 
                              ? <>Balance adjusted by <span className="timeline-money">{fmt(p.amount)}</span>. Remaining balance: <span className="timeline-money">{fmt(p.balance_after)}</span>.</>
                              : <>A payment of <span className="timeline-money">{fmt(p.amount)}</span> was made. Remaining balance: <span className="timeline-money">{fmt(p.balance_after)}</span>.</>}
                        </div>
                      </div>
                    </div>
                  );
                });
              })()}
            </div>
        </div>
      </div>
      </div>

      {/* Modals */}
      <DebtorModal open={editOpen} onClose={() => setEditOpen(false)} onSubmit={handleEdit} initial={debtor} />
      <PayModal open={payOpen} onClose={() => setPayOpen(false)} debtor={debtor} onPay={handlePay} />
      
      <ConfirmModal
        open={confirmSettle}
        onClose={() => setConfirmSettle(false)}
        onConfirm={() => handlePay(debtor.id, debtor.balance)}
        title="Settle Full?"
        message={`This will pay the remaining ₱${debtor.balance.toLocaleString()} and mark this record as fully settled. Continue?`}
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
          Settle Full
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
