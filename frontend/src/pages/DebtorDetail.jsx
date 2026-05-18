import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { 
  ArrowLeft, 
  Edit2, 
  Trash2, 
  CreditCard, 
  History, 
  Search as SearchIcon,
  Settings2,
  Download
} from 'lucide-react';
import axios from 'axios';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import toast from 'react-hot-toast';
import StatusBadge from '../components/StatusBadge';
import DebtorModal from '../components/DebtorModal';
import PayModal from '../components/PayModal';
import ConfirmModal from '../components/ConfirmModal';
import MobileNav from '../components/MobileNav';
import SearchOverlay from '../components/SearchOverlay';
import AdjustBalanceModal from '../components/AdjustBalanceModal';

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
  const [adjustOpen, setAdjustOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('transactions');
  const [confirmSettle, setConfirmSettle] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [allDebtors, setAllDebtors] = useState([]);
  const [editingHistoryIndex, setEditingHistoryIndex] = useState(null);
  const [editHistoryAmount, setEditHistoryAmount] = useState('');

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

    // Audit changes for history
    const old = debtor;
    const changes = [];
    const fmtD = (d) => d ? new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : 'N/A';

    if (old.name !== form.name) {
      changes.push(`Name: ${old.name} → ${form.name}`);
    }
    if (old.date_borrowed !== form.date_borrowed) {
      changes.push(`Purchase Date: ${fmtD(old.date_borrowed)} → ${fmtD(form.date_borrowed)}`);
    }
    if (parseFloat(old.original_debt || old.balance) !== rawBalance) {
      changes.push(`Initial Balance: ₱${parseFloat(old.original_debt || old.balance).toLocaleString()} → ₱${rawBalance.toLocaleString()}`);
    }
    
    // Track receipt numbers and items
    const oldReceipts = old.receipt_numbers || [];
    const newReceipts = form.receipt_numbers || [];
    if (JSON.stringify([...oldReceipts].sort()) !== JSON.stringify([...newReceipts].sort())) {
      changes.push(`Receipt Numbers updated`);
    }
    if (old.notes !== form.notes) {
      changes.push(`Items Purchased updated`);
    }

    let updatedHistory = [...(old.payment_history || [])];
    if (changes.length > 0) {
      updatedHistory.push({
        id: Date.now().toString(),
        type: 'edit',
        date: new Date().toISOString(),
        changes: changes.join(' | '),
        note: 'Profile Updated'
      });
    }

    const payload = {
      ...form,
      original_debt: rawBalance,
      balance: old.balance, // Don't modify current balance during edit
      advance_payment: old.advance_payment, // Don't modify advance payment
      advance_payment_date: old.advance_payment_date,
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

  const handleAdjustBalance = async (idToAdjust, newBalance, reason) => {
    await toast.promise(
      axios.post(`${API_URL}/api/debtors/${idToAdjust}/adjust`, { newBalance, reason }),
      {
        loading: 'Applying Adjustment...',
        success: (res) => {
          setDebtor(res.data);
          return 'Balance adjusted!';
        },
        error: (err) => err.response?.data?.error || 'Failed to adjust balance',
      }
    );
  };

  const handleEditHistory = async (index, newAmount) => {
    await toast.promise(
      axios.post(`${API_URL}/api/debtors/${id}/edit-history`, { index, newAmount }),
      {
        loading: 'Updating...',
        success: (res) => {
          setDebtor(res.data);
          setEditingHistoryIndex(null);
          return 'Updated and recalculated!';
        },
        error: (err) => err.response?.data?.error || 'Failed to update',
      }
    );
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
        error: (err) => err.response?.data?.error || 'Failed to record payment',
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

  const handleExport = () => {
    const doc = new jsPDF();
    
    // Helper to format currency for PDF (replaces ₱ with P due to font limitations in jsPDF)
    const fmtPDF = (n) => fmt(n).replace('₱', 'P');
    
    // Header
    doc.setFontSize(22);
    doc.setTextColor(33, 37, 41);
    doc.text('STATEMENT OF ACCOUNT', 14, 20);
    
    doc.setFontSize(10);
    doc.setTextColor(100, 116, 139);
    doc.text(`Generated on ${new Date().toLocaleDateString('en-PH', { year: 'numeric', month: 'long', day: 'numeric' })}`, 14, 27);
    
    // Divider
    doc.setDrawColor(226, 232, 240);
    doc.line(14, 32, 196, 32);
    
    // Customer Info
    doc.setFontSize(12);
    doc.setTextColor(33, 37, 41);
    doc.text(`Customer Name: ${debtor.name}`, 14, 42);
    doc.text(`Current Balance: ${fmtPDF(debtor.balance)}`, 14, 49);
    doc.text(`Purchase Date: ${fmtDate(debtor.date_borrowed)}`, 14, 56);
    
    const receiptText = debtor.receipt_numbers?.length ? debtor.receipt_numbers.map(r => `#${r}`).join(', ') : '—';
    doc.text(`Receipt Number(s): ${receiptText}`, 14, 63);
    
    // Items
    let items = [];
    if (debtor.notes) {
      try {
        const parsed = JSON.parse(debtor.notes);
        if (Array.isArray(parsed)) items = parsed;
      } catch (_) {
        items = debtor.notes.split('\n').map(l => l.replace(/^\d+\.\s*/, '').trim()).filter(Boolean);
      }
    }
    const itemsText = items.length > 0 ? items.join(', ') : 'No items listed';
    
    doc.text(`Items Purchased: ${itemsText}`, 14, 70);
    
    // Divider
    doc.line(14, 77, 196, 77);
    
    // Transaction History Title
    doc.setFontSize(14); // Req 8.3: 14pt for section headers
    doc.setTextColor(33, 37, 41);
    doc.text('Transaction History', 14, 87);
    
    // Table
    const headers = [['Date', 'Description', 'Amount', 'Balance After']];
    const data = [];
    
    const isSettled = debtor.status === 'paid';
    const events = [];
    
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

    if (debtor.payment_history) {
      debtor.payment_history.forEach((payment, idx) => {
        const isDateOnly = payment.date && (payment.date.length === 10 || !payment.date.includes('T'));
        const pDate = isDateOnly ? new Date(payment.date + 'T12:00:00') : new Date(payment.date);
        
        events.push({
          id: `payment-${idx}`,
          type: 'payment_or_edit',
          timestamp: pDate.getTime(),
          dateStr: pDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
          payment
        });
      });
    }

    if (isSettled) {
      events.push({
        id: 'settled',
        type: 'settled',
        timestamp: new Date(debtor.updated_at).getTime(),
        dateStr: new Date(debtor.updated_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
      });
    }

    events.sort((a, b) => a.timestamp - b.timestamp);
    
    events.forEach(ev => {
      if (ev.type === 'created') {
        data.push([
          ev.dateStr,
          'Record Started',
          '',
          fmtPDF(debtor.original_debt || debtor.balance)
        ]);
      } else if (ev.type === 'settled') {
        data.push([
          ev.dateStr,
          'Account Settled',
          '',
          'P0.00'
        ]);
      } else {
        const p = ev.payment;
        
        // Req 8.1: Exclude non-financial events (profile edits)
        if (p.type === 'edit') return;
        
        let desc = p.note || 'Payment';
        if (p.type === 'manual_adjustment') {
          const reasonMatch = p.changes.match(/Reason: (.*)/);
          const reason = reasonMatch ? reasonMatch[1] : 'Manual';
          desc = `Manual Adjustment (${reason})`;
        }
        
        let amountStr = '';
        if (p.amount) {
          amountStr = p.amount < 0 ? `-${fmtPDF(Math.abs(p.amount))}` : fmtPDF(p.amount);
        }
        
        data.push([
          ev.dateStr,
          desc,
          amountStr,
          p.balance_after ? fmtPDF(p.balance_after) : ''
        ]);
      }
    });
    
    autoTable(doc, {
      head: headers,
      body: data,
      startY: 92,
      theme: 'grid',
      headStyles: { fillColor: [79, 70, 229], textColor: [255, 255, 255], fontStyle: 'bold' },
      alternateRowStyles: { fillColor: [249, 250, 251] },
      margin: { left: 14, right: 14 },
      styles: { fontSize: 10 }, // Req 8.3: 10pt for tabular row data
      columnStyles: {
        0: { cellWidth: 25 }, // Date
        1: { cellWidth: 80 }, // Description (Wraps automatically)
        2: { cellWidth: 35, halign: 'right' }, // Amount
        3: { cellWidth: 42, halign: 'right' }, // Balance After
      }
    });
    
    doc.save(`${debtor.name.replace(/\s+/g, '_')}_Statement.pdf`);
    toast.success('Statement downloaded!');
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
          <button className="btn btn-outline" onClick={handleExport} style={{ height: 48, padding: '0 24px', borderRadius: 24 }}>
            <Download size={16} style={{ marginRight: 8 }} /> Export
          </button>
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
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div style={{ display: 'flex', gap: 12 }}>
                <button className="btn btn-primary" onClick={() => setPayOpen(true)} style={{ flex: 1, height: 44, borderRadius: 12, fontSize: 14 }}>
                  Add Payment
                </button>
                <button className="btn btn-outline" onClick={() => setConfirmSettle(true)} style={{ flex: 1, height: 44, borderRadius: 12, fontSize: 14, background: 'var(--bg-page)' }}>
                  Settle Full
                </button>
              </div>
              <button className="btn btn-outline" onClick={() => setAdjustOpen(true)} style={{ width: '100%', height: 44, borderRadius: 12, fontSize: 14, color: 'var(--text-muted)' }}>
                <Settings2 size={16} style={{ marginRight: 8 }} /> Adjust Balance
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
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24, paddingBottom: 16, borderBottom: '1px solid var(--border)', flexWrap: 'wrap', gap: 16 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div className="row-avatar" style={{ background: 'var(--accent-light)', color: 'var(--accent)', width: 44, height: 44, borderRadius: 12 }}>
                  <History size={20} />
                </div>
                <h2 style={{ fontSize: 20, fontWeight: 800, margin: 0, color: 'var(--text-primary)', letterSpacing: '-0.3px' }}>Timeline & History</h2>
              </div>
              
              <div style={{ display: 'flex', gap: 8, background: 'var(--bg-page)', padding: 4, borderRadius: 12 }}>
                <button
                  onClick={() => setActiveTab('transactions')}
                  style={{
                    padding: '8px 16px',
                    borderRadius: 8,
                    fontSize: 13,
                    fontWeight: 700,
                    background: activeTab === 'transactions' ? 'var(--bg-card)' : 'transparent',
                    color: activeTab === 'transactions' ? 'var(--text-primary)' : 'var(--text-muted)',
                    border: 'none',
                    boxShadow: activeTab === 'transactions' ? 'var(--shadow-sm)' : 'none',
                    cursor: 'pointer',
                    transition: 'all 0.2s'
                  }}
                >
                  Transactions
                </button>
                <button
                  onClick={() => setActiveTab('edits')}
                  style={{
                    padding: '8px 16px',
                    borderRadius: 8,
                    fontSize: 13,
                    fontWeight: 700,
                    background: activeTab === 'edits' ? 'var(--bg-card)' : 'transparent',
                    color: activeTab === 'edits' ? 'var(--text-primary)' : 'var(--text-muted)',
                    border: 'none',
                    boxShadow: activeTab === 'edits' ? 'var(--shadow-sm)' : 'none',
                    cursor: 'pointer',
                    transition: 'all 0.2s'
                  }}
                >
                  Profile Updates
                </button>
              </div>
            </div>
            <div className="timeline-container">
              {(() => {
                const isSettled = debtor.status === 'paid';
                const events = [];

                if (activeTab === 'transactions') {
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

                  // 2. Payments and Adjustments
                  if (debtor.payment_history) {
                    debtor.payment_history.forEach((payment, idx) => {
                      if (payment.type !== 'edit' && payment.type !== 'manual_adjustment') {
                        const isDateOnly = payment.date && (payment.date.length === 10 || !payment.date.includes('T'));
                        const pDate = isDateOnly 
                          ? new Date(payment.date + 'T12:00:00')
                          : new Date(payment.date);
                        
                        events.push({
                          id: `payment-${idx}`,
                          type: 'payment_or_edit',
                          timestamp: pDate.getTime(),
                          dateStr: pDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
                          payment,
                          index: idx
                        });
                      }
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
                } else {
                  // Edits Log
                  if (debtor.payment_history) {
                    debtor.payment_history.forEach((payment, idx) => {
                      if (payment.type === 'edit' || payment.type === 'manual_adjustment') {
                        const isDateOnly = payment.date && (payment.date.length === 10 || !payment.date.includes('T'));
                        const pDate = isDateOnly 
                          ? new Date(payment.date + 'T12:00:00')
                          : new Date(payment.date);
                        
                        events.push({
                          id: `edit-${idx}`,
                          type: 'payment_or_edit',
                          timestamp: pDate.getTime(),
                          dateStr: pDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
                          payment
                        });
                      }
                    });
                  }
                }

                // Sort events dynamically (Condition A / B applies to BOTH tabs)
                events.sort((a, b) => {
                  if (isSettled) {
                    return a.timestamp - b.timestamp;
                  } else {
                    return b.timestamp - a.timestamp;
                  }
                });

                if (events.length === 0) {
                  return <div style={{ fontSize: 14, color: 'var(--text-muted)', fontStyle: 'italic', marginLeft: -32, marginTop: 16 }}>No records found.</div>;
                }

                return events.map((ev) => {
                  if (ev.type === 'created') {
                    return (
                      <div key={ev.id} className="timeline-item">
                        <div className="timeline-dot created"></div>
                        <div className="timeline-content">
                          <div className="timeline-time">{ev.dateStr}</div>
                          <div className="timeline-title">Record Started</div>
                          <div className="timeline-desc">Initial balance of <span className="timeline-money">{fmt(debtor.original_debt || (debtor.balance + (debtor.payment_history?.filter(p => p.amount && p.type !== 'manual_adjustment').reduce((acc, p) => acc + p.amount, 0) || 0)))}</span> was recorded.</div>
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
                  const isEditing = editingHistoryIndex === ev.index;
                  
                  return (
                    <div key={ev.id} className="timeline-item">
                      <div className={`timeline-dot ${p.type === 'edit' ? 'status' : (p.type === 'manual_adjustment' ? 'created' : 'payment')}`}></div>
                      <div className="timeline-content">
                        <div className="timeline-time">{ev.dateStr}</div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <div className="timeline-title">{p.type === 'edit' ? 'Profile Updated' : (p.note || 'Advance Payment')}</div>
                          
                          {/* Req 1: Inline Editing Button */}
                          {!p.type && !isEditing && !isSettled && (
                            <button 
                              className="btn btn-outline" 
                              style={{ height: 28, padding: '0 8px', borderRadius: 6, fontSize: 12 }}
                              onClick={() => {
                                setEditingHistoryIndex(ev.index);
                                setEditHistoryAmount(p.amount.toString());
                              }}
                            >
                              Edit
                            </button>
                          )}
                        </div>
                        
                        <div className="timeline-desc">
                          {p.type === 'edit' 
                            ? <>{p.changes}</>
                            : p.type === 'manual_adjustment'
                              ? <>{p.changes}</>
                              : isEditing 
                                ? (
                                  <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginTop: 8 }}>
                                    <input 
                                      type="number" 
                                      value={editHistoryAmount} 
                                      onChange={(e) => setEditHistoryAmount(e.target.value)}
                                      style={{ width: 100, height: 32, padding: '0 8px', borderRadius: 6, border: '1px solid var(--border)', background: 'var(--bg-page)', color: 'var(--text-primary)' }}
                                    />
                                    <button 
                                      className="btn btn-primary" 
                                      style={{ height: 32, padding: '0 12px', borderRadius: 6, fontSize: 12 }}
                                      onClick={() => handleEditHistory(ev.index, editHistoryAmount)}
                                    >
                                      Save
                                    </button>
                                    <button 
                                      className="btn btn-outline" 
                                      style={{ height: 32, padding: '0 12px', borderRadius: 6, fontSize: 12 }}
                                      onClick={() => setEditingHistoryIndex(null)}
                                    >
                                      Cancel
                                    </button>
                                  </div>
                                )
                                : p.amount < 0 
                                  ? <>Balance adjusted by <span className="timeline-money">{fmt(Math.abs(p.amount))}</span>. Remaining balance: <span className="timeline-money">{fmt(p.balance_after)}</span>.</>
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
      <AdjustBalanceModal open={adjustOpen} onClose={() => setAdjustOpen(false)} debtor={debtor} onAdjust={handleAdjustBalance} />
      
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
