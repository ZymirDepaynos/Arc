import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, UserX, Search, Download, Bell, Calendar as CalendarIcon, ArrowUpDown, Check, CheckSquare, Square, FileText, FileSpreadsheet, History } from 'lucide-react';
import MobileNav from '../components/MobileNav';
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
import logo from '../assets/logo.png';
import ThemeToggle from '../components/ThemeToggle';
import { parseNaturalDate, formatDisplayDate } from '../utils/dateUtils';

export default function Dashboard() {
  const navigate = useNavigate();
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
  const [sortOrder, setSortOrder] = useState('date-desc'); // date-desc, date-asc, a-z
  const [bulkConfirm, setBulkConfirm] = useState(null); // { type: 'paid' | 'delete' }
  const [exportFilterOpen, setExportFilterOpen] = useState(false);
  const [exportFilterType, setExportFilterType] = useState(null); // 'pdf' | 'csv'

  useEffect(() => {
    const handleSearchTrigger = () => setSearchOpen(true);
    window.addEventListener('trigger-search-focus', handleSearchTrigger);
    return () => window.removeEventListener('trigger-search-focus', handleSearchTrigger);
  }, []);

  const toggleSelect = (id) => {
    setSelectedIds(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
  };

  const toggleAll = () => {
    if (selectedIds.length === filteredCustomers.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(filteredCustomers.map(d => d.id));
    }
  };

  const handleBulkDelete = async () => {
    try {
      const logs = JSON.parse(localStorage.getItem('arc_deleted_logs') || '[]');
      selectedIds.forEach(id => {
        const debtor = debtors.find(d => d.id === id);
        if (debtor) {
           logs.push({
             id: `deleted-${id}-${Date.now()}`,
             date: new Date().toISOString(),
             customerName: debtor.name,
             type: 'deleted',
             amount: debtor.balance
           });
        }
      });
      await Promise.all(selectedIds.map(id => deleteDebtor(id)));
      localStorage.setItem('arc_deleted_logs', JSON.stringify(logs));
      setSelectedIds([]);
      setIsSelectionMode(false);
      toast.success(`Deleted ${selectedIds.length} records`);
    } catch (err) {
      toast.error('Bulk delete failed');
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
      toast.error('Bulk update failed');
    }
  };

  const handleSortChange = (newOrder) => {
    setSortOrder(newOrder);
    setSortMenuOpen(false);
    const labels = {
      'a-z': 'A-Z',
      'date-desc': 'Recent Dates',
      'date-asc': 'Oldest Dates'
    };
    toast.success(`Sorted by ${labels[newOrder]}`);
  };

  const handleModeChange = (mode) => {
    setFilterStatus(prev => prev === mode ? 'All' : mode);
    setSearch('');
    setSortMenuOpen(false);
    // Focus search bar
    setTimeout(() => {
      const input = document.getElementById('main-search-input') || document.getElementById('mobile-search-trigger');
      input?.focus();
    }, 100);
  };

  const exportToPDF = (exportData = debtors) => {
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    
    // 1. ELITE BRANDED HEADER
    doc.setFillColor(5, 7, 10);
    doc.rect(0, 0, pageWidth, 45, 'F');
    
    doc.setFontSize(26);
    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.text('Arc Business Report', 14, 20);
    
    doc.setFontSize(10);
    doc.setTextColor(180, 180, 180);
    doc.setFont('helvetica', 'normal');
    doc.text(`DATE GENERATED: ${new Date().toLocaleDateString('en-US', { day: '2-digit', month: 'short', year: 'numeric' }).toUpperCase()}`, 14, 28);
    doc.text(`TOTAL CUSTOMERS: ${exportData.length}`, 14, 34);

    // 2. QUICK SUMMARY BOXES (at the top of PDF)
    doc.setFillColor(255, 90, 54); // Arc Orange
    doc.rect(pageWidth - 60, 15, 46, 20, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(8);
    doc.text('TOTAL OUTSTANDING', pageWidth - 57, 22);
    doc.setFontSize(12);
    const exportBalance = exportData.reduce((acc, d) => acc + (parseFloat(d.balance) || 0), 0);
    doc.text('P' + exportBalance.toLocaleString(), pageWidth - 57, 30);

    // 3. TABLE DATA PREP
    const tableData = exportData.map(d => [
      d.name,
      d.date_borrowed ? new Date(d.date_borrowed).toLocaleDateString('en-PH') : '—',
      'P' + parseFloat(d.advance_payment || 0).toLocaleString(),
      'P' + parseFloat(d.balance || 0).toLocaleString(),
      d.status.toUpperCase()
    ]);

    // 4. ELITE TABLE GENERATION
    autoTable(doc, {
      startY: 55,
      head: [['CUSTOMER NAME', 'PURCHASE DATE', 'ADVANCE', 'BALANCE', 'STATUS']],
      body: tableData,
      theme: 'striped',
      headStyles: { 
        fillColor: [5, 7, 10], 
        textColor: [255, 255, 255], 
        fontSize: 9, 
        fontStyle: 'bold',
        cellPadding: 4
      },
      columnStyles: {
        0: { cellWidth: 50 },
        1: { cellWidth: 35 },
        2: { cellWidth: 35 },
        3: { cellWidth: 35 },
        4: { halign: 'center' }
      },
      styles: { 
        fontSize: 8, 
        cellPadding: 3, 
        valign: 'middle',
        font: 'helvetica'
      },
      alternateRowStyles: { 
        fillColor: [250, 250, 250] 
      }
    });

    doc.save(`Arc_Business_Report_${new Date().toISOString().split('T')[0]}.pdf`);
    toast.success('PDF Report Generated');
  };

  const exportToCSV = (exportData = debtors) => {
    const headers = ['ID', 'Name', 'Initial Balance', 'Date of Purchase', 'Advance Payment', 'Advance Payment Date', 'Balance', 'Status'];
    const rows = exportData.map(d => [
      d.id,
      `"${d.name.replace(/"/g, '""')}"`, // Escape quotes for CSV
      d.original_debt || 0,
      d.date_borrowed,
      d.advance_payment,
      d.advance_payment_date || '',
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
    URL.revokeObjectURL(url); // Clean up memory
    toast.success('Database Exported for Excel');
    setDataMenuOpen(false);
  };

  const downloadTemplate = () => {
    const headers = ['Name', 'Balance', 'Advance Payment', 'Advance Payment Date', 'Date of Purchase'];
    const sampleData = [
      ['Juan Dela Cruz', '1000', '200', new Date().toISOString().split('T')[0], new Date().toISOString().split('T')[0]],
      ['Maria Clara', '500', '0', '', new Date().toISOString().split('T')[0]]
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
            if (header.includes('advance') && header.includes('date')) obj.advance_payment_date = values[index];
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
      // Strip UI-only display keys
      date_borrowed_text: undefined,
      advance_payment_date_text: undefined,
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
    const currentBalance = parseFloat(form.current_balance || 0);
    const advancePayment = Math.max(0, rawBalance - currentBalance);

    const payload = {
      ...form,
      balance: rawBalance,
      original_debt: rawBalance,
      advance_payment: advancePayment,
      advance_payment_date: form.advance_payment_date,
      // Strip UI-only display keys
      date_borrowed_text: undefined,
      advance_payment_date_text: undefined,
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
      error: 'Failed to delete',
    });
    if (debtor) {
      const logs = JSON.parse(localStorage.getItem('arc_deleted_logs') || '[]');
      logs.push({
        id: `deleted-${id}-${Date.now()}`,
        date: new Date().toISOString(),
        customerName: debtor.name,
        type: 'deleted',
        amount: debtor.balance
      });
      localStorage.setItem('arc_deleted_logs', JSON.stringify(logs));
    }
  };

  const handlePay = async (id, amount, date) => {
    await toast.promise(recordPayment(id, amount, date), {
      loading: 'Recording payment...',
      success: 'Payment recorded!',
      error: 'Failed to record payment',
    });
  };

  const filteredCustomers = debtors
    .filter(d => {
      const cleanSearch = search.toLowerCase().trim();
      const s = cleanSearch.startsWith('#') ? cleanSearch.substring(1) : cleanSearch;
      
      if (filterStatus === 'Date') {
        if (!s) return true;
        const parsed = parseNaturalDate(search);
        // Normalize stored date (may be full timestamp or plain date string)
        const storedDate = d.date_borrowed ? d.date_borrowed.substring(0, 10) : '';
        if (parsed) return storedDate === parsed;
        return storedDate.includes(s);
      }

      const nameMatch = d.name.toLowerCase().startsWith(s) || 
                        d.name.toLowerCase().split(' ').some(word => word.startsWith(s));
                        
      const matchesSearch = nameMatch || 
                            d.id.toString().includes(s) ||
                            (d.receipt_numbers && d.receipt_numbers.some(r => r.toLowerCase().includes(s)));
      
      if (filterStatus === 'All') return matchesSearch;
      if (filterStatus === 'Completed') return matchesSearch && d.status === 'paid';
      if (filterStatus === 'Active') return matchesSearch && d.status === 'active';
      if (filterStatus === 'Partial') return matchesSearch && d.status === 'partial';
      return matchesSearch;
    })
    .sort((a, b) => {
      if (sortOrder === 'a-z') return a.name.localeCompare(b.name);
      if (sortOrder === 'date-asc') return new Date(a.date_borrowed) - new Date(b.date_borrowed);
      // default: date-desc
      return new Date(b.date_borrowed) - new Date(a.date_borrowed);
    });

  return (
    <>
      {/* Mobile Top Header (App-like) */}
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

      {/* Desktop Top Bar */}
      <div className="top-bar hide-mobile">
        <div className="logo-brand" onClick={() => navigate('/')} style={{ cursor: 'pointer' }}>
          <div className="logo-img-wrapper">
            <img 
              src={logo} 
              alt="Arc Logo" 
              className="logo-img"
            />
          </div>
          <span className="logo-text">Arc</span>
        </div>

        <div className="top-main-actions">
          <div className="search-wrap" style={{ 
            borderColor: filterStatus === 'Date' ? 'var(--accent)' : 'var(--border)',
            background: filterStatus === 'Date' ? 'var(--accent-light)' : 'var(--bg-card)'
          }}>
            <Search className="search-icon" size={16} color={filterStatus === 'Date' ? 'var(--accent)' : 'var(--text-muted)'} />
            <input
              id="main-search-input"
              type="text"
              className="search-input"
              placeholder={
                filterStatus === 'Date' ? "Search by Date (e.g. May 4, 2026)..." :
                "Search by Name or Receipt #..."
              }
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            {filterStatus === 'Date' && search && parseNaturalDate(search) && (
              <div style={{ position: 'absolute', right: 48, top: '50%', transform: 'translateY(-50%)', fontSize: 11, color: 'var(--accent)', fontWeight: 700 }}>
                ✓ {formatDisplayDate(parseNaturalDate(search))}
              </div>
            )}
            <button 
              className={`search-mode-btn ${filterStatus === 'Date' ? 'active' : ''}`}
              onClick={() => handleModeChange('Date')}
              title="Search by Date"
              style={{
                position: 'absolute',
                right: 8,
                top: '50%',
                transform: 'translateY(-50%)',
                width: 32,
                height: 32,
                borderRadius: 8,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                border: 'none',
                background: filterStatus === 'Date' ? 'var(--accent)' : 'transparent',
                color: filterStatus === 'Date' ? '#000' : 'var(--text-muted)',
                cursor: 'pointer',
                transition: 'all 0.2s ease'
              }}
            >
              <CalendarIcon size={16} />
            </button>
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
              onClick={() => navigate('/history')}
              title="Transaction History"
            >
              <History size={16} />
              <span>History</span>
            </button>
            <button 
              className="calendar-pill-btn" 
              onClick={() => navigate('/calendar')}
              title="Calendar"
            >
              <CalendarIcon size={16} />
              <span>Calendar</span>
            </button>
            <ThemeToggle />
            <button className="btn btn-primary" onClick={() => setAddOpen(true)}>
              <Plus size={18} />
              <span>Add New Customer</span>
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Search Bar */}
      <div className="hide-desktop" style={{ padding: '0 24px 24px' }}>
        <div className="search-wrap">
          <Search className="search-icon" size={18} />
          <input
            type="text"
            className="search-input"
            placeholder="Search customer..."
            style={{ borderRadius: 16, padding: '14px 16px 14px 48px' }}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            id="mobile-search-trigger"
          />
        </div>
      </div>

      {/* Stats Section */}
      <SummaryStats totals={totals} />

      {/* Table Section */}
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
              {['All', 'Outstanding', 'Partial', 'Completed'].map(status => (
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
              <option value="Completed">Completed</option>
              <option value="Receipt">By Receipt #</option>
              <option value="Date">By Date</option>
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
                    <th style={{ width: 40 }}>
                      <div 
                        className={`checkbox-custom ${selectedIds.length === filteredCustomers.length && filteredCustomers.length > 0 ? 'checked' : ''}`}
                        onClick={toggleAll}
                      >
                        {selectedIds.length === filteredCustomers.length && filteredCustomers.length > 0 && <Check size={14} />}
                      </div>
                    </th>
                  )}
                  <th className="hide-mobile">Receipt No.</th>
                  <th>Full Name</th>
                  <th>Date of Purchase</th>
                  <th className="hide-mobile">Initial Balance</th>
                  <th>Balance</th>
                  <th className="hide-tablet">Status</th>
                  <th></th>
                </tr>
              </thead>
              <motion.tbody initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                {filteredCustomers.map((debtor, i) => (
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
          </div>
        )}
      </div>

      {/* Modals */}
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
        message={`This will pay the full balance of ₱${confirmData?.balance?.toLocaleString()} and mark ${confirmData?.name} as fully settled in the records. Continue?`}
      />

      <ConfirmModal
        open={!!deleteData}
        onClose={() => setDeleteData(null)}
        onConfirm={() => handleDelete(deleteData.id)}
        title="Delete Record?"
        message={`Are you sure you want to permanently delete the record for ${deleteData?.name}? This cannot be undone.`}
      />
      <MobileNav onAddClick={() => setAddOpen(true)} />

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
              <button className="btn btn-icon-sm" onClick={() => setSelectedIds([])}><Plus size={18} style={{ transform: 'rotate(45deg)' }} /></button>
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

      {/* Export Filter Modal */}
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
                  { label: 'Active Only', value: 'active', desc: `${debtors.filter(d => d.status === 'active').length} records` },
                  { label: 'Partial Only', value: 'partial', desc: `${debtors.filter(d => d.status === 'partial').length} records` },
                  { label: 'Paid / Completed', value: 'paid', desc: `${debtors.filter(d => d.status === 'paid').length} records` },
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
