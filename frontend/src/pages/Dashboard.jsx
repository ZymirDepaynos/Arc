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

export default function Dashboard() {
  const navigate = useNavigate();
  const {
    debtors, loading, error, search, setSearch,
    createDebtor, bulkCreateDebtors, updateDebtor, deleteDebtor, recordPayment, totals
  } = useDebtors();

  const [dataMenuOpen, setDataMenuOpen] = useState(false);

  const [addOpen, setAddOpen] = useState(false);
  const [editDebtor, setEditDebtor] = useState(null);
  const [payDebtor, setPayDebtor] = useState(null);
  const [filterStatus, setFilterStatus] = useState('All');
  const [confirmData, setConfirmData] = useState(null);
  const [deleteData, setDeleteData] = useState(null);
  const [searchOpen, setSearchOpen] = useState(false);
  const [selectedIds, setSelectedIds] = useState([]);
  const [isSelectionMode, setIsSelectionMode] = useState(false);
  const [sortOrder, setSortOrder] = useState('newest'); // newest, a-z, z-a

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
    if (!window.confirm(`Delete ${selectedIds.length} records?`)) return;
    try {
      await Promise.all(selectedIds.map(id => deleteDebtor(id)));
      setSelectedIds([]);
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

  const toggleSort = () => {
    setSortOrder(prev => {
      if (prev === 'newest') return 'a-z';
      if (prev === 'a-z') return 'z-a';
      return 'newest';
    });
    toast.success(`Sorted by ${sortOrder === 'newest' ? 'A-Z' : sortOrder === 'a-z' ? 'Z-A' : 'Newest'}`);
  };

  const exportToPDF = () => {
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
    doc.text(`TOTAL CUSTOMERS: ${debtors.length}`, 14, 34);

    // 2. QUICK SUMMARY BOXES (at the top of PDF)
    doc.setFillColor(255, 90, 54); // Arc Orange
    doc.rect(pageWidth - 60, 15, 46, 20, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(8);
    doc.text('TOTAL OUTSTANDING', pageWidth - 57, 22);
    doc.setFontSize(12);
    doc.text('P' + (totals?.totalBalance || 0).toLocaleString(), pageWidth - 57, 30);

    // 3. TABLE DATA PREP
    const tableData = debtors.map(d => [
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
    toast.success('Elite PDF Report Generated');
  };

  const exportToCSV = () => {
    const headers = ['ID', 'Name', 'Date of Purchase', 'Advance Payment', 'Balance', 'Status'];
    const rows = debtors.map(d => [
      d.id,
      `"${d.name.replace(/"/g, '""')}"`, // Escape quotes for CSV
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
    URL.revokeObjectURL(url); // Clean up memory
    toast.success('Full Database Exported for Excel');
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
            if (header.includes('advance')) obj.advance_payment = values[index];
            if (header.includes('date')) obj.date_borrowed = values[index];
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
    await toast.promise(createDebtor(form), {
      loading: 'Adding debtor...',
      success: 'Debtor added!',
      error: (e) => e?.response?.data?.error || 'Failed to add debtor',
    });
  };

  const handleEdit = async (form) => {
    await toast.promise(updateDebtor(editDebtor.id, form), {
      loading: 'Saving changes...',
      success: 'Changes saved!',
      error: (e) => e?.response?.data?.error || 'Failed to save',
    });
  };

  const handleDelete = async (id) => {
    await toast.promise(deleteDebtor(id), {
      loading: 'Deleting...',
      success: 'Debtor removed.',
      error: 'Failed to delete',
    });
  };

  const handlePay = async (id, amount) => {
    await toast.promise(recordPayment(id, amount), {
      loading: 'Recording payment...',
      success: 'Payment recorded!',
      error: 'Failed to record payment',
    });
  };

  const filteredCustomers = debtors
    .filter(d => {
      const s = search.toLowerCase();
      const matchesSearch = d.name.toLowerCase().includes(s) || 
                            d.id.toString().includes(s) ||
                            (d.receipt_numbers && d.receipt_numbers.some(r => r.toLowerCase().includes(s)));
      
      if (filterStatus === 'All') return matchesSearch;
      if (filterStatus === 'Completed') return matchesSearch && d.status === 'paid';
      return matchesSearch && d.status !== 'paid';
    })
    .sort((a, b) => {
      if (sortOrder === 'a-z') return a.name.localeCompare(b.name);
      if (sortOrder === 'z-a') return b.name.localeCompare(a.name);
      return new Date(b.created_at) - new Date(a.created_at);
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
          <div className="search-wrap">
            <Search className="search-icon" size={16} />
            <input
              type="text"
              className="search-input"
              placeholder="Search customers..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
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
                      <div className="dropdown-item" onClick={exportToPDF}>
                        <FileText size={16} />
                        <span>Export Elite PDF</span>
                      </div>
                      <div className="dropdown-item" onClick={exportToCSV}>
                        <FileSpreadsheet size={16} />
                        <span>Export Excel (CSV)</span>
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
              {['All', 'Active', 'Partial', 'Completed'].map(status => (
                <button 
                  key={status} 
                  className={`filter-chip ${filterStatus === status ? 'active' : ''}`}
                  onClick={() => setFilterStatus(status)}
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
              <option value="Active">Active</option>
              <option value="Partial">Partial</option>
              <option value="Completed">Completed</option>
            </select>

            <button 
              className="btn-icon-sm" 
              onClick={toggleSort}
              style={{ background: sortOrder !== 'newest' ? 'rgba(255, 90, 54, 0.1)' : 'var(--bg-card)' }}
            >
              <ArrowUpDown size={18} color={sortOrder !== 'newest' ? 'var(--accent)' : 'var(--text-secondary)'} />
            </button>
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
                  <th className="hide-mobile">Customer ID</th>
                  <th>Full Name</th>
                  <th className="hide-mobile">Date of Purchase</th>
                  <th>Advance / Bal</th>
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
        message={`This will pay the full balance of ₱${confirmData?.balance?.toLocaleString()} and permanently remove ${confirmData?.name} from the records. Are you sure?`}
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
                <button className="btn btn-primary btn-sm" onClick={handleBulkPaid}>Mark as Paid</button>
              )}
              <button className="btn btn-outline btn-sm" style={{ borderColor: '#FF4D4D', color: '#FF4D4D' }} onClick={handleBulkDelete}>Delete All</button>
              <button className="btn btn-icon-sm" onClick={() => setSelectedIds([])}><Plus size={18} style={{ transform: 'rotate(45deg)' }} /></button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
