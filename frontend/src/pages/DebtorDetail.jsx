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
    const pageW = doc.internal.pageSize.getWidth();
    const pageH = doc.internal.pageSize.getHeight();
    const margin = 14;

    // Helper — replace ₱ with P (jsPDF default font limitation)
    const fmtPDF = (n) => fmt(n).replace('₱', 'P');

    // ── Color palette (warm peach / terracotta from reference image) ──────
    const C = {
      header:    [214, 150, 114],  // terracotta/salmon
      headerDark:[180, 110,  80],  // darker terracotta
      peachLight:[252, 235, 225],  // very light peach — alt rows & box bg
      peachMid:  [240, 200, 178],  // mid peach — table header row
      border:    [210, 170, 150],  // peach-tan border
      textDark:  [ 80,  45,  20],  // warm dark brown
      textBody:  [100,  65,  40],  // warm brown body
      textMuted: [160, 120, 100],  // muted warm
      white:     [255, 255, 255],
      green:     [ 34, 130,  70],
      orange:    [200,  90,  30],
    };

    // ── Compute Overall Pay Total ─────────────────────────────────────────
    const totalPaid = (debtor.payment_history || [])
      .filter(p => p.type !== 'edit' && p.type !== 'manual_adjustment' && p.amount > 0)
      .reduce((sum, p) => sum + parseFloat(p.amount || 0), 0);

    const isSettled = debtor.status === 'paid';
    const generatedDate = new Date().toLocaleDateString('en-PH', {
      year: 'numeric', month: 'long', day: 'numeric'
    });

    // ── Items ─────────────────────────────────────────────────────────────
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
    const receiptText = debtor.receipt_numbers?.length
      ? debtor.receipt_numbers.map(r => `#${r}`).join(', ') : '—';

    // ════════════════════════════════════════════════════════════════════
    //  1. HEADER BAND — warm terracotta
    // ════════════════════════════════════════════════════════════════════
    doc.setFillColor(...C.header);
    doc.rect(0, 0, pageW, 36, 'F');

    doc.setTextColor(...C.white);
    doc.setFontSize(18);
    doc.setFont('helvetica', 'bold');
    doc.text('STATEMENT OF ACCOUNT', margin, 16);

    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(255, 235, 220);
    doc.text(`Generated on ${generatedDate}`, margin, 25);

    // Status badge top-right
    const badgeLabel = isSettled ? 'FULLY SETTLED' : 'OUTSTANDING';
    doc.setFillColor(...(isSettled ? C.green : C.orange));
    doc.roundedRect(pageW - margin - 38, 8, 38, 10, 2, 2, 'F');
    doc.setTextColor(...C.white);
    doc.setFontSize(7);
    doc.setFont('helvetica', 'bold');
    doc.text(badgeLabel, pageW - margin - 38 + 19, 14.5, { align: 'center' });

    // ════════════════════════════════════════════════════════════════════
    //  2. CUSTOMER DETAILS (left) + SUMMARY METRICS (right)
    // ════════════════════════════════════════════════════════════════════
    const boxTop = 42;
    const boxH = 48;
    const leftW = 110;
    const rightW = pageW - margin * 2 - leftW - 4;

    // Left box — light peach
    doc.setFillColor(...C.peachLight);
    doc.setDrawColor(...C.border);
    doc.roundedRect(margin, boxTop, leftW, boxH, 3, 3, 'FD');

    doc.setFontSize(7);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...C.headerDark);
    doc.text('CUSTOMER DETAILS', margin + 5, boxTop + 8);

    const lx = margin + 5;
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...C.textDark);
    doc.text(debtor.name, lx, boxTop + 17);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(...C.textBody);
    doc.text(`Purchase Date: ${fmtDate(debtor.date_borrowed)}`, lx, boxTop + 26);
    doc.text(`Receipt No: ${receiptText}`, lx, boxTop + 34);
    const wrappedItems = doc.splitTextToSize(`Items: ${itemsText}`, leftW - 10);
    doc.text(wrappedItems.slice(0, 2), lx, boxTop + 42);

    // Right box — dark terracotta
    const rx = margin + leftW + 4;
    doc.setFillColor(...C.headerDark);
    doc.roundedRect(rx, boxTop, rightW, boxH, 3, 3, 'F');

    doc.setFontSize(7);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(255, 210, 190);
    doc.text('SUMMARY', rx + 5, boxTop + 8);

    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(255, 210, 190);
    doc.text('Overall Pay Total', rx + 5, boxTop + 19);
    doc.setFontSize(13);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...C.white);
    doc.text(fmtPDF(totalPaid), rx + 5, boxTop + 28);

    doc.setDrawColor(...C.header);
    doc.line(rx + 5, boxTop + 32, rx + rightW - 5, boxTop + 32);

    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(255, 210, 190);
    doc.text('Current Balance', rx + 5, boxTop + 39);
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...C.white);
    doc.text(isSettled ? 'P0.00' : fmtPDF(debtor.balance), rx + 5, boxTop + 47);

    // ════════════════════════════════════════════════════════════════════
    //  3. TRANSACTION HISTORY SECTION BAR
    // ════════════════════════════════════════════════════════════════════
    const tableTop = boxTop + boxH + 10;

    doc.setFillColor(...C.header);
    doc.rect(margin, tableTop, pageW - margin * 2, 8, 'F');
    doc.setTextColor(...C.white);
    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    doc.text('TRANSACTION HISTORY', margin + 3, tableTop + 5.5);

    // ════════════════════════════════════════════════════════════════════
    //  4. BUILD TABLE DATA (with row numbering)
    // ════════════════════════════════════════════════════════════════════
    const events = [];

    events.push({
      type: 'created',
      timestamp: debtor.date_borrowed
        ? new Date(debtor.date_borrowed + 'T12:00:00').getTime()
        : new Date(debtor.created_at).getTime(),
      dateStr: (debtor.date_borrowed
        ? new Date(debtor.date_borrowed + 'T12:00:00')
        : new Date(debtor.created_at)
      ).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
    });

    if (debtor.payment_history) {
      debtor.payment_history.forEach((payment) => {
        const isDateOnly = payment.date && (payment.date.length === 10 || !payment.date.includes('T'));
        const pDate = isDateOnly ? new Date(payment.date + 'T12:00:00') : new Date(payment.date);
        events.push({
          type: 'payment_or_edit',
          timestamp: pDate.getTime(),
          dateStr: pDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
          payment
        });
      });
    }

    if (isSettled) {
      events.push({
        type: 'settled',
        timestamp: new Date(debtor.updated_at).getTime(),
        dateStr: new Date(debtor.updated_at).toLocaleDateString('en-US', {
          month: 'short', day: 'numeric', year: 'numeric'
        }),
      });
    }

    events.sort((a, b) => a.timestamp - b.timestamp);

    const tableData = [];
    let rowNum = 1;

    events.forEach(ev => {
      if (ev.type === 'created') {
        tableData.push([`${rowNum++}`, ev.dateStr, 'Record Started', '—', fmtPDF(debtor.original_debt || debtor.balance)]);
      } else if (ev.type === 'settled') {
        tableData.push([`${rowNum++}`, ev.dateStr, 'Account Settled', '—', 'P0.00']);
      } else {
        const p = ev.payment;
        if (p.type === 'edit') return; // Req 8.1 — exclude profile edits
        let desc = p.note || 'Payment';
        if (p.type === 'manual_adjustment') {
          const reasonMatch = (p.changes || '').match(/Reason: (.*)/);
          desc = `Manual Adjustment (${reasonMatch ? reasonMatch[1] : 'Manual'})`;
        }
        const amountStr = p.amount
          ? (p.amount < 0 ? `-${fmtPDF(Math.abs(p.amount))}` : fmtPDF(p.amount))
          : '—';
        tableData.push([`${rowNum++}`, ev.dateStr, desc, amountStr, p.balance_after ? fmtPDF(p.balance_after) : '—']);
      }
    });

    // ════════════════════════════════════════════════════════════════════
    //  5. RENDER TABLE
    // ════════════════════════════════════════════════════════════════════
    autoTable(doc, {
      head: [['#', 'Date', 'Description', 'Amount', 'Balance After']],
      body: tableData,
      startY: tableTop + 8,
      theme: 'plain',
      headStyles: {
        fillColor: C.peachMid,
        textColor: C.textDark,
        fontStyle: 'bold',
        fontSize: 9,
        cellPadding: { top: 4, bottom: 4, left: 4, right: 4 },
      },
      bodyStyles: {
        fontSize: 9,
        textColor: C.textBody,
        cellPadding: { top: 4, bottom: 4, left: 4, right: 4 },
        lineColor: C.border,
        lineWidth: 0.3,
      },
      alternateRowStyles: { fillColor: C.peachLight },
      margin: { left: margin, right: margin },
      columnStyles: {
        0: { cellWidth: 10, halign: 'center', textColor: C.textMuted }, // #
        1: { cellWidth: 25 },                                            // Date
        2: { cellWidth: 80, halign: 'left' },                           // Description
        3: { cellWidth: 30, halign: 'right', fontStyle: 'bold' },       // Amount
        4: { cellWidth: 37, halign: 'right', fontStyle: 'bold' },       // Balance After
      },
      didDrawPage: (hookData) => {
        const pageCount = doc.internal.getNumberOfPages();
        const currentPage = hookData.pageNumber;
        doc.setFontSize(8);
        doc.setTextColor(...C.textMuted);
        doc.setFont('helvetica', 'normal');
        doc.text(
          `Page ${currentPage} of ${pageCount}  |  This document is system-generated and is valid without a signature.`,
          pageW / 2, pageH - 8, { align: 'center' }
        );
        doc.setDrawColor(...C.border);
        doc.line(margin, pageH - 12, pageW - margin, pageH - 12);
      }
    });

    doc.save(`${debtor.name.replace(/\s+/g, '_')}_SOA.pdf`);
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
