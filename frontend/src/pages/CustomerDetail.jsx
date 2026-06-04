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
  Download
} from 'lucide-react';
import axios from 'axios';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import toast from 'react-hot-toast';
import DebtorModal from '../components/DebtorModal';
import PayModal from '../components/PayModal';
import ConfirmModal from '../components/ConfirmModal';

import SearchOverlay from '../components/SearchOverlay';
import PasswordModal from '../components/PasswordModal';
import { addAuditLog } from '../utils/auth';


const fmt = (n) =>
  '₱' + parseFloat(n || 0).toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const fmtDate = (d) => {
  if (!d) return '—';
  try {
    const isDateOnly = d.length === 10 || !d.includes('T');
    const date = isDateOnly ? new Date(d + 'T12:00:00') : new Date(d);
    if (isNaN(date.getTime())) return '—';
    return date.toLocaleDateString('en-PH', { year: 'numeric', month: 'short', day: 'numeric' });
  } catch {
    return '—';
  }
};

const initials = (name) =>
  (name || '??').split(' ').map((w) => w[0]).slice(0, 2).join('').toUpperCase();

export default function CustomerDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [debtor, setDebtor] = useState(null);
  const [loading, setLoading] = useState(true);
  const [editOpen, setEditOpen] = useState(false);
  const [payOpen, setPayOpen] = useState(false);

  const [activeTab, setActiveTab] = useState('transactions');
  const [confirmSettle, setConfirmSettle] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [allDebtors, setAllDebtors] = useState([]);
  const [editingHistoryIndex, setEditingHistoryIndex] = useState(null);
  const [editHistoryAmount, setEditHistoryAmount] = useState('');
  const [confirmDeleteHistoryIndex, setConfirmDeleteHistoryIndex] = useState(null);
  const [historyPwPending, setHistoryPwPending] = useState(null); // { type: 'edit'|'delete', index, amount? }

  // Password gate
  const [pwOpen, setPwOpen]     = useState(false);
  const [pwAction, setPwAction] = useState(null); // 'edit' | 'delete' | 'settle' | 'history-edit' | 'history-delete'

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

    // Auto-settle: editing Initial Balance to 0 fully settles the account
    if (rawBalance === 0 && debtor.status !== 'paid' && debtor.balance > 0) {
      await toast.promise(
        axios.post(`${API_URL}/api/debtors/${id}/pay`, {
          amount: debtor.balance,
          date: new Date().toLocaleDateString('en-CA'),
        }).then((r) => setDebtor(r.data)),
        { loading: 'Settling account…', success: 'Account fully settled!', error: 'Failed to settle' }
      );
      return;
    }

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
      changes.push(`Initial Balance: ${fmt(old.original_debt || old.balance)} → ${fmt(rawBalance)}`);
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
      payment_history: updatedHistory,
      // Strip UI-only display keys
      date_borrowed_text: undefined,

      current_balance: undefined,
    };

    await toast.promise(axios.put(`${API_URL}/api/debtors/${id}`, payload).then((r) => setDebtor(r.data)), {
      loading: 'Saving...', success: 'Saved!', error: 'Failed to save',
    });
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

  // Req 7.4–7.6: Delete a single history entry and rollback the balance
  const handleDeleteHistory = async (index) => {
    await toast.promise(
      axios.delete(`${API_URL}/api/debtors/${id}/history/${index}`),
      {
        loading: 'Deleting entry...',
        success: (res) => {
          setDebtor(res.data);
          setConfirmDeleteHistoryIndex(null);
          return 'Entry deleted and balance restored!';
        },
        error: (err) => err.response?.data?.error || 'Failed to delete entry',
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
    await addAuditLog({
      id: `deleted-${debtorId}-${Date.now()}`,
      date: new Date().toISOString(),
      customerName: debtorName,
      type: 'deleted',
      amount: debtorBalance
    });

    navigate('/');
  };

  const handleExport = () => {
    const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
    const pageW = doc.internal.pageSize.getWidth();
    const pageH = doc.internal.pageSize.getHeight();
    const margin = 14;
    const contentW = pageW - margin * 2;

    const fmtPDF = (n) => 'P' + parseFloat(n || 0).toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

    const C = {
      primaryBlue: [51,  92, 154],  // Header & section titles
      boxBorder:   [100, 149, 237], // Summary box border
      textDark:    [ 15,  30,  60],
      textBody:    [ 33,  33,  33], // general black text
      textMuted:   [120, 120, 120],
      white:       [255, 255, 255],
      green:       [ 46, 125,  50], // Settled / Paid amounts
      skyBlue:     [240, 246, 252], // faint zebra striping
      lineBorder:  [220, 225, 230], // thin table borders
    };

    const totalPaid = (debtor.payment_history || [])
      .filter(p => p.type !== 'edit' && p.type !== 'manual_adjustment' && p.amount > 0)
      .reduce((sum, p) => sum + parseFloat(p.amount || 0), 0);

    const isSettled = debtor.status === 'paid';
    const generatedDate = new Date().toLocaleDateString('en-US', {
      year: 'numeric', month: 'short', day: 'numeric'
    });

    let items = [];
    if (debtor.notes) {
      try {
        const parsed = JSON.parse(debtor.notes);
        if (Array.isArray(parsed)) items = parsed;
      } catch (_) {
        items = debtor.notes.split('\n').map(l => l.replace(/^\d+\.\s*/, '').trim()).filter(Boolean);
      }
    }
    const receiptText = debtor.receipt_numbers?.length
      ? debtor.receipt_numbers.map(r => `# ${r}`).join(', ') : 'N/A (Pending)';

    // ════════════════════════════════════════════════════════════
    //  1. HEADER BAND
    // ════════════════════════════════════════════════════════════
    const headerH = 26;
    doc.setFillColor(...C.primaryBlue);
    doc.rect(0, 0, pageW, headerH, 'F');

    doc.setTextColor(...C.white);
    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.text('INDIVIDUAL TRANSACTION REPORT', pageW / 2, headerH / 2 + 3, { align: 'center' });

    // ════════════════════════════════════════════════════════════
    //  2. CUSTOMER DETAILS
    // ════════════════════════════════════════════════════════════
    let y = headerH + 12;

    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...C.primaryBlue);
    doc.text('CUSTOMER DETAILS', margin, y);

    y += 10;
    
    // Row 1: Name and Date
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...C.primaryBlue);
    doc.text('Customer Name', margin, y);
    doc.text('Purchase Date', margin + 100, y);

    y += 5;
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...C.textBody);
    doc.text(debtor.name, margin, y);
    doc.text(fmtDate(debtor.date_borrowed), margin + 100, y);

    // Row 2: Receipt No
    y += 10;
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...C.primaryBlue);
    doc.text('Receipt No', margin, y);

    y += 5;
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...C.textBody);
    doc.text(receiptText, margin, y);

    // Row 3: Items
    y += 10;
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...C.primaryBlue);
    doc.text('Items', margin, y);

    y += 5;
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...C.textBody);
    if (items.length > 0) {
      items.forEach((item) => {
        doc.text(`•   ${item}`, margin + 5, y);
        y += 5;
      });
    } else {
      doc.text('No items listed', margin + 5, y);
      y += 5;
    }

    // ════════════════════════════════════════════════════════════
    //  3. TRANSACTION SUMMARY BOX
    // ════════════════════════════════════════════════════════════
    y += 6;
    const boxH = 30;

    // Border box (no fill)
    doc.setDrawColor(...C.boxBorder);
    doc.setLineWidth(0.5);
    doc.rect(margin, y, contentW, boxH);

    // Title
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...C.primaryBlue);
    doc.text('TRANSACTION SUMMARY', margin + 10, y + 8);

    // Metrics
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...C.textBody);
    
    // Row 1 inside box
    const mY1 = y + 16;
    doc.text('Initial Balance:', margin + 10, mY1);
    doc.setFont('helvetica', 'bold');
    doc.text(fmtPDF(debtor.original_debt || debtor.balance), margin + 38, mY1);

    doc.setFont('helvetica', 'normal');
    doc.text('Total Paid:', margin + 100, mY1);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...C.green);
    doc.text(fmtPDF(totalPaid), margin + 120, mY1);

    // Row 2 inside box
    const mY2 = y + 24;
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...C.textBody);
    doc.text('Current Balance:', margin + 10, mY2);
    
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(isSettled ? C.green[0] : C.textBody[0], isSettled ? C.green[1] : C.textBody[1], isSettled ? C.green[2] : C.textBody[2]);
    doc.text(isSettled ? '₱0.00 (Paid)' : fmtPDF(debtor.balance), margin + 38, mY2);

    // ════════════════════════════════════════════════════════════
    //  4. TABLE DATA
    // ════════════════════════════════════════════════════════════
    const tableTop = y + boxH + 8;
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
        if (payment.type === 'edit') return;
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
        tableData.push([`${rowNum++}`, ev.dateStr, 'Record Started', '', fmtPDF(debtor.original_debt || debtor.balance)]);
      } else if (ev.type === 'settled') {
        tableData.push([`${rowNum++}`, ev.dateStr, 'Account Paid', '', '']);
      } else {
        const p = ev.payment;
        let desc = p.note || 'Payment Received';
        if (p.type === 'manual_adjustment') {
          const reasonMatch = (p.changes || '').match(/Reason: (.*)/);
          desc = `Balance Adjustment (${reasonMatch ? reasonMatch[1] : 'Manual'})`;
        }
        
        const amtNum = parseFloat(p.amount || 0);
        const amountStr = amtNum !== 0
          ? (amtNum < 0 ? `₱ + ${parseFloat(Math.abs(amtNum)).toLocaleString('en-PH', {minimumFractionDigits: 2})}` : `₱ - ${parseFloat(amtNum).toLocaleString('en-PH', {minimumFractionDigits: 2})}`)
          : '';
          
        const balStr = p.balance_after !== undefined ? (p.balance_after <= 0 ? '₱0.00 (Paid)' : fmtPDF(p.balance_after)) : '';
        tableData.push([`${rowNum++}`, ev.dateStr, desc, amountStr, balStr]);
      }
    });

    autoTable(doc, {
      head: [['#', 'Date', 'Description', 'Amount', 'Running Balance']],
      body: tableData,
      startY: tableTop,
      theme: 'grid',
      styles: {
        font: 'helvetica',
        fontSize: 9,
        textColor: C.textBody,
        lineColor: C.lineBorder,
        lineWidth: 0.2,
      },
      headStyles: {
        fillColor: C.primaryBlue,
        textColor: C.white,
        fontStyle: 'bold',
        fontSize: 9,
        halign: 'center',
        cellPadding: { top: 6, bottom: 6, left: 4, right: 4 },
      },
      bodyStyles: {
        cellPadding: { top: 5, bottom: 5, left: 4, right: 4 },
      },
      alternateRowStyles: {
        fillColor: C.skyBlue,
      },
      margin: { left: margin, right: margin },
      columnStyles: {
        0: { cellWidth: 10, halign: 'center', textColor: C.textMuted },
        1: { cellWidth: 32, halign: 'center' },
        2: { cellWidth: 'auto', halign: 'left' },
        3: { cellWidth: 38, halign: 'center', fontStyle: 'bold' },
        4: { cellWidth: 40, halign: 'center', fontStyle: 'bold' },
      },
      didParseCell: function(data) {
        if (data.section === 'body' && data.row.raw[2] === 'Account Paid') {
          data.cell.styles.fontStyle = 'bold';
        }
      },
      didDrawPage: (hookData) => {
        const pageCount = doc.internal.getNumberOfPages();
        const currentPage = hookData.pageNumber;

        doc.setFontSize(8);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(...C.textMuted);
        doc.text(`Page ${currentPage} of ${pageCount}`, pageW / 2, pageH - 8, { align: 'center' });
        doc.text(`Generated on ${generatedDate}`, pageW - margin, pageH - 8, { align: 'right' });
      }
    });

    doc.save(`${debtor.name.replace(/\s+/g, '_')}_Transaction_Report.pdf`);
    toast.success('Transaction report downloaded!');
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

          </div>
        </div>

        <div style={{ display: 'flex', gap: 12 }}>
          <button className="btn btn-outline" onClick={handleExport} style={{ height: 48, padding: '0 24px', borderRadius: 24 }}>
            <Download size={16} style={{ marginRight: 8 }} /> Save PDF
          </button>
          <button className="btn btn-outline" onClick={() => { setPwAction('edit'); setPwOpen(true); }} style={{ height: 48, padding: '0 24px', borderRadius: 24 }}>
            <Edit2 size={16} style={{ marginRight: 8 }} /> Edit Profile
          </button>
          <button className="btn" onClick={() => { setPwAction('delete'); setPwOpen(true); }} style={{ height: 48, padding: '0 24px', borderRadius: 24, color: '#FFFFFF', border: 'none', background: '#EF4444', display: 'flex', alignItems: 'center' }}>
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
          <div style={{ fontSize: 40, fontWeight: 900, color: 'var(--accent)', letterSpacing: '-1px', lineHeight: 1, marginBottom: 20 }}>
            {fmt(debtor.balance)}
          </div>

          {debtor.status === 'paid' ? (
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: 'var(--status-paid-bg)', color: 'var(--status-paid-text)', padding: '6px 12px', borderRadius: 10, fontSize: 14, fontWeight: 800 }}>
              Paid
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div style={{ display: 'flex', gap: 12 }}>
                <button className="btn btn-primary" onClick={() => { setPwAction('pay'); setPwOpen(true); }} style={{ flex: 1, height: 44, borderRadius: 12, fontSize: 14 }}>
                  Add Payment
                </button>
                <button className="btn btn-outline" onClick={() => { setPwAction('settle'); setPwOpen(true); }} style={{ flex: 1, height: 44, borderRadius: 12, fontSize: 14, background: 'var(--bg-page)' }}>
                  Settle Full
                </button>
              </div>

            </div>
          )}
        </div>

        {/* Card 2: Initial Balance */}
        <div className="stat-box" style={{ padding: 24, borderRadius: 24, background: 'var(--bg-card)', border: '1px solid var(--border)', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 8 }}>
            Initial Balance
          </div>
          <div style={{ fontSize: 32, fontWeight: 800, color: 'var(--accent)', letterSpacing: '-0.5px' }}>
            {fmt(debtor.original_debt || debtor.balance)}
          </div>
        </div>

        {/* Card 3: Receipt Information */}
        <div className="stat-box" style={{ padding: 24, borderRadius: 24, background: 'var(--bg-card)', border: '1px solid var(--border)', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 8 }}>
            Receipt Number
          </div>
          <div style={{ fontSize: 24, fontWeight: 800, color: 'var(--accent)', wordBreak: 'break-all' }}>
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
              <h3 style={{ fontSize: 17, fontWeight: 800, color: 'var(--text-primary)', marginBottom: 12, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Purchase Date</h3>
              <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--text-primary)' }}>
                {fmtDate(debtor.date_borrowed)}
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
                      <li key={idx} style={{ fontSize: 16, color: 'var(--text-primary)', fontWeight: 600, lineHeight: 1.5 }}>
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
                          payment,
                          index: idx  // needed for delete rollback
                        });
                      }
                    });
                  }
                }

                // Sort events consistently: most recent at the top (descending)
                events.sort((a, b) => b.timestamp - a.timestamp);

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
                          <div className="timeline-title">Account Paid</div>
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
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
                          <div className="timeline-title">{p.type === 'edit' ? 'Profile Updated' : (p.note || 'Advance Payment')}</div>

                          {/* Action buttons — hidden when account is settled */}
                          {!isSettled && !p.type && (
                            <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexShrink: 0 }}>

                              {/* Edit button (Req 7.1) */}
                              {!isEditing && confirmDeleteHistoryIndex !== ev.index && (
                                <button
                                  className="btn btn-outline"
                                  style={{ height: 28, padding: '0 10px', borderRadius: 6, fontSize: 12 }}
                                  onClick={() => {
                                    setEditingHistoryIndex(ev.index);
                                    setEditHistoryAmount(p.amount.toString());
                                    setConfirmDeleteHistoryIndex(null);
                                  }}
                                >
                                  Edit
                                </button>
                              )}

                              {/* Delete button (Req 7.4) — inline confirm/cancel */}
                              {!isEditing && (
                                confirmDeleteHistoryIndex === ev.index ? (
                                  <>
                                    <span style={{ fontSize: 12, color: '#EF4444', fontWeight: 700 }}>Delete?</span>
                                    <button
                                      className="btn btn-outline"
                                      style={{ height: 28, padding: '0 10px', borderRadius: 6, fontSize: 12, color: '#EF4444', borderColor: 'rgba(239,68,68,0.4)', background: 'rgba(239,68,68,0.08)' }}
                                      onClick={() => {
                                        handleDeleteHistory(ev.index);
                                      }}
                                    >
                                      Yes
                                    </button>
                                    <button
                                      className="btn btn-outline"
                                      style={{ height: 28, padding: '0 10px', borderRadius: 6, fontSize: 12 }}
                                      onClick={() => setConfirmDeleteHistoryIndex(null)}
                                    >
                                      No
                                    </button>
                                  </>
                                ) : (
                                  <button
                                    className="btn btn-outline"
                                    style={{ height: 28, padding: '0 8px', borderRadius: 6, fontSize: 12, color: '#EF4444', borderColor: 'rgba(239,68,68,0.2)', background: 'rgba(239,68,68,0.05)' }}
                                    title="Delete this entry and rollback balance"
                                    onClick={() => {
                                      setHistoryPwPending({ type: 'delete', index: ev.index });
                                      setPwAction('history-delete');
                                      setPwOpen(true);
                                    }}
                                  >
                                    <Trash2 size={12} />
                                  </button>
                                )
                              )}

                            </div>
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
                                      onChange={(e) => setEditHistoryAmount(e.target.value.replace(/[^0-9]/g, ''))}
                                      onKeyDown={(e) => ['e','E','+','-','.'].includes(e.key) && e.preventDefault()}
                                      style={{ width: 100, height: 32, padding: '0 8px', borderRadius: 6, border: '1px solid var(--border)', background: 'var(--bg-page)', color: 'var(--text-primary)' }}
                                    />
                                    <button 
                                      className="btn btn-primary" 
                                      style={{ height: 32, padding: '0 12px', borderRadius: 6, fontSize: 12 }}
                                      onClick={() => {
                                        const raw = parseFloat(editHistoryAmount) || 0;
                                        if (raw === parseFloat(p.amount)) {
                                          toast.error('No changes made to the payment amount');
                                          return;
                                        }
                                        if (raw <= 0) {
                                          toast.error('Amount must be greater than ₱0');
                                          return;
                                        }
                                        // Error if amount exceeds current balance + old amount
                                        const maxAllowed = parseFloat(debtor.balance) + parseFloat(p.amount);
                                        if (raw > maxAllowed) {
                                          toast.error('Payment cannot exceed remaining balance (' + fmt(maxAllowed) + ')');
                                          return;
                                        }
                                        const capped = raw;
                                        setHistoryPwPending({ type: 'edit', index: ev.index, amount: capped });
                                        setPwAction('history-edit');
                                        setPwOpen(true);
                                      }}
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

      
      <ConfirmModal
        open={confirmSettle}
        onClose={() => setConfirmSettle(false)}
        onConfirm={() => handlePay(debtor.id, debtor.balance)}
        title="Settle Full?"
        message={`This will pay the remaining ${fmt(debtor.balance)} and mark this record as fully paid. Continue?`}
      />

      <ConfirmModal
        open={confirmDelete}
        onClose={() => setConfirmDelete(false)}
        onConfirm={handleDelete}
        title="Delete Record?"
        message={`Are you sure you want to permanently delete the record for ${debtor.name}? This cannot be undone.`}
      />

      {/* Password Gate */}
      <PasswordModal
        open={pwOpen}
        onClose={() => { setPwOpen(false); setPwAction(null); setHistoryPwPending(null); }}
        action={
          pwAction === 'edit'           ? `edit ${debtor.name}'s profile` :
          pwAction === 'settle'         ? `fully settle ${debtor.name}'s debt` :
          pwAction === 'pay'            ? `record a payment for ${debtor.name}` :
          pwAction === 'history-edit'   ? 'edit this payment entry' :
          pwAction === 'history-delete' ? 'delete this payment entry' :
          `delete ${debtor.name}'s record`
        }
        onSuccess={() => {
          if (pwAction === 'edit')   setEditOpen(true);
          if (pwAction === 'delete') setConfirmDelete(true);
          if (pwAction === 'settle') setConfirmSettle(true);
          if (pwAction === 'pay')    setPayOpen(true);
          if (pwAction === 'history-edit' && historyPwPending) {
            if (historyPwPending.type === 'open-edit') {
              // Just open the edit input
              setEditingHistoryIndex(historyPwPending.index);
              setEditHistoryAmount(historyPwPending.amount.toString());
              setConfirmDeleteHistoryIndex(null);
            } else {
              // Actually save the edit (already capped)
              handleEditHistory(historyPwPending.index, historyPwPending.amount);
            }
          }
          if (pwAction === 'history-delete' && historyPwPending) {
            setConfirmDeleteHistoryIndex(historyPwPending.index);
            setEditingHistoryIndex(null);
          }
          setPwAction(null);
          setHistoryPwPending(null);
        }}
      />

      <div className="hide-desktop" style={{ position: 'fixed', bottom: 100, left: 24, right: 24, zIndex: 900 }}>
        <button 
          className="btn btn-primary" 
          style={{ width: '100%', height: 56, borderRadius: 16, fontSize: 16, fontWeight: 700 }}
          onClick={() => { setPwAction('settle'); setPwOpen(true); }}
        >
          Settle Full
        </button>
      </div>



      <SearchOverlay 
        open={searchOpen} 
        onClose={() => setSearchOpen(false)} 
        debtors={allDebtors} 
      />
    </div>
  );
}
