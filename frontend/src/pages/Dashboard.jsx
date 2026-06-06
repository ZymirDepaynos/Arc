import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, UserX, Search, Download, Bell, Calendar as CalendarIcon, ArrowUpDown, Check, CheckSquare, FileText, FileSpreadsheet, X, LogOut } from 'lucide-react';

import SearchOverlay from '../components/SearchOverlay';
import toast from 'react-hot-toast';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { useDebtors } from '../hooks/useDebtors';
import SummaryStats from '../components/SummaryStats';
import DebtorCard from '../components/DebtorCard';
import DebtorModal from '../components/DebtorModal';
import PayModal from '../components/PayModal';
import ConfirmModal from '../components/ConfirmModal';
import ThemeToggle from '../components/ThemeToggle';
import { parseNaturalDate } from '../utils/dateUtils';
import { useAuth } from '../contexts/AuthContext';
import api from '../lib/api';

export default function Dashboard() {
  const navigate = useNavigate();
  const { signOut } = useAuth();
  const {
    debtors, loading, error, search, setSearch,
    createDebtor, bulkCreateDebtors, updateDebtor, deleteDebtor, recordPayment, totals
  } = useDebtors();

  const [dataMenuOpen, setDataMenuOpen] = useState(false);
  const [sortMenuOpen, setSortMenuOpen] = useState(false);

  const [addOpen, setAddOpen] = useState(false);
  const [editDebtor, setEditDebtor] = useState(null);
  const [payDebtor, setPayDebtor] = useState(null);
  const [filterStatus, setFilterStatus] = useState('All');
  const [confirmData, setConfirmData] = useState(null);
  const [deleteData, setDeleteData] = useState(null);
  const [searchOpen, setSearchOpen] = useState(false);
  const [selectedIds, setSelectedIds] = useState([]);
  const [isSelectionMode, setIsSelectionMode] = useState(false);
  const [sortOrder, setSortOrder] = useState('recently-added');
  const [bulkConfirm, setBulkConfirm] = useState(null);
  const [exportFilterOpen, setExportFilterOpen] = useState(false);
  const [exportFilterType, setExportFilterType] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageInputVal, setPageInputVal] = useState('1');
  const [searchMode, setSearchMode] = useState('all');
  const [matchCase, setMatchCase] = useState(false);
  const [wholeWord, setWholeWord] = useState(false);
  const itemsPerPage = 10;

  const SEARCH_PLACEHOLDER = 'Search by name or date (e.g. May, May 4, 2026, May 2026).';

  useEffect(() => {
    const handleSearchTrigger = () => setSearchOpen(true);
    window.addEventListener('trigger-search-focus', handleSearchTrigger);
    return () => window.removeEventListener('trigger-search-focus', handleSearchTrigger);
  }, []);

  const toggleSelect = (id) => {
    setSelectedIds(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
  };


  const addAuditLog = async (newLogs) => {
    try {
      let existing = [];
      try {
        const res = await api.get('/api/settings/arc_deleted_logs');
        if (Array.isArray(res.data.value)) existing = res.data.value;
      } catch (e) {
        if (e.response?.status !== 404) throw e;
      }
      const updated = [...existing, ...(Array.isArray(newLogs) ? newLogs : [newLogs])];
      await api.put('/api/settings/arc_deleted_logs', { value: updated });
    } catch (err) {
      console.error('Failed to save audit logs', err);
    }
  };

  const handleBulkDelete = async () => {
    try {
      const newLogs = [];
      selectedIds.forEach(id => {
        const debtor = debtors.find(d => d.id === id);
        if (debtor) {
          newLogs.push({
            id: `deleted-${id}-${Date.now()}`,
            date: new Date().toISOString(),
            customerName: debtor.name,
            type: 'deleted',
            amount: debtor.balance
          });
        }
      });
      await addAuditLog(newLogs);
      await Promise.all(selectedIds.map(id => deleteDebtor(id)));
      setSelectedIds([]);
      setIsSelectionMode(false);
      toast.success(`Deleted ${selectedIds.length} records`);
    } catch (err) {
      toast.error(err.response?.data?.error || 'Bulk delete failed');
    }
  };

  const handleBulkPaid = async () => {
    try {
      await Promise.all(selectedIds.map(id => {
        const d = debtors.find(x => x.id === id);
        return recordPayment(id, d.balance);
      }));
      setSelectedIds([]);
      setIsSelectionMode(false);
      toast.success('Selected customers marked as paid');
    } catch (err) {
      toast.error(err.response?.data?.error || 'Bulk update failed');
    }
  };

  const handleSortChange = (newOrder) => {
    setSortOrder(newOrder);
    setSortMenuOpen(false);
    const labels = {
      'recently-added': 'Recent Activity',
      'a-z': 'A-Z',
      'date-desc': 'Recent Dates',
      'date-asc': 'Oldest Dates'
    };
    toast.success(`Sorted by ${labels[newOrder]}`);
  };



  const exportToPDF = (exportData = debtors) => {
    const data = [...exportData].sort((a, b) => a.name.localeCompare(b.name));
    const doc = new jsPDF();
    const pageW = doc.internal.pageSize.getWidth();
    const pageH = doc.internal.pageSize.getHeight();
    const margin = 14;

    const C = {
      header: [214, 150, 114],
      headerDark: [180, 110, 80],
      peachLight: [252, 235, 225],
      peachMid: [240, 200, 178],
      border: [210, 170, 150],
      textDark: [80, 45, 20],
      textBody: [100, 65, 40],
      textMuted: [160, 120, 100],
      white: [255, 255, 255],
    };

    const generatedDate = new Date().toLocaleDateString('en-US', {
      day: '2-digit', month: 'short', year: 'numeric'
    }).toUpperCase();

    const totalPaidCount = data.filter(d => d.status === 'paid').length;

    const overallPayTotal = data.reduce((acc, d) => {
      const paid = (d.payment_history || [])
        .filter(p => p.type !== 'edit' && p.type !== 'manual_adjustment' && p.amount > 0)
        .reduce((s, p) => s + parseFloat(p.amount || 0), 0);
      return acc + paid;
    }, 0);

    doc.setFillColor(...C.header);
    doc.rect(0, 0, pageW, 40, 'F');

    doc.setTextColor(...C.white);
    doc.setFontSize(20);
    doc.setFont('helvetica', 'bold');
    doc.text('ARC BUSINESS REPORT', margin, 16);

    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(255, 235, 220);
    doc.text(`DATE GENERATED: ${generatedDate}`, margin, 24);
    doc.text(`TOTAL CUSTOMERS: ${data.length}`, margin, 30);


    const boxW = 44;
    const boxH = 28;
    const box1X = pageW - margin - boxW * 2 - 4;
    const box2X = pageW - margin - boxW;


    doc.setFillColor(...C.headerDark);
    doc.roundedRect(box1X, 6, boxW, boxH, 2, 2, 'F');
    doc.setFontSize(6.5);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(255, 210, 190);
    doc.text('OVERALL PAY TOTAL', box1X + 3, 13);
    doc.setFontSize(11);
    doc.setTextColor(...C.white);
    doc.text('P' + overallPayTotal.toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 }), box1X + 3, 22);


    doc.setFillColor(...C.headerDark);
    doc.roundedRect(box2X, 6, boxW, boxH, 2, 2, 'F');
    doc.setFontSize(6.5);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(255, 210, 190);
    doc.text('CUSTOMERS SETTLED', box2X + 3, 13);
    doc.setFontSize(11);
    doc.setTextColor(...C.white);
    doc.text(`${totalPaidCount} / ${data.length}`, box2X + 3, 22);

    const tableBarY = 46;
    doc.setFillColor(...C.header);
    doc.rect(margin, tableBarY, pageW - margin * 2, 8, 'F');
    doc.setTextColor(...C.white);
    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    doc.text('CUSTOMER RECORDS', margin + 3, tableBarY + 5.5);

    const isCompletedExport = data.length > 0 && data.every(d => d.status === 'paid');

    const tableHeaders = isCompletedExport
      ? ['#', 'CUSTOMER NAME', 'PURCHASE DATE', 'TOTAL PAID', 'DATE SETTLED', 'STATUS']
      : ['#', 'CUSTOMER NAME', 'PURCHASE DATE', 'ADVANCE', 'BALANCE', 'STATUS'];

    const tableData = data.map((d, idx) => {
      const displayStatus = d.status === 'active' ? 'OUTSTANDING' : d.status.toUpperCase();
      const rowNum = String(idx + 1);
      if (isCompletedExport) {
        return [
          rowNum,
          d.name,
          d.date_borrowed ? new Date(d.date_borrowed).toLocaleDateString('en-PH') : '—',
          'P' + parseFloat(d.original_debt || 0).toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 }),
          d.updated_at ? new Date(d.updated_at).toLocaleDateString('en-PH') : '—',
          displayStatus
        ];
      } else {
        return [
          rowNum,
          d.name,
          d.date_borrowed ? new Date(d.date_borrowed).toLocaleDateString('en-PH') : '—',
          'P' + parseFloat(d.advance_payment || 0).toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 }),
          'P' + parseFloat(d.balance || 0).toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 }),
          displayStatus
        ];
      }
    });

    autoTable(doc, {
      startY: tableBarY + 8,
      head: [tableHeaders],
      body: tableData,
      theme: 'plain',
      headStyles: {
        fillColor: C.peachMid,
        textColor: C.textDark,
        fontStyle: 'bold',
        fontSize: 8,
        cellPadding: { top: 3, bottom: 3, left: 3, right: 3 },
      },
      bodyStyles: {
        fontSize: 8,
        textColor: C.textBody,
        cellPadding: { top: 3, bottom: 3, left: 3, right: 3 },
        lineColor: C.border,
        lineWidth: 0.25,
      },
      alternateRowStyles: { fillColor: C.peachLight },
      margin: { left: margin, right: margin },
      columnStyles: {
        0: { cellWidth: 13, halign: 'center', textColor: C.textMuted },
        1: { cellWidth: 47 },
        2: { cellWidth: 32 },
        3: { cellWidth: 28, halign: 'right' },
        4: { cellWidth: 30, halign: 'right', fontStyle: 'bold' },
        5: { cellWidth: 32, halign: 'center' },
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

    doc.save(`Arc_Business_Report_${new Date().toISOString().split('T')[0]}.pdf`);
    toast.success('PDF Report Generated');
  };

  const exportToCSV = (exportData = debtors) => {
    const headers = ['ID', 'Name', 'Initial Balance', 'Date of Purchase', 'Advance Payment', 'Balance', 'Status'];
    const sortedData = [...exportData].sort((a, b) => a.name.localeCompare(b.name));
    const rows = sortedData.map(d => [
      d.id,
      `"${d.name.replace(/"/g, '""')}"`,
      d.original_debt || 0,
      d.date_borrowed,
      d.advance_payment,
      d.balance,
      d.status
    ]);

    const csvContent = headers.join(",") + "\n" + rows.map(e => e.join(",")).join("\n");
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);

    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `Arc_Full_Data_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    toast.success('Database Exported for Excel');
    setDataMenuOpen(false);
  };

  const downloadTemplate = () => {
    const headers = ['Name', 'Balance', 'Advance Payment', 'Date of Purchase'];
    const sampleData = [
      ['Juan Dela Cruz', '1000', '200', new Date().toISOString().split('T')[0]],
      ['Maria Clara', '500', '0', new Date().toISOString().split('T')[0]]
    ];
    const csvContent = headers.join(",") + "\n" + sampleData.map(e => e.join(",")).join("\n");
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", "Arc_Import_Template.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    toast.success('Import Template Downloaded');
    setDataMenuOpen(false);
  };

  const handleImportCSV = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const text = event.target.result;
        const lines = text.split('\n').filter(line => line.trim());
        const headers = lines[0].split(',').map(h => h.trim().toLowerCase());

        const data = lines.slice(1).map(line => {
          const values = line.split(',').map(v => v.trim().replace(/^"|"$/g, ''));
          const obj = {};
          headers.forEach((header, index) => {
            // Map common headers to our schema
            if (header.includes('name')) obj.name = values[index];
            if (header.includes('balance')) obj.balance = values[index];
            if (header.includes('advance') && !header.includes('date')) obj.advance_payment = values[index];
            if (header.includes('date') && !header.includes('advance')) obj.date_borrowed = values[index];
            if (header.includes('id')) obj.id = values[index];
          });
          return obj;
        }).filter(c => c.name);

        if (data.length === 0) throw new Error('No valid customer data found in CSV');

        await toast.promise(bulkCreateDebtors(data), {
          loading: `Importing ${data.length} customers...`,
          success: `Successfully imported ${data.length} customers!`,
          error: 'Failed to import CSV'
        });

        setDataMenuOpen(false);
        e.target.value = ''; // Reset input
      } catch (err) {
        toast.error(err.message);
      }
    };
    reader.readAsText(file);
  };

  const handleAdd = async (form) => {
    const rawBalance = parseFloat(form.balance || 0);
    const payload = {
      ...form,
      balance: rawBalance,
      original_debt: rawBalance,
      date_borrowed_text: undefined,
      adjustment_date_text: undefined,
      current_balance: undefined,
    };
    await toast.promise(createDebtor(payload), {
      loading: 'Adding debtor...',
      success: 'Debtor added!',
      error: (e) => e?.response?.data?.error || 'Failed to add debtor',
    });
  };

  const handleEdit = async (form) => {
    const rawBalance = parseFloat(form.balance || 0);


    if (rawBalance === 0 && editDebtor && editDebtor.status !== 'paid' && editDebtor.balance > 0) {
      await toast.promise(recordPayment(editDebtor.id, editDebtor.balance), {
        loading: 'Settling account…',
        success: `${editDebtor.name} has been fully settled!`,
        error: 'Failed to settle',
      });
      return;
    }


    const old = editDebtor;
    const changes = [];
    const fmtD = (d) => d ? new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : 'N/A';

    if (old.date_borrowed !== form.date_borrowed) {
      changes.push(`Purchase Date: ${fmtD(old.date_borrowed)} → ${fmtD(form.date_borrowed)}`);
    }
    if (parseFloat(old.original_debt || old.balance) !== rawBalance) {
      changes.push(`Initial Balance: ₱${parseFloat(old.original_debt || old.balance).toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} → ₱${rawBalance.toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`);
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
      balance: old.balance,
      advance_payment: old.advance_payment,
      payment_history: updatedHistory,

      date_borrowed_text: undefined,
      current_balance: undefined,
    };
    await toast.promise(updateDebtor(editDebtor.id, payload), {
      loading: 'Saving changes...',
      success: 'Changes saved!',
      error: (e) => e?.response?.data?.error || 'Failed to save',
    });
  };

  const handleDelete = async (id) => {
    const debtor = debtors.find(d => d.id === id) || deleteData;
    await toast.promise(deleteDebtor(id), {
      loading: 'Deleting...',
      success: 'Debtor removed.',
      error: (err) => err.response?.data?.error || 'Failed to delete',
    });
    if (debtor) {
      await addAuditLog({
        id: `deleted-${id}-${Date.now()}`,
        date: new Date().toISOString(),
        customerName: debtor.name,
        type: 'deleted',
        amount: debtor.balance
      });
    }
  };

  const handlePay = async (id, amount, date) => {
    await toast.promise(recordPayment(id, amount, date), {
      loading: 'Recording payment...',
      success: 'Payment recorded!',
      error: (err) => err.response?.data?.error || 'Failed to record payment',
    });
  };



  const matchesDate = (dateBorrowed, rawInput) => {
    if (!dateBorrowed || !rawInput) return false;
    const storedDate = dateBorrowed.substring(0, 10);
    const [syear, smonth, sday] = storedDate.split('-').map(Number);

    const MONTH_NAMES = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'];
    const clean = rawInput.toLowerCase().replace(/,/g, '').trim();
    const parts = clean.split(/\s+/);

    if (parts.length === 1 && /^\d{4}$/.test(parts[0])) {
      const yearNum = parseInt(parts[0]);
      if (yearNum > 1900 && yearNum < 3000) return syear === yearNum;
    }

    const monthIdx = MONTH_NAMES.findIndex(mn => parts[0].startsWith(mn) && parts[0].length >= 3);

    if (monthIdx !== -1) {
      const monthNum = monthIdx + 1;
      if (parts.length === 1) {
        // 'may' → match any record with month = May, any year/day
        return smonth === monthNum;
      }
      const secondNum = parseInt(parts[1]);
      if (!isNaN(secondNum)) {

        if (secondNum > 1900 && secondNum < 3000 && parts.length === 2) {

          return smonth === monthNum && syear === secondNum;
        }
        if (parts.length === 2) {

          return smonth === monthNum && sday === secondNum;
        }
        const thirdNum = parseInt(parts[2]);
        if (parts.length >= 3 && !isNaN(thirdNum) && thirdNum > 1900) {

          return smonth === monthNum && sday === secondNum && syear === thirdNum;
        }
      }
    }


    const parsed = parseNaturalDate(rawInput);
    if (parsed) return storedDate === parsed;

    return false;
  };

  const filteredCustomers = debtors
    .filter(d => {

      if (filterStatus === 'Paid' && d.status !== 'paid') return false;
      if (filterStatus === 'Active' && d.status !== 'active') return false;
      if (filterStatus === 'Partial' && d.status !== 'partial') return false;

      const rawS = search.trim();
      if (!rawS) return true;


      const term = matchCase ? rawS : rawS.toLowerCase();
      const s = term.startsWith('#') ? term.substring(1) : term;

      let nameMatch;
      if (wholeWord) {

        const nameToCompare = matchCase ? d.name : d.name.toLowerCase();
        nameMatch = (nameToCompare === s);
      } else {

        const nameToCompare = matchCase ? d.name : d.name.toLowerCase();
        nameMatch = nameToCompare.includes(s);
      }

      const dateMatch = matchesDate(d.date_borrowed, rawS);

      const idMatch = wholeWord
        ? d.id.toString() === s
        : d.id.toString().includes(s);

      const receiptMatch = d.receipt_numbers &&
        d.receipt_numbers.some(r => {
          const rComp = matchCase ? r : r.toLowerCase();
          return wholeWord ? rComp === s : rComp.includes(s);
        });

      let matchesSearch;
      if (searchMode === 'name') {
        matchesSearch = nameMatch;
      } else if (searchMode === 'date') {
        matchesSearch = dateMatch;
      } else {
        matchesSearch = nameMatch || dateMatch || idMatch || receiptMatch;
      }

      return matchesSearch;
    })
    .sort((a, b) => {
      if (sortOrder === 'a-z') return a.name.localeCompare(b.name);
      if (sortOrder === 'date-asc') return new Date(a.date_borrowed) - new Date(b.date_borrowed);
      if (sortOrder === 'date-desc') return new Date(b.date_borrowed) - new Date(a.date_borrowed);

      const aTime = new Date(a.updated_at || a.created_at || 0).getTime();
      const bTime = new Date(b.updated_at || b.created_at || 0).getTime();
      return bTime - aTime;
    });

  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentCustomers = filteredCustomers.slice(indexOfFirstItem, indexOfLastItem);
  const totalPages = Math.ceil(filteredCustomers.length / itemsPerPage);

  const toggleAll = () => {
    const pageIds = currentCustomers.map(d => d.id);
    const allPageSelected = pageIds.length > 0 && pageIds.every(id => selectedIds.includes(id));
    if (allPageSelected) {
      setSelectedIds(prev => prev.filter(id => !pageIds.includes(id)));
    } else {
      setSelectedIds(prev => [...new Set([...prev, ...pageIds])]);
    }
  };


  useEffect(() => {
    setCurrentPage(1);
    setPageInputVal('1');
    setSelectedIds([]);
  }, [search, filterStatus, sortOrder, searchMode, matchCase, wholeWord]);


  useEffect(() => {
    setSelectedIds([]);
  }, [currentPage]);

  return (
    <>
      { }
      <div className="hide-desktop" style={{ padding: '24px 24px 0' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <div>
            <div style={{ fontSize: 13, color: 'var(--text-muted)', fontWeight: 600 }}>Hi, Admin</div>
            <div style={{ fontSize: 22, fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '-0.5px' }}>Customer Records</div>
          </div>
          <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
            <button className="btn-icon-sm" style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 12 }}>
              <Bell size={20} />
            </button>
            <div className="row-avatar" style={{ width: 40, height: 40, borderRadius: 12 }}>AD</div>
          </div>
        </div>
      </div>

      { }
      <div className="top-bar hide-mobile" style={{ flexWrap: 'nowrap' }}>
        <div className="logo-brand" onClick={() => navigate('/')} style={{ cursor: 'pointer' }}>
          <span className="logo-text">Arc</span>
        </div>

        <div className="top-main-actions">
          <div className="search-wrap search-wrap-enhanced" style={{ position: 'relative' }}>
            { }
            <div className="search-mode-tabs">
              {[['all', 'All'], ['name', 'Name'], ['date', 'Date']].map(([mode, label]) => (
                <button
                  key={mode}
                  className={`search-mode-tab ${searchMode === mode ? 'active' : ''}`}
                  onClick={() => { setSearchMode(mode); setSearch(''); }}
                  type="button"
                >
                  {label}
                </button>
              ))}
            </div>
            <Search className="search-icon search-icon-shifted" size={16} color="var(--text-muted)" />
            <input
              id="main-search-input"
              type="text"
              className="search-input search-input-enhanced"
              placeholder={SEARCH_PLACEHOLDER}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            {/* Search Controls: Aa | ab | X */}
            <div className="search-controls">
              <button
                className={`search-toggle-btn ${matchCase ? 'active' : ''}`}
                onClick={() => setMatchCase(v => !v)}
                type="button"
                title="Match Case (Aa)"
                aria-pressed={matchCase}
              >
                Aa
              </button>
              <button
                className={`search-toggle-btn ${wholeWord ? 'active' : ''}`}
                onClick={() => setWholeWord(v => !v)}
                type="button"
                title="Match Whole Word (ab)"
                aria-pressed={wholeWord}
              >
                <span style={{ textDecoration: 'underline' }}>ab</span>
              </button>
              {search && (
                <button
                  className="search-clear-btn search-clear-inline"
                  onClick={() => setSearch('')}
                  type="button"
                  aria-label="Clear search"
                >
                  <X size={13} />
                </button>
              )}
            </div>
          </div>

          <div className="action-buttons-group">
            {/* Data Actions Dropdown */}
            <div style={{ position: 'relative' }}>
              <button
                className="calendar-pill-btn"
                onClick={() => setDataMenuOpen(!dataMenuOpen)}
                style={{
                  background: dataMenuOpen ? 'var(--accent)' : 'var(--bg-card)',
                  color: dataMenuOpen ? '#000' : 'var(--text-primary)',
                  borderColor: dataMenuOpen ? 'var(--accent)' : 'var(--border)'
                }}
              >
                <Download size={16} />
                <span>Data Actions</span>
              </button>

              <AnimatePresence>
                {dataMenuOpen && (
                  <>
                    <div
                      style={{ position: 'fixed', inset: 0, zIndex: 99 }}
                      onClick={() => setDataMenuOpen(false)}
                    />
                    <motion.div
                      className="dropdown-menu"
                      initial={{ opacity: 0, y: 10, scale: 0.95 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: 10, scale: 0.95 }}
                    >
                      <div className="dropdown-item" onClick={() => { setExportFilterType('pdf'); setExportFilterOpen(true); setDataMenuOpen(false); }}>
                        <FileText size={16} />
                        <span>Export Elite PDF</span>
                      </div>
                      <div className="dropdown-item" onClick={() => { setExportFilterType('csv'); setExportFilterOpen(true); setDataMenuOpen(false); }}>
                        <FileSpreadsheet size={16} />
                        <span>Export Excel (CSV)</span>
                      </div>
                      <div className="dropdown-item" onClick={downloadTemplate}>
                        <Download size={16} />
                        <span>Download CSV Template</span>
                      </div>
                      <div className="dropdown-divider" />
                      <label className="dropdown-item" style={{ cursor: 'pointer' }}>
                        <Plus size={16} />
                        <span>Import from CSV</span>
                        <input
                          type="file"
                          accept=".csv"
                          onChange={handleImportCSV}
                          style={{ display: 'none' }}
                        />
                      </label>
                    </motion.div>
                  </>
                )}
              </AnimatePresence>
            </div>

            <button
              className="calendar-pill-btn"
              onClick={() => navigate('/calendar')}
              title="Calendar"
            >
              <CalendarIcon size={16} />
              <span>Calendar</span>
            </button>
            <ThemeToggle />
            <button
              className="btn btn-outline"
              onClick={signOut}
              title="Sign Out"
              style={{ width: 44, height: 44, padding: 0, borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
            >
              <LogOut size={18} />
            </button>
            <button className="btn btn-primary" onClick={() => setAddOpen(true)}>
              <Plus size={18} />
              <span>Add New Customer</span>
            </button>
          </div>
        </div>
      </div>

      { }
      <div className="hide-desktop" style={{ padding: '0 24px 24px' }}>
        <div className="search-wrap search-wrap-enhanced">
          { }
          <div className="search-mode-tabs">
            {[['all', 'All'], ['name', 'Name'], ['date', 'Date']].map(([mode, label]) => (
              <button
                key={mode}
                className={`search-mode-tab ${searchMode === mode ? 'active' : ''}`}
                onClick={() => { setSearchMode(mode); setSearch(''); }}
                type="button"
              >
                {label}
              </button>
            ))}
          </div>
          <Search className="search-icon search-icon-shifted" size={18} />
          <input
            type="text"
            className="search-input search-input-enhanced"
            placeholder={SEARCH_PLACEHOLDER}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            id="mobile-search-trigger"
          />
          {/* Search Controls: Aa | ab | X */}
          <div className="search-controls">
            <button
              className={`search-toggle-btn ${matchCase ? 'active' : ''}`}
              onClick={() => setMatchCase(v => !v)}
              type="button"
              title="Match Case"
              aria-pressed={matchCase}
            >
              Aa
            </button>
            <button
              className={`search-toggle-btn ${wholeWord ? 'active' : ''}`}
              onClick={() => setWholeWord(v => !v)}
              type="button"
              title="Whole Word"
              aria-pressed={wholeWord}
            >
              <span style={{ textDecoration: 'underline' }}>ab</span>
            </button>
            {search && (
              <button
                className="search-clear-btn search-clear-inline"
                onClick={() => setSearch('')}
                type="button"
                aria-label="Clear search"
              >
                <X size={13} />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Stats Section */}
      <SummaryStats
        totals={totals}
        filteredTotals={search.trim() ? filteredCustomers.reduce(
          (acc, d) => {
            acc.totalBalance += parseFloat(d.balance) || 0;
            acc.totalAdvance += parseFloat(d.advance_payment) || 0;
            if (d.status === 'active') acc.activeCount++;
            if (d.status === 'partial') acc.partialCount++;
            if (d.status === 'paid') acc.paidCount++;
            return acc;
          },
          { totalBalance: 0, totalAdvance: 0, activeCount: 0, partialCount: 0, paidCount: 0 }
        ) : null}
        searchLabel={search.trim() || null}
      />

      { }
      <div className="table-section">
        <div className="table-header-row">
          <div className="table-header-left">
            <h2 className="table-title">Customer Records</h2>
            <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginTop: 8 }}>
              <div className="table-stats hide-mobile">
                Total Customers: {filteredCustomers.length}
              </div>
              <button
                className={`filter-chip ${isSelectionMode ? 'active' : ''}`}
                onClick={() => {
                  setIsSelectionMode(!isSelectionMode);
                  if (!isSelectionMode) setSelectedIds([]);
                }}
                style={{
                  background: isSelectionMode ? 'var(--accent)' : 'var(--bg-card)',
                  color: isSelectionMode ? '#000' : 'var(--text-primary)',
                  borderColor: isSelectionMode ? 'var(--accent)' : 'var(--border)',
                  fontWeight: 700,
                  padding: '0 12px',
                  height: 32,
                  fontSize: 12,
                  borderRadius: 10,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6
                }}
              >
                <CheckSquare size={14} />
                <span>{isSelectionMode ? 'Done Selecting' : 'Select Mode'}</span>
              </button>
            </div>
          </div>
          <div className="table-filters">
            <div className="filter-chips hide-mobile">
              {['All', 'Outstanding', 'Partial', 'Paid'].map(status => (
                <button
                  key={status}
                  className={`filter-chip ${filterStatus === (status === 'Outstanding' ? 'Active' : status) ? 'active' : ''}`}
                  onClick={() => {
                    setFilterStatus(status === 'Outstanding' ? 'Active' : status);
                    setSearch(''); // Clear search when switching modes
                  }}
                  style={{
                    padding: filterStatus === status ? '8px 24px' : '8px 18px',
                    fontSize: filterStatus === status ? '14px' : '13px',
                    transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)'
                  }}
                >
                  {status}
                </button>
              ))}
            </div>

            <select
              className="filter-select-mobile hide-desktop"
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
            >
              <option value="All">All Status</option>
              <option value="Active">Outstanding</option>
              <option value="Partial">Partial</option>
              <option value="Paid">Paid</option>
            </select>

            <div style={{ position: 'relative' }}>
              <button
                className="calendar-pill-btn"
                onClick={() => setSortMenuOpen(!sortMenuOpen)}
                style={{
                  background: sortMenuOpen ? 'var(--accent)' : 'var(--bg-card)',
                  color: sortMenuOpen ? '#000' : 'var(--text-primary)',
                  borderColor: sortMenuOpen ? 'var(--accent)' : 'var(--border)',
                  padding: '0 14px',
                  height: 34
                }}
              >
                <ArrowUpDown size={16} />
                <span className="hide-mobile">Sort</span>
              </button>

              <AnimatePresence>
                {sortMenuOpen && (
                  <>
                    <div
                      style={{ position: 'fixed', inset: 0, zIndex: 99 }}
                      onClick={() => setSortMenuOpen(false)}
                    />
                    <motion.div
                      className="dropdown-menu"
                      style={{ right: 0, left: 'auto', width: 200 }}
                      initial={{ opacity: 0, y: 10, scale: 0.95 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: 10, scale: 0.95 }}
                    >
                      <div className="dropdown-item" onClick={() => handleSortChange('recently-added')}>
                        <span style={{ flex: 1 }}>Recent Activity</span>
                        {sortOrder === 'recently-added' && <Check size={14} color="var(--accent)" />}
                      </div>
                      <div className="dropdown-item" onClick={() => handleSortChange('a-z')}>
                        <span style={{ flex: 1 }}>A-Z Names</span>
                        {sortOrder === 'a-z' && <Check size={14} color="var(--accent)" />}
                      </div>
                      <div className="dropdown-item" onClick={() => handleSortChange('date-desc')}>
                        <span style={{ flex: 1 }}>Recent to Oldest Date</span>
                        {sortOrder === 'date-desc' && <Check size={14} color="var(--accent)" />}
                      </div>
                      <div className="dropdown-item" onClick={() => handleSortChange('date-asc')}>
                        <span style={{ flex: 1 }}>Oldest to Recent Date</span>
                        {sortOrder === 'date-asc' && <Check size={14} color="var(--accent)" />}
                      </div>
                    </motion.div>
                  </>
                )}
              </AnimatePresence>
            </div>
          </div>
        </div>

        {loading ? (
          <div style={{ textAlign: 'center', padding: '60px 0', color: 'var(--text-muted)' }}>Loading records...</div>
        ) : error ? (
          <div style={{ textAlign: 'center', padding: '60px 0', color: 'var(--danger)' }}>{error}</div>
        ) : filteredCustomers.length === 0 ? (
          <div className="empty-state">
            <UserX size={32} className="empty-state-icon" style={{ margin: '0 auto 16px' }} />
            <div className="empty-state-title">{search ? 'No results found' : 'No customers yet'}</div>
            <div className="empty-state-sub">Click "Add new customer" to get started</div>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table className="data-table">
              <thead>
                <tr>
                  {isSelectionMode && (
                    <th className="col-selection">
                      <div
                        className={`checkbox-custom ${currentCustomers.length > 0 && currentCustomers.every(d => selectedIds.includes(d.id)) ? 'checked' : ''}`}
                        onClick={toggleAll}
                      >
                        {currentCustomers.length > 0 && currentCustomers.every(d => selectedIds.includes(d.id)) && <Check size={14} />}
                      </div>
                    </th>
                  )}
                  <th className="col-receipt hide-mobile">Receipt No.</th>
                  <th className="col-name">Full Name</th>
                  <th className="col-date">Date of Purchase</th>
                  <th className="col-init-balance hide-mobile">Initial Balance</th>
                  <th className="col-balance">Balance</th>
                  <th className="col-status hide-tablet">Status</th>
                  <th className="col-actions"></th>
                </tr>
              </thead>
              <motion.tbody initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                {currentCustomers.map((debtor, i) => (
                  <DebtorCard
                    key={debtor.id}
                    debtor={debtor}
                    index={i}
                    selected={selectedIds.includes(debtor.id)}
                    onToggleSelect={() => toggleSelect(debtor.id)}
                    onEdit={() => setEditDebtor(debtor)}
                    onDelete={() => setDeleteData(debtor)}
                    onPay={() => setPayDebtor(debtor)}
                    onSettle={() => setConfirmData(debtor)}
                    isSelectionMode={isSelectionMode}
                  />
                ))}
              </motion.tbody>
            </table>

            { }
            {totalPages > 1 && (
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 24, padding: '0 8px', flexWrap: 'wrap', gap: 12 }}>
                <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>
                  Showing {indexOfFirstItem + 1}–{Math.min(indexOfLastItem, filteredCustomers.length)} of {filteredCustomers.length} customers
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  { }
                  <button
                    className="btn btn-outline btn-sm"
                    disabled={currentPage === 1}
                    onClick={() => {
                      const next = Math.max(1, currentPage - 1);
                      setCurrentPage(next);
                      setPageInputVal(String(next));
                    }}
                    style={{ borderRadius: 10, padding: '6px 14px', minWidth: 'unset' }}
                  >
                    ‹ Prev
                  </button>

                  { }
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <input
                      id="pagination-page-input"
                      type="number"
                      min={1}
                      max={totalPages}
                      value={pageInputVal}
                      onChange={(e) => setPageInputVal(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          const parsed = parseInt(pageInputVal, 10);
                          if (!isNaN(parsed)) {
                            const clamped = Math.min(totalPages, Math.max(1, parsed));
                            setCurrentPage(clamped);
                            setPageInputVal(String(clamped));
                          } else {
                            setPageInputVal(String(currentPage));
                          }
                          e.target.blur();
                        }
                      }}
                      onBlur={() => {
                        const parsed = parseInt(pageInputVal, 10);
                        if (!isNaN(parsed)) {
                          const clamped = Math.min(totalPages, Math.max(1, parsed));
                          setCurrentPage(clamped);
                          setPageInputVal(String(clamped));
                        } else {
                          setPageInputVal(String(currentPage));
                        }
                      }}
                      style={{
                        width: 52,
                        height: 34,
                        textAlign: 'center',
                        fontSize: 13,
                        fontWeight: 700,
                        fontFamily: 'inherit',
                        background: 'var(--glass-bg)',
                        color: 'var(--text-primary)',
                        border: '1px solid var(--accent)',
                        borderRadius: 10,
                        outline: 'none',
                        boxShadow: '0 0 0 3px var(--accent-light)',
                        MozAppearance: 'textfield',
                      }}
                    />
                    <span style={{ fontSize: 13, color: 'var(--text-muted)', fontWeight: 600, whiteSpace: 'nowrap' }}>
                      / {totalPages}
                    </span>
                  </div>

                  { }
                  <button
                    className="btn btn-outline btn-sm"
                    disabled={currentPage === totalPages}
                    onClick={() => {
                      const next = Math.min(totalPages, currentPage + 1);
                      setCurrentPage(next);
                      setPageInputVal(String(next));
                    }}
                    style={{ borderRadius: 10, padding: '6px 14px', minWidth: 'unset' }}
                  >
                    Next ›
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      { }
      <DebtorModal open={addOpen} onClose={() => setAddOpen(false)} onSubmit={handleAdd} />
      <DebtorModal
        open={!!editDebtor}
        onClose={() => setEditDebtor(null)}
        onSubmit={handleEdit}
        initial={editDebtor}
      />
      <PayModal
        open={!!payDebtor}
        onClose={() => setPayDebtor(null)}
        debtor={payDebtor}
        onPay={handlePay}
      />

      <ConfirmModal
        open={!!confirmData}
        onClose={() => setConfirmData(null)}
        onConfirm={() => handlePay(confirmData.id, confirmData.balance)}
        title="Settle Full Debt?"
        message={`This will pay the full balance of ₱${(confirmData?.balance || 0).toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} and mark ${confirmData?.name} as fully settled in the records. Continue?`}
      />

      <ConfirmModal
        open={!!deleteData}
        onClose={() => setDeleteData(null)}
        onConfirm={() => handleDelete(deleteData.id)}
        title="Delete Record?"
        message={`Are you sure you want to permanently delete the record for ${deleteData?.name}? This cannot be undone.`}
      />




      <SearchOverlay
        open={searchOpen}
        onClose={() => setSearchOpen(false)}
        debtors={debtors}
      />

      <AnimatePresence>
        {selectedIds.length > 0 && (
          <motion.div
            className="bulk-actions-bar"
            initial={{ y: 100, x: '-50%', opacity: 0 }}
            animate={{ y: 0, x: '-50%', opacity: 1 }}
            exit={{ y: 100, x: '-50%', opacity: 0 }}
          >
            <div className="bulk-count">{selectedIds.length} Selected</div>
            <div className="bulk-btns">
              {selectedIds.some(id => debtors.find(d => d.id === id)?.status !== 'paid') && (
                <button className="btn btn-primary btn-sm" onClick={() => setBulkConfirm({ type: 'paid' })}>Mark as Paid</button>
              )}
              <button className="btn btn-outline btn-sm" style={{ borderColor: '#FF4D4D', color: '#FF4D4D' }} onClick={() => setBulkConfirm({ type: 'delete' })}>Delete All</button>
              <button className="btn" style={{ background: 'var(--accent)', color: '#FFFFFF', width: 42, height: 42, borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 0 }} onClick={() => setSelectedIds([])}><X size={20} /></button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <ConfirmModal
        open={!!bulkConfirm}
        onClose={() => setBulkConfirm(null)}
        onConfirm={bulkConfirm?.type === 'paid' ? handleBulkPaid : handleBulkDelete}
        title={bulkConfirm?.type === 'paid' ? 'Mark All as Paid?' : 'Delete Selected?'}
        message={
          bulkConfirm?.type === 'paid'
            ? `You are about to mark ${selectedIds.length} customers as fully paid. This will settle all their remaining balances.`
            : `Are you sure you want to permanently delete ${selectedIds.length} records? This action cannot be undone.`
        }
      />

      { }
      <AnimatePresence>
        {exportFilterOpen && (
          <motion.div
            className="modal-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setExportFilterOpen(false)}
            style={{ zIndex: 1000 }}
          >
            <motion.div
              className="modal"
              style={{ maxWidth: 380, padding: 32 }}
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              onClick={(e) => e.stopPropagation()}
            >
              <div style={{ textAlign: 'center', marginBottom: 24 }}>
                <div style={{ width: 56, height: 56, borderRadius: 16, background: 'var(--accent-light)', color: 'var(--accent)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
                  {exportFilterType === 'pdf' ? <FileText size={26} /> : <FileSpreadsheet size={26} />}
                </div>
                <h2 style={{ fontSize: 22, fontWeight: 800, marginBottom: 6 }}>
                  {exportFilterType === 'pdf' ? 'Export PDF' : 'Export CSV'}
                </h2>
                <p style={{ color: 'var(--text-muted)', fontSize: 14 }}>Choose which records to include</p>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 24 }}>
                {[
                  { label: 'All Records', value: 'all', desc: `${debtors.length} records` },
                  { label: 'Outstanding Only', value: 'active', desc: `${debtors.filter(d => d.status === 'active').length} records` },
                  { label: 'Partial Only', value: 'partial', desc: `${debtors.filter(d => d.status === 'partial').length} records` },
                  { label: 'Paid', value: 'paid', desc: `${debtors.filter(d => d.status === 'paid').length} records` },
                ].map(opt => (
                  <button
                    key={opt.value}
                    className="btn btn-outline"
                    style={{ justifyContent: 'space-between', padding: '14px 18px', textAlign: 'left' }}
                    onClick={() => {
                      const filtered = opt.value === 'all' ? debtors : debtors.filter(d => d.status === opt.value);
                      if (exportFilterType === 'pdf') exportToPDF(filtered);
                      else exportToCSV(filtered);
                      setExportFilterOpen(false);
                    }}
                  >
                    <span style={{ fontWeight: 700 }}>{opt.label}</span>
                    <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>{opt.desc}</span>
                  </button>
                ))}
              </div>
              <button className="btn btn-outline" style={{ width: '100%' }} onClick={() => setExportFilterOpen(false)}>Cancel</button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
